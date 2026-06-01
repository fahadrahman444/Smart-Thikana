/**
 * =============================================================================
 * AuthContext
 * =============================================================================
 * Single source of truth for "who is logged in" across the entire app.
 *
 * Responsibilities:
 *   1. Subscribe to Supabase auth state changes (signin / signout / refresh).
 *   2. Load the user's `profiles` row + their `user_roles` row from the DB.
 *   3. Expose `{ session, user, profile, role, loading, signOut }` via React
 *      context so any component can call `useAuth()` without prop-drilling.
 *
 * Critical ordering rule (Lovable best practice):
 *   ALWAYS register `onAuthStateChange` BEFORE calling `getSession()`.
 *   Otherwise the very first auth event after page load can be missed and
 *   the UI gets stuck in "loading" forever.
 *
 * Critical anti-deadlock rule:
 *   Inside the `onAuthStateChange` callback, we must NOT directly `await` any
 *   other Supabase call — doing so can deadlock the auth client. Instead we
 *   defer the profile fetch with `setTimeout(..., 0)` so it runs on the next
 *   tick, after the auth callback has returned.
 * =============================================================================
 */
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Organisation, UserOrganisationView } from "@/types/organisations";
import { fetchUserOrganisations } from "@/lib/organisations";

// ─── Types ───────────────────────────────────────────────────────────────────
// `app_role` enum in the database has exactly two values. Mirroring it as a
// TypeScript union gives us autocomplete + compile-time safety.
export type AppRole = "tenant" | "landlord";

/** Shape of a row in the public.profiles table. */
export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  business_name: string | null;
  preferences: Record<string, unknown>;
}

/** What every consumer of `useAuth()` receives. */
interface AuthContextValue {
  session: Session | null;        // Supabase session object (contains JWT)
  user: User | null;              // Convenience: session?.user
  profile: Profile | null;        // Row from public.profiles, or null
  role: AppRole | null;           // 'tenant' | 'landlord' | null (not chosen yet)
  organisations: UserOrganisationView[]; // All orgs user owns/belongs to
  currentOrg: Organisation | null; // Currently selected organisation
  loading: boolean;               // True until the FIRST auth check completes
  refreshProfile: () => Promise<void>; // Re-fetch profile + role on demand
  switchOrg: (org_id: string) => void; // Switch to a different organisation
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole]       = useState<AppRole | null>(null);
  const [organisations, setOrganisations] = useState<UserOrganisationView[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organisation | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Fetch the profile + role rows for a given user ID.
   * Both queries are issued in parallel via Promise.all to halve latency.
   * Uses `.maybeSingle()` (not `.single()`) so a missing row resolves to
   * `null` instead of throwing — important for first-time signups where
   * the role hasn't been chosen yet.
   */
  const loadProfileAndRole = async (uid: string) => {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
    ]);
    setProfile((p as Profile) ?? null);
    setRole((r?.role as AppRole) ?? null);
  };

  /**
   * Fetch all organisations a user owns or belongs to.
   * Sets the first org as current by default (can be overridden with switchOrg).
   */
  const loadUserOrganisations = async (uid: string) => {
    const orgs = await fetchUserOrganisations(uid);
    setOrganisations(orgs);

    if (orgs.length > 0) {
      // Fetch full org details for the first org
      const { data: orgData } = await supabase
        .from("organisations")
        .select("*")
        .eq("id", orgs[0].org_id)
        .single();

      if (orgData) {
        setCurrentOrg(orgData as Organisation);
      }
    }
  };

  /**
   * Switch to a different organisation.
   */
  const switchOrg = (orgId: string) => {
    const found = organisations.find((o) => o.org_id === orgId);
    if (found) {
      supabase
        .from("organisations")
        .select("*")
        .eq("id", orgId)
        .single()
        .then(({ data }) => {
          if (data) {
            setCurrentOrg(data as Organisation);
            // Store preference in localStorage for persistence
            localStorage.setItem("currentOrgId", orgId);
          }
        });
    }
  };

  /** Public helper so screens can refresh after editing the profile. */
  const refreshProfile = async () => {
    if (user) {
      await loadProfileAndRole(user.id);
      await loadUserOrganisations(user.id);
    }
  };

  useEffect(() => {
    // ── Step 1: subscribe FIRST ───────────────────────────────────────────
    // Fires on SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED, etc.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        // Defer to avoid deadlocking the auth client (see header comment).
        setTimeout(() => {
          loadProfileAndRole(newSession.user.id);
          loadUserOrganisations(newSession.user.id);
        }, 0);
      } else {
        // Logged out → clear cached state so no stale data leaks.
        setProfile(null);
        setRole(null);
        setOrganisations([]);
        setCurrentOrg(null);
      }
    });

    // ── Step 2: THEN check for an existing session ────────────────────────
    // Handles the page-refresh case where the user is already signed in.
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfileAndRole(s.user.id);
        loadUserOrganisations(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Cleanup: unsubscribe on unmount to prevent memory leaks.
    return () => sub.subscription.unsubscribe();
  }, []);

  /**
   * Sign out:
   *   1. Tell Supabase to revoke the refresh token + clear localStorage.
   *   2. Clear local state so the UI updates instantly.
   * onAuthStateChange would also fire and clear state, but doing it here
   * makes the transition feel snappier.
   */
  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole(null);
    setOrganisations([]);
    setCurrentOrg(null);
    localStorage.removeItem("currentOrgId");
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        role,
        organisations,
        currentOrg,
        loading,
        refreshProfile,
        switchOrg,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Convenience hook. Throws if used outside <AuthProvider> — this is a
 * developer-error guard, not something a regular user will ever see.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
