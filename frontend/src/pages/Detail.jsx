import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, fileUrl, formatErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Footer from "@/components/Footer";
import { toast, Toaster } from "sonner";
import { Calendar, MapPin, Ticket, Users, Trophy, ChevronLeft, ChevronRight, Instagram, Youtube, Globe, X, Share2, Copy } from "lucide-react";

const money = (v, c='INR') => (c==='INR'||!c?'₹':c+' ') + (v ?? 0);

export function EventDetail() {
  const { id } = useParams(); const { user } = useAuth(); const nav = useNavigate();
  const [d, setD] = useState(null); const [showReg, setShowReg] = useState(false);
  const [carouselIdx, setCarouselIdx] = useState(0);
  useEffect(()=>{ api.get(`/events/${id}`).then(r=>setD(r.data)).catch(()=>{}); }, [id]);
  if (!d) return <div className="p-20 text-center text-[color:var(--muted)]">Loading…</div>;
  const gallery = (d.flyers && d.flyers.length>0) ? d.flyers : (d.images?.length>0 ? d.images : [d.poster_url].filter(Boolean));
  const hero = fileUrl(gallery[carouselIdx]) || "https://images.unsplash.com/photo-1604954055722-7f80571fbfc3?crop=entropy&cs=srgb&fm=jpg&q=85";
  return (
    <div data-testid="event-detail"><Toaster richColors position="top-right"/>
      <section className="max-w-[1440px] mx-auto px-6 lg:px-10 pt-10 grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7">
          <div className="flex flex-wrap gap-2 mb-6"><span className="tag tag-accent">{d.event_type}</span><span className="tag">{d.art_form}</span><span className="tag">{d.skill_level}</span></div>
          <h1 className="font-display font-bold text-5xl md:text-7xl leading-[0.9] tracking-tight">{d.title}</h1>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6 hairline pb-8">
            <Meta i={<Calendar size={16}/>} k="Date" v={(d.date||"").slice(0,16).replace('T',' ')}/>
            <Meta i={<MapPin size={16}/>} k="Venue" v={`${d.venue}, ${d.city}`}/>
            <Meta i={<Users size={16}/>} k="Capacity" v={d.capacity || '—'}/>
            <Meta i={<Trophy size={16}/>} k="Prize" v={d.prize_money?money(d.prize_money.toLocaleString()):'—'}/>
          </div>
          <div className="mt-8">
            <h3 className="label-eyebrow mb-3">About</h3>
            <p className="text-[color:var(--ink-2)] whitespace-pre-line leading-relaxed">{d.description}</p>
          </div>
          {d.judges?.length > 0 && <Block title="Judges" items={d.judges}/>}
          {d.guest_artists?.length > 0 && <Block title="Guest artists" items={d.guest_artists}/>}
          {d.sponsors?.length > 0 && <Block title="Sponsors & partners" items={d.sponsors}/>}
          {d.schedule && <div className="mt-8"><h3 className="label-eyebrow mb-3">Schedule</h3><pre className="whitespace-pre-wrap font-body text-[color:var(--ink-2)]">{d.schedule}</pre></div>}
          {d.rules && <div className="mt-8"><h3 className="label-eyebrow mb-3">Rules & guidelines</h3><pre className="whitespace-pre-wrap font-body text-[color:var(--ink-2)]">{d.rules}</pre></div>}
          <ShareRow eid={d.id} title={d.title}/>
        </div>
        <aside className="lg:col-span-5">
          <div className="sticky top-24 space-y-6">
            <div className="relative aspect-[4/5] bg-[color:var(--bg-3)] overflow-hidden">
              <img src={hero} alt={d.title} className="w-full h-full object-cover transition-opacity duration-300"/>
              {gallery.length > 1 && (<>
                <button onClick={()=>setCarouselIdx((carouselIdx-1+gallery.length)%gallery.length)} data-testid="carousel-prev" className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full"><ChevronLeft size={16}/></button>
                <button onClick={()=>setCarouselIdx((carouselIdx+1)%gallery.length)} data-testid="carousel-next" className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full"><ChevronRight size={16}/></button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">{gallery.map((_,i)=><button key={i} onClick={()=>setCarouselIdx(i)} className={`w-2 h-2 rounded-full ${i===carouselIdx?'bg-white':'bg-white/50'}`}/>)}</div>
              </>)}
            </div>
            <div className="p-6 border border-[color:var(--ink)] bg-white">
              <div className="text-xs text-[color:var(--muted)] label-eyebrow">Registration</div>
              <div className="mt-2 font-display text-4xl font-bold">{d.registration_fee ? money(d.registration_fee, 'INR') : 'FREE'}</div>
              <div className="text-xs text-[color:var(--ink-2)] mt-1">Deadline · {d.registration_deadline?.slice(0,10) || 'Open'}</div>
              <button onClick={()=>{ if (!user) nav('/auth'); else setShowReg(true); }} data-testid="event-book-btn" className="btn-accent w-full justify-center mt-6">{d.registration_fee>0?'Register & pay →':'Register (Free) →'}</button>
              <div className="mt-3 text-xs text-[color:var(--muted)]">Organized by <b>{d.organizer_name}</b> · {d.contact_email}</div>
            </div>
          </div>
        </aside>
      </section>
      {showReg && <RegistrationModal event={d} onClose={()=>setShowReg(false)}/>}
      <Footer/>
    </div>
  );
}

