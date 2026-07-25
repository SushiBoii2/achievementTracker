/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, Forms, React } from "@webpack/common";

import { keybindRecordingState, settings } from "../settings";

const MODIFIER_KEYS = ["Control", "Shift", "Alt", "Meta"];

function formatCombo(combo: string) {
    if (!combo) return "Not set";
    return combo.split("+").map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" + ");
}

export function KeybindRecorder() {
    settings.use(["keybind"]);
    const [listening, setListening] = React.useState(false);

    React.useEffect(() => {
        keybindRecordingState.active = listening;
        if (!listening) return;

        function handler(e: KeyboardEvent) {
            e.preventDefault();
            e.stopPropagation();
            if (e.key === "Escape") {
                setListening(false);
                return;
            }
            if (MODIFIER_KEYS.includes(e.key)) return; // wait for a real key, not just the modifier itself

            const parts: string[] = [];
            if (e.ctrlKey) parts.push("ctrl");
            if (e.shiftKey) parts.push("shift");
            if (e.altKey) parts.push("alt");
            if (e.metaKey) parts.push("meta");
            parts.push(e.key.toLowerCase());

            settings.store.keybind = parts.join("+");
            setListening(false);
        }

        document.addEventListener("keydown", handler, true);
        return () => document.removeEventListener("keydown", handler, true);
    }, [listening]);

    React.useEffect(() => () => { keybindRecordingState.active = false; }, []);

    return (
        <Forms.FormSection>
            <Forms.FormTitle tag="h3">Keyboard Shortcut</Forms.FormTitle>
            <Forms.FormText style={{ marginBottom: 8, opacity: 0.8 }}>
                Press this combination anywhere in Discord to pop open the Achievements window.
            </Forms.FormText>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Button onClick={() => setListening(true)} color={listening ? Button.Colors.RED : Button.Colors.BRAND}>
                    {listening ? "Press keys... (Esc to cancel)" : "Change Shortcut"}
                </Button>
                <code style={{ padding: "4px 10px", background: "var(--background-secondary)", borderRadius: 4, fontSize: 13 }}>
                    {formatCombo(settings.store.keybind)}
                </code>
            </div>
        </Forms.FormSection>
    );
}
