/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { GuildStore, RelationshipStore, UserStore } from "@webpack/common";

import { AchievementsModal } from "./components/AchievementsModal";
import { AchievementToolbarIcon } from "./components/ToolbarIcon";
import { store } from "./dataStore";
import { settings } from "./settings";

const DISCORD_EPOCH = 1420070400000;

function snowflakeToDate(id: string) {
    const ms = Number(BigInt(id) >> 22n) + DISCORD_EPOCH;
    return new Date(ms);
}

function yearsSince(date: Date) {
    return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

// Recent-message cache used for secret/correlation-based achievements
// (Oops, Ghost Ping, Wrong Window, Double Take, Clockwork, Echo)
interface RecentMsg {
    id: string;
    channelId: string;
    content: string;
    ts: number;
    hadMention: boolean;
    reactedByOther: boolean;
}
const recentOwnMessages = new Map<string, RecentMsg>(); // id -> msg
const contentHistory = new Map<string, number[]>(); // content -> timestamps[] (for Double Take)
const clockworkSeconds: number[] = []; // last few days' send-second-of-minute, for Clockwork
let lastClockworkDay = "";

let voiceStartTimes = new Map<string, number>(); // channelId -> join time, for self
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
        store.addUnique("seenThreadIds", `nightowl-${day}`, "nightOwlDays"); // reuse generic unique-list mechanism
    }
    if (h < 6) {
        const day = date.toISOString().slice(0, 10);
        store.addUnique("seenThreadIds", `earlybird-${day}`, "earlyBirdDays");
    }
    if (h === 0) {
        const day = date.toISOString().slice(0, 10);
        store.addUnique("seenThreadIds", `midnight-${day}`, "midnightDays");
    }

    // Clockwork: same second-of-minute on 5 consecutive days
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

function onMessageCreate({ message, optimistic }: any) {
    if (!message?.author) return;
    const me = self();
    if (!me) return;
    const isOwn = message.author.id === me.id;

    if (isOwn) {
        // avoid double counting optimistic + confirmed dispatch for the same message
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

        // unique emoji usage from custom emoji syntax <a:name:id> or <:name:id>
        const emojiMatches = (message.content ?? "").match(/<a?:\w+:\d+>|\p{Emoji_Presentation}/gu) ?? [];
        for (const e of emojiMatches) store.addUnique("seenEmojis", e, "uniqueEmojisUsed");

        // Only-emoji message streak for "Universal Language" style tracking omitted (needs 25 in a row context; low value)

        recentOwnMessages.set(String(message.id), {
            id: message.id, channelId: message.channel_id, content: message.content ?? "",
            ts: Date.now(), hadMention: (message.mentions?.length ?? 0) > 0, reactedByOther: false,
        });
        // Double Take: same content ~1 year apart
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

        // trim cache
        if (recentOwnMessages.size > 500) {
            const oldestKey = recentOwnMessages.keys().next().value;
            if (oldestKey) recentOwnMessages.delete(oldestKey);
        }
    } else {
        if (message.mentions?.some((u: any) => u.id === me.id)) {
            store.bump("mentionsReceived");
        }
        // "The Observer": track total messages seen while never having sent one
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
}

let knownGuildIds: Set<string> | null = null;
function onGuildCreate({ guild }: any) {
    if (!guild) return;
    if (knownGuildIds === null) {
        // first snapshot on plugin start - don't retroactively count pre-existing guilds
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
        // participation counted separately from creation; ownership isn't always known client-side
        store.addUnique("seenThreadIds", channel.id, "uniqueThreadsParticipated");
    }
}

function onUserUpdate({ user }: any) {
    const me = self();
    if (!me || user.id !== me.id) return;
    // basic avatar-change tracking (best-effort; first observed value is treated as baseline)
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

export default definePlugin({
    name: "AchievementTracker",
    description: "Tracks in-client achievements (bronze/silver/gold/platinum/mythic/hidden/secret) as you use Discord, with a local save file you choose yourself.",
    authors: [{ name: "You", id: 0n }],
    settings,

    patches: [
        // Adds the trophy icon to Discord's top toolbar (the row of icons
        // next to Inbox/Help in the top-right, visible on the Friends page
        // and inside every channel/DM). NOTE: this is the single patch most
        // likely to need a small tweak after a Discord client update, since
        // it targets Discord's internal toolbar renderer. If the icon ever
        // stops appearing, the /achievements chat command below always
        // works as a guaranteed fallback entry point.
        {
            find: "toolbar:function",
            replacement: {
                match: /(toolbar:function\(\)\{return)(\(0,\i\.jsxs?\)\(\i\.Fragment,\{children:)(\[)/,
                replace: "$1$2$3$self.renderToolbarIcon(),"
            }
        }
    ],

    renderToolbarIcon() {
        return <AchievementToolbarIcon key="achievement-tracker-icon" />;
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
        GUILD_CREATE: onGuildCreate,
        CHANNEL_CREATE: onChannelCreate,
        USER_UPDATE: onUserUpdate,
        MESSAGE_POLL_VOTE_ADD: onPollVoteAdd,
    },

    async start() {
        await store.load();
        store.recordLogin();
        checkAccountAgeAchievements();
        knownGuildIds = null; // will snapshot on first GUILD_CREATE dispatch after load

        // periodic checks for things that aren't event-driven (account age, streak upkeep)
        (this as any)._interval = setInterval(() => {
            checkAccountAgeAchievements();
        }, 1000 * 60 * 60); // hourly is plenty; these change on the scale of years
    },

    stop() {
        if ((this as any)._interval) clearInterval((this as any)._interval);
        store.saveNow();
    },
});
