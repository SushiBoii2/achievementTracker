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
    const Native = VencordNative.pluginHelpers.AchievementTracker as {
        pickSaveFile(defaultPath?: string): Promise<string | null>;
        pickOpenFile(): Promise<string | null>;
        readFile(path: string): Promise<string | null>;
        writeFile(path: string, data: string): Promise<boolean>;
    };

    async function exportBackup() {
        const chosen = await Native.pickSaveFile("vencord-achievements-backup.json");
        if (!chosen) return;
        const ok = await Native.writeFile(chosen, store.exportJson());
        showToast(ok ? "Backup saved to " + chosen : "Failed to write backup", ok ? Toasts.Type.SUCCESS : Toasts.Type.FAILURE);
    }

    async function importBackup() {
        const chosen = await Native.pickOpenFile();
        if (!chosen) return;
        try {
            const raw = await Native.readFile(chosen);
            if (!raw) throw new Error("File was empty or unreadable");
            await store.importJson(raw);
            showToast("Backup imported", Toasts.Type.SUCCESS);
        } catch (e) {
            console.error("[AchievementTracker] Import failed", e);
            showToast("Failed to import backup", Toasts.Type.FAILURE);
        }
    }

    return (
        <Forms.FormSection>
            <Forms.FormTitle tag="h3">Backup & Restore</Forms.FormTitle>
            <Forms.FormText style={{ marginBottom: 8, opacity: 0.8 }}>
                Your progress is saved automatically and locally (nothing leaves your
                computer) - no setup needed. These buttons are only for making a manual
                backup file or restoring one, e.g. when moving to a new machine.
            </Forms.FormText>
            <div style={{ display: "flex", gap: 8 }}>
                <Button onClick={exportBackup}>Export backup...</Button>
                <Button color={Button.Colors.PRIMARY} onClick={importBackup}>Import backup...</Button>
            </div>
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
        description: "Legacy: path to a pre-v2 save file, merged in once on first load then unused",
        default: "",
        hidden: true,
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
