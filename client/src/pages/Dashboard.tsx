import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Crown, Compass, Bell, MapPin, ArrowRight, Clock, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../lib/authStore';
import { tripsApi, tripRequestsApi, conciergeApi } from '../lib/api';
import { Card, StatusBadge, EliteBadge, PageLoader } from '../components/ui';

const QuickAction: React.FC<{ to: string; icon: React.ReactNode; label: string; desc: string; elite?: boolean }> = ({ to, icon, label, desc, elite }) => (
  <Link to={to} className="group flex items-start gap-4 p-5 rounded-xl border border-amber-100 bg-white hover:border-amber-300 hover:shadow-sm transition-all duration-200">
    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 group-hover:bg-bask-terracotta transition-colors">
      <span className="text-bask-terracotta group-hover:text-white transition-colors">{icon}</span>
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p className="font-body font-medium text-bask-dark text-sm">{label}</p>
        {elite && <EliteBadge />}
      </div>
      <p className="text-bask-muted text-xs font-body mt-0.5">{desc}</p>
    </div>
    <ArrowRight className="w-4 h-4 text-bask-muted group-hover:text-bask-terracotta transition-colors flex-shrink-0 mt-0.5" />
  </Link>
);

const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const isElite = user?.membershipTier === 'Elite';

  const { data: tripsData } = useQuery({ queryKey: ['trips'], queryFn: tripsApi.getAll });
  const { data: myRequestsData } = useQuery({ queryKey: ['my-trip-requests'], queryFn: tripRequestsApi.mine });
  const { data: myConciergeData } = useQuery({ queryKey: ['my-concierge'], queryFn: conciergeApi.mine });

  const upcomingTrips = (tripsData?.data?.data || []).filter((t: { isPast: boolean }) => !t.isPast).slice(0, 2);
  const myRequests = (myRequestsData?.data?.data || []).slice(0, 3);
  const myConcierge = (myConciergeData?.data?.data || []).slice(0, 2);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* Welcome header */}
      <div className="mb-10">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-4xl text-bask-dark mb-1">
              Welcome back, {user?.firstName}
            </h1>
            <p className="font-body text-bask-muted">Your BASK dashboard</p>
          </div>
          {isElite && (
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-bask-terracotta/10 border border-bask-terracotta/20">
              <Crown className="w-5 h-5 text-bask-terracotta" />
              <div>
                <p className="text-xs font-medium text-bask-terracotta font-body">Elite Member</p>
                <p className="text-xs text-bask-muted font-body">Full access unlocked</p>
              </div>
            </div>
          )}
        </div>

        {/* Elite upgrade nudge for Standard members */}
        {!isElite && (
          <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-bask-terracotta flex-shrink-0" />
              <div>
                <p className="font-body font-medium text-bask-dark text-sm">Unlock Beach Map, Elite Homes & Perks</p>
                <p className="font-body text-bask-muted text-xs">BASK Elite — $120/year</p>
              </div>
            </div>
            <Link to="/membership" className="flex-shrink-0 px-4 py-2 bg-bask-terracotta text-white text-xs font-medium font-body rounded-lg hover:bg-bask-bronze transition-colors">
              Upgrade
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-8">

          {/* Quick actions */}
          <div>
            <h2 className="font-display text-xl text-bask-dark mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <QuickAction to="/new-trip" icon={<Compass className="w-5 h-5" />} label="Plan a Trip" desc="Submit a custom trip request" />
              <QuickAction to="/curated-trips" icon={<MapPin className="w-5 h-5" />} label="Browse Trips" desc="Join an upcoming experience" />
              <QuickAction to="/concierge" icon={<Bell className="w-5 h-5" />} label="Concierge" desc="Get 24/7 travel support" />
              <QuickAction to="/beach-map" icon={<MapPin className="w-5 h-5" />} label="Beach Map" desc="Explore 24 destinations" elite={!isElite} />
            </div>
          </div>

          {/* Upcoming trips */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl text-bask-dark">Upcoming Experiences</h2>
              <Link to="/curated-trips" className="text-sm text-bask-terracotta font-body hover:underline">View all</Link>
            </div>
            <div className="space-y-3">
              {upcomingTrips.map((trip: { id: number; title: string; destination: string; country: string; startDate: string; pricePerPerson: number }) => (
                <Link key={trip.id} to={`/curated-trips/${trip.id}`} className="flex items-center gap-4 p-4 rounded-xl border border-amber-100 bg-white hover:border-amber-200 hover:shadow-sm transition-all group">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-bask-terracotta to-bask-bronze flex-shrink-0 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-medium text-bask-dark text-sm truncate">{trip.title}</p>
                    <p className="text-bask-muted text-xs font-body">{trip.destination} · {trip.startDate}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-display text-bask-terracotta text-lg">${trip.pricePerPerson.toLocaleString()}</p>
                    <p className="text-bask-muted text-xs font-body">per person</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* My trip requests */}
          {myRequests.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl text-bask-dark">My Trip Requests</h2>
                <Link to="/my-trips" className="text-sm text-bask-terracotta font-body hover:underline">View all</Link>
              </div>
              <div className="space-y-2">
                {myRequests.map((req: { id: number; destination: string; status: string; created_at: string }) => (
                  <div key={req.id} className="flex items-center justify-between p-4 rounded-xl border border-amber-100 bg-white">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-bask-muted" />
                      <div>
                        <p className="font-body font-medium text-bask-dark text-sm">{req.destination}</p>
                        <p className="text-bask-muted text-xs font-body">{new Date(req.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Membership card */}
          <Card elite={isElite} className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-5 h-5 text-bask-terracotta" />
              <h3 className="font-display text-lg text-bask-dark">Membership</h3>
            </div>
            <p className="font-display text-2xl text-bask-terracotta mb-1">{user?.membershipTier}</p>
            <p className="text-bask-muted text-xs font-body mb-4">
              {isElite ? 'Full access to all BASK features' : 'Standard access'}
            </p>
            <Link to="/membership" className="text-sm font-body text-bask-terracotta hover:underline">
              {isElite ? 'Manage subscription →' : 'Upgrade to Elite →'}
            </Link>
          </Card>

          {/* Recent concierge */}
          {myConcierge.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-lg text-bask-dark">Concierge</h3>
                <Link to="/concierge" className="text-xs text-bask-terracotta font-body hover:underline">View all</Link>
              </div>
              <div className="space-y-2">
                {myConcierge.map((req: { id: number; category: string; status: string }) => (
                  <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-100 bg-white">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-bask-muted" />
                      <p className="font-body text-sm text-bask-dark">{req.category}</p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Profile quick links */}
          <div className="p-5 rounded-xl border border-amber-100 bg-white">
            <h3 className="font-display text-lg text-bask-dark mb-3">Account</h3>
            <div className="space-y-2">
              <Link to="/profile" className="block text-sm font-body text-bask-dark hover:text-bask-terracotta py-1 transition-colors">Profile & Preferences</Link>
              <Link to="/my-trips" className="block text-sm font-body text-bask-dark hover:text-bask-terracotta py-1 transition-colors">My Trip Requests</Link>
              <Link to="/gift-shop" className="block text-sm font-body text-bask-dark hover:text-bask-terracotta py-1 transition-colors">Gift Shop</Link>
              {user?.isAdmin && (
                <Link to="/admin" className="block text-sm font-body text-bask-terracotta font-medium py-1 hover:underline">Admin Dashboard →</Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
