/**
 * Phase 1.3: Rent Collection & Automated Split-Payout Engine
 * 
 * Adds complete payment processing system:
 * - Monthly invoice generation
 * - Payment processing with gateway integration
 * - Ledger-based fee splitting
 * - Landlord payout requests
 * - Financial tracking & reporting
 */

-- ============================================================================
-- TABLE: invoices
-- Monthly invoices for each tenant's rent + utilities + platform fee
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agreement_id UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,

  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  base_rent DECIMAL(10, 2) NOT NULL,
  utility_total DECIMAL(10, 2) DEFAULT 0,
  platform_fee_pct DECIMAL(5, 2) NOT NULL DEFAULT 5,
  platform_fee DECIMAL(10, 2) GENERATED ALWAYS AS (
    ROUND((base_rent + utility_total) * platform_fee_pct / 100, 2)
  ) STORED,

  net_due DECIMAL(10, 2) GENERATED ALWAYS AS (
    base_rent + utility_total + ROUND((base_rent + utility_total) * platform_fee_pct / 100, 2)
  ) STORED,

  status VARCHAR(30) NOT NULL DEFAULT 'unpaid',
  issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
  due_date DATE,
  paid_at TIMESTAMP,
  paid_via VARCHAR(50),

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_period CHECK (period_end >= period_start),
  CONSTRAINT valid_status CHECK (status IN ('unpaid', 'paid', 'overdue', 'disputed', 'cancelled'))
);

CREATE INDEX idx_invoices_org_id ON invoices(org_id);
CREATE INDEX idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX idx_invoices_agreement_id ON invoices(agreement_id);
CREATE INDEX idx_invoices_period ON invoices(period_start, period_end);
CREATE INDEX idx_invoices_status ON invoices(status);

-- ============================================================================
-- TABLE: payments
-- Complete payment transaction log
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'BDT',
  status VARCHAR(30) NOT NULL DEFAULT 'pending',

  payment_gateway VARCHAR(50) NOT NULL,
  gateway_tx_id VARCHAR(100),
  gateway_response_code VARCHAR(10),
  gateway_error_message TEXT,

  tenant_ip_address INET,
  verified_at TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  CONSTRAINT unique_gateway_tx UNIQUE (gateway_tx_id)
);

CREATE INDEX idx_payments_org_id ON payments(org_id);
CREATE INDEX idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_gateway_tx ON payments(gateway_tx_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ============================================================================
-- TABLE: ledger_entries
-- Financial source of truth: all fees & payments tracked here
-- ============================================================================
CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,

  type VARCHAR(30) NOT NULL,
  related_payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  related_payout_id UUID,

  amount DECIMAL(10, 2) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_type CHECK (type IN ('platform_fee', 'commission', 'rent', 'payout', 'refund', 'adjustment'))
);

CREATE INDEX idx_ledger_org_id ON ledger_entries(org_id);
CREATE INDEX idx_ledger_type ON ledger_entries(type);
CREATE INDEX idx_ledger_user_id ON ledger_entries(user_id);
CREATE INDEX idx_ledger_created ON ledger_entries(created_at);

-- ============================================================================
-- TABLE: landlord_bank_accounts
-- Landlord's saved bank/MFS accounts for payouts
-- ============================================================================
CREATE TABLE IF NOT EXISTS landlord_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,

  account_type VARCHAR(20) NOT NULL,
  account_holder_name VARCHAR(100),
  account_number VARCHAR(50),
  bank_name VARCHAR(100),
  routing_number VARCHAR(50),

  is_primary BOOLEAN DEFAULT FALSE,
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_type CHECK (account_type IN ('bank_account', 'bkash', 'nagad', 'rocket')),
  CONSTRAINT unique_account UNIQUE (landlord_id, account_number)
);

CREATE INDEX idx_bank_accounts_landlord ON landlord_bank_accounts(landlord_id);
CREATE INDEX idx_bank_accounts_org ON landlord_bank_accounts(org_id);

-- ============================================================================
-- TABLE: landlord_payouts
-- Landlord payout requests & settlement status
-- ============================================================================
CREATE TABLE IF NOT EXISTS landlord_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'BDT',

  status VARCHAR(30) NOT NULL DEFAULT 'pending',

  bank_account_id UUID REFERENCES landlord_bank_accounts(id) ON DELETE SET NULL,
  settlement_method VARCHAR(20),

  notes TEXT,
  requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP,
  paid_at TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'disputed')),
  CONSTRAINT valid_amount CHECK (amount >= 5)
);

CREATE INDEX idx_payouts_landlord ON landlord_payouts(landlord_id);
CREATE INDEX idx_payouts_org ON landlord_payouts(org_id);
CREATE INDEX idx_payouts_status ON landlord_payouts(status);
CREATE INDEX idx_payouts_requested ON landlord_payouts(requested_at);

