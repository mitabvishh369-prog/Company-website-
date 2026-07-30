import Footer from "@/components/Footer";
export default function About() {
  return (
    <div data-testid="about-page">
      <section className="max-w-[1440px] mx-auto px-6 lg:px-10 pt-16 pb-24">
        <div className="label-eyebrow text-[color:var(--muted)]">About</div>
        <h1 className="font-display font-bold text-6xl md:text-8xl leading-[0.9] mt-4 tracking-tighter">A HOME<br/>FOR THE<br/><span className="text-[color:var(--accent)]">CULTURE.</span></h1>
        <div className="grid md:grid-cols-2 gap-16 mt-16">
          <p className="text-lg leading-relaxed text-[color:var(--ink-2)]">Cosmic Elemental is a digital platform being built to organize and connect the global creative community. Today, artists, event organizers, brands, studios, educators, and audiences are all active — but the ecosystem is fragmented across Instagram, WhatsApp, and personal networks.</p>
          <p className="text-lg leading-relaxed text-[color:var(--ink-2)]">Our vision is one centralized platform where artists discover opportunities, organizers promote events, instructors teach, businesses hire creative talent, and audiences explore creative culture from around the world — all in one place.</p>
        </div>
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          {[
            ["Curated", "Every event, class & artist profile is admin-approved. Zero spam, verified talent."],
            ["Global", "Battles in Berlin, cyphers in Bangalore, workshops in Tokyo — one directory."],
            ["Human-assisted", "Booking requests are reviewed by our team to match availability, pricing & fit."],
          ].map(([t,d])=><div key={t} className="card p-8"><h3 className="font-display text-3xl font-bold">{t}</h3><p className="mt-3 text-[color:var(--ink-2)] leading-relaxed">{d}</p></div>)}
        </div>
      </section>
      <Footer/>
    </div>
  );
}
