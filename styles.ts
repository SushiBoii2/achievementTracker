/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Tier, TIER_META } from "./achievements";
import { settings } from "./settings";

export interface TierStyle {
    icon: string;
    textColor: string;
    bgColor: string;
}

const DARK_BASE = "#232428";

function hexToRgb(hex: string) {
    const clean = hex.replace("#", "");
    const full = clean.length === 3 ? clean.split("").map(c => c + c).join("") : clean;
    const num = parseInt(full, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex(r: number, g: number, b: number) {
    return "#" + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

/** Blend hexA into hexB, weightA = how much of hexA to keep (0-1) */
function mix(hexA: string, hexB: string, weightA: number) {
    const a = hexToRgb(hexA), b = hexToRgb(hexB);
    return rgbToHex(
        a.r * weightA + b.r * (1 - weightA),
        a.g * weightA + b.g * (1 - weightA),
        a.b * weightA + b.b * (1 - weightA),
    );
}

export function defaultTierStyles(): Record<Tier, TierStyle> {
    const out = {} as Record<Tier, TierStyle>;
    for (const t of Object.keys(TIER_META) as Tier[]) {
        out[t] = {
            icon: TIER_META[t].emoji,
            textColor: TIER_META[t].color,
            bgColor: mix(TIER_META[t].color, DARK_BASE, 0.16),
        };
    }
    return out;
}

export const DEFAULT_SECRET_STYLE: TierStyle = {
    icon: "❔",
    textColor: "#d9b3ff",
    bgColor: mix("#8b5cf6", DARK_BASE, 0.18),
};

export function getTierStyles(): Record<Tier, TierStyle> {
    try {
        const parsed = JSON.parse(settings.store.tierStyles || "{}");
        return { ...defaultTierStyles(), ...parsed };
    } catch {
        return defaultTierStyles();
    }
}

export function getSecretStyle(): TierStyle {
    try {
        const parsed = JSON.parse(settings.store.secretStyle || "{}");
        return { ...DEFAULT_SECRET_STYLE, ...parsed };
    } catch {
        return DEFAULT_SECRET_STYLE;
    }
}

export function setTierStyle(tier: Tier, patch: Partial<TierStyle>) {
    const all = getTierStyles();
    all[tier] = { ...all[tier], ...patch };
    settings.store.tierStyles = JSON.stringify(all);
}

export function setSecretStyle(patch: Partial<TierStyle>) {
    settings.store.secretStyle = JSON.stringify({ ...getSecretStyle(), ...patch });
}

export function resetStyles() {
    settings.store.tierStyles = JSON.stringify(defaultTierStyles());
    settings.store.secretStyle = JSON.stringify(DEFAULT_SECRET_STYLE);
}
