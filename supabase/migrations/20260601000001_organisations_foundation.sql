-- ============================================================================
-- Phase 0.1: Multi-Tenant Foundation – Organisations & Subscription Tiers
-- ============================================================================
-- This migration introduces organisations, subscription plans, and org membership
-- It transforms Smart Thikana from single-tenant to multi-tenant SaaS.
--
-- Tables created:
--   1. organisations – one org per landlord/agency
--   2. subscription_plans – lookup table for tiers (free/pro/enterprise)
--   3. organisation_members – who belongs to which org + their role
--
-- Key design:
--   - Each user (landlord/staff) owns or belongs to one or more organisations
--   - Existing single-tenant data gets migrated to individual per-user orgs
--   - RLS policies will enforce org_id filtering on all tables
--   - Free tier: 10 listings, 5 tenant accounts per org (checked at app layer)
-- ============================================================================

-- ─── 1. Create subscription_plans lookup table ───────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  tier TEXT PRIMARY KEY CHECK (tier IN ('free', 'pro', 'enterprise')),
  max_listings INTEGER NOT NULL,
  max_tenant_accounts INTEGER NOT NULL,
  price_monthly_cents INTEGER NOT NULL, -- USD cents (0 for free)
  features JSONB NOT NULL DEFAULT '{}', -- future extensibility
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.subscription_plans IS 'Lookup table for subscription tier definitions.';
COMMENT ON COLUMN public.subscription_plans.tier IS 'Tier identifier: free, pro, or enterprise.';
COMMENT ON COLUMN public.subscription_plans.max_listings IS 'Maximum number of active listings for this tier.';
COMMENT ON COLUMN public.subscription_plans.max_tenant_accounts IS 'Maximum number of tenant sub-accounts for this tier.';
COMMENT ON COLUMN public.subscription_plans.price_monthly_cents IS 'Monthly subscription cost in USD cents (0 = free tier).';

-- ─── 2. Create organisations table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  tier TEXT NOT NULL DEFAULT 'free' REFERENCES public.subscription_plans(tier),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organisations_owner_id ON public.organisations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organisations_slug ON public.organisations(slug);
CREATE INDEX IF NOT EXISTS idx_organisations_tier ON public.organisations(tier);

COMMENT ON TABLE public.organisations IS 'Each organisation is a data silo (landlord agency, property owner group, etc).';
COMMENT ON COLUMN public.organisations.slug IS 'URL-friendly identifier; must be unique across platform.';
COMMENT ON COLUMN public.organisations.tier IS 'Current subscription tier (links to subscription_plans).';
COMMENT ON COLUMN public.organisations.owner_id IS 'Primary owner of the org; typically the creator.';

-- ─── 3. Create organisation_members table ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organisation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'staff')) DEFAULT 'staff',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organisation_members_org_id ON public.organisation_members(org_id);
CREATE INDEX IF NOT EXISTS idx_organisation_members_user_id ON public.organisation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organisation_members_role ON public.organisation_members(role);

COMMENT ON TABLE public.organisation_members IS 'Membership relation: links users to organisations with their role.';
COMMENT ON COLUMN public.organisation_members.role IS 'owner = can manage org + billing; admin = can manage members; staff = read-only access.';

-- ─── 4. Insert default subscription plans ────────────────────────────────
INSERT INTO public.subscription_plans (tier, max_listings, max_tenant_accounts, price_monthly_cents, features)
VALUES
  ('free', 10, 5, 0, '{"features": ["basic_listings", "messaging"]}'),
  ('pro', 50, 25, 2999, '{"features": ["advanced_listings", "maintenance_tickets", "analytics"]}'),
  ('enterprise', 999, 999, 0, '{"features": ["unlimited", "custom_integration", "dedicated_support"]}')
ON CONFLICT (tier) DO NOTHING;

-- ─── 5. Insert a default organisation for existing users ──────────────────
-- This will be populated by a data migration script.
-- For now, we just ensure the table structure exists.

-- ─── 6. RLS Policies for subscription_plans ──────────────────────────────
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_plans_read_all" ON public.subscription_plans
  FOR SELECT
  USING (TRUE); -- anyone can read plans

CREATE POLICY "subscription_plans_write_admin_only" ON public.subscription_plans
  FOR ALL
  USING (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (preferences->>'is_admin' = 'true')
  ));

-- ─── 7. RLS Policies for organisations ───────────────────────────────────
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

-- Users can read orgs they are a member of or own
CREATE POLICY "organisations_read_member" ON public.organisations
  FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.organisation_members
      WHERE org_id = organisations.id AND user_id = auth.uid()
    )
  );

-- Owner can update their own org
CREATE POLICY "organisations_update_owner" ON public.organisations
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Owner can delete their own org (cascades to members, listings, etc)
CREATE POLICY "organisations_delete_owner" ON public.organisations
  FOR DELETE
  USING (owner_id = auth.uid());

-- Authenticated users can create new orgs
CREATE POLICY "organisations_create_authenticated" ON public.organisations
  FOR INSERT
  WITH CHECK (owner_id = auth.uid() AND auth.uid() IS NOT NULL);

-- ─── 8. RLS Policies for organisation_members ───────────────────────────
ALTER TABLE public.organisation_members ENABLE ROW LEVEL SECURITY;

-- Users can read members of orgs they belong to or own
CREATE POLICY "organisation_members_read" ON public.organisation_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organisations
      WHERE id = org_id AND (owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.organisation_members om
          WHERE om.org_id = organisations.id AND om.user_id = auth.uid()
        )
      )
    )
  );

-- Org owner or admin can insert new members
CREATE POLICY "organisation_members_insert_owner_admin" ON public.organisation_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organisations
      WHERE id = org_id AND owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.organisation_members om
      WHERE om.org_id = org_id AND om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

-- Owner can update/delete members
CREATE POLICY "organisation_members_update_owner" ON public.organisation_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organisations
      WHERE id = org_id AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organisations
      WHERE id = org_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "organisation_members_delete_owner" ON public.organisation_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organisations
      WHERE id = org_id AND owner_id = auth.uid()
    )
  );

-- ─── 9. Audit trail function (for future use) ──────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_organisations(p_user_id UUID)
RETURNS TABLE(
  org_id UUID,
  org_name TEXT,
  org_slug TEXT,
  org_tier TEXT,
  org_owner_id UUID,
  member_role TEXT,
  is_owner BOOLEAN
) LANGUAGE SQL SECURITY DEFINER
AS $$
  SELECT
    o.id,
    o.name,
    o.slug,
    o.tier,
    o.owner_id,
    COALESCE(om.role, CASE WHEN o.owner_id = p_user_id THEN 'owner' END) AS role,
    (o.owner_id = p_user_id) AS is_owner
  FROM public.organisations o
  LEFT JOIN public.organisation_members om ON om.org_id = o.id AND om.user_id = p_user_id
  WHERE o.owner_id = p_user_id OR om.user_id = p_user_id
  ORDER BY o.created_at DESC;
$$;

COMMENT ON FUNCTION public.get_user_organisations IS 'Fetch all organisations a user owns or belongs to.';

-- ─── 10. Timestamp update trigger ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organisations_updated_at_trigger
  BEFORE UPDATE ON public.organisations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER subscription_plans_updated_at_trigger
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
