/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openModal } from "@utils/modal";
import { findComponentByCodeLazy } from "@webpack";

import { AchievementsModal } from "./AchievementsModal";

// This is the same header-bar icon component Discord itself uses for the
// Inbox/Help/etc icons (and that other toolbar-icon plugins like
// MessageLoggerEnhanced use), so it automatically matches native spacing,
// hover states, and mobile-toolbar behavior instead of us hand-rolling a
// <div> that can drift out of sync with Discord's real styling.
const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_TOP:", '"aria-haspopup":');

function TrophyIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                fill="currentColor"
                d="M17 4V2H7v2H2v3c0 2.4 1.72 4.38 4 4.9.44 1.84 1.83 3.31 3.62 3.86L9 20H7v2h10v-2h-2l-.62-6.24A5.007 5.007 0 0 0 18 9.9c2.28-.52 4-2.5 4-4.9V4h-5ZM4 7V6h2.1c.14 1.47.55 2.85 1.18 4.09C5.83 9.6 4 8.5 4 7Zm12.72 3.09A5.99 5.99 0 0 0 17.9 6H20v1c0 1.5-1.83 2.6-3.28 3.09Z"
            />
        </svg>
    );
}

export function AchievementToolbarIcon() {
    return (
        <HeaderBarIcon
            className="vc-achievement-tracker-toolbox-btn"
            onClick={() => openModal(props => <AchievementsModal {...props} />)}
            tooltip="Achievements"
            icon={TrophyIcon}
        />
    );
}
