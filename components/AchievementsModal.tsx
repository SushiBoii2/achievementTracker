/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize } from "@utils/modal";
import { Forms, React, Text, Tooltip } from "@webpack/common";

import { ACHIEVEMENTS, Tier, TIER_META } from "../achievements";
import { store } from "../dataStore";
import { settings } from "../settings";
import { getSecretStyle, getTierStyles } from "../styles";
import { notificationManager } from "./NotificationStack";

const TIER_ORDER: Tier[] = ["bronze", "silver", "gold", "platinum", "mythic", "hidden", "ascendant", "transcendent"];

function ProgressBar({ value, goal, color }: { value: number; goal: number; color: string; }) {
    const pct = Math.max(0, Math.min(100, (value / goal) * 100));
    return (
        <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.12)", borderRadius: 3, marginTop: 6 }}>
            <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width .2s" }} />
        </div>
    );
}

function AchievementRow({ id, tierStyles, secretStyle }: {
    id: string;
    tierStyles: ReturnType<typeof getTierStyles>;
    secretStyle: ReturnType<typeof getSecretStyle>;
}) {
    const ach = ACHIEVEMENTS.find(a => a.id === id)!;
    const unlocked = store.isUnlocked(ach.id);
    const isSecretLocked = !!ach.secret && !unlocked;
    const style = ach.secret ? secretStyle : tierStyles[ach.tier];

    return (
        <div style={{
            display: "flex", gap: 12, padding: "10px 12px", borderRadius: 8,
            background: style.bgColor, marginBottom: 8,
            opacity: unlocked ? 1 : 0.65,
            border: unlocked ? "1px solid rgba(255,255,255,0.18)" : "1px solid transparent",
        }}>
            <div style={{ fontSize: 24, lineHeight: "28px" }}>{style.icon}</div>
            <div style={{ flex: 1 }}>
                <div style={{ color: style.textColor, fontWeight: 600, fontSize: 15 }}>
                    {isSecretLocked ? "??? (Secret Achievement)" : ach.name}
                    {unlocked && <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.8 }}>✓ Unlocked</span>}
                </div>
                <div style={{ color: style.textColor, opacity: 0.85, fontSize: 13, marginTop: 2 }}>
                    {isSecretLocked ? "Keep playing to discover this one." : ach.description}
                </div>
                {!isSecretLocked && (
                    <div style={{ color: style.textColor, opacity: 0.55, fontSize: 12, fontStyle: "italic", marginTop: 2 }}>
                        {ach.flavor}
                    </div>
                )}
                {!unlocked && !isSecretLocked && ach.stat && ach.goal && (
                    <ProgressBar value={store.getStat(ach.stat)} goal={ach.goal} color={style.textColor} />
                )}
                {unlocked && (
                    <div style={{ color: style.textColor, opacity: 0.55, fontSize: 12, marginTop: 4 }}>
                        Unlocked {new Date(store.data.unlocked[ach.id]).toLocaleDateString()}
                    </div>
                )}
            </div>
        </div>
    );
}

export function AchievementsModal(props: ModalProps) {
    settings.use(["tierStyles", "secretStyle", "unselectedTabTextColor"]);
    const tierStyles = getTierStyles();
    const secretStyle = getSecretStyle();

    const [tab, setTab] = React.useState<Tier>("bronze");
    const grouped = React.useMemo(() => {
        const map = new Map<Tier, typeof ACHIEVEMENTS>();
        for (const t of TIER_ORDER) map.set(t, []);
        for (const a of ACHIEVEMENTS) map.get(a.tier)?.push(a);
        return map;
    }, []);

    const total = ACHIEVEMENTS.length;
    const unlockedTotal = ACHIEVEMENTS.filter(a => store.isUnlocked(a.id)).length;

    const giveHint = () => {
        const uncompletedSecret = ACHIEVEMENTS.filter(
            a => (a.secret || a.tier === "hidden") && !store.isUnlocked(a.id)
        );

        if (uncompletedSecret.length === 0) {
            notificationManager.push({
                title: "All Secrets Unlocked!",
                description: "You have unlocked all secret achievements!",
                icon: "🎉",
                type: "info",
                duration: 4000
            });
            return;
        }

        const picked = uncompletedSecret[Math.floor(Math.random() * uncompletedSecret.length)];
        const hintText = picked.flavor || picked.description || "Look closely at your daily habits...";

        notificationManager.push({
            title: `Hint: ${picked.name}`,
            description: hintText,
            icon: "💡",
            type: "hint",
            duration: 6000
        });
    };

    return (
        <ModalRoot {...props} size={ModalSize.LARGE}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flex: 1 }}>
                    🏆 Achievements ({unlockedTotal}/{total})
                </Text>
                <Tooltip text="Get a hint for a secret achievement">
                    {tooltipProps => (
                        <button
                            {...tooltipProps}
                            onClick={giveHint}
                            aria-label="Get Hint"
                            style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                fontSize: 18,
                                fontWeight: "bold",
                                marginRight: 12,
                                color: "var(--interactive-normal)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "4px 8px",
                                borderRadius: "50%",
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = "var(--interactive-hover)")}
                            onMouseLeave={e => (e.currentTarget.style.color = "var(--interactive-normal)")}
                        >
                            ❓
                        </button>
                    )}
                </Tooltip>
                <ModalCloseButton onClick={props.onClose} />
            </ModalHeader>
            <ModalContent style={{ paddingTop: 16, paddingBottom: 16 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                    {TIER_ORDER.map(t => {
                        const style = tierStyles[t];
                        const count = grouped.get(t)?.length ?? 0;
                        const unlockedCount = grouped.get(t)?.filter(a => store.isUnlocked(a.id)).length ?? 0;
                        return (
                            <div
                                key={t}
                                onClick={() => setTab(t)}
                                style={{
                                    cursor: "pointer", padding: "6px 12px", borderRadius: 20,
                                    background: tab === t ? style.bgColor : "var(--background-secondary-alt)",
                                    color: tab === t ? style.textColor : (settings.store.unselectedTabTextColor || "#dbdee1"),
                                    fontSize: 13, fontWeight: 600,
                                    border: tab === t ? `1px solid ${style.textColor}` : "1px solid transparent",
                                }}
                            >
                                {style.icon} {TIER_META[t].label} ({unlockedCount}/{count})
                            </div>
                        );
                    })}
                </div>
                {(grouped.get(tab) ?? []).length === 0 ? (
                    <Forms.FormText>No achievements in this tier yet.</Forms.FormText>
                ) : (
                    grouped.get(tab)!.map(a => (
                        <AchievementRow key={a.id} id={a.id} tierStyles={tierStyles} secretStyle={secretStyle} />
                    ))
                )}
            </ModalContent>
        </ModalRoot>
    );
}
