/**
 * Realtime hook for maintenance tickets
 * Subscribes to ticket and update changes for live dashboard updates
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MaintenanceTicket, MaintenanceTicketUpdate } from "@/types/maintenance";

export function useMaintenanceTicketsRealtime(orgId: string) {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from("maintenance_tickets")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (queryError) {
        setError(queryError.message);
        return;
      }

      setTickets((data as MaintenanceTicket[]) || []);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    // Load initial tickets
    loadTickets();

    // Subscribe to changes
    const subscription = supabase
      .channel(`tickets:${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "maintenance_tickets",
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            // Add new ticket
            setTickets((prev) => [payload.new as MaintenanceTicket, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            // Update existing ticket
            setTickets((prev) =>
              prev.map((t) =>
                t.id === (payload.new as MaintenanceTicket).id
                  ? (payload.new as MaintenanceTicket)
                  : t
              )
            );
          } else if (payload.eventType === "DELETE") {
            // Remove deleted ticket
            setTickets((prev) => prev.filter((t) => t.id !== (payload.old as MaintenanceTicket).id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [orgId, loadTickets]);

  return { tickets, loading, error, refetch: loadTickets };
}

/**
 * Hook to watch a specific ticket for updates.
 */
export function useMaintenanceTicketUpdates(ticketId: string) {
  const [updates, setUpdates] = useState<MaintenanceTicketUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUpdates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from("maintenance_ticket_updates")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (queryError) {
        setError(queryError.message);
        return;
      }

      setUpdates((data as MaintenanceTicketUpdate[]) || []);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    // Load initial updates
    loadUpdates();

    // Subscribe to new updates
    const subscription = supabase
      .channel(`ticket-updates:${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "maintenance_ticket_updates",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          setUpdates((prev) => [...prev, payload.new as MaintenanceTicketUpdate]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [ticketId, loadUpdates]);

  return { updates, loading, error, refetch: loadUpdates };
}
