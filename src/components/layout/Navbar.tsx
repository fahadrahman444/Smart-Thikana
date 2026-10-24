/**
 * Navbar — top navigation with Bashabari branding and the
 * mygov.bd-style green/red accent stripe.
 */
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Building2, LogOut, MessageSquare, Heart, LayoutDashboard, User, ShieldCheck, Star, History, Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  useMessageNotifications,
  useMessageNotificationsRoot,
} from "@/hooks/useMessageNotifications";

export default function Navbar() {
  const { user, profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Owns the realtime subscription for the entire app (mounted exactly once
  // here in the Navbar). All other components only READ via useMessageNotifications().
  useMessageNotificationsRoot();
  const { unread } = useMessageNotifications();

  const initials = (profile?.full_name || user?.email || "U")
    .split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

  const tenantLinks = [
    { to: "/tenant", label: "Browse", icon: Building2 },
    { to: "/favorites", label: "Saved", icon: Heart },
    { to: "/messages", label: "Messages", icon: MessageSquare, badge: unread },
    { to: "/services", label: "Services", icon: ShieldCheck },
    { to: "/history", label: "History", icon: History },
    { to: "/feedback", label: "Feedback", icon: Star },
  ];
  const landlordLinks = [
    { to: "/landlord", label: "Dashboard", icon: LayoutDashboard },
    { to: "/landlord/listings", label: "My Listings", icon: Building2 },
    { to: "/messages", label: "Messages", icon: MessageSquare, badge: unread },
    { to: "/services", label: "Services", icon: ShieldCheck },
    { to: "/tenant-lookup", label: "Tenant lookup", icon: Search },
    { to: "/feedback", label: "Feedback", icon: Star },
  ];
  const links = role === "landlord" ? landlordLinks : role === "tenant" ? tenantLinks : [];

  return (
    <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b">
      <div className="gov-stripe h-1" />
      <div className="container flex h-16 items-center justify-between">
        <Link to={role ? (role === "landlord" ? "/landlord" : "/tenant") : "/"} className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-gradient-hero shadow-brand">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-lg font-bold text-primary">Basha Vhara Koto</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Trusted Rentals</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to}
              className={({ isActive }) =>
                `relative flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors
                ${isActive ? "bg-primary-soft text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`
              }>
              <l.icon className="h-4 w-4" /> {l.label}
              {"badge" in l && l.badge ? (
                <Badge variant="destructive" className="ml-1 h-4 min-w-4 px-1 text-[10px]">{l.badge}</Badge>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Mobile hamburger — exposes the same nav links inside a sheet
              because the desktop <nav> is hidden below md. */}
          {user && links.length > 0 && (
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <nav className="mt-8 flex flex-col gap-1">
                  {links.map((l) => (
                    <NavLink key={l.to} to={l.to} onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium
                        ${isActive ? "bg-primary-soft text-primary" : "hover:bg-muted"}`
                      }>
                      <l.icon className="h-4 w-4" /> {l.label}
                      {"badge" in l && l.badge ? (
                        <Badge variant="destructive" className="ml-auto h-4 min-w-4 px-1 text-[10px]">{l.badge}</Badge>
                      ) : null}
                    </NavLink>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          )}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium">{profile?.full_name || "User"}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                    {role && <span className="mt-1 text-[10px] uppercase tracking-wider text-primary">{role}</span>}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/kyc")}>
                  <ShieldCheck className="mr-2 h-4 w-4" /> Identity / KYC
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => { await signOut(); navigate("/"); }}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" onClick={() => navigate("/auth")}>Sign in</Button>
              <Button onClick={() => navigate("/")}>Get started</Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
