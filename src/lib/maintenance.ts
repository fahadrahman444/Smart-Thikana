/**
 * Maintenance Ticketing API - all database operations
 */

import { supabase } from "@/integrations/supabase/client";
import {
  MaintenanceTicket,
  MaintenanceTicketUpdate,
  MaintenanceTicketAttachment,
  NewTicketInput,
  MaintenanceStatus,
} from "@/types/maintenance";

/**
 * Create a new maintenance ticket.
 */
export async function createMaintenanceTicket(
  orgId: string,
  input: NewTicketInput
): Promise<{ success: boolean; ticket?: MaintenanceTicket; error?: string }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("maintenance_tickets")
      .insert([
        {
          org_id: orgId,
          listing_id: input.listing_id,
          agreement_id: input.agreement_id,
          tenant_id: user.user.id,
          title: input.title,
          description: input.description,
          category: input.category,
          priority: input.priority,
          status: "open",
        },
      ])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, ticket: data as MaintenanceTicket };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Fetch maintenance tickets with filters.
 */
export async function fetchMaintenanceTickets(
  orgId: string,
  filters?: {
    status?: MaintenanceStatus;
    assigned_to?: string;
    listing_id?: string;
    category?: string;
  }
): Promise<MaintenanceTicket[]> {
  let query = supabase
    .from("maintenance_tickets")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.assigned_to) {
    query = query.eq("assigned_to", filters.assigned_to);
  }

  if (filters?.listing_id) {
    query = query.eq("listing_id", filters.listing_id);
  }

  if (filters?.category) {
    query = query.eq("category", filters.category);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch tickets:", error);
    return [];
  }

  return (data as MaintenanceTicket[]) || [];
}

/**
 * Fetch a single ticket with all details.
 */
export async function fetchMaintenanceTicket(
  ticketId: string
): Promise<{
  ticket?: MaintenanceTicket;
  updates?: MaintenanceTicketUpdate[];
  attachments?: MaintenanceTicketAttachment[];
  error?: string;
}> {
  try {
    // Fetch ticket
    const { data: ticketData, error: ticketError } = await supabase
      .from("maintenance_tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (ticketError) {
      return { error: ticketError.message };
    }

    // Fetch updates
    const { data: updatesData } = await supabase
      .from("maintenance_ticket_updates")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    // Fetch attachments
    const { data: attachmentsData } = await supabase
      .from("maintenance_ticket_attachments")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false });

    return {
      ticket: ticketData as MaintenanceTicket,
      updates: updatesData as MaintenanceTicketUpdate[],
      attachments: attachmentsData as MaintenanceTicketAttachment[],
    };
  } catch (err) {
    return { error: String(err) };
  }
}

/**
 * Update ticket status and add an update record.
 */
export async function updateTicketStatus(
  ticketId: string,
  newStatus: MaintenanceStatus,
  message: string,
  isInternal: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get current status
    const { data: ticket } = await supabase
      .from("maintenance_tickets")
      .select("status")
      .eq("id", ticketId)
      .single();

    // Update ticket
    const { error: updateError } = await supabase
      .from("maintenance_tickets")
      .update({
        status: newStatus,
        ...(newStatus === "resolved" && { resolved_at: new Date().toISOString() }),
        ...(newStatus === "closed" && { closed_at: new Date().toISOString() }),
      })
      .eq("id", ticketId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Add update record
    const { error: insertError } = await supabase
      .from("maintenance_ticket_updates")
      .insert([
        {
          ticket_id: ticketId,
          updated_by: user.user.id,
          old_status: ticket?.status,
          new_status: newStatus,
          message,
          is_internal_note: isInternal,
        },
      ]);

    if (insertError) {
      console.warn("Failed to create update record:", insertError);
      // Don't fail the entire operation
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Add a comment/update to a ticket.
 */
export async function addTicketUpdate(
  ticketId: string,
  message: string,
  isInternal: boolean = false
): Promise<{ success: boolean; update?: MaintenanceTicketUpdate; error?: string }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("maintenance_ticket_updates")
      .insert([
        {
          ticket_id: ticketId,
          updated_by: user.user.id,
          message,
          is_internal_note: isInternal,
        },
      ])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, update: data as MaintenanceTicketUpdate };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Assign a ticket to a staff member.
 */
export async function assignTicket(
  ticketId: string,
  staffId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("maintenance_tickets")
      .update({ assigned_to: staffId })
      .eq("id", ticketId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Add update record
    await addTicketUpdate(ticketId, `Assigned to staff member ${staffId}`, true);

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Upload an attachment to a ticket.
 */
export async function uploadTicketAttachment(
  ticketId: string,
  file: File
): Promise<{ success: boolean; attachment?: MaintenanceTicketAttachment; error?: string }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Not authenticated" };
    }

    // Upload file to storage
    const fileName = `${ticketId}/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("maintenance-tickets")
      .upload(fileName, file);

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("maintenance-tickets")
      .getPublicUrl(uploadData.path);

    // Create attachment record
    const { data, error: insertError } = await supabase
      .from("maintenance_ticket_attachments")
      .insert([
        {
          ticket_id: ticketId,
          uploaded_by: user.user.id,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_type: file.type,
          file_size_bytes: file.size,
        },
      ])
      .select()
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    return { success: true, attachment: data as MaintenanceTicketAttachment };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Get statistics for maintenance dashboard.
 */
export async function getMaintenanceStats(orgId: string): Promise<{
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  overdue: number;
}> {
  try {
    const tickets = await fetchMaintenanceTickets(orgId);

    return {
      total: tickets.length,
      open: tickets.filter((t) => t.status === "open").length,
      in_progress: tickets.filter((t) => t.status === "in_progress").length,
      resolved: tickets.filter((t) => t.status === "resolved").length,
      overdue: tickets.filter((t) => {
        const createdAt = new Date(t.created_at);
        const now = new Date();
        const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        const priorityHours: Record<string, number> = {
          urgent: 4,
          high: 24,
          normal: 48,
          low: 72,
        };
        return (
          t.status !== "closed" && t.status !== "resolved" && 
          hoursElapsed > (priorityHours[t.priority] || 48)
        );
      }).length,
    };
  } catch (err) {
    console.error("Failed to get stats:", err);
    return { total: 0, open: 0, in_progress: 0, resolved: 0, overdue: 0 };
  }
}

/**
 * Subscribe to real-time ticket updates.
 */
export function subscribeToTicketUpdates(
  ticketId: string,
  callback: (update: MaintenanceTicketUpdate) => void
) {
  const subscription = supabase
    .channel(`ticket:${ticketId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "maintenance_ticket_updates",
        filter: `ticket_id=eq.${ticketId}`,
      },
      (payload) => {
        callback(payload.new as MaintenanceTicketUpdate);
      }
    )
    .subscribe();

  return subscription;
}