function ShareRow({ eid, title }) {
  const url = `${window.location.origin}/events/${eid}`;
  const share = (net) => {
    const t = encodeURIComponent(`${title} — via Cosmic Elemental`);
    const u = encodeURIComponent(url);
    if (net==='wa') window.open(`https://wa.me/?text=${t}%20${u}`, '_blank');
    else if (net==='tw') window.open(`https://twitter.com/intent/tweet?text=${t}&url=${u}`, '_blank');
    else if (net==='fb') window.open(`https://www.facebook.com/sharer/sharer.php?u=${u}`, '_blank');
    else if (net==='copy') { navigator.clipboard.writeText(url); toast.success("Link copied"); }
  };
  return (
    <div className="mt-10 pt-6 border-t border-[color:var(--line)]">
      <div className="label-eyebrow mb-3">Share this event</div>
      <div className="flex flex-wrap gap-2">
        <button onClick={()=>share('wa')} data-testid="share-wa" className="btn-outline text-sm"><Share2 size={14}/>WhatsApp</button>
        <button onClick={()=>share('tw')} data-testid="share-tw" className="btn-outline text-sm">X · Twitter</button>
        <button onClick={()=>share('fb')} data-testid="share-fb" className="btn-outline text-sm">Facebook</button>
        <button onClick={()=>share('copy')} data-testid="share-copy" className="btn-outline text-sm"><Copy size={14}/>Copy link</button>
      </div>
    </div>
  );
}

