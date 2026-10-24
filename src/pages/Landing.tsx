/**
 * Landing — Public homepage. Lets visitors choose their role and routes
 * them into the right onboarding (or dashboard if signed in).
 */
import { useNavigate } from "react-router-dom";
import { Building2, Home, ShieldCheck, MessageSquare, CreditCard, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import heroImg from "@/assets/hero-building.jpg";

export default function Landing() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && role) {
      navigate(role === "landlord" ? "/landlord" : "/tenant", { replace: true });
    }
  }, [user, role, loading, navigate]);

  const goAs = (r: "tenant" | "landlord") => {
    if (user) navigate(r === "landlord" ? "/landlord" : "/tenant");
    else navigate("/auth", { state: { intendedRole: r } });
  };

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-soft">
        <div className="container relative grid gap-10 py-16 lg:grid-cols-2 lg:py-24 items-center">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-primary mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Verified rentals across Bangladesh
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
              Find a home you'll <span className="text-primary">love</span>,
              <br />or list one with <span className="text-accent">trust</span>.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl">
              Basha Vhara Koto is the modern way to rent — connect directly with verified landlords or
              tenants, agree on terms in chat, and pay securely with a digital receipt.
            </p>

            <div className="mt-8 grid sm:grid-cols-2 gap-4 max-w-lg">
              <button onClick={() => goAs("tenant")}
                className="group card-elevated text-left p-5 hover:border-primary">
                <div className="flex items-center gap-3 mb-2">
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-primary-soft text-primary">
                    <Home className="h-5 w-5" />
                  </div>
                  <h3 className="font-display font-semibold">I'm a Tenant</h3>
                </div>
                <p className="text-sm text-muted-foreground">Browse listings, save favorites, message landlords.</p>
                <span className="mt-3 inline-block text-sm font-medium text-primary group-hover:underline">
                  Continue as Tenant →
                </span>
              </button>

              <button onClick={() => goAs("landlord")}
                className="group card-elevated text-left p-5 hover:border-accent">
                <div className="flex items-center gap-3 mb-2">
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-accent-soft text-accent">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <h3 className="font-display font-semibold">I'm a Landlord</h3>
                </div>
                <p className="text-sm text-muted-foreground">List properties, manage deals, receive payments.</p>
                <span className="mt-3 inline-block text-sm font-medium text-accent group-hover:underline">
                  Continue as Landlord →
                </span>
              </button>
            </div>
          </div>

          <div className="relative animate-scale-in">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-hero opacity-20 blur-2xl" />
            <img
              src={heroImg}
              alt="Modern apartment building with greenery"
              width={1600} height={900}
              className="relative rounded-2xl shadow-brand object-cover w-full h-[420px] lg:h-[520px]"
            />
            <Card className="absolute -bottom-6 -left-4 hidden md:flex items-center gap-3 p-4 shadow-lg">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Verified landlords</p>
                <p className="text-xs text-muted-foreground">Every deal is protected</p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="container py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold">Everything you need, in one place</h2>
          <p className="mt-3 text-muted-foreground">From browsing to receipt — a single trusted platform.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Search, title: "Smart Search", body: "Filter by price, location, and property type." },
            { icon: MessageSquare, title: "Direct Chat", body: "Talk to landlords in real time, no middlemen." },
            { icon: ShieldCheck, title: "Digital Agreements", body: "Both parties confirm before any payment." },
            { icon: CreditCard, title: "Secure Payments", body: "Branded digital receipts on every deal." },
          ].map((f, i) => (
            <Card key={i} className="p-6 card-elevated">
              <div className="grid h-11 w-11 place-items-center rounded-md bg-primary-soft text-primary mb-4">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-hero text-primary-foreground">
        <div className="container py-16 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Ready to make a move?</h2>
          <p className="opacity-90 max-w-lg mx-auto mb-6">Join thousands of tenants and landlords already using Bashabari.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" variant="secondary" onClick={() => goAs("tenant")}>Continue as Tenant</Button>
            <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              onClick={() => goAs("landlord")}>Continue as Landlord</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
