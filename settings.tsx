/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { openModal } from "@utils/modal";
import { OptionType } from "@utils/types";
import { Button, Forms, showToast, Toasts } from "@webpack/common";

import { AchievementsModal } from "./components/AchievementsModal";
import { KeybindRecorder } from "./components/KeybindRecorder";
import { StyleEditor } from "./components/StyleEditor";
import { store } from "./dataStore";

// Shared mutable flag so the global keydown listener in index.tsx knows to
// stay out of the way while the user is actively recording a new shortcut
// in the settings panel below.
export const keybindRecordingState = { active: false };

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

function QuickAccessSetting() {
    return (
        <Forms.FormSection>
            <Forms.FormTitle tag="h3">Quick Access</Forms.FormTitle>
            <Forms.FormText style={{ marginBottom: 8, opacity: 0.8 }}>
                Open the achievements window right now, without the toolbar button or shortcut.
            </Forms.FormText>
            <Button onClick={() => openModal(props => <AchievementsModal {...props} />)}>
                Open Achievements Window
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
    keybind: {
        type: OptionType.STRING,
        description: "Keyboard shortcut that opens the Achievements window",
        default: "ctrl+shift+alt+a",
        hidden: true, // edited only through the KeybindRecorder component below
    },
    tierStyles: {
        type: OptionType.STRING,
        description: "JSON blob of per-tier icon/color overrides",
        default: "",
        hidden: true, // edited only through the StyleEditor component below
    },
    secretStyle: {
        type: OptionType.STRING,
        description: "JSON blob of the secret-achievement icon/color override",
        default: "",
        hidden: true, // edited only through the StyleEditor component below
    },
    unselectedTabTextColor: {
        type: OptionType.STRING,
        description: "Text color for unselected tabs",
        default: "#dbdee1", 
        hidden: true, // edited only through the StyleEditor component
    },
    quickAccess: {
        type: OptionType.COMPONENT,
        description: "",
        component: QuickAccessSetting,
    },
    keybindRecorder: {
        type: OptionType.COMPONENT,
        description: "",
        component: KeybindRecorder,
    },
    filePicker: {
        type: OptionType.COMPONENT,
        description: "",
        component: FilePickerSetting,
    },
    styleEditor: {
        type: OptionType.COMPONENT,
        description: "",
        component: StyleEditor,
    },
});
