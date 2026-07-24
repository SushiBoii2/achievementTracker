/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ACHIEVEMENTS, Achievement, getAchievement } from "./achievements";
import { notificationManager } from "./components/NotificationStack";
import { settings } from "./settings";

// The native.ts side handles all real filesystem/dialog access, since
// index.tsx runs in Discord's renderer (browser-like) context and cannot
// touch the disk directly.
const Native = VencordNative.pluginHelpers.AchievementTracker as {
    readFile(path: string): Promise<string | null>;
    writeFile(path: string, data: string): Promise<boolean>;
    pickSaveFile(defaultPath?: string): Promise<string | null>;
};

export interface Stats {
    [key: string]: number;
}

export interface SaveData {
    version: 1;
    stats: Stats;
    /** emoji names/ids ever used by the user, so "unique emoji" achievements can be counted */
    seenEmojis: string[];
    /** thread/channel ids already counted, to keep "unique X" achievements honest */
    seenThreadIds: string[];
    seenVoiceChannelIds: string[];
    seenVoiceGuildIds: string[];
    unlocked: Record<string, number>; // achievementId -> unix ms unlock time
    loginDates: string[]; // ISO yyyy-mm-dd, used for streak calculation
    lastMessageDay?: string;
    messagesToday: number;
}

function emptyData(): SaveData {
    return {
        version: 1,
        stats: {},
        seenEmojis: [],
        seenThreadIds: [],
        seenVoiceChannelIds: [],
        seenVoiceGuildIds: [],
        unlocked: {},
        loginDates: [],
        messagesToday: 0,
    };
}

class Store {
    data: SaveData = emptyData();
    private saveTimeout: NodeJS.Timeout | null = null;
    private loaded = false;

    async load() {
        const path = settings.store.dataFilePath;
        if (!path) {
            this.data = emptyData();
            this.loaded = true;
            return;
        }
        try {
            const raw = await Native.readFile(path);
            if (raw) {
                this.data = { ...emptyData(), ...JSON.parse(raw) };
            }
        } catch (e) {
            console.error("[AchievementTracker] Failed to load save file", e);
        }
        this.loaded = true;
    }

    private scheduleSave() {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => this.saveNow(), 1500);
    }

    async saveNow() {
        const path = settings.store.dataFilePath;
        if (!path) return;
        try {
            await Native.writeFile(path, JSON.stringify(this.data, null, 2));
        } catch (e) {
            console.error("[AchievementTracker] Failed to write save file", e);
        }
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

    /** For "unique X" achievements backed by a Set persisted as an array */
    addUnique(listKey: "seenEmojis" | "seenThreadIds" | "seenVoiceChannelIds" | "seenVoiceGuildIds", value: string, statKey: string) {
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
        const today = new Date().toISOString().slice(0, 10);
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
        const today = new Date().toISOString().slice(0, 10);
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
