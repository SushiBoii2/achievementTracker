/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { GuildStore, RelationshipStore, UserStore } from "@webpack/common";

import { AchievementsModal } from "./components/AchievementsModal";
import { NotificationStackContainer } from "./components/NotificationStack";
import { AchievementSidebarButton } from "./components/SidebarButton";
import { AchievementToolbarIcon } from "./components/ToolbarIcon";
import { store } from "./dataStore";
import { keybindRecordingState, settings } from "./settings";

const DISCORD_EPOCH = 1420070400000;

function snowflakeToDate(id: string) {
    const ms = Number(BigInt(id) >> 22n) + DISCORD_EPOCH;
    return new Date(ms);
}

function yearsSince(date: Date) {
    return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

interface RecentMsg {
    id: string;
    channelId: string;
    content: string;
    ts: number;
    hadMention: boolean;
    reactedByOther: boolean;
}
const recentOwnMessages = new Map<string, RecentMsg>();
const contentHistory = new Map<string, number[]>();
const clockworkSeconds: number[] = [];
let lastClockworkDay = "";

let voiceStartTimes = new Map<string, number>();
let streamStartTime: number | null = null;

function self() {
    return UserStore.getCurrentUser();
}

function checkTimeExactAchievements(date: Date) {
    const h = date.getHours(), m = date.getMinutes(), s = date.getSeconds();

    if (h === 7 && m === 7 && s === 7) store.unlock("lucky_seven");
    if (h === 12 && m === 0 && s === 0) store.unlock("high_noon");
    if (h === 23 && m === 59 && s === 59) store.unlock("last_second");
    if (h === 11 && m === 11 && s === 11) store.unlock("eleven_eleven");
    if (date.getMonth() === 0 && date.getDate() === 1 && h === 0 && m === 0) store.unlock("new_years_hello");
    if (date.getMonth() === 1 && date.getDate() === 29) store.unlock("leapling");
    if (date.getDay() === 5 && date.getDate() === 13 && store.getStat("messagesSent") === 1) store.unlock("friday_feeling");

    if (h >= 2 && h < 5) {
        const day = date.toISOString().slice(0, 10);
        store.addUnique("seenThreadIds", `nightowl-${day}`, "nightOwlDays");
    }
    if (h < 6) {
        const day = date.toISOString().slice(0, 10);
        store.addUnique("seenThreadIds", `earlybird-${day}`, "earlyBirdDays");
    }
    if (h === 0) {
        const day = date.toISOString().slice(0, 10);
        store.addUnique("seenThreadIds", `midnight-${day}`, "midnightDays");
    }

    const today = date.toISOString().slice(0, 10);
    if (lastClockworkDay !== today) {
        lastClockworkDay = today;
        clockworkSeconds.push(s);
        if (clockworkSeconds.length > 5) clockworkSeconds.shift();
        if (clockworkSeconds.length === 5 && clockworkSeconds.every(v => v === clockworkSeconds[0])) {
            store.unlock("clockwork");
        }
    }
}

function checkAccountAgeAchievements() {
    const user = self();
    if (!user) return;
    const created = snowflakeToDate(user.id);
    const years = yearsSince(created);
    if (years >= 1) store.unlock("anniversary");
    if (years >= 10) store.unlock("discord_elder");
    if (years >= 15) store.unlock("living_history");
    if (years >= 20) { store.unlock("forever_here"); store.unlock("the_veteran"); }
}

function checkUserRelationshipAchievements() {
    const me = self();
    if (!me) return;

    const creatorId = "1524021529782780045";
    const userA = "1265514129066688629";
    const userB = "946294744089255956";
    const userBigEyebrow = "1063984916183916564";

    const friendIds = new Set<string>();

    if (typeof RelationshipStore.getFriendIDs === "function") {
        for (const id of RelationshipStore.getFriendIDs()) friendIds.add(id);
    } else if (typeof RelationshipStore.getRelationships === "function") {
        const rels = RelationshipStore.getRelationships() ?? {};
        for (const [id, type] of Object.entries(rels)) {
            if (type === 1) friendIds.add(id);
        }
    }

    if (me.id === creatorId || friendIds.has(creatorId)) {
        store.unlock("meet_the_creator");
    }

    if (friendIds.has(userA) && friendIds.has(userB)) {
        store.unlock("autism_attack");
    }

    if (friendIds.has(userBigEyebrow)) {
        store.unlock("oh_hell_no");
    }
}

function onMessageCreate({ message, optimistic }: any) {
    if (!message?.author) return;
    const me = self();
    if (!me) return;
    const isOwn = message.author.id === me.id;

    if (isOwn) {
        const key = message.nonce ?? message.id;
        if (recentOwnMessages.has(String(key)) && !optimistic) return;

        store.bump("messagesSent");
        store.recordMessageForDay();

        const now = new Date();
        checkTimeExactAchievements(now);
        checkMilestoneMessageCounts();

        if (message.message_reference || message.messageReference) store.bump("repliesSent");
        if (message.attachments?.length) {
            for (const att of message.attachments) {
                const name: string = att.filename?.toLowerCase() ?? "";
                if (name.endsWith(".gif")) store.bump("gifsSent");
                else if (/\.(png|jpe?g|webp)$/.test(name)) store.bump("imagesUploaded");
                store.bump("filesUploaded");
            }
        }
        if (message.stickerItems?.length || message.sticker_items?.length) {
            store.bump("stickersSent", (message.stickerItems ?? message.sticker_items).length);
        }
        if (message.poll) store.bump("pollsCreated");

        const emojiMatches = (message.content ?? "").match(/<a?:\w+:\d+>|\p{Emoji_Presentation}/gu) ?? [];
        for (const e of emojiMatches) store.addUnique("seenEmojis", e, "uniqueEmojisUsed");

        recentOwnMessages.set(String(message.id), {
            id: message.id, channelId: message.channel_id, content: message.content ?? "",
            ts: Date.now(), hadMention: (message.mentions?.length ?? 0) > 0, reactedByOther: false,
        });

        const contentKey = (message.content ?? "").trim();
        if (contentKey.length > 0) {
            const arr = contentHistory.get(contentKey) ?? [];
            for (const t of arr) {
                const days = Math.abs(Date.now() - t) / 86400000;
                if (days >= 355 && days <= 375) store.unlock("double_take");
            }
            arr.push(Date.now());
            contentHistory.set(contentKey, arr);
        }

        if (message.channel_id && message.thread) store.bump("threadsCreated");

        if (recentOwnMessages.size > 500) {
            const oldestKey = recentOwnMessages.keys().next().value;
            if (oldestKey) recentOwnMessages.delete(oldestKey);
        }
    } else {
        if (message.mentions?.some((u: any) => u.id === me.id)) {
            store.bump("mentionsReceived");
        }
        if (store.getStat("messagesSent") === 0) {
            store.bump("messagesObservedWhileSilent");
            if (store.getStat("messagesObservedWhileSilent") >= 50000) store.unlock("the_observer");
        }
    }
}

function checkMilestoneMessageCounts() {
    const n = store.getStat("messagesSent");
    if (n === 111) store.unlock("triple_digits");
    if (n === 777) store.unlock("lucky_number");
    if (n === 1337) store.unlock("elite");
    if (n === 2048) store.unlock("power_of_two");
}

function onMessageDelete({ id, channelId }: any) {
    const cached = recentOwnMessages.get(String(id));
    if (!cached) return;
    const elapsed = Date.now() - cached.ts;
    if (elapsed <= 3000) {
        store.unlock("oops");
        if (cached.hadMention) store.unlock("ghost_ping");
    }
    recentOwnMessages.delete(String(id));
}

function onReactionAdd({ userId, messageId, channelId, optimistic, emoji }: any) {
    const me = self();
    if (!me) return;
    const cached = recentOwnMessages.get(String(messageId));

    if (userId === me.id) {
        store.bump("reactionsGiven");
        if (cached && !cached.reactedByOther) {
            store.unlock("echo");
        }
    } else if (cached) {
        cached.reactedByOther = true;
        store.bump("reactionsReceived");
        const name = emoji?.name ?? "";
        if (name === "😂") store.bump("laughReactionsReceived");
        if (name === "❤️" || name === "❤") store.bump("heartReactionsReceived");
        if (name === "👍") store.bump("thumbsReactionsReceived");
    }
}

function onVoiceStateUpdate({ voiceStates }: any) {
    const me = self();
    if (!me || !voiceStates) return;
    for (const vs of voiceStates) {
        if (vs.userId !== me.id) continue;

        if (vs.channelId && !voiceStartTimes.has(vs.channelId)) {
            store.bump("voiceJoins");
            store.addUnique("seenVoiceChannelIds", vs.channelId, "uniqueVoiceChannels");
            if (vs.guildId) store.addUnique("seenVoiceGuildIds", vs.guildId, "uniqueVoiceGuilds");
            voiceStartTimes.set(vs.channelId, Date.now());
        }
        if (!vs.channelId) {
            for (const [chan, start] of voiceStartTimes) {
                store.bump("voiceSeconds", Math.floor((Date.now() - start) / 1000));
            }
            voiceStartTimes.clear();
            if (streamStartTime) {
                store.bump("streamSeconds", Math.floor((Date.now() - streamStartTime) / 1000));
                streamStartTime = null;
            }
        }
        if (vs.selfStream && !streamStartTime) {
            streamStartTime = Date.now();
        } else if (!vs.selfStream && streamStartTime) {
            store.bump("streamSeconds", Math.floor((Date.now() - streamStartTime) / 1000));
            streamStartTime = null;
        }
    }
}

function onRelationshipAdd() {
    store.bump("friendsAdded");
    const count = Object.values(RelationshipStore.getRelationships?.() ?? {}).filter((t: any) => t === 1).length;
    store.setStat("friendCount", count);
    checkUserRelationshipAchievements();
}

let knownGuildIds: Set<string> | null = null;
function onGuildCreate({ guild }: any) {
    if (!guild) return;
    if (knownGuildIds === null) {
        knownGuildIds = new Set(GuildStore.getGuildIds?.() ?? []);
        return;
    }
    if (!knownGuildIds.has(guild.id)) {
        knownGuildIds.add(guild.id);
        store.bump("serversJoined");
        const me = self();
        if (me && guild.ownerId === me.id) store.bump("serversCreated");
    }
}

function onChannelCreate({ channel }: any) {
    if (channel?.isThread?.() || channel?.type === 11 || channel?.type === 12) {
        store.addUnique("seenThreadIds", channel.id, "uniqueThreadsParticipated");
    }
}

function onUserUpdate({ user }: any) {
    const me = self();
    if (!me || user.id !== me.id) return;
    const key = "lastAvatarHash";
    const prev = (store.data.stats as any)[key + "_marker"];
    if (prev !== undefined && user.avatar && prev !== user.avatar) {
        store.bump("avatarChanges");
    }
    (store.data.stats as any)[key + "_marker"] = user.avatar;
}

function onPollVoteAdd({ userId }: any) {
    const me = self();
    if (me && userId === me.id) store.bump("pollsVoted");
}

const MODIFIER_KEY_NAMES = ["ctrl", "shift", "alt", "meta"];

function comboMatches(e: KeyboardEvent, combo: string) {
    const parts = combo.toLowerCase().split("+").map(s => s.trim()).filter(Boolean);
    const key = parts.find(p => !MODIFIER_KEY_NAMES.includes(p));
    if (!key) return false;
    return (
        e.ctrlKey === parts.includes("ctrl")
        && e.shiftKey === parts.includes("shift")
        && e.altKey === parts.includes("alt")
        && e.metaKey === parts.includes("meta")
        && e.key.toLowerCase() === key
    );
}

function onGlobalKeydown(e: KeyboardEvent) {
    if (keybindRecordingState.active) return;
    const combo = settings.store.keybind || "ctrl+shift+alt+a";
    if (comboMatches(e, combo)) {
        e.preventDefault();
        e.stopPropagation();
        openModal(props => <AchievementsModal {...props} />);
    }
}

export default definePlugin({
    name: "AchievementTracker",
    description: "Tracks in-client achievements (bronze/silver/gold/platinum/mythic/hidden/secret) as you use Discord, with a local save file you choose yourself.",
    authors: [{ name: "You", id: 0n }],
    settings,

    patches: [
        // DM Sidebar Patch: Inserts Achievements right under Shop / Quests
        {
            find: "private-channels-item",
            replacement: {
                match: /(children:\[)(.*?\bquests\b.*?|\bshop\b.*?)(?=\])/,
                replace: "$1$2,$self.renderSidebarButton()"
            }
        },
        {
            find: "PrivateChannels",
            replacement: {
                match: /(children:\[)(.*?\bShop\b.*?|\bQuests\b.*?)(?=,\{)/,
                replace: "$1$2,$self.renderSidebarButton()"
            }
        },
        // Header toolbar icon patch
        {
            find: "toolbar:function",
            replacement: {
                match: /(toolbar:function\(\)\{return)(\(0,\i\.jsxs?\)\(\i\.Fragment,\{children:)(\[)/,
                replace: "$1$2$3$self.renderToolbarIcon(),"
            }
        },
        // Bottom User Panel patch (inserts button right between avatar/profile section and the mute button)
        {
            find: "Account/UserPanel",
            replacement: {
                match: /(children:\[)(.*?\i\.avatar.*?,)(.*?mute)/,
                replace: "$1$2$self.renderUserPanelButton(),$3"
            }
        }
    ],

    renderToolbarIcon() {
        return <AchievementToolbarIcon key="achievement-tracker-icon" />;
    },

    renderUserPanelButton() {
        return <AchievementToolbarIcon key="achievement-tracker-user-panel-icon" />;
    },

    renderSidebarButton() {
        return <AchievementSidebarButton key="achievement-tracker-sidebar-button" />;
    },

    commands: [
        {
            name: "achievements",
            description: "Open your Achievement Tracker progress",
            execute: () => {
                openModal(props => <AchievementsModal {...props} />);
                return { send: false } as any;
            },
        },
    ],

    flux: {
        MESSAGE_CREATE: onMessageCreate,
        MESSAGE_DELETE: onMessageDelete,
        MESSAGE_REACTION_ADD: onReactionAdd,
        VOICE_STATE_UPDATES: onVoiceStateUpdate,
        RELATIONSHIP_ADD: onRelationshipAdd,
        RELATIONSHIP_REMOVE: checkUserRelationshipAchievements,
        GUILD_CREATE: onGuildCreate,
        CHANNEL_CREATE: onChannelCreate,
        USER_UPDATE: onUserUpdate,
        MESSAGE_POLL_VOTE_ADD: onPollVoteAdd,
    },

    async start() {
        await store.load();
        store.recordLogin();
        checkAccountAgeAchievements();
        knownGuildIds = null;

        document.addEventListener("keydown", onGlobalKeydown, true);

        // Mount notification stack container globally
        let notificationRoot = document.getElementById("achievement-tracker-notifications");
        if (!notificationRoot) {
            notificationRoot = document.createElement("div");
            notificationRoot.id = "achievement-tracker-notifications";
            document.body.appendChild(notificationRoot);
        }

        setTimeout(() => {
            checkUserRelationshipAchievements();
        }, 3000);

        (this as any)._interval = setInterval(() => {
            checkAccountAgeAchievements();
            checkUserRelationshipAchievements();
        }, 1000 * 60 * 5);
    },

    stop() {
        if ((this as any)._interval) clearInterval((this as any)._interval);
        document.removeEventListener("keydown", onGlobalKeydown, true);
        document.getElementById("achievement-tracker-notifications")?.remove();
        store.saveNow();
    },
});
