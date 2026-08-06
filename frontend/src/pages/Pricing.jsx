import { useEffect, useState } from "react";
import { api, formatErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";
import { toast, Toaster } from "sonner";
import { Check, Sparkles } from "lucide-react";

export default function Pricing() {
  const [plans, setPlans] = useState([]);
  const [currency, setCurrency] = useState("INR");
  const [busy, setBusy] = useState("");
  const { user, refresh } = useAuth();
  const nav = useNavigate();

  useEffect(()=>{ api.get("/plans").then(r=>{ setPlans(r.data.plans); setCurrency(r.data.currency); }); }, []);

  const subscribe = async (planId) => {
    if (!user) { nav("/auth?mode=signup"); return; }
    setBusy(planId);
    try {
      const { data } = await api.post("/subscriptions/checkout", { plan: planId, origin_url: window.location.origin });
      if (data.free_trial) { toast.success("First month is on us — welcome to Cosmic Elemental."); await refresh(); nav("/dashboard"); }
      else window.location.href = data.checkout_url;
    } catch (e) { toast.error(formatErr(e)); }
    finally { setBusy(""); }
  };

  const badges = { viewer: "AUDIENCE", artist: "ARTISTS · INSTRUCTORS", organizer: "ORGANIZERS" };
  const highlights = { artist: true };

  return (
    <div data-testid="pricing-page"><Toaster richColors position="top-right"/>
      <section className="max-w-[1440px] mx-auto px-6 lg:px-10 pt-16 pb-8">
        <div className="label-eyebrow text-[color:var(--muted)]">Pricing · {currency}</div>
        <h1 className="font-display font-bold text-6xl md:text-8xl lg:text-9xl leading-[0.86] mt-4 tracking-tighter">CHOOSE<br/>YOUR<br/><span className="text-[color:var(--accent)]">PLAN.</span></h1>
        <p className="max-w-xl mt-6 text-lg text-[color:var(--ink-2)]">First month free on every plan. No card charged for the trial. Cancel anytime.</p>
      </section>
      <section className="max-w-[1440px] mx-auto px-6 lg:px-10 grid md:grid-cols-3 gap-6 pt-6 pb-16">
        {plans.map((p, i) => (
          <div key={p.id} data-testid={`plan-${p.id}`} className={`card p-8 flex flex-col relative ${highlights[p.id]?'border-[color:var(--ink)] border-2':''}`}>
            {highlights[p.id] && <span className="absolute -top-3 left-6 tag tag-accent"><Sparkles size={12}/> Most popular</span>}
            <div className="label-eyebrow text-[color:var(--accent)]">{badges[p.id] || p.id.toUpperCase()}</div>
            <h3 className="font-display text-5xl font-bold mt-3 leading-none">{p.name}</h3>
            <div className="mt-6 flex items-baseline gap-2">
              <span className="font-display text-6xl font-bold">{currency==='INR'?'₹':currency+' '}{p.price}</span>
              <span className="text-[color:var(--muted)]">/ month</span>
            </div>
            <div className="mt-2 text-sm text-[color:var(--accent)] font-semibold">✦ First month free</div>
            <ul className="mt-8 space-y-3 flex-1">
              {p.features.map(f => <li key={f} className="flex gap-3 text-sm"><Check size={16} className="text-[color:var(--accent)] shrink-0 mt-0.5"/> <span>{f}</span></li>)}
            </ul>
            <button onClick={()=>subscribe(p.id)} disabled={busy===p.id} data-testid={`subscribe-${p.id}`} className={`mt-8 justify-center ${highlights[p.id]?'btn-accent':'btn-outline'}`}>
              {busy===p.id ? '…' : (user?.plan===p.id?'Current plan':'Start free month →')}
            </button>
          </div>
        ))}
      </section>
      <section className="max-w-[1440px] mx-auto px-6 lg:px-10 py-16 border-t border-[color:var(--line-dark)]">
        <div className="label-eyebrow text-[color:var(--muted)]">Frequently asked</div>
        <h2 className="font-display text-5xl md:text-7xl font-bold leading-none mt-3">EVERY PLAN<br/><span className="text-[color:var(--accent)]">STARTS FREE.</span></h2>
        <p className="mt-6 max-w-2xl text-lg text-[color:var(--ink-2)]">Try any plan free for 30 days. Cancel anytime. No card needed for the trial.</p>
      </section>
      <Footer/>
    </div>
  );
}
