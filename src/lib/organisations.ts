/**
 * Organisation utilities and API helpers.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  Organisation,
  OrganisationMember,
  OrganisationMemberRole,
  UserOrganisationView,
} from "@/types/organisations";

/**
 * Fetch all organisations a user owns or belongs to.
 */
export async function fetchUserOrganisations(
  userId: string
): Promise<UserOrganisationView[]> {
  const { data, error } = await supabase.rpc("get_user_organisations", {
    p_user_id: userId,
  });

  if (error) {
    console.error("Failed to fetch user organisations:", error);
    return [];
  }

  return (data as UserOrganisationView[]) || [];
}

/**
 * Create a new organisation for a user.
 */
export async function createOrganisation(
  name: string,
  slug: string
): Promise<{ success: boolean; org?: Organisation; error?: string }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Not authenticated" };
    }

    const newOrg: Partial<Organisation> = {
      name,
      slug,
      tier: "free",
      owner_id: user.user.id,
    };

    const { data, error } = await supabase
      .from("organisations")
      .insert([newOrg])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Auto-add user as owner
    const { error: memberError } = await supabase
      .from("organisation_members")
      .insert([
        {
          org_id: data.id,
          user_id: user.user.id,
          role: "owner",
        },
      ]);

    if (memberError) {
      console.error("Failed to add owner to org:", memberError);
    }

    return { success: true, org: data as Organisation };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Get a single organisation by ID.
 */
export async function fetchOrganisation(
  orgId: string
): Promise<Organisation | null> {
  const { data, error } = await supabase
    .from("organisations")
    .select("*")
    .eq("id", orgId)
    .single();

  if (error) {
    console.error(`Failed to fetch org ${orgId}:`, error);
    return null;
  }

  return (data as Organisation) || null;
}

/**
 * Get all members of an organisation.
 */
export async function fetchOrganisationMembers(
  orgId: string
): Promise<
  Array<OrganisationMember & { full_name: string; email: string }>
> {
  const { data, error } = await supabase
    .from("organisation_members")
    .select(
      `
      *,
      profiles:user_id (full_name),
      auth.users!user_id (email)
    `
    )
    .eq("org_id", orgId);

  if (error) {
    console.error(`Failed to fetch org members for ${orgId}:`, error);
    return [];
  }

  return data || [];
}

/**
 * Add a new member to an organisation.
 */
export async function addOrganisationMember(
  orgId: string,
  userId: string,
  role: OrganisationMemberRole = "staff"
): Promise<{ success: boolean; member?: OrganisationMember; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("organisation_members")
      .insert([
        {
          org_id: orgId,
          user_id: userId,
          role,
        },
      ])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, member: data as OrganisationMember };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Update a member's role.
 */
export async function updateOrganisationMemberRole(
  memberId: string,
  newRole: OrganisationMemberRole
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("organisation_members")
      .update({ role: newRole })
      .eq("id", memberId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Remove a member from an organisation.
 */
export async function removeOrganisationMember(
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("organisation_members")
      .delete()
      .eq("id", memberId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Upgrade or downgrade an organisation's subscription tier.
 */
export async function upgradeOrganisationTier(
  orgId: string,
  newTier: "free" | "pro" | "enterprise"
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      return { success: false, error: "Not authenticated" };
    }

    // Call the edge function to mock the Stripe checkout
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/subscription-checkout`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          org_id: orgId,
          tier: newTier,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.error };
    }

    const result = await response.json();
    return {
      success: result.success,
      error: result.success ? undefined : result.error,
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Generate a slug from an organisation name.
 * Removes spaces, special chars, converts to lowercase.
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Check if a slug is already taken.
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("organisations")
    .select("id")
    .eq("slug", slug)
    .single();

  // If query returns no data, slug is available
  if (error?.code === "PGRST116") {
    return true;
  }

  // If data exists, slug is taken
  return !data;
}
