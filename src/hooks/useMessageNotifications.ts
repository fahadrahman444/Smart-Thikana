/**
 * useMessageNotifications — global, app-wide message-notification machinery.
 *
 * SPLIT INTO TWO HOOKS to avoid double-firing:
 *
 *   1. `useMessageNotificationsRoot()` — MUST be called exactly ONCE
 *      (we mount it in <Navbar />). It owns the realtime subscription,
 *      pops toasts, and shows browser notifications.
 *
 *   2. `useMessageNotifications()` — read-only hook for any component
 *      that needs the unread counter or a `clearUnread()` function
 *      (e.g. the Navbar badge, the Messages page).
 *
 * Why this split: previously both Navbar and the Messages page called the
 * same hook, which subscribed twice → every incoming message produced two
 * toasts and double-incremented the badge.
 */
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ── Module-level singleton state ─────────────────────────────────────────────
// Shared across every component that imports this module. React state in each
// consumer is kept in sync via the `listeners` set.
let globalUnread = 0;
const listeners = new Set<(n: number) => void>();
const setGlobal = (n: number) => {
  globalUnread = n;
  listeners.forEach((l) => l(n));
};

/** Read-only hook: returns the current unread count + a setter to clear it. */
export function useMessageNotifications() {
  const [unread, setUnread] = useState(globalUnread);
  useEffect(() => {
    listeners.add(setUnread);
    return () => { listeners.delete(setUnread); };
  }, []);
  const clearUnread = useCallback(() => setGlobal(0), []);
  return { unread, clearUnread };
}

/**
 * Root hook: owns the realtime subscription. Call ONCE at the top of the app
 * (we do this from the Navbar, which is mounted on every authenticated page).
 */
export function useMessageNotificationsRoot() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Ask the browser for notification permission once.
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Subscribe to ALL message inserts; RLS limits us to conversations we
  // participate in, so this is safe and efficient.
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-messages:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const msg = payload.new as { sender_id: string; content: string; conversation_id: string };
          // Don't notify on our own messages.
          if (msg.sender_id === user.id) return;

          // Skip if we're already viewing this exact conversation.
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            if (url.pathname === "/messages" && url.searchParams.get("c") === msg.conversation_id) return;
          }

          setGlobal(globalUnread + 1);

          // Look up the sender's display name for a friendlier toast.
          const { data: sender } = await supabase
            .from("profiles").select("full_name").eq("id", msg.sender_id).maybeSingle();
          const name = sender?.full_name || "Someone";

          toast.message(`New message from ${name}`, {
            description: msg.content.slice(0, 80),
            action: {
              label: "Open",
              onClick: () => navigate(`/messages?c=${msg.conversation_id}`),
            },
          });

          // Fire a browser-level notification if permission granted.
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            try {
              new Notification(`Basha Vhara Koto — ${name}`, {
                body: msg.content.slice(0, 120),
                icon: "/placeholder.svg",
                tag: msg.conversation_id, // collapses repeats from the same convo
              });
            } catch { /* ignore */ }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, navigate]);
}
