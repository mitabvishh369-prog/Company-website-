import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Footer from "@/components/Footer";
import { CheckCircle2, XCircle, Sparkles } from "lucide-react";

export function SubscriptionSuccess() {
  const [sp] = useSearchParams(); const [status, setStatus] = useState("checking");
  const { refresh } = useAuth();
  useEffect(()=>{
    if (sp.get("trial")) { setStatus("trial"); refresh(); return; }
    const sid = sp.get("session_id"); if (!sid) { setStatus("success"); refresh(); return; }
    let n=0; const iv=setInterval(async ()=>{
      n++; try {
        const { data } = await api.get(`/payments/status/${sid}`);
        if (data.payment_status==='paid') { setStatus("success"); refresh(); clearInterval(iv); }
        else if (n>10) { setStatus("pending"); clearInterval(iv); }
      } catch { if (n>10) clearInterval(iv); }
    }, 2000);
    return ()=>clearInterval(iv);
  }, [sp, refresh]);
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-8" data-testid="sub-success">
      <div className="max-w-lg text-center">
        <Sparkles size={56} className="mx-auto text-[color:var(--accent)]"/>
        <h1 className="font-display text-6xl font-bold mt-6 leading-none">{status==='trial'?"You're in.":status==='pending'?"Almost there.":"You're subscribed."}</h1>
        <p className="text-[color:var(--ink-2)] mt-4">{status==='trial'?"Your first month is free. Explore your dashboard and start creating.":status==='pending'?"Payment is still processing — we'll email you when it's confirmed.":"Welcome — your plan is active. Enjoy full access."}</p>
        <div className="mt-8"><Link to="/dashboard" className="btn-accent">Open dashboard →</Link></div>
      </div>
      <Footer/>
    </div>
  );
}

export function SubscriptionCancel() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-8" data-testid="sub-cancel">
      <div className="max-w-lg text-center">
        <XCircle size={56} className="mx-auto text-[color:var(--muted)]"/>
        <h1 className="font-display text-6xl font-bold mt-6 leading-none">Cancelled.</h1>
        <p className="text-[color:var(--ink-2)] mt-4">No worries — you can subscribe whenever you're ready.</p>
        <div className="mt-8"><Link to="/pricing" className="btn-accent">Back to plans</Link></div>
      </div>
    </div>
  );
}
