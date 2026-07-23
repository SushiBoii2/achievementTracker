/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize } from "@utils/modal";
import { Forms, React, Text } from "@webpack/common";

import { ACHIEVEMENTS, Tier, TIER_META } from "../achievements";
import { store } from "../dataStore";

const TIER_ORDER: Tier[] = ["bronze", "silver", "gold", "platinum", "mythic", "hidden", "ascendant", "transcendent"];

function ProgressBar({ value, goal }: { value: number; goal: number; }) {
    const pct = Math.max(0, Math.min(100, (value / goal) * 100));
    return (
        <div style={{ width: "100%", height: 6, background: "var(--background-modifier-accent)", borderRadius: 3, marginTop: 4 }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "var(--brand-experiment)", borderRadius: 3, transition: "width .2s" }} />
        </div>
    );
}

function AchievementRow({ id }: { id: string; }) {
    const ach = ACHIEVEMENTS.find(a => a.id === id)!;
    const unlocked = store.isUnlocked(ach.id);
    const isSecretLocked = ach.secret && !unlocked;
    const meta = TIER_META[ach.tier];

    return (
        <div style={{
            display: "flex", gap: 12, padding: "10px 12px", borderRadius: 8,
            background: unlocked ? "rgba(87, 242, 135, 0.08)" : "var(--background-secondary)",
            marginBottom: 8, opacity: unlocked ? 1 : 0.75,
        }}>
            <div style={{ fontSize: 24, lineHeight: "28px" }}>{meta.emoji}</div>
            <div style={{ flex: 1 }}>
                <Text variant="text-md/semibold">
                    {isSecretLocked ? "??? (Secret Achievement)" : ach.name}
                </Text>
                <Text variant="text-sm/normal" style={{ opacity: 0.8 }}>
                    {isSecretLocked ? "Keep playing to discover this one." : ach.description}
                </Text>
                {!isSecretLocked && (
                    <Text variant="text-sm/normal" style={{ opacity: 0.5, fontStyle: "italic" }}>
                        {ach.flavor}
                    </Text>
                )}
                {!unlocked && !isSecretLocked && ach.stat && ach.goal && (
                    <ProgressBar value={store.getStat(ach.stat)} goal={ach.goal} />
                )}
                {unlocked && (
                    <Text variant="text-sm/normal" style={{ opacity: 0.5 }}>
                        Unlocked {new Date(store.data.unlocked[ach.id]).toLocaleDateString()}
                    </Text>
                )}
            </div>
        </div>
    );
}

export function AchievementsModal(props: ModalProps) {
    const [tab, setTab] = React.useState<Tier>("bronze");
    const grouped = React.useMemo(() => {
        const map = new Map<Tier, typeof ACHIEVEMENTS>();
        for (const t of TIER_ORDER) map.set(t, []);
        for (const a of ACHIEVEMENTS) map.get(a.tier)?.push(a);
        return map;
    }, []);

    const total = ACHIEVEMENTS.length;
    const unlockedTotal = ACHIEVEMENTS.filter(a => store.isUnlocked(a.id)).length;

    return (
        <ModalRoot {...props} size={ModalSize.LARGE}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flex: 1 }}>
                    🏆 Achievements ({unlockedTotal}/{total})
                </Text>
                <ModalCloseButton onClick={props.onClose} />
            </ModalHeader>
            <ModalContent style={{ paddingTop: 16, paddingBottom: 16 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                    {TIER_ORDER.map(t => (
                        <div
                            key={t}
                            onClick={() => setTab(t)}
                            style={{
                                cursor: "pointer", padding: "6px 12px", borderRadius: 20,
                                background: tab === t ? "var(--brand-experiment)" : "var(--background-secondary-alt)",
                                fontSize: 13, fontWeight: 600,
                            }}
                        >
                            {TIER_META[t].emoji} {TIER_META[t].label} ({grouped.get(t)?.filter(a => store.isUnlocked(a.id)).length ?? 0}/{grouped.get(t)?.length ?? 0})
                        </div>
                    ))}
                </div>
                {(grouped.get(tab) ?? []).length === 0 ? (
                    <Forms.FormText>No achievements in this tier yet.</Forms.FormText>
                ) : (
                    grouped.get(tab)!.map(a => <AchievementRow key={a.id} id={a.id} />)
                )}
            </ModalContent>
        </ModalRoot>
    );
}
