import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

function useCountUp(target, duration = 1400) {
  const [n, setN] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current || target === 0) { setN(target); return; }
    started.current = true;
    const start = performance.now();
    const step = t => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return n;
}

function Stat({ label, target, suffix }) {
  const n = useCountUp(target);
  return (
    <div data-testid={`stat-${label.toLowerCase().replace(/[^a-z]/g,'-')}`} className="border-l border-[color:var(--line)] pl-6">
      <div className="font-display text-6xl md:text-7xl font-bold tabular-nums leading-none tracking-tighter">{n.toLocaleString()}{suffix||''}</div>
      <div className="mt-3 label-eyebrow text-[color:var(--muted)]">{label}</div>
    </div>
  );
}

export default function LiveStats() {
  const [s, setS] = useState({ events:0, classes:0, artists:0, users:0, countries:0 });
  useEffect(() => {
    api.get("/stats/public").then(r => setS(r.data)).catch(()=>{});
  }, []);
  return (
    <section className="max-w-[1440px] mx-auto px-6 lg:px-10 py-24" data-testid="live-stats">
      <div className="grid lg:grid-cols-12 gap-8 mb-12 items-end">
        <div className="lg:col-span-6">
          <div className="label-eyebrow text-[color:var(--accent)]">Live from the platform</div>
          <h2 className="font-display font-bold text-5xl md:text-7xl mt-4 leading-none tracking-tighter">A LIVING<br/>ECOSYSTEM.</h2>
        </div>
        <div className="lg:col-span-6">
          <p className="text-lg text-[color:var(--ink-2)] leading-relaxed">Every number below is pulled live from our database. As new events go live, classes launch, and artists get verified — this counts up in real time.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
        <Stat label="Events listed" target={s.events}/>
        <Stat label="Classes & workshops" target={s.classes}/>
        <Stat label="Verified artists" target={s.artists}/>
        <Stat label="Countries" target={s.countries}/>
        <Stat label="Users" target={s.users}/>
      </div>
    </section>
  );
}
