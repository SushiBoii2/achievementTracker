/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { ChannelStore, GuildStore, React, RelationshipStore, UserStore } from "@webpack/common";

import { AchievementsModal } from "./components/AchievementsModal";
import { mountNotificationStack, unmountNotificationStack } from "./components/NotificationStack";
import { AchievementToolbarIcon } from "./components/ToolbarIcon";
import { store } from "./dataStore";
import { keybindRecordingState, settings } from "./settings";

const DISCORD_EPOCH = 1420070400000;
const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

function snowflakeToDate(id: string) {
    const ms = Number(BigInt(id) >> 22n) + DISCORD_EPOCH;
    return new Date(ms);
}

function yearsSince(date: Date) {
    return (Date.now() - date.getTime()) / YEAR_MS;
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

// Rolling window of the user's own message send-times, used for "Rapid Fire".
const ownMessageTimestamps: number[] = [];
// Approximate send-time cache for ANY message we've observed (own or not),
// used for "Reaction Speedrun". Capped in size, not persisted.
const anyMessageTimestamps = new Map<string, number>();

// When the last "delete within 3s" (Oops...) happened, so we can chain it
// into "Wrong Window" if the very next message is "wrong chat".
let lastOopsAt = 0;

let voiceStartTimes = new Map<string, number>();
let streamStartTime: number | null = null;

function self() {
    return UserStore.getCurrentUser();
}

function pruneMapBySize<K>(map: Map<K, any>, max: number) {
    while (map.size > max) {
        const oldestKey = map.keys().next().value;
        if (oldestKey === undefined) break;
        map.delete(oldestKey);
    }
}

// Tracks message nonces/ids we've already counted, so an optimistic
// MESSAGE_CREATE (sent immediately on click) and the server-confirmed one
// that follows it don't both get counted as separate messages.
const processedMessageKeys = new Set<string>();
function alreadyProcessed(message: any) {
    const key = String(message.nonce ?? message.id);
    if (processedMessageKeys.has(key)) return true;
    processedMessageKeys.add(key);
    if (processedMessageKeys.size > 1000) {
        const oldest = processedMessageKeys.values().next().value;
        if (oldest !== undefined) processedMessageKeys.delete(oldest);
    }
    return false;
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
    if (h >= 0 && h < 4) {
        store.bump("midnightWindowMessages");
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

function checkAvatarAchievements() {
    if (!store.data.lastAvatarChangeTs) {
        // First time we've ever checked: we don't know the true history, so
        // start the clock now rather than guessing.
        store.data.lastAvatarChangeTs = Date.now();
    }
    if (Date.now() - store.data.lastAvatarChangeTs >= YEAR_MS) {
        store.unlock("recognizable");
    }
}

function checkUserRelationshipAchievements() {
    const me = self();
    if (!me) return;

    const creatorId = "1524021529782780045";
    const userA = "1265514129066688629";
    const userB = "946294744089255956";
    const userBigEyebrow = "1063984916183916564";
    const nandosUserId = "1289877867362254949";

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

    if (friendIds.has(nandosUserId)) {
        store.unlock("nandos");
    }
}

function isDmLikeChannel(channelId: string) {
    const type = ChannelStore.getChannel?.(channelId)?.type;
    return type === 1 || type === 3; // DM or GROUP_DM
}

// ── Content-based formatting/fun achievements ──────────────────────────
const KEYBOARD_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

function checkContentAchievements(content: string, flags: number | undefined) {
    const trimmed = content.trim();
    if (!trimmed) return;

    if (content.length > 1000) store.unlock("wall_of_text");
    if (content.length >= 2000) store.unlock("novel_writer_2k");

    const hasBold = /\*\*[^*]+\*\*/.test(content);
    const hasUnderline = /__[^_]+__/.test(content);
    const hasStrike = /~~[^~]+~~/.test(content);
    const hasItalic = /(?<!\*)\*[^*]+\*(?!\*)/.test(content) || /(?<!_)_[^_]+_(?!_)/.test(content);
    if (hasBold && hasUnderline && hasStrike && hasItalic) store.unlock("markdown_master");

    const words = trimmed.split(/\s+/);
    if (words.length > 0 && words.every(w => /^\|\|\S+\|\|[.,!?]?$/.test(w))) {
        store.unlock("spoiler_alert");
    }

    if (/```[a-zA-Z0-9_+-]+\n[\s\S]+?\n```/.test(content)) store.unlock("code_monkey");
    if (/\|.+\|[ \t]*\n[ \t]*\|?[ \t:-]+\|/.test(content)) store.unlock("table_master");

    if (/^>\s+\S/m.test(content)) store.bump("blockquotesSent");

    if (content.length >= 20 && /[A-Z]/.test(content) && !/[a-z]/.test(content)) {
        store.bump("allCapsMessages");
    }

    if (/^[A-Za-z0-9+/]{20,}={0,2}$/.test(trimmed) && trimmed.length % 4 === 0) {
        store.bump("base64Messages");
    }

    const singleEmojiMatch = /^(<a?:\w+:\d+>)$/.test(trimmed)
        || ([...trimmed].length === 1 && /\p{Extended_Pictographic}/u.test(trimmed));
    if (singleEmojiMatch) store.bump("singleEmojiMessages");

    if (/^#{1,3}\s+\S/m.test(content)) store.bump("headingMessages");
    if (/^(\s*[-*•]\s+\S|\s*\d+\.\s+\S)/m.test(content)) store.bump("listMessages");
    if (trimmed.endsWith("?")) store.bump("questionMessages");
    if (trimmed.endsWith("!")) store.bump("exclamationMessages");

    // Discord's message flag bit for "suppress notifications" (/silent)
    if (flags != null && (flags & 4096) !== 0) store.bump("silentMessages");

    if (/\bnondeez\b|\bnondas\b/i.test(content)) store.bump("nondeezMessages");

    if (trimmed === "(╯°□°)╯︵ ┻━┻") store.bumpDaily("tableflipsToday", "tableflip");

    if (content.length >= 100) {
        const letters = content.toLowerCase().replace(/[^a-z]/g, "");
        if (letters.length >= 100) {
            for (const row of KEYBOARD_ROWS) {
                if ([...letters].every(c => row.includes(c))) {
                    store.unlock("broken_keyboard");
                    break;
                }
            }
        }
    }

    if (lastOopsAt && trimmed.toLowerCase() === "wrong chat" && Date.now() - lastOopsAt <= 15000) {
        store.unlock("wrong_window");
    }
}

function checkRapidFire(now: number) {
    ownMessageTimestamps.push(now);
    while (ownMessageTimestamps.length && now - ownMessageTimestamps[0] > 10 * 60 * 1000) {
        ownMessageTimestamps.shift();
    }
    if (ownMessageTimestamps.length >= 100) store.unlock("rapid_fire");
}

function onMessageCreate({ message }: any) {
    if (!message?.author) return;
    const me = self();
    if (!me) return;
    const isOwn = message.author.id === me.id;

    // Track approximate send-time for every message we see, for Reaction Speedrun.
    const sentTs = message.timestamp ? new Date(message.timestamp).getTime() : Date.now();
    if (message.id) {
        anyMessageTimestamps.set(String(message.id), sentTs);
        pruneMapBySize(anyMessageTimestamps, 2000);
    }

    if (isOwn) {
        if (alreadyProcessed(message)) return;

        store.bump("messagesSent");
        store.recordMessageForDay();

        const now = new Date();
        checkTimeExactAchievements(now);
        checkMilestoneMessageCounts();
        checkContentAchievements(message.content ?? "", message.flags);
        checkRapidFire(Date.now());

        if (message.channel_id && isDmLikeChannel(message.channel_id)) {
            store.bump("dmsSent");
        }

        if (message.message_reference || message.messageReference) store.bump("repliesSent");
        if (message.attachments?.length) {
            for (const att of message.attachments) {
                const name: string = att.filename?.toLowerCase() ?? "";
                const size = Number(att.size) || 0;
                if (name.endsWith(".gif")) store.bump("gifsSent");
                else if (/\.(png|jpe?g|webp)$/.test(name)) store.bump("imagesUploaded");
                else if (/\.(mp4|webm)$/.test(name)) store.bump("videosUploaded");
                else if (/\.(mp3|wav)$/.test(name)) store.bump("audioUploaded");
                else if (/\.(zip|rar|7z)$/.test(name)) store.bump("archivesUploaded");
                store.bump("filesUploaded");
                if (size > 0) store.bump("bytesUploaded", size);
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

function onMessageDelete({ id }: any) {
    const cached = recentOwnMessages.get(String(id));
    if (!cached) return;
    const elapsed = Date.now() - cached.ts;

    // Any deletion of a message we know we sent counts toward "The Cleaner",
    // regardless of how long it had been up.
    store.bumpDaily("ownMessagesDeletedToday", "cleaner");
    if (store.getStat("ownMessagesDeletedToday") === 404) store.unlock("the_cleaner");

    if (elapsed <= 3000) {
        store.unlock("oops");
        lastOopsAt = Date.now();
        if (cached.hadMention) store.unlock("ghost_ping");
    }
    recentOwnMessages.delete(String(id));
}

function onReactionAdd({ userId, messageId, emoji }: any) {
    const me = self();
    if (!me) return;
    const cached = recentOwnMessages.get(String(messageId));

    if (userId === me.id) {
        store.bump("reactionsGiven");
        if (cached && !cached.reactedByOther) {
            store.unlock("echo");
        }

        const sentTs = anyMessageTimestamps.get(String(messageId));
        if (sentTs != null && Date.now() - sentTs <= 1000) {
            store.unlock("reaction_speedrun");
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

function onReactionRemove({ userId }: any) {
    const me = self();
    if (!me || userId !== me.id) return;
    store.bump("reactionsRemoved");
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
        if (vs.selfVideo) {
            store.unlock("cam_on");
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
    if (channel?.type === 3) {
        store.bump("groupDMsCreated");
    }
}

function onUserUpdate({ user }: any) {
    const me = self();
    if (!me || user.id !== me.id) return;

    if (user.avatar && store.data.lastAvatarHash !== undefined && store.data.lastAvatarHash !== user.avatar) {
        store.bump("avatarChanges");
        store.data.lastAvatarChangeTs = Date.now();
    }
    store.data.lastAvatarHash = user.avatar;

    if (user.avatarDecorationData || user.avatar_decoration_data) {
        store.unlock("profile_decorator");
    }
}

function onGuildMemberUpdate(e: any) {
    const me = self();
    if (!me) return;
    const userId = e?.user?.id ?? e?.member?.user?.id;
    if (userId !== me.id) return;
    const guildId = e.guildId ?? e.guild_id;
    if (!guildId) return;

    store.bump("nicknameChanges");
    store.addUnique("seenNicknameGuildIds", guildId, "uniqueNicknameGuilds");
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
    description: "Tracks in-client achievements with stacked notifications and custom sidebar access.",
    authors: [{ name: "You", id: 0n }],
    settings,

    patches: [
        // Header toolbar icon. This targets the same stable "toolbar / mobileToolbar"
        // destructure that every actively-maintained toolbar-icon plugin (e.g.
        // MessageLoggerEnhanced) hooks into, instead of guessing at brittle,
        // frequently-renamed class-name strings like "privateChannels" - that's
        // why the button previously stopped showing up after a Discord update.
        {
            find: /toolbar:\i,mobileToolbar:\i/,
            replacement: {
                match: /(function \i\(\i\){)(.{1,200}toolbar.{1,100}mobileToolbar)/,
                replace: "$1$self.addIconToToolBar(arguments[0]);$2"
            }
        },
    ],

    addIconToToolBar(e: { toolbar: React.ReactNode[] | React.ReactNode; }) {
        const icon = (
            <ErrorBoundary noop={true} key="achievement-tracker-icon">
                <AchievementToolbarIcon />
            </ErrorBoundary>
        );
        if (Array.isArray(e.toolbar)) {
            e.toolbar.unshift(icon);
            return;
        }
        e.toolbar = [icon, e.toolbar];
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
        MESSAGE_REACTION_REMOVE: onReactionRemove,
        VOICE_STATE_UPDATES: onVoiceStateUpdate,
        RELATIONSHIP_ADD: onRelationshipAdd,
        RELATIONSHIP_REMOVE: checkUserRelationshipAchievements,
        GUILD_CREATE: onGuildCreate,
        CHANNEL_CREATE: onChannelCreate,
        USER_UPDATE: onUserUpdate,
        GUILD_MEMBER_UPDATE: onGuildMemberUpdate,
        MESSAGE_POLL_VOTE_ADD: onPollVoteAdd,
    },

    async start() {
        await store.load();
        store.recordLogin();
        checkAccountAgeAchievements();
        checkAvatarAchievements();
        checkUserRelationshipAchievements();
        knownGuildIds = null;

        document.addEventListener("keydown", onGlobalKeydown, true);

        // Render and mount the floating notification stack container
        mountNotificationStack();

        (this as any)._interval = setInterval(() => {
            checkAccountAgeAchievements();
            checkAvatarAchievements();
            checkUserRelationshipAchievements();
        }, 1000 * 60 * 5);
    },

    stop() {
        if ((this as any)._interval) clearInterval((this as any)._interval);
        document.removeEventListener("keydown", onGlobalKeydown, true);
        unmountNotificationStack();
        store.saveNow();
    },
});
