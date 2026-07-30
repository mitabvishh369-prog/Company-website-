import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Footer from "@/components/Footer";
import { EventCard, ClassCard, ArtistCard } from "@/components/Cards";
import { Filter, X } from "lucide-react";

export function EventsList() { return <Discovery kind="events"/>; }
export function ClassesList() { return <Discovery kind="classes"/>; }
export function ArtistsList() { return <Discovery kind="artists"/>; }

function Discovery({ kind }) {
  const cfg = {
    events:   { title:"EVENTS", eyebrow:"Global Creative Events", filters:["city","country","art_form","event_type","skill_level"]},
    classes:  { title:"CLASSES", eyebrow:"Learn from Masters", filters:["city","art_form","mode","skill_level"]},
    artists:  { title:"ARTISTS", eyebrow:"Creative Talent Agency", filters:["city","specialization"]},
  }[kind];
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [flt, setFlt] = useState({});
  const [loading, setLoading] = useState(true);
  const [openFilters, setOpenFilters] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = { ...flt, q: q || undefined };
    api.get(`/${kind}`, { params }).then(r=>setItems(r.data)).catch(()=>setItems([])).finally(()=>setLoading(false));
  }, [q, flt, kind]);

  const Card = kind==='events' ? EventCard : kind==='classes' ? ClassCard : ArtistCard;
  const propKey = kind==='events' ? 'event' : 'item';

  return (
    <div data-testid={`${kind}-page`}>
      <section className="max-w-[1440px] mx-auto px-6 lg:px-10 pt-12 pb-8">
        <div className="label-eyebrow text-[color:var(--muted)]">{cfg.eyebrow}</div>
        <h1 className="font-display font-bold text-6xl md:text-8xl lg:text-9xl leading-[0.86] mt-4 tracking-tighter">{cfg.title}<span className="text-[color:var(--accent)]">.</span></h1>
      </section>
      <section className="max-w-[1440px] mx-auto px-6 lg:px-10 pb-6 flex flex-wrap gap-3 items-center">
        <input placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)} data-testid={`${kind}-search`}
               className="flex-1 min-w-[220px] px-4 py-3 border border-[color:var(--line)] focus:border-[color:var(--ink)] focus:outline-none"/>
        <button onClick={()=>setOpenFilters(!openFilters)} className="btn-outline"><Filter size={14}/> Filters {Object.keys(flt).length>0 && `(${Object.keys(flt).length})`}</button>
        {Object.keys(flt).length>0 && <button onClick={()=>setFlt({})} className="text-sm underline text-[color:var(--muted)]" data-testid={`${kind}-clear-filters`}>Clear</button>}
      </section>
      {openFilters && (
        <section className="max-w-[1440px] mx-auto px-6 lg:px-10 pb-6 grid md:grid-cols-4 gap-3">
          {cfg.filters.map(f=>(
            <input key={f} placeholder={f.replace('_',' ')} value={flt[f]||''} data-testid={`filter-${f}`}
                   onChange={e=>setFlt({...flt, [f]: e.target.value || undefined})}
                   className="px-3 py-2 border border-[color:var(--line)] focus:border-[color:var(--ink)] focus:outline-none capitalize"/>
          ))}
        </section>
      )}
      <section className="max-w-[1440px] mx-auto px-6 lg:px-10 pb-24">
        {loading ? <p className="text-[color:var(--muted)] py-20 text-center">Loading…</p> :
          items.length === 0 ? <div className="py-20 text-center"><p className="font-display text-3xl mb-2">Nothing here yet.</p><p className="text-[color:var(--muted)]">Be the first to list your {kind==='events'?'event':kind==='classes'?'class':'profile'}.</p></div> :
          <div className={`grid gap-6 ${kind==='artists'?'md:grid-cols-4':'md:grid-cols-3'}`}>
            {items.map((it,i)=>{ const props = {[propKey]: it, index:i}; return <Card key={it.id} {...props}/>;})}
          </div>}
      </section>
      <Footer/>
    </div>
  );
}
