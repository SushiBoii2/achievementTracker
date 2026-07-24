/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openModal } from "@utils/modal";
import { React } from "@webpack/common";

import { AchievementsModal } from "./AchievementsModal";

export function AchievementSidebarButton() {
    const [hovered, setHovered] = React.useState(false);

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => openModal(props => <AchievementsModal {...props} />)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: "flex",
                alignItems: "center",
                height: 42,
                padding: "0 12px",
                margin: "2px 8px",
                borderRadius: 4,
                cursor: "pointer",
                backgroundColor: hovered ? "var(--background-modifier-hover)" : "transparent",
                color: hovered ? "var(--interactive-hover)" : "var(--channels-default)",
                transition: "background-color 0.15s ease, color 0.15s ease",
            }}
        >
            <div style={{ marginRight: 12, display: "flex", alignItems: "center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 4V2H7v2H2v3c0 2.4 1.72 4.38 4 4.9.44 1.84 1.83 3.31 3.62 3.86L9 20H7v2h10v-2h-2l-.62-6.24A5.007 5.007 0 0 0 18 9.9c2.28-.52 4-2.5 4-4.9V4h-5ZM4 7V6h2.1c.14 1.47.55 2.85 1.18 4.09C5.83 9.6 4 8.5 4 7Zm12.72 3.09A5.99 5.99 0 0 0 17.9 6H20v1c0 1.5-1.83 2.6-3.28 3.09Z" />
                </svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 500, flex: 1 }}>Achievements</span>
        </div>
    );
}
