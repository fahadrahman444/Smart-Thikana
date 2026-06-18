/**
 * Organisation Selector Component
 * 
 * Dropdown to switch between organisations and manage them.
 * Appears in the navbar after a user is logged in.
 */

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Organisation,
  UserOrganisationView,
  SubscriptionTier,
} from "@/types/organisations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Building2, Plus, Settings } from "lucide-react";

interface OrgSelectorProps {
  onOrgChange?: (org: Organisation) => void;
}

/**
 * Tier badge component.
 */
function TierBadge({ tier }: { tier: SubscriptionTier }) {
  const tierColors: Record<SubscriptionTier, string> = {
    free: "bg-gray-100 text-gray-800",
    pro: "bg-blue-100 text-blue-800",
    enterprise: "bg-purple-100 text-purple-800",
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${tierColors[tier]}`}>
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </span>
  );
}

export function OrgSelector({ onOrgChange }: OrgSelectorProps) {
  const { user, currentOrg, organisations, switchOrg, loading } = useAuth();
  const [open, setOpen] = useState(false);

  if (loading || !user) {
    return null;
  }

  if (!currentOrg || organisations.length === 0) {
    return (
      <Button variant="outline" size="sm" className="gap-2">
        <Building2 className="w-4 h-4" />
        No organisations
      </Button>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Building2 className="w-4 h-4" />
          {currentOrg.name}
          <TierBadge tier={currentOrg.tier} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Your Organisations</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* List all organisations */}
        {organisations.map((org) => (
          <DropdownMenuItem
            key={org.org_id}
            onClick={() => {
              switchOrg(org.org_id);
              onOrgChange?.(org as any);
              setOpen(false);
            }}
            className="cursor-pointer flex justify-between items-center"
          >
            <div className="flex-1">
              <div className="font-medium">{org.org_name}</div>
              <div className="text-xs text-gray-500">{org.org_slug}</div>
            </div>
            {org.org_id === currentOrg.id && (
              <div className="w-2 h-2 bg-blue-600 rounded-full" />
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        {/* Settings */}
        <DropdownMenuItem asChild>
          <a href="/org-settings" className="cursor-pointer flex gap-2">
            <Settings className="w-4 h-4" />
            Org Settings
          </a>
        </DropdownMenuItem>

        {/* Create new org */}
        <DropdownMenuItem asChild>
          <a href="/create-org" className="cursor-pointer flex gap-2">
            <Plus className="w-4 h-4" />
            Create Organisation
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default OrgSelector;
