/**
 * Edge Function: Create a mock subscription checkout session.
 * 
 * In production, this would integrate with Stripe. For now, we mock it
 * to generate a fake subscription ID and update the organisation tier.
 * 
 * Usage:
 *   POST https://your-project.supabase.co/functions/v1/subscription-checkout
 *   {
 *     "org_id": "550e8400-e29b-41d4-a716-446655440000",
 *     "tier": "pro"
 *   }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

interface CheckoutRequest {
  org_id: string;
  tier: "free" | "pro" | "enterprise";
}

interface CheckoutResponse {
  success: boolean;
  message: string;
  checkout_url?: string; // In production, this would be Stripe's URL
  mock_subscription_id?: string; // For testing only
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("OK", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    // Only allow POST
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const body: CheckoutRequest = await req.json();
    const { org_id, tier } = body;

    if (!org_id || !tier || !["free", "pro", "enterprise"].includes(tier)) {
      return new Response(
        JSON.stringify({
          error: "Missing or invalid org_id or tier",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client (uses service role key from env)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Verify the organisation exists and user owns it
    const { data: org, error: orgError } = await supabase
      .from("organisations")
      .select("*")
      .eq("id", org_id)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: "Organisation not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get auth header to verify the user owns this org
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Extract JWT and verify (in production, validate the JWT signature)
    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabase.auth.getUser(
      token
    );

    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if user owns the org
    if (org.owner_id !== authData.user.id) {
      return new Response(
        JSON.stringify({ error: "You don't own this organisation" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // For free tier, no payment needed; upgrade immediately
    if (tier === "free") {
      const { error: updateError } = await supabase
        .from("organisations")
        .update({ tier: "free" })
        .eq("id", org_id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Failed to update organisation" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      const response: CheckoutResponse = {
        success: true,
        message: "Upgraded to free tier",
      };
      return new Response(JSON.stringify(response), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // For paid tiers, generate a mock subscription ID
    // In production, you'd create a real Stripe subscription here
    const mockSubscriptionId = `mock_sub_${crypto.randomUUID()}`;

    // Update the organisation with the mock subscription
    const { error: updateError } = await supabase
      .from("organisations")
      .update({
        tier,
        stripe_subscription_id: mockSubscriptionId,
      })
      .eq("id", org_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to update organisation" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Log the subscription for audit trail (optional)
    console.log(`[subscription] org_id=${org_id}, tier=${tier}, mock_id=${mockSubscriptionId}`);

    const response: CheckoutResponse = {
      success: true,
      message: `Upgraded to ${tier} tier (mocked)`,
      checkout_url: `https://example.com/mock-checkout?sub=${mockSubscriptionId}`,
      mock_subscription_id: mockSubscriptionId,
    };

    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(
      JSON.stringify({
        error: `Internal server error: ${(error as Error).message}`,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
