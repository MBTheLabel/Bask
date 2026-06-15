import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Crown, Check, Lock, Music, BookOpen, User, Camera } from 'lucide-react';
import { authApi, stripeApi } from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import { Button, Alert, EliteBadge } from '../components/ui';
import type { Profile } from '../../../shared/types';

// ================================================================
// MEMBERSHIP PAGE
// ================================================================
const STANDARD_FEATURES = ['Browse curated trips', 'Custom trip requests', 'Concierge access', 'Partner Homes (standard)', 'Gift Shop (standard items)', 'Profile & preferences'];
const ELITE_FEATURES = ['Everything in Standard', 'Interactive Beach Map — 24 destinations', 'Partner Perks — exclusive discounts', 'Elite-only Partner Homes', 'Elite-only Gift Shop items', 'Full itinerary access free', 'Priority concierge consideration'];

const MembershipPage: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isElite = user?.membershipTier === 'Elite';

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await stripeApi.createEliteSession();
      window.location.href = res.data.data.url;
    } catch {
      setError('Failed to start checkout. Please try again.');
      setLoading(false);
    }
  };

  const handleManage = async () => {
    setLoading(true);
    try {
      const res = await stripeApi.getBillingPortal();
      window.location.href = res.data.data.url;
    } catch {
      setError('Failed to open billing portal.');
      setLoading(false);
    }
  };

  // Check for success/cancel query params
  const params = new URLSearchParams(window.location.search);
  const justUpgraded = params.get('success') === 'true';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="font-display text-5xl text-bask-dark mb-3">Membership</h1>
        <p className="font-body text-bask-muted text-lg">Choose the experience that fits your travel life</p>
      </div>

      {justUpgraded && (
        <div className="mb-8">
          <Alert type="success" title="Welcome to Elite!" message="Your BASK Elite membership is now active. Enjoy full access to all features." />
        </div>
      )}
      {error && <div className="mb-6"><Alert type="error" message={error} onDismiss={() => setError('')} /></div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Standard */}
        <div className={`rounded-2xl border-2 p-8 flex flex-col ${!isElite ? 'border-bask-terracotta' : 'border-amber-100'} bg-white`}>
          {!isElite && <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 text-bask-terracotta text-xs font-body font-medium mb-4 self-start">Current Plan</span>}
          <div className="mb-6">
            <h2 className="font-display text-3xl text-bask-dark">Standard</h2>
            <p className="font-display text-4xl text-bask-dark mt-3">$0</p>
            <p className="font-body text-bask-muted text-sm mt-1">Free forever</p>
          </div>
          <ul className="space-y-3 flex-1 mb-8">
            {STANDARD_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-3 text-sm font-body text-bask-dark">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
            <p className="text-xs font-body text-bask-muted text-center">Your current plan</p>
          </div>
        </div>

        {/* Elite */}
        <div className={`rounded-2xl p-8 flex flex-col relative overflow-hidden ${isElite ? 'border-2 border-bask-terracotta' : ''} bg-gradient-to-br from-bask-terracotta to-bask-bronze`}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20" />
          {isElite && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-body font-medium mb-4 self-start">
              <Crown className="w-3 h-3" /> Current Plan
            </span>
          )}
          <div className="mb-6 relative">
            <h2 className="font-display text-3xl text-white">Elite</h2>
            <div className="flex items-baseline gap-2 mt-3">
              <p className="font-display text-4xl text-white">$120</p>
              <p className="font-body text-white/70 text-sm">/ year</p>
            </div>
            <p className="font-body text-white/50 text-xs mt-1">$10/month — billed annually</p>
          </div>
          <ul className="space-y-3 flex-1 mb-8 relative">
            {ELITE_FEATURES.map((f, i) => (
              <li key={f} className={`flex items-center gap-3 text-sm font-body ${i === 0 ? 'text-white/60' : 'text-white'}`}>
                {i === 0 ? <Check className="w-4 h-4 text-white/40 flex-shrink-0" /> : <Crown className="w-4 h-4 text-bask-sand flex-shrink-0" />}
                {f}
              </li>
            ))}
          </ul>
          {isElite ? (
            <button onClick={handleManage} disabled={loading}
              className="w-full py-3.5 bg-white text-bask-terracotta font-body font-semibold rounded-xl hover:bg-bask-cream transition-colors disabled:opacity-60">
              Manage Subscription
            </button>
          ) : (
            <button onClick={handleUpgrade} disabled={loading}
              className="w-full py-3.5 bg-white text-bask-terracotta font-body font-semibold rounded-xl hover:bg-bask-cream transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-bask-terracotta border-t-transparent rounded-full animate-spin" />Redirecting...</span>
                : <><Crown className="w-5 h-5" />Upgrade to Elite</>}
            </button>
          )}
          <p className="text-center text-white/40 text-xs font-body mt-3">
            <Lock className="w-3 h-3 inline mr-1" />Secured by Stripe · Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
};

