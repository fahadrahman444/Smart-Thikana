/**
 * Footer — institutional footer with mygov-style accent stripe
 */
import { Building2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mt-auto border-t bg-secondary/30">
      <div className="gov-stripe h-1" />
      <div className="container py-10 grid gap-8 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-gradient-hero">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-primary">Basha Vhara Koto</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-md">
            A trusted house rental platform connecting tenants with verified landlords across Bangladesh.
            Secure messaging, transparent agreements, simple payments.
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Platform</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/tenant" className="hover:text-primary">Browse Listings</Link></li>
            <li><Link to="/landlord" className="hover:text-primary">List Property</Link></li>
            <li><Link to="/messages" className="hover:text-primary">Messages</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Support</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Help Center</li>
            <li>Privacy Policy</li>
            <li>Terms of Use</li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="container py-4 text-xs text-muted-foreground flex flex-col sm:flex-row justify-between gap-2">
          <p>© {new Date().getFullYear()} Basha Vhara Koto. All rights reserved.</p>
          <p>Designed for everyone, everywhere in Bangladesh.</p>
        </div>
      </div>
    </footer>
  );
}
