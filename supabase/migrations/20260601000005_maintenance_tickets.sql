-- ============================================================================
-- Phase 1.2: Digital Maintenance Ticketing System
-- ============================================================================
-- Tenants can report building issues (plumbing, electrical, etc).
-- Landlords/staff can manage, track, and resolve tickets.
-- Real-time updates with Realtime subscriptions.
--
-- Tables:
--   - maintenance_tickets (main ticket records)
--   - maintenance_ticket_updates (status history & notes)
--   - maintenance_ticket_attachments (photos/documents)
-- ============================================================================

-- ─── 1. Create maintenance_tickets table ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.maintenance_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agreement_id UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('plumbing', 'electrical', 'hvac', 'structural', 'appliance', 'other')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'on_hold', 'resolved', 'closed')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  estimated_resolution_date DATE,
  actual_resolution_date DATE,
  cost_estimate DECIMAL(12, 2),
  actual_cost DECIMAL(12, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_org_id ON public.maintenance_tickets(org_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_listing_id ON public.maintenance_tickets(listing_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_tenant_id ON public.maintenance_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_status ON public.maintenance_tickets(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_assigned_to ON public.maintenance_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_category ON public.maintenance_tickets(category);
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_priority ON public.maintenance_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_created_at ON public.maintenance_tickets(created_at DESC);

COMMENT ON TABLE public.maintenance_tickets IS 'Maintenance issue reports from tenants. Tracks status, assignments, and resolution.';
COMMENT ON COLUMN public.maintenance_tickets.category IS 'Type of issue: plumbing, electrical, HVAC, structural, appliance, or other.';
COMMENT ON COLUMN public.maintenance_tickets.priority IS 'Urgency level: low, normal, high, urgent.';
COMMENT ON COLUMN public.maintenance_tickets.assigned_to IS 'Staff member assigned to fix the issue.';

-- ─── 2. Create maintenance_ticket_updates table ────────────────────────
CREATE TABLE IF NOT EXISTS public.maintenance_ticket_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.maintenance_tickets(id) ON DELETE CASCADE,
  updated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT,
  message TEXT,
  is_internal_note BOOLEAN DEFAULT FALSE, -- Tenants only see non-internal notes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_ticket_updates_ticket_id ON public.maintenance_ticket_updates(ticket_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_ticket_updates_created_at ON public.maintenance_ticket_updates(created_at DESC);

COMMENT ON TABLE public.maintenance_ticket_updates IS 'Status changes and notes on a maintenance ticket. Tracked for audit trail and realtime updates.';
COMMENT ON COLUMN public.maintenance_ticket_updates.is_internal_note IS 'Internal notes are only visible to staff, not tenants.';

-- ─── 3. Create maintenance_ticket_attachments table ──────────────────────
CREATE TABLE IF NOT EXISTS public.maintenance_ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.maintenance_tickets(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL, -- Supabase Storage URL
  file_name TEXT NOT NULL,
  file_type TEXT, -- e.g., image/jpeg, application/pdf
  file_size_bytes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_ticket_attachments_ticket_id ON public.maintenance_ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_ticket_attachments_created_at ON public.maintenance_ticket_attachments(created_at DESC);

COMMENT ON TABLE public.maintenance_ticket_attachments IS 'Photos, documents, and other files attached to maintenance tickets.';

-- ─── 4. RLS Policies for maintenance_tickets ───────────────────────────
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;

-- Tenants see only their own tickets
CREATE POLICY "maintenance_tickets_read_tenant" ON public.maintenance_tickets
  FOR SELECT
  USING (tenant_id = auth.uid());

-- Staff/org members see all tickets for their org
CREATE POLICY "maintenance_tickets_read_org_admin" ON public.maintenance_tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organisations
      WHERE id = org_id AND (
        owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.organisation_members
          WHERE org_id = organisations.id AND user_id = auth.uid()
        )
      )
    )
  );

-- Tenants can create tickets for their own agreements
CREATE POLICY "maintenance_tickets_insert_tenant" ON public.maintenance_tickets
  FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

-- Org staff can update tickets
CREATE POLICY "maintenance_tickets_update_org_admin" ON public.maintenance_tickets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organisations
      WHERE id = org_id AND (
        owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.organisation_members
          WHERE org_id = organisations.id AND user_id = auth.uid() AND role IN ('owner', 'admin')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organisations
      WHERE id = org_id AND (
        owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.organisation_members
          WHERE org_id = organisations.id AND user_id = auth.uid() AND role IN ('owner', 'admin')
        )
      )
    )
  );

-- ─── 5. RLS Policies for maintenance_ticket_updates ────────────────────
ALTER TABLE public.maintenance_ticket_updates ENABLE ROW LEVEL SECURITY;

-- Tenants see updates on their tickets (non-internal only)
CREATE POLICY "maintenance_ticket_updates_read_tenant" ON public.maintenance_ticket_updates
  FOR SELECT
  USING (
    is_internal_note = FALSE AND
    EXISTS (
      SELECT 1 FROM public.maintenance_tickets
      WHERE id = ticket_id AND tenant_id = auth.uid()
    )
  );

-- Staff see all updates
CREATE POLICY "maintenance_ticket_updates_read_org_admin" ON public.maintenance_ticket_updates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_tickets
      WHERE id = ticket_id AND org_id IN (
        SELECT id FROM public.organisations
        WHERE owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.organisation_members
          WHERE org_id = organisations.id AND user_id = auth.uid()
        )
      )
    )
  );

