/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React } from "@webpack/common";

export interface StackNotification {
    id: string;
    title: string;
    description?: string;
    icon?: string;
    type: "achievement" | "hint" | "info";
    duration?: number;
}

type Listener = (notifications: StackNotification[]) => void;

class NotificationManager {
    private notifications: StackNotification[] = [];
    private listeners = new Set<Listener>();

    subscribe(listener: Listener) {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }

    private notify() {
        for (const listener of this.listeners) listener([...this.notifications]);
    }

    push(notification: Omit<StackNotification, "id">) {
        const id = Math.random().toString(36).substring(2, 9);
        const item: StackNotification = { id, duration: 5000, ...notification };
        this.notifications.push(item);
        this.notify();
    }

    remove(id: string) {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.notify();
    }
}

export const notificationManager = new NotificationManager();

interface CardProps {
    item: StackNotification;
    onExited: (id: string) => void;
}

function NotificationCard({ item, onExited }: CardProps) {
    const [exiting, setExiting] = React.useState(false);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setExiting(true);
        }, item.duration || 5000);

        return () => clearTimeout(timer);
    }, [item.duration]);

    const handleAnimationEnd = (e: React.TransitionEvent) => {
        if (exiting && e.propertyName === "transform") {
            onExited(item.id);
        }
    };

    const isHint = item.type === "hint";
    const bg = isHint
        ? "linear-gradient(135deg, rgba(88,101,242,0.95), rgba(114,137,218,0.95))"
        : "linear-gradient(135deg, rgba(35,36,40,0.95), rgba(47,49,54,0.95))";

    const borderColor = isHint ? "#5865F2" : "#FEE75C";

    return (
        <div
            onTransitionEnd={handleAnimationEnd}
            style={{
                width: 320,
                padding: "12px 16px",
                borderRadius: 10,
                background: bg,
                color: "#FFFFFF",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
                borderLeft: `4px solid ${borderColor}`,
                display: "flex",
                alignItems: "center",
                gap: 12,
                backdropFilter: "blur(8px)",
                opacity: exiting ? 0 : 1,
                transform: exiting ? "translateX(120%) scale(0.9)" : "translateX(0) scale(1)",
                maxHeight: exiting ? 0 : 100,
                marginBottom: exiting ? 0 : 10,
                paddingTop: exiting ? 0 : 12,
                paddingBottom: exiting ? 0 : 12,
                overflow: "hidden",
                transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease, max-height 0.35s ease, margin 0.35s ease, padding 0.35s ease",
            }}
        >
            <div style={{ fontSize: 26, flexShrink: 0, userSelect: "none" }}>
                {item.icon || (isHint ? "💡" : "🏆")}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#FFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.title}
                </div>
                {item.description && (
                    <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2, lineHeight: "1.3", wordBreak: "break-word" }}>
                        {item.description}
                    </div>
                )}
            </div>
        </div>
    );
}

export function NotificationStackContainer() {
    const [list, setList] = React.useState<StackNotification[]>([]);

    React.useEffect(() => {
        return notificationManager.subscribe(setList);
    }, []);

    if (list.length === 0) return null;

    return (
        <div
            style={{
                position: "fixed",
                top: 20,
                right: 20,
                zIndex: 99999,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                pointerEvents: "none",
            }}
        >
            <div style={{ pointerEvents: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                {list.map(item => (
                    <NotificationCard
                        key={item.id}
                        item={item}
                        onExited={id => notificationManager.remove(id)}
                    />
                ))}
            </div>
        </div>
    );
}
