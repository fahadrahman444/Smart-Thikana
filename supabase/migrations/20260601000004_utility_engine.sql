-- ============================================================================
-- Phase 1.1: Automated Split-Utility Engine
-- ============================================================================
-- This migration creates tables for managing utility bills and sub-meter readings,
-- with automatic calculation of tenant shares and charges.
--
-- Tables:
--   - utility_bills (landlord uploads bill or enters amount)
--   - sub_meter_readings (tenant submits meter readings)
--   - tenant_utility_charges (calculated shares per tenant)
--   - utility_bill_items (line items: water, electricity, gas, etc)
-- ============================================================================

-- ─── 1. Create utility_bills table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.utility_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  bill_type TEXT NOT NULL CHECK (bill_type IN ('water', 'electricity', 'gas', 'internet', 'other')),
  provider_name TEXT NOT NULL, -- e.g., "DWASA", "DPDC", "Teletalk"
  total_amount DECIMAL(12, 2) NOT NULL,
  bill_amount DECIMAL(12, 2) NOT NULL, -- before processing fees
  processing_fee DECIMAL(12, 2) NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  bill_image_url TEXT, -- Supabase Storage URL to bill PDF/image
  meter_number TEXT,
  currency TEXT DEFAULT 'BDT',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'calculated', 'invoiced', 'paid')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_utility_bills_org_id ON public.utility_bills(org_id);
