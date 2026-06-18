/**
 * Utility Engine types and constants
 */

export type UtilityBillType = 'water' | 'electricity' | 'gas' | 'internet' | 'other';
export type UtilityBillStatus = 'pending' | 'calculated' | 'invoiced' | 'paid';
export type ReadingStatus = 'pending' | 'invoiced' | 'paid' | 'disputed';

/**
 * A utility bill uploaded by a landlord or manually entered.
 */
export interface UtilityBill {
  id: string;
  org_id: string;
  listing_id: string;
  bill_type: UtilityBillType;
  provider_name: string;
  total_amount: number;
  bill_amount: number;
  processing_fee: number;
  period_start: string; // ISO date
  period_end: string;
  bill_image_url?: string;
  meter_number?: string;
  currency: string;
  status: UtilityBillStatus;
  created_by: string; // user ID
  created_at: string;
  updated_at: string;
}

/**
 * A sub-meter reading from a tenant for a utility bill period.
 */
export interface SubMeterReading {
  id: string;
  org_id: string;
  tenant_id: string;
  agreement_id: string;
  utility_bill_id: string;
  meter_reading: number;
  reading_unit: string; // e.g., kWh, m3, liters
  reading_date: string; // ISO date
  submitted_at: string;
  verified_by?: string; // user ID
  verified_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Calculated utility charge for a tenant based on their usage share.
 */
export interface TenantUtilityCharge {
  id: string;
  org_id: string;
  tenant_id: string;
  agreement_id: string;
  utility_bill_id: string;
  bill_type: UtilityBillType;
  usage_share_percent: number; // 0-100
  calculated_amount: number;
  processing_fee_share: number;
  total_charge: number;
  status: ReadingStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Request to upload/create a utility bill.
 */
export interface UtilityBillInput {
  listing_id: string;
  bill_type: UtilityBillType;
  provider_name: string;
  bill_amount: number;
  processing_fee?: number;
  total_amount?: number; // if not provided, calculated as bill_amount + processing_fee
  period_start: string; // ISO date
  period_end: string;
  meter_number?: string;
  bill_image_url?: string;
}

/**
 * Request to submit a meter reading.
 */
export interface MeterReadingInput {
  agreement_id: string;
  utility_bill_id: string;
  meter_reading: number;
  reading_unit?: string;
  reading_date: string;
  notes?: string;
}

/**
 * Response from utility calculation function.
 */
export interface UtilityCalculationResult {
  tenant_id: string;
  calculated_charge: number;
  usage_share: number;
}

/**
 * Utility bill type labels for UI.
 */
export const UTILITY_BILL_TYPE_LABELS: Record<UtilityBillType, string> = {
  water: 'Water',
  electricity: 'Electricity',
  gas: 'Gas',
  internet: 'Internet',
  other: 'Other',
};

/**
 * Bill status labels for UI.
 */
export const UTILITY_BILL_STATUS_LABELS: Record<UtilityBillStatus, string> = {
  pending: 'Pending Calculation',
  calculated: 'Calculated',
  invoiced: 'Invoiced',
  paid: 'Paid',
};

/**
 * Common utility providers in Bangladesh.
 */
export const UTILITY_PROVIDERS = [
  // Water
  { name: 'DWASA', type: 'water' },
  { name: 'WASA (Dhaka)', type: 'water' },

  // Electricity
  { name: 'DPDC (Dhaka)', type: 'electricity' },
  { name: 'DESCO', type: 'electricity' },
  { name: 'STPPDC', type: 'electricity' },
  { name: 'PGCB', type: 'electricity' },

  // Gas
  { name: 'Titas Gas', type: 'gas' },
  { name: 'Jamuna Gas', type: 'gas' },

  // Internet/Broadband
  { name: 'Banglalink', type: 'internet' },
  { name: 'Grameenphone', type: 'internet' },
  { name: 'Robi', type: 'internet' },
];

/**
 * Get providers for a specific bill type.
 */
export function getProvidersForType(type: UtilityBillType) {
  return UTILITY_PROVIDERS.filter((p) => p.type === type);
}

/**
 * Format currency for display.
 */
export function formatUtilityAmount(amount: number, currency = 'BDT'): string {
  const formatter = new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
}
