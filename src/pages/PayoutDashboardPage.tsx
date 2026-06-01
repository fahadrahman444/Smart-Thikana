/**
 * Landlord payout management pages
 * - Payout dashboard with pending balance
 * - Bank account management
 * - Payout request/history
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Plus,
  Trash2,
  Loader2,
  ArrowRight,
  CreditCard,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchBankAccounts,
  getLandlordPendingBalance,
  fetchPayouts,
  addBankAccount,
  deleteBankAccount,
  requestPayout,
} from "@/lib/payments";
import {
  LandlordBankAccount,
  LandlordPayout,
  PAYOUT_STATUS_LABELS,
  PAYOUT_STATUS_COLORS,
  BANK_ACCOUNT_TYPE_LABELS,
  formatCurrency,
  RequestPayoutInput,
} from "@/types/payments";

/**
 * Payout dashboard for landlords
 */
export function PayoutDashboardPage() {
  const { currentOrg } = useAuth();
  const [pendingBalance, setPendingBalance] = useState(0);
  const [payouts, setPayouts] = useState<LandlordPayout[]>([]);
  const [bankAccounts, setBankAccounts] = useState<LandlordBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPayoutForm, setShowPayoutForm] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!currentOrg) return;

      try {
        setLoading(true);
        const { balance } = await getLandlordPendingBalance(currentOrg.id);
        const payoutData = await fetchPayouts(currentOrg.id);
        const accountData = await fetchBankAccounts(currentOrg.id);

        setPendingBalance(balance);
        setPayouts(payoutData);
        setBankAccounts(accountData);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentOrg]);

  if (!currentOrg) {
    return (
      <div className="p-8 text-center text-gray-600">
        <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
        <p>No organization selected</p>
      </div>
    );
  }

  const totalPaidLifetime = payouts
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);

  const processingPayouts = payouts
    .filter((p) => p.status === "processing")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payout Management</h1>
          <p className="text-gray-600 mt-2">Manage your withdrawals and bank accounts</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Summary cards */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-600 uppercase">
                  Pending Balance
                </h3>
                <TrendingUp className="text-blue-600" size={20} />
              </div>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(pendingBalance)}</p>
              <p className="text-xs text-gray-500 mt-2">Available to withdraw</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-600 uppercase">
                  Processing
                </h3>
                <Loader2 className="text-yellow-600 animate-spin" size={20} />
              </div>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(processingPayouts)}</p>
              <p className="text-xs text-gray-500 mt-2">In transit to bank</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-600 uppercase">
                  Total Paid
                </h3>
                <CreditCard className="text-green-600" size={20} />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(totalPaidLifetime)}
              </p>
              <p className="text-xs text-gray-500 mt-2">Lifetime earnings</p>
            </div>
          </div>
        )}

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Request payout */}
          <div className="lg:col-span-2 space-y-6">
            {/* Request payout section */}
            <PayoutRequestSection
              pendingBalance={pendingBalance}
              bankAccounts={bankAccounts}
              onPayoutCreated={() => {
                // Reload data
                getLandlordPendingBalance(currentOrg.id).then(({ balance }) =>
                  setPendingBalance(balance)
                );
                fetchPayouts(currentOrg.id).then(setPayouts);
              }}
              currentOrgId={currentOrg.id}
            />

            {/* Payout history */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-semibold text-gray-900">Payout History</h3>
              </div>

              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  <Loader2 className="animate-spin mx-auto mb-2" size={32} />
                </div>
              ) : payouts.length === 0 ? (
                <div className="p-8 text-center text-gray-600">
                  <AlertCircle size={48} className="mx-auto mb-4 opacity-30" />
                  <p>No payouts yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                          Requested
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                          Paid
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.map((payout) => (
                        <tr key={payout.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-6 py-4 font-semibold text-gray-900">
                            {formatCurrency(payout.amount)}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                PAYOUT_STATUS_COLORS[payout.status]
                              }`}
                            >
                              {PAYOUT_STATUS_LABELS[payout.status]}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(payout.requested_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {payout.paid_at
                              ? new Date(payout.paid_at).toLocaleDateString()
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right: Bank accounts */}
          <div>
            <BankAccountManagement
              orgId={currentOrg.id}
              accounts={bankAccounts}
              onAccountsChange={async () => {
                const updated = await fetchBankAccounts(currentOrg.id);
                setBankAccounts(updated);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Payout request form
 */
function PayoutRequestSection({
  pendingBalance,
  bankAccounts,
  onPayoutCreated,
  currentOrgId,
}: {
  pendingBalance: number;
  bankAccounts: LandlordBankAccount[];
  onPayoutCreated: () => void;
  currentOrgId: string;
}) {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const primaryAccount = bankAccounts.find((a) => a.is_primary);
  const minAmount = 5;
  const maxAmount = Math.floor(pendingBalance);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const amountNum = parseFloat(amount);

    if (!selectedAccount) {
      setError("Please select a bank account");
      return;
    }

    if (amountNum < minAmount) {
      setError(`Minimum payout amount is ${formatCurrency(minAmount)}`);
      return;
    }

    if (amountNum > maxAmount) {
      setError("Amount exceeds pending balance");
      return;
    }

    setLoading(true);

    const input: RequestPayoutInput = {
      amount: amountNum,
      bank_account_id: selectedAccount,
      notes: `Manual payout request from ${user?.email}`,
    };

    const { success: requestSuccess, payout_id, error_msg } = await requestPayout(
      currentOrgId,
      input
    );

    if (!requestSuccess) {
      setError(error_msg || "Failed to request payout");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setAmount("");
    setSelectedAccount("");
    onPayoutCreated();

    setTimeout(() => {
      setSuccess(false);
    }, 3000);

    setLoading(false);
  };

  if (bankAccounts.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <AlertCircle className="text-yellow-600 mb-2" size={24} />
        <h3 className="font-semibold text-gray-900 mb-2">Add a Bank Account First</h3>
        <p className="text-sm text-gray-600 mb-4">
          You need to add a bank account before you can request a payout.
        </p>
        <Link
          to="#bank-accounts"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          Add Bank Account
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Request a Payout</h3>

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">✓ Payout request created successfully!</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Amount (BDT)</label>
          <input
            type="number"
            min={minAmount}
            max={maxAmount}
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Min: ${minAmount}, Max: ${maxAmount}`}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Available: {formatCurrency(pendingBalance)}
          </p>
        </div>

        {/* Bank account */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Payout To
          </label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Select an account...</option>
            {bankAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {BANK_ACCOUNT_TYPE_LABELS[account.account_type]} - {account.account_number}
                {account.is_primary && " (Primary)"}
              </option>
            ))}
          </select>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || !amount || !selectedAccount}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <ArrowRight size={18} />
              Request Payout
            </>
          )}
        </button>
      </form>

      {/* Info box */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-900">
          <strong>Processing:</strong> Payouts are processed within 1-2 business days to your
          selected bank account.
        </p>
      </div>
    </div>
  );
}