-- Anyone can create updates on tickets they have access to
CREATE POLICY "maintenance_ticket_updates_insert" ON public.maintenance_ticket_updates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.maintenance_tickets
      WHERE id = ticket_id AND (
        tenant_id = auth.uid() OR
        org_id IN (
          SELECT id FROM public.organisations
          WHERE owner_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.organisation_members
            WHERE org_id = organisations.id AND user_id = auth.uid()
          )
        )
      )
    )
  );

-- ─── 6. RLS Policies for maintenance_ticket_attachments ────────────────
ALTER TABLE public.maintenance_ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Same access control as ticket_updates
CREATE POLICY "maintenance_ticket_attachments_read" ON public.maintenance_ticket_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_tickets
      WHERE id = ticket_id AND (
        tenant_id = auth.uid() OR
        org_id IN (
          SELECT id FROM public.organisations
          WHERE owner_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.organisation_members
            WHERE org_id = organisations.id AND user_id = auth.uid()
          )
        )
      )
    )
  );

CREATE POLICY "maintenance_ticket_attachments_insert" ON public.maintenance_ticket_attachments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.maintenance_tickets
      WHERE id = ticket_id AND (
        tenant_id = auth.uid() OR
        org_id IN (
          SELECT id FROM public.organisations
          WHERE owner_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.organisation_members
            WHERE org_id = organisations.id AND user_id = auth.uid()
          )
        )
      )
    )
  );

-- ─── 7. Helper function: get_ticket_with_updates ────────────────────────
CREATE OR REPLACE FUNCTION public.get_ticket_with_updates(p_ticket_id UUID)
RETURNS TABLE(
  ticket_id UUID,
  title TEXT,
  status TEXT,
  priority TEXT,
  category TEXT,
  update_count INTEGER
) LANGUAGE SQL SECURITY DEFINER
AS $$
  SELECT
    t.id,
    t.title,
    t.status,
    t.priority,
    t.category,
    COUNT(u.id) as update_count
  FROM public.maintenance_tickets t
  LEFT JOIN public.maintenance_ticket_updates u ON u.ticket_id = t.id
  WHERE t.id = p_ticket_id
  GROUP BY t.id, t.title, t.status, t.priority, t.category;
$$;

COMMENT ON FUNCTION public.get_ticket_with_updates IS 'Fetch a ticket with update count for dashboard preview.';

-- ─── 8. Update timestamp triggers ──────────────────────────────────────
CREATE TRIGGER maintenance_tickets_updated_at_trigger
  BEFORE UPDATE ON public.maintenance_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ─── 9. Enable Realtime for tickets (for real-time dashboard) ──────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_ticket_updates;

COMMIT;
