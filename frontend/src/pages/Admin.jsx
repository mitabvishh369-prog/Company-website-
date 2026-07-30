import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatErr, fileUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Footer from "@/components/Footer";
import { toast, Toaster } from "sonner";
import { Star } from "lucide-react";

export default function Admin() {
  const { user, loading } = useAuth(); const nav = useNavigate();
  const [pending, setPending] = useState({ events:[], classes:[], artists:[] });
  const [bookings, setBookings] = useState([]);
  const [allArtists, setAllArtists] = useState([]);
  const [stats, setStats] = useState({});
  const [tab, setTab] = useState("events");
  useEffect(()=>{ if (!loading && (!user || user.role !== 'admin')) nav('/'); }, [user, loading, nav]);
  const load = ()=>{
    api.get("/admin/pending").then(r=>setPending(r.data)).catch(()=>{});
    api.get("/admin/stats").then(r=>setStats(r.data)).catch(()=>{});
    api.get("/bookings").then(r=>setBookings(r.data)).catch(()=>{});
    api.get("/artists", { params: { status: 'approved' }}).then(r=>setAllArtists(r.data)).catch(()=>{});
  };
  useEffect(()=>{ if (user?.role==='admin') load(); }, [user]);
  const act = async (kind, id, status) => {
    try { await api.patch(`/admin/${kind}/${id}`, { status }); toast.success(`Marked ${status}`); load(); }
    catch (e) { toast.error(formatErr(e)); }
  };
  const toggleFeature = async (aid, featured) => {
    try { await api.patch(`/admin/artists/${aid}/feature`, { featured }); toast.success(featured?"Featured":"Un-featured"); load(); }
    catch (e) { toast.error(formatErr(e)); }
  };
  if (!user || user.role !== 'admin') return null;
  return (
    <div data-testid="admin-page"><Toaster richColors position="top-right"/>
      <section className="max-w-[1440px] mx-auto px-6 lg:px-10 pt-12">
        <div className="label-eyebrow text-[color:var(--accent)]">Admin console</div>
        <h1 className="font-display font-bold text-6xl md:text-8xl leading-[0.9] mt-3 tracking-tighter">MODERATE.</h1>
      </section>
      <section className="max-w-[1440px] mx-auto px-6 lg:px-10 grid grid-cols-2 md:grid-cols-4 gap-3 mt-10">
        {[['Users', stats.users],['Events (approved)', stats.events_approved],['Classes (approved)', stats.classes_approved],['Artists (approved)', stats.artists_approved],['Featured artists', stats.artists_featured],['Bookings', stats.bookings],['Registrations', stats.registrations],['Active subs', stats.subscriptions_active],['Total commission', `₹${stats.total_commission ?? 0}`]].map(([k,v])=>(
          <div key={k} className="card p-5"><div className="label-eyebrow text-[color:var(--muted)]">{k}</div><div className="font-display text-4xl font-bold mt-1">{v ?? '—'}</div></div>
        ))}
      </section>
      <section className="max-w-[1440px] mx-auto px-6 lg:px-10 mt-10 border-b border-[color:var(--line-dark)]">
        <div className="flex gap-6 overflow-x-auto">
          {["events","classes","artists","featured","bookings"].map(t=><button key={t} onClick={()=>setTab(t)} data-testid={`admin-tab-${t}`} className={`py-4 label-eyebrow whitespace-nowrap ${tab===t?'text-[color:var(--accent)] border-b-2 border-[color:var(--accent)] -mb-px':'text-[color:var(--ink-2)]'}`}>{t}</button>)}
        </div>
      </section>
      <section className="max-w-[1440px] mx-auto px-6 lg:px-10 py-10">
        {(tab==='events' || tab==='classes' || tab==='artists') && (
          pending[tab]?.length===0 ? <p className="py-16 text-center text-[color:var(--muted)]">Nothing pending. 🎉</p> :
          <div className="space-y-3">{pending[tab].map(it=>(
            <div key={it.id} className="card p-5 flex items-start gap-4" data-testid={`admin-${tab}-row`}>
              <div className="w-24 h-24 bg-[color:var(--bg-3)] shrink-0"><img src={fileUrl(it.flyers?.[0]||it.poster_url||it.avatar_url||it.images?.[0]||it.portfolio_images?.[0])} className="w-full h-full object-cover"/></div>
              <div className="flex-1">
                <h3 className="font-display text-2xl font-bold">{it.title || it.stage_name}</h3>
                <div className="text-xs text-[color:var(--muted)] mt-1">{it.art_form} · {it.city}</div>
                <p className="text-sm text-[color:var(--ink-2)] mt-2 line-clamp-2">{it.description || it.bio}</p>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={()=>act(tab, it.id, 'approved')} data-testid={`approve-${it.id}`} className="btn-accent text-sm">Approve</button>
                <button onClick={()=>act(tab, it.id, 'rejected')} data-testid={`reject-${it.id}`} className="btn-outline text-sm">Reject</button>
              </div>
            </div>
          ))}</div>
        )}
        {tab==='featured' && (
          allArtists.length===0 ? <p className="py-16 text-center text-[color:var(--muted)]">No approved artists yet.</p> :
          <div className="grid md:grid-cols-2 gap-3">{allArtists.map(a=>(
            <div key={a.id} className="card p-4 flex items-center gap-4" data-testid={`feature-row-${a.id}`}>
              <div className="w-16 h-16 bg-[color:var(--bg-3)] shrink-0"><img src={fileUrl(a.avatar_url||a.portfolio_images?.[0])} className="w-full h-full object-cover"/></div>
              <div className="flex-1">
                <h3 className="font-display text-xl font-bold">{a.stage_name}</h3>
                <div className="text-xs text-[color:var(--muted)]">{(a.specializations||[]).slice(0,3).join(' · ')} · {a.city}</div>
              </div>
              <button onClick={()=>toggleFeature(a.id, !a.featured)} data-testid={`toggle-feature-${a.id}`} className={a.featured?"btn-accent text-sm":"btn-outline text-sm"}><Star size={14} className={a.featured?'fill-white':''}/> {a.featured?'Featured':'Feature'}</button>
            </div>
          ))}</div>
        )}
        {tab==='bookings' && (
          bookings.length===0 ? <p className="py-16 text-center text-[color:var(--muted)]">No booking requests yet.</p> :
          <div className="space-y-3">{bookings.map(b=>(
            <div key={b.id} className="card p-5" data-testid={`booking-row-${b.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="label-eyebrow text-[color:var(--accent)]">Book {b.artist_name}</div>
                  <h3 className="font-display text-xl font-bold mt-1">{b.project_name} · {b.company_name}</h3>
                  <div className="text-xs text-[color:var(--muted)] mt-1">{b.city} · {b.date} · ₹{b.budget||'—'}</div>
                  <p className="text-sm text-[color:var(--ink-2)] mt-2">{b.requirements}</p>
                  <div className="text-xs mt-2">Contact: <b>{b.contact_person}</b> · {b.email} · {b.phone}</div>
                </div>
                <span className="tag">{b.status}</span>
              </div>
            </div>
          ))}</div>
        )}
      </section>
      <Footer/>
    </div>
  );
}
