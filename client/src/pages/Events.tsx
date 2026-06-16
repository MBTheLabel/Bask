import { useState } from 'react';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';

const events = [
  {
    id: 1,
    title: 'BASK Summer Mixer',
    date: 'July 12, 2026',
    time: '7:00 PM - 11:00 PM',
    location: 'Soho House, New York',
    description: 'An exclusive evening for BASK members to connect, share travel stories, and preview upcoming trips. Complimentary drinks and light bites included.',
    capacity: 40,
    price: 0,
cat > client/src/pages/Events.tsx << 'EVEOF'
import { useState } from 'react';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';

const events = [
  {
    id: 1,
    title: 'BASK Summer Mixer',
    date: 'July 12, 2026',
    time: '7:00 PM - 11:00 PM',
    location: 'Soho House, New York',
    description: 'An exclusive evening for BASK members to connect, share travel stories, and preview upcoming trips. Complimentary drinks and light bites included.',
    capacity: 40,
    price: 0,
    tier: 'standard',
    image: null,
    tags: ['Social', 'Networking'],
  },
  {
    id: 2,
    title: 'Elite Member Dinner: Mykonos Preview',
    date: 'July 25, 2026',
    time: '8:00 PM - 11:00 PM',
    location: 'Private Residence, Los Angeles',
    description: 'An intimate dinner for Elite members previewing our Mykonos Pride Week trip. Meet your fellow travelers, review the itinerary, and get insider tips.',
    capacity: 16,
    price: 0,
    tier: 'elite',
    image: null,
    tags: ['Elite', 'Dinner', 'Preview'],
  },
  {
    id: 3,
    title: 'Travel Photography Workshop',
    date: 'August 5, 2026',
    time: '2:00 PM - 5:00 PM',
    location: 'Virtual — Zoom',
    description: 'Learn how to capture stunning travel moments with photographer and BASK member Marcus Reid. From golden hour portraits to candid street shots.',
    capacity: 50,
    price: 25,
    tier: 'standard',
    image: null,
    tags: ['Workshop', 'Virtual', 'Photography'],
  },
  {
    id: 4,
    title: 'Cape Town Trip Orientation',
    date: 'September 20, 2026',
    time: '6:00 PM - 8:00 PM',
    location: 'Virtual — Zoom',
    description: 'Pre-departure orientation for all Cape Town Safari & Beach travelers. Packing lists, cultural tips, safari briefing, and Q&A with your trip concierge.',
    capacity: 10,
    price: 0,
    tier: 'elite',
    image: null,
    tags: ['Orientation', 'Virtual', 'Cape Town'],
  },
  {
    id: 5,
    title: 'BASK Holiday Gala',
    date: 'December 6, 2026',
    time: '7:00 PM - Midnight',
    location: 'The Standard Hotel, Miami',
    description: 'Our annual holiday celebration. Live music, open bar, silent auction benefiting LGBTQ+ travel scholarships, and a preview of 2027 destinations.',
    capacity: 100,
    price: 75,
    tier: 'standard',
    image: null,
    tags: ['Gala', 'Annual', 'Miami'],
  },
];

export default function EventsPage() {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'elite'>('all');

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
      </div>
    </div>
  );
}
