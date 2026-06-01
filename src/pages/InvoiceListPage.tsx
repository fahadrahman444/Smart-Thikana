/**
 * Tenant invoice list and detail pages
 */

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ChevronRight,
  Download,
  Eye,
  Loader2,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchTenantInvoices,
  fetchInvoiceById,
  getFinancialSummary,
} from "@/lib/payments";
import {
  Invoice,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  formatCurrency,
  isInvoiceOverdue,
  calculateDaysUntilDue,
} from "@/types/payments";

/**
 * Invoice list page for tenants
 */
export function InvoiceListPage() {
  const { currentOrg } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setLoading(true);
        const data = await fetchTenantInvoices();
        setInvoices(data);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, []);

  const filteredInvoices = invoices.filter(
    (inv) => statusFilter === "all" || inv.status === statusFilter
  );

  const totalDue = filteredInvoices
    .filter((inv) => inv.status !== "paid" && inv.status !== "cancelled")
    .reduce((sum, inv) => sum + inv.net_due, 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Invoices</h1>
          <p className="text-gray-600 mt-2">View and pay your rent invoices</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-600 uppercase">Total Outstanding</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalDue)}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-600 uppercase">Total Invoices</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{invoices.length}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-600 uppercase">Paid</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {invoices.filter((i) => i.status === "paid").length}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-600 uppercase">Overdue</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">
              {invoices.filter((i) => isInvoiceOverdue(i)).length}
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {["all", "unpaid", "paid", "overdue"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                  statusFilter === status
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Invoice list */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <Loader2 className="animate-spin mx-auto mb-2" size={32} />
              Loading invoices...
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              <AlertCircle size={48} className="mx-auto mb-4 opacity-30" />
              <p>No invoices found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                    Amount Due
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => {
                  const overdue = isInvoiceOverdue(invoice);
                  const daysUntilDue = calculateDaysUntilDue(invoice);

                  return (
                    <tr
                      key={invoice.id}
                      className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                        overdue && invoice.status !== "paid" ? "bg-red-50" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {new Date(invoice.period_start).toLocaleDateString("en-US", {
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            -{" "}
                            {new Date(invoice.period_end).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          <p className="text-sm text-gray-500">
                            Issued {new Date(invoice.issued_at).toLocaleDateString()}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(invoice.net_due)}
                        </p>
                        {invoice.utility_total > 0 && (
                          <p className="text-xs text-gray-500">
                            + {formatCurrency(invoice.utility_total)} utilities
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            INVOICE_STATUS_COLORS[invoice.status]
                          }`}
                        >
                          {INVOICE_STATUS_LABELS[invoice.status]}
                          {overdue && <span className="ml-1">!</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm text-gray-900">
                            {new Date(invoice.due_date).toLocaleDateString()}
                          </p>
                          {invoice.status !== "paid" && (
                            <p
                              className={`text-xs ${
                                daysUntilDue < 0 ? "text-red-600" : "text-gray-500"
                              }`}
                            >
                              {daysUntilDue < 0
                                ? `${Math.abs(daysUntilDue)} days overdue`
                                : `${daysUntilDue} days left`}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => navigate(`/invoices/${invoice.id}`)}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 text-sm font-medium transition-colors"
                        >
                          <Eye size={16} />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Invoice detail page with payment option
 */
export function InvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInvoice = async () => {
      if (!invoiceId) return;

      try {
        setLoading(true);
        const data = await fetchInvoiceById(invoiceId);
        if (!data) {
          setError("Invoice not found");
          return;
        }
        setInvoice(data);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };

    loadInvoice();
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center text-gray-600">
        <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
        <p>{error || "Invoice not found"}</p>
      </div>
    );
  }

  const overdue = isInvoiceOverdue(invoice);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Back button */}
        <button
          onClick={() => navigate("/invoices")}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft size={18} />
          Back to invoices
        </button>

        {/* Invoice card */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-200">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Invoice</h1>
              <p className="text-gray-600 text-lg">
                {new Date(invoice.period_start).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="text-right">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  INVOICE_STATUS_COLORS[invoice.status]
                }`}
              >
                {INVOICE_STATUS_LABELS[invoice.status]}
              </span>
              {overdue && invoice.status !== "paid" && (
                <p className="text-red-600 font-semibold mt-2">OVERDUE</p>
              )}
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Left column */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Invoice Details</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600">Invoice Date</p>
                  <p className="font-medium text-gray-900">
                    {new Date(invoice.issued_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Due Date</p>
                  <p className="font-medium text-gray-900">
                    {new Date(invoice.due_date).toLocaleDateString()}
                  </p>
                </div>
                {invoice.paid_at && (
                  <div>
                    <p className="text-gray-600">Paid On</p>
                    <p className="font-medium text-gray-900">
                      {new Date(invoice.paid_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Period</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600">From</p>
                  <p className="font-medium text-gray-900">
                    {new Date(invoice.period_start).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">To</p>
                  <p className="font-medium text-gray-900">
                    {new Date(invoice.period_end).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Itemization */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Charges</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-700">Base Rent</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(invoice.base_rent)}
                </span>
              </div>
              {invoice.utility_total > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-700">Utilities</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(invoice.utility_total)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-700">Platform Fee ({invoice.platform_fee_pct}%)</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(invoice.platform_fee)}
                </span>
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="mb-8">
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
              <span className="text-lg font-semibold text-gray-900">Total Due</span>
              <span className="text-3xl font-bold text-gray-900">
                {formatCurrency(invoice.net_due)}
              </span>
            </div>
          </div>

          {/* Actions */}
          {invoice.status !== "paid" && (
            <div className="flex gap-3">
              <button
                onClick={() => navigate(`/invoices/${invoice.id}/pay`)}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Pay Now
              </button>
              <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
                <Download size={18} />
                Download PDF
              </button>
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Secure Payment:</strong> All payments are processed securely through
            SSL Commerz. Your financial information is encrypted and protected.
          </p>
        </div>
      </div>
    </div>
  );
}
