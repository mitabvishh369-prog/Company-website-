import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatErr, BACKEND_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Footer from "@/components/Footer";
import { toast, Toaster } from "sonner";
import { Download, ShieldCheck, Plus, Star, X, Trash2, Wallet, Send, Check } from "lucide-react";

const money = (v) => `₹${(v ?? 0).toLocaleString()}`;

export default function AdminFinance() {
  const { user, loading } = useAuth(); const nav = useNavigate();
  const [tab, setTab] = useState("overview");
  useEffect(()=>{ if (!loading && (!user || user.role!=='admin')) nav('/'); }, [user, loading, nav]);
  if (!user || user.role!=='admin') return null;
  return (
    <div data-testid="admin-finance-page"><Toaster richColors position="top-right"/>
      <section className="max-w-[1440px] mx-auto px-6 lg:px-10 pt-12">
        <div className="label-eyebrow text-[color:var(--accent)]">Admin · Finance & Payouts</div>
        <h1 className="font-display font-bold text-6xl md:text-8xl leading-[0.9] mt-3 tracking-tighter">MONEY.<br/><span className="text-[color:var(--accent)]">CONTROL.</span></h1>
      </section>
      <section className="max-w-[1440px] mx-auto px-6 lg:px-10 mt-10 border-b border-[color:var(--line-dark)]">
        <div className="flex gap-6 overflow-x-auto">
          {["overview","transactions","payouts","banks"].map(t=><button key={t} onClick={()=>setTab(t)} data-testid={`fin-tab-${t}`} className={`py-4 label-eyebrow whitespace-nowrap ${tab===t?'text-[color:var(--accent)] border-b-2 border-[color:var(--accent)] -mb-px':'text-[color:var(--ink-2)]'}`}>{t}</button>)}
        </div>
      </section>
      <section className="max-w-[1440px] mx-auto px-6 lg:px-10 py-10">
        {tab==='overview' && <Overview/>}
        {tab==='transactions' && <Transactions/>}
        {tab==='payouts' && <Payouts/>}
        {tab==='banks' && <BankAccounts/>}
      </section>
      <Footer/>
    </div>
  );
}

function Overview() {
  const [s, setS] = useState({});
  useEffect(()=>{ api.get("/admin/finance/overview").then(r=>setS(r.data)).catch(()=>{}); }, []);
  const cards = [
    ["Total revenue", s.total_revenue],
    ["Subscription revenue", s.subscription_revenue],
    ["Commission revenue", s.commission_revenue],
    ["Pending payouts", s.pending_payouts],
    ["Completed payouts", s.completed_payouts],
    ["Transactions", s.total_transactions],
    ["Today", s.daily_revenue],
    ["Last 7 days", s.weekly_revenue],
    ["Last 30 days", s.monthly_revenue],
  ];
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {cards.map(([k,v])=>(
        <div key={k} className="card p-6" data-testid={`overview-${k.toLowerCase().replace(/\s/g,'-')}`}>
          <div className="label-eyebrow text-[color:var(--muted)]">{k}</div>
          <div className="font-display text-4xl font-bold mt-2 tabular-nums">{typeof v==='number' && k.toLowerCase().includes('revenue') || k.toLowerCase().includes('today') || k.toLowerCase().includes('days')?money(v):(v ?? '—')}</div>
        </div>
      ))}
    </div>
  );
}

