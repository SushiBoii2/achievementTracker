/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { Button, Forms, showToast, Toasts } from "@webpack/common";

import { store } from "./dataStore";

function FilePickerSetting() {
    const path = settings.store.dataFilePath;

    async function pick() {
        const Native = VencordNative.pluginHelpers.AchievementTracker as {
            pickSaveFile(defaultPath?: string): Promise<string | null>;
        };
        const chosen = await Native.pickSaveFile(path || "vencord-achievements.json");
        if (chosen) {
            settings.store.dataFilePath = chosen;
            await store.load();
            await store.saveNow();
            showToast("Achievement save file set to " + chosen, Toasts.Type.SUCCESS);
        }
    }

    return (
        <Forms.FormSection>
            <Forms.FormTitle tag="h3">Local Save File</Forms.FormTitle>
            <Forms.FormText style={{ marginBottom: 8, opacity: 0.8 }}>
                {path ? `Currently saving to: ${path}` : "No save file selected yet. Your progress will not persist until you pick one."}
            </Forms.FormText>
            <Button onClick={pick}>
                {path ? "Change save file location" : "Choose save file location"}
            </Button>
        </Forms.FormSection>
    );
}

export const settings = definePluginSettings({
    dataFilePath: {
        type: OptionType.STRING,
        description: "Path to the local JSON file achievement progress is saved to",
        default: "",
        hidden: true, // edited only through the custom picker below, not the raw text box
    },
    showNotifications: {
        type: OptionType.BOOLEAN,
        description: "Show a toast popup whenever you unlock an achievement",
        default: true,
    },
    filePicker: {
        type: OptionType.COMPONENT,
        description: "",
        component: FilePickerSetting,
    },
});
