import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Calendar, Users, DollarSign, ArrowLeft, Crown, Tag } from 'lucide-react';
import { tripsApi, stripeApi } from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import { Button, Badge, PageLoader, Modal, Alert, StatusBadge } from '../components/ui';
import type { CuratedTrip } from '../../../shared/types';

// ─── TRIP CARD ────────────────────────────────────────────────
const TripCard: React.FC<{ trip: CuratedTrip }> = ({ trip }) => (
  <Link to={`/curated-trips/${trip.id}`} className="card group block">
    <div className="h-48 bg-gradient-to-br from-bask-bronze to-bask-terracotta relative overflow-hidden">
      <div className="absolute inset-0 flex items-end p-5">
        <div>
          <p className="text-white/70 text-xs font-body mb-1">
            <MapPin className="w-3 h-3 inline mr-1" />
            {trip.destination}, {trip.country}
          </p>
          <h3 className="font-display text-xl text-white">{trip.title}</h3>
        </div>
      </div>
      {trip.isPast && (
        <span className="absolute top-3 right-3 px-2.5 py-1 bg-black/40 text-white/80 text-xs rounded-full font-body">Past</span>
      )}
    </div>
    <div className="p-5">
      <p className="text-bask-muted text-sm font-body line-clamp-2 mb-4">{trip.description}</p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {trip.tags.slice(0, 3).map(t => <Badge key={t}>{t}</Badge>)}
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-amber-100">
        <div>
          {trip.isPast ? (
            <span className="text-bask-muted text-xs font-body">Itinerary — $50</span>
          ) : (
            <>
              <span className="font-display text-2xl text-bask-terracotta">${trip.pricePerPerson.toLocaleString()}</span>
              <span className="text-bask-muted text-xs font-body ml-1">/person</span>
            </>
          )}
        </div>
        <span className="text-sm text-bask-terracotta font-body font-medium group-hover:underline">
          {trip.isPast ? 'View Itinerary' : 'Learn More'} →
        </span>
      </div>
    </div>
  </Link>
);

// ─── CURATED TRIPS PAGE ───────────────────────────────────────
type Filter = 'all' | 'upcoming' | 'past';