CREATE INDEX IF NOT EXISTS idx_utility_bills_listing_id ON public.utility_bills(listing_id);
CREATE INDEX IF NOT EXISTS idx_utility_bills_period ON public.utility_bills(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_utility_bills_status ON public.utility_bills(status);

COMMENT ON TABLE public.utility_bills IS 'Utility bills uploaded by landlords or manually entered. One bill per building per billing period per utility type.';
COMMENT ON COLUMN public.utility_bills.bill_type IS 'Type of utility: water, electricity, gas, internet, or other.';
COMMENT ON COLUMN public.utility_bills.total_amount IS 'Total to be paid (bill_amount + processing_fee).';
COMMENT ON COLUMN public.utility_bills.bill_image_url IS 'URL to PDF/image of original bill stored in Supabase Storage.';

-- ─── 2. Create sub_meter_readings table ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sub_meter_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agreement_id UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  utility_bill_id UUID NOT NULL REFERENCES public.utility_bills(id) ON DELETE CASCADE,
  meter_reading DECIMAL(10, 2) NOT NULL,
  reading_unit TEXT NOT NULL DEFAULT 'kWh', -- e.g., kWh, m3, liters
  reading_date DATE NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_meter_readings_tenant_id ON public.sub_meter_readings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sub_meter_readings_utility_bill_id ON public.sub_meter_readings(utility_bill_id);
CREATE INDEX IF NOT EXISTS idx_sub_meter_readings_agreement_id ON public.sub_meter_readings(agreement_id);
CREATE INDEX IF NOT EXISTS idx_sub_meter_readings_org_id ON public.sub_meter_readings(org_id);

COMMENT ON TABLE public.sub_meter_readings IS 'Individual meter readings per tenant for a utility bill period.';
COMMENT ON COLUMN public.sub_meter_readings.meter_reading IS 'The reading value from the tenant\'s sub-meter.';
COMMENT ON COLUMN public.sub_meter_readings.verified_by IS 'Staff member who verified the reading (optional).';

-- ─── 3. Create tenant_utility_charges table ────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenant_utility_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agreement_id UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  utility_bill_id UUID NOT NULL REFERENCES public.utility_bills(id) ON DELETE CASCADE,
  bill_type TEXT NOT NULL,
  usage_share_percent DECIMAL(5, 2) NOT NULL, -- e.g., 33.33 for 1 of 3 tenants
  calculated_amount DECIMAL(12, 2) NOT NULL, -- the tenant's share
  processing_fee_share DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_charge DECIMAL(12, 2) NOT NULL, -- calculated_amount + processing_fee_share
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'invoiced', 'paid', 'disputed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, utility_bill_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_utility_charges_org_id ON public.tenant_utility_charges(org_id);
CREATE INDEX IF NOT EXISTS idx_tenant_utility_charges_tenant_id ON public.tenant_utility_charges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_utility_charges_utility_bill_id ON public.tenant_utility_charges(utility_bill_id);
CREATE INDEX IF NOT EXISTS idx_tenant_utility_charges_status ON public.tenant_utility_charges(status);
CREATE INDEX IF NOT EXISTS idx_tenant_utility_charges_agreement_id ON public.tenant_utility_charges(agreement_id);

COMMENT ON TABLE public.tenant_utility_charges IS 'Calculated utility charge per tenant based on their usage share.';
COMMENT ON COLUMN public.tenant_utility_charges.usage_share_percent IS 'Tenant\'s percentage of total usage (0-100).';
COMMENT ON COLUMN public.tenant_utility_charges.calculated_amount IS 'Tenant\'s share of the bill amount.';

-- ─── 4. RLS Policies for utility_bills ─────────────────────────────────
ALTER TABLE public.utility_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "utility_bills_read_org_members" ON public.utility_bills
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organisations
      WHERE id = utility_bills.org_id AND (
        owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.organisation_members
          WHERE org_id = organisations.id AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "utility_bills_insert_org_admin" ON public.utility_bills
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organisations
      WHERE id = org_id AND owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.organisation_members
      WHERE org_id = org_id AND user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "utility_bills_update_org_admin" ON public.utility_bills
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organisations
      WHERE id = org_id AND owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.organisation_members
      WHERE org_id = org_id AND user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organisations
      WHERE id = org_id AND owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.organisation_members
      WHERE org_id = org_id AND user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ─── 5. RLS Policies for sub_meter_readings ────────────────────────────
ALTER TABLE public.sub_meter_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sub_meter_readings_read_tenant_or_admin" ON public.sub_meter_readings
  FOR SELECT
  USING (
    tenant_id = auth.uid() OR
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

CREATE POLICY "sub_meter_readings_insert_tenant" ON public.sub_meter_readings
  FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "sub_meter_readings_update_tenant_or_admin" ON public.sub_meter_readings
  FOR UPDATE
  USING (
    tenant_id = auth.uid() OR
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
    tenant_id = auth.uid() OR
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

-- ─── 6. RLS Policies for tenant_utility_charges ────────────────────────
ALTER TABLE public.tenant_utility_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_utility_charges_read_tenant_or_admin" ON public.tenant_utility_charges
  FOR SELECT
  USING (
    tenant_id = auth.uid() OR
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

CREATE POLICY "tenant_utility_charges_insert_admin" ON public.tenant_utility_charges
  FOR INSERT
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

-- ─── 7. Helper function: calculate_utility_split ────────────────────────
CREATE OR REPLACE FUNCTION public.calculate_utility_split(
  p_utility_bill_id UUID
)
RETURNS TABLE(
  tenant_id UUID,
  calculated_charge DECIMAL,
  usage_share DECIMAL
) LANGUAGE SQL SECURITY DEFINER
AS $$
  -- Get bill details
  WITH bill AS (
    SELECT
      id,
      listing_id,
      total_amount,
      bill_amount,
      processing_fee
    FROM public.utility_bills
    WHERE id = p_utility_bill_id
  ),
  -- Get all active agreements for the listing
  active_tenants AS (
    SELECT
      a.tenant_id,
      a.id as agreement_id
    FROM public.agreements a
    JOIN bill ON a.listing_id = bill.listing_id
    WHERE a.status IN ('accepted', 'active')
  ),
  -- Get meter readings for this bill
  readings AS (
    SELECT
      smr.tenant_id,
      smr.meter_reading
    FROM public.sub_meter_readings smr
    WHERE smr.utility_bill_id = p_utility_bill_id
  ),
  -- Calculate total usage
  total_usage AS (
    SELECT COALESCE(SUM(meter_reading), 1) as sum_reading
    FROM readings
  ),
  -- Calculate per-tenant share
  tenant_shares AS (
    SELECT
      at.tenant_id,
      COALESCE(r.meter_reading, 0) as tenant_reading,
      COALESCE(r.meter_reading / tu.sum_reading, 1.0 / COUNT(*) OVER ()) as share_percent
    FROM active_tenants at
    LEFT JOIN readings r ON at.tenant_id = r.tenant_id
    CROSS JOIN total_usage tu
  )
  SELECT
    tenant_id,
    ((SELECT bill_amount FROM bill) * share_percent) as calculated_charge,
    (share_percent * 100)::DECIMAL as usage_share
  FROM tenant_shares;
$$;

COMMENT ON FUNCTION public.calculate_utility_split IS 'Calculate utility charges for all tenants based on meter readings.';

-- ─── 8. Update timestamp trigger ───────────────────────────────────────
CREATE TRIGGER utility_bills_updated_at_trigger
  BEFORE UPDATE ON public.utility_bills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER sub_meter_readings_updated_at_trigger
  BEFORE UPDATE ON public.sub_meter_readings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER tenant_utility_charges_updated_at_trigger
  BEFORE UPDATE ON public.tenant_utility_charges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
