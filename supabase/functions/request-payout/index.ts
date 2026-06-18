/**
 * Phase 1.3: Request Payout
 * 
 * Landlord-triggered edge function to request a payout of pending balance.
 * Validates balance, creates payout record, and initiates transfer.
 * 
 * Request:
 * POST /functions/v1/request-payout
 * {
 *   "amount": 5000,
 *   "bank_account_id": "uuid"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "payout_id": "uuid",
 *   "amount": 5000,
 *   "status": "pending",
 *   "estimated_arrival": "2025-06-05"
 * }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuration
const MINIMUM_PAYOUT = 500; // BDT
const PROCESSING_FEE_PCT = 2; // 2% processing fee
const ESTIMATED_DAYS = 3; // Business days to process

interface RequestPayoutInput {
  amount: number;
  bank_account_id: string;
}

interface BankAccount {
  id: string;
  landlord_id: string;
  org_id: string;
  account_type: string;
  account_holder_name: string;
  is_verified: boolean;
}

/**
 * Get authenticated user from request
 */
async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  const { data: userData, error } = await supabase.auth.getUser(token);

  if (error || !userData.user) {
    return null;
  }

  return userData.user;
}

/**
 * Validate bank account ownership
 */
async function validateBankAccount(
  accountId: string,
  landlordId: string
): Promise<BankAccount | null> {
  const { data: account, error } = await supabase
    .from("landlord_bank_accounts")
    .select("*")
    .eq("id", accountId)
    .eq("landlord_id", landlordId)
    .maybeSingle();

  if (error) {
    console.error("Bank account validation error:", error);
    return null;
  }

  return account;
}

/**
 * Get landlord's pending balance
 */
async function getLandlordPendingBalance(
  landlordId: string,
  orgId: string
): Promise<number> {
  const { data: balance } = await supabase.rpc(
    "get_landlord_pending_balance",
    { landlord_id: landlordId, org_id: orgId }
  );

  return balance || 0;
}

/**
 * Create payout record in database
 */
async function createPayoutRecord(
  landlordId: string,
  orgId: string,
  bankAccountId: string,
  amount: number,
  processingFee: number
): Promise<string | null> {
  const { data: payout, error } = await supabase
    .from("landlord_payouts")
    .insert([
      {
        landlord_id: landlordId,
        org_id: orgId,
        bank_account_id: bankAccountId,
        requested_amount: amount,
        processing_fee: processingFee,
        net_amount: amount - processingFee,
        status: "pending",
        requested_at: new Date().toISOString(),
      },
    ])
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create payout record:", error);
    return null;
  }

  return payout?.id;
}

/**
 * Process payout with bank/payment service
 * This is a stub for integration with actual payment service (e.g., bKash API)
 */
async function processPayout(
  payoutId: string,
  bankAccount: BankAccount,
  amount: number
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  try {
    // In production, this would call bKash/Nagad/bank API
    // For now, we'll simulate with a slight delay and mark as processing

    // Simulate API call
    const transactionId = `TXN-${Date.now()}`;

    // Mark as processing
    const { error } = await supabase
      .from("landlord_payouts")
      .update({
        status: "processing",
        processed_at: new Date().toISOString(),
        gateway_transaction_id: transactionId,
      })
      .eq("id", payoutId);

    if (error) {
      console.error("Failed to update payout status:", error);
      return {
        success: false,
        error: "Failed to initiate payout processing",
      };
    }

    console.log(
      `[Payout] Processing: ${payoutId} -> ${amount} BDT to ${bankAccount.account_type}`
    );

    return {
      success: true,
      transactionId,
    };
  } catch (error) {
    console.error("Payout processing error:", error);
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * Calculate estimated arrival date
 */
function getEstimatedArrival(daysToAdd: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);
  return date.toISOString().split("T")[0];
}

/**
 * Main handler
 */
Deno.serve(async (req: Request) => {
  // Only accept POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json()) as RequestPayoutInput;
    const { amount, bank_account_id } = body;

    // Validate input
    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({
          error: "Invalid amount",
          min_amount: MINIMUM_PAYOUT,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (amount < MINIMUM_PAYOUT) {
      return new Response(
        JSON.stringify({
          error: `Minimum payout amount is ${MINIMUM_PAYOUT} BDT`,
          min_amount: MINIMUM_PAYOUT,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get user's org (assume default org for now)
    const { data: membership } = await supabase
      .from("organisation_members")
      .select("org_id")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: "User not part of any organisation" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const orgId = membership.org_id;

    // Validate bank account ownership
    const bankAccount = await validateBankAccount(bank_account_id, user.id);
    if (!bankAccount) {
      return new Response(
        JSON.stringify({
          error: "Bank account not found or not owned by you",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!bankAccount.is_verified) {
      return new Response(
        JSON.stringify({
          error: "Bank account must be verified before requesting payout",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check pending balance
    const pendingBalance = await getLandlordPendingBalance(user.id, orgId);
    if (pendingBalance < amount) {
      return new Response(
        JSON.stringify({
          error: "Insufficient pending balance",
          pending_balance: pendingBalance,
          requested_amount: amount,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Calculate processing fee
    const processingFee = Math.round(amount * (PROCESSING_FEE_PCT / 100));

    console.log(
      `[PayoutRequest] User: ${user.id}, Amount: ${amount}, Fee: ${processingFee}, Balance: ${pendingBalance}`
    );

    // Create payout record
    const payoutId = await createPayoutRecord(
      user.id,
      orgId,
      bank_account_id,
      amount,
      processingFee
    );

    if (!payoutId) {
      return new Response(
        JSON.stringify({
          error: "Failed to create payout request",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Process payout
    const processResult = await processPayout(payoutId, bankAccount, amount);

    if (!processResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: processResult.error,
          payout_id: payoutId,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        payout_id: payoutId,
        amount: amount,
        processing_fee: processingFee,
        net_amount: amount - processingFee,
        status: "processing",
        estimated_arrival: getEstimatedArrival(ESTIMATED_DAYS),
        message: `Payout of ${amount} BDT initiated. Processing fee: ${processingFee} BDT. Net amount: ${amount - processingFee} BDT.`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Handler error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
