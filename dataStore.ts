/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createStore, get, set } from "@api/DataStore";

import { ACHIEVEMENTS, Achievement, getAchievement } from "./achievements";
import { notificationManager } from "./components/NotificationStack";
import { settings } from "./settings";

// Primary persistence: Vencord's built-in DataStore (IndexedDB), scoped to
// this plugin. This is fully local (nothing leaves your machine) and
// requires zero setup - unlike the old "pick a JSON file" flow, which meant
// progress silently wasn't saved for anyone who never opened Settings and
// clicked the button. That was the main reason achievements "didn't work"
// for a lot of people: tracking happened in memory but was thrown away on
// every restart.
const AchievementStore = createStore("AchievementTrackerData", "AchievementTrackerStore");
const SAVE_KEY = "save-data";

// The native.ts side is now only used for optional manual export/import
// backups, since index.tsx runs in Discord's renderer (browser-like)
// context and can't touch the disk directly on its own.
const Native = VencordNative.pluginHelpers.AchievementTracker as {
    readFile(path: string): Promise<string | null>;
    writeFile(path: string, data: string): Promise<boolean>;
    pickSaveFile(defaultPath?: string): Promise<string | null>;
    pickOpenFile(): Promise<string | null>;
};

export interface Stats {
    [key: string]: number;
}

export interface SaveData {
    version: 2;
    stats: Stats;
    /** emoji names/ids ever used by the user, so "unique emoji" achievements can be counted */
    seenEmojis: string[];
    /** thread/channel ids already counted, to keep "unique X" achievements honest */
    seenThreadIds: string[];
    seenVoiceChannelIds: string[];
    seenVoiceGuildIds: string[];
    /** guild ids in which the user's nickname has been seen to change, for "Nicknamer" */
    seenNicknameGuildIds: string[];
    unlocked: Record<string, number>; // achievementId -> unix ms unlock time
    loginDates: string[]; // ISO yyyy-mm-dd, used for streak calculation
    lastMessageDay?: string;
    messagesToday: number;
    /** last known avatar hash + when it last changed, for "Recognizable" */
    lastAvatarHash?: string;
    lastAvatarChangeTs?: number;
    /** yyyy-mm-dd markers for the various "N times in a day" counters below */
    dayMarkers: Record<string, string>;
    /** whether the pre-DataStore JSON file (if any) has already been merged in */
    migratedLegacyFile?: boolean;
}

function emptyData(): SaveData {
    return {
        version: 2,
        stats: {},
        seenEmojis: [],
        seenThreadIds: [],
        seenVoiceChannelIds: [],
        seenVoiceGuildIds: [],
        seenNicknameGuildIds: [],
        unlocked: {},
        loginDates: [],
        messagesToday: 0,
        dayMarkers: {},
    };
}

function todayKey() {
    return new Date().toISOString().slice(0, 10);
}

class Store {
    data: SaveData = emptyData();
    private saveTimeout: NodeJS.Timeout | null = null;
    private loaded = false;

    async load() {
        try {
            const raw = await get(SAVE_KEY, AchievementStore);
            if (raw) this.data = { ...emptyData(), ...raw, dayMarkers: { ...(raw as any).dayMarkers } };
        } catch (e) {
            console.error("[AchievementTracker] Failed to load save data", e);
        }

        await this.migrateLegacyFileIfNeeded();
        this.loaded = true;
    }

    /**
     * One-time best-effort import from the old "manual JSON file" storage
     * format, for anyone upgrading from a previous version of this plugin
     * that already had a file configured. Safe to skip/fail silently.
     */
    private async migrateLegacyFileIfNeeded() {
        if (this.data.migratedLegacyFile) return;
        const path = settings.store.dataFilePath;
        if (path) {
            try {
                const raw = await Native.readFile(path);
                if (raw) {
                    const legacy = JSON.parse(raw);
                    // Merge rather than overwrite: keep whichever unlock timestamp
                    // is older for anything unlocked in both, and take the max of
                    // any numeric stats so nothing regresses.
                    for (const [id, ts] of Object.entries(legacy.unlocked ?? {})) {
                        if (!this.data.unlocked[id] || (ts as number) < this.data.unlocked[id]) {
                            this.data.unlocked[id] = ts as number;
                        }
                    }
                    for (const [key, val] of Object.entries(legacy.stats ?? {})) {
                        this.data.stats[key] = Math.max(this.data.stats[key] ?? 0, val as number);
                    }
                    for (const key of ["seenEmojis", "seenThreadIds", "seenVoiceChannelIds", "seenVoiceGuildIds"] as const) {
                        const merged = new Set([...(this.data[key] ?? []), ...(legacy[key] ?? [])]);
                        (this.data[key] as string[]) = [...merged];
                    }
                }
            } catch (e) {
                console.error("[AchievementTracker] Legacy file migration skipped", e);
            }
        }
        this.data.migratedLegacyFile = true;
    }

