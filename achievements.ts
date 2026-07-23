/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// ─────────────────────────────────────────────────────────────────────────
// This file is DATA ONLY - it defines every achievement the tracker knows
// about. See README.md for a full explanation of which of the ~420
// achievements from the original spec are included here and which were
// skipped (and why - mostly because Discord's client simply does not
// expose the data needed, e.g. "top 1% of users globally", "a solar
// eclipse is visible from your location", or anything about OTHER users'
// actions/servers you don't have insight into).
//
// Every achievement has a `stat` (a counter key tracked in dataStore.ts)
// and a `goal`, OR is `manual: true` meaning it's unlocked by bespoke logic
// living directly in index.tsx (things like exact-timestamp achievements,
// account-age achievements, or secret "gotcha" achievements).
// ─────────────────────────────────────────────────────────────────────────

export type Tier =
    | "bronze"
    | "silver"
    | "gold"
    | "platinum"
    | "mythic"
    | "ascendant"
    | "transcendent"
    | "hidden";

export interface Achievement {
    id: string;
    tier: Tier;
    /** true = this is a "-secret" variant of its tier (hidden until unlocked, shown with a "???" silhouette) */
    secret?: boolean;
    category: string;
    name: string;
    description: string;
    flavor: string;
    /** counter key in the stats object this achievement tracks. Omit if manual */
    stat?: string;
    goal?: number;
    /** unlocked via bespoke logic elsewhere instead of a simple counter threshold */
    manual?: boolean;
}

export const TIER_META: Record<Tier, { label: string; emoji: string; color: string; }> = {
    bronze: { label: "Bronze", emoji: "🟤", color: "#a97142" },
    silver: { label: "Silver", emoji: "⚪", color: "#c7c7c7" },
    gold: { label: "Gold", emoji: "🟡", color: "#e2b93b" },
    platinum: { label: "Platinum", emoji: "🔷", color: "#5cc9e0" },
    mythic: { label: "Mythic", emoji: "🌌", color: "#b45cff" },
    ascendant: { label: "Ascendant", emoji: "💠", color: "#33f7d1" },
    transcendent: { label: "Transcendent", emoji: "👑", color: "#ffd700" },
    hidden: { label: "Hidden", emoji: "❔", color: "#666666" },
};