export default MembershipPage;

// ================================================================
// PROFILE PAGE
// ================================================================
const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Kosher', 'Dairy-Free', 'Nut Allergy', 'None'];
const INTEREST_OPTIONS = ['Beach', 'Nightlife', 'Wellness', 'Food & Dining', 'History', 'Nature', 'Arts & Culture', 'Hiking', 'Water Sports', 'Shopping', 'LGBTQ+ Events'];

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [nudeFriendly, setNudeFriendly] = useState(false);
  const [dietary, setDietary] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);

  const { data } = useQuery({ queryKey: ['profile'], queryFn: authApi.me, onSuccess: (d: { data: { data: Profile } }) => {
    const p = d.data.data;
    setNudeFriendly(p.nudeFriendly);
    setDietary(p.dietaryRestrictions || []);
    setInterests(p.travelInterests || []);
  }} as { queryKey: string[]; queryFn: typeof authApi.me; onSuccess: (d: { data: { data: Profile } }) => void });

  const mutation = useMutation({
    mutationFn: () => authApi.updateProfile({ firstName, lastName, nudeFriendly, dietaryRestrictions: dietary, travelInterests: interests }),
    onSuccess: () => {
      setSuccess('Profile updated successfully.');
      updateUser({ firstName, lastName });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => setError('Failed to update profile.'),
  });

  const toggle = (arr: string[], val: string, set: (a: string[]) => void) =>
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  const Chip: React.FC<{ label: string; selected: boolean; onClick: () => void }> = ({ label, selected, onClick }) => (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-body font-medium border transition-all ${selected ? 'bg-bask-terracotta text-white border-bask-terracotta' : 'bg-white text-bask-dark border-amber-200 hover:border-bask-terracotta'}`}>
      {selected && <Check className="w-3 h-3 inline mr-1" />}{label}
    </button>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-bask-terracotta to-bask-bronze flex items-center justify-center">
          <User className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="font-display text-3xl text-bask-dark">{user?.firstName} {user?.lastName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-bask-muted text-sm font-body">{user?.email}</span>
            {user?.membershipTier === 'Elite' && <EliteBadge />}
          </div>
        </div>
      </div>

      {success && <div className="mb-5"><Alert type="success" message={success} onDismiss={() => setSuccess('')} /></div>}
      {error && <div className="mb-5"><Alert type="error" message={error} onDismiss={() => setError('')} /></div>}

      <div className="bg-white rounded-2xl border border-amber-100 p-7 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">First name</label>
            <input value={firstName} onChange={e => setFirstName(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label">Last name</label>
            <input value={lastName} onChange={e => setLastName(e.target.value)} className="input-field" />
          </div>
        </div>

        <div>
          <label className="label">Email</label>
          <input value={user?.email || ''} disabled className="input-field opacity-60 cursor-not-allowed" />
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 border border-amber-100">
          <div>
            <p className="font-body font-medium text-bask-dark text-sm">Nude-Friendly Preference</p>
            <p className="text-bask-muted text-xs font-body mt-0.5">Include nude and clothing-optional options in recommendations</p>
          </div>
          <button onClick={() => setNudeFriendly(!nudeFriendly)}
            className={`w-12 h-6 rounded-full transition-colors relative ${nudeFriendly ? 'bg-bask-terracotta' : 'bg-gray-200'}`}>
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${nudeFriendly ? 'left-7' : 'left-1'}`} />
          </button>
        </div>

        <div>
          <label className="label">Dietary Restrictions</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {DIETARY_OPTIONS.map(d => <Chip key={d} label={d} selected={dietary.includes(d)} onClick={() => toggle(dietary, d, setDietary)} />)}
          </div>
        </div>

        <div>
          <label className="label">Travel Interests</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {INTEREST_OPTIONS.map(i => <Chip key={i} label={i} selected={interests.includes(i)} onClick={() => toggle(interests, i, setInterests)} />)}
          </div>
        </div>

        <Button className="w-full" loading={mutation.isPending} onClick={() => mutation.mutate()}>Save Changes</Button>
      </div>
    </div>
  );
};

