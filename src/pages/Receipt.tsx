import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Building2, Download, Loader2, Receipt as ReceiptIcon, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { fmtBDT } from "@/lib/listings";
import { calculateTaxAutoCut, TaxBreakdown } from "@/lib/tax-engine";

export default function Receipt() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [taxDetails, setTaxDetails] = useState<TaxBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReceiptData() {
      try {
        if (!id) return;
        setLoading(true);

        const { data: p, error: pError } = await supabase
          .from("payments")
          .select("*, listings(title, location, property_type)")
          .eq("id", id)
          .maybeSingle();

        if (pError || !p) {
          setError("Payment record not found");
          return;
        }

        setData(p);
        
        const isComm = p.listings?.property_type === 'commercial';
        // We calculate tax here to show the breakdown on the receipt
        const breakdown = calculateTaxAutoCut(Number(p.amount), isComm, false);
        setTaxDetails(breakdown);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchReceiptData();
  }, [id]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-primary" /></div>;
  if (error || !data || !taxDetails) return <div className="p-8 text-center text-red-500">{error || "Data load failed"}</div>;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto mb-6 no-print">
        <Button variant="ghost" size="sm" asChild className="text-slate-500 hover:text-slate-800">
          <Link to="/LandlordDashboard"><ArrowLeft className="h-4 w-4 mr-2" /> Dashboard</Link>
        </Button>
      </div>

      <Card className="max-w-2xl mx-auto bg-white shadow-xl border-t-8 border-t-primary overflow-hidden print:shadow-none print:border-t-0">
        <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-display font-bold text-slate-900 uppercase tracking-tight">Basha Vhara Koto</h1>
            </div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-widest text-wrap">Digital Rent Receipt Section 38 Compliant</p>
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1 font-semibold">Payment Successful</Badge>
        </div>

        <div className="p-8 text-center border-b border-slate-50">
          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Paid by Tenant</p>
          <h2 className="text-4xl font-display font-black text-slate-900 mb-2">{fmtBDT(data.amount)}</h2>
          <p className="text-xs font-mono text-slate-400">TRANS-ID: RCPT-{data.id.substring(0, 10).toUpperCase()}</p>
        </div>

        <div className="p-8">
          <h3 className="font-display font-semibold flex items-center gap-2 mb-6 text-slate-800">
            <ReceiptIcon className="h-4 w-4 text-primary" /> Settlement Details
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Gross Monthly Rent</span>
              <span className="font-medium text-slate-900">{fmtBDT(taxDetails.gross_rent)}</span>
            </div>
            
            {/* Show TDS only if it is actually greater than 0 */}
            {taxDetails.tds_amount > 0 && (
              <div className="flex justify-between text-sm items-center">
                <div className="flex flex-col">
                  <span className="text-slate-600">Income Tax Withheld (TDS)</span>
                  <span className="text-[10px] text-slate-400">Organization compliance deduction</span>
                </div>
                <span className="font-medium">{fmtBDT(taxDetails.tds_amount)}</span>
              </div>
            )}

            {/* FIXED: This block now shows the Advance Tax which was causing the 0 display */}
            {taxDetails.advance_tax_this_month > 0 && (
              <div className="flex justify-between text-sm items-center">
                <div className="flex flex-col">
                  <span className="text-red-600 font-semibold">Advance Income Tax (AIT)</span>
                  <span className="text-[10px] text-slate-400">Section 38 / Non-Zero Tax Rule</span>
                </div>
                <span className="text-red-600 font-semibold">− {fmtBDT(taxDetails.advance_tax_this_month)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm items-center">
               <div className="flex flex-col">
                  <span className="text-slate-600">Platform Service Fee (1%)</span>
                  <span className="text-[10px] text-slate-400">Maintenance & Processing</span>
                </div>
              <span className="text-slate-500 font-medium">− {fmtBDT(taxDetails.platform_fee)}</span>
            </div>

            <div className="pt-6 mt-2 border-t border-slate-200 flex justify-between items-end">
              <div>
                <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Net to Landlord</p>
                <p className="text-sm text-slate-500">Settled to digital wallet</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-green-700">{fmtBDT(taxDetails.net_to_landlord)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50/50 space-y-4 text-sm border-t border-slate-100">
          <div className="flex justify-between gap-4">
            <span className="text-slate-500 shrink-0">Property</span>
            <span className="font-medium text-slate-900 text-right">{data.listings?.title}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-500 shrink-0">Location</span>
            <span className="font-medium text-slate-900 text-right">{data.listings?.location}</span>
          </div>
        </div>

        <div className="p-8 flex gap-4 no-print">
          <Button className="flex-1 shadow-md h-11" onClick={() => window.print()}>
            <Download className="h-4 w-4 mr-2" /> Download Receipt
          </Button>
          <Button variant="outline" className="flex-1 h-11" asChild>
            <Link to="/LandlordDashboard">Done</Link>
          </Button>
        </div>

        <div className="p-4 bg-slate-900 text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold">This is a computer generated document. No signature required.</p>
        </div>
      </Card>
    </div>
  );
}