function RegistrationModal({ event, onClose }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: user?.name || '', email: user?.email || '', phone: '',
    category: (event.art_categories && event.art_categories[0]) || event.art_form || '',
    ticket_type: (event.ticket_types && event.ticket_types[0]?.name) || 'Standard' });
  const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault(); setBusy(true);
    try {
      const { data } = await api.post("/payments/checkout", { kind:"event", ref_id: event.id, origin_url: window.location.origin, participant: f });
      if (data.free) { toast.success("Registered — see you there!"); onClose(); nav('/dashboard'); }
      else window.location.href = data.checkout_url;
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };
  const tickets = event.ticket_types?.length ? event.ticket_types : null;
  const cats = event.art_categories?.length ? event.art_categories : (event.art_form ? [event.art_form] : []);
  const price = tickets ? tickets.find(t=>t.name===f.ticket_type)?.price ?? event.registration_fee : event.registration_fee;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose} data-testid="registration-modal">
      <div className="bg-white max-w-lg w-full border border-[color:var(--ink)]" onClick={e=>e.stopPropagation()}>
        <div className="p-6 hairline flex items-center justify-between">
          <div><div className="label-eyebrow text-[color:var(--accent)]">Register</div><h3 className="font-display text-2xl font-bold">{event.title}</h3></div>
          <button onClick={onClose}><X/></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <Row label="Full name" v={f.name} on={v=>setF({...f,name:v})} tid="reg-name" required/>
          <Row label="Email" type="email" v={f.email} on={v=>setF({...f,email:v})} tid="reg-email" required/>
          <Row label="Phone" v={f.phone} on={v=>setF({...f,phone:v})} tid="reg-phone" required/>
          {cats.length>0 && (<label className="block"><span className="label-eyebrow block mb-2">Category</span>
            <select value={f.category} onChange={e=>setF({...f,category:e.target.value})} data-testid="reg-category" className="w-full px-4 py-3 border border-[color:var(--line)] focus:border-[color:var(--accent)] focus:outline-none">
              {cats.map(c=><option key={c}>{c}</option>)}</select></label>)}
          {tickets && <label className="block"><span className="label-eyebrow block mb-2">Ticket type</span>
            <select value={f.ticket_type} onChange={e=>setF({...f,ticket_type:e.target.value})} data-testid="reg-ticket" className="w-full px-4 py-3 border border-[color:var(--line)] focus:border-[color:var(--accent)] focus:outline-none">
              {tickets.map(t=><option key={t.name} value={t.name}>{t.name} — ₹{t.price}</option>)}</select></label>}
          <div className="flex items-center justify-between pt-2 border-t border-[color:var(--line)]">
            <span className="label-eyebrow">Amount</span>
            <span className="font-display text-2xl font-bold">{price>0?`₹${price}`:'FREE'}</span>
          </div>
          <button disabled={busy} data-testid="reg-submit" className="btn-accent w-full justify-center">{busy?'…':price>0?'Continue to payment →':'Confirm registration →'}</button>
        </form>
      </div>
    </div>
  );
}

const Meta = ({i,k,v}) => (<div><div className="flex items-center gap-2 text-[color:var(--muted)] label-eyebrow">{i}{k}</div><div className="font-display text-xl font-bold mt-1">{v}</div></div>);
const Block = ({title, items}) => (<div className="mt-8"><h3 className="label-eyebrow mb-3">{title}</h3><ul className="flex flex-wrap gap-2">{items.map((x,i)=><li key={i} className="tag">{x}</li>)}</ul></div>);
const Row = ({label,v,on,type='text',tid,required}) => (<label className="block"><span className="label-eyebrow block mb-2">{label}</span>
  <input type={type} value={v} required={required} data-testid={tid} onChange={e=>on(e.target.value)} className="w-full px-4 py-3 border border-[color:var(--line)] focus:border-[color:var(--accent)] focus:outline-none"/></label>);

