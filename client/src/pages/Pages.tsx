import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { Bell, Crown, ExternalLink, Home, Lock, MapPin, ShoppingBag, Star, Plus } from 'lucide-react';
import { conciergeApi, partnerHomesApi, partnerPerksApi, shopApi, stripeApi } from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import { Button, Alert, EmptyState, PageLoader, StatusBadge, UrgencyBadge, Badge, EliteBadge, Modal } from '../components/ui';

// ================================================================
// CONCIERGE PAGE
// ================================================================
const CATEGORIES = ['Flight & Transportation', 'Hotel & Accommodation', 'Restaurant & Dining', 'Events & Entertainment', 'Health & Wellness', 'Shopping & Gifts', 'General Travel Advice', 'Other'];
const URGENCY_OPTIONS = [
  { value: 'low', label: 'Low', desc: 'General planning, no time pressure' },
  { value: 'medium', label: 'Medium', desc: 'Within the next week or two' },
  { value: 'high', label: 'High', desc: 'Urgent, within 48 hours' },
  { value: 'emergency', label: 'Emergency', desc: 'Immediate assistance required' },
];

export const ConciergePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [urgency, setUrgency] = useState('low');
  const [description, setDescription] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['my-concierge'], queryFn: conciergeApi.mine });
  const requests: Array<{ id: number; category: string; urgency: string; description: string; status: string; admin_notes: string | null; created_at: string }> = data?.data?.data || [];

  const mutation = useMutation({
    mutationFn: () => conciergeApi.create({ category, urgency: urgency as 'low' | 'medium' | 'high' | 'emergency', description }),
    onSuccess: () => {
      setShowForm(false); setDescription(''); setUrgency('low');
      setSuccess('Concierge request submitted! We\'ll be in touch soon.');
      queryClient.invalidateQueries({ queryKey: ['my-concierge'] });
    },
    onError: () => setError('Failed to submit request.'),
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl text-bask-dark mb-1">Concierge</h1>
          <p className="font-body text-bask-muted">24/7 travel advocacy and lifestyle support</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowForm(true)}>New Request</Button>
      </div>

      {success && <div className="mb-5"><Alert type="success" message={success} onDismiss={() => setSuccess('')} /></div>}
      {error && <div className="mb-5"><Alert type="error" message={error} onDismiss={() => setError('')} /></div>}

      {showForm && (
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-7 mb-7">
          <h2 className="font-display text-xl text-bask-dark mb-5">New Concierge Request</h2>
          <div className="space-y-5">
            <div>
              <label className="label">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="input-field">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Urgency</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {URGENCY_OPTIONS.map(u => (
                  <button key={u.value} type="button" onClick={() => setUrgency(u.value)}
                    className={`p-3 rounded-xl text-left border-2 transition-all ${urgency === u.value ? 'border-bask-terracotta bg-amber-50' : 'border-amber-100 hover:border-amber-200'}`}>
                    <p className="font-body font-medium text-bask-dark text-sm">{u.label}</p>
                    <p className="font-body text-bask-muted text-xs mt-0.5">{u.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Describe your request *</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                className="input-field min-h-[100px] resize-none" placeholder="Tell us what you need help with..." />
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button loading={mutation.isPending} disabled={!description.trim()} onClick={() => mutation.mutate()}>Submit Request</Button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? <PageLoader /> : requests.length === 0 ? (
        <EmptyState icon={<Bell className="w-7 h-7" />} title="No concierge requests"
          description="Need help with travel planning, bookings, or lifestyle support? We're here 24/7."
          action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowForm(true)}>Submit a Request</Button>} />
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div key={req.id} className="bg-white rounded-2xl border border-amber-100 p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-body font-medium text-bask-dark">{req.category}</p>
                  <p className="text-bask-muted text-xs font-body mt-0.5">{new Date(req.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <UrgencyBadge urgency={req.urgency} />
                  <StatusBadge status={req.status} />
                </div>
              </div>
              <p className="font-body text-sm text-bask-dark mb-3">{req.description}</p>
              {req.admin_notes && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-xs font-body text-blue-700"><strong>BASK Response:</strong> {req.admin_notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ================================================================
// PARTNER HOMES PAGE
// ================================================================
interface HomeItem {
  id: number;
  name: string;
  location: string;
  country: string;
  nightlyRate: number;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  vibeTags: string[];
  clothingOptional: boolean;
  isEliteOnly: boolean;
  locked: boolean;
  amenities: string[];
  houseRules: string | null;
  minStayNights: number;
  checkInTime: string;
  checkOutTime: string;
  lgbtqFriendly: boolean;
  description: string;
}

export const PartnerHomesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isElite = user?.membershipTier === 'Elite';
  const { data, isLoading } = useQuery({ queryKey: ['partner-homes'], queryFn: partnerHomesApi.getAll });
  const homes: HomeItem[] = data?.data?.data || [];

  if (isLoading) return <PageLoader />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="font-display text-4xl text-bask-dark mb-2">Partner Homes</h1>
        <p className="font-body text-bask-muted text-lg">Curated vacation rentals in LGBTQ+-affirming destinations</p>
      </div>

      {homes.length === 0 ? (
        <EmptyState icon={<Home className="w-7 h-7" />} title="Partner homes coming soon" description="We're curating exclusive properties for the BASK community." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {homes.map(home => (
            <div key={home.id} className="relative card">
              {home.locked && (
                <div className="absolute inset-0 z-10 bg-white/85 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl p-5 text-center">
                  <Lock className="w-7 h-7 text-bask-terracotta mb-2" />
                  <p className="font-display text-lg text-bask-dark mb-1">Elite Only</p>
                  <p className="text-bask-muted text-xs font-body mb-4">Upgrade to access exclusive properties</p>
                  <Link to="/membership"><Button size="sm" icon={<Crown className="w-4 h-4" />}>Upgrade to Elite</Button></Link>
                </div>
              )}
              <div className="h-44 bg-gradient-to-br from-bask-bronze to-bask-dark flex items-end p-4">
                <div>
                  <p className="text-white/70 text-xs font-body">{home.location}, {home.country}</p>
                  <h3 className="font-display text-xl text-white">{home.name}</h3>
                </div>
              </div>
              <div className="p-5">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {home.vibeTags?.slice(0, 3).map(t => <Badge key={t}>{t}</Badge>)}
                  {home.isEliteOnly && <EliteBadge />}
                  {home.clothingOptional && <Badge color="amber">Clothing Optional</Badge>}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-display text-2xl text-bask-terracotta">${home.nightlyRate}</span>
                    <span className="text-bask-muted text-xs font-body ml-1">/night</span>
                  </div>
                  <span className="text-xs text-bask-muted font-body">{home.bedrooms}BR · {home.maxGuests} guests</span>
                </div>
                <Button variant="secondary" size="sm" className="w-full mt-3" onClick={() => navigate(`/partner-homes/${home.id}`)}>
                  View Property
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ================================================================
// HOME DETAIL PAGE
// ================================================================
export const HomeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['partner-home', id], queryFn: () => partnerHomesApi.getById(Number(id)) });
  const home: HomeItem | undefined = data?.data?.data;

  const mutation = useMutation({
    mutationFn: () => partnerHomesApi.stayRequest(Number(id), { checkInDate: checkIn, checkOutDate: checkOut, guestCount: guests, message }),
    onSuccess: () => {
      setShowForm(false);
      setSuccess('Stay request submitted! We\'ll be in touch soon.');
      queryClient.invalidateQueries({ queryKey: ['my-stay-requests'] });
    },
  });

  if (isLoading) return <PageLoader />;
  if (!home) return <div className="max-w-4xl mx-auto p-8 text-center"><p className="font-body text-bask-muted">Property not found.</p></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-bask-muted hover:text-bask-dark font-body text-sm mb-6">← Back</button>
      {success && <div className="mb-5"><Alert type="success" message={success} onDismiss={() => setSuccess('')} /></div>}

      <div className="h-72 bg-gradient-to-br from-bask-dark to-bask-bronze rounded-2xl flex items-end p-8 mb-8">
        <div>
          <p className="text-white/60 font-body text-sm mb-1">{home.location}, {home.country}</p>
          <h1 className="font-display text-4xl text-white">{home.name}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <p className="font-body text-bask-dark leading-relaxed">{home.description}</p>
          <div className="grid grid-cols-3 gap-3">
            {([['Bedrooms', home.bedrooms], ['Bathrooms', home.bathrooms], ['Max Guests', home.maxGuests]] as [string, number][]).map(([k, v]) => (
              <div key={k} className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-center">
                <p className="font-display text-2xl text-bask-terracotta">{v}</p>
                <p className="text-bask-muted text-xs font-body">{k}</p>
              </div>
            ))}
          </div>
          {home.amenities?.length > 0 && (
            <div>
              <h3 className="font-display text-xl text-bask-dark mb-3">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {home.amenities.map(a => <Badge key={a}>{a}</Badge>)}
              </div>
            </div>
          )}
          {home.houseRules && (
            <div>
              <h3 className="font-display text-xl text-bask-dark mb-2">House Rules</h3>
              <p className="font-body text-bask-muted text-sm whitespace-pre-line">{home.houseRules}</p>
            </div>
          )}
        </div>

        <div>
          <div className="p-6 rounded-2xl border-2 border-amber-200 bg-white sticky top-24">
            <p className="font-display text-4xl text-bask-terracotta">${home.nightlyRate}</p>
            <p className="text-bask-muted text-xs font-body mb-5">per night · min. {home.minStayNights} nights</p>
            {!showForm ? (
              <Button className="w-full" onClick={() => setShowForm(true)}>Request a Stay</Button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="label text-xs">Check-in</label>
                  <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} className="input-field text-sm" />
                </div>
                <div>
                  <label className="label text-xs">Check-out</label>
                  <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} className="input-field text-sm" />
                </div>
                <div>
                  <label className="label text-xs">Guests</label>
                  <select value={guests} onChange={e => setGuests(Number(e.target.value))} className="input-field text-sm">
                    {Array.from({ length: home.maxGuests }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <textarea value={message} onChange={e => setMessage(e.target.value)} className="input-field text-sm resize-none" rows={3} placeholder="Message (optional)" />
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button size="sm" className="flex-1" loading={mutation.isPending} disabled={!checkIn || !checkOut} onClick={() => mutation.mutate()}>Submit</Button>
                </div>
              </div>
            )}
            <div className="mt-4 space-y-1.5 text-xs font-body text-bask-muted">
              <p>Check-in: {home.checkInTime}</p>
              <p>Check-out: {home.checkOutTime}</p>
              {home.clothingOptional && <p className="text-bask-terracotta font-medium">✓ Clothing Optional</p>}
              {home.lgbtqFriendly && <p className="text-bask-terracotta font-medium">✓ LGBTQ+ Welcoming</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ================================================================
// PARTNER PERKS PAGE
// ================================================================
interface PerkItem {
  id: number;
  partner_name: string;
  description: string;
  discount_details: string;
  category: string;
  website_url: string;
}

export const PartnerPerksPage: React.FC = () => {
  const { user } = useAuthStore();
  const isElite = user?.membershipTier === 'Elite';
  const { data, isLoading } = useQuery({ queryKey: ['partner-perks'], queryFn: partnerPerksApi.getAll, enabled: isElite });
  const perks: PerkItem[] = data?.data?.data || [];
  const categories = [...new Set(perks.map(p => p.category))];

  if (!isElite) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
        <Crown className="w-16 h-16 text-bask-terracotta mx-auto mb-5" />
        <h1 className="font-display text-4xl text-bask-dark mb-3">Partner Perks</h1>
        <p className="font-body text-bask-muted text-lg mb-6 max-w-xl mx-auto">Exclusive discounts from wellness, romance, and travel brands — for BASK Elite members only.</p>
        <Link to="/membership"><Button size="lg" icon={<Crown className="w-5 h-5" />}>Upgrade to Elite — $120/yr</Button></Link>
      </div>
    );
  }

  if (isLoading) return <PageLoader />;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="font-display text-4xl text-bask-dark">Partner Perks</h1>
          <EliteBadge />
        </div>
        <p className="font-body text-bask-muted">Exclusive benefits from brands curated for the BASK community</p>
      </div>

      {categories.map(cat => (
        <div key={cat} className="mb-10">
          <h2 className="font-display text-xl text-bask-dark mb-4">{cat}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {perks.filter(p => p.category === cat).map(perk => (
              <div key={perk.id} className="bg-white rounded-2xl border border-amber-100 p-5 flex gap-4 hover:border-amber-200 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Star className="w-5 h-5 text-bask-terracotta" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-body font-semibold text-bask-dark">{perk.partner_name}</h3>
                    <a href={perk.website_url} target="_blank" rel="noopener noreferrer" className="text-bask-terracotta hover:text-bask-bronze flex-shrink-0">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <p className="text-bask-muted text-xs font-body mt-0.5 mb-2">{perk.description}</p>
                  <p className="text-bask-terracotta text-xs font-body font-medium bg-amber-50 rounded-lg px-2.5 py-1.5 inline-block">{perk.discount_details}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ================================================================
// GIFT SHOP PAGE
// ================================================================
interface ProductItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  isEliteOnly: boolean;
  locked: boolean;
}

export const GiftShopPage: React.FC = () => {
  const { user } = useAuthStore();
  const isElite = user?.membershipTier === 'Elite';
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['shop-products'], queryFn: shopApi.getProducts });
  const products: ProductItem[] = data?.data?.data || [];
  const merch = products.filter(p => p.category === 'merchandise');
  const pearls = products.filter(p => p.category === 'pearls');

  const handleBuy = async (productId: number) => {
    try {
      const res = await stripeApi.createShopSession(productId);
      window.location.href = res.data.data.url;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      if (e.response?.data?.error?.includes('Elite')) {
        setError('Elite membership required for this item.');
      } else {
        setError('Failed to start checkout. Please try again.');
      }
    }
  };

  if (isLoading) return <PageLoader />;

  const ProductCard: React.FC<{ p: ProductItem }> = ({ p }) => (
    <div className="relative card p-5">
      {p.locked && (
        <div className="absolute inset-0 z-10 bg-white/85 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-4 text-center">
          <Lock className="w-5 h-5 text-bask-terracotta mb-1.5" />
          <p className="text-sm font-display text-bask-dark mb-1">Elite Only</p>
          <Link to="/membership"><Button size="sm" icon={<Crown className="w-3.5 h-3.5" />}>Upgrade</Button></Link>
        </div>
      )}
      <div className="w-full h-32 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl mb-4 flex items-center justify-center">
        <ShoppingBag className="w-10 h-10 text-bask-terracotta/40" />
      </div>
      <div className="flex items-center gap-1.5 mb-1">
        <h3 className="font-body font-medium text-bask-dark text-sm">{p.name}</h3>
        {p.isEliteOnly && <EliteBadge />}
      </div>
      <p className="text-bask-muted text-xs font-body mb-3 line-clamp-2">{p.description}</p>
      <div className="flex items-center justify-between">
        <span className="font-display text-xl text-bask-terracotta">${p.price}</span>
        <Button size="sm" onClick={() => handleBuy(p.id)}>Buy Now</Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="font-display text-4xl text-bask-dark mb-2">Gift Shop</h1>
        <p className="font-body text-bask-muted">BASK merchandise and curated freshwater pearls</p>
      </div>

      {error && <div className="mb-5"><Alert type="error" message={error} onDismiss={() => setError('')} /></div>}

      <div className="mb-12">
        <h2 className="font-display text-2xl text-bask-dark mb-5">BASK Merchandise</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {merch.map(p => <ProductCard key={p.id} p={p} />)}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-5">
          <h2 className="font-display text-2xl text-bask-dark">Freshwater Pearls</h2>
          <EliteBadge />
        </div>
        {!isElite && (
          <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3">
            <Crown className="w-5 h-5 text-bask-terracotta flex-shrink-0" />
            <p className="text-sm font-body text-bask-dark">Pearl collections are exclusively available to BASK Elite members. <Link to="/membership" className="text-bask-terracotta font-medium hover:underline">Upgrade to Elite →</Link></p>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {pearls.map(p => <ProductCard key={p.id} p={p} />)}
        </div>
      </div>
    </div>
  );
};

// Suppress unused import warning
void Modal;
void MapPin;
