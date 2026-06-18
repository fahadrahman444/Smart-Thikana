/**
 * Maintenance ticket detail page
 * Used by both tenants and landlords to view and update tickets
 */

import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Send,
  Upload,
  AlertCircle,
  Lock,
  FileText,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchMaintenanceTicket,
  addTicketUpdate,
  updateTicketStatus,
  uploadTicketAttachment,
} from "@/lib/maintenance";
import { useMaintenanceTicketUpdates } from "@/hooks/useMaintenanceTicketsRealtime";
import {
  MAINTENANCE_CATEGORY_LABELS,
  MAINTENANCE_PRIORITY_COLORS,
  MAINTENANCE_STATUS_COLORS,
  formatTicketId,
  isTicketOverdue,
  MaintenanceStatus,
  MaintenanceTicket,
} from "@/types/maintenance";

export function MaintenanceTicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { user, currentOrg } = useAuth();
  const [ticket, setTicket] = useState<MaintenanceTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newStatus, setNewStatus] = useState<MaintenanceStatus | "">("");
  const [staffMembers, setStaffMembers] = useState<any[]>([]);

  const { updates } = useMaintenanceTicketUpdates(ticketId || "");

  // Load ticket details
  React.useEffect(() => {
    const loadTicket = async () => {
      if (!ticketId) return;

      try {
        setLoading(true);
        const { ticket: ticketData, error: ticketError } = await fetchMaintenanceTicket(ticketId);

        if (ticketError || !ticketData) {
          setError(ticketError || "Ticket not found");
          return;
        }

        setTicket(ticketData);
        setNewStatus(ticketData.status);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };

    loadTicket();
  }, [ticketId]);

  // Load staff members for assignment
  React.useEffect(() => {
    const loadStaff = async () => {
      if (!currentOrg) return;

      try {
        const { data } = await supabase
          .from("organisation_members")
          .select("user_id, role")
          .eq("org_id", currentOrg.id)
          .in("role", ["admin", "staff"]);

        if (data) {
          setStaffMembers(data);
        }
      } catch (err) {
        console.error("Failed to load staff:", err);
      }
    };

    loadStaff();
  }, [currentOrg]);

  if (!ticketId) {
    return (
      <div className="p-8 text-center text-gray-600">
        <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
        <p>Invalid ticket ID</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-8 text-center text-gray-600">
        <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
        <p>{error || "Ticket not found"}</p>
      </div>
    );
  }

  const isLandlord = user?.id === ticket.assigned_to || false; // Simplified check
  const isTenant = user?.id === ticket.tenant_id;
  const canEditStatus = isLandlord;
  const canAddInternalNotes = isLandlord;
  const isOverdue = isTicketOverdue(ticket);

  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setIsSubmitting(true);
    try {
      const { success, error: addError } = await addTicketUpdate(
        ticketId,
        newMessage,
        isInternal
      );

      if (!success) {
        setError(addError || "Failed to add update");
        setIsSubmitting(false);
        return;
      }

      // Upload attachments if any
      for (const file of attachments) {
        await uploadTicketAttachment(ticketId, file);
      }

      setNewMessage("");
      setAttachments([]);
      setIsInternal(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (status: MaintenanceStatus) => {
    setIsSubmitting(true);
    try {
      const { success, error: updateError } = await updateTicketStatus(
        ticketId,
        status,
        `Status changed to ${status}`,
        true
      );

      if (!success) {
        setError(updateError || "Failed to update status");
        setIsSubmitting(false);
        return;
      }

      setTicket({ ...ticket, status });
      setNewStatus(status);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Ticket header */}
        <div className={`bg-white rounded-lg border border-gray-200 p-6 mb-6 ${isOverdue && ticket.status !== "closed" ? "border-red-200 bg-red-50" : ""}`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{formatTicketId(ticket.id)}</h1>
              <p className="text-lg text-gray-700 mt-2">{ticket.title}</p>
            </div>
            {isOverdue && ticket.status !== "closed" && (
              <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium flex items-center gap-2">
                <AlertCircle size={16} />
                OVERDUE
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-600 uppercase">Category</p>
              <p className="font-medium text-gray-900">{MAINTENANCE_CATEGORY_LABELS[ticket.category]}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 uppercase">Priority</p>
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${
                  MAINTENANCE_PRIORITY_COLORS[ticket.priority]
                }`}
              >
                {ticket.priority}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-600 uppercase">Status</p>
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${
                  MAINTENANCE_STATUS_COLORS[ticket.status]
                }`}
              >
                {ticket.status}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-600 uppercase">Created</p>
              <p className="font-medium text-gray-900">
                {new Date(ticket.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Status change section (landlords only) */}
        {canEditStatus && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Change Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {(["open", "in_progress", "on_hold", "resolved", "closed"] as MaintenanceStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={isSubmitting}
                  className={`p-3 rounded-lg border-2 font-medium capitalize transition-colors ${
                    newStatus === status
                      ? "border-blue-500 bg-blue-50 text-blue-900"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                  } disabled:opacity-50`}
                >
                  {status.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Description</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
        </div>

        {/* Updates timeline */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-6">Activity</h3>
          <div className="space-y-6">
            {updates.map((update, idx) => {
              // Hide internal notes from tenants
              if (update.is_internal_note && isTenant) {
                return null;
              }

              return (
                <div key={update.id} className="border-l-2 border-gray-300 pl-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{update.message}</p>
                      {update.old_status && update.new_status && (
                        <p className="text-sm text-gray-600 mt-1">
                          Status: {update.old_status} → {update.new_status}
                        </p>
                      )}
                    </div>
                    {update.is_internal_note && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        <Lock size={12} />
                        Internal
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(update.created_at).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add comment form */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Add Update</h3>
          <form onSubmit={handleSubmitUpdate} className="space-y-4">
            {canAddInternalNotes && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="internal"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="internal" className="text-sm text-gray-700 flex items-center gap-1">
                  <Lock size={14} />
                  Internal note (not visible to tenant)
                </label>
              </div>
            )}

            <textarea
              placeholder="Add an update or comment..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText size={16} />
                    {file.name}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting || !newMessage.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Post Update
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