-- ============================================================================
-- TABLE: payment_disputes
-- Tenant can dispute a transaction
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  reason VARCHAR(30),
  description TEXT,

  status VARCHAR(20) NOT NULL DEFAULT 'open',
  support_ticket_id UUID,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (status IN ('open', 'investigating', 'resolved', 'rejected'))
);

CREATE INDEX idx_disputes_payment ON payment_disputes(payment_id);
CREATE INDEX idx_disputes_tenant ON payment_disputes(tenant_id);
CREATE INDEX idx_disputes_status ON payment_disputes(status);

-- ============================================================================
-- MODIFY: agreements table
-- Add platform_fee_pct column
-- ============================================================================
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS platform_fee_pct DECIMAL(5, 2) DEFAULT 5;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Invoices: Tenants see own invoices, staff sees all org invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoices_tenant_read ON invoices FOR SELECT
  USING (
    tenant_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.org_id = invoices.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'staff')
    )
  );

CREATE POLICY invoices_staff_write ON invoices FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.org_id = org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'staff')
    )
  );

CREATE POLICY invoices_staff_update ON invoices FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.org_id = invoices.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'staff')
    )
  );

-- Payments: Tenants see own payments, staff sees all
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_tenant_read ON payments FOR SELECT
  USING (
    tenant_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.org_id = payments.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'staff')
    )
  );

CREATE POLICY payments_insert ON payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.org_id = org_id
        AND om.user_id = auth.uid()
    )
  );

-- Ledger: Staff only (financial sensitive)
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY ledger_staff_read ON ledger_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.org_id = ledger_entries.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'staff')
    )
  );

CREATE POLICY ledger_service_write ON ledger_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.org_id = org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'staff')
    )
  );

-- Bank accounts: User owns their own
ALTER TABLE landlord_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY bank_accounts_read ON landlord_bank_accounts FOR SELECT
  USING (
    landlord_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.org_id = landlord_bank_accounts.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY bank_accounts_write ON landlord_bank_accounts FOR INSERT
  WITH CHECK (landlord_id = auth.uid());

CREATE POLICY bank_accounts_update ON landlord_bank_accounts FOR UPDATE
  USING (landlord_id = auth.uid());

CREATE POLICY bank_accounts_delete ON landlord_bank_accounts FOR DELETE
  USING (landlord_id = auth.uid());

-- Payouts: User sees own payouts, admin sees all
ALTER TABLE landlord_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY payouts_read ON landlord_payouts FOR SELECT
  USING (
    landlord_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.org_id = landlord_payouts.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'staff')
    )
  );

CREATE POLICY payouts_insert ON landlord_payouts FOR INSERT
  WITH CHECK (landlord_id = auth.uid());

-- Disputes: Tenant sees own, staff sees all
ALTER TABLE payment_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY disputes_read ON payment_disputes FOR SELECT
  USING (
    tenant_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM organisations o
        JOIN organisation_members om ON om.org_id = o.id
        WHERE o.id IN (
          SELECT org_id FROM payments WHERE id = payment_disputes.payment_id
        )
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'staff')
    )
  );