export const ACHIEVEMENTS: Achievement[] = [
    // ── MESSAGING ──────────────────────────────────────────────────────
    { id: "first_words", tier: "bronze", category: "Messaging", name: "First Words", description: "Send your very first message.", flavor: "Every community starts with hello.", stat: "messagesSent", goal: 1 },
    { id: "reaction_rookie", tier: "bronze", category: "Messaging", name: "Reaction Rookie", description: "Receive your first reaction.", flavor: "Someone noticed. Nice.", stat: "reactionsReceived", goal: 1 },
    { id: "express_yourself", tier: "bronze", category: "Messaging", name: "Express Yourself", description: "Use 50 unique emojis.", flavor: "Sometimes words just aren't enough.", stat: "uniqueEmojisUsed", goal: 50 },
    { id: "gif_dealer", tier: "bronze", category: "Messaging", name: "GIF Dealer", description: "Send 100 GIFs.", flavor: "Modern communication at its finest.", stat: "gifsSent", goal: 100 },
    { id: "sticker_fanatic", tier: "bronze", category: "Messaging", name: "Sticker Fanatic", description: "Send 50 stickers.", flavor: "Tiny images. Massive personality.", stat: "stickersSent", goal: 50 },
    { id: "photo_drop", tier: "bronze", category: "Messaging", name: "Photo Drop", description: "Upload your first image.", flavor: "A picture is worth at least one message.", stat: "imagesUploaded", goal: 1 },
    { id: "file_courier", tier: "bronze", category: "Messaging", name: "File Courier", description: "Upload 25 files.", flavor: "Digital delivery complete.", stat: "filesUploaded", goal: 25 },
    { id: "quick_reply", tier: "bronze", category: "Messaging", name: "Quick Reply", description: "Reply to 250 messages.", flavor: "Context is everything.", stat: "repliesSent", goal: 250 },
    { id: "mentioned", tier: "bronze", category: "Messaging", name: "Mentioned", description: "Be mentioned 100 times.", flavor: "You're apparently important.", stat: "mentionsReceived", goal: 100 },
    { id: "conversation_keeper", tier: "silver", category: "Messaging", name: "Conversation Keeper", description: "Send 10,000 messages.", flavor: "You've definitely had a few things to say.", stat: "messagesSent", goal: 10000 },
    { id: "emoji_encyclopedia", tier: "silver", category: "Messaging", name: "Emoji Encyclopedia", description: "Use 250 different emojis.", flavor: "There really is an emoji for everything.", stat: "uniqueEmojisUsed", goal: 250 },
    { id: "media_maniac", tier: "silver", category: "Messaging", name: "Media Maniac", description: "Upload 500 images.", flavor: "Your storage is making nervous noises.", stat: "imagesUploaded", goal: 500 },
    { id: "typing_machine", tier: "gold", category: "Messaging", name: "Typing Machine", description: "Send 100,000 messages.", flavor: "Your keyboard deserves a vacation.", stat: "messagesSent", goal: 100000 },
    { id: "nice", tier: "gold", category: "Messaging", name: "Nice.", description: "Send exactly 69 messages in a single day.", flavor: "The internet applauds your maturity.", manual: true },
    { id: "night_owl", tier: "gold", category: "Messaging", name: "Night Owl", description: "Send at least one message between 2:00 AM and 5:00 AM on 30 different days.", flavor: "Sleep is temporary. Conversations are forever.", stat: "nightOwlDays", goal: 30 },
    { id: "early_bird", tier: "gold", category: "Messaging", name: "Early Bird", description: "Send a message before 6:00 AM on 30 different days.", flavor: "The sun isn't even awake yet.", stat: "earlyBirdDays", goal: 30 },
    { id: "rapid_fire", tier: "gold", category: "Messaging", name: "Rapid Fire", description: "Send 100 messages within 10 minutes without triggering Slowmode.", flavor: "Fingers of fury.", manual: true },
    { id: "typing_titan", tier: "platinum", category: "Messaging", name: "Typing Titan", description: "Send 1,000,000 messages.", flavor: "Somewhere, a keyboard manufacturer owes you a thank-you card.", stat: "messagesSent", goal: 1000000 },
    { id: "digital_footprint", tier: "mythic", category: "Messaging", name: "Digital Footprint", description: "Send 10,000,000 lifetime messages.", flavor: "Your words could fill libraries.", stat: "messagesSent", goal: 10000000 },
    { id: "triple_digits", tier: "silver", category: "Messaging", name: "Triple Digits", description: "Send your 111th lifetime message.", flavor: "Some numbers just feel satisfying.", manual: true },
    { id: "lucky_number", tier: "silver", category: "Messaging", name: "Lucky Number", description: "Send your 777th lifetime message.", flavor: "Seven seems to follow you around.", manual: true },
    { id: "elite", tier: "silver", category: "Messaging", name: "Elite", description: "Send your 1,337th lifetime message.", flavor: "Old internet traditions never truly die.", manual: true },
    { id: "power_of_two", tier: "silver", category: "Messaging", name: "Power of Two", description: "Send your 2,048th lifetime message.", flavor: "Binary appreciates your efforts.", manual: true },
    { id: "the_observer", tier: "gold", category: "Messaging", name: "The Observer", description: "Read 50,000 messages without sending one.", flavor: "Sometimes watching is enough.", manual: true },

    // ── TIME-EXACT (manual, checked on every outgoing message) ─────────
    { id: "lucky_seven", tier: "gold", category: "Time", name: "Lucky Seven", description: "Send a message at exactly 07:07:07 local time.", flavor: "Perfect timing is its own reward.", manual: true },
    { id: "high_noon", tier: "gold", category: "Time", name: "High Noon", description: "Send a message at exactly 12:00:00 PM.", flavor: "Right on the dot.", manual: true },
    { id: "last_second", tier: "gold", category: "Time", name: "Last Second", description: "Send a message at 11:59:59 PM.", flavor: "Just made it.", manual: true },
    { id: "eleven_eleven", tier: "bronze", secret: true, category: "Time", name: "11:11", description: "Send a message at exactly 11:11:11 local time.", flavor: "Make a wish.", manual: true },
    { id: "new_years_hello", tier: "silver", category: "Time", name: "New Year's Hello", description: "Send a message between 12:00:00 AM and 12:00:59 AM on January 1.", flavor: "Starting the year with a notification.", manual: true },
    { id: "midnight_oil", tier: "silver", category: "Time", name: "Midnight Oil", description: "Send a message after midnight on 100 different days.", flavor: "Night shifts, voluntarily.", stat: "midnightDays", goal: 100 },

    // ── STREAKS / LOGIN ─────────────────────────────────────────────────
    { id: "one_week_strong", tier: "bronze", category: "Time", name: "One Week Strong", description: "Log in for 7 consecutive days.", flavor: "Small streaks become long journeys.", stat: "loginStreak", goal: 7 },
    { id: "monthly_habit", tier: "silver", category: "Time", name: "Monthly Habit", description: "Log in for 30 consecutive days.", flavor: "Discord has become part of the routine.", stat: "loginStreak", goal: 30 },
    { id: "half_year_streak", tier: "silver", category: "Time", name: "Half-Year Streak", description: "Log in for 180 consecutive days.", flavor: "Consistency pays off.", stat: "loginStreak", goal: 180 },
    { id: "always_here", tier: "gold", category: "Time", name: "Always Here", description: "Log in every day for 365 consecutive days.", flavor: "Dedication... or muscle memory.", stat: "loginStreak", goal: 365 },
    { id: "the_365_club", tier: "platinum", category: "Time", name: "365 Club", description: "Log in every day for one full year.", flavor: "A perfect streak.", stat: "loginStreak", goal: 365 },
    { id: "eternal_routine", tier: "mythic", category: "Time", name: "Eternal Routine", description: "Log in every day for 10 consecutive years.", flavor: "Habit became history.", stat: "loginStreak", goal: 3650 },

    // ── ACCOUNT AGE (manual, derived from the Discord snowflake - always accurate) ──
    { id: "anniversary", tier: "bronze", category: "Time", name: "Anniversary", description: "Own your Discord account for 1 year.", flavor: "Time flies when notifications never stop.", manual: true },
    { id: "discord_elder", tier: "platinum", category: "Time", name: "Discord Elder", description: "Own your Discord account for 10 years.", flavor: "You've witnessed many UI redesigns.", manual: true },
    { id: "living_history", tier: "platinum", category: "Time", name: "Living History", description: "Own your Discord account for 15 years.", flavor: "You've witnessed generations of memes.", manual: true },
    { id: "forever_here", tier: "mythic", category: "Time", name: "Forever Here", description: "Own your Discord account for 20 years.", flavor: "You have outlived several redesigns.", manual: true },
    { id: "the_veteran", tier: "mythic", category: "Time", name: "The Veteran", description: "Reach Discord account age 20 years and maintain active status.", flavor: "Time itself became your badge.", manual: true },
    { id: "leapling", tier: "silver", secret: true, category: "Time", name: "Leapling", description: "Log into Discord on February 29.", flavor: "Some days only come around every so often.", manual: true },

    // ── REACTIONS / EMOJI ────────────────────────────────────────────────
    { id: "reaction_machine", tier: "silver", category: "Reactions", name: "Reaction Machine", description: "Add 1,000 reactions.", flavor: "Communication through tiny yellow circles.", stat: "reactionsGiven", goal: 1000 },
    { id: "emoji_apprentice", tier: "silver", category: "Reactions", name: "Emoji Apprentice", description: "Use 1,000 emoji reactions.", flavor: "Actions speak louder than words.", stat: "reactionsGiven", goal: 1000 },
    { id: "first_laugh", tier: "silver", category: "Reactions", name: "First Laugh", description: "Receive 100 😂 reactions.", flavor: "Apparently, you're funny.", stat: "laughReactionsReceived", goal: 100 },
    { id: "heartfelt", tier: "silver", category: "Reactions", name: "Heartfelt", description: "Receive 500 ❤️ reactions.", flavor: "Some messages deserve appreciation.", stat: "heartReactionsReceived", goal: 500 },
    { id: "thumbs_up", tier: "silver", category: "Reactions", name: "Thumbs Up", description: "Receive 1,000 👍 reactions.", flavor: "Universal approval.", stat: "thumbsReactionsReceived", goal: 1000 },
    { id: "reaction_magnet", tier: "gold", category: "Reactions", name: "Reaction Magnet", description: "Receive 10,000 reactions.", flavor: "People really enjoy your messages.", stat: "reactionsReceived", goal: 10000 },
    { id: "laugh_factory", tier: "gold", category: "Reactions", name: "Laugh Factory", description: "Receive 5,000 😂 reactions.", flavor: "Comedy suits you.", stat: "laughReactionsReceived", goal: 5000 },
    { id: "heart_collector", tier: "gold", category: "Reactions", name: "Heart Collector", description: "Receive 10,000 ❤️ reactions.", flavor: "You made quite an impression.", stat: "heartReactionsReceived", goal: 10000 },
    { id: "reaction_master", tier: "gold", category: "Reactions", name: "Reaction Master", description: "Add 100,000 reactions.", flavor: "Your mouse has seen things.", stat: "reactionsGiven", goal: 100000 },
    { id: "household_name", tier: "platinum", category: "Reactions", name: "Household Name", description: "Receive 100,000 reactions.", flavor: "People recognize your messages before your profile picture.", stat: "reactionsReceived", goal: 100000 },
    { id: "reaction_black_hole", tier: "mythic", category: "Reactions", name: "Reaction Black Hole", description: "Receive over 1,000,000 reactions across your lifetime.", flavor: "Everything gravitates toward your messages.", stat: "reactionsReceived", goal: 1000000 },

    // ── VOICE ─────────────────────────────────────────────────────────
    { id: "voice_check", tier: "bronze", category: "Voice", name: "Voice Check", description: "Join a voice channel for the first time.", flavor: "Testing... testing... can anyone hear you?", stat: "voiceJoins", goal: 1 },
    { id: "mic_on", tier: "bronze", category: "Voice", name: "Mic On", description: "Speak in voice chat for 30 minutes.", flavor: "Breaking the awkward silence.", stat: "voiceSeconds", goal: 1800 },
    { id: "listener", tier: "bronze", category: "Voice", name: "Listener", description: "Spend 10 hours in voice chat.", flavor: "Sometimes it's better to listen.", stat: "voiceSeconds", goal: 36000 },
    { id: "voice_veteran", tier: "silver", category: "Voice", name: "Voice Veteran", description: "Spend 100 hours in voice chat.", flavor: "Countless conversations later...", stat: "voiceSeconds", goal: 360000 },
    { id: "voice_regular", tier: "silver", category: "Voice", name: "Voice Regular", description: "Spend 250 hours in voice chat.", flavor: "You practically live here.", stat: "voiceSeconds", goal: 900000 },
    { id: "voice_legend", tier: "gold", category: "Voice", name: "Voice Legend", description: "Spend 1,000 hours in voice chat.", flavor: "You've probably heard every microphone imaginable.", stat: "voiceSeconds", goal: 3600000 },
    { id: "open_mic", tier: "gold", category: "Voice", name: "Open Mic", description: "Speak in voice chat for 500 total hours.", flavor: "Your microphone deserves retirement.", stat: "voiceSeconds", goal: 1800000 },
    { id: "voice_addict", tier: "platinum", category: "Voice", name: "Voice Addict", description: "Spend 5,000 hours in voice chat.", flavor: "You practically pay rent here.", stat: "voiceSeconds", goal: 18000000 },
    { id: "living_room", tier: "platinum", category: "Voice", name: "Living Room", description: "Spend 10,000 hours in voice chat.", flavor: "Discord became a place, not an app.", stat: "voiceSeconds", goal: 36000000 },
    { id: "the_hangout", tier: "mythic", category: "Voice", name: "The Hangout", description: "Spend 25,000 total hours in voice chat.", flavor: "You've built years of conversations.", stat: "voiceSeconds", goal: 90000000 },
    { id: "sound_check", tier: "silver", category: "Voice", name: "Sound Check", description: "Join 100 different voice channels.", flavor: "Every room has its own vibe.", stat: "uniqueVoiceChannels", goal: 100 },
    { id: "voice_explorer", tier: "gold", category: "Voice", name: "Voice Explorer", description: "Join voice channels in 100 different servers.", flavor: "Every community sounds different.", stat: "uniqueVoiceGuilds", goal: 100 },
    { id: "streamer", tier: "bronze", category: "Voice", name: "Streamer", description: "Share your screen for one hour.", flavor: "Hope nobody saw your 87 open tabs.", stat: "streamSeconds", goal: 3600 },
    { id: "screen_hero", tier: "silver", category: "Voice", name: "Screen Hero", description: "Share your screen for 25 hours.", flavor: "Free tech support wasn't in the job description.", stat: "streamSeconds", goal: 90000 },
    { id: "streaming_star", tier: "gold", category: "Voice", name: "Streaming Star", description: "Share your screen for 250 hours.", flavor: "The unofficial tech support representative.", stat: "streamSeconds", goal: 900000 },
    { id: "master_broadcaster", tier: "platinum", category: "Voice", name: "Master Broadcaster", description: "Share your screen for 1,000 hours.", flavor: "Everyone has seen your desktop by now.", stat: "streamSeconds", goal: 3600000 },

    // ── FRIENDS / SOCIAL ─────────────────────────────────────────────
    { id: "friend_request", tier: "bronze", category: "Social", name: "Friend Request", description: "Add your first friend.", flavor: "Connections begin somewhere.", stat: "friendsAdded", goal: 1 },
    { id: "direct_line", tier: "bronze", category: "Social", name: "Direct Line", description: "Send your first DM.", flavor: "Private conversations unlocked.", stat: "dmsSent", goal: 1 },
    { id: "server_hopper", tier: "bronze", category: "Social", name: "Server Hopper", description: "Join 10 servers.", flavor: "Exploring the neighborhoods of Discord.", stat: "serversJoined", goal: 10 },
    { id: "builder", tier: "bronze", category: "Social", name: "Builder", description: "Create your first server.", flavor: "Every empire starts with one channel.", stat: "serversCreated", goal: 1 },
    { id: "customizer", tier: "bronze", category: "Social", name: "Customizer", description: "Change your avatar.", flavor: "New look, same chaos.", stat: "avatarChanges", goal: 1 },
    { id: "about_me", tier: "bronze", category: "Social", name: "About Me", description: "Fill out your profile bio.", flavor: "Tell the world... something.", manual: true },
    { id: "dm_enthusiast", tier: "silver", category: "Social", name: "DM Enthusiast", description: "Send 2,500 direct messages.", flavor: "Some conversations stay private.", stat: "dmsSent", goal: 2500 },
    { id: "friend_circle", tier: "silver", category: "Social", name: "Friend Circle", description: "Reach 100 friends.", flavor: "Quite the contact list.", stat: "friendCount", goal: 100 },
    { id: "explorer_supreme", tier: "gold", category: "Social", name: "Explorer Supreme", description: "Join 100 servers over your Discord lifetime.", flavor: "There is always another community waiting.", stat: "serversJoined", goal: 100 },
    { id: "social_icon", tier: "platinum", category: "Social", name: "Social Icon", description: "Reach 500 friends.", flavor: "Your friends list scrolls.", stat: "friendCount", goal: 500 },
    { id: "group_chat", tier: "silver", category: "Social", name: "Group Chat", description: "Create your first Group DM.", flavor: "The chaos has multiple participants now.", stat: "groupDMsCreated", goal: 1 },
    { id: "profile_complete", tier: "silver", category: "Social", name: "Profile Complete", description: "Fill out every editable section of your profile.", flavor: "First impressions matter.", manual: true },
    { id: "recognizable", tier: "gold", category: "Social", name: "Recognizable", description: "Use the same avatar for one full year.", flavor: "People know it's you before reading your name.", manual: true },

    // ── THREADS / POLLS / MISC ──────────────────────────────────────
    { id: "thread_explorer", tier: "bronze", category: "Messaging", name: "Thread Explorer", description: "Participate in 25 threads.", flavor: "Some conversations deserve their own lane.", stat: "uniqueThreadsParticipated", goal: 25 },
    { id: "thread_master", tier: "silver", category: "Messaging", name: "Thread Master", description: "Create 100 threads.", flavor: "Organized chaos is still organized.", stat: "threadsCreated", goal: 100 },
    { id: "poll_voter", tier: "bronze", category: "Messaging", name: "Poll Voter", description: "Vote in 50 polls.", flavor: "Democracy, one click at a time.", stat: "pollsVoted", goal: 50 },
    { id: "poll_creator", tier: "silver", category: "Messaging", name: "Poll Creator", description: "Create 100 polls.", flavor: "Let the people decide.", stat: "pollsCreated", goal: 100 },

    // ── SECRET / HIDDEN (manual, event-correlation based) ─────────────
    { id: "oops", tier: "bronze", secret: true, category: "Secret", name: "Oops...", description: "Delete a message within 3 seconds of sending it.", flavor: "We've all typed first and thought second.", manual: true },
    { id: "ghost_ping", tier: "silver", secret: true, category: "Secret", name: "Ghost Ping", description: "Ping someone, then delete the message before they could reasonably have read it.", flavor: "Did they imagine it?", manual: true },
    { id: "echo", tier: "silver", secret: true, category: "Secret", name: "Echo", description: "Be the first person to react to your own message.", flavor: "Confidence is a fascinating thing.", manual: true },
    { id: "wrong_window", tier: "silver", secret: true, category: "Secret", name: "Wrong Window", description: "Send a message, immediately delete it, then send \"wrong chat.\"", flavor: "A classic. Everyone believes you. Probably.", manual: true },
    { id: "the_cleaner", tier: "platinum", secret: true, category: "Secret", name: "The Cleaner", description: "Delete exactly 404 of your own messages in one day.", flavor: "Error: Messages Not Found.", manual: true },
    { id: "double_take", tier: "bronze", secret: true, category: "Secret", name: "Double Take", description: "Send two identical messages exactly one year apart.", flavor: "History repeats itself.", manual: true },
    { id: "the_lurker", tier: "mythic", secret: true, category: "Secret", name: "The Lurker", description: "Read messages for 100 hours (time active, not idle) without sending one.", flavor: "Watching. Waiting. Judging... probably.", manual: true },
    { id: "friday_feeling", tier: "bronze", secret: true, category: "Secret", name: "Friday Feeling", description: "Send your first message on a Friday the 13th.", flavor: "Just a normal day... probably.", manual: true },
    { id: "clockwork", tier: "gold", secret: true, category: "Secret", name: "Clockwork", description: "Send a message at exactly the same second on five consecutive days.", flavor: "Remarkably precise.", manual: true },

    // ── HIDDEN meta / completion (manual, computed from other unlocks) ──
    { id: "completionist", tier: "ascendant", category: "Meta", name: "The Completionist", description: "Unlock every trackable achievement in this plugin.", flavor: "One final mystery remains.", manual: true },
    { id: "the_discordian", tier: "transcendent", category: "Meta", name: "The Discordian", description: "Unlock every achievement, including every hidden one.", flavor: "You didn't just use Discord. You became part of its history.", manual: true },
    { id: "halfway_there", tier: "platinum", category: "Meta", name: "Halfway There", description: "Unlock half of all achievements.", flavor: "You've climbed halfway up the mountain.", manual: true },
    { id: "jack_of_all_trades", tier: "platinum", category: "Meta", name: "Jack of All Trades", description: "Unlock at least one achievement in every category.", flavor: "Every journey has begun.", manual: true },
];

export function getAchievement(id: string) {
    return ACHIEVEMENTS.find(a => a.id === id);
}
