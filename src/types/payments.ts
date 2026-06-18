/**
 * Payment & Rent Collection types for Phase 1.3
 */

export type InvoiceStatus = 'unpaid' | 'paid' | 'overdue' | 'disputed' | 'cancelled';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentGateway = 'ssłcommerz' | 'amarpay' | 'test';
export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'disputed';
export type BankAccountType = 'bank_account' | 'bkash' | 'nagad' | 'rocket';
export type LedgerType = 'platform_fee' | 'commission' | 'rent' | 'payout' | 'refund' | 'adjustment';
export type DisputeStatus = 'open' | 'investigating' | 'resolved' | 'rejected';

export interface Invoice {
  id: string;
  org_id: string;
  tenant_id: string;
  agreement_id: string;

  period_start: string; // ISO date
  period_end: string;

  base_rent: number;
  utility_total: number;
  platform_fee_pct: number; // e.g., 5 = 5%
  platform_fee: number; // auto-calculated
  net_due: number; // auto-calculated

  status: InvoiceStatus;
  issued_at: string;
  due_date: string;
  paid_at?: string;
  paid_via?: string;

  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  org_id: string;
  tenant_id: string;
  invoice_id: string;

  amount: number;
  currency: string; // 'BDT'
  status: PaymentStatus;

  payment_gateway: PaymentGateway;
  gateway_tx_id?: string;
  gateway_response_code?: string;
  gateway_error_message?: string;

  tenant_ip_address?: string;
  verified_at?: string;

  created_at: string;
  updated_at: string;
}

export interface LedgerEntry {
  id: string;
  org_id: string;

  type: LedgerType;
  related_payment_id?: string;
  related_payout_id?: string;

  amount: number;
  user_id?: string; // Landlord/recipient

  description?: string;
  created_at: string;
}

export interface LandlordBankAccount {
  id: string;
  landlord_id: string;
  org_id: string;

  account_type: BankAccountType;
  account_holder_name?: string;
  account_number: string;
  bank_name?: string;
  routing_number?: string;

  is_primary: boolean;
  verified: boolean;
  verified_at?: string;

  created_at: string;
  updated_at: string;
}

export interface LandlordPayout {
  id: string;
  org_id: string;
  landlord_id: string;

  amount: number;
  currency: string;

  status: PayoutStatus;

  bank_account_id?: string;
  settlement_method?: string;

  notes?: string;
  requested_at: string;
  processed_at?: string;
  paid_at?: string;

  created_at: string;
  updated_at: string;
}

export interface PaymentDispute {
  id: string;
  payment_id: string;
  tenant_id: string;

  reason?: string;
  description?: string;

  status: DisputeStatus;
  support_ticket_id?: string;

  created_at: string;
  updated_at: string;
}

/**
 * Input types for forms & API calls
 */

export interface CreateInvoiceInput {
  org_id: string;
  tenant_id: string;
  agreement_id: string;
  period_start: string;
  period_end: string;
  base_rent: number;
  utility_total?: number;
  platform_fee_pct?: number;
  due_date?: string;
}

export interface CreatePaymentInput {
  org_id: string;
  tenant_id: string;
  invoice_id: string;
  amount: number;
  payment_gateway: PaymentGateway;
  tenant_ip_address?: string;
}

export interface AddBankAccountInput {
  account_type: BankAccountType;
  account_holder_name?: string;
  account_number: string;
  bank_name?: string;
  routing_number?: string;
  is_primary?: boolean;
}

export interface RequestPayoutInput {
  amount: number;
  bank_account_id: string;
  notes?: string;
}

export interface PaymentWebhookPayload {
  status: string;
  transaction_id: string;
  amount: number;
  currency?: string;
  signature?: string;
  timestamp?: number;
  [key: string]: any; // Gateway-specific fields
}

/**
 * API Response types
 */

export interface PaymentSplitResult {
  success: boolean;
  platform_fee?: number;
  net_rent?: number;
  error_msg?: string;
}

