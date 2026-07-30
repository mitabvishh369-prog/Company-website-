import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { Menu, X, LogOut, User } from "lucide-react";

const links = [
  { to: "/events", label: "Events" },
  { to: "/classes", label: "Classes" },
  { to: "/artists", label: "Artists" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl hairline" data-testid="site-nav">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3" data-testid="nav-logo">
          <span className="w-8 h-8 bg-[color:var(--ink)] text-white flex items-center justify-center font-display font-bold text-lg">C</span>
          <span className="font-display text-xl font-bold tracking-tight">COSMIC · ELEMENTAL</span>
        </Link>
        <nav className="hidden lg:flex items-center gap-9">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} data-testid={`nav-${l.label.toLowerCase()}`} className={({isActive}) => `link-under text-sm font-semibold ${isActive?'text-[color:var(--accent)]':'text-[color:var(--ink)]'}`}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden lg:flex items-center gap-3">
          {user ? (
            <>
              <Link to="/dashboard" className="btn-outline text-sm" data-testid="nav-dashboard"><User size={14}/> {user.name?.split(' ')[0]}</Link>
              {user.role === 'admin' && <Link to="/admin" className="text-sm font-semibold link-under" data-testid="nav-admin">Admin</Link>}
              <button onClick={()=>{logout(); nav('/');}} className="text-sm font-semibold text-[color:var(--ink-2)] hover:text-[color:var(--accent)] transition-colors flex items-center gap-1" data-testid="nav-logout"><LogOut size={14}/> Logout</button>
            </>
          ) : (
            <>
              <Link to="/auth" className="text-sm font-semibold link-under" data-testid="nav-login">Log in</Link>
              <Link to="/auth?mode=signup" className="btn-accent text-sm" data-testid="nav-signup">Join the platform →</Link>
            </>
          )}
        </div>
        <button className="lg:hidden" onClick={()=>setOpen(!open)} data-testid="nav-mobile-toggle">{open?<X/>:<Menu/>}</button>
      </div>
      {open && (
        <div className="lg:hidden hairline-dark bg-white px-6 py-6 space-y-4" data-testid="nav-mobile-menu">
          {links.map(l=><NavLink key={l.to} to={l.to} onClick={()=>setOpen(false)} className="block font-display text-2xl">{l.label}</NavLink>)}
          {!user && <Link to="/auth" onClick={()=>setOpen(false)} className="btn-accent w-full justify-center">Join</Link>}
          {user && <button onClick={()=>{logout();setOpen(false);nav('/');}} className="btn-outline w-full justify-center">Logout</button>}
        </div>
      )}
    </header>
  );
}