-- ============================================================================
-- RPC FUNCTION: generate_monthly_invoices
-- Batch creates invoices for all active agreements
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_monthly_invoices(target_month DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(invoices_created INT, errors TEXT[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start DATE;
  v_month_end DATE;
  v_invoice_count INT := 0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_utility_total DECIMAL;
  agreement RECORD;
BEGIN
  v_month_start := DATE_TRUNC('month', target_month)::DATE;
  v_month_end := (DATE_TRUNC('month', target_month) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  -- Loop through all active agreements
  FOR agreement IN
    SELECT a.id, a.tenant_id, a.listing_id, a.base_rent, a.platform_fee_pct, a.org_id
    FROM agreements a
    WHERE a.status = 'active'
      AND a.move_in_date <= v_month_end
      AND (a.move_out_date IS NULL OR a.move_out_date >= v_month_start)
  LOOP
    BEGIN
      -- Get total utility charges for this tenant this month
      SELECT COALESCE(SUM(amount), 0)
      INTO v_utility_total
      FROM tenant_utility_charges
      WHERE tenant_id = agreement.tenant_id
        AND DATE_TRUNC('month', charge_date)::DATE = v_month_start
        AND status = 'pending';

      -- Create invoice
      INSERT INTO invoices (
        org_id, tenant_id, agreement_id,
        period_start, period_end,
        base_rent, utility_total, platform_fee_pct,
        due_date
      ) VALUES (
        agreement.org_id, agreement.tenant_id, agreement.id,
        v_month_start, v_month_end,
        agreement.base_rent, v_utility_total, agreement.platform_fee_pct,
        v_month_end + INTERVAL '5 days'
      );

      v_invoice_count := v_invoice_count + 1;

    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'Agreement ' || agreement.id || ': ' || SQLERRM);
    END;
  END LOOP;

  RETURN QUERY SELECT v_invoice_count, v_errors;
END;
$$;

-- ============================================================================
-- RPC FUNCTION: calculate_split_payout
-- Splits payment into platform fee + rent, updates ledger & invoice status
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_split_payout(payment_id UUID)
RETURNS TABLE(success BOOLEAN, platform_fee DECIMAL, net_rent DECIMAL, error_msg TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_invoice invoices%ROWTYPE;
  v_platform_fee DECIMAL;
  v_net_rent DECIMAL;
  v_landlord_id UUID;
BEGIN
  -- Get payment details
  SELECT * INTO v_payment FROM payments WHERE id = payment_id;
  IF v_payment.id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 0, 'Payment not found'::TEXT;
    RETURN;
  END IF;

  -- Get invoice & landlord
  SELECT * INTO v_invoice FROM invoices WHERE id = v_payment.invoice_id;
  SELECT landlord_id INTO v_landlord_id
    FROM agreements WHERE id = v_invoice.agreement_id;

  -- Calculate split
  v_platform_fee := v_invoice.platform_fee;
  v_net_rent := v_payment.amount - v_platform_fee;

  -- Create ledger entries
  INSERT INTO ledger_entries (org_id, type, related_payment_id, amount, user_id, description)
  VALUES
    (v_payment.org_id, 'platform_fee', payment_id, v_platform_fee, NULL, 'Platform fee from payment ' || payment_id),
    (v_payment.org_id, 'rent', payment_id, v_net_rent, v_landlord_id, 'Rent from payment ' || payment_id);

  -- Mark invoice as paid
  UPDATE invoices
  SET status = 'paid', paid_at = NOW(), paid_via = v_payment.payment_gateway
  WHERE id = v_payment.invoice_id;

  -- Update payment status
  UPDATE payments
  SET status = 'completed', verified_at = NOW(), updated_at = NOW()
  WHERE id = payment_id;

  RETURN QUERY SELECT TRUE, v_platform_fee, v_net_rent, NULL::TEXT;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE, 0, 0, SQLERRM;
END;
$$;

-- ============================================================================
-- RPC FUNCTION: get_landlord_pending_balance
-- Calculate total pending payout for a landlord
-- ============================================================================
CREATE OR REPLACE FUNCTION get_landlord_pending_balance(landlord_id UUID, org_id UUID)
RETURNS DECIMAL
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM ledger_entries
  WHERE type = 'rent'
    AND user_id = landlord_id
    AND org_id = org_id
    AND created_at > CURRENT_DATE - INTERVAL '365 days';
$$;

-- ============================================================================
-- RPC FUNCTION: request_landlord_payout
-- Create payout request from pending balance
-- ============================================================================
CREATE OR REPLACE FUNCTION request_landlord_payout(
  landlord_id UUID,
  org_id UUID,
  amount DECIMAL,
  bank_account_id UUID
)
RETURNS TABLE(success BOOLEAN, payout_id UUID, error_msg TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending_balance DECIMAL;
  v_payout_id UUID;
BEGIN
  -- Verify user is member of org
  IF NOT EXISTS (
    SELECT 1 FROM organisation_members
    WHERE user_id = landlord_id AND org_id = org_id
  ) THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'User not member of organisation'::TEXT;
    RETURN;
  END IF;

  -- Verify bank account exists and is owned by user
  IF NOT EXISTS (
    SELECT 1 FROM landlord_bank_accounts
    WHERE id = bank_account_id AND landlord_id = landlord_id
  ) THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Bank account not found or not owned by user'::TEXT;
    RETURN;
  END IF;

  -- Check pending balance
  SELECT get_landlord_pending_balance(landlord_id, org_id)
  INTO v_pending_balance;

  IF amount > v_pending_balance THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Amount exceeds pending balance. Pending: ' || v_pending_balance::TEXT;
    RETURN;
  END IF;

  IF amount < 5 THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Minimum payout amount is 5 BDT'::TEXT;
    RETURN;
  END IF;

  -- Create payout request
  INSERT INTO landlord_payouts (
    landlord_id, org_id, amount, bank_account_id, status
  ) VALUES (
    landlord_id, org_id, amount, bank_account_id, 'pending'
  ) RETURNING landlord_payouts.id INTO v_payout_id;

  RETURN QUERY SELECT TRUE, v_payout_id, NULL::TEXT;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE, NULL::UUID, SQLERRM;
END;
$$;

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT EXECUTE ON FUNCTION generate_monthly_invoices(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_split_payout(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_landlord_pending_balance(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION request_landlord_payout(UUID, UUID, DECIMAL, UUID) TO authenticated;
