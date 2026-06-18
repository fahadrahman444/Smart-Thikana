/**
 * Organisation Settings Page
 * 
 * Manage org members, subscription tier, and billing settings.
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Organisation } from "@/types/organisations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader, Trash2, UserPlus, Crown } from "lucide-react";
import {
  fetchOrganisation,
  fetchOrganisationMembers,
  removeOrganisationMember,
  upgradeOrganisationTier,
} from "@/lib/organisations";

interface OrgMemberRow {
  id: string;
  org_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  full_name?: string;
  email?: string;
}

export default function OrgSettingsPage() {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const { user, currentOrg } = useAuth();

  const [org, setOrg] = useState<Organisation | null>(null);
  const [members, setMembers] = useState<OrgMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (!orgId) {
      navigate("/");
      return;
    }

    loadOrgData();
  }, [orgId]);

  const loadOrgData = async () => {
    setLoading(true);
    setError("");

    try {
      const orgData = await fetchOrganisation(orgId!);
      if (!orgData) {
        setError("Organisation not found");
        setLoading(false);
        return;
      }

      // Check permission: only owner or admin can view settings
      if (orgData.owner_id !== user?.id) {
        setError("You don't have permission to manage this organisation");
        setLoading(false);
        return;
      }

      setOrg(orgData);

      // Load members
      const membersList = await fetchOrganisationMembers(orgId!);
      setMembers(membersList as OrgMemberRow[]);
    } catch (err) {
      setError(`Failed to load organisation: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) {
      return;
    }

    setRemovingMemberId(memberId);
    const result = await removeOrganisationMember(memberId);

    if (result.success) {
      setMembers(members.filter((m) => m.id !== memberId));
    } else {
      setError(result.error || "Failed to remove member");
    }

    setRemovingMemberId(null);
  };

  const handleUpgradeTier = async (newTier: "free" | "pro" | "enterprise") => {
    if (!org) return;

    setUpgrading(true);
    const result = await upgradeOrganisationTier(org.id, newTier);

    if (result.success) {
      // Reload org data
      const updated = await fetchOrganisation(org.id);
      if (updated) {
        setOrg(updated);
      }
    } else {
      setError(result.error || "Failed to upgrade subscription");
    }

    setUpgrading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">{error || "Organisation not found"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{org.name}</h1>
          <p className="text-gray-500 mt-2">slug: <code className="bg-gray-100 px-2 py-1 rounded">{org.slug}</code></p>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Subscription Tier */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Tier</CardTitle>
            <CardDescription>Manage your plan and limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {(["free", "pro", "enterprise"] as const).map((tier) => (
                <div
                  key={tier}
                  className={`border rounded-lg p-4 ${
                    org.tier === tier ? "border-blue-500 bg-blue-50" : "border-gray-200"
                  }`}
                >
                  <h3 className="font-semibold capitalize">{tier}</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    {tier === "free" && "10 listings, 5 tenants"}
                    {tier === "pro" && "50 listings, 25 tenants"}
                    {tier === "enterprise" && "Unlimited"}
                  </p>
                  {org.tier !== tier && (
                    <Button
                      size="sm"
                      className="mt-3 w-full"
                      onClick={() => handleUpgradeTier(tier)}
                      disabled={upgrading}
                    >
                      {tier === "free" ? "Downgrade" : "Upgrade"}
                    </Button>
                  )}
                  {org.tier === tier && (
                    <div className="mt-3 text-xs font-semibold text-blue-600">
                      Current Plan
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Manage who has access to this organisation</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => navigate(`/org/${org.id}/invite-members`)}
              className="gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Add Member
            </Button>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{member.full_name || member.email || "Unknown"}</p>
                      {member.role === "owner" && (
                        <Crown className="w-4 h-4 text-amber-600" />
                      )}
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded capitalize">
                        {member.role}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>

                  {member.user_id !== user?.id && member.role !== "owner" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={removingMemberId === member.id}
                      className="gap-2"
                    >
                      {removingMemberId === member.id ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" className="gap-2">
              <Trash2 className="w-4 h-4" />
              Delete Organisation
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              This action cannot be undone. All data will be permanently deleted.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
