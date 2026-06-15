import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Crown, Filter } from 'lucide-react';
import { beachMapApi } from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import { Button, PageLoader, EliteBadge } from '../components/ui';
import type { BeachLocation, BeachStatus } from '../../../shared/types';

const STATUS_CONFIG: Record<BeachStatus, { color: string; label: string; hex: string }> = {
  official_nude: { color: 'bg-red-700', label: 'Official Nude Beach', hex: '#c2410c' },
  clothing_optional: { color: 'bg-orange-400', label: 'Clothing Optional', hex: '#fb923c' },
  gay_beach: { color: 'bg-pink-500', label: 'Gay Beach', hex: '#ec4899' },
  gay_resort: { color: 'bg-yellow-500', label: 'Gay Resort', hex: '#eab308' },
  clothed_gay_beach: { color: 'bg-indigo-500', label: 'Clothed Gay Beach', hex: '#6366f1' },
};

const BeachMapPage: React.FC = () => {
  const { user } = useAuthStore();
  const isElite = user?.membershipTier === 'Elite';
  const [activeFilter, setActiveFilter] = useState<BeachStatus | 'all'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['beach-map'],
    queryFn: beachMapApi.getAll,
    enabled: isElite,
  });

  const beaches: BeachLocation[] = data?.data?.data || [];
  const filtered = activeFilter === 'all' ? beaches : beaches.filter(b => b.status === activeFilter);

  if (!isElite) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
        <Crown className="w-16 h-16 text-bask-terracotta mx-auto mb-5" />
        <h1 className="font-display text-4xl text-bask-dark mb-3">Beach & Destination Map</h1>
        <p className="font-body text-bask-muted text-lg mb-2 max-w-lg mx-auto">
          Explore 24 LGBTQ+-affirming beach and resort destinations worldwide — from nude beaches in Mexico to gay resorts in Europe.
        </p>
        <p className="font-body text-bask-muted mb-8">This feature is exclusively for BASK Elite members.</p>
        <Link to="/membership">
          <Button size="lg" icon={<Crown className="w-5 h-5" />}>Upgrade to Elite — $120/yr</Button>
        </Link>
      </div>
    );
  }

  if (isLoading) return <PageLoader />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-4xl text-bask-dark">Beach Map</h1>
            <EliteBadge />
          </div>
          <p className="font-body text-bask-muted">{beaches.length} curated destinations worldwide</p>
        </div>
      </div>

      {/* Legend & filters */}
      <div className="bg-white rounded-2xl border border-amber-100 p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-bask-muted" />
          <span className="text-sm font-body font-medium text-bask-dark">Filter by type</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-body font-medium transition-colors ${activeFilter === 'all' ? 'bg-bask-terracotta text-white' : 'bg-amber-50 text-bask-muted hover:text-bask-dark'}`}
          >
            All ({beaches.length})
          </button>
          {(Object.entries(STATUS_CONFIG) as [BeachStatus, typeof STATUS_CONFIG[BeachStatus]][]).map(([status, cfg]) => {
            const count = beaches.filter(b => b.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setActiveFilter(status)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body font-medium transition-colors ${activeFilter === status ? 'bg-bask-terracotta text-white' : 'bg-amber-50 text-bask-muted hover:text-bask-dark'}`}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.hex }} />
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Map */}
      <div className="rounded-2xl overflow-hidden border border-amber-200 shadow-sm mb-6" style={{ height: '60vh' }}>
        <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filtered.map(beach => {
            const cfg = STATUS_CONFIG[beach.status];
            return (
              <CircleMarker
                key={beach.id}
                center={[beach.latitude, beach.longitude]}
                radius={8}
                pathOptions={{ color: '#fff', fillColor: cfg.hex, fillOpacity: 0.9, weight: 2 }}
              >
                <Popup>
                  <div className="min-w-[200px] font-body">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: cfg.hex }} />
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{beach.name}</p>
                        <p className="text-xs text-gray-500">{beach.location}, {beach.country}</p>
                      </div>
                    </div>
                    <p className="text-xs text-bask-terracotta font-medium mb-1.5">{cfg.label}</p>
                    <p className="text-xs text-gray-600 leading-relaxed">{beach.description}</p>
                    {beach.baskNotes && (
                      <p className="text-xs text-bask-terracotta mt-2 italic">✦ {beach.baskNotes}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {beach.tags?.slice(0,3).map(t => (
                        <span key={t} className="px-1.5 py-0.5 bg-amber-100 text-bask-terracotta text-xs rounded">{t}</span>
                      ))}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* Location list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(beach => {
          const cfg = STATUS_CONFIG[beach.status];
          return (
            <div key={beach.id} className="flex items-start gap-3 p-4 rounded-xl bg-white border border-amber-100 hover:border-amber-200 transition-colors">
              <span className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: cfg.hex }} />
              <div>
                <p className="font-body font-medium text-bask-dark text-sm">{beach.name}</p>
                <p className="text-bask-muted text-xs font-body">{beach.location}, {beach.country}</p>
                <p className="text-bask-terracotta text-xs font-body mt-0.5">{cfg.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BeachMapPage;
