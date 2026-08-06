import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, formatErr, fileUrl, BACKEND_URL } from "@/lib/api";
import Footer from "@/components/Footer";
import { toast, Toaster } from "sonner";
import { Plus, Upload, X, Edit3, Trash2, Clock, CheckCircle2, XCircle, Download, GripVertical, Search, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const STATUS_BADGE = { pending: {c:"bg-yellow-100 text-yellow-900", i:Clock, l:"Pending review"}, approved: {c:"bg-green-100 text-green-900", i:CheckCircle2, l:"Approved"}, rejected: {c:"bg-red-100 text-red-900", i:XCircle, l:"Rejected"} };

export default function Dashboard() {
  const { user, loading } = useAuth(); const nav = useNavigate();
  const [tab, setTab] = useState("events");
  const [sub, setSub] = useState(null);
  useEffect(()=>{ if (!loading && !user) nav("/auth"); }, [user, loading, nav]);
  useEffect(()=>{ if (user) api.get("/subscriptions/mine").then(r=>setSub(r.data)).catch(()=>{}); }, [user]);
  if (!user) return null;
  const roles = ["events","registrations","classes","artist","subscription"];
  return (
    <div data-testid="dashboard-page"><Toaster richColors position="top-right"/>
      <section className="max-w-[1440px] mx-auto px-6 lg:px-10 pt-12">
        <div className="label-eyebrow text-[color:var(--muted)]">Signed in as {user.role} · {sub?.plan ? `${sub.plan} plan · ${sub.plan_status}` : 'no active plan'}</div>
        <h1 className="font-display font-bold text-6xl md:text-8xl leading-[0.9] mt-3 tracking-tighter">HELLO, {user.name?.split(' ')[0]?.toUpperCase()}.</h1>
      </section>
      <section className="max-w-[1440px] mx-auto px-6 lg:px-10 mt-10 border-b border-[color:var(--line-dark)]">
        <div className="flex gap-6 overflow-x-auto">
          {roles.map(t => <button key={t} onClick={()=>setTab(t)} data-testid={`dash-tab-${t}`} className={`py-4 label-eyebrow whitespace-nowrap ${tab===t?'text-[color:var(--accent)] border-b-2 border-[color:var(--accent)] -mb-px':'text-[color:var(--ink-2)]'}`}>{t}</button>)}
        </div>
      </section>
      <section className="max-w-[1440px] mx-auto px-6 lg:px-10 py-10">
        {tab==='events' && <ManageList kind="events"/>}
        {tab==='classes' && <ManageList kind="classes"/>}
        {tab==='artist' && <ArtistProfileForm/>}
        {tab==='registrations' && <RegistrationsTab/>}
        {tab==='subscription' && <SubscriptionTab sub={sub} refresh={()=>api.get("/subscriptions/mine").then(r=>setSub(r.data))}/>}
      </section>
      <Footer/>
    </div>
  );
}

function ManageList({ kind }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const load = ()=> api.get(`/${kind}`, { params: { mine: true, status: "any" }}).then(r=>setItems(r.data));
  useEffect(()=>{ load(); }, [kind]);
  const del = async id => { if (!confirm("Delete?")) return; await api.delete(`/${kind}/${id}`); load(); };
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-[color:var(--ink-2)]">Manage your {kind}. New submissions go to admin for review.</p>
        <button onClick={()=>{setEditing(null); setOpen(true);}} data-testid={`new-${kind}-btn`} className="btn-accent"><Plus size={16}/> New {kind==='events'?'event':'class'}</button>
      </div>
      {items.length===0 ? <p className="py-16 text-center text-[color:var(--muted)]">Nothing yet.</p> :
        <div className="space-y-3">
          {items.map(it=>{ const s = STATUS_BADGE[it.status] || STATUS_BADGE.pending; const S = s.i; return (
            <div key={it.id} className="card p-5 flex items-center gap-6" data-testid={`${kind}-row-${it.id}`}>
              <div className="w-20 h-20 bg-[color:var(--bg-3)] shrink-0"><img src={fileUrl(it.flyers?.[0]||it.poster_url||it.images?.[0])} className="w-full h-full object-cover"/></div>
              <div className="flex-1">
                <h3 className="font-display text-2xl font-bold">{it.title}</h3>
                <div className="text-xs text-[color:var(--muted)] mt-1">{it.art_form} · {it.city}</div>
                <span className={`inline-flex items-center gap-1 mt-2 text-xs px-2 py-1 ${s.c}`}><S size={12}/>{s.l}</span>
              </div>
              <button onClick={()=>{setEditing(it); setOpen(true);}} className="btn-outline text-sm"><Edit3 size={14}/>Edit</button>
              <button onClick={()=>del(it.id)} className="text-red-600 hover:text-red-800"><Trash2 size={16}/></button>
            </div>
          );})}
        </div>}
      {open && <ItemForm kind={kind} initial={editing} onClose={()=>{setOpen(false); load();}}/>}
    </div>
  );
}

