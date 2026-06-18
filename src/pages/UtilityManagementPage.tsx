/**
 * Utility Management Page - For Landlords
 * 
 * Upload bills, view meter readings, calculate splits, see invoice summary
 */

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertCircle, Loader, Upload, Calculator, FileText } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UtilityBill,
  UtilityBillType,
  UTILITY_BILL_TYPE_LABELS,
  UTILITY_PROVIDERS,
  UtilityBillInput,
} from "@/types/utilities";
import {
  createUtilityBill,
  fetchUtilityBills,
  fetchMeterReadingsForBill,
  calculateUtilityCharges,
  fetchChargesForBill,
  generateUtilityBreakdown,
} from "@/lib/utilities";

export default function UtilityManagementPage() {
  const { orgId, listingId } = useParams();
  const { currentOrg, user } = useAuth();

  // Form state
  const [billType, setBillType] = useState<UtilityBillType>("electricity");
  const [provider, setProvider] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [processingFee, setProcessingFee] = useState("0");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [billImage, setBillImage] = useState<File | null>(null);
  const [meterNumber, setMeterNumber] = useState("");

  // Data state
  const [bills, setBills] = useState<UtilityBill[]>([]);
  const [selectedBill, setSelectedBill] = useState<UtilityBill | null>(null);
  const [billReadings, setBillReadings] = useState<any[]>([]);
  const [billCharges, setBillCharges] = useState<any[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (orgId && listingId) {
      loadUtilityBills();
    }
  }, [orgId, listingId]);

  const loadUtilityBills = async () => {
    if (!orgId || !listingId) return;
    setLoading(true);

    const billsList = await fetchUtilityBills(orgId, listingId);
    setBills(billsList);

    if (billsList.length > 0) {
      const firstBill = billsList[0];
      setSelectedBill(firstBill);
      await loadBillDetails(firstBill.id);
    }

    setLoading(false);
  };

  const loadBillDetails = async (billId: string) => {
    const breakdown = await generateUtilityBreakdown(billId);
    if (breakdown.readings) setBillReadings(breakdown.readings);
    if (breakdown.charges) setBillCharges(breakdown.charges);
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !listingId) return;

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      if (!billAmount || !periodStart || !periodEnd) {
        setError("Please fill in all required fields");
        setLoading(false);
        return;
      }

      const input: UtilityBillInput = {
        listing_id: listingId,
        bill_type: billType,
        provider_name: provider,
        bill_amount: parseFloat(billAmount),
        processing_fee: parseFloat(processingFee) || 0,
        period_start: periodStart,
        period_end: periodEnd,
        meter_number: meterNumber || undefined,
      };

      const result = await createUtilityBill(orgId, input);
      if (result.success && result.bill) {
        setBills([result.bill, ...bills]);
        setSelectedBill(result.bill);
        setSuccessMessage("Bill created successfully!");

        // Reset form
        setBillAmount("");
        setProcessingFee("0");
        setPeriodStart("");
        setPeriodEnd("");
        setMeterNumber("");
        setBillImage(null);

        // Load details
        await loadBillDetails(result.bill.id);
      } else {
        setError(result.error || "Failed to create bill");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateCharges = async () => {
    if (!selectedBill) return;

    setCalculating(true);
    setError("");

    const result = await calculateUtilityCharges(selectedBill.id);
    if (result.success && result.charges) {
      setSuccessMessage("Charges calculated successfully!");
      setBillCharges(result.charges);
      setSelectedBill({ ...selectedBill, status: "calculated" });
    } else {
      setError(result.error || "Failed to calculate charges");
    }

    setCalculating(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Utility Management</h1>
          <p className="text-gray-600 mt-2">Upload bills, track readings, and auto-split charges</p>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </CardContent>
          </Card>
        )}

        {successMessage && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <p className="text-sm text-green-800">{successMessage}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Form */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex gap-2">
                <Upload className="w-5 h-5" />
                Upload Bill
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateBill} className="space-y-4">
                {/* Utility Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Utility Type
                  </label>
                  <Select value={billType} onValueChange={(v) => setBillType(v as UtilityBillType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(UTILITY_BILL_TYPE_LABELS) as UtilityBillType[]).map((type) => (
                        <SelectItem key={type} value={type}>
                          {UTILITY_BILL_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Provider */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provider
                  </label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {UTILITY_PROVIDERS.filter((p) => p.type === billType).map((p) => (
                        <SelectItem key={p.name} value={p.name}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Bill Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bill Amount (BDT)
                  </label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                  />
                </div>

                {/* Processing Fee */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Processing Fee (BDT)
                  </label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    value={processingFee}
                    onChange={(e) => setProcessingFee(e.target.value)}
                  />
                </div>

                {/* Period */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Period</label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                      placeholder="Start"
                    />
                    <Input
                      type="date"
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                      placeholder="End"
                    />
                  </div>
                </div>

                {/* Meter Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meter Number (Optional)
                  </label>
                  <Input
                    placeholder="e.g., 12345678"
                    value={meterNumber}
                    onChange={(e) => setMeterNumber(e.target.value)}
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Create Bill
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Bills List & Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bills List */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Bills</CardTitle>
              </CardHeader>
              <CardContent>
                {bills.length === 0 ? (
                  <p className="text-sm text-gray-500">No bills uploaded yet</p>
                ) : (
                  <div className="space-y-2">
                    {bills.map((bill) => (
                      <button
                        key={bill.id}
                        onClick={() => {
                          setSelectedBill(bill);
                          loadBillDetails(bill.id);
                        }}
                        className={`w-full p-3 border rounded-lg text-left ${
                          selectedBill?.id === bill.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">
                              {UTILITY_BILL_TYPE_LABELS[bill.bill_type]} - {bill.provider_name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {bill.period_start} to {bill.period_end}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">৳{bill.total_amount.toFixed(2)}</p>
                            <span className="text-xs bg-gray-200 px-2 py-1 rounded capitalize">
                              {bill.status}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Selected Bill Details */}
            {selectedBill && (
              <>
                {/* Meter Readings */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Meter Readings</CardTitle>
                      <CardDescription>{billReadings.length} readings submitted</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {billReadings.length === 0 ? (
                      <p className="text-sm text-gray-500">No readings submitted yet</p>
                    ) : (
                      <div className="space-y-2">
                        {billReadings.map((reading) => (
                          <div
                            key={reading.id}
                            className="flex justify-between items-center p-2 border-b"
                          >
                            <div>
                              <p className="font-medium text-sm">Tenant ID: {reading.tenant_id}</p>
                              <p className="text-xs text-gray-600">
                                {reading.meter_reading} {reading.reading_unit}
                              </p>
                            </div>
                            <p className="text-sm text-gray-600">
                              Submitted: {new Date(reading.submitted_at).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Calculate Button */}
                {selectedBill.status === "pending" && (
                  <Button
                    onClick={handleCalculateCharges}
                    disabled={calculating || billReadings.length === 0}
                    className="w-full gap-2"
                  >
                    {calculating ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Calculating...
                      </>
                    ) : (
                      <>
                        <Calculator className="w-4 h-4" />
                        Calculate Charges
                      </>
                    )}
                  </Button>
                )}

                {/* Charges Summary */}
                {billCharges.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex gap-2">
                        <FileText className="w-5 h-5" />
                        Charges Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {billCharges.map((charge) => (
                          <div
                            key={charge.id}
                            className="flex justify-between items-center p-2 border-b"
                          >
                            <div>
                              <p className="font-medium text-sm">
                                {charge.full_name || "Unknown Tenant"}
                              </p>
                              <p className="text-xs text-gray-600">
                                {charge.usage_share_percent.toFixed(2)}% usage
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">৳{charge.total_charge.toFixed(2)}</p>
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded capitalize">
                                {charge.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Total */}
                      <div className="border-t mt-4 pt-4 flex justify-between font-bold">
                        <span>Total</span>
                        <span>
                          ৳
                          {billCharges
                            .reduce((sum, c) => sum + c.total_charge, 0)
                            .toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