export function ClassDetail() {
  const { id } = useParams(); const { user } = useAuth(); const nav = useNavigate();
  const [d, setD] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(()=>{ api.get(`/classes/${id}`).then(r=>setD(r.data)); }, [id]);
  const pay = async () => {
    if (!user) return nav("/auth");
    setBusy(true);
    try {
      const p = { name: user.name, email: user.email, phone: '', category: d.art_form, ticket_type: 'Standard' };
      const { data } = await api.post("/payments/checkout", { kind: "class", ref_id: id, origin_url: window.location.origin, participant: p });
      if (data.free) { toast.success("Enrolled!"); nav("/dashboard"); }
      else window.location.href = data.checkout_url;
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };
  if (!d) return <div className="p-20 text-center text-[color:var(--muted)]">Loading…</div>;
  return (
    <div data-testid="class-detail"><Toaster/>
      <section className="max-w-[1440px] mx-auto px-6 lg:px-10 pt-10 grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7">
          <div className="flex gap-2 mb-6"><span className="tag tag-accent">{d.art_form}</span><span className="tag">{d.mode}</span><span className="tag">{d.skill_level}</span></div>
          <h1 className="font-display font-bold text-5xl md:text-7xl leading-[0.9]">{d.title}</h1>
          <p className="mt-4 text-[color:var(--ink-2)]">with <b>{d.instructor_name}</b></p>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-6 hairline pb-8">
            <Meta i={<Calendar size={16}/>} k="Schedule" v={d.schedule}/>
            <Meta i={<MapPin size={16}/>} k="Venue" v={`${d.venue||d.mode}, ${d.city}`}/>
            <Meta i={<Users size={16}/>} k="Seats" v={d.seats || '—'}/>
          </div>
          <p className="text-[color:var(--ink-2)] leading-relaxed whitespace-pre-line">{d.description}</p>
          {d.instructor_bio && <div className="mt-8"><h3 className="label-eyebrow mb-3">About the instructor</h3><p className="text-[color:var(--ink-2)]">{d.instructor_bio}</p></div>}
        </div>
        <aside className="lg:col-span-5">
          <div className="sticky top-24">
            <div className="aspect-video bg-[color:var(--bg-3)] img-hover">
              <img src={fileUrl(d.images?.[0]) || "https://images.unsplash.com/photo-1775568351184-97ef5387a7db?crop=entropy&cs=srgb&fm=jpg&q=85"} alt={d.title} className="w-full h-full object-cover"/>
            </div>
            <div className="mt-6 p-6 border border-[color:var(--ink)] bg-white">
              <div className="label-eyebrow">Fee</div>
              <div className="font-display text-4xl font-bold mt-2">{d.fee ? money(d.fee) : 'FREE'}</div>
              <button onClick={pay} disabled={busy} data-testid="class-enroll-btn" className="btn-accent w-full justify-center mt-6">{busy?'…':d.fee>0?'Enroll & pay →':'Enroll (Free) →'}</button>
            </div>
          </div>
        </aside>
      </section>
      <Footer/>
    </div>
  );
}

export function ArtistDetail() {
  const { id } = useParams();
  const [d, setD] = useState(null); const [open, setOpen] = useState(false);
  useEffect(()=>{ api.get(`/artists/${id}`).then(r=>setD(r.data)); }, [id]);
  if (!d) return <div className="p-20 text-center text-[color:var(--muted)]">Loading…</div>;
  const cover = fileUrl(d.cover_url || d.portfolio_images?.[0]) || "https://images.unsplash.com/photo-1541126274323-dbac58d14741?crop=entropy&cs=srgb&fm=jpg&q=85";
  return (
    <div data-testid="artist-detail"><Toaster/>
      <section className="relative">
        <div className="h-[50vh] bg-[color:var(--bg-3)] img-hover"><img src={cover} className="w-full h-full object-cover"/></div>
      </section>
      <section className="max-w-[1440px] mx-auto px-6 lg:px-10 -mt-20 relative">
        <div className="bg-white border border-[color:var(--ink)] p-8 lg:p-12">
          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              {d.featured && <div className="tag tag-accent mb-3">★ Featured artist</div>}
              <div className="label-eyebrow text-[color:var(--muted)]">{d.city}, {d.country}</div>
              <h1 className="font-display font-bold text-6xl lg:text-8xl leading-[0.9] mt-4 tracking-tighter">{d.stage_name}</h1>
              <div className="mt-4 flex flex-wrap gap-2">{(d.specializations||[]).map(s=><span key={s} className="tag">{s}</span>)}</div>
              <p className="mt-8 text-[color:var(--ink-2)] whitespace-pre-line leading-relaxed">{d.bio}</p>
              {d.achievements?.length>0 && <div className="mt-8"><h3 className="label-eyebrow mb-3">Achievements</h3><ul className="space-y-1 text-[color:var(--ink-2)]">{d.achievements.map((a,i)=><li key={i}>◆ {a}</li>)}</ul></div>}
            </div>
            <aside className="lg:col-span-4">
              <div className="flex flex-col gap-3">
                <button onClick={()=>setOpen(true)} data-testid="artist-book-btn" className="btn-accent justify-center">Book this artist →</button>
                <div className="text-sm text-[color:var(--muted)] hairline pb-4">Experience · <b className="text-[color:var(--ink)]">{d.experience_years} yrs</b></div>
                {d.social_links?.instagram && <a href={d.social_links.instagram} target="_blank" rel="noreferrer" className="link-under inline-flex items-center gap-2 text-sm"><Instagram size={14}/>Instagram</a>}
                {d.social_links?.youtube && <a href={d.social_links.youtube} target="_blank" rel="noreferrer" className="link-under inline-flex items-center gap-2 text-sm"><Youtube size={14}/>YouTube</a>}
                {d.social_links?.website && <a href={d.social_links.website} target="_blank" rel="noreferrer" className="link-under inline-flex items-center gap-2 text-sm"><Globe size={14}/>Website</a>}
              </div>
            </aside>
          </div>
          {d.portfolio_images?.length>0 && <div className="mt-10"><h3 className="label-eyebrow mb-4">Portfolio</h3><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{d.portfolio_images.map((p,i)=><div key={i} className="aspect-square img-hover bg-[color:var(--bg-3)]"><img src={fileUrl(p)} className="w-full h-full object-cover"/></div>)}</div></div>}
        </div>
      </section>
      {open && <BookingModal artist={d} onClose={()=>setOpen(false)}/>}
      <Footer/>
    </div>
  );
}

function BookingModal({ artist, onClose }) {
  const [f, setF] = useState({ company_name:'', contact_person:'', email:'', phone:'', project_name:'', city:'', date:'', budget:'', requirements:'' });
  const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault(); setBusy(true);
    try {
      await api.post("/bookings", { ...f, artist_id: artist.id, budget: f.budget?parseFloat(f.budget):null });
      toast.success("Booking request received. Our team will reach out shortly.");
      onClose();
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-auto" onClick={onClose} data-testid="booking-modal">
      <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-auto border border-[color:var(--ink)]" onClick={e=>e.stopPropagation()}>
        <div className="p-8 hairline flex items-start justify-between">
          <div><div className="label-eyebrow text-[color:var(--accent)]">Book · {artist.stage_name}</div><h3 className="font-display text-3xl font-bold mt-2">Project brief</h3></div>
          <button onClick={onClose} data-testid="booking-close"><X/></button>
        </div>
        <form onSubmit={submit} className="p-8 space-y-4">
          {[["company_name","Company / Brand"],["contact_person","Contact person"],["email","Email","email"],["phone","Phone"],["project_name","Project / Event name"],["city","City"],["date","Date","date"],["budget","Budget (optional)","number"]].map(([k,l,t])=>(
            <Row key={k} label={l} type={t||'text'} v={f[k]} on={v=>setF({...f,[k]:v})} tid={`booking-${k}`} required={k!=='budget'}/>
          ))}
          <label className="block"><span className="label-eyebrow block mb-2">Requirements</span>
            <textarea rows={4} value={f.requirements} required data-testid="booking-requirements" onChange={e=>setF({...f, requirements: e.target.value})} className="w-full px-4 py-3 border border-[color:var(--line)] focus:border-[color:var(--accent)] focus:outline-none"/></label>
          <button disabled={busy} data-testid="booking-submit" className="btn-accent w-full justify-center">{busy?'…':'Send booking request →'}</button>
          <p className="text-xs text-[color:var(--muted)] text-center">Our team reviews every request within 24h.</p>
        </form>
      </div>
    </div>
  );
}