async function uploadFile(file) {
  const fd = new FormData(); fd.append("file", file);
  const { data } = await api.post("/uploads", fd, { headers: { "Content-Type": "multipart/form-data" }});
  return data.url;
}

function ItemForm({ kind, initial, onClose }) {
  const defaults = kind==='events' ? {
    title:'', description:'', event_type:'Battle', art_form:'', date:'', venue:'', city:'', state:'', country:'',
    registration_deadline:'', registration_fee:0, prize_money:0, capacity:0, poster_url:'',
    judges:[], guest_artists:[], sponsors:[], schedule:'', rules:'', skill_level:'All Levels',
    contact_email:'', contact_phone:'', flyers:[], art_categories:[], ticket_types:[]
  } : {
    title:'', description:'', instructor_name:'', instructor_bio:'', art_form:'', skill_level:'Beginner',
    mode:'Offline', venue:'', city:'', country:'', schedule:'', duration:'', fee:0, seats:0,
    batch_timings:[], images:[], contact_email:'', contact_phone:''
  };
  const [f, setF] = useState({ ...defaults, ...(initial||{}) });
  const [busy, setBusy] = useState(false);
  const arrField = (k,v)=> setF({...f, [k]: v.split(',').map(x=>x.trim()).filter(Boolean)});
  const submit = async e => {
    e.preventDefault(); setBusy(true);
    try {
      if (initial) await api.put(`/${kind}/${initial.id}`, f);
      else await api.post(`/${kind}`, f);
      toast.success(initial?"Updated — awaiting re-approval.":"Submitted for admin review.");
      onClose();
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };
  const addFlyer = async e => { const file = e.target.files?.[0]; if (!file) return; const url = await uploadFile(file); setF({...f, flyers:[...(f.flyers||[]), url]}); e.target.value=''; toast.success("Flyer added"); };
  const removeFlyer = (i) => setF({...f, flyers: f.flyers.filter((_,idx)=>idx!==i)});
  const moveFlyer = (i, dir) => {
    const arr = [...(f.flyers||[])]; const j = i + dir;
    if (j<0 || j>=arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setF({...f, flyers: arr});
  };
  const addTicket = () => setF({...f, ticket_types:[...(f.ticket_types||[]), {name:'Standard', price:0, _k: `t-${Date.now()}-${Math.random().toString(36).slice(2,7)}`}]});
  const updateTicket = (i, k, v) => { const arr = [...f.ticket_types]; arr[i] = {...arr[i], [k]: k==='price'?parseFloat(v)||0:v}; setF({...f, ticket_types: arr}); };
  const removeTicket = (i) => setF({...f, ticket_types: f.ticket_types.filter((_,idx)=>idx!==i)});

  return (
    <div className="fixed inset-0 z-50 bg-black/60 p-4 overflow-auto" onClick={onClose}>
      <div className="max-w-3xl mx-auto bg-white border border-[color:var(--ink)] my-4" onClick={e=>e.stopPropagation()}>
        <div className="p-6 hairline flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="font-display text-3xl font-bold">{initial?'Edit':'New'} {kind==='events'?'event':'class'}</h3>
          <button onClick={onClose}><X/></button>
        </div>
        <form onSubmit={submit} className="p-6 grid md:grid-cols-2 gap-4">
          {kind==='events' && (
            <div className="md:col-span-2 border-l-4 border-[color:var(--accent)] bg-[color:var(--accent-light)] px-4 py-3 text-sm" data-testid="commission-notice">
              <b>Cosmic Elemental fee:</b> 6% platform commission applies to paid registrations. Example: fee ₹1,000 → ₹60 commission → you receive ₹940 per registration. Applied automatically at checkout.
            </div>
          )}
          {kind==='classes' && (
            <div className="md:col-span-2 border-l-4 border-[color:var(--accent)] bg-[color:var(--accent-light)] px-4 py-3 text-sm" data-testid="commission-notice">
              <b>Cosmic Elemental fee:</b> 6% platform commission applies to paid class/workshop enrolments. Example: fee ₹1,000 → ₹60 commission → you receive ₹940 per enrolment. Applied automatically at checkout.
            </div>
          )}
          <Input label="Title" v={f.title} on={v=>setF({...f,title:v})} required col2/>
          <Textarea label="Description" v={f.description} on={v=>setF({...f,description:v})} col2/>
          {kind==='events' ? <>
            <Input label="Event type" v={f.event_type} on={v=>setF({...f,event_type:v})} />
            <Input label="Art form" v={f.art_form} on={v=>setF({...f,art_form:v})} />
            <Input label="Date" type="datetime-local" v={f.date} on={v=>setF({...f,date:v})} />
            <Input label="Registration deadline" type="datetime-local" v={f.registration_deadline||''} on={v=>setF({...f,registration_deadline:v})}/>
            <Input label="Venue" v={f.venue} on={v=>setF({...f,venue:v})} />
            <Input label="City" v={f.city} on={v=>setF({...f,city:v})} />
            <Input label="State" v={f.state||''} on={v=>setF({...f,state:v})} />
            <Input label="Country" v={f.country} on={v=>setF({...f,country:v})} />
            <Input label="Registration fee (₹)" type="number" v={f.registration_fee} on={v=>setF({...f,registration_fee:parseFloat(v)||0})}/>
            <Input label="Prize money (₹)" type="number" v={f.prize_money} on={v=>setF({...f,prize_money:parseFloat(v)||0})}/>
            <Input label="Capacity" type="number" v={f.capacity} on={v=>setF({...f,capacity:parseInt(v)||0})}/>
            <Input label="Skill level" v={f.skill_level} on={v=>setF({...f,skill_level:v})}/>
            <Input label="Judges (comma-sep)" v={(f.judges||[]).join(', ')} on={v=>arrField('judges',v)} col2/>
            <Input label="Guest artists (comma-sep)" v={(f.guest_artists||[]).join(', ')} on={v=>arrField('guest_artists',v)} col2/>
            <Input label="Sponsors (comma-sep)" v={(f.sponsors||[]).join(', ')} on={v=>arrField('sponsors',v)} col2/>
            <Input label="Art / dance categories (comma-sep)" v={(f.art_categories||[]).join(', ')} on={v=>arrField('art_categories',v)} col2/>
            <div className="md:col-span-2">
              <div className="label-eyebrow mb-2">Ticket types</div>
              <div className="space-y-2">
                {(f.ticket_types||[]).map((t,i)=>(
                  <div key={t._k || `ticket-${i}`} className="flex gap-2 items-center">
                    <input placeholder="Name (e.g. Solo)" value={t.name} onChange={e=>updateTicket(i,'name',e.target.value)} className="flex-1 px-3 py-2 border"/>
                    <input placeholder="Price" type="number" value={t.price} onChange={e=>updateTicket(i,'price',e.target.value)} className="w-32 px-3 py-2 border"/>
                    <button type="button" onClick={()=>removeTicket(i)}><Trash2 size={14} className="text-red-600"/></button>
                  </div>
                ))}
                <button type="button" onClick={addTicket} className="btn-outline text-sm"><Plus size={12}/> Add ticket type</button>
              </div>
            </div>
            <Textarea label="Schedule" v={f.schedule} on={v=>setF({...f,schedule:v})} col2/>
            <Textarea label="Rules & guidelines" v={f.rules} on={v=>setF({...f,rules:v})} col2/>
            <Input label="Contact email" type="email" v={f.contact_email} on={v=>setF({...f,contact_email:v})} />
            <Input label="Contact phone" v={f.contact_phone} on={v=>setF({...f,contact_phone:v})} />

            <div className="md:col-span-2">
              <div className="label-eyebrow mb-2">Event flyer gallery <span className="text-[color:var(--muted)] normal-case text-xs tracking-normal font-normal">— recommended 1080 × 1350 px. Order shown here = order on the event page.</span></div>
              <div className="space-y-2">
                {(f.flyers||[]).map((url, i)=>(
                  <div key={url} data-testid={`flyer-row-${i}`} className="flex items-center gap-3 p-2 border border-[color:var(--line)] bg-[color:var(--bg-2)]">
                    <div className="flex flex-col"><button type="button" onClick={()=>moveFlyer(i,-1)} className="text-[color:var(--muted)] hover:text-[color:var(--ink)] text-xs">▲</button><button type="button" onClick={()=>moveFlyer(i,1)} className="text-[color:var(--muted)] hover:text-[color:var(--ink)] text-xs">▼</button></div>
                    <GripVertical size={14} className="text-[color:var(--muted)]"/>
                    <div className="w-16 h-20 bg-[color:var(--bg-3)] shrink-0"><img src={fileUrl(url)} className="w-full h-full object-cover"/></div>
                    <span className="text-xs flex-1 truncate">{url}</span>
                    <button type="button" onClick={()=>removeFlyer(i)}><Trash2 size={14} className="text-red-600"/></button>
                  </div>
                ))}
                <label className="flex items-center gap-3 p-3 border border-dashed border-[color:var(--line)] cursor-pointer hover:border-[color:var(--accent)]">
                  <Upload size={16}/> <span className="text-sm">Add flyer (1080×1350 recommended)</span>
                  <input type="file" accept="image/*" className="hidden" onChange={addFlyer} data-testid="add-flyer"/>
                </label>
              </div>
            </div>
          </> : <>
            <Input label="Instructor name" v={f.instructor_name} on={v=>setF({...f,instructor_name:v})} />
            <Input label="Art form" v={f.art_form} on={v=>setF({...f,art_form:v})} />
            <Input label="Skill level" v={f.skill_level} on={v=>setF({...f,skill_level:v})} />
            <Input label="Mode (Online/Offline/Hybrid)" v={f.mode} on={v=>setF({...f,mode:v})} />
            <Input label="Venue" v={f.venue} on={v=>setF({...f,venue:v})} />
            <Input label="City" v={f.city} on={v=>setF({...f,city:v})} />
            <Input label="Country" v={f.country} on={v=>setF({...f,country:v})} />
            <Input label="Duration" v={f.duration} on={v=>setF({...f,duration:v})}/>
            <Input label="Schedule" v={f.schedule} on={v=>setF({...f,schedule:v})} col2/>
            <Input label="Fee (₹)" type="number" v={f.fee} on={v=>setF({...f,fee:parseFloat(v)||0})}/>
            <Input label="Seats" type="number" v={f.seats} on={v=>setF({...f,seats:parseInt(v)||0})}/>
            <Textarea label="Instructor bio" v={f.instructor_bio} on={v=>setF({...f,instructor_bio:v})} col2/>
            <Input label="Batch timings (comma-sep)" v={(f.batch_timings||[]).join(', ')} on={v=>arrField('batch_timings',v)} col2/>
            <Input label="Contact email" type="email" v={f.contact_email} on={v=>setF({...f,contact_email:v})} />
            <Input label="Contact phone" v={f.contact_phone} on={v=>setF({...f,contact_phone:v})} />
          </>}
          <button disabled={busy} data-testid={`submit-${kind}`} className="btn-accent md:col-span-2 justify-center">{busy?'…':'Submit for admin review →'}</button>
        </form>
      </div>
    </div>
  );
}

function Input({label, v, on, type='text', required, col2}) {
  return (<label className={col2?'md:col-span-2':''}><span className="label-eyebrow block mb-2">{label}</span>
    <input type={type} value={v} required={required} onChange={e=>on(e.target.value)} className="w-full px-4 py-3 border border-[color:var(--line)] focus:border-[color:var(--accent)] focus:outline-none"/></label>);
}
function Textarea({label, v, on, col2}) {
  return (<label className={col2?'md:col-span-2':''}><span className="label-eyebrow block mb-2">{label}</span>
    <textarea rows={4} value={v||''} onChange={e=>on(e.target.value)} className="w-full px-4 py-3 border border-[color:var(--line)] focus:border-[color:var(--accent)] focus:outline-none"/></label>);
}

function ArtistProfileForm() {
  const [f, setF] = useState({ stage_name:'', specializations:[], bio:'', city:'', country:'', experience_years:0, achievements:[], portfolio_images:[], avatar_url:'', social_links:{}, contact_email:'', contact_phone:'' });
  const [busy, setBusy] = useState(false);
  useEffect(()=>{ api.get('/artists/mine/profile').then(r=>{ if (r.data) setF(prev=>({...prev, ...r.data, social_links: r.data.social_links||{}})); });
    // eslint-disable-next-line
  }, []);
  const upload = async (e, key) => { const file = e.target.files?.[0]; if (!file) return; const url = await uploadFile(file); if (key==='avatar_url') setF({...f, avatar_url:url}); else setF({...f, portfolio_images:[...(f.portfolio_images||[]),url]}); toast.success("Uploaded"); };
  const submit = async e => { e.preventDefault(); setBusy(true); try { await api.post('/artists', f); toast.success("Profile submitted — awaiting admin review."); } catch(e){ toast.error(formatErr(e)); } finally { setBusy(false); } };
  const s = f.status && STATUS_BADGE[f.status];
  return (
    <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
      {s && <div className="md:col-span-2 text-sm inline-flex items-center gap-2 px-3 py-2 border border-[color:var(--line)] w-fit"><s.i size={14}/>{s.l}</div>}
      <Input label="Stage name" v={f.stage_name} on={v=>setF({...f,stage_name:v})} required/>
      <Input label="Experience (years)" type="number" v={f.experience_years} on={v=>setF({...f,experience_years:parseInt(v)||0})}/>
      <Input label="Specializations (comma-sep)" v={(f.specializations||[]).join(', ')} on={v=>setF({...f,specializations:v.split(',').map(x=>x.trim()).filter(Boolean)})} col2/>
      <Input label="City" v={f.city} on={v=>setF({...f,city:v})}/>
      <Input label="Country" v={f.country} on={v=>setF({...f,country:v})}/>
      <Textarea label="Bio" v={f.bio} on={v=>setF({...f,bio:v})} col2/>
      <Input label="Achievements (comma-sep)" v={(f.achievements||[]).join(', ')} on={v=>setF({...f,achievements:v.split(',').map(x=>x.trim()).filter(Boolean)})} col2/>
      <Input label="Instagram URL" v={f.social_links.instagram||''} on={v=>setF({...f,social_links:{...f.social_links,instagram:v}})}/>
      <Input label="YouTube URL" v={f.social_links.youtube||''} on={v=>setF({...f,social_links:{...f.social_links,youtube:v}})}/>
      <Input label="Website" v={f.social_links.website||''} on={v=>setF({...f,social_links:{...f.social_links,website:v}})}/>
      <Input label="Contact email" type="email" v={f.contact_email} on={v=>setF({...f,contact_email:v})}/>
      <label className="md:col-span-2 border border-dashed p-4 flex items-center gap-3 cursor-pointer hover:border-[color:var(--accent)]"><Upload size={14}/>Avatar<input type="file" accept="image/*" className="hidden" onChange={e=>upload(e,'avatar_url')} data-testid="upload-avatar"/></label>
      <label className="md:col-span-2 border border-dashed p-4 flex items-center gap-3 cursor-pointer hover:border-[color:var(--accent)]"><Upload size={14}/>Portfolio image<input type="file" accept="image/*" className="hidden" onChange={e=>upload(e,'portfolio')} data-testid="upload-portfolio"/></label>
      {f.portfolio_images?.length>0 && <div className="md:col-span-2 grid grid-cols-4 gap-2">{f.portfolio_images.map((p,i)=><div key={p} className="aspect-square bg-[color:var(--bg-3)]"><img src={fileUrl(p)} className="w-full h-full object-cover"/></div>)}</div>}
      <button disabled={busy} data-testid="artist-save" className="btn-accent md:col-span-2 justify-center">{busy?'…':'Save & submit for review →'}</button>
    </form>
  );
}

function RegistrationsTab() {
  const [events, setEvents] = useState([]);
  const [sel, setSel] = useState(null);
  const [regs, setRegs] = useState([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("created_at_desc");
  const [payFilter, setPayFilter] = useState("");
  useEffect(()=>{ api.get('/events', { params: { mine:true, status:'any' }}).then(r=>{ setEvents(r.data); if (r.data[0]) setSel(r.data[0]); }); }, []);
  useEffect(()=>{ if (!sel) return; api.get(`/events/${sel.id}/registrations`).then(r=>setRegs(r.data)); }, [sel]);

  const filtered = useMemo(()=>{
    let arr = regs.filter(r => (!q || (r.name+r.email+(r.phone||'')+(r.category||'')).toLowerCase().includes(q.toLowerCase())) && (!payFilter || r.payment_status===payFilter));
    if (sort==='created_at_desc') arr = arr.sort((a,b)=>(b.created_at||'').localeCompare(a.created_at||''));
    else if (sort==='created_at_asc') arr = arr.sort((a,b)=>(a.created_at||'').localeCompare(b.created_at||''));
    else if (sort==='amount_desc') arr = arr.sort((a,b)=>(b.amount||0)-(a.amount||0));
    else if (sort==='name_asc') arr = arr.sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    return arr;
  }, [regs, q, sort, payFilter]);

  const exportCsv = () => {
    if (!sel) return;
    const token = localStorage.getItem("ce_token");
    const url = `${BACKEND_URL}/api/events/${sel.id}/registrations.csv`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` }})
      .then(r=>r.blob()).then(blob => {
        const u = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href=u; a.download=`${sel.title}_registrations.csv`; a.click(); URL.revokeObjectURL(u);
      }).catch(()=>toast.error("Export failed"));
  };

  if (events.length===0) return <p className="py-16 text-center text-[color:var(--muted)]">Create an event first — registrations will show up here.</p>;

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <select value={sel?.id||''} onChange={e=>setSel(events.find(x=>x.id===e.target.value))} data-testid="reg-event-select" className="px-4 py-2 border border-[color:var(--line)]">
          {events.map(ev=><option key={ev.id} value={ev.id}>{ev.title} ({ev.status})</option>)}
        </select>
        <div className="flex items-center gap-2 flex-1 min-w-[220px] px-3 py-2 border border-[color:var(--line)]">
          <Search size={14} className="text-[color:var(--muted)]"/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name, email, phone…" data-testid="reg-search" className="flex-1 outline-none"/>
        </div>
        <select value={sort} onChange={e=>setSort(e.target.value)} data-testid="reg-sort" className="px-3 py-2 border border-[color:var(--line)]">
          <option value="created_at_desc">Newest first</option>
          <option value="created_at_asc">Oldest first</option>
          <option value="amount_desc">Amount high → low</option>
          <option value="name_asc">Name A → Z</option>
        </select>
        <select value={payFilter} onChange={e=>setPayFilter(e.target.value)} data-testid="reg-filter" className="px-3 py-2 border border-[color:var(--line)]">
          <option value="">All payments</option>
          <option value="paid">Paid</option>
          <option value="free">Free</option>
          <option value="pending">Pending</option>
        </select>
        <button onClick={exportCsv} data-testid="reg-export" className="btn-accent"><Download size={14}/> Export CSV</button>
      </div>
      <div className="card p-2 overflow-x-auto">
        {filtered.length===0 ? <p className="py-10 text-center text-[color:var(--muted)]"><Users className="inline" size={16}/> No registrations yet.</p> :
          <table className="w-full text-sm">
            <thead className="text-left label-eyebrow border-b border-[color:var(--line)]">
              <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Phone</th><th className="p-3">Category</th><th className="p-3">Ticket</th><th className="p-3">Registered</th><th className="p-3">Payment</th><th className="p-3">Amount</th><th className="p-3">Transaction</th></tr>
            </thead>
            <tbody>
              {filtered.map(r=>(
                <tr key={r.id} className="border-b border-[color:var(--line)] hover:bg-[color:var(--bg-3)]" data-testid={`reg-row-${r.id}`}>
                  <td className="p-3 font-semibold">{r.name}</td>
                  <td className="p-3">{r.email}</td>
                  <td className="p-3">{r.phone||'—'}</td>
                  <td className="p-3">{r.category||'—'}</td>
                  <td className="p-3">{r.ticket_type||'Standard'}</td>
                  <td className="p-3 text-xs text-[color:var(--muted)]">{(r.created_at||'').slice(0,16).replace('T',' ')}</td>
                  <td className="p-3"><span className={`tag ${r.payment_status==='paid'?'tag-accent':''}`}>{r.payment_status||r.status}</span></td>
                  <td className="p-3">₹{r.amount||0}</td>
                  <td className="p-3 text-xs text-[color:var(--muted)]">{(r.transaction_id||'').slice(0,20)||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>}
      </div>
    </div>
  );
}

function SubscriptionTab({ sub, refresh }) {
  const [plans, setPlans] = useState([]);
  const [busy, setBusy] = useState('');
  useEffect(()=>{ api.get('/plans').then(r=>setPlans(r.data.plans)); }, []);
  const subscribe = async (planId) => {
    setBusy(planId);
    try {
      const { data } = await api.post('/subscriptions/checkout', { plan: planId, origin_url: window.location.origin });
      if (data.free_trial) { toast.success("First month is on us."); await refresh(); }
      else window.location.href = data.checkout_url;
    } catch (e) { toast.error(formatErr(e)); }
    finally { setBusy(''); }
  };
  return (
    <div>
      {sub?.plan ? (
        <div className="card p-6 mb-6">
          <div className="label-eyebrow text-[color:var(--accent)]">Current plan</div>
          <h3 className="font-display text-4xl font-bold capitalize mt-2">{sub.plan}</h3>
          <div className="mt-2 text-sm text-[color:var(--ink-2)]">Status: <b>{sub.plan_status}</b>{sub.plan_expires_at && ` · renews/expires ${sub.plan_expires_at.slice(0,10)}`}</div>
        </div>
      ) : <p className="mb-6 text-[color:var(--ink-2)]">You&rsquo;re browsing without a plan. Grab your first month free.</p>}
      <div className="grid md:grid-cols-3 gap-4">
        {plans.map(p => (
          <div key={p.id} data-testid={`dash-plan-${p.id}`} className="card p-6">
            <div className="label-eyebrow text-[color:var(--muted)]">{p.name}</div>
            <div className="font-display text-4xl font-bold mt-2">₹{p.price}<span className="text-sm text-[color:var(--muted)] font-body font-normal"> /mo</span></div>
            <ul className="mt-4 text-sm space-y-1">{p.features.map(f=><li key={f}>◆ {f}</li>)}</ul>
            <button onClick={()=>subscribe(p.id)} disabled={busy===p.id||sub?.plan===p.id} className="btn-outline mt-4 w-full justify-center">{sub?.plan===p.id?'Active':busy===p.id?'…':'Start free month'}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
