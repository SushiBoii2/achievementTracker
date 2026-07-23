/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// This file runs in Discord's Node/Electron main process, NOT the browser
// context - that's why it can touch the filesystem and open a native
// "Save As" dialog. It is invoked from index.tsx/settings.tsx via
// VencordNative.pluginHelpers.AchievementTracker.<functionName>(...).

import { dialog } from "electron";
import { promises as fs } from "fs";

// Every exported function here automatically gets an IpcMainInvokeEvent as
// its first argument, added by Vencord's native plugin loader - we ignore it.

export async function pickSaveFile(_event: any, defaultPath?: string) {
    const result = await dialog.showSaveDialog({
        title: "Choose where to save your Achievement Tracker data",
        defaultPath: defaultPath || "vencord-achievements.json",
        filters: [{ name: "JSON", extensions: ["json"] }],
        properties: ["createDirectory"],
    });
    if (result.canceled || !result.filePath) return null;
    return result.filePath;
}

export async function readFile(_event: any, path: string) {
    try {
        return await fs.readFile(path, "utf-8");
    } catch {
        return null;
    }
}

export async function writeFile(_event: any, path: string, data: string) {
    try {
        await fs.writeFile(path, data, "utf-8");
        return true;
    } catch (e) {
        console.error("[AchievementTracker/native] write failed", e);
        return false;
    }
}
