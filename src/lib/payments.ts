/**
 * Payment system API library - all CRUD operations
 */

import { supabase } from "@/integrations/supabase/client";
import {
  Invoice,
  Payment,
  LandlordPayout,
  LandlordBankAccount,
  PaymentSplitResult,
  PayoutRequestResult,
  FinancialSummary,
  CreateInvoiceInput,
  CreatePaymentInput,
  AddBankAccountInput,
  RequestPayoutInput,
} from "@/types/payments";

/**
 * INVOICES
 */

export async function fetchInvoices(
  orgId: string,
  filters?: { status?: string; tenant_id?: string }
): Promise<Invoice[]> {
  let query = supabase
    .from("invoices")
    .select("*")
    .eq("org_id", orgId)
    .order("period_end", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.tenant_id) {
    query = query.eq("tenant_id", filters.tenant_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch invoices:", error);
    return [];
  }

  return (data as Invoice[]) || [];
}

export async function fetchTenantInvoices(): Promise<Invoice[]> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return [];

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("tenant_id", user.user.id)
    .order("period_end", { ascending: false });

  if (error) {
    console.error("Failed to fetch tenant invoices:", error);
    return [];
  }

  return (data as Invoice[]) || [];
}

export async function fetchInvoiceById(invoiceId: string): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (error) {
    console.error("Failed to fetch invoice:", error);
    return null;
  }

  return (data as Invoice) || null;
}

export async function createInvoice(
  input: CreateInvoiceInput
): Promise<{ success: boolean; invoice?: Invoice; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("invoices")
      .insert([
        {
          ...input,
          utility_total: input.utility_total || 0,
          platform_fee_pct: input.platform_fee_pct || 5,
          due_date: input.due_date || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
      ])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, invoice: data as Invoice };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * PAYMENTS
 */

export async function fetchPayments(
  orgId: string,
  filters?: { status?: string; invoice_id?: string }
): Promise<Payment[]> {
  let query = supabase
    .from("payments")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.invoice_id) {
    query = query.eq("invoice_id", filters.invoice_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch payments:", error);
    return [];
  }

  return (data as Payment[]) || [];
}

export async function fetchPaymentById(paymentId: string): Promise<Payment | null> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .single();

  if (error) {
    console.error("Failed to fetch payment:", error);
    return null;
  }

  return (data as Payment) || null;
}

