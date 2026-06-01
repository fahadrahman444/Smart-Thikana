/**
 * Tenant's maintenance ticket submission page
 */

import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Upload, X, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  createMaintenanceTicket,
  uploadTicketAttachment,
} from "@/lib/maintenance";
import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_CATEGORY_LABELS,
  MAINTENANCE_PRIORITIES,
  NewTicketInput,
} from "@/types/maintenance";
import { supabase } from "@/integrations/supabase/client";

interface FormState {
  title: string;
  description: string;
  category: string;
  priority: string;
  listing_id: string;
  agreement_id: string;
}

export function NewMaintenanceTicketPage() {
  const navigate = useNavigate();
  const { currentOrg, user } = useAuth();
  const [formState, setFormState] = useState<FormState>({
    title: "",
    description: "",
    category: "other",
    priority: "normal",
    listing_id: "",
    agreement_id: "",
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [listings, setListings] = useState<any[]>([]);
  const [agreements, setAgreements] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load tenant's active agreements/listings
  React.useEffect(() => {
    const loadUserAgreements = async () => {
      if (!user) return;

      try {
        // Get agreements for this tenant
        const { data: agreeData } = await supabase
          .from("agreements")
          .select("id, listing_id, status, created_at")
          .eq("tenant_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (agreeData) {
          setAgreements(agreeData);

          // Get listing details
          const listingIds = [...new Set(agreeData.map((a: any) => a.listing_id))];
          const { data: listingData } = await supabase
            .from("listings")
            .select("id, title, address, flat_number")
            .in("id", listingIds);

          if (listingData) {
            setListings(listingData);
          }
        }
      } catch (err) {
        console.error("Failed to load agreements:", err);
      }
    };

    loadUserAgreements();
  }, [user]);

  const handleAddAttachment = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files].slice(0, 5)); // Max 5 files
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!currentOrg) {
        setError("No organization selected");
        setLoading(false);
        return;
      }

      if (!formState.agreement_id) {
        setError("Please select a property");
        setLoading(false);
        return;
      }

      const selectedAgreement = agreements.find((a) => a.id === formState.agreement_id);
      if (!selectedAgreement) {
        setError("Invalid agreement selected");
        setLoading(false);
        return;
      }

      // Create ticket
      const ticketInput: NewTicketInput = {
        listing_id: selectedAgreement.listing_id,
        agreement_id: selectedAgreement.id,
        title: formState.title,
        description: formState.description,
        category: formState.category as any,
        priority: formState.priority as any,
      };

      const { success: ticketSuccess, ticket, error: ticketError } = await createMaintenanceTicket(
        currentOrg.id,
        ticketInput
      );

      if (!ticketSuccess || !ticket) {
        setError(ticketError || "Failed to create ticket");
        setLoading(false);
        return;
      }

      // Upload attachments
      for (const file of attachments) {
        const { success: uploadSuccess } = await uploadTicketAttachment(
          ticket.id,
          file
        );
        if (!uploadSuccess) {
          console.warn(`Failed to upload ${file.name}`);
        }
      }

      setSuccess(true);

      // Show success message then navigate
      setTimeout(() => {
        navigate(`/maintenance/ticket/${ticket.id}`);
      }, 1500);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Report a Maintenance Issue</h1>
          <p className="text-gray-600 mt-2">
            Submit a request and our team will help resolve it as soon as possible.
          </p>
        </div>

        {/* Success message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium">✓ Ticket created successfully!</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 space-y-6">
            {/* Property selection */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Which property? *
              </label>
              <select
                value={formState.agreement_id}
                onChange={(e) => setFormState({ ...formState, agreement_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select a property...</option>
                {agreements.map((agreement) => {
                  const listing = listings.find((l) => l.id === agreement.listing_id);
                  return (
                    <option key={agreement.id} value={agreement.id}>
                      {listing?.title || "Unknown"} {listing?.flat_number ? `(${listing.flat_number})` : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Issue title */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Issue Title *
              </label>
              <input
                type="text"
                placeholder="e.g., Leaking kitchen faucet"
                value={formState.title}
                onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Category *
              </label>
              <select
                value={formState.category}
                onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {MAINTENANCE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {MAINTENANCE_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Priority *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {MAINTENANCE_PRIORITIES.map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => setFormState({ ...formState, priority })}
                    className={`p-3 rounded-lg border-2 font-medium capitalize transition-colors ${
                      formState.priority === priority
                        ? "border-blue-500 bg-blue-50 text-blue-900"
                        : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    {priority}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Urgent issues get response within 4 hours, High within 24 hours.
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Description *
              </label>
              <textarea
                placeholder="Describe the issue in detail. Include any relevant information that might help us resolve it faster."
                value={formState.description}
                onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Attachments */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Photos/Videos (Optional)
              </label>
              <button
                type="button"
                onClick={handleAddAttachment}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-gray-400 transition-colors flex items-center justify-center gap-2"
              >
                <Upload size={20} />
                <span>Click to upload or drag and drop</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  {attachments.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <X size={18} className="text-gray-600" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit button */}
          <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating...
                </>
              ) : (
                "Submit Ticket"
              )}
            </button>
          </div>
        </form>

        {/* Info box */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Response times:</strong> Urgent issues get response within 4 hours, High within 24 hours,
            Normal within 48 hours, and Low within 72 hours.
          </p>
        </div>
      </div>
    </div>
  );
}
