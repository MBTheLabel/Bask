import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Check, Lock } from 'lucide-react';
import { authApi } from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import { Button } from '../components/ui';

const STANDARD_FEATURES = [
  'Browse all curated trips',
  'Submit custom trip requests',
  'Concierge request access',
  'Gift shop (standard items)',
  'Partner Homes browsing',
  'Profile management',
];

const ELITE_FEATURES = [
  'Everything in Standard',
  'Interactive Beach Map (24 destinations)',
  'Partner Perks — exclusive discounts',
  'Elite-only Partner Homes',
  'Elite-only Gift Shop items',
  'Full itinerary access (no extra cost)',
  'Priority concierge consideration',
];

const MembershipGatePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState<'Standard' | 'Elite' | null>(null);

  const handleSelect = async (tier: 'Standard' | 'Elite') => {
    setLoading(tier);
    try {
      if (tier === 'Elite') {
        // Go to Stripe checkout for Elite
        const res = await (await import('../lib/api')).stripeApi.createEliteSession();
        window.location.href = res.data.data.url;
      } else {
        await authApi.selectMembership('Standard');
        updateUser({ membershipTier: 'Standard', hasSelectedMembership: true });
        navigate('/dashboard', { replace: true });
      }
    } catch {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-bask-cream flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <span className="font-display text-4xl font-bold text-bask-terracotta tracking-widest">BASK</span>
          <h1 className="font-display text-3xl md:text-4xl text-bask-dark mt-3 mb-3">
            Welcome, {user?.firstName}
          </h1>
          <p className="font-body text-bask-muted text-lg">
            Choose your membership to get started
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Standard */}
          <div className="bg-white rounded-2xl border-2 border-amber-100 p-8 flex flex-col">
            <div className="mb-6">
              <p className="font-body text-bask-muted text-sm uppercase tracking-wide mb-1">Free forever</p>
              <h2 className="font-display text-3xl text-bask-dark">Standard</h2>
              <p className="font-display text-4xl text-bask-dark mt-2">$0</p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {STANDARD_FEATURES.map(f => (
                <li key={f} className="flex items-center gap-3 text-sm font-body text-bask-dark">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              variant="secondary"
              className="w-full"
              size="lg"
              loading={loading === 'Standard'}
              onClick={() => handleSelect('Standard')}
            >
              Continue with Standard
            </Button>
          </div>

          {/* Elite */}
          <div className="bg-gradient-to-br from-bask-terracotta to-bask-bronze rounded-2xl p-8 flex flex-col relative overflow-hidden">
            {/* Shimmer effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />

            <div className="mb-6 relative">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-body mb-3">
                <Crown className="w-3 h-3" />
                Recommended
              </div>
              <h2 className="font-display text-3xl text-white">Elite</h2>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="font-display text-4xl text-white">$120</p>
                <p className="font-body text-white/70 text-sm">/ year</p>
              </div>
              <p className="font-body text-white/60 text-xs mt-1">$10/month — billed annually</p>
            </div>

            <ul className="space-y-3 flex-1 mb-8 relative">
              {ELITE_FEATURES.map((f, i) => (
                <li key={f} className={`flex items-center gap-3 text-sm font-body ${i === 0 ? 'text-white/60' : 'text-white'}`}>
                  {i === 0 ? (
                    <Check className="w-4 h-4 text-white/40 flex-shrink-0" />
                  ) : (
                    <Crown className="w-4 h-4 text-bask-sand flex-shrink-0" />
                  )}
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSelect('Elite')}
              disabled={loading === 'Elite'}
              className="w-full py-4 bg-white text-bask-terracotta font-body font-semibold rounded-xl hover:bg-bask-cream transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading === 'Elite' ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-bask-terracotta border-t-transparent rounded-full animate-spin" />
                  Redirecting...
                </span>
              ) : (
                <>
                  <Crown className="w-5 h-5" />
                  Upgrade to Elite
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-bask-muted font-body mt-6">
          <Lock className="w-3 h-3 inline mr-1" />
          Payments secured by Stripe. Cancel anytime from your membership settings.
        </p>
      </div>
    </div>
  );
};

export default MembershipGatePage;
