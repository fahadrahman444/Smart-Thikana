/**
 * My Utility Charges Page - For Tenants
 * 
 * View all utility charges, see breakdowns, and usage percentages
 */

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader, AlertCircle, TrendingUp } from "lucide-react";
import { TenantUtilityCharge, UTILITY_BILL_TYPE_LABELS } from "@/types/utilities";
import { fetchTenantUtilityCharges } from "@/lib/utilities";

export default function MyUtilityChargesPage() {
  const { user, loading: authLoading } = useAuth();
  const [charges, setCharges] = useState<TenantUtilityCharge[]>([]);
  const [loading, setLoading] = useState(false);
  const [groupedCharges, setGroupedCharges] = useState<
    Record<string, TenantUtilityCharge[]>
  >({});

  useEffect(() => {
    if (user) {
      loadCharges();
    }
  }, [user]);

  const loadCharges = async () => {
    if (!user) return;
    setLoading(true);

    const charges = await fetchTenantUtilityCharges(user.id);
    setCharges(charges);

    // Group by bill type
    const grouped: Record<string, TenantUtilityCharge[]> = {};
    charges.forEach((charge) => {
      if (!grouped[charge.bill_type]) {
        grouped[charge.bill_type] = [];
      }
      grouped[charge.bill_type].push(charge);
    });

    setGroupedCharges(grouped);
    setLoading(false);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-700 mb-4">Please sign in to view your utility charges</p>
          <a href="/auth" className="text-blue-600 hover:text-blue-700 font-medium">
            Sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Utility Charges</h1>
          <p className="text-gray-600 mt-2">View and manage your utility bill shares</p>
        </div>

        {/* Total Summary */}
        {charges.length > 0 && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Charges</p>
                  <p className="text-3xl font-bold text-blue-600">
                    ৳{charges.reduce((sum, c) => sum + c.total_charge, 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {charges.filter((c) => c.status === "pending").length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Paid</p>
                  <p className="text-2xl font-bold text-green-600">
                    {charges.filter((c) => c.status === "paid").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Charges */}
        {charges.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No utility charges yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Charges will appear once your landlord uploads utility bills and calculates splits
              </p>
            </CardContent>
          </Card>
        )}

        {/* Grouped by Utility Type */}
        {Object.entries(groupedCharges).map(([billType, billCharges]) => (
          <Card key={billType}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <CardTitle>{UTILITY_BILL_TYPE_LABELS[billType as any]}</CardTitle>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">
                    ৳{billCharges.reduce((sum, c) => sum + c.total_charge, 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">{billCharges.length} bills</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {billCharges.map((charge) => (
                  <div
                    key={charge.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          Bill #{charge.utility_bill_id.substring(0, 8)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Submitted {new Date(charge.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">৳{charge.total_charge.toFixed(2)}</p>
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded ${
                            charge.status === "paid"
                              ? "bg-green-100 text-green-800"
                              : charge.status === "invoiced"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {charge.status.charAt(0).toUpperCase() + charge.status.slice(1)}
                        </span>
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="bg-gray-50 rounded p-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Your usage share:</span>
                        <span className="font-semibold">{charge.usage_share_percent.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bill amount share:</span>
                        <span>৳{charge.calculated_amount.toFixed(2)}</span>
                      </div>
                      {charge.processing_fee_share > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Processing fee share:</span>
                          <span>৳{charge.processing_fee_share.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t pt-2 flex justify-between font-bold">
                        <span>Total:</span>
                        <span>৳{charge.total_charge.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Help Section */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base">How Utility Charges Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            <p>
              ✅ Your landlord uploads the building's utility bill and the total meter reading
            </p>
            <p>
              ✅ You and other tenants submit your individual sub-meter readings
            </p>
            <p>
              ✅ The system automatically calculates your usage percentage and your share
            </p>
            <p>
              ✅ Your utility charge is added to your monthly rent invoice
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
