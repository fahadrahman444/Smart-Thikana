/**
 * Organisation and subscription types for the multi-tenant SaaS system.
 */

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';
export type OrganisationMemberRole = 'owner' | 'admin' | 'staff';

/**
 * A subscription plan (lookup table).
 * Defines limits and pricing for each tier.
 */
export interface SubscriptionPlan {
  tier: SubscriptionTier;
  max_listings: number;
  max_tenant_accounts: number;
  price_monthly_cents: number; // USD cents
  features: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * An organisation (landlord agency, property owner group, etc).
 * Each user can own/belong to multiple organisations, but typically
 * a landlord owns one organisation that groups their properties.
 */
export interface Organisation {
  id: string; // UUID
  name: string;
  slug: string; // unique, URL-friendly (e.g., "my-apartments-1")
  logo_url?: string;
  tier: SubscriptionTier;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  owner_id: string; // UUID of the user who created/owns this org
  created_at: string;
  updated_at: string;
}

/**
 * A membership relation: links a user to an organisation with a role.
 */
export interface OrganisationMember {
  id: string; // UUID
  org_id: string; // UUID
  user_id: string; // UUID
  role: OrganisationMemberRole;
  joined_at: string;
}

/**
 * User's view of their organisations.
 * Result of the `get_user_organisations` RPC function.
 */
export interface UserOrganisationView {
  org_id: string;
  org_name: string;
  org_slug: string;
  org_tier: SubscriptionTier;
  org_owner_id: string;
  member_role: OrganisationMemberRole;
  is_owner: boolean;
}

/**
 * Free tier usage limits.
 */
export const FREE_TIER_LIMITS = {
  max_listings: 10,
  max_tenant_accounts: 5,
} as const;

/**
 * Pro tier usage limits.
 */
export const PRO_TIER_LIMITS = {
  max_listings: 50,
  max_tenant_accounts: 25,
} as const;

/**
 * Get usage limits for a tier.
 */
export function getTierLimits(tier: SubscriptionTier) {
  const limits: Record<SubscriptionTier, { max_listings: number; max_tenant_accounts: number }> = {
    free: FREE_TIER_LIMITS,
    pro: PRO_TIER_LIMITS,
    enterprise: { max_listings: 999, max_tenant_accounts: 999 },
  };
  return limits[tier];
}

/**
 * Org invitation token payload.
 * This would typically be signed and sent via email.
 */
export interface OrgInvitationToken {
  org_id: string;
  invited_email: string;
  role: OrganisationMemberRole;
  expires_at: string; // ISO 8601 timestamp
  issued_at: string;
}

/**
 * Response from creating/accepting an invitation.
 */
export interface InvitationResponse {
  success: boolean;
  message: string;
  org_id?: string;
  member_id?: string;
}
