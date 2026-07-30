import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import Footer from "@/components/Footer";
import { CheckCircle2, XCircle } from "lucide-react";

export function PaymentSuccess() {
  const [sp] = useSearchParams();
  const [status, setStatus] = useState("checking");
  const [info, setInfo] = useState(null);
  useEffect(()=>{
    if (sp.get("free")) { setStatus("success"); return; }
    const sid = sp.get("session_id");
    if (!sid) { setStatus("success"); return; }
    let n = 0; const iv = setInterval(async ()=>{
      n++;
      try {
        const { data } = await api.get(`/payments/status/${sid}`);
        setInfo(data);
        if (data.payment_status === 'paid') { setStatus("success"); clearInterval(iv); }
        else if (n > 10) { setStatus("pending"); clearInterval(iv); }
      } catch { if (n>10) { setStatus("error"); clearInterval(iv); } }
    }, 2000);
    return ()=>clearInterval(iv);
  }, [sp]);
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-8" data-testid="payment-success">
      <div className="max-w-lg text-center">
        <CheckCircle2 size={56} className="mx-auto text-[color:var(--accent)]"/>
        <h1 className="font-display text-6xl font-bold mt-6 leading-none">You&apos;re in.</h1>
        <p className="text-[color:var(--ink-2)] mt-4">{status==='checking'?'Confirming your payment…':status==='pending'?'Payment still processing — we&apos;ll email you the confirmation.':'Registration confirmed. See you there.'}</p>
        {info && <p className="text-sm text-[color:var(--muted)] mt-2">{info.title} · ${info.amount}</p>}
        <div className="mt-8 flex gap-3 justify-center">
          <Link to="/dashboard" className="btn-accent">Go to dashboard</Link>
          <Link to="/events" className="btn-outline">Browse more</Link>
        </div>
      </div>
      <Footer/>
    </div>
  );
}

export function PaymentCancel() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-8" data-testid="payment-cancel">
      <div className="max-w-lg text-center">
        <XCircle size={56} className="mx-auto text-[color:var(--muted)]"/>
        <h1 className="font-display text-6xl font-bold mt-6 leading-none">Cancelled.</h1>
        <p className="text-[color:var(--ink-2)] mt-4">Your registration wasn&apos;t processed. Try again whenever you&apos;re ready.</p>
        <div className="mt-8"><Link to="/events" className="btn-accent">Back to events</Link></div>
      </div>
    </div>
  );
}