/**
 * Bank account management
 */
function BankAccountManagement({
  orgId,
  accounts,
  onAccountsChange,
}: {
  orgId: string;
  accounts: LandlordBankAccount[];
  onAccountsChange: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [accountType, setAccountType] = useState("bank_account");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [bankName, setBankName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!accountNumber || !accountHolder) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);

    const input: any = {
      account_type: accountType,
      account_number: accountNumber,
      account_holder_name: accountHolder,
      is_primary: accounts.length === 0,
    };

    if (bankName) {
      input.bank_name = bankName;
    }

    const { success, error: addError } = await addBankAccount(orgId, input);

    if (!success) {
      setError(addError || "Failed to add account");
      setLoading(false);
      return;
    }

    setAccountNumber("");
    setAccountHolder("");
    setBankName("");
    setAccountType("bank_account");
    setShowForm(false);
    await onAccountsChange();
    setLoading(false);
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm("Are you sure you want to delete this account?")) return;

    const { success } = await deleteBankAccount(accountId);
    if (success) {
      await onAccountsChange();
    }
  };

  return (
    <div id="bank-accounts" className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900">Bank Accounts</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddAccount} className="mb-4 p-4 bg-gray-50 rounded-lg">
          {error && (
            <div className="mb-3 p-2 bg-red-50 text-red-800 text-sm rounded">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-900 mb-1">
                Account Type
              </label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
              >
                <option value="bank_account">Bank Account</option>
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
                <option value="rocket">Rocket</option>
              </select>
            </div>

            <input
              type="text"
              placeholder="Account Holder Name"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
              required
            />

            <input
              type="text"
              placeholder="Account Number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
              required
            />

            {accountType === "bank_account" && (
              <input
                type="text"
                placeholder="Bank Name"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
              />
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Account"}
            </button>
          </div>
        </form>
      )}

      {accounts.length === 0 ? (
        <p className="text-sm text-gray-600 py-4">No bank accounts added yet</p>
      ) : (
        <div className="space-y-2">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div>
                <p className="font-medium text-gray-900">
                  {BANK_ACCOUNT_TYPE_LABELS[account.account_type]}
                </p>
                <p className="text-sm text-gray-600">{account.account_number}</p>
                {account.is_primary && (
                  <p className="text-xs text-blue-600 font-medium">Primary</p>
                )}
              </div>
              <button
                onClick={() => handleDeleteAccount(account.id)}
                className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
