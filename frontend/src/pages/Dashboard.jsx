import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, formatErr, fileUrl } from "@/lib/api";
import Footer from "@/components/Footer";
import { toast, Toaster } from "sonner";
import { Plus, Upload, X, Edit3, Trash2, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const STATUS_BADGE = { pending: {c:"bg-yellow-100 text-yellow-900", i:Clock, l:"Pending review"}, approved: {c:"bg-green-100 text-green-900", i:CheckCircle2, l:"Approved"}, rejected: {c:"bg-red-100 text-red-900", i:XCircle, l:"Rejected"} };

export default function Dashboard() {
  const { user, loading, setUser } = useAuth(); const nav = useNavigate();
  const [tab, setTab] = useState("events");
  useEffect(()=>{ if (!loading && !user) nav("/auth"); }, [user, loading, nav]);
  if (!user) return null;
  const roles = ["events","classes","artist"];
  return (
    <div data-testid="dashboard-page"><Toaster richColors position="top-right"/>
      <section className="max-w-[1440px] mx-auto px-6 lg:px-10 pt-12">
        <div className="label-eyebrow text-[color:var(--muted)]">Signed in as {user.role}</div>
        <h1 className="font-display font-bold text-6xl md:text-8xl leading-[0.9] mt-3 tracking-tighter">HELLO, {user.name?.split(' ')[0]?.toUpperCase()}.</h1>
      </section>
      <section className="max-w-[1440px] mx-auto px-6 lg:px-10 mt-10 border-b border-[color:var(--line-dark)]">
        <div className="flex gap-6">
          {roles.map(t => <button key={t} onClick={()=>setTab(t)} data-testid={`dash-tab-${t}`} className={`py-4 label-eyebrow ${tab===t?'text-[color:var(--accent)] border-b-2 border-[color:var(--accent)] -mb-px':'text-[color:var(--ink-2)]'}`}>{t}</button>)}
        </div>
      </section>
      <section className="max-w-[1440px] mx-auto px-6 lg:px-10 py-10">
        {tab==='events' && <ManageList kind="events"/>}
        {tab==='classes' && <ManageList kind="classes"/>}
        {tab==='artist' && <ArtistProfileForm/>}
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
      {items.length===0 ? <p className="py-16 text-center text-[color:var(--muted)]">Nothing yet. Create your first {kind==='events'?'event':'class'} above.</p> :
        <div className="space-y-3">
          {items.map(it=>{ const s = STATUS_BADGE[it.status] || STATUS_BADGE.pending; const S = s.i; return (
            <div key={it.id} className="card p-5 flex items-center gap-6" data-testid={`${kind}-row-${it.id}`}>
              <div className="w-20 h-20 bg-[color:var(--bg-3)] shrink-0"><img src={fileUrl(it.poster_url||it.images?.[0])} className="w-full h-full object-cover"/></div>
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
    title:'', description:'', event_type:'Battle', art_form:'', date:'', venue:'', city:'', country:'',
    registration_deadline:'', registration_fee:0, prize_money:0, capacity:0, poster_url:'',
    judges:[], guest_artists:[], sponsors:[], schedule:'', rules:'', skill_level:'All Levels',
    contact_email:'', contact_phone:''
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
  const onPoster = async e => { const file = e.target.files?.[0]; if (!file) return; const url = await uploadFile(file); setF({...f, [kind==='events'?'poster_url':'images']: kind==='events'?url:[...(f.images||[]),url]}); toast.success("Uploaded"); };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 p-4 overflow-auto" onClick={onClose}>
      <div className="max-w-3xl mx-auto bg-white border border-[color:var(--ink)]" onClick={e=>e.stopPropagation()}>
        <div className="p-8 hairline flex items-center justify-between">
          <h3 className="font-display text-3xl font-bold">{initial?'Edit':'New'} {kind==='events'?'event':'class'}</h3>
          <button onClick={onClose}><X/></button>
        </div>
        <form onSubmit={submit} className="p-8 grid md:grid-cols-2 gap-4">
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
            <Input label="Registration fee (USD)" type="number" v={f.registration_fee} on={v=>setF({...f,registration_fee:parseFloat(v)||0})}/>
            <Input label="Prize money (USD)" type="number" v={f.prize_money} on={v=>setF({...f,prize_money:parseFloat(v)||0})}/>
            <Input label="Capacity" type="number" v={f.capacity} on={v=>setF({...f,capacity:parseInt(v)||0})}/>
            <Input label="Skill level" v={f.skill_level} on={v=>setF({...f,skill_level:v})}/>
            <Input label="Judges (comma-sep)" v={(f.judges||[]).join(', ')} on={v=>arrField('judges',v)} col2/>
            <Input label="Guest artists (comma-sep)" v={(f.guest_artists||[]).join(', ')} on={v=>arrField('guest_artists',v)} col2/>
            <Input label="Sponsors (comma-sep)" v={(f.sponsors||[]).join(', ')} on={v=>arrField('sponsors',v)} col2/>
            <Textarea label="Schedule" v={f.schedule} on={v=>setF({...f,schedule:v})} col2/>
            <Textarea label="Rules & guidelines" v={f.rules} on={v=>setF({...f,rules:v})} col2/>
            <Input label="Contact email" type="email" v={f.contact_email} on={v=>setF({...f,contact_email:v})} />
            <Input label="Contact phone" v={f.contact_phone} on={v=>setF({...f,contact_phone:v})} />
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
            <Input label="Fee (USD)" type="number" v={f.fee} on={v=>setF({...f,fee:parseFloat(v)||0})}/>
            <Input label="Seats" type="number" v={f.seats} on={v=>setF({...f,seats:parseInt(v)||0})}/>
            <Textarea label="Instructor bio" v={f.instructor_bio} on={v=>setF({...f,instructor_bio:v})} col2/>
            <Input label="Batch timings (comma-sep)" v={(f.batch_timings||[]).join(', ')} on={v=>arrField('batch_timings',v)} col2/>
            <Input label="Contact email" type="email" v={f.contact_email} on={v=>setF({...f,contact_email:v})} />
            <Input label="Contact phone" v={f.contact_phone} on={v=>setF({...f,contact_phone:v})} />
          </>}
          <label className="md:col-span-2 border border-dashed border-[color:var(--line)] p-4 cursor-pointer flex items-center gap-3 hover:border-[color:var(--accent)] transition-colors">
            <Upload size={16}/> <span className="text-sm">Upload {kind==='events'?'poster':'image'} (max 20MB)</span>
            <input type="file" accept="image/*" onChange={onPoster} className="hidden" data-testid={`upload-${kind}`}/>
          </label>
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
  useEffect(()=>{ api.get('/artists/mine/profile').then(r=>{ if (r.data) setF({...f, ...r.data, social_links: r.data.social_links||{}}); }); // eslint-disable-next-line
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
      {f.portfolio_images?.length>0 && <div className="md:col-span-2 grid grid-cols-4 gap-2">{f.portfolio_images.map((p,i)=><div key={i} className="aspect-square bg-[color:var(--bg-3)]"><img src={fileUrl(p)} className="w-full h-full object-cover"/></div>)}</div>}
      <button disabled={busy} data-testid="artist-save" className="btn-accent md:col-span-2 justify-center">{busy?'…':'Save & submit for review →'}</button>
    </form>
  );
}
