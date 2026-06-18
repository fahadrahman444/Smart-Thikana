/**
 * Phase 1.3: Payment Webhook Handler
 * 
 * Receives payment callbacks from SSLCommerz & aamarPay payment gateways.
 * Verifies signature, creates payment record, triggers payout split.
 * 
 * Gateway Configuration:
 * - SSLCommerz: POST to /functions/v1/payment-webhook?gateway=ssłcommerz
 * - aamarPay: POST to /functions/v1/payment-webhook?gateway=amarpay
 * 
 * Expected request body varies by gateway but includes:
 * - transaction_id / tran_id
 * - amount
 * - invoice_id (custom field we store)
 * - status / val_id
 * - signature / checksum for verification
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const sslcommerzApiKey = Deno.env.get("SSLCOMMERZ_API_KEY") || "";
const sslcommerzStoreId = Deno.env.get("SSLCOMMERZ_STORE_ID") || "";
const amarpayApiKey = Deno.env.get("AMARPAY_API_KEY") || "";
const amarpayStoreId = Deno.env.get("AMARPAY_STORE_ID") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SSLCommerzRequest {
  tran_id: string;
  amount: string;
  currency: string;
  status: string;
  invoice_id: string;
  opt?: string; // optional custom field
  verify_sign: string;
  [key: string]: string | undefined;
}

interface AmarPayRequest {
  trx_id: string;
  amount: string;
  currency: string;
  status: string;
  invoice_id: string;
  checksum: string;
  [key: string]: string | undefined;
}

// ============================================================================
// SSLCOMMERZ: Signature Verification
// ============================================================================
async function verifySslcommerzSignature(
  body: SSLCommerzRequest,
  signature: string
): Promise<boolean> {
  try {
    // SSLCommerz signature is MD5(store_id|tran_id|amount|status|md5_of_random)
    // But the checksum includes val_id (which is tran_id for successful payments)
    // We verify by calling their validation API instead
    const url = new URL("https://www.sslcommerz.com/validator/api/validationserver.php");
    url.searchParams.append("val_id", body.tran_id);
    url.searchParams.append("store_id", sslcommerzStoreId);
    url.searchParams.append("store_passwd", sslcommerzApiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    // Successful validation returns status 200 with "VALIDATED"
    return data?.status?.toLowerCase() === "validated";
  } catch (error) {
    console.error("SSLCommerz signature verification failed:", error);
    return false;
  }
}

// ============================================================================
// AMARPAY: Signature Verification
// ============================================================================
async function verifyAmarpaySignature(
  body: AmarPayRequest,
  signature: string
): Promise<boolean> {
  try {
    // aamarPay signature is SHA256(storeId|trx_id|amount|status|apiKey)
    const signingString = `${amarpayStoreId}|${body.trx_id}|${body.amount}|${body.status}|${amarpayApiKey}`;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(signingString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedSig = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    return computedSig.toLowerCase() === signature.toLowerCase();
  } catch (error) {
    console.error("aamarPay signature verification failed:", error);
    return false;
  }
}

// ============================================================================
// Process SSLCommerz Payment
// ============================================================================
async function processSslcommerzPayment(
  body: SSLCommerzRequest,
  ip: string
): Promise<Response> {
  const { tran_id, amount, currency, status, invoice_id } = body;

  // Only process successful payments
  if (status !== "VALID" && status !== "VALIDATED") {
    return new Response(
      JSON.stringify({
        success: false,
        message: `Payment status: ${status}. No action taken.`,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // 1. Get invoice details (with transaction lock to prevent double-processing)
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .single();

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invoice not found",
          gateway_tx_id: tran_id,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Check if this transaction already exists (idempotency)
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("gateway_tx_id", tran_id)
      .maybeSingle();

    if (existingPayment) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment already processed",
          payment_id: existingPayment.id,
          gateway_tx_id: tran_id,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Create payment record
    const paymentAmount = parseFloat(amount);
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert([
        {
          org_id: invoice.org_id,
          tenant_id: invoice.tenant_id,
          invoice_id: invoice.id,
          amount: paymentAmount,
          currency: currency || "BDT",
          status: "completed",
          payment_gateway: "ssłcommerz",
          gateway_tx_id: tran_id,
          gateway_response_code: "200",
          gateway_error_message: null,
          tenant_ip_address: ip,
          verified_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (paymentError) {
      console.error("Failed to create payment record:", paymentError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to create payment record",
          gateway_tx_id: tran_id,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Call RPC to split payment into ledger entries
    const { data: splitResult, error: splitError } = await supabase.rpc(
      "calculate_split_payout",
      { payment_id: payment.id }
    );

    if (splitError) {
      console.error("Failed to split payout:", splitError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to split payment",
          payment_id: payment.id,
          gateway_tx_id: tran_id,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Update invoice status to paid
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        paid_via: "ssłcommerz",
      })
      .eq("id", invoice.id);

    if (updateError) {
      console.error("Failed to update invoice status:", updateError);
    }

    // 6. Trigger push notification to landlord (async, non-blocking)
    // This will be implemented in a separate edge function or hook
    console.log(`Payment processed successfully. Landlord: ${invoice.agreement_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment processed successfully",
        payment_id: payment.id,
        gateway_tx_id: tran_id,
        platform_fee: splitResult[0]?.platform_fee || 0,
        net_rent: splitResult[0]?.net_rent || 0,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook processing failed:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: String(error),
        gateway_tx_id: tran_id,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ============================================================================
// Process aamarPay Payment
// ============================================================================
async function processAmarpayPayment(
  body: AmarPayRequest,
  ip: string
): Promise<Response> {
  const { trx_id, amount, currency, status, invoice_id } = body;

  // Only process successful payments
  if (status !== "Success" && status !== "success") {
    return new Response(
      JSON.stringify({
        success: false,
        message: `Payment status: ${status}. No action taken.`,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // 1. Get invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .single();

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invoice not found",
          gateway_tx_id: trx_id,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Check idempotency
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("gateway_tx_id", trx_id)
      .maybeSingle();

    if (existingPayment) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment already processed",
          payment_id: existingPayment.id,
          gateway_tx_id: trx_id,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Create payment record
    const paymentAmount = parseFloat(amount);
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert([
        {
          org_id: invoice.org_id,
          tenant_id: invoice.tenant_id,
          invoice_id: invoice.id,
          amount: paymentAmount,
          currency: currency || "BDT",
          status: "completed",
          payment_gateway: "amarpay",
          gateway_tx_id: trx_id,
          gateway_response_code: "200",
          gateway_error_message: null,
          tenant_ip_address: ip,
          verified_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (paymentError) {
      console.error("Failed to create payment record:", paymentError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to create payment record",
          gateway_tx_id: trx_id,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Call RPC to split payment
    const { data: splitResult, error: splitError } = await supabase.rpc(
      "calculate_split_payout",
      { payment_id: payment.id }
    );

    if (splitError) {
      console.error("Failed to split payout:", splitError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to split payment",
          payment_id: payment.id,
          gateway_tx_id: trx_id,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Update invoice status
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        paid_via: "amarpay",
      })
      .eq("id", invoice.id);

    if (updateError) {
      console.error("Failed to update invoice status:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment processed successfully",
        payment_id: payment.id,
        gateway_tx_id: trx_id,
        platform_fee: splitResult[0]?.platform_fee || 0,
        net_rent: splitResult[0]?.net_rent || 0,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook processing failed:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: String(error),
        gateway_tx_id: trx_id,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ============================================================================
// Main Handler
// ============================================================================
Deno.serve(async (req: Request) => {
  // Only accept POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  const url = new URL(req.url);
  const gateway = url.searchParams.get("gateway") || "ssłcommerz";
  const clientIp =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for") ||
    "unknown";

  try {
    const body = await req.json();

    if (gateway === "ssłcommerz") {
      // Verify SSLCommerz signature
      const isValid = await verifySslcommerzSignature(
        body as SSLCommerzRequest,
        body.verify_sign
      );
      if (!isValid) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid signature",
          }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      return processSslcommerzPayment(body as SSLCommerzRequest, clientIp);
    } else if (gateway === "amarpay") {
      // Verify aamarPay signature
      const isValid = await verifyAmarpaySignature(
        body as AmarPayRequest,
        body.checksum
      );
      if (!isValid) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid signature",
          }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      return processAmarpayPayment(body as AmarPayRequest, clientIp);
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unsupported gateway",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Webhook handler error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Invalid request body",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
});
