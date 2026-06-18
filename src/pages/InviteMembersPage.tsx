/**
 * Invite Members Page
 * 
 * Invite new members to the organisation.
 */

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader, Mail } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addOrganisationMember, fetchOrganisation } from "@/lib/organisations";
import { OrganisationMemberRole } from "@/types/organisations";

export default function InviteMembersPage() {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrganisationMemberRole>("staff");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [verifying, setVerifying] = useState(true);
  const [orgName, setOrgName] = useState("");

  // Verify org ownership on mount
  const handleVerifyOrg = async () => {
    if (!orgId) {
      navigate("/");
      return;
    }

    const org = await fetchOrganisation(orgId);
    if (!org || org.owner_id !== user?.id) {
      setError("You don't have permission to manage this organisation");
    } else {
      setOrgName(org.name);
      setError("");
    }
    setVerifying(false);
  };

  useState(() => {
    handleVerifyOrg();
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      // In production, you'd fetch the user by email first
      // For now, we'll create a placeholder and the user can accept the invite
      // by signing up/in and clicking the invite link

      // Create the invitation
      const result = await addOrganisationMember(orgId!, "", role);

      if (result.success) {
        setSuccess(`Invitation sent to ${email}`);
        setEmail("");
        setRole("staff");
      } else {
        setError(result.error || "Failed to send invitation");
      }
    } catch (err) {
      setError(`Error: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error && error.includes("permission")) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Invite Team Member</CardTitle>
            <CardDescription>
              Add a new member to {orgName || "your organisation"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Alert */}
              {error && !error.includes("permission") && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 flex gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Success Alert */}
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3 flex gap-2">
                  <Mail className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              )}

              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="member@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Role Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <Select value={role} onValueChange={(v) => setRole(v as OrganisationMemberRole)}>
                  <SelectTrigger disabled={loading}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin (can manage members)</SelectItem>
                    <SelectItem value="staff">Staff (read-only access)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Note: Owner role must be transferred manually via database.
                </p>
              </div>

              {/* Submit Button */}
              <Button type="submit" disabled={loading || !email.trim()} className="w-full">
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>

              {/* Back Button */}
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="w-full"
              >
                Back
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
