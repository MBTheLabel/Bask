import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Crown, MapPin, Compass, Star, Users, Shield } from 'lucide-react';
import { tripsApi } from '../lib/api';
import { Badge, TripCardSkeleton } from '../components/ui';
import type { CuratedTrip } from '../../../shared/types';

const HeroSection: React.FC = () => (
  <section className="relative min-h-[90vh] flex items-center overflow-hidden">
    {/* Background gradient */}
    <div className="absolute inset-0 bg-gradient-to-br from-bask-dark via-bask-bronze to-bask-terracotta opacity-95" />

    {/* Decorative pattern */}
    <div className="absolute inset-0 opacity-10"
      style={{
        backgroundImage: `radial-gradient(circle at 2px 2px, #fde68a 1px, transparent 0)`,
        backgroundSize: '40px 40px',
      }}
    />

    <div className="relative max-w-7xl mx-auto px-6 py-24">
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-bask-sand text-sm font-body mb-8">
          <Crown className="w-4 h-4" />
          High-Touch Travel & Concierge
        </div>

        <h1 className="font-display text-6xl md:text-7xl lg:text-8xl text-white leading-[0.9] mb-6">
          Travel
          <br />
          <span className="text-bask-sand italic">Fearlessly.</span>
          <br />
          Live
          <br />
          <span className="text-bask-sand italic">Fully.</span>
        </h1>

        <p className="font-body text-xl text-white/70 leading-relaxed mb-10 max-w-xl">
          Curated group experiences for the LGBTQ+ traveler. Nude-friendly beaches,
          world Pride celebrations, and 24/7 concierge—all in one community.
        </p>

        <div className="flex flex-wrap gap-4">
          <Link to="/register" className="inline-flex items-center gap-2 px-8 py-4 bg-bask-sand text-bask-dark font-body font-semibold rounded-xl hover:bg-white transition-colors text-base shadow-lg">
            Join BASK
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link to="/membership" className="inline-flex items-center gap-2 px-8 py-4 border-2 border-white/30 text-white font-body font-medium rounded-xl hover:bg-white/10 transition-colors text-base">
            <Crown className="w-5 h-5" />
            Elite — $120/yr
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-16 flex flex-wrap gap-8">
          {[
            { value: '10+', label: 'Curated Trips' },
            { value: '24', label: 'Beach Destinations' },
            { value: '24/7', label: 'Concierge' },
            { value: '100%', label: 'LGBTQ+ Affirming' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="font-display text-3xl text-bask-sand">{value}</p>
              <p className="font-body text-sm text-white/50">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

const TripCard: React.FC<{ trip: CuratedTrip; past?: boolean }> = ({ trip, past }) => (
  <Link to={`/curated-trips/${trip.id}`} className="card group block">
    {/* Image placeholder with gradient */}
    <div className="relative h-52 overflow-hidden bg-gradient-to-br from-bask-bronze to-bask-terracotta">
      <div className="absolute inset-0 flex items-end p-5">
        <div>
          <p className="font-body text-xs text-white/70 mb-1">
            <MapPin className="w-3 h-3 inline mr-1" />
            {trip.destination}, {trip.country}
          </p>
          <h3 className="font-display text-xl text-white leading-tight">{trip.title}</h3>
        </div>
      </div>
      {past && (
        <div className="absolute top-4 right-4">
          <span className="px-3 py-1 bg-black/40 text-white/80 text-xs font-body rounded-full">Past Experience</span>
        </div>
      )}
    </div>

    <div className="p-5">
      <p className="text-bask-muted text-sm font-body leading-relaxed mb-4 line-clamp-2">{trip.description}</p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {trip.tags.slice(0, 3).map(tag => (
          <Badge key={tag} color="terracotta">{tag}</Badge>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-amber-100">
        <div>
          {past ? (
            <p className="text-bask-muted text-xs font-body">Itinerary available</p>
          ) : (
            <>
              <p className="font-display text-2xl text-bask-terracotta">${Number(trip.price_per_person || 0).toLocaleString()}</p>
              <p className="text-bask-muted text-xs font-body">per person</p>
            </>
          )}
        </div>
        <span className="inline-flex items-center gap-1 text-sm text-bask-terracotta font-medium font-body group-hover:gap-2 transition-all">
          {past ? 'View Itinerary' : 'Learn More'}
          <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </div>
  </Link>
);

const FeaturesSection: React.FC = () => (
  <section className="py-24 bg-white">
    <div className="max-w-7xl mx-auto px-6">
      <div className="text-center mb-16">
        <h2 className="font-display text-4xl md:text-5xl text-bask-dark mb-4">
          Travel the way you want
        </h2>
        <p className="font-body text-bask-muted text-lg max-w-xl mx-auto">
          BASK is built for travelers who want more than a booking — they want an experience.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          {
            icon: Compass,
            title: 'Curated Group Trips',
            desc: 'Expert-designed itineraries to Pride events, nude beaches, and cultural destinations worldwide — with your community.',
          },
          {
            icon: Shield,
            title: '24/7 Concierge',
            desc: 'On-demand travel advocacy, booking support, and lifestyle assistance. From flights to dinner reservations.',
          },
          {
            icon: Crown,
            title: 'Elite Membership',
            desc: 'Unlock the Beach Map, Partner Perks, exclusive rentals, and priority concierge for just $120/year.',
          },
          {
            icon: Users,
            title: 'Community First',
            desc: 'LGBTQ+ affirming, nude-friendly, and inclusive. Every trip and property is vetted for safety and welcome.',
          },
          {
            icon: MapPin,
            title: 'Partner Homes',
            desc: 'Curated vacation rentals in gay-friendly and clothing-optional destinations, handpicked by the BASK team.',
          },
          {
            icon: Star,
            title: 'Exclusive Perks',
            desc: 'Elite member discounts from wellness brands, lifestyle apps, and travel partners you actually love.',
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="group p-7 rounded-2xl border border-amber-100 hover:border-amber-200 hover:shadow-md transition-all duration-200">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-5 group-hover:bg-bask-terracotta transition-colors">
              <Icon className="w-6 h-6 text-bask-terracotta group-hover:text-white transition-colors" />
            </div>
            <h3 className="font-display text-xl text-bask-dark mb-2">{title}</h3>
            <p className="font-body text-bask-muted text-sm leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const EliteCTASection: React.FC = () => (
  <section className="py-20 bg-bask-dark">
    <div className="max-w-4xl mx-auto px-6 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bask-terracotta/20 border border-bask-terracotta/30 text-bask-sand text-sm font-body mb-6">
        <Crown className="w-4 h-4" />
        BASK Elite
      </div>
      <h2 className="font-display text-4xl md:text-5xl text-white mb-5">
        Unlock the full BASK experience
      </h2>
      <p className="font-body text-white/60 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
        The Beach Map. Exclusive partner homes. Elite perks from brands you love.
        Priority concierge. All for $120 a year.
      </p>
      <Link to="/membership" className="inline-flex items-center gap-2 px-8 py-4 bg-bask-terracotta text-white font-body font-semibold rounded-xl hover:bg-bask-bronze transition-colors text-base">
        <Crown className="w-5 h-5" />
        Become Elite
      </Link>
    </div>
  </section>
);

const LandingPage: React.FC = () => {
  const { data: tripsData, isLoading } = useQuery({
    queryKey: ['trips-public'],
    queryFn: () => tripsApi.getAll(),
  });

  const trips: CuratedTrip[] = tripsData?.data?.data || [];
  const upcoming = trips.filter(t => !t.isPast).slice(0, 3);
  const past = trips.filter(t => t.isPast).slice(0, 3);

  return (
    <div>
      <HeroSection />

      {/* Upcoming trips */}
      <section className="py-24 bg-bask-cream">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="font-body text-bask-terracotta text-sm font-medium uppercase tracking-wide mb-2">Where we're going</p>
              <h2 className="font-display text-4xl text-bask-dark">Upcoming Experiences</h2>
            </div>
            <Link to="/curated-trips" className="hidden sm:flex items-center gap-1 text-bask-terracotta font-body text-sm font-medium hover:gap-2 transition-all">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1,2,3].map(i => <TripCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {upcoming.map(trip => <TripCard key={trip.id} trip={trip} />)}
            </div>
          )}
        </div>
      </section>

      <FeaturesSection />

      {/* Past trips */}
      <section className="py-24 bg-bask-cream">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="font-body text-bask-terracotta text-sm font-medium uppercase tracking-wide mb-2">Revisit the journey</p>
              <h2 className="font-display text-4xl text-bask-dark">Past Experiences</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {past.map(trip => <TripCard key={trip.id} trip={trip} past />)}
          </div>
          <p className="text-center text-bask-muted text-sm font-body mt-6">
            Past itineraries available for purchase — $50 each
          </p>
        </div>
      </section>

      <EliteCTASection />
    </div>
  );
};

export default LandingPage;