function Transactions() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState(""); const [kind, setKind] = useState(""); const [ps, setPs] = useState("");
  useEffect(()=>{ api.get("/admin/finance/transactions", { params: { q: q||undefined, kind: kind||undefined, payment_status: ps||undefined }}).then(r=>setItems(r.data)); }, [q,kind,ps]);
  const exportCsv = () => {
    const token = localStorage.getItem("ce_token");
    fetch(`${BACKEND_URL}/api/admin/finance/transactions.csv`, { headers: { Authorization: `Bearer ${token}` }})
      .then(r=>r.blob()).then(b=>{const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='cosmic_transactions.csv';a.click();URL.revokeObjectURL(u);});
  };
  return (<div>
    <div className="flex flex-wrap gap-3 items-center mb-4">
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search email or title" data-testid="fin-search" className="flex-1 min-w-[220px] px-3 py-2 border border-[color:var(--line)]"/>
      <select value={kind} onChange={e=>setKind(e.target.value)} data-testid="fin-kind" className="px-3 py-2 border border-[color:var(--line)]"><option value="">All kinds</option><option>event</option><option>class</option><option>subscription</option></select>
      <select value={ps} onChange={e=>setPs(e.target.value)} data-testid="fin-status" className="px-3 py-2 border border-[color:var(--line)]"><option value="">All statuses</option><option>paid</option><option>pending</option><option>free</option></select>
      <button onClick={exportCsv} data-testid="fin-export" className="btn-accent"><Download size={14}/>Export CSV</button>
    </div>
    <div className="card p-2 overflow-x-auto">
      {items.length===0 ? <p className="py-10 text-center text-[color:var(--muted)]">No transactions.</p> :
      <table className="w-full text-sm">
        <thead className="text-left label-eyebrow border-b border-[color:var(--line)]"><tr>
          <th className="p-3">Transaction</th><th className="p-3">User</th><th className="p-3">Organizer</th>
          <th className="p-3">Item</th><th className="p-3">Amount</th><th className="p-3">Commission</th>
          <th className="p-3">Net</th><th className="p-3">Status</th><th className="p-3">Date</th></tr></thead>
        <tbody>{items.map(t=>(
          <tr key={t.session_id||t.id} className="border-b border-[color:var(--line)] hover:bg-[color:var(--bg-3)]" data-testid={`tx-${t.session_id||t.id}`}>
            <td className="p-3 text-xs">{(t.session_id||t.id||'').slice(0,18)}</td>
            <td className="p-3">{t.user_name||t.email}</td>
            <td className="p-3">{t.organizer_name||'—'}</td>
            <td className="p-3">{t.title||t.kind}</td>
            <td className="p-3 font-semibold">{money(t.amount)}</td>
            <td className="p-3">{money(t.commission_amount)}</td>
            <td className="p-3">{money(t.net_amount)}</td>
            <td className="p-3"><span className={`tag ${t.payment_status==='paid'?'tag-accent':''}`}>{t.payment_status}</span></td>
            <td className="p-3 text-xs text-[color:var(--muted)]">{(t.created_at||'').slice(0,16).replace('T',' ')}</td>
          </tr>))}</tbody></table>}
    </div>
  </div>);
}

