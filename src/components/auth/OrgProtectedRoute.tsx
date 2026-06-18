/**
 * OrgProtectedRoute
 * 
 * Ensures the user is authenticated AND has selected an organisation.
 * Redirects to org selector if no current organisation is set.
 */

import { useAuth } from "@/contexts/AuthContext";
import { Loader } from "lucide-react";

interface OrgProtectedRouteProps {
  children: React.ReactNode;
  minRole?: "staff" | "admin" | "owner";
}

export function OrgProtectedRoute({
  children,
  minRole = "staff",
}: OrgProtectedRouteProps) {
  const { user, currentOrg, loading, organisations } = useAuth();

  if (loading) {
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
          <p className="text-gray-700 mb-4">You need to be logged in</p>
          <a href="/auth" className="text-blue-600 hover:text-blue-700">
            Sign in
          </a>
        </div>
      </div>
    );
  }

  if (!currentOrg || organisations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-700 mb-4">Please select or create an organisation</p>
          <a href="/create-org" className="text-blue-600 hover:text-blue-700 font-medium">
            Create Organisation
          </a>
        </div>
      </div>
    );
  }

  // Check role permissions
  const userOrgMembership = organisations.find(
    (o) => o.org_id === currentOrg.id
  );

  const userRole =
    currentOrg.owner_id === user.id
      ? "owner"
      : userOrgMembership?.member_role || "staff";

  const roleHierarchy: Record<string, number> = {
    owner: 3,
    admin: 2,
    staff: 1,
  };

  const minRoleValue = roleHierarchy[minRole] || 1;
  const userRoleValue = roleHierarchy[userRole] || 1;

  if (userRoleValue < minRoleValue) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-700 mb-4">
            You don't have permission to access this page (requires {minRole} role)
          </p>
          <a href="/" className="text-blue-600 hover:text-blue-700">
            Go home
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
