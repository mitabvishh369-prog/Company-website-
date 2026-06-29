import { useState, useEffect } from "react";
import {
  Menu, X, ArrowRight, Search, MapPin, Calendar, Users,
  Zap, Award, BookOpen, Briefcase, Globe, Mail,
  ChevronRight, TrendingUp, CheckCircle, Camera,
  Music, Instagram, Twitter, Youtube, Heart, MessageSquare, Clock
} from "lucide-react";

type Page =
  | "home" | "events" | "artists" | "agency"
  | "opportunities" | "community" | "resources"
  | "about" | "contact" | "login" | "signup";

// ─── Data ─────────────────────────────────────────────────────────────────────

const ARTIST_TYPES = [
  "Dancers", "Singers", "Rappers", "DJs", "MCs", "Beatboxers",
  "Graffiti Artists", "Street Artists", "Photographers", "Filmmakers",
  "Designers", "Illustrators", "Fashion Designers", "Musicians",
  "Producers", "Creative Educators", "Event Organizers", "Studios",
];

const EVENTS = [
  {
    id: 1, title: "UNDERGROUND SESSIONS VOL. 12",
    genre: "Hip-Hop / Electronic", date: "Jul 18, 2026",
    location: "Berlin, Germany", img: "1540575467063-178a50c2df87",
    price: "€45", tag: "Festival"
  },
  {
    id: 2, title: "WALLS ACROSS WALLS",
    genre: "Street Art / Graffiti", date: "Aug 3, 2026",
    location: "New York, USA", img: "1529156069898-49953e39b3ac",
    price: "$30", tag: "Exhibition"
  },
  {
    id: 3, title: "THE CIPHER — OPEN MIC",
    genre: "Live Performance", date: "Jul 25, 2026",
    location: "London, UK", img: "1493225457124-a3eb161ffa5f",
    price: "£15", tag: "Open Mic"
  },
  {
    id: 4, title: "FREQUENCIES FESTIVAL",
    genre: "Multi-Genre", date: "Sep 12, 2026",
    location: "Lagos, Nigeria", img: "1501281668745-f7f57925c3b4",
    price: "₦8,500", tag: "Festival"
  },
  {
    id: 5, title: "URBAN CANVAS 2026",
    genre: "Visual Art / Design", date: "Aug 20, 2026",
    location: "Paris, France", img: "1516914589923-f105f1535f88",
    price: "€25", tag: "Exhibition"
  },
  {
    id: 6, title: "BREAKOUT DANCE BATTLE",
    genre: "Dance", date: "Jul 30, 2026",
    location: "Tokyo, Japan", img: "1547153760-18fc86324498",
    price: "¥3,000", tag: "Battle"
  },
];

const ARTISTS = [
  { id: 1, name: "Zara Okonkwo", discipline: "Visual Artist / Muralist", location: "Lagos, NG", img: "1508700115892-45ecd05ae2ad", followers: "24.3K" },
  { id: 2, name: "Marcus Chen", discipline: "Hip-Hop Producer", location: "Los Angeles, US", img: "1511671782779-c97d3d27a1d4", followers: "18.7K" },
  { id: 3, name: "Léa Dubois", discipline: "Contemporary Dancer", location: "Paris, FR", img: "1547153760-18fc86324498", followers: "31.2K" },
  { id: 4, name: "Dayo Adeyemi", discipline: "Filmmaker / Director", location: "Accra, GH", img: "1516035069371-29a1b244cc32", followers: "12.8K" },
  { id: 5, name: "Yuki Tanaka", discipline: "Graffiti Artist", location: "Tokyo, JP", img: "1529156069898-49953e39b3ac", followers: "44.1K" },
  { id: 6, name: "Amara Singh", discipline: "Fashion Designer", location: "Mumbai, IN", img: "1558171813-0eaa03a81ac7", followers: "28.6K" },
];

const FEATURES = [
  { icon: Users, title: "Artist Profiles", desc: "Showcase your work, connect with collaborators, and build your presence in the global creative community." },
  { icon: Calendar, title: "Events & Festivals", desc: "Discover, promote, and attend events worldwide — from intimate open mics to major international festivals." },
  { icon: Briefcase, title: "Opportunities", desc: "Access gigs, residencies, grants, brand deals, and creative jobs curated for independent artists." },
  { icon: Award, title: "Talent Agency", desc: "Get represented. Our talent division connects elite artists with brands, labels, and bookers globally." },
  { icon: BookOpen, title: "Resources", desc: "Masterclasses, legal templates, funding guides, and tools built specifically for the creative economy." },
  { icon: Globe, title: "Global Community", desc: "Join a borderless network of artists across 120+ countries who share, collaborate, and grow together." },
];

const STATS = [
  { value: "127K+", label: "Artists Registered" },
  { value: "8,400+", label: "Events Listed" },
  { value: "120+", label: "Countries Reached" },
  { value: "€2.3M", label: "Paid to Artists" },
];

// ─── Logo Seal ─────────────────────────────────────────────────────────────────

function CESeal({ size = 80, light = false }: { size?: number; light?: boolean }) {
  const c = light ? "#FFD400" : "#000000";
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <polygon points="40,4 76,22 76,58 40,76 4,58 4,22" stroke={c} strokeWidth="2" fill="none" />
      <polygon points="40,13 67,28 67,52 40,67 13,52 13,28" stroke={c} strokeWidth="1" fill="none" opacity="0.35" />
      <circle cx="40" cy="40" r="12" fill={c} opacity="0.08" />
      <text x="40" y="46" textAnchor="middle" fill={c} fontSize="18" fontWeight="700" fontFamily="Space Grotesk, sans-serif">CE</text>
    </svg>
  );
}

// ─── Navigation ────────────────────────────────────────────────────────────────

const NAV_ITEMS: { label: string; page: Page }[] = [
  { label: "Events", page: "events" },
  { label: "Artists", page: "artists" },
  { label: "Agency", page: "agency" },
  { label: "Opportunities", page: "opportunities" },
  { label: "Community", page: "community" },
  { label: "Resources", page: "resources" },
  { label: "About", page: "about" },
];