function Payouts() {
  const [orgs, setOrgs] = useState([]);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState('');
  const load = () => {
    api.get("/admin/finance/payouts").then(r=>setOrgs(r.data));
    api.get("/admin/finance/payouts/history").then(r=>setHistory(r.data));
  };
  useEffect(()=>{ load(); }, []);
  const pay = async (o) => {
    if (!confirm(`Mark ${money(o.pending_amount)} payout to ${o.organizer_name} as completed?`)) return;
    setBusy(o.organizer_id);
    try {
      await api.post("/admin/finance/payouts", { organizer_id: o.organizer_id, amount: o.pending_amount, method:"bank_transfer", notes:`Payout to ${o.organizer_name}` });
      toast.success("Payout recorded"); load();
    } catch (e) { toast.error(formatErr(e)); } finally { setBusy(''); }
  };
  const exportCsv = () => {
    const token = localStorage.getItem("ce_token");
    fetch(`${BACKEND_URL}/api/admin/finance/payouts.csv`, { headers: { Authorization: `Bearer ${token}` }})
      .then(r=>r.blob()).then(b=>{const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='cosmic_payouts.csv';a.click();URL.revokeObjectURL(u);});
  };
  return (<div>
    <div className="flex items-center justify-between mb-4">
      <div className="label-eyebrow text-[color:var(--muted)]">Organizer payouts · pending amount = net earned − paid out</div>
      <button onClick={exportCsv} data-testid="payouts-export" className="btn-outline text-sm"><Download size={14}/>Export payouts CSV</button>
    </div>
    {orgs.length===0 ? <p className="py-10 text-center text-[color:var(--muted)]">No paid registrations yet.</p> :
      <div className="space-y-3">{orgs.map(o=>(
        <div key={o.organizer_id} className="card p-5" data-testid={`payout-org-${o.organizer_id}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="label-eyebrow text-[color:var(--accent)]">Organizer</div>
              <h3 className="font-display text-2xl font-bold mt-1">{o.organizer_name}</h3>
              <div className="text-xs text-[color:var(--muted)]">{o.organizer_email} · {o.count} registrations</div>
              <div className="mt-3 flex gap-4 flex-wrap text-sm">
                <span>Gross: <b>{money(o.gross)}</b></span>
                <span>Commission: <b>{money(o.commission)}</b></span>
                <span>Net: <b>{money(o.net)}</b></span>
                <span className="text-[color:var(--accent)]">Pending: <b>{money(o.pending_amount)}</b></span>
              </div>
            </div>
            <button onClick={()=>pay(o)} disabled={busy===o.organizer_id || o.pending_amount<=0} data-testid={`payout-approve-${o.organizer_id}`} className="btn-accent text-sm"><Send size={14}/>{o.pending_amount>0?'Mark paid':'Fully paid'}</button>
          </div>
        </div>
      ))}</div>}
    {history.length>0 && (<div className="mt-10">
      <h3 className="label-eyebrow mb-3">Payout history</h3>
      <div className="card p-2 overflow-x-auto"><table className="w-full text-sm">
        <thead className="label-eyebrow text-left border-b border-[color:var(--line)]"><tr><th className="p-3">Date</th><th className="p-3">Organizer</th><th className="p-3">Amount</th><th className="p-3">Method</th><th className="p-3">Reference</th><th className="p-3">Status</th></tr></thead>
        <tbody>{history.map(h=><tr key={h.id} className="border-b border-[color:var(--line)]" data-testid={`payout-history-${h.id}`}><td className="p-3 text-xs">{(h.processed_at||h.created_at||'').slice(0,16).replace('T',' ')}</td><td className="p-3">{h.organizer_id}</td><td className="p-3 font-semibold">{money(h.amount)}</td><td className="p-3">{h.method}</td><td className="p-3 text-xs">{h.reference||'—'}</td><td className="p-3"><span className="tag tag-accent"><Check size={10}/>{h.status}</span></td></tr>)}</tbody>
      </table></div>
    </div>)}
  </div>);
}

function BankAccounts() {
  const [banks, setBanks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [otpFor, setOtpFor] = useState(null);
  const [otp, setOtp] = useState('');
  const load = () => api.get("/admin/finance/bank-accounts").then(r=>setBanks(r.data));
  useEffect(()=>{ load(); }, []);
  const del = async id => { if (!confirm("Delete this bank account?")) return; await api.delete(`/admin/finance/bank-accounts/${id}`); load(); };
  const setPrimary = async id => { await api.patch(`/admin/finance/bank-accounts/${id}/primary`); toast.success("Primary account updated"); load(); };
  const sendOtp = async id => { try { const { data } = await api.post(`/admin/finance/bank-accounts/${id}/otp-send`); toast.success(`OTP sent to ${data.sent_to}`); setOtpFor(id); } catch(e) { toast.error(formatErr(e)); } };
  const verify = async () => { try { await api.patch(`/admin/finance/bank-accounts/${otpFor}/verify`, { otp }); toast.success("Account verified"); setOtpFor(null); setOtp(''); load(); } catch(e) { toast.error(formatErr(e)); } };
  return (<div>
    <div className="flex items-center justify-between mb-4">
      <p className="text-[color:var(--ink-2)] flex items-center gap-2"><ShieldCheck size={16}/>Connect Cosmic Elemental&rsquo;s business bank account. All platform revenue is credited here.</p>
      <button onClick={()=>setShowForm(true)} data-testid="add-bank-btn" className="btn-accent"><Plus size={16}/>Add bank account</button>
    </div>
    {banks.length===0 ? <p className="py-16 text-center text-[color:var(--muted)]">No bank accounts yet.</p> :
      <div className="space-y-3">{banks.map(b=>(
        <div key={b.id} className="card p-5" data-testid={`bank-row-${b.id}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-2xl font-bold">{b.bank_name}</h3>
                {b.is_primary && <span className="tag tag-accent"><Star size={10}/>Primary</span>}
                {b.verified ? <span className="tag tag-accent"><ShieldCheck size={10}/>Verified</span> : <span className="tag">Unverified</span>}
              </div>
              <div className="text-sm text-[color:var(--ink-2)] mt-1">{b.account_holder} · {b.account_type} · A/C {b.account_number_masked} · IFSC {b.ifsc_code}</div>
              {b.branch && <div className="text-xs text-[color:var(--muted)] mt-1">{b.branch}</div>}
            </div>
            <div className="flex flex-col gap-2">
              {!b.verified && <button onClick={()=>sendOtp(b.id)} data-testid={`bank-otp-${b.id}`} className="btn-accent text-sm">Send OTP</button>}
              {!b.is_primary && <button onClick={()=>setPrimary(b.id)} data-testid={`bank-primary-${b.id}`} className="btn-outline text-sm"><Star size={12}/>Make primary</button>}
              <button onClick={()=>del(b.id)} className="text-red-600 text-sm hover:text-red-800"><Trash2 size={14}/>Delete</button>
            </div>
          </div>
        </div>
      ))}</div>}
    {showForm && <BankForm onClose={()=>{setShowForm(false); load();}}/>}
    {otpFor && (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" data-testid="otp-modal">
        <div className="bg-white border border-[color:var(--ink)] p-6 max-w-sm w-full">
          <div className="flex justify-between items-start"><h3 className="font-display text-2xl font-bold">Enter OTP</h3><button onClick={()=>setOtpFor(null)}><X/></button></div>
          <p className="text-sm text-[color:var(--muted)] mt-2">Enter the 6-digit code sent to your admin email.</p>
          <input value={otp} onChange={e=>setOtp(e.target.value)} maxLength={6} inputMode="numeric" data-testid="otp-input" className="mt-4 w-full px-4 py-3 border border-[color:var(--line)] text-center text-2xl font-display tracking-[0.4em]"/>
          <button onClick={verify} data-testid="otp-verify" className="btn-accent w-full justify-center mt-4">Verify →</button>
        </div>
      </div>
    )}
  </div>);
}

function BankForm({ onClose }) {
  const [f, setF] = useState({ account_holder:'', account_number:'', ifsc_code:'', bank_name:'', branch:'', account_type:'current', is_primary: false });
  const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault(); setBusy(true);
    try { await api.post("/admin/finance/bank-accounts", f); toast.success("Bank account added. Send OTP to verify."); onClose(); }
    catch (e) { toast.error(formatErr(e)); } finally { setBusy(false); }
  };
  const R = ({label,k,type='text',required}) => (<label className="block"><span className="label-eyebrow block mb-2">{label}</span>
    <input type={type} value={f[k]} required={required} onChange={e=>setF({...f,[k]:e.target.value})} className="w-full px-4 py-3 border border-[color:var(--line)] focus:border-[color:var(--accent)] focus:outline-none"/></label>);
  return (
    <div className="fixed inset-0 z-50 bg-black/60 p-4 overflow-auto" onClick={onClose} data-testid="bank-form">
      <div className="max-w-lg mx-auto bg-white border border-[color:var(--ink)]" onClick={e=>e.stopPropagation()}>
        <div className="p-6 hairline flex justify-between items-center"><h3 className="font-display text-2xl font-bold">Add bank account</h3><button onClick={onClose}><X/></button></div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <R label="Account holder name" k="account_holder" required/>
          <R label="Bank name" k="bank_name" required/>
          <R label="Account number" k="account_number" required/>
          <R label="IFSC code" k="ifsc_code" required/>
          <R label="Branch" k="branch"/>
          <label className="block"><span className="label-eyebrow block mb-2">Account type</span>
            <select value={f.account_type} onChange={e=>setF({...f,account_type:e.target.value})} className="w-full px-4 py-3 border border-[color:var(--line)]"><option>current</option><option>savings</option></select></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_primary} onChange={e=>setF({...f,is_primary:e.target.checked})} data-testid="bank-primary-check"/>Make this the primary payout account</label>
          <button disabled={busy} data-testid="bank-submit" className="btn-accent w-full justify-center">{busy?'…':'Save & continue →'}</button>
          <p className="text-xs text-[color:var(--muted)] text-center">Verification is via OTP sent to admin email.</p>
        </form>
      </div>
    </div>
  );
}
