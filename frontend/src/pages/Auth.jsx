import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Footer from "@/components/Footer";
import { formatErr } from "@/lib/api";
import { toast, Toaster } from "sonner";

export default function Auth() {
  const { login, register, startGoogle, user } = useAuth();
  const loc = useLocation(); const nav = useNavigate();
  const params = new URLSearchParams(loc.search);
  const [mode, setMode] = useState(params.get("mode") === "signup" ? "signup" : "login");
  const [role, setRole] = useState(params.get("role") || "user");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) nav("/dashboard"); }, [user, nav]);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      if (mode === "signup") await register({ ...form, role });
      else await login(form.email, form.password);
      toast.success("Welcome to Cosmic Elemental");
      nav("/dashboard");
    } catch (err) { toast.error(formatErr(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen" data-testid="auth-page">
      <Toaster richColors position="top-right"/>
      <div className="max-w-[1440px] mx-auto grid lg:grid-cols-2 min-h-[80vh]">
        <div className="hidden lg:flex flex-col justify-between p-16 bg-[color:var(--ink)] text-white">
          <div>
            <div className="label-eyebrow text-[color:var(--accent)]">Cosmic Elemental</div>
            <h1 className="font-display text-7xl font-bold leading-none mt-6">JOIN THE<br/>CREATIVE<br/>ECOSYSTEM.</h1>
          </div>
          <p className="text-white/70 max-w-md leading-relaxed">A single home for events, classes, and creative talent — trusted, curated, and built for artists.</p>
        </div>
        <div className="p-8 lg:p-16 flex flex-col justify-center">
          <div className="max-w-md w-full">
            <div className="flex gap-2 mb-8">
              <button data-testid="auth-tab-login" onClick={()=>setMode("login")} className={`label-eyebrow px-4 py-2 border ${mode==='login'?'bg-[color:var(--ink)] text-white border-[color:var(--ink)]':'border-[color:var(--line)]'}`}>Log in</button>
              <button data-testid="auth-tab-signup" onClick={()=>setMode("signup")} className={`label-eyebrow px-4 py-2 border ${mode==='signup'?'bg-[color:var(--ink)] text-white border-[color:var(--ink)]':'border-[color:var(--line)]'}`}>Create account</button>
            </div>
            <h2 className="font-display text-5xl font-bold leading-none mb-6">{mode==='login' ? 'Welcome back.' : 'Start your profile.'}</h2>

            <button onClick={startGoogle} data-testid="auth-google" className="w-full btn-outline justify-center mb-6">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>
            <div className="hairline my-6"/>

            <form onSubmit={submit} className="space-y-4">
              {mode==='signup' && (
                <>
                  <Field label="Full name" data-testid="auth-name" value={form.name} onChange={v=>setForm({...form,name:v})}/>
                  <div>
                    <label className="label-eyebrow block mb-2">I am a…</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[["user","Audience"],["artist","Artist"],["organizer","Organizer"],["instructor","Instructor"]].map(([v,l])=>(
                        <button type="button" key={v} onClick={()=>setRole(v)} data-testid={`role-${v}`} className={`p-3 border text-sm font-semibold text-left ${role===v?'bg-[color:var(--accent)] text-white border-[color:var(--accent)]':'border-[color:var(--line)] hover:border-[color:var(--ink)]'}`}>{l}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <Field label="Email" type="email" data-testid="auth-email" value={form.email} onChange={v=>setForm({...form,email:v})}/>
              <Field label="Password" type="password" data-testid="auth-password" value={form.password} onChange={v=>setForm({...form,password:v})}/>
              <button disabled={busy} data-testid="auth-submit" className="btn-accent w-full justify-center">{busy?'…':(mode==='signup'?'Create account →':'Log in →')}</button>
            </form>
          </div>
        </div>
      </div>
      <Footer/>
    </div>
  );
}

function Field({ label, type='text', value, onChange, ...rest }) {
  return (
    <label className="block">
      <span className="label-eyebrow block mb-2">{label}</span>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} required
             className="w-full px-4 py-3 bg-white border border-[color:var(--line)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-light)] transition-colors"
             {...rest}/>
    </label>
  );
}
