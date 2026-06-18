/**
 * Landlord's maintenance ticket management center dashboard
 */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  PauseCircle,
  Filter,
  Plus,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMaintenanceTicketsRealtime } from "@/hooks/useMaintenanceTicketsRealtime";
import {
  getMaintenanceStats,
  updateTicketStatus,
} from "@/lib/maintenance";
import {
  MAINTENANCE_CATEGORY_LABELS,
  MAINTENANCE_PRIORITY_COLORS,
  MAINTENANCE_STATUS_COLORS,
  formatTicketId,
  isTicketOverdue,
  MaintenanceStatus,
} from "@/types/maintenance";

export function MaintenanceCenterPage() {
  const { currentOrg } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const { tickets, loading, error } = useMaintenanceTicketsRealtime(currentOrg?.id || "");

  React.useEffect(() => {
    const loadStats = async () => {
      if (!currentOrg) return;
      const newStats = await getMaintenanceStats(currentOrg.id);
      setStats(newStats);
    };

    loadStats();
  }, [currentOrg, tickets]);

  if (!currentOrg) {
    return (
      <div className="p-8 text-center text-gray-600">
        <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
        <p>No organization selected</p>
      </div>
    );
  }

  const filteredTickets = tickets.filter((ticket) => {
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertCircle size={16} />;
      case "in_progress":
        return <Clock size={16} />;
      case "on_hold":
        return <PauseCircle size={16} />;
      case "resolved":
        return <CheckCircle2 size={16} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Maintenance Center</h1>
            <p className="text-gray-600 mt-2">Track and manage all maintenance tickets</p>
          </div>
        </div>

        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-600">Total Tickets</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-600">Open</p>
              <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.in_progress}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-600">Overdue</p>
              <p className={`text-2xl font-bold ${stats.overdue > 0 ? "text-red-600" : "text-gray-600"}`}>
                {stats.overdue}
              </p>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Filter size={18} />
              Filters
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="on_hold">On Hold</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              {/* Priority filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Tickets list */}
        <div className="bg-white rounded-lg border border-gray-200">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading tickets...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-gray-600">No tickets found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">
                      Issue
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => {
                    const isOverdue = isTicketOverdue(ticket);
                    return (
                      <tr
                        key={ticket.id}
                        className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                          isOverdue ? "bg-red-50" : ""
                        }`}
                      >
                        <td className="px-4 py-3 text-sm font-mono text-blue-600">
                          {formatTicketId(ticket.id)}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900 line-clamp-1">
                              {ticket.title}
                            </p>
                            <p className="text-xs text-gray-500">{ticket.tenant_id.substring(0, 8)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {MAINTENANCE_CATEGORY_LABELS[ticket.category]}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${
                              MAINTENANCE_PRIORITY_COLORS[ticket.priority]
                            }`}
                          >
                            {ticket.priority}
                            {isOverdue && ticket.status !== "closed" && (
                              <AlertCircle size={12} className="ml-1" />
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(ticket.status)}
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${
                                MAINTENANCE_STATUS_COLORS[ticket.status]
                              }`}
                            >
                              {ticket.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/maintenance/ticket/${ticket.id}`}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-medium transition-colors"
                          >
                            <MessageSquare size={14} />
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
