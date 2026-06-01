/**
 * Maintenance Ticketing types and utilities
 */

export type MaintenanceCategory =
  | 'plumbing'
  | 'electrical'
  | 'hvac'
  | 'structural'
  | 'appliance'
  | 'other';

export type MaintenancePriority = 'low' | 'normal' | 'high' | 'urgent';
export type MaintenanceStatus = 'open' | 'in_progress' | 'on_hold' | 'resolved' | 'closed';

export interface MaintenanceTicket {
  id: string;
  org_id: string;
  listing_id: string;
  tenant_id: string;
  agreement_id: string;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assigned_to?: string;
  resolved_by?: string;
  resolved_at?: string;
  estimated_resolution_date?: string;
  actual_resolution_date?: string;
  cost_estimate?: number;
  actual_cost?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
}

export interface MaintenanceTicketUpdate {
  id: string;
  ticket_id: string;
  updated_by: string;
  old_status?: string;
  new_status?: string;
  message: string;
  is_internal_note: boolean;
  created_at: string;
}

export interface MaintenanceTicketAttachment {
  id: string;
  ticket_id: string;
  uploaded_by: string;
  file_url: string;
  file_name: string;
  file_type?: string;
  file_size_bytes?: number;
  created_at: string;
}

export interface NewTicketInput {
  listing_id: string;
  agreement_id: string;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
}

export const MAINTENANCE_CATEGORY_LABELS: Record<MaintenanceCategory, string> = {
  plumbing: '🚰 Plumbing',
  electrical: '⚡ Electrical',
  hvac: '❄️ HVAC/Cooling',
  structural: '🏗️ Structural',
  appliance: '🔧 Appliance',
  other: '📋 Other',
};

export const MAINTENANCE_PRIORITY_COLORS: Record<MaintenancePriority, string> = {
  low: 'bg-blue-100 text-blue-800',
  normal: 'bg-gray-100 text-gray-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export const MAINTENANCE_STATUS_COLORS: Record<MaintenanceStatus, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  on_hold: 'bg-orange-100 text-orange-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

export const MAINTENANCE_CATEGORIES: MaintenanceCategory[] = [
  'plumbing',
  'electrical',
  'hvac',
  'structural',
  'appliance',
  'other',
];

export const MAINTENANCE_PRIORITIES: MaintenancePriority[] = ['low', 'normal', 'high', 'urgent'];

export function getPriorityLevel(priority: MaintenancePriority): number {
  const levels: Record<MaintenancePriority, number> = {
    low: 1,
    normal: 2,
    high: 3,
    urgent: 4,
  };
  return levels[priority];
}

/**
 * Get SLA (Service Level Agreement) target resolution time in hours
 * based on priority.
 */
export function getSLAHours(priority: MaintenancePriority): number {
  const sla: Record<MaintenancePriority, number> = {
    low: 72, // 3 days
    normal: 48, // 2 days
    high: 24, // 1 day
    urgent: 4, // 4 hours
  };
  return sla[priority];
}

/**
 * Check if a ticket is overdue based on creation date and priority.
 */
export function isTicketOverdue(ticket: MaintenanceTicket): boolean {
  if (ticket.status === 'closed' || ticket.status === 'resolved') {
    return false;
  }

  const createdAt = new Date(ticket.created_at);
  const now = new Date();
  const elapsedHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  const slaHours = getSLAHours(ticket.priority);

  return elapsedHours > slaHours;
}

/**
 * Format ticket ID for display (e.g., TK-12345)
 */
export function formatTicketId(id: string): string {
  return `TK-${id.substring(0, 5).toUpperCase()}`;
}
