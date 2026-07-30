import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EventCard, ClassCard, ArtistCard } from "@/components/Cards";
import { ArrowUpRight, Compass, GraduationCap, Users } from "lucide-react";

const MARQUEE = ["Battles", "Cyphers", "Jams", "Showcases", "Festivals", "Sessions", "Workshops", "Cinema", "Music", "Dance", "Graffiti", "Photography"];

export default function Landing() {
  const [events, setEvents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [artists, setArtists] = useState([]);
  useEffect(() => {
    api.get("/events").then(r=>setEvents(r.data.slice(0,3))).catch(()=>{});
    api.get("/classes").then(r=>setClasses(r.data.slice(0,3))).catch(()=>{});
    api.get("/artists").then(r=>setArtists(r.data.slice(0,4))).catch(()=>{});
  }, []);

  return (
    <div className="bg-[color:var(--bg)]" data-testid="landing-page">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 pt-16 pb-8">
          <div className="grid lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-8">
              <div className="label-eyebrow text-[color:var(--accent)]">Phase 01 · Global Creative Ecosystem</div>
              <motion.h1 initial={{opacity:0,y:40}} animate={{opacity:1,y:0}} transition={{duration:0.9,ease:[0.2,0.8,0.2,1]}}
                className="font-display font-bold tracking-tighter mt-6 text-[13vw] lg:text-[10rem] leading-[0.86]">
                A WORLD<br/>BUILT FOR<br/><span className="text-[color:var(--accent)]">ARTISTS.</span>
              </motion.h1>
            </div>
            <div className="lg:col-span-4 space-y-6">
              <p className="text-lg text-[color:var(--ink-2)] leading-relaxed max-w-sm">
                One organized platform to discover events, teach & learn, and hire creative talent. No more scrolling through fragmented feeds.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/events" className="btn-accent" data-testid="hero-cta-events">Explore events <ArrowUpRight size={16}/></Link>
                <Link to="/artists" className="btn-outline" data-testid="hero-cta-artists">Browse talent</Link>
              </div>
            </div>
          </div>
        </div>
        {/* Marquee */}
        <div className="relative py-6 border-y border-[color:var(--line-dark)] bg-[color:var(--ink)] text-white overflow-hidden">
          <div className="marquee">
            <div className="marquee-track font-display text-4xl md:text-5xl font-bold tracking-tight">
              {[...MARQUEE,...MARQUEE].map((m,i)=><span key={i} className="flex items-center gap-8"><span className="text-[color:var(--accent)]">◆</span>{m}</span>)}
            </div>
          </div>
        </div>
      </section>

      {/* THREE MODULES */}
      <section className="max-w-[1440px] mx-auto px-6 lg:px-10 py-24">
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4">
            <div className="label-eyebrow text-[color:var(--muted)]">Three Modules · One Platform</div>
            <h2 className="font-display font-bold text-6xl lg:text-7xl mt-6 leading-none">EVERY<br/>DISCIPLINE.<br/>ONE HOME.</h2>
          </div>
          <div className="lg:col-span-8 grid md:grid-cols-3 gap-4">
            {[
              {n:"01", t:"EVENTS", d:"Discovery for battles, jams, festivals & cyphers — with filters that actually work.", to:"/events", icon:Compass},
              {n:"02", t:"CLASSES", d:"Workshops & training from verified instructors and studios worldwide.", to:"/classes", icon:GraduationCap},
              {n:"03", t:"TALENT", d:"Directory & booking hub for dancers, DJs, MCs, cinematographers, visual artists.", to:"/artists", icon:Users},
            ].map((m,i)=>(
              <Link key={m.n} to={m.to} data-testid={`module-${m.t.toLowerCase()}`}
                    className="card p-6 flex flex-col gap-4 group h-full relative">
                <div className="flex items-center justify-between">
                  <span className="label-eyebrow text-[color:var(--muted)]">{m.n}</span>
                  <m.icon size={20} className="group-hover:text-[color:var(--accent)] transition-colors"/>
                </div>
                <h3 className="font-display text-4xl font-bold leading-none tracking-tight">{m.t}</h3>
                <p className="text-sm text-[color:var(--ink-2)] leading-relaxed">{m.d}</p>
                <div className="mt-auto label-eyebrow group-hover:text-[color:var(--accent)] flex items-center gap-1">Enter <ArrowUpRight size={12}/></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED EVENTS */}
      {events.length > 0 && <Section title="UPCOMING EVENTS" eyebrow="Featured · Approved" to="/events">
        <div className="grid md:grid-cols-3 gap-6">{events.map((e,i)=><EventCard key={e.id} event={e} index={i}/>)}</div>
      </Section>}

      {/* FEATURED CLASSES */}
      {classes.length > 0 && <Section title="LEARN FROM MASTERS" eyebrow="Classes & Workshops" to="/classes">
        <div className="grid md:grid-cols-3 gap-6">{classes.map((c,i)=><ClassCard key={c.id} item={c} index={i}/>)}</div>
      </Section>}

      {/* FEATURED ARTISTS */}
      {artists.length > 0 && <Section title="MEET THE ARTISTS" eyebrow="Talent Agency" to="/artists">
        <div className="grid md:grid-cols-4 gap-6">{artists.map((a,i)=><ArtistCard key={a.id} item={a} index={i}/>)}</div>
      </Section>}

      {/* CTA */}
      <section className="max-w-[1440px] mx-auto px-6 lg:px-10 py-24">
        <div className="bg-[color:var(--ink)] text-white p-10 lg:p-20 relative overflow-hidden">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-8">
              <div className="label-eyebrow text-[color:var(--accent)]">For Organizers · Studios · Artists</div>
              <h2 className="font-display font-bold text-5xl lg:text-7xl mt-4 leading-[0.9]">List your world.<br/>Reach the whole scene.</h2>
              <p className="mt-6 text-white/70 max-w-xl">Publish events, classes, or your artist portfolio. Approved content ships to a global audience of creators.</p>
            </div>
            <div className="lg:col-span-4 flex flex-col gap-3">
              <Link to="/auth?mode=signup&role=organizer" className="btn-accent justify-center" data-testid="cta-organizer">I organize events</Link>
              <Link to="/auth?mode=signup&role=instructor" className="btn-outline justify-center bg-white" data-testid="cta-instructor">I teach classes</Link>
              <Link to="/auth?mode=signup&role=artist" className="btn-outline justify-center bg-white" data-testid="cta-artist">I&apos;m an artist</Link>
            </div>
          </div>
        </div>
      </section>

      <Footer/>
    </div>
  );
}

function Section({title, eyebrow, to, children}) {
  return (
    <section className="max-w-[1440px] mx-auto px-6 lg:px-10 py-16">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="label-eyebrow text-[color:var(--muted)]">{eyebrow}</div>
          <h2 className="font-display font-bold text-5xl lg:text-6xl mt-3 leading-none tracking-tight">{title}</h2>
        </div>
        <Link to={to} className="hidden md:inline-flex btn-outline">View all <ArrowUpRight size={14}/></Link>
      </div>
      {children}
    </section>
  );
}