const CuratedTripsPage: React.FC = () => {
  const [filter, setFilter] = useState<Filter>('all');
  const { data, isLoading } = useQuery({ queryKey: ['trips'], queryFn: tripsApi.getAll });
  const trips: CuratedTrip[] = data?.data?.data || [];

  const filtered = trips.filter(t => {
    if (filter === 'upcoming') return !t.isPast;
    if (filter === 'past') return t.isPast;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="font-display text-4xl text-bask-dark mb-2">Curated Experiences</h1>
        <p className="font-body text-bask-muted text-lg">Group trips designed for the community-driven traveler</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-8">
        {(['all', 'upcoming', 'past'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-body font-medium transition-colors capitalize ${
              filter === f ? 'bg-bask-terracotta text-white' : 'bg-white text-bask-muted border border-amber-200 hover:border-amber-300'
            }`}
          >
            {f === 'all' ? 'All Trips' : f === 'upcoming' ? 'Upcoming' : 'Past Experiences'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="card">
              <div className="h-48 skeleton" />
              <div className="p-5 space-y-3">
                <div className="skeleton h-5 w-3/4" />
                <div className="skeleton h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {filter !== 'past' && filtered.filter(t => !t.isPast).length > 0 && (
            <div className="mb-10">
              {filter === 'all' && <h2 className="font-display text-2xl text-bask-dark mb-5">Upcoming</h2>}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.filter(t => !t.isPast).map(trip => <TripCard key={trip.id} trip={trip} />)}
              </div>
            </div>
          )}

          {filter !== 'upcoming' && filtered.filter(t => t.isPast).length > 0 && (
            <div>
              {filter === 'all' && (
                <div className="mb-5">
                  <h2 className="font-display text-2xl text-bask-dark">Past Experiences</h2>
                  <p className="text-bask-muted text-sm font-body mt-1">Purchase full itineraries for $50 each</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.filter(t => t.isPast).map(trip => <TripCard key={trip.id} trip={trip} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CuratedTripsPage;

// ─── TRIP DETAIL PAGE ─────────────────────────────────────────
export const TripDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [bookingModal, setBookingModal] = useState(false);
  const [guestCount, setGuestCount] = useState(1);
  const [specialRequests, setSpecialRequests] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => tripsApi.getById(Number(id)),
  });

  const trip: CuratedTrip | undefined = data?.data?.data;

  const bookMutation = useMutation({
    mutationFn: () => tripsApi.book(Number(id), { guestCount, specialRequests }),
    onSuccess: () => {
      setBookingModal(false);
      setSuccess('Booking request submitted! We\'ll be in touch soon.');
      queryClient.invalidateQueries({ queryKey: ['my-trip-requests'] });
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      setError(err.response?.data?.error || 'Booking failed. Please try again.');
    },
  });

  const handleItineraryPurchase = async () => {
    try {
      const res = await stripeApi.createItinerarySession(Number(id));
      window.location.href = res.data.data.url;
    } catch {
      setError('Failed to start purchase. Please try again.');
    }
  };

  if (isLoading) return <PageLoader />;
  if (!trip) return (
    <div className="max-w-4xl mx-auto px-6 py-20 text-center">
      <h2 className="font-display text-2xl text-bask-dark mb-4">Trip not found</h2>
      <Button onClick={() => navigate('/curated-trips')} icon={<ArrowLeft className="w-4 h-4" />}>Back to Trips</Button>
    </div>
  );

  const isElite = user?.membershipTier === 'Elite';
  const nights = Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-bask-muted hover:text-bask-dark font-body text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {success && <div className="mb-6"><Alert type="success" message={success} onDismiss={() => setSuccess('')} /></div>}
      {error && <div className="mb-6"><Alert type="error" message={error} onDismiss={() => setError('')} /></div>}

      {/* Hero */}
      <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-bask-dark via-bask-bronze to-bask-terracotta h-64 md:h-80 flex items-end p-8 mb-8">
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            {trip.tags.map(t => (
              <span key={t} className="px-3 py-1 bg-white/20 text-white text-xs rounded-full font-body">{t}</span>
            ))}
          </div>
          <h1 className="font-display text-4xl md:text-5xl text-white mb-2">{trip.title}</h1>
          <p className="text-white/70 font-body flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            {trip.destination}, {trip.country}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <p className="font-body text-bask-dark text-lg leading-relaxed">{trip.description}</p>

          {/* Trip details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Calendar, label: 'Duration', value: `${nights} nights` },
              { icon: Calendar, label: 'Departs', value: new Date(trip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) },
              { icon: Calendar, label: 'Returns', value: new Date(trip.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) },
              { icon: Users, label: 'Max Guests', value: trip.maxGuests ? `${trip.maxGuests} people` : 'TBD' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                <Icon className="w-4 h-4 text-bask-terracotta mb-2" />
                <p className="text-xs text-bask-muted font-body">{label}</p>
                <p className="font-body font-medium text-bask-dark text-sm mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Itinerary */}
          {trip.isPast && (
            <div className="p-6 rounded-xl border border-amber-200 bg-amber-50">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-5 h-5 text-bask-terracotta" />
                <h3 className="font-display text-xl text-bask-dark">Full Itinerary</h3>
              </div>
              {isElite ? (
                trip.fullItinerary ? (
                  <div className="prose prose-sm max-w-none font-body text-bask-dark whitespace-pre-line">
                    {trip.fullItinerary}
                  </div>
                ) : (
                  <p className="font-body text-bask-muted text-sm">Itinerary details coming soon.</p>
                )
              ) : (
                <div>
                  <p className="font-body text-bask-muted text-sm mb-4">Purchase the full day-by-day itinerary for this trip.</p>
                  <div className="flex items-center gap-3">
                    <Button onClick={handleItineraryPurchase} icon={<DollarSign className="w-4 h-4" />}>
                      Purchase Itinerary — $50
                    </Button>
                    <Link to="/membership" className="text-sm font-body text-bask-terracotta hover:underline flex items-center gap-1">
                      <Crown className="w-4 h-4" />
                      Elite gets free access
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="p-6 rounded-2xl border-2 border-amber-200 bg-white sticky top-24">
            {!trip.isPast ? (
              <>
                <p className="font-display text-4xl text-bask-terracotta mb-1">${trip.pricePerPerson.toLocaleString()}</p>
                <p className="text-bask-muted text-sm font-body mb-5">per person</p>
                <Button className="w-full" size="lg" onClick={() => setBookingModal(true)}>
                  Request to Join
                </Button>
                <p className="text-center text-xs text-bask-muted font-body mt-3">No payment now — we'll confirm availability first</p>
              </>
            ) : (
              <>
                <p className="font-body font-medium text-bask-dark mb-1">Past Experience</p>
                <p className="text-bask-muted text-sm font-body mb-5">Get the full day-by-day itinerary</p>
                {isElite ? (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
                    <Crown className="w-5 h-5 text-bask-terracotta mx-auto mb-1" />
                    <p className="text-sm font-body text-bask-terracotta font-medium">Elite Access Included</p>
                  </div>
                ) : (
                  <Button className="w-full" onClick={handleItineraryPurchase}>
                    Buy Itinerary — $50
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Booking modal */}
      <Modal open={bookingModal} onClose={() => setBookingModal(false)} title="Request to Join">
        <div className="space-y-5">
          <p className="text-bask-muted text-sm font-body">
            Submit your request to join <strong className="text-bask-dark">{trip.title}</strong>. No payment is collected now — our team will reach out to confirm availability.
          </p>

          <div>
            <label className="label">Number of guests</label>
            <select value={guestCount} onChange={e => setGuestCount(Number(e.target.value))} className="input-field">
              {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} guest{n > 1 ? 's' : ''}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Special requests (optional)</label>
            <textarea
              value={specialRequests}
              onChange={e => setSpecialRequests(e.target.value)}
              className="input-field min-h-[80px] resize-none"
              placeholder="Dietary needs, accessibility, room preferences..."
            />
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setBookingModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={bookMutation.isPending} onClick={() => bookMutation.mutate()}>
              Submit Request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
