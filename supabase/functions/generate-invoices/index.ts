/**
 * Phase 1.3: Generate Monthly Invoices
 * 
 * Admin-triggered edge function that calls the RPC function to generate
 * invoices for all active agreements in a given month.
 * 
 * Can be called:
 * - Manually via admin dashboard
 * - Via cron job (e.g., 1st of month at 00:00 UTC)
 * 
 * Request:
 * POST /functions/v1/generate-invoices
 * {
 *   "target_month": "2025-06-01", // Optional, defaults to current month
 *   "org_id": "uuid" // Optional, filter by org (admin only can omit)
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "invoices_created": 42,
 *   "errors": ["Agreement uuid: error message"]
 * }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface GenerateInvoicesRequest {
  target_month?: string; // ISO date format: YYYY-MM-DD
  org_id?: string; // Optional, admin can filter
}

interface InvoiceGenerationResult {
  invoices_created: number;
  errors: string[];
}

/**
 * Validates that the user is an admin/staff member who can trigger invoice generation
 */
async function validateAdminAccess(userId: string): Promise<boolean> {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", userId)
      .single();

    if (error || !profile) return false;

    // Check if user has admin role in any org
    const { data: membership } = await supabase
      .from("organisation_members")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["owner", "admin"])
      .maybeSingle();

    return !!membership;
  } catch (error) {
    console.error("Admin validation error:", error);
    return false;
  }
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
    const body = (await req.json()) as GenerateInvoicesRequest;
    const authHeader = req.headers.get("authorization");

    // Get current user from token
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.substring(7);
    const { data: userData, error: userError } = await supabase.auth.getUser(
      token
    );

    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate that user is admin
    const isAdmin = await validateAdminAccess(userData.user.id);
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Determine target month
    let targetMonth = body.target_month || new Date().toISOString().split("T")[0];
    
    // Validate date format
    if (!targetMonth.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return new Response(
        JSON.stringify({
          error: "Invalid date format. Use YYYY-MM-DD",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(
      `[InvoiceGeneration] Starting for month: ${targetMonth}, User: ${userData.user.id}`
    );

    // Call RPC function to generate invoices
    const { data: result, error: rpcError } = await supabase.rpc(
      "generate_monthly_invoices",
      { target_month: targetMonth }
    );

    if (rpcError) {
      console.error("RPC error:", rpcError);
      return new Response(
        JSON.stringify({
          success: false,
          error: rpcError.message || "Failed to generate invoices",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // RPC returns TABLE(invoices_created INT, errors TEXT[])
    // We get the first row
    const invoiceResult = result[0] as InvoiceGenerationResult;

    console.log(
      `[InvoiceGeneration] Complete: ${invoiceResult.invoices_created} invoices created, ${invoiceResult.errors.length} errors`
    );

    if (invoiceResult.errors.length > 0) {
      console.warn("Invoice generation errors:", invoiceResult.errors);
    }

    return new Response(
      JSON.stringify({
        success: true,
        invoices_created: invoiceResult.invoices_created,
        errors: invoiceResult.errors,
        message:
          invoiceResult.errors.length === 0
            ? `Successfully generated ${invoiceResult.invoices_created} invoices`
            : `Generated ${invoiceResult.invoices_created} invoices with ${invoiceResult.errors.length} errors`,
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
