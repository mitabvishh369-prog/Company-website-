import { Link } from "react-router-dom";
import { fileUrl } from "@/lib/api";
import { MapPin, Calendar, Ticket } from "lucide-react";

const FALLBACK = "https://images.unsplash.com/photo-1604954055722-7f80571fbfc3?crop=entropy&cs=srgb&fm=jpg&q=85";

export function EventCard({ event, index=0 }) {
  const img = fileUrl(event.poster_url || event.images?.[0]) || FALLBACK;
  return (
    <Link to={`/events/${event.id}`} data-testid={`event-card-${event.id}`}
      className="card group block relative rise" style={{animationDelay: `${index*60}ms`}}>
      <div className="img-hover aspect-[4/5] bg-[color:var(--bg-3)]">
        <img src={img} alt={event.title} className="w-full h-full object-cover" loading="lazy"/>
      </div>
      <div className="p-5 space-y-3">
        <div className="flex flex-wrap gap-2">
          <span className="tag tag-accent">{event.event_type}</span>
          <span className="tag">{event.art_form}</span>
        </div>
        <h3 className="font-display text-2xl font-bold leading-tight tracking-tight group-hover:text-[color:var(--accent)] transition-colors">{event.title}</h3>
        <div className="flex items-center gap-4 text-xs text-[color:var(--ink-2)]">
          <span className="inline-flex items-center gap-1"><Calendar size={12}/>{event.date?.slice(0,10)}</span>
          <span className="inline-flex items-center gap-1"><MapPin size={12}/>{event.city}, {event.country}</span>
        </div>
        {event.prize_money > 0 && <div className="text-sm font-semibold inline-flex items-center gap-1"><Ticket size={14} className="text-[color:var(--accent)]"/> Prize ${event.prize_money.toLocaleString()}</div>}
      </div>
    </Link>
  );
}

export function ClassCard({ item, index=0 }) {
  const img = fileUrl(item.images?.[0]) || "https://images.unsplash.com/photo-1775568351184-97ef5387a7db?crop=entropy&cs=srgb&fm=jpg&q=85";
  return (
    <Link to={`/classes/${item.id}`} data-testid={`class-card-${item.id}`} className="card group block rise" style={{animationDelay: `${index*60}ms`}}>
      <div className="img-hover aspect-video bg-[color:var(--bg-3)]"><img src={img} alt={item.title} className="w-full h-full object-cover" loading="lazy"/></div>
      <div className="p-5 space-y-2">
        <div className="flex gap-2"><span className="tag">{item.art_form}</span><span className="tag">{item.mode}</span><span className="tag">{item.skill_level}</span></div>
        <h3 className="font-display text-xl font-bold group-hover:text-[color:var(--accent)] transition-colors">{item.title}</h3>
        <p className="text-xs text-[color:var(--ink-2)]">with <b>{item.instructor_name}</b> · {item.city}</p>
        <div className="pt-2 flex items-center justify-between hairline pt-3">
          <span className="text-sm font-bold">${item.fee || 0}</span>
          <span className="label-eyebrow text-[color:var(--accent)]">Enroll →</span>
        </div>
      </div>
    </Link>
  );
}

export function ArtistCard({ item, index=0 }) {
  const img = fileUrl(item.avatar_url || item.portfolio_images?.[0]) || "https://images.unsplash.com/photo-1541126274323-dbac58d14741?crop=entropy&cs=srgb&fm=jpg&q=85";
  return (
    <Link to={`/artists/${item.id}`} data-testid={`artist-card-${item.id}`} className="card group block rise" style={{animationDelay: `${index*50}ms`}}>
      <div className="img-hover aspect-square bg-[color:var(--bg-3)]"><img src={img} alt={item.stage_name} className="w-full h-full object-cover" loading="lazy"/></div>
      <div className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold group-hover:text-[color:var(--accent)] transition-colors">{item.stage_name}</h3>
          <span className="text-xs text-[color:var(--muted)]">{item.experience_years}y</span>
        </div>
        <p className="text-xs text-[color:var(--ink-2)] mt-1">{(item.specializations||[]).slice(0,3).join(" · ")}</p>
        <p className="text-xs text-[color:var(--muted)] mt-2">{item.city}, {item.country}</p>
      </div>
    </Link>
  );
}
