-- ============================================================================
-- Phase 0.1: Add org_id to existing tables
-- ============================================================================
-- This migration adds org_id foreign key to all existing business tables.
-- All existing rows will be temporarily assigned to a temporary org during
-- the migration; they will be re-assigned to per-user orgs in the next step.
--
-- Tables modified:
--   - listings
--   - agreements
--   - payments
--   - conversations
--   - messages
--   - maintenance_tickets (if exists)
--   - feedback (if exists)
-- ============================================================================

-- ─── 1. Add org_id column to listings ────────────────────────────────────
ALTER TABLE public.listings
  ADD COLUMN org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_listings_org_id ON public.listings(org_id);

COMMENT ON COLUMN public.listings.org_id IS 'Organisation that owns this listing.';

-- ─── 2. Add org_id column to agreements ──────────────────────────────────
ALTER TABLE public.agreements
  ADD COLUMN org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_agreements_org_id ON public.agreements(org_id);

COMMENT ON COLUMN public.agreements.org_id IS 'Organisation associated with this agreement (derived from listing).';

-- ─── 3. Add org_id column to payments ────────────────────────────────────
ALTER TABLE public.payments
  ADD COLUMN org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_payments_org_id ON public.payments(org_id);

COMMENT ON COLUMN public.payments.org_id IS 'Organisation associated with this payment.';

-- ─── 4. Add org_id column to conversations ───────────────────────────────
ALTER TABLE public.conversations
  ADD COLUMN org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_conversations_org_id ON public.conversations(org_id);

COMMENT ON COLUMN public.conversations.org_id IS 'Organisation associated with this conversation.';

-- ─── 5. Add org_id column to messages ────────────────────────────────────
ALTER TABLE public.messages
  ADD COLUMN org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_messages_org_id ON public.messages(org_id);

COMMENT ON COLUMN public.messages.org_id IS 'Organisation associated with this message.';

-- ─── 6. Add org_id to maintenance_tickets (if table exists) ──────────────
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'maintenance_tickets') THEN
    ALTER TABLE public.maintenance_tickets
      ADD COLUMN org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_org_id ON public.maintenance_tickets(org_id);
    COMMENT ON COLUMN public.maintenance_tickets.org_id IS 'Organisation associated with this ticket.';
  END IF;
END $$;

-- ─── 7. Add org_id to feedback (if table exists) ──────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'feedback') THEN
    ALTER TABLE public.feedback
      ADD COLUMN org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_feedback_org_id ON public.feedback(org_id);
    COMMENT ON COLUMN public.feedback.org_id IS 'Organisation associated with this feedback.';
  END IF;
END $$;

-- ─── 8. Update RLS policies for listings ─────────────────────────────────
-- Drop old policies (they assumed single-tenant)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'listings' AND policyname = 'listings_read_public') THEN
    DROP POLICY "listings_read_public" ON public.listings;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'listings' AND policyname = 'listings_read_self') THEN
    DROP POLICY "listings_read_self" ON public.listings;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'listings' AND policyname = 'listings_insert_self') THEN
    DROP POLICY "listings_insert_self" ON public.listings;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'listings' AND policyname = 'listings_update_self') THEN
    DROP POLICY "listings_update_self" ON public.listings;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'listings' AND policyname = 'listings_delete_self') THEN
    DROP POLICY "listings_delete_self" ON public.listings;
  END IF;
END $$;

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Public can read active listings
CREATE POLICY "listings_read_public" ON public.listings
  FOR SELECT
  USING (is_active = TRUE);

-- Landlord can read their own listings
CREATE POLICY "listings_read_landlord" ON public.listings
  FOR SELECT
  USING (
    landlord_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.organisation_members om
      WHERE om.org_id = listings.org_id AND om.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.organisations
      WHERE id = listings.org_id AND owner_id = auth.uid()
    )
  );

-- Landlord can create listings in their org
CREATE POLICY "listings_insert_landlord" ON public.listings
  FOR INSERT
  WITH CHECK (
    landlord_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.organisation_members om
      WHERE om.org_id = listings.org_id AND om.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.organisations
      WHERE id = listings.org_id AND owner_id = auth.uid()
    )
  );

-- Landlord can update their own listings
CREATE POLICY "listings_update_landlord" ON public.listings
  FOR UPDATE
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

-- Landlord can delete their own listings
CREATE POLICY "listings_delete_landlord" ON public.listings
  FOR DELETE
  USING (landlord_id = auth.uid());

-- ─── 9. Update RLS policies for agreements ───────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agreements') THEN
    DROP POLICY IF EXISTS "agreements_read" ON public.agreements;
    DROP POLICY IF EXISTS "agreements_insert" ON public.agreements;
    DROP POLICY IF EXISTS "agreements_update" ON public.agreements;
    DROP POLICY IF EXISTS "agreements_delete" ON public.agreements;
  END IF;
END $$;

ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agreements_read" ON public.agreements
  FOR SELECT
  USING (
    tenant_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE id = listing_id AND landlord_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.organisations
      WHERE id = org_id AND (
        owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.organisation_members om
          WHERE om.org_id = organisations.id AND om.user_id = auth.uid()
        )
      )
    )
  );

-- ─── 10. Update RLS policies for payments ────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments') THEN
    DROP POLICY IF EXISTS "payments_read" ON public.payments;
    DROP POLICY IF EXISTS "payments_insert" ON public.payments;
  END IF;
END $$;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_read" ON public.payments
  FOR SELECT
  USING (
    tenant_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.organisations
      WHERE id = org_id AND (
        owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.organisation_members om
          WHERE om.org_id = organisations.id AND om.user_id = auth.uid()
        )
      )
    )
  );

-- ─── 11. Update RLS policies for conversations ───────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations') THEN
    DROP POLICY IF EXISTS "conversations_read" ON public.conversations;
    DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;
  END IF;
END $$;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_read" ON public.conversations
  FOR SELECT
  USING (
    tenant_id = auth.uid() OR
    landlord_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.organisations
      WHERE id = org_id AND (
        owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.organisation_members om
          WHERE om.org_id = organisations.id AND om.user_id = auth.uid()
        )
      )
    )
  );

-- ─── 12. Update RLS policies for messages ────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages') THEN
    DROP POLICY IF EXISTS "messages_read" ON public.messages;
    DROP POLICY IF EXISTS "messages_insert" ON public.messages;
  END IF;
END $$;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_read" ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND (
        c.tenant_id = auth.uid() OR
        c.landlord_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.organisations o
          WHERE o.id = c.org_id AND (
            o.owner_id = auth.uid() OR
            EXISTS (
              SELECT 1 FROM public.organisation_members om
              WHERE om.org_id = o.id AND om.user_id = auth.uid()
            )
          )
        )
      )
    )
  );

COMMIT;
