import { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';

interface Event {
  id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  capacity: number;
  price: number;
  tier: 'standard' | 'elite';
  image: string | null;
  tags: string[];
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'elite'>('all');

  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(data => {
        const parsed = data.map((e: any) => ({
          ...e,
          tags: typeof e.tags === 'string' ? JSON.parse(e.tags) : e.tags || [],
        }));
        setEvents(parsed);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = events.filter(e => {
    if (filter === 'elite') return e.tier === 'elite';
    return true;
  });

  return (
    <div className="min-h-screen bg-bask-cream">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="font-display text-4xl text-bask-dark mb-2">Events</h1>
          <p className="font-body text-bask-muted text-lg">Exclusive gatherings, workshops, and celebrations for the BASK community.</p>
        </div>

        <div className="flex gap-3 mb-8">
          {(['all', 'upcoming', 'elite'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl font-body text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-bask-terracotta text-white' : 'bg-white text-bask-muted border border-amber-100 hover:text-bask-dark'}`}>
              {f === 'elite' ? '👑 Elite Only' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-bask-muted font-body">Loading events...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-bask-muted font-body">No events found.</div>
        ) : (
          <div className="space-y-6">
            {filtered.map(event => (
              <div key={event.id} className="bg-white rounded-2xl p-6 border border-amber-100 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {event.tier === 'elite' && (
                        <span className="bg-bask-gold/20 text-bask-gold text-xs font-body font-medium px-2 py-0.5 rounded-full">👑 Elite</span>
                      )}
                      {event.tags.map(t => (
                        <span key={t} className="bg-amber-50 text-bask-muted text-xs font-body px-2 py-0.5 rounded-full">{t}</span>
                      ))}
                    </div>
                    <h2 className="font-display text-xl text-bask-dark mb-2">{event.title}</h2>
                    <p className="font-body text-bask-muted text-sm mb-4">{event.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm font-body text-bask-muted">
                      <span className="flex items-center gap-1"><Calendar size={14} />{event.date}</span>
                      <span className="flex items-center gap-1"><Clock size={14} />{event.time}</span>
                      <span className="flex items-center gap-1"><MapPin size={14} />{event.location}</span>
                      <span className="flex items-center gap-1"><Users size={14} />{event.capacity} spots</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-2xl text-bask-terracotta mb-3">
                      {event.price === 0 ? 'Free' : `$${event.price}`}
                    </p>
                    <button className="bg-bask-terracotta text-white px-5 py-2 rounded-xl font-body text-sm font-medium hover:bg-bask-terracotta/90 transition-colors">
                      RSVP
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