// ================================================================
// BLOG PAGE
// ================================================================
export const BlogPage: React.FC = () => (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
    <div className="mb-12">
      <h1 className="font-display text-5xl text-bask-dark mb-3">Journal & Listen</h1>
      <p className="font-body text-bask-muted text-lg">Stories from the community, and conversations worth having</p>
    </div>

    {/* Podcast */}
    <div className="bg-bask-dark rounded-2xl p-8 mb-12">
      <div className="flex items-center gap-3 mb-4">
        <Music className="w-6 h-6 text-bask-sand" />
        <h2 className="font-display text-2xl text-white">Sex & Travel Digest</h2>
      </div>
      <p className="font-body text-white/60 text-sm mb-6">Candid conversations about travel, freedom, and living fully — the BASK podcast.</p>
      <div className="rounded-xl overflow-hidden">
        <iframe
          src="https://open.spotify.com/embed/show/placeholder?utm_source=generator&theme=0"
          width="100%"
          height="232"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="rounded-xl"
          title="Sex & Travel Digest Podcast"
        />
      </div>
    </div>

    {/* Journal articles */}
    <div>
      <div className="flex items-center gap-2 mb-6">
        <BookOpen className="w-5 h-5 text-bask-terracotta" />
        <h2 className="font-display text-2xl text-bask-dark">BASK Journal</h2>
      </div>

      <div className="space-y-5">
        {[
          {
            title: 'The Ultimate Guide to Clothing-Optional Travel',
            date: 'March 2026',
            excerpt: 'Everything you need to know before visiting your first nude beach — from etiquette to what to pack (and what not to).',
            readTime: '6 min read',
          },
          {
            title: 'Amsterdam World Pride 2026: What to Expect',
            date: 'February 2026',
            excerpt: 'The world\'s largest Pride celebration is coming to Amsterdam. Here\'s how to experience it at its fullest.',
            readTime: '8 min read',
          },
          {
            title: 'Gay Resorts Around the World: A BASK Guide',
            date: 'January 2026',
            excerpt: 'From Fire Island to Gran Canaria, the best LGBTQ+ resort destinations that made our Beach Map.',
            readTime: '10 min read',
          },
          {
            title: 'Brazil NYE Recap: Copacabana, Salvador & Beyond',
            date: 'December 2025',
            excerpt: 'Our team spent 13 days crossing three cities in Brazil. Here\'s everything that happened.',
            readTime: '12 min read',
          },
        ].map(article => (
          <div key={article.title} className="bg-white rounded-2xl border border-amber-100 p-6 hover:border-amber-200 hover:shadow-sm transition-all cursor-pointer group">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-display text-xl text-bask-dark mb-2 group-hover:text-bask-terracotta transition-colors">
                  {article.title}
                </h3>
                <p className="font-body text-bask-muted text-sm leading-relaxed mb-3">{article.excerpt}</p>
                <div className="flex items-center gap-3 text-xs text-bask-muted font-body">
                  <span>{article.date}</span>
                  <span>·</span>
                  <span>{article.readTime}</span>
                </div>
              </div>
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-bask-terracotta to-bask-bronze flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
