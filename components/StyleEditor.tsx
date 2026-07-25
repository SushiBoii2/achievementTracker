/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, Forms } from "@webpack/common";

import { Tier, TIER_META } from "../achievements";
import { settings } from "../settings";
import { getSecretStyle, getTierStyles, resetStyles, setSecretStyle, setTierStyle } from "../styles";

const TIER_ORDER: Tier[] = ["bronze", "silver", "gold", "platinum", "mythic", "hidden", "ascendant", "transcendent"];

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void; }) {
    return (
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-normal)" }}>
            {label}
            <input
                type="color"
                value={value}
                onChange={e => onChange(e.target.value)}
                style={{ width: 28, height: 22, padding: 0, border: "none", background: "none", cursor: "pointer" }}
            />
        </label>
    );
}

function TierRow({ tier }: { tier: Tier; }) {
    settings.use(["tierStyles"]);
    const style = getTierStyles()[tier];

    return (
        <div style={{
            display: "flex", alignItems: "center", gap: 12, padding: "8px 10px",
            background: style.bgColor, borderRadius: 8, marginBottom: 6,
        }}>
            <input
                value={style.icon}
                onChange={e => setTierStyle(tier, { icon: e.target.value.slice(0, 4) })}
                style={{
                    width: 40, textAlign: "center", background: "var(--input-background)",
                    border: "1px solid var(--background-modifier-accent)", borderRadius: 4, color: "var(--text-normal)",
                }}
            />
            <span style={{ color: style.textColor, fontWeight: 600, flex: 1 }}>
                {TIER_META[tier].label}
            </span>
            <ColorField label="Text" value={style.textColor} onChange={v => setTierStyle(tier, { textColor: v })} />
            <ColorField label="BG" value={style.bgColor} onChange={v => setTierStyle(tier, { bgColor: v })} />
        </div>
    );
}

function SecretRow() {
    settings.use(["secretStyle"]);
    const style = getSecretStyle();

    return (
        <div style={{
            display: "flex", alignItems: "center", gap: 12, padding: "8px 10px",
            background: style.bgColor, borderRadius: 8, marginBottom: 6,
            border: "1px dashed rgba(255,255,255,0.25)",
        }}>
            <input
                value={style.icon}
                onChange={e => setSecretStyle({ icon: e.target.value.slice(0, 4) })}
                style={{
                    width: 40, textAlign: "center", background: "var(--input-background)",
                    border: "1px solid var(--background-modifier-accent)", borderRadius: 4, color: "var(--text-normal)",
                }}
            />
            <span style={{ color: style.textColor, fontWeight: 600, flex: 1 }}>
                Secret Achievements <span style={{ opacity: 0.6, fontWeight: 400 }}>(shared look across all tiers)</span>
            </span>
            <ColorField label="Text" value={style.textColor} onChange={v => setSecretStyle({ textColor: v })} />
            <ColorField label="BG" value={style.bgColor} onChange={v => setSecretStyle({ bgColor: v })} />
        </div>
    );
}

function GlobalTabRow() {
    settings.use(["unselectedTabTextColor"]);
    return (
        <div style={{
            display: "flex", alignItems: "center", gap: 12, padding: "8px 10px",
            background: "var(--background-secondary-alt)", borderRadius: 8, marginBottom: 16,
            border: "1px solid rgba(255,255,255,0.1)"
        }}>
            <span style={{ color: settings.store.unselectedTabTextColor, fontWeight: 600, flex: 1 }}>
                Unselected Rarity Tabs
            </span>
            <ColorField 
                label="Text" 
                value={settings.store.unselectedTabTextColor} 
                onChange={v => { settings.store.unselectedTabTextColor = v; }} 
            />
        </div>
    );
}

export function StyleEditor() {
    return (
        <Forms.FormSection>
            <Forms.FormTitle tag="h3">Rarity Appearance</Forms.FormTitle>
            <Forms.FormText style={{ marginBottom: 10, opacity: 0.8 }}>
                Customize the icon, text color, and background for each rarity, plus a separate look for secret achievements.
            </Forms.FormText>
            {TIER_ORDER.map(t => <TierRow key={t} tier={t} />)}
            <SecretRow />
            <Button
                color={Button.Colors.RED}
                look={Button.Looks.OUTLINED}
                size={Button.Sizes.SMALL}
                onClick={() => resetStyles()}
                style={{ marginTop: 4 }}
            >
                Reset to Defaults
            </Button>
        </Forms.FormSection>
    );
}