export async function createPayment(
  input: CreatePaymentInput
): Promise<{ success: boolean; payment?: Payment; error?: string }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("payments")
      .insert([
        {
          ...input,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, payment: data as Payment };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function updatePaymentStatus(
  paymentId: string,
  status: string,
  gatewayResponse?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("payments")
      .update({
        status,
        gateway_response_code: gatewayResponse,
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * PAYMENT SPLITTING & LEDGER
 */

export async function calculateSplitPayout(
  paymentId: string
): Promise<{ success: boolean; result?: PaymentSplitResult; error?: string }> {
  try {
    const { data, error } = await supabase
      .rpc("calculate_split_payout", { payment_id: paymentId });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, result: data?.[0] as PaymentSplitResult };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * LANDLORD BANK ACCOUNTS
 */

export async function fetchBankAccounts(orgId: string): Promise<LandlordBankAccount[]> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return [];

  const { data, error } = await supabase
    .from("landlord_bank_accounts")
    .select("*")
    .eq("landlord_id", user.user.id)
    .eq("org_id", orgId)
    .order("is_primary", { ascending: false });

  if (error) {
    console.error("Failed to fetch bank accounts:", error);
    return [];
  }

  return (data as LandlordBankAccount[]) || [];
}

export async function addBankAccount(
  orgId: string,
  input: AddBankAccountInput
): Promise<{ success: boolean; account?: LandlordBankAccount; error?: string }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Not authenticated" };
    }

    // If marking as primary, unset other primaries
    if (input.is_primary) {
      await supabase
        .from("landlord_bank_accounts")
        .update({ is_primary: false })
        .eq("landlord_id", user.user.id)
        .eq("org_id", orgId);
    }

    const { data, error } = await supabase
      .from("landlord_bank_accounts")
      .insert([
        {
          landlord_id: user.user.id,
          org_id: orgId,
          ...input,
        },
      ])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, account: data as LandlordBankAccount };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function deleteBankAccount(
  accountId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("landlord_bank_accounts")
      .delete()
      .eq("id", accountId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * LANDLORD PAYOUTS
 */

export async function getLandlordPendingBalance(
  orgId: string
): Promise<{ balance: number; error?: string }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { balance: 0, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .rpc("get_landlord_pending_balance", {
        landlord_id: user.user.id,
        org_id: orgId,
      });

    if (error) {
      return { balance: 0, error: error.message };
    }

    return { balance: data as number };
  } catch (err) {
    return { balance: 0, error: String(err) };
  }
}

export async function fetchPayouts(
  orgId: string,
  filters?: { status?: string }
): Promise<LandlordPayout[]> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return [];

  let query = supabase
    .from("landlord_payouts")
    .select("*")
    .eq("landlord_id", user.user.id)
    .eq("org_id", orgId)
    .order("requested_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch payouts:", error);
    return [];
  }

  return (data as LandlordPayout[]) || [];
}

export async function requestPayout(
  orgId: string,
  input: RequestPayoutInput
): Promise<PayoutRequestResult> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error_msg: "Not authenticated" };
    }

    const { data, error } = await supabase
      .rpc("request_landlord_payout", {
        landlord_id: user.user.id,
        org_id: orgId,
        amount: input.amount,
        bank_account_id: input.bank_account_id,
      });

    if (error) {
      return { success: false, error_msg: error.message };
    }

    const result = data?.[0] as PayoutRequestResult;
    return result || { success: false, error_msg: "Unknown error" };
  } catch (err) {
    return { success: false, error_msg: String(err) };
  }
}

/**
 * FINANCIAL REPORTING
 */

export async function getFinancialSummary(orgId: string): Promise<FinancialSummary> {
  try {
    const { data: ledger } = await supabase
      .from("ledger_entries")
      .select("type, amount")
      .eq("org_id", orgId);

    const { data: payouts } = await supabase
      .from("landlord_payouts")
      .select("amount, status")
      .eq("org_id", orgId);

    const { data: disputes } = await supabase
      .from("payment_disputes")
      .select("id");

    const { data: failedPayments } = await supabase
      .from("payments")
      .select("id")
      .eq("org_id", orgId)
      .eq("status", "failed");

    const ledgerEntries = ledger || [];
    const payoutList = payouts || [];

    const totalFees = ledgerEntries
      .filter((e) => e.type === "platform_fee")
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const totalRent = ledgerEntries
      .filter((e) => e.type === "rent")
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const pendingPayouts = payoutList
      .filter((p) => p.status === "pending" || p.status === "processing")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      total_revenue: totalFees + totalRent,
      total_platform_fees: totalFees,
      total_rent_paid: totalRent,
      pending_payouts: pendingPayouts,
      failed_payments_count: failedPayments?.length || 0,
      disputed_count: disputes?.length || 0,
    };
  } catch (err) {
    console.error("Failed to get financial summary:", err);
    return {
      total_revenue: 0,
      total_platform_fees: 0,
      total_rent_paid: 0,
      pending_payouts: 0,
      failed_payments_count: 0,
      disputed_count: 0,
    };
  }
}

/**
 * Realtime subscriptions
 */

export function subscribeToInvoiceUpdates(
  invoiceId: string,
  callback: (invoice: Invoice) => void
) {
  const subscription = supabase
    .channel(`invoice:${invoiceId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "invoices",
        filter: `id=eq.${invoiceId}`,
      },
      (payload) => {
        callback(payload.new as Invoice);
      }
    )
    .subscribe();

  return subscription;
}

export function subscribeToPaymentUpdates(
  invoiceId: string,
  callback: (payment: Payment) => void
) {
  const subscription = supabase
    .channel(`payment:${invoiceId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "payments",
        filter: `invoice_id=eq.${invoiceId}`,
      },
      (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          callback(payload.new as Payment);
        }
      }
    )
    .subscribe();

  return subscription;
}