    private scheduleSave() {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => this.saveNow(), 1500);
    }

    async saveNow() {
        try {
            await set(SAVE_KEY, this.data, AchievementStore);
        } catch (e) {
            console.error("[AchievementTracker] Failed to write save data", e);
        }
    }

    /** Export the raw save data as a JSON string, for the manual backup button. */
    exportJson() {
        return JSON.stringify(this.data, null, 2);
    }

    /** Import a previously-exported JSON string, merging into current progress. */
    async importJson(raw: string) {
        const parsed = JSON.parse(raw);
        this.data = { ...emptyData(), ...this.data, ...parsed, migratedLegacyFile: true };
        await this.saveNow();
    }

    getStat(key: string) {
        return this.data.stats[key] ?? 0;
    }

    /** Increment a numeric counter and check every achievement bound to it */
    bump(key: string, amount = 1) {
        if (!this.loaded) return;
        this.data.stats[key] = (this.data.stats[key] ?? 0) + amount;
        this.checkStatAchievements(key);
        this.scheduleSave();
    }

    setStat(key: string, value: number) {
        if (!this.loaded) return;
        this.data.stats[key] = value;
        this.checkStatAchievements(key);
        this.scheduleSave();
    }

    /**
     * Increment a counter that resets back to 0 the first time it's touched
     * on a new calendar day (local time). Used for "N times in a single
     * day" achievements like the /tableflip or message-deletion ones.
     */
    bumpDaily(statKey: string, markerKey: string, amount = 1) {
        if (!this.loaded) return;
        const today = todayKey();
        if (this.data.dayMarkers[markerKey] !== today) {
            this.data.dayMarkers[markerKey] = today;
            this.data.stats[statKey] = 0;
        }
        this.bump(statKey, amount);
    }

    /** For "unique X" achievements backed by a Set persisted as an array */
    addUnique(
        listKey: "seenEmojis" | "seenThreadIds" | "seenVoiceChannelIds" | "seenVoiceGuildIds" | "seenNicknameGuildIds",
        value: string,
        statKey: string
    ) {
        if (!this.loaded) return;
        const list = this.data[listKey] as string[];
        if (!list.includes(value)) {
            list.push(value);
            this.setStat(statKey, list.length);
        }
    }

    private checkStatAchievements(statKey: string) {
        for (const ach of ACHIEVEMENTS) {
            if (ach.stat === statKey && ach.goal != null) {
                if (this.getStat(statKey) >= ach.goal) {
                    this.unlock(ach.id);
                }
            }
        }
    }

    isUnlocked(id: string) {
        return id in this.data.unlocked;
    }

    unlock(id: string) {
        if (!this.loaded || this.isUnlocked(id)) return;
        const ach = getAchievement(id);
        if (!ach) return;
        this.data.unlocked[id] = Date.now();
        this.scheduleSave();
        this.notify(ach);
        this.checkMetaAchievements();
    }

    /** Undo a manual self-report unlock (in case of a misclick). No-op for anything else. */
    unmarkSelfReport(id: string) {
        const ach = getAchievement(id);
        if (!ach?.selfReport) return;
        if (this.isUnlocked(id)) {
            delete this.data.unlocked[id];
            this.scheduleSave();
        }
    }

    private notify(ach: Achievement) {
        if (!settings.store.showNotifications) return;

        notificationManager.push({
            title: ach.secret ? "🔒 Achievement Unlocked!" : "🏆 Achievement Unlocked!",
            description: ach.name,
            icon: ach.secret ? "🔒" : "🏆",
            type: "achievement",
            duration: 5000,
        });
    }

    private checkMetaAchievements() {
        const trackable = ACHIEVEMENTS.filter(a => a.tier !== "ascendant" && a.tier !== "transcendent" && a.id !== "completionist" && a.id !== "the_discordian" && a.id !== "halfway_there" && a.id !== "jack_of_all_trades");
        const unlockedCount = trackable.filter(a => this.isUnlocked(a.id)).length;

        if (unlockedCount >= Math.ceil(trackable.length / 2)) this.unlock("halfway_there");
        if (unlockedCount === trackable.length) this.unlock("completionist");

        const categories = new Set(trackable.map(a => a.category));
        const unlockedCategories = new Set(trackable.filter(a => this.isUnlocked(a.id)).map(a => a.category));
        if (unlockedCategories.size >= categories.size) this.unlock("jack_of_all_trades");

        const everything = ACHIEVEMENTS.filter(a => a.id !== "the_discordian");
        if (everything.every(a => this.isUnlocked(a.id))) this.unlock("the_discordian");
    }

    // ── Login streak handling ──────────────────────────────────────────
    recordLogin() {
        const today = todayKey();
        if (this.data.loginDates[this.data.loginDates.length - 1] === today) return;

        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const last = this.data.loginDates[this.data.loginDates.length - 1];

        if (last === yesterday || this.data.loginDates.length === 0) {
            this.data.loginDates.push(today);
        } else {
            // streak broken, reset
            this.data.loginDates = [today];
        }
        this.setStat("loginStreak", this.data.loginDates.length);
        this.scheduleSave();
    }

    // ── Daily message counter (for "Nice." = exactly 69/day) ───────────
    recordMessageForDay() {
        const today = todayKey();
        if (this.data.lastMessageDay !== today) {
            this.data.lastMessageDay = today;
            this.data.messagesToday = 0;
        }
        this.data.messagesToday++;
        if (this.data.messagesToday === 69) {
            this.unlock("nice");
        }
        this.scheduleSave();
    }
}

export const store = new Store();