export interface PayoutRequestResult {
  success: boolean;
  payout_id?: string;
  error_msg?: string;
}

/**
 * Dashboard & Analytics types
 */

export interface FinancialSummary {
  total_revenue: number;
  total_platform_fees: number;
  total_rent_paid: number;
  pending_payouts: number;
  failed_payments_count: number;
  disputed_count: number;
}

export interface InvoiceGroup {
  period: string; // YYYY-MM
  invoices: Invoice[];
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
}

export interface PayoutSummary {
  pending_balance: number;
  total_paid_lifetime: number;
  active_accounts: LandlordBankAccount[];
  recent_payouts: LandlordPayout[];
}

/**
 * Constants for UI
 */

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  unpaid: '⏳ Unpaid',
  paid: '✓ Paid',
  overdue: '🔴 Overdue',
  disputed: '⚠️ Disputed',
  cancelled: '✗ Cancelled',
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  unpaid: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  disputed: 'bg-orange-100 text-orange-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  pending: '⏳ Pending',
  processing: '⏸️ Processing',
  paid: '✓ Paid',
  failed: '✗ Failed',
  disputed: '⚠️ Disputed',
};

export const PAYOUT_STATUS_COLORS: Record<PayoutStatus, string> = {
  pending: 'bg-blue-100 text-blue-800',
  processing: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  disputed: 'bg-orange-100 text-orange-800',
};

export const BANK_ACCOUNT_TYPE_LABELS: Record<BankAccountType, string> = {
  bank_account: '🏦 Bank Account',
  bkash: '📱 bKash',
  nagad: '📱 Nagad',
  rocket: '📱 Rocket',
};

/**
 * Payment gateway configurations
 */

export interface PaymentGatewayConfig {
  name: string;
  displayName: string;
  countries: string[];
  supportsWebhook: boolean;
  webhookMethod: 'GET' | 'POST';
  currencies: string[];
  minAmount: number;
  maxAmount: number;
}

export const PAYMENT_GATEWAYS: Record<PaymentGateway, PaymentGatewayConfig> = {
  ssłcommerz: {
    name: 'ssłcommerz',
    displayName: 'SSL Commerz',
    countries: ['BD'],
    supportsWebhook: true,
    webhookMethod: 'POST',
    currencies: ['BDT'],
    minAmount: 10,
    maxAmount: 500000,
  },
  amarpay: {
    name: 'amarpay',
    displayName: 'Amar Pay',
    countries: ['BD'],
    supportsWebhook: true,
    webhookMethod: 'POST',
    currencies: ['BDT'],
    minAmount: 10,
    maxAmount: 500000,
  },
  test: {
    name: 'test',
    displayName: 'Test Gateway',
    countries: ['*'],
    supportsWebhook: true,
    webhookMethod: 'POST',
    currencies: ['BDT', 'USD', 'EUR'],
    minAmount: 1,
    maxAmount: 999999,
  },
};

/**
 * Utility functions
 */

export function formatCurrency(amount: number, currency: string = 'BDT'): string {
  return new Intl.NumberFormat('bn-BD', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function isInvoiceOverdue(invoice: Invoice): boolean {
  if (invoice.status === 'paid' || invoice.status === 'cancelled') {
    return false;
  }

  const dueDate = new Date(invoice.due_date);
  return new Date() > dueDate;
}

export function calculateDaysUntilDue(invoice: Invoice): number {
  const dueDate = new Date(invoice.due_date);
  const today = new Date();
  const diffTime = dueDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getInvoiceStatusIcon(status: InvoiceStatus): string {
  switch (status) {
    case 'unpaid':
      return '⏳';
    case 'paid':
      return '✓';
    case 'overdue':
      return '🔴';
    case 'disputed':
      return '⚠️';
    case 'cancelled':
      return '✗';
    default:
      return '?';
  }
}