function Nav({ current, go }: { current: Page; go: (p: Page) => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onHero = current === "home" && !scrolled;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        onHero ? "bg-transparent" : "bg-black/97 backdrop-blur-sm border-b border-white/8"
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-[68px] flex items-center justify-between">
        <button
          onClick={() => { go("home"); setOpen(false); }}
          className="flex items-center gap-3 shrink-0"
        >
          <CESeal size={34} light={!onHero} />
          <span
            className={`font-display font-bold text-[11px] tracking-[0.25em] uppercase hidden sm:block transition-colors ${
              onHero ? "text-black" : "text-white"
            }`}
          >
            Cosmic Elemental
          </span>
        </button>

        <div className="hidden lg:flex items-center gap-7">
          {NAV_ITEMS.map(({ label, page }) => (
            <button
              key={page}
              onClick={() => go(page)}
              className={`text-[13px] font-medium tracking-wide transition-colors ${
                current === page
                  ? onHero ? "text-black font-bold" : "text-[#FFD400]"
                  : onHero ? "text-black/70 hover:text-black" : "text-white/60 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <button
            onClick={() => go("login")}
            className={`text-[13px] font-medium transition-colors ${
              onHero ? "text-black/60 hover:text-black" : "text-white/50 hover:text-white"
            }`}
          >
            Log in
          </button>
          <button
            onClick={() => go("signup")}
            className="text-[12px] font-bold px-5 py-2.5 bg-[#FFD400] text-black hover:bg-yellow-300 transition-colors tracking-[0.1em] uppercase"
          >
            Join Free
          </button>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className={`lg:hidden transition-colors ${onHero ? "text-black" : "text-white"}`}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden bg-black border-t border-white/10 px-6 py-6 flex flex-col gap-1">
          {NAV_ITEMS.map(({ label, page }) => (
            <button
              key={page}
              onClick={() => { go(page); setOpen(false); }}
              className={`text-left py-3 text-[15px] font-medium border-b border-white/8 ${
                current === page ? "text-[#FFD400]" : "text-white/70"
              }`}
            >
              {label}
            </button>
          ))}
          <div className="flex flex-col gap-3 pt-5">
            <button onClick={() => { go("login"); setOpen(false); }} className="text-white/50 text-sm font-medium text-left py-2">
              Log in
            </button>
            <button onClick={() => { go("signup"); setOpen(false); }} className="bg-[#FFD400] text-black text-sm font-bold px-5 py-3 text-center tracking-[0.1em] uppercase">
              Join Free
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

// ─── Event Card ────────────────────────────────────────────────────────────────

function EventCard({ evt }: { evt: typeof EVENTS[0] }) {
  return (
    <div className="group bg-[#111] border border-white/8 overflow-hidden cursor-pointer hover:border-[#FFD400]/40 transition-all duration-300">
      <div className="aspect-[16/9] overflow-hidden bg-zinc-900">
        <img
          src={`https://images.unsplash.com/photo-${evt.img}?w=600&h=338&fit=crop&auto=format`}
          alt={evt.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase bg-[#FFD400]/12 text-[#FFD400] px-2.5 py-1">
            {evt.tag}
          </span>
          <span className="text-white font-bold text-sm">{evt.price}</span>
        </div>
        <h3 className="font-display font-bold text-white text-[15px] mb-1.5 leading-tight tracking-wide">
          {evt.title}
        </h3>
        <p className="text-white/40 text-xs mb-4">{evt.genre}</p>
        <div className="flex items-center justify-between text-xs text-white/35">
          <span className="flex items-center gap-1.5"><Calendar size={11} />{evt.date}</span>
          <span className="flex items-center gap-1.5"><MapPin size={11} />{evt.location}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Home Page ─────────────────────────────────────────────────────────────────

function HomePage({ go }: { go: (p: Page) => void }) {
  return (
    <div>
      {/* HERO */}
      <section className="relative min-h-screen bg-[#FFD400] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg,#000 0,#000 1px,transparent 1px,transparent 64px),
                              repeating-linear-gradient(90deg,#000 0,#000 1px,transparent 1px,transparent 64px)`
          }}
        />
        <div className="absolute opacity-[0.04] pointer-events-none scale-150">
          <CESeal size={700} light={false} />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto w-full">
          <p className="text-black/50 text-[11px] font-bold tracking-[0.5em] uppercase mb-10">
            A WORLD BUILT FOR ARTISTS
          </p>

          <div className="flex flex-col items-center mb-10">
            <CESeal size={88} light={false} />
            <div className="mt-7 font-display font-bold text-black tracking-[0.1em] uppercase leading-[0.9] select-none">
              <div className="text-[clamp(2.8rem,11vw,9.5rem)]">COSMIC</div>
              <div className="text-[clamp(2.8rem,11vw,9.5rem)]">ELEMENTAL</div>
            </div>
          </div>

          <h1 className="font-display font-semibold text-black text-[clamp(1.1rem,2.8vw,2rem)] mb-5 tracking-tight">
            Where Creativity Has No Borders
          </h1>

          <p className="text-black/65 text-[15px] lg:text-[17px] max-w-2xl mx-auto mb-12 leading-relaxed">
            A global platform connecting artists, organizers, brands, educators, festivals,
            creative communities and opportunities.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => go("events")}
              className="w-full sm:w-auto px-9 py-4 bg-black text-white font-bold text-[12px] tracking-[0.2em] uppercase hover:bg-black/80 transition-colors flex items-center justify-center gap-2"
            >
              Explore Platform <ArrowRight size={14} />
            </button>
            <button
              onClick={() => go("signup")}
              className="w-full sm:w-auto px-9 py-4 border-2 border-black text-black font-bold text-[12px] tracking-[0.2em] uppercase hover:bg-black hover:text-[#FFD400] transition-all"
            >
              Join Community
            </button>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-black/35">
          <span className="text-[10px] tracking-[0.35em] uppercase font-medium">Scroll</span>
          <div className="w-px h-10 bg-black/25" />
        </div>
      </section>

      {/* MARQUEE */}
      <section className="bg-black border-y border-white/10 py-[14px] overflow-hidden">
        <div className="flex gap-0 whitespace-nowrap" style={{ animation: "marquee 35s linear infinite" }}>
          {[...ARTIST_TYPES, ...ARTIST_TYPES].map((t, i) => (
            <span key={i} className="text-white/35 text-[11px] font-bold tracking-[0.25em] uppercase shrink-0 px-6">
              {t} <span className="text-[#FFD400] ml-4">◆</span>
            </span>
          ))}
        </div>
      </section>

      {/* FEATURED EVENTS */}
      <section className="bg-[#0A0A0A] py-20 lg:py-32 px-6 lg:px-10">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-[#FFD400] text-[11px] font-bold tracking-[0.35em] uppercase mb-3">Happening Now</p>
              <h2 className="font-display font-bold text-white text-[clamp(2.2rem,6vw,4.5rem)] leading-[0.92] tracking-tight">
                UPCOMING<br />EVENTS
              </h2>
            </div>
            <button
              onClick={() => go("events")}
              className="hidden sm:flex items-center gap-2 text-white/50 hover:text-white text-[13px] font-medium transition-colors"
            >
              View All <ChevronRight size={15} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {EVENTS.map(evt => <EventCard key={evt.id} evt={evt} />)}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-[#0D0D0D] border-t border-white/8 py-20 lg:py-32 px-6 lg:px-10">
        <div className="max-w-[1400px] mx-auto">
          <div className="max-w-xl mb-16">
            <p className="text-[#FFD400] text-[11px] font-bold tracking-[0.35em] uppercase mb-3">The Platform</p>
            <h2 className="font-display font-bold text-white text-[clamp(2rem,5.5vw,4rem)] leading-[0.92] tracking-tight">
              EVERYTHING<br />AN ARTIST NEEDS
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="group bg-[#111] border border-white/8 p-7 hover:border-[#FFD400]/30 transition-all">
                <div className="w-10 h-10 border border-[#FFD400]/25 flex items-center justify-center mb-6 group-hover:bg-[#FFD400]/8 transition-colors">
                  <Icon size={17} className="text-[#FFD400]" />
                </div>
                <h3 className="font-display font-bold text-white text-[15px] mb-3 tracking-wide">{title}</h3>
                <p className="text-white/45 text-[13px] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-[#FFD400] py-16 lg:py-20 px-6 lg:px-10">
        <div className="max-w-[1400px] mx-auto grid grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-6">
          {STATS.map(({ value, label }) => (
            <div key={label}>
              <div className="font-display font-bold text-black text-[clamp(2.2rem,6vw,5rem)] leading-none tracking-tight mb-2">
                {value}
              </div>
              <div className="text-black/55 text-[12px] font-bold tracking-[0.2em] uppercase">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED ARTISTS */}
      <section className="bg-[#0A0A0A] border-t border-white/8 py-20 lg:py-32 px-6 lg:px-10">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-[#FFD400] text-[11px] font-bold tracking-[0.35em] uppercase mb-3">The Talent</p>
              <h2 className="font-display font-bold text-white text-[clamp(2.2rem,6vw,4.5rem)] leading-[0.92] tracking-tight">
                FEATURED<br />ARTISTS
              </h2>
            </div>
            <button
              onClick={() => go("artists")}
              className="hidden sm:flex items-center gap-2 text-white/50 hover:text-white text-[13px] font-medium transition-colors"
            >
              Browse All <ChevronRight size={15} />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {ARTISTS.map(a => (
              <div key={a.id} className="group cursor-pointer">
                <div className="aspect-square overflow-hidden bg-zinc-900 mb-3">
                  <img
                    src={`https://images.unsplash.com/photo-${a.img}?w=320&h=320&fit=crop&auto=format`}
                    alt={a.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 grayscale group-hover:grayscale-0"
                  />
                </div>
                <div className="font-display font-bold text-white text-[13px] tracking-wide mb-0.5 leading-snug">{a.name}</div>
                <div className="text-white/40 text-[11px] mb-1">{a.discipline}</div>
                <div className="text-[#FFD400] text-[11px] font-bold">{a.followers}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* JOIN CTA */}
      <section className="bg-[#111] border-t border-white/8 py-20 lg:py-32 px-6 lg:px-10">
        <div className="max-w-[1400px] mx-auto">
          <div className="max-w-3xl">
            <p className="text-[#FFD400] text-[11px] font-bold tracking-[0.35em] uppercase mb-5">Join the Movement</p>
            <h2 className="font-display font-bold text-white text-[clamp(2.5rem,8vw,6.5rem)] leading-[0.9] tracking-tight mb-8">
              YOUR WORLD.<br />YOUR STAGE.<br />YOUR PEOPLE.
            </h2>
            <p className="text-white/45 text-[15px] lg:text-[17px] leading-relaxed mb-10 max-w-xl">
              Whether you create, organize, educate, or invest in culture — Cosmic Elemental is where
              the global creative underground comes to life.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => go("signup")}
                className="px-10 py-4 bg-[#FFD400] text-black font-bold text-[12px] tracking-[0.2em] uppercase hover:bg-yellow-300 transition-colors"
              >
                Create Free Account
              </button>
              <button
                onClick={() => go("about")}
                className="px-10 py-4 border border-white/20 text-white font-bold text-[12px] tracking-[0.2em] uppercase hover:border-white/40 transition-colors"
              >
                Our Story
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Events Page ───────────────────────────────────────────────────────────────

function EventsPage() {
  const [filter, setFilter] = useState("All");
  const types = ["All", "Festival", "Exhibition", "Open Mic", "Battle"];
  const filtered = filter === "All" ? EVENTS : EVENTS.filter(e => e.tag === filter);

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-[68px]">
      <div className="bg-[#0D0D0D] border-b border-white/8 px-6 lg:px-10 py-16 lg:py-24">
        <div className="max-w-[1400px] mx-auto">
          <p className="text-[#FFD400] text-[11px] font-bold tracking-[0.35em] uppercase mb-3">Discover</p>
          <h1 className="font-display font-bold text-white text-[clamp(3rem,9vw,7rem)] leading-[0.88] tracking-tight mb-6">
            EVENTS
          </h1>
          <p className="text-white/45 text-[15px] max-w-lg leading-relaxed">
            Concerts, exhibitions, battles, open mics, workshops, and festivals from the global creative underground.
          </p>
        </div>
      </div>

      <div className="border-b border-white/8 px-6 lg:px-10 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center gap-2.5 flex-wrap">
          {types.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`text-[11px] font-bold tracking-[0.2em] uppercase px-4 py-2 border transition-all ${
                filter === t
                  ? "bg-[#FFD400] border-[#FFD400] text-black"
                  : "border-white/15 text-white/45 hover:border-white/30 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(evt => <EventCard key={evt.id} evt={evt} />)}
        </div>
      </div>
    </div>
  );
}

// ─── Artists Page ──────────────────────────────────────────────────────────────

function ArtistsPage() {
  const [query, setQuery] = useState("");
  const filtered = ARTISTS.filter(a =>
    !query || a.name.toLowerCase().includes(query.toLowerCase()) ||
    a.discipline.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-[68px]">
      <div className="bg-[#0D0D0D] border-b border-white/8 px-6 lg:px-10 py-16 lg:py-24">
        <div className="max-w-[1400px] mx-auto">
          <p className="text-[#FFD400] text-[11px] font-bold tracking-[0.35em] uppercase mb-3">Directory</p>
          <h1 className="font-display font-bold text-white text-[clamp(3rem,9vw,7rem)] leading-[0.88] tracking-tight mb-8">
            ARTISTS
          </h1>
          <div className="relative max-w-md">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
            <input
              type="text"
              placeholder="Search by name or discipline..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-white/15 text-white placeholder:text-white/25 pl-10 pr-4 py-3 text-[13px] focus:outline-none focus:border-[#FFD400]/40"
            />
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
          {filtered.map(a => (
            <div key={a.id} className="group cursor-pointer">
              <div className="aspect-square overflow-hidden bg-zinc-900 mb-3">
                <img
                  src={`https://images.unsplash.com/photo-${a.img}?w=400&h=400&fit=crop&auto=format`}
                  alt={a.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 grayscale group-hover:grayscale-0"
                />
              </div>
              <div className="font-display font-bold text-white text-[13px] tracking-wide mb-0.5">{a.name}</div>
              <div className="text-white/40 text-[11px] mb-1">{a.discipline}</div>
              <div className="flex items-center justify-between">
                <span className="text-white/25 text-[10px]">{a.location}</span>
                <span className="text-[#FFD400] text-[11px] font-bold">{a.followers}</span>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-20 text-white/30 text-sm">No artists found matching your search.</div>
        )}
      </div>
    </div>
  );
}

// ─── Agency Page ───────────────────────────────────────────────────────────────

function AgencyPage({ go }: { go: (p: Page) => void }) {
  const tiers = [
    {
      name: "EMERGING",
      price: "Free",
      note: "Start here",
      perks: ["Basic artist profile", "Event discovery feed", "Community access", "Resource library", "Opportunities board"]
    },
    {
      name: "PROFESSIONAL",
      price: "$29/mo",
      note: "Most popular",
      perks: ["Featured profile placement", "Booking request tools", "Analytics dashboard", "Priority support", "Brand deals access", "Collaboration matching"]
    },
    {
      name: "ELITE",
      price: "By Application",
      note: "Full representation",
      perks: ["Dedicated booking agent", "Global label network access", "Brand partnership pipeline", "Tour logistics support", "Contract & legal guidance", "Press and media placement", "Sync licensing opportunities"]
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-[68px]">
      <div className="relative bg-black border-b border-white/8 px-6 lg:px-10 py-24 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1600&h=700&fit=crop&auto=format"
            alt="Performance"
            className="w-full h-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/50" />
        </div>
        <div className="relative max-w-[1400px] mx-auto">
          <p className="text-[#FFD400] text-[11px] font-bold tracking-[0.35em] uppercase mb-3">Representation</p>
          <h1 className="font-display font-bold text-white text-[clamp(3rem,9vw,7rem)] leading-[0.88] tracking-tight mb-6">
            TALENT<br />AGENCY
          </h1>
          <p className="text-white/55 text-[17px] max-w-xl leading-relaxed">
            From emerging talent to global stars. We represent artists who are redefining culture.
            Get placed. Get paid. Get seen.
          </p>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiers.map((tier, i) => (
            <div
              key={tier.name}
              className={`border p-8 flex flex-col ${
                i === 2
                  ? "bg-[#FFD400] border-[#FFD400]"
                  : "bg-[#111] border-white/8 hover:border-[#FFD400]/25 transition-all"
              }`}
            >
              <div className={`text-[10px] font-bold tracking-[0.35em] uppercase mb-1 ${i === 2 ? "text-black/55" : "text-[#FFD400]"}`}>
                {tier.name}
              </div>
              <div className={`text-[10px] font-medium mb-5 ${i === 2 ? "text-black/40" : "text-white/30"}`}>{tier.note}</div>
              <div className={`font-display font-bold text-[clamp(1.8rem,4vw,3rem)] leading-none mb-8 ${i === 2 ? "text-black" : "text-white"}`}>
                {tier.price}
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {tier.perks.map(p => (
                  <li key={p} className={`flex items-start gap-2.5 text-[13px] ${i === 2 ? "text-black/70" : "text-white/55"}`}>
                    <CheckCircle size={13} className={`mt-0.5 shrink-0 ${i === 2 ? "text-black" : "text-[#FFD400]"}`} />
                    {p}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => go("signup")}
                className={`w-full py-3.5 font-bold text-[12px] tracking-[0.15em] uppercase transition-all ${
                  i === 2
                    ? "bg-black text-white hover:bg-black/85"
                    : "border border-[#FFD400]/40 text-[#FFD400] hover:bg-[#FFD400]/8"
                }`}
              >
                {i === 2 ? "Apply Now" : "Get Started"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Opportunities Page ────────────────────────────────────────────────────────

function OpportunitiesPage() {
  const opps = [
    { title: "Residency — Creative Studio Berlin", type: "Residency", deadline: "Aug 1, 2026", pay: "€2,000/mo + studio", org: "Kunsthalle Berlin", urgent: true },
    { title: "Brand Campaign — Sneaker Collab", type: "Brand Deal", deadline: "Jul 20, 2026", pay: "$5,000 flat", org: "Adidas x CE", urgent: true },
    { title: "Festival Performer — Frequencies 2026", type: "Performance", deadline: "Jul 30, 2026", pay: "Paid + Travel", org: "Frequencies Festival", urgent: false },
    { title: "Visual Art Commission — Public Mural", type: "Commission", deadline: "Aug 15, 2026", pay: "£8,000", org: "City of London", urgent: false },
    { title: "Music Sync License — Netflix Series", type: "Sync", deadline: "Jul 25, 2026", pay: "$3,500/track", org: "Netflix Music", urgent: true },
    { title: "Dance Workshop — Arts Council Grant", type: "Grant", deadline: "Sep 1, 2026", pay: "Up to €15K", org: "European Arts Council", urgent: false },
    { title: "Photography — Editorial Spread", type: "Editorial", deadline: "Aug 5, 2026", pay: "$1,200 + credit", org: "i-D Magazine", urgent: false },
    { title: "Content Creator — Creative Platform", type: "Full-Time", deadline: "Rolling", pay: "$60K–$80K/yr", org: "Cosmic Elemental", urgent: false },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-[68px]">
      <div className="bg-[#0D0D0D] border-b border-white/8 px-6 lg:px-10 py-16 lg:py-24">
        <div className="max-w-[1400px] mx-auto">
          <p className="text-[#FFD400] text-[11px] font-bold tracking-[0.35em] uppercase mb-3">Work</p>
          <h1 className="font-display font-bold text-white text-[clamp(3rem,9vw,7rem)] leading-[0.88] tracking-tight mb-5">
            OPPORTUNITIES
          </h1>
          <p className="text-white/45 text-[15px] max-w-lg">
            Gigs, residencies, grants, brand deals, commissions, and full-time roles for independent creatives.
          </p>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10">
        <div className="flex flex-col gap-2">
          {opps.map((opp, i) => (
            <div
              key={i}
              className="group bg-[#111] border border-white/8 hover:border-[#FFD400]/30 transition-all px-5 lg:px-7 py-5 cursor-pointer flex items-start md:items-center justify-between gap-4"
            >
              <div className="flex items-start md:items-center gap-4 flex-1 min-w-0">
                {opp.urgent && (
                  <span className="text-[9px] font-bold tracking-[0.2em] uppercase bg-red-500/15 text-red-400 px-2 py-1 shrink-0 border border-red-500/20">
                    URGENT
                  </span>
                )}
                <div className="min-w-0">
                  <div className="font-display font-bold text-white text-[14px] mb-0.5 group-hover:text-[#FFD400] transition-colors leading-snug">
                    {opp.title}
                  </div>
                  <div className="text-white/35 text-[12px]">{opp.org}</div>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-6 lg:gap-8 shrink-0">
                <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/25 border border-white/12 px-2.5 py-1">
                  {opp.type}
                </span>
                <span className="text-[#FFD400] font-bold text-[13px] w-28 text-right">{opp.pay}</span>
                <span className="text-white/35 text-[11px] w-28 text-right flex items-center gap-1.5 justify-end">
                  <Clock size={10} />{opp.deadline}
                </span>
                <ArrowRight size={13} className="text-white/20 group-hover:text-[#FFD400] transition-colors" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Community Page ────────────────────────────────────────────────────────────

function CommunityPage({ go }: { go: (p: Page) => void }) {
  const threads = [
    { title: "Best cities for emerging street artists in 2026?", author: "Yuki T.", replies: 34, likes: 128, category: "Street Art", time: "2h ago" },
    { title: "How do you price your live performances?", author: "Marcus C.", replies: 22, likes: 94, category: "Business", time: "4h ago" },
    { title: "Share your current creative project — July 2026 thread", author: "Zara O.", replies: 87, likes: 341, category: "General", time: "6h ago" },
    { title: "Seeking dance collaborators for Lagos showcase", author: "Dayo A.", replies: 12, likes: 45, category: "Collab", time: "1d ago" },
    { title: "AI tools for creative workflow — helpful or harmful?", author: "Léa D.", replies: 56, likes: 213, category: "Discussion", time: "1d ago" },
    { title: "Breaking into European festival circuits as an international artist", author: "Amara S.", replies: 19, likes: 78, category: "Touring", time: "2d ago" },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-[68px]">
      <div className="bg-[#0D0D0D] border-b border-white/8 px-6 lg:px-10 py-16 lg:py-24">
        <div className="max-w-[1400px] mx-auto flex items-end justify-between gap-6">
          <div>
            <p className="text-[#FFD400] text-[11px] font-bold tracking-[0.35em] uppercase mb-3">Connect</p>
            <h1 className="font-display font-bold text-white text-[clamp(3rem,9vw,7rem)] leading-[0.88] tracking-tight">
              COMMUNITY
            </h1>
          </div>
          <button
            onClick={() => go("signup")}
            className="hidden sm:block shrink-0 px-6 py-3.5 bg-[#FFD400] text-black font-bold text-[12px] tracking-[0.15em] uppercase hover:bg-yellow-300 transition-colors"
          >
            Start a Thread
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10">
        <div className="flex flex-col gap-2">
          {threads.map((t, i) => (
            <div
              key={i}
              className="group bg-[#111] border border-white/8 hover:border-[#FFD400]/30 transition-all px-5 lg:px-7 py-5 cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#FFD400]/70 border border-[#FFD400]/20 px-2 py-0.5">
                      {t.category}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-white text-[14px] group-hover:text-[#FFD400] transition-colors mb-2 leading-snug">
                    {t.title}
                  </h3>
                  <div className="flex items-center gap-4 text-[11px] text-white/28">
                    <span>by {t.author}</span>
                    <span>{t.time}</span>
                  </div>
                </div>
                <div className="flex items-center gap-5 text-[12px] text-white/30 shrink-0">
                  <span className="flex items-center gap-1.5"><MessageSquare size={12} />{t.replies}</span>
                  <span className="flex items-center gap-1.5"><Heart size={12} />{t.likes}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Resources Page ────────────────────────────────────────────────────────────

function ResourcesPage() {
  const resources = [
    { title: "Artist Pricing Guide 2026", category: "Business", meta: "8 min read", icon: TrendingUp },
    { title: "Music Licensing 101 for Independent Artists", category: "Legal", meta: "12 min read", icon: BookOpen },
    { title: "Building Your Artist Brand on Social Media", category: "Marketing", meta: "6 min read", icon: Globe },
    { title: "Grant Writing Template Pack", category: "Funding", meta: "Download", icon: Award },
    { title: "How to Book International Festivals", category: "Touring", meta: "10 min read", icon: MapPin },
    { title: "Creative Director Contract Template", category: "Legal", meta: "Download", icon: Briefcase },
    { title: "Photography Portfolio Best Practices", category: "Visual Arts", meta: "7 min read", icon: Camera },
    { title: "Producing Beats for Sync Licensing", category: "Music", meta: "15 min read", icon: Music },
    { title: "Revenue Streams for Independent Creators", category: "Finance", meta: "9 min read", icon: Zap },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-[68px]">
      <div className="bg-[#0D0D0D] border-b border-white/8 px-6 lg:px-10 py-16 lg:py-24">
        <div className="max-w-[1400px] mx-auto">
          <p className="text-[#FFD400] text-[11px] font-bold tracking-[0.35em] uppercase mb-3">Knowledge</p>
          <h1 className="font-display font-bold text-white text-[clamp(3rem,9vw,7rem)] leading-[0.88] tracking-tight mb-5">
            RESOURCES
          </h1>
          <p className="text-white/45 text-[15px] max-w-lg leading-relaxed">
            Guides, templates, and masterclasses to help artists build sustainable creative careers.
          </p>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((r, i) => {
            const Icon = r.icon;
            return (
              <div key={i} className="group bg-[#111] border border-white/8 hover:border-[#FFD400]/30 transition-all p-6 cursor-pointer">
                <div className="flex items-start justify-between mb-5">
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase bg-[#FFD400]/10 text-[#FFD400] px-2.5 py-1">
                    {r.category}
                  </span>
                  <Icon size={16} className="text-white/18 group-hover:text-[#FFD400] transition-colors" />
                </div>
                <h3 className="font-display font-bold text-white text-[14px] mb-3 leading-snug group-hover:text-[#FFD400] transition-colors">
                  {r.title}
                </h3>
                <div className="text-white/28 text-[11px] font-medium tracking-wide">{r.meta}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── About Page ────────────────────────────────────────────────────────────────

function AboutPage({ go }: { go: (p: Page) => void }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-[68px]">
      <div className="relative bg-black border-b border-white/8 px-6 lg:px-10 py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1600&h=700&fit=crop&auto=format"
            alt="Street art mural"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black" />
        </div>
        <div className="relative max-w-[1400px] mx-auto">
          <p className="text-[#FFD400] text-[11px] font-bold tracking-[0.35em] uppercase mb-3">Our Story</p>
          <h1 className="font-display font-bold text-white text-[clamp(3rem,9vw,7rem)] leading-[0.88] tracking-tight mb-8">
            ABOUT US
          </h1>
          <p className="text-white/65 text-[18px] lg:text-[20px] max-w-2xl leading-relaxed">
            Cosmic Elemental was born from a simple belief: creative talent is everywhere,
            but opportunity is not equally distributed.
          </p>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
        <div>
          <h2 className="font-display font-bold text-white text-[clamp(1.8rem,4vw,3rem)] leading-tight tracking-tight mb-7">
            WE EXIST TO GIVE ARTISTS THE WORLD THEY DESERVE.
          </h2>
          <p className="text-white/45 text-[15px] leading-relaxed mb-5">
            Founded in 2021 by a collective of artists, organizers, and technologists from Lagos, London,
            and Los Angeles — Cosmic Elemental is a platform built by creatives, for creatives.
          </p>
          <p className="text-white/45 text-[15px] leading-relaxed mb-5">
            We have spent five years listening to artists about what they actually need: fair pay, real visibility,
            genuine community, and tools that respect their craft without extracting it.
          </p>
          <p className="text-white/45 text-[15px] leading-relaxed mb-10">
            Today we serve 127,000 artists across 120 countries with events, opportunities,
            talent representation, education, and a community that feels like home.
          </p>
          <button
            onClick={() => go("signup")}
            className="px-8 py-4 bg-[#FFD400] text-black font-bold text-[12px] tracking-[0.2em] uppercase hover:bg-yellow-300 transition-colors"
          >
            Join Our Community
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { img: "1547153760-18fc86324498", alt: "Dancer performing" },
            { img: "1511671782779-c97d3d27a1d4", alt: "Musician on stage" },
            { img: "1529156069898-49953e39b3ac", alt: "Graffiti artist" },
            { img: "1516035069371-29a1b244cc32", alt: "Photographer at work" },
          ].map(({ img, alt }) => (
            <div key={img} className="aspect-square overflow-hidden bg-zinc-900">
              <img
                src={`https://images.unsplash.com/photo-${img}?w=400&h=400&fit=crop&auto=format`}
                alt={alt}
                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#111] border-t border-b border-white/8 py-16 px-6 lg:px-10">
        <div className="max-w-[1400px] mx-auto">
          <h2 className="font-display font-bold text-white text-xl tracking-[0.1em] uppercase mb-10">OUR VALUES</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "Artist First", desc: "Every product decision starts with how this serves the artist. Not the platform, not the brand, not the algorithm." },
              { title: "Borderless", desc: "Creativity has no passport. We build for artists in Lagos as much as London, in Manila as much as Miami." },
              { title: "Underground Spirit", desc: "We come from the culture. Cyphers, graffiti walls, underground raves, open mics. That energy is in our DNA." },
            ].map(v => (
              <div key={v.title} className="border-t-2 border-[#FFD400]/40 pt-6">
                <h3 className="font-display font-bold text-[#FFD400] text-[17px] tracking-wide mb-3">{v.title}</h3>
                <p className="text-white/45 text-[13px] leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Contact Page ──────────────────────────────────────────────────────────────

function ContactPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-[68px]">
      <div className="bg-[#0D0D0D] border-b border-white/8 px-6 lg:px-10 py-16 lg:py-24">
        <div className="max-w-[1400px] mx-auto">
          <p className="text-[#FFD400] text-[11px] font-bold tracking-[0.35em] uppercase mb-3">Reach Out</p>
          <h1 className="font-display font-bold text-white text-[clamp(3rem,9vw,7rem)] leading-[0.88] tracking-tight">
            CONTACT
          </h1>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16 grid grid-cols-1 lg:grid-cols-2 gap-16">
        <div>
          <h2 className="font-display font-bold text-white text-xl tracking-[0.1em] uppercase mb-8">SEND A MESSAGE</h2>
          <form className="space-y-4" onSubmit={e => e.preventDefault()}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white/35 text-[10px] font-bold tracking-[0.2em] uppercase mb-2 block">First Name</label>
                <input type="text" placeholder="Zara" className="w-full bg-[#1A1A1A] border border-white/12 text-white px-4 py-3 text-[13px] focus:outline-none focus:border-[#FFD400]/40 placeholder:text-white/18" />
              </div>
              <div>
                <label className="text-white/35 text-[10px] font-bold tracking-[0.2em] uppercase mb-2 block">Last Name</label>
                <input type="text" placeholder="Okonkwo" className="w-full bg-[#1A1A1A] border border-white/12 text-white px-4 py-3 text-[13px] focus:outline-none focus:border-[#FFD400]/40 placeholder:text-white/18" />
              </div>
            </div>
            <div>
              <label className="text-white/35 text-[10px] font-bold tracking-[0.2em] uppercase mb-2 block">Email</label>
              <input type="email" placeholder="zara@studio.com" className="w-full bg-[#1A1A1A] border border-white/12 text-white px-4 py-3 text-[13px] focus:outline-none focus:border-[#FFD400]/40 placeholder:text-white/18" />
            </div>
            <div>
              <label className="text-white/35 text-[10px] font-bold tracking-[0.2em] uppercase mb-2 block">Subject</label>
              <input type="text" placeholder="Agency inquiry..." className="w-full bg-[#1A1A1A] border border-white/12 text-white px-4 py-3 text-[13px] focus:outline-none focus:border-[#FFD400]/40 placeholder:text-white/18" />
            </div>
            <div>
              <label className="text-white/35 text-[10px] font-bold tracking-[0.2em] uppercase mb-2 block">Message</label>
              <textarea
                rows={5}
                placeholder="Tell us about yourself and what you need..."
                className="w-full bg-[#1A1A1A] border border-white/12 text-white px-4 py-3 text-[13px] focus:outline-none focus:border-[#FFD400]/40 placeholder:text-white/18 resize-none"
              />
            </div>
            <button type="submit" className="w-full py-4 bg-[#FFD400] text-black font-bold text-[12px] tracking-[0.2em] uppercase hover:bg-yellow-300 transition-colors">
              Send Message
            </button>
          </form>
        </div>

        <div>
          <h2 className="font-display font-bold text-white text-xl tracking-[0.1em] uppercase mb-8">FIND US</h2>
          <div className="space-y-6 mb-12">
            {[
              { label: "General Inquiries", value: "hello@cosmicelemental.com", Icon: Mail },
              { label: "Agency and Bookings", value: "agency@cosmicelemental.com", Icon: Briefcase },
              { label: "Press and Media", value: "press@cosmicelemental.com", Icon: Globe },
            ].map(({ label, value, Icon }) => (
              <div key={label} className="flex items-start gap-4 border-b border-white/8 pb-6">
                <div className="w-9 h-9 border border-[#FFD400]/25 flex items-center justify-center shrink-0">
                  <Icon size={14} className="text-[#FFD400]" />
                </div>
                <div>
                  <div className="text-white/35 text-[10px] font-bold tracking-[0.2em] uppercase mb-1">{label}</div>
                  <div className="text-white text-[13px]">{value}</div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <div className="text-white/35 text-[10px] font-bold tracking-[0.2em] uppercase mb-4">Follow the Movement</div>
            <div className="flex items-center gap-3">
              {[Instagram, Twitter, Youtube].map((Icon, i) => (
                <button key={i} className="w-10 h-10 border border-white/12 flex items-center justify-center text-white/35 hover:border-[#FFD400]/40 hover:text-[#FFD400] transition-all">
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Login Page ────────────────────────────────────────────────────────────────

function LoginPage({ go }: { go: (p: Page) => void }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-[68px] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-5">
            <CESeal size={54} light />
          </div>
          <h1 className="font-display font-bold text-white text-[2rem] tracking-tight mb-2">Welcome Back</h1>
          <p className="text-white/38 text-[13px]">Sign in to your Cosmic Elemental account</p>
        </div>

        <form className="bg-[#111] border border-white/8 p-8 space-y-4" onSubmit={e => e.preventDefault()}>
          <div>
            <label className="text-white/35 text-[10px] font-bold tracking-[0.2em] uppercase mb-2 block">Email</label>
            <input type="email" placeholder="your@email.com" className="w-full bg-[#1A1A1A] border border-white/12 text-white px-4 py-3 text-[13px] focus:outline-none focus:border-[#FFD400]/40 placeholder:text-white/18" />
          </div>
          <div>
            <label className="text-white/35 text-[10px] font-bold tracking-[0.2em] uppercase mb-2 block">Password</label>
            <input type="password" placeholder="••••••••" className="w-full bg-[#1A1A1A] border border-white/12 text-white px-4 py-3 text-[13px] focus:outline-none focus:border-[#FFD400]/40" />
          </div>
          <button type="submit" className="w-full py-4 bg-[#FFD400] text-black font-bold text-[12px] tracking-[0.2em] uppercase hover:bg-yellow-300 transition-colors mt-2">
            Sign In
          </button>
          <div className="text-center text-white/35 text-[13px] pt-1">
            No account?{" "}
            <button onClick={() => go("signup")} className="text-[#FFD400] hover:underline font-semibold">
              Join free
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Signup Page ───────────────────────────────────────────────────────────────

function SignupPage({ go }: { go: (p: Page) => void }) {
  const [selected, setSelected] = useState("");
  const disciplines = [
    "Dancer", "Musician", "Rapper", "DJ / Producer", "Visual Artist",
    "Photographer", "Filmmaker", "Fashion Designer", "Event Organizer", "Other"
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-[68px] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-[500px]">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-5">
            <CESeal size={54} light />
          </div>
          <h1 className="font-display font-bold text-white text-[2rem] tracking-tight mb-2">Join the Movement</h1>
          <p className="text-white/38 text-[13px]">Create your free Cosmic Elemental profile</p>
        </div>

        <form className="bg-[#111] border border-white/8 p-8 space-y-4" onSubmit={e => e.preventDefault()}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-white/35 text-[10px] font-bold tracking-[0.2em] uppercase mb-2 block">First Name</label>
              <input type="text" placeholder="Zara" className="w-full bg-[#1A1A1A] border border-white/12 text-white px-4 py-3 text-[13px] focus:outline-none focus:border-[#FFD400]/40 placeholder:text-white/18" />
            </div>
            <div>
              <label className="text-white/35 text-[10px] font-bold tracking-[0.2em] uppercase mb-2 block">Last Name</label>
              <input type="text" placeholder="Okonkwo" className="w-full bg-[#1A1A1A] border border-white/12 text-white px-4 py-3 text-[13px] focus:outline-none focus:border-[#FFD400]/40 placeholder:text-white/18" />
            </div>
          </div>
          <div>
            <label className="text-white/35 text-[10px] font-bold tracking-[0.2em] uppercase mb-2 block">Email</label>
            <input type="email" placeholder="your@email.com" className="w-full bg-[#1A1A1A] border border-white/12 text-white px-4 py-3 text-[13px] focus:outline-none focus:border-[#FFD400]/40 placeholder:text-white/18" />
          </div>
          <div>
            <label className="text-white/35 text-[10px] font-bold tracking-[0.2em] uppercase mb-2 block">Password</label>
            <input type="password" placeholder="••••••••" className="w-full bg-[#1A1A1A] border border-white/12 text-white px-4 py-3 text-[13px] focus:outline-none focus:border-[#FFD400]/40" />
          </div>
          <div>
            <label className="text-white/35 text-[10px] font-bold tracking-[0.2em] uppercase mb-3 block">Your Discipline</label>
            <div className="flex flex-wrap gap-2">
              {disciplines.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelected(d)}
                  className={`text-[10px] font-bold tracking-[0.1em] uppercase px-3 py-2 border transition-all ${
                    selected === d
                      ? "bg-[#FFD400] border-[#FFD400] text-black"
                      : "border-white/12 text-white/38 hover:border-white/25 hover:text-white/70"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" className="w-full py-4 bg-[#FFD400] text-black font-bold text-[12px] tracking-[0.2em] uppercase hover:bg-yellow-300 transition-colors mt-1">
            Create Account
          </button>
          <div className="text-center text-white/35 text-[13px] pt-1">
            Already a member?{" "}
            <button onClick={() => go("login")} className="text-[#FFD400] hover:underline font-semibold">
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────────

function Footer({ go }: { go: (p: Page) => void }) {
  const cols: { heading: string; items: { label: string; page: Page }[] }[] = [
    {
      heading: "Platform",
      items: [
        { label: "Events", page: "events" },
        { label: "Artist Directory", page: "artists" },
        { label: "Opportunities", page: "opportunities" },
        { label: "Resources", page: "resources" },
      ]
    },
    {
      heading: "Company",
      items: [
        { label: "About Us", page: "about" },
        { label: "Talent Agency", page: "agency" },
        { label: "Community", page: "community" },
        { label: "Contact", page: "contact" },
      ]
    },
    {
      heading: "Account",
      items: [
        { label: "Sign Up Free", page: "signup" },
        { label: "Log In", page: "login" },
      ]
    },
  ];

  return (
    <footer className="bg-black border-t border-white/8 px-6 lg:px-10 py-16">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 mb-12">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <CESeal size={38} light />
              <span className="font-display font-bold text-white text-[11px] tracking-[0.25em] uppercase">
                Cosmic Elemental
              </span>
            </div>
            <p className="text-white/35 text-[13px] leading-relaxed max-w-xs mb-7">
              A world built for artists. Connecting the global creative underground since 2021.
            </p>
            <div className="flex items-center gap-3">
              {[Instagram, Twitter, Youtube].map((Icon, i) => (
                <button
                  key={i}
                  className="w-9 h-9 border border-white/12 flex items-center justify-center text-white/35 hover:border-[#FFD400]/40 hover:text-[#FFD400] transition-all"
                  aria-label="Social link"
                >
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </div>
          {cols.map(col => (
            <div key={col.heading}>
              <div className="text-white/28 text-[10px] font-bold tracking-[0.25em] uppercase mb-5">{col.heading}</div>
              <ul className="space-y-3">
                {col.items.map(({ label, page }) => (
                  <li key={label}>
                    <button
                      onClick={() => go(page)}
                      className="text-white/45 text-[13px] hover:text-white transition-colors"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-white/22 text-[11px]">© 2026 Cosmic Elemental. All rights reserved.</span>
          <span className="text-white/22 text-[11px] tracking-[0.25em] uppercase">A World Built for Artists</span>
        </div>
      </div>
    </footer>
  );
}

// ─── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState<Page>("home");

  const go = (p: Page) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showFooter = page !== "login" && page !== "signup";

  return (
    <div className="font-sans min-h-screen bg-[#0A0A0A]">
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0A0A0A; }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; }
        ::-webkit-scrollbar-thumb:hover { background: #FFD400; }
      `}</style>
      <Nav current={page} go={go} />
      {page === "home" && <HomePage go={go} />}
      {page === "events" && <EventsPage />}
      {page === "artists" && <ArtistsPage />}
      {page === "agency" && <AgencyPage go={go} />}
      {page === "opportunities" && <OpportunitiesPage />}
      {page === "community" && <CommunityPage go={go} />}
      {page === "resources" && <ResourcesPage />}
      {page === "about" && <AboutPage go={go} />}
      {page === "contact" && <ContactPage />}
      {page === "login" && <LoginPage go={go} />}
      {page === "signup" && <SignupPage go={go} />}
      {showFooter && <Footer go={go} />}
    </div>
  );
}
