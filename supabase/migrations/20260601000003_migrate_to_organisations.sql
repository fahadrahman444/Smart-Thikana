-- ============================================================================
-- Phase 0.1: Data Migration - Create organisations for existing users
-- ============================================================================
-- This migration script runs AFTER the table creation migrations.
-- It creates one organisation per existing landlord and populates the org_id
-- on all their listings, agreements, payments, etc.
--
-- This must be run manually via Supabase SQL Editor or via supabase migration
-- after the main migrations are applied.
--
-- IMPORTANT: This should be run by a superuser/admin because it needs to:
--   1. Read all users
--   2. Create orgs for each user
--   3. Update foreign key columns
-- ============================================================================

BEGIN TRANSACTION;

-- ─── Step 1: For each landlord (user with role = 'landlord'), create an org ───
WITH landlords AS (
  SELECT DISTINCT
    ur.user_id,
    p.full_name,
    COALESCE(p.business_name, p.full_name) as org_name
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'landlord'
),
new_orgs AS (
  INSERT INTO public.organisations (name, slug, tier, owner_id)
  SELECT
    org_name,
    -- Generate slug: lowercase + replace spaces/special chars + add random suffix to ensure uniqueness
    LOWER(
      REGEXP_REPLACE(
        REGEXP_REPLACE(org_name, '[^\w\s-]', '', 'g'),
        '\s+', '-', 'g'
      )
    ) || '-' || SUBSTR(MD5(CAST(RANDOM() AS TEXT)), 1, 4),
    'free',
    user_id
  FROM landlords
  RETURNING id, owner_id
)
-- ─── Step 2: Auto-add the owner to organisation_members ───────────────────
INSERT INTO public.organisation_members (org_id, user_id, role)
SELECT id, owner_id, 'owner' FROM new_orgs;

-- ─── Step 3: For each listing, find its landlord's org and set org_id ───────
UPDATE public.listings l
SET org_id = (
  SELECT o.id
  FROM public.organisations o
  WHERE o.owner_id = l.landlord_id
  LIMIT 1
)
WHERE org_id IS NULL AND landlord_id IS NOT NULL;

-- ─── Step 4: For each agreement, get org_id from its listing ────────────────
UPDATE public.agreements a
SET org_id = (
  SELECT l.org_id
  FROM public.listings l
  WHERE l.id = a.listing_id
  LIMIT 1
)
WHERE org_id IS NULL AND listing_id IS NOT NULL;

-- ─── Step 5: For each payment, get org_id from its agreement ────────────────
UPDATE public.payments p
SET org_id = (
  SELECT a.org_id
  FROM public.agreements a
  WHERE a.id = p.agreement_id
  LIMIT 1
)
WHERE org_id IS NULL AND agreement_id IS NOT NULL;

-- ─── Step 6: For each conversation, get org_id from its listing ─────────────
UPDATE public.conversations c
SET org_id = (
  SELECT l.org_id
  FROM public.listings l
  WHERE l.id = c.listing_id
  LIMIT 1
)
WHERE org_id IS NULL AND listing_id IS NOT NULL;

-- ─── Step 7: For each message, get org_id from its conversation ────────────
UPDATE public.messages m
SET org_id = (
  SELECT c.org_id
  FROM public.conversations c
  WHERE c.id = m.conversation_id
  LIMIT 1
)
WHERE org_id IS NULL AND conversation_id IS NOT NULL;

-- ─── Step 8: Handle maintenance_tickets if they exist ──────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'maintenance_tickets') THEN
    UPDATE public.maintenance_tickets mt
    SET org_id = (
      SELECT l.org_id
      FROM public.listings l
      WHERE l.id = mt.listing_id
      LIMIT 1
    )
    WHERE org_id IS NULL AND listing_id IS NOT NULL;
  END IF;
END $$;

-- ─── Step 9: Handle feedback if it exists ────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'feedback') THEN
    -- For feedback, use the landlord's org if they wrote it, else null for now
    UPDATE public.feedback f
    SET org_id = (
      SELECT o.id
      FROM public.organisations o
      WHERE o.owner_id = f.from_user_id
      LIMIT 1
    )
    WHERE org_id IS NULL AND from_user_id IS NOT NULL;
  END IF;
END $$;

-- ─── Step 10: Verify migration success ───────────────────────────────────────
-- This query shows the migration summary
SELECT
  'Migration Summary' as title,
  (SELECT COUNT(*) FROM public.organisations) as total_organisations,
  (SELECT COUNT(*) FROM public.organisation_members) as total_members,
  (SELECT COUNT(*) FROM public.listings WHERE org_id IS NOT NULL) as listings_with_org,
  (SELECT COUNT(*) FROM public.agreements WHERE org_id IS NOT NULL) as agreements_with_org,
  (SELECT COUNT(*) FROM public.payments WHERE org_id IS NOT NULL) as payments_with_org;

COMMIT;
