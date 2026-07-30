import { Link } from "react-router-dom";
export default function Footer() {
  return (
    <footer className="mt-24 border-t border-[color:var(--line-dark)] bg-white">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-16 grid md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <div className="font-display text-4xl md:text-5xl font-bold tracking-tight leading-none">COSMIC<br/>ELEMENTAL<span className="text-[color:var(--accent)]">.</span></div>
          <p className="mt-6 text-[color:var(--ink-2)] max-w-md leading-relaxed">A global creative ecosystem — where artists, educators, organizers, brands & audiences build sustainable careers together.</p>
        </div>
        <div>
          <div className="label-eyebrow mb-4">Discover</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/events" className="link-under">Events</Link></li>
            <li><Link to="/classes" className="link-under">Classes</Link></li>
            <li><Link to="/artists" className="link-under">Artists</Link></li>
          </ul>
        </div>
        <div>
          <div className="label-eyebrow mb-4">Platform</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/auth?mode=signup" className="link-under">Create account</Link></li>
            <li><Link to="/dashboard" className="link-under">Dashboard</Link></li>
            <li><Link to="/about" className="link-under">About</Link></li>
          </ul>
        </div>
      </div>
      <div className="hairline" />
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-6 flex items-center justify-between text-xs text-[color:var(--muted)]">
        <span>© {new Date().getFullYear()} Cosmic Elemental. Built for the global creative community.</span>
        <span className="label-eyebrow">MVP · Phase 1</span>
      </div>
    </footer>
  );
}
