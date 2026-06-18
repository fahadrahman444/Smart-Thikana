/**
 * Utility Engine API - all database operations for utility bills and readings
 */

import { supabase } from "@/integrations/supabase/client";
import {
  UtilityBill,
  UtilityBillInput,
  SubMeterReading,
  MeterReadingInput,
  TenantUtilityCharge,
  UtilityCalculationResult,
} from "@/types/utilities";

/**
 * Create a new utility bill.
 */
export async function createUtilityBill(
  orgId: string,
  input: UtilityBillInput
): Promise<{ success: boolean; bill?: UtilityBill; error?: string }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Not authenticated" };
    }

    const totalAmount = input.total_amount || input.bill_amount + (input.processing_fee || 0);

    const { data, error } = await supabase
      .from("utility_bills")
      .insert([
        {
          org_id: orgId,
          listing_id: input.listing_id,
          bill_type: input.bill_type,
          provider_name: input.provider_name,
          bill_amount: input.bill_amount,
          processing_fee: input.processing_fee || 0,
          total_amount: totalAmount,
          period_start: input.period_start,
          period_end: input.period_end,
          meter_number: input.meter_number,
          bill_image_url: input.bill_image_url,
          created_by: user.user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, bill: data as UtilityBill };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Fetch all utility bills for an organisation/listing.
 */
export async function fetchUtilityBills(
  orgId: string,
  listingId?: string
): Promise<UtilityBill[]> {
  let query = supabase
    .from("utility_bills")
    .select("*")
    .eq("org_id", orgId)
    .order("period_start", { ascending: false });

  if (listingId) {
    query = query.eq("listing_id", listingId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Failed to fetch utility bills:", error);
    return [];
  }

  return (data as UtilityBill[]) || [];
}

/**
 * Fetch a single utility bill by ID.
 */
export async function fetchUtilityBill(billId: string): Promise<UtilityBill | null> {
  const { data, error } = await supabase
    .from("utility_bills")
    .select("*")
    .eq("id", billId)
    .single();

  if (error) {
    console.error(`Failed to fetch bill ${billId}:`, error);
    return null;
  }

  return (data as UtilityBill) || null;
}

/**
 * Submit a meter reading for a bill period.
 */
export async function submitMeterReading(
  orgId: string,
  input: MeterReadingInput
): Promise<{ success: boolean; reading?: SubMeterReading; error?: string }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("sub_meter_readings")
      .insert([
        {
          org_id: orgId,
          tenant_id: user.user.id,
          agreement_id: input.agreement_id,
          utility_bill_id: input.utility_bill_id,
          meter_reading: input.meter_reading,
          reading_unit: input.reading_unit || "kWh",
          reading_date: input.reading_date,
          notes: input.notes,
        },
      ])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, reading: data as SubMeterReading };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Fetch meter readings for a utility bill.
 */
export async function fetchMeterReadingsForBill(
  billId: string
): Promise<SubMeterReading[]> {
  const { data, error } = await supabase
    .from("sub_meter_readings")
    .select("*")
    .eq("utility_bill_id", billId)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch meter readings:", error);
    return [];
  }

  return (data as SubMeterReading[]) || [];
}

/**
 * Calculate utility charges for all tenants in a building for a bill.
 */
export async function calculateUtilityCharges(
  billId: string
): Promise<{ success: boolean; charges?: TenantUtilityCharge[]; error?: string }> {
  try {
    // Call the RPC function to calculate splits
    const { data: results, error: calcError } = await supabase.rpc(
      "calculate_utility_split",
      { p_utility_bill_id: billId }
    );

    if (calcError) {
      return { success: false, error: calcError.message };
    }

    // Get the bill to get org_id and other details
    const bill = await fetchUtilityBill(billId);
    if (!bill) {
      return { success: false, error: "Bill not found" };
    }

    // Get the agreement IDs for each tenant
    const { data: agreements } = await supabase
      .from("agreements")
      .select("id, tenant_id")
      .eq("listing_id", bill.listing_id)
      .in(
        "tenant_id",
        (results as UtilityCalculationResult[]).map((r) => r.tenant_id)
      );

    if (!agreements) {
      return { success: false, error: "Could not fetch agreements" };
    }

    // Create charges for each tenant
    const charges = (results as UtilityCalculationResult[]).map((result) => {
      const agreement = agreements.find((a) => a.tenant_id === result.tenant_id);
      return {
        org_id: bill.org_id,
        tenant_id: result.tenant_id,
        agreement_id: agreement?.id,
        utility_bill_id: billId,
        bill_type: bill.bill_type,
        usage_share_percent: result.usage_share,
        calculated_amount: result.calculated_charge,
        processing_fee_share: (bill.processing_fee / (results as any[]).length),
        total_charge: result.calculated_charge + (bill.processing_fee / (results as any[]).length),
        status: "pending",
      };
    });

    // Upsert charges into database
    const { data, error: insertError } = await supabase
      .from("tenant_utility_charges")
      .upsert(charges, { onConflict: "tenant_id,utility_bill_id" })
      .select();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    // Mark bill as calculated
    await supabase
      .from("utility_bills")
      .update({ status: "calculated" })
      .eq("id", billId);

    return { success: true, charges: data as TenantUtilityCharge[] };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Fetch utility charges for a tenant.
 */
export async function fetchTenantUtilityCharges(
  tenantId: string
): Promise<TenantUtilityCharge[]> {
  const { data, error } = await supabase
    .from("tenant_utility_charges")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch tenant utility charges:", error);
    return [];
  }

  return (data as TenantUtilityCharge[]) || [];
}

/**
 * Fetch utility charges for a specific bill.
 */
export async function fetchChargesForBill(
  billId: string
): Promise<Array<TenantUtilityCharge & { full_name?: string }>> {
  const { data, error } = await supabase
    .from("tenant_utility_charges")
    .select(
      `
      *,
      profiles:tenant_id (full_name)
    `
    )
    .eq("utility_bill_id", billId);

  if (error) {
    console.error("Failed to fetch bill charges:", error);
    return [];
  }

  return (data as any[]) || [];
}

/**
 * Generate a breakdown report for a utility bill.
 */
export async function generateUtilityBreakdown(
  billId: string
): Promise<{
  bill?: UtilityBill;
  readings?: SubMeterReading[];
  charges?: Array<TenantUtilityCharge & { full_name?: string }>;
  error?: string;
}> {
  try {
    const bill = await fetchUtilityBill(billId);
    if (!bill) {
      return { error: "Bill not found" };
    }

    const readings = await fetchMeterReadingsForBill(billId);
    const charges = await fetchChargesForBill(billId);

    return { bill, readings, charges };
  } catch (err) {
    return { error: String(err) };
  }
}

/**
 * Mark utility charges as invoiced.
 */
export async function markChargesAsInvoiced(
  billId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("tenant_utility_charges")
      .update({ status: "invoiced" })
      .eq("utility_bill_id", billId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Also mark the bill as invoiced
    await supabase
      .from("utility_bills")
      .update({ status: "invoiced" })
      .eq("id", billId);

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Upload a utility bill image to Supabase Storage.
 */
export async function uploadBillImage(
  orgId: string,
  file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const fileName = `${orgId}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from("utility-bills")
      .upload(fileName, file);

    if (error) {
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("utility-bills")
      .getPublicUrl(data.path);

    return { success: true, url: urlData.publicUrl };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
