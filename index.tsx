/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { GuildStore, React, RelationshipStore, UserStore } from "@webpack/common";

import { AchievementsModal } from "./components/AchievementsModal";
import { NotificationStackContainer } from "./components/NotificationStack";
import { AchievementSidebarButton } from "./components/SidebarButton";
import { AchievementToolbarIcon } from "./components/ToolbarIcon";
import { store } from "./dataStore";
import { keybindRecordingState, settings } from "./settings";

// ... [existing timing / achievement helper functions remain unchanged] ...

export default definePlugin({
    name: "AchievementTracker",
    description: "Tracks in-client achievements with stacked notifications and custom sidebar access.",
    authors: [{ name: "You", id: 0n }],
    settings,

    patches: [
        // DM Sidebar Patch: Inserts Achievements right after Quests / Shop
        {
            find: "private-channels-item",
            replacement: {
                match: /(children:\[)(.*?\bquests\b.*?|\bshop\b.*?)(?=\])/,
                replace: "$1$2,$self.renderSidebarButton()"
            }
        },
        // Fallback sidebar navigation patch
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
        }
    ],

    renderToolbarIcon() {
        return <AchievementToolbarIcon key="achievement-tracker-icon" />;
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

    // Global Floating Notification Container renderer
    renderNotificationStack() {
        return <NotificationStackContainer key="achievement-notification-stack" />;
    },

    async start() {
        await store.load();
        store.recordLogin();
        checkAccountAgeAchievements();

        document.addEventListener("keydown", onGlobalKeydown, true);

        // Mount notification stack container globally
        const container = document.createElement("div");
        container.id = "achievement-tracker-notifications";
        document.body.appendChild(container);

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
