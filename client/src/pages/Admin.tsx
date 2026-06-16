import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Compass, Bell, Home, DollarSign, TrendingUp, Download, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { adminApi } from '../lib/api';
import { Button, StatusBadge, UrgencyBadge, PageLoader, Alert } from '../components/ui';

type AdminTab = 'overview' | 'customers' | 'trip-requests' | 'concierge' | 'bookings' | 'stay-requests' | 'purchases' | 'trips';

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; sub?: string }> = ({ label, value, icon, sub }) => (
  <div className="bg-white rounded-2xl border border-amber-100 p-5">
    <div className="flex items-start justify-between mb-3">
      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-bask-terracotta">{icon}</div>
    </div>
    <p className="font-display text-3xl text-bask-dark">{typeof value === 'number' && label.includes('Revenue') ? `$${value.toLocaleString()}` : value}</p>
    <p className="font-body text-bask-muted text-sm mt-1">{label}</p>
    {sub && <p className="font-body text-bask-terracotta text-xs mt-0.5">{sub}</p>}
  </div>
);

const AdminPage: React.FC = () => {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [success, setSuccess] = useState('');
  const queryClient = useQueryClient();

  const { data: statsData } = useQuery({ queryKey: ['admin-stats'], queryFn: adminApi.stats });
  const stats = statsData?.data?.data;

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', search], queryFn: () => adminApi.users(search || undefined), enabled: tab === 'customers',
  });

  const { data: tripReqData, isLoading: tripReqLoading } = useQuery({
    queryKey: ['admin-trip-requests'], queryFn: adminApi.tripRequests, enabled: tab === 'trip-requests',
  });

  const { data: conciergeData, isLoading: conciergeLoading } = useQuery({
    queryKey: ['admin-concierge'], queryFn: adminApi.conciergeRequests, enabled: tab === 'concierge',
  });

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['admin-bookings'], queryFn: adminApi.bookings, enabled: tab === 'bookings',
  });

  const { data: stayData, isLoading: stayLoading } = useQuery({
    queryKey: ['admin-stays'], queryFn: adminApi.stayRequests, enabled: tab === 'stay-requests',
  });

  const { data: purchasesData, isLoading: purchasesLoading } = useQuery({
    queryKey: ['admin-purchases'], queryFn: adminApi.purchases, enabled: tab === 'purchases',
  });

  const updateTripReq = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => adminApi.updateTripRequest(id, data),
    onSuccess: () => { setEditId(null); setSuccess('Updated.'); queryClient.invalidateQueries({ queryKey: ['admin-trip-requests'] }); },
  });

  const updateConcierge = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => adminApi.updateConcierge(id, data),
    onSuccess: () => { setEditId(null); setSuccess('Updated.'); queryClient.invalidateQueries({ queryKey: ['admin-concierge'] }); },
  });

  const updateBooking = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => adminApi.updateBooking(id, data),
    onSuccess: () => { setEditId(null); setSuccess('Updated.'); queryClient.invalidateQueries({ queryKey: ['admin-bookings'] }); },
  });

  const updateStay = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => adminApi.updateStayRequest(id, data),
    onSuccess: () => { setEditId(null); setSuccess('Updated.'); queryClient.invalidateQueries({ queryKey: ['admin-stays'] }); },
  });

  const handleExportPdf = async () => {
    try {
      const res = await adminApi.exportPdf();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'BASK-Data-Export.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setSuccess('PDF export failed.');
    }
  };

  const TABS: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'customers', label: 'Customers', icon: <Users className="w-4 h-4" /> },
    { id: 'trip-requests', label: 'Trip Requests', icon: <Compass className="w-4 h-4" /> },
    { id: 'concierge', label: 'Concierge', icon: <Bell className="w-4 h-4" /> },
    { id: 'bookings', label: 'Bookings', icon: <Compass className="w-4 h-4" /> },
    { id: 'stay-requests', label: 'Stay Requests', icon: <Home className="w-4 h-4" /> },
    { id: 'purchases', label: 'Purchases', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'events', label: 'Events', icon: <Calendar className="w-4 h-4" /> },
  ];

  const EditRow: React.FC<{ id: number; currentStatus: string; statusOptions: string[]; onSave: (status: string, notes: string) => void; loading: boolean }> = ({ id, currentStatus, statusOptions, onSave, loading }) => {
    if (editId !== id) return null;
    return (
      <div className="mt-3 p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
        <div>
          <label className="label text-xs">Status</label>
          <select value={editStatus || currentStatus} onChange={e => setEditStatus(e.target.value)} className="input-field text-sm">
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label text-xs">Admin Notes</label>
          <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} className="input-field text-sm resize-none" rows={2} placeholder="Internal notes..." />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setEditId(null)}>Cancel</Button>
          <Button size="sm" loading={loading} onClick={() => onSave(editStatus || currentStatus, editNotes)}>Save</Button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl text-bask-dark mb-1">Admin Dashboard</h1>
          <p className="font-body text-bask-muted">Manage the full BASK operation</p>
        </div>
        {tab === 'overview' && (
          <Button onClick={handleExportPdf} variant="secondary" icon={<Download className="w-4 h-4" />}>Export PDF</Button>
        )}
      </div>

      {success && <div className="mb-5"><Alert type="success" message={success} onDismiss={() => setSuccess('')} /></div>}

      {/* Tabs */}
      <div className="flex gap-1 mb-8 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-body font-medium whitespace-nowrap transition-colors ${tab === t.id ? 'bg-bask-terracotta text-white' : 'bg-white text-bask-muted border border-amber-100 hover:text-bask-dark'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard label="Total Members" value={stats?.totalUsers || 0} icon={<Users className="w-5 h-5" />} />
          <StatCard label="Elite Members" value={stats?.eliteMembers || 0} icon={<TrendingUp className="w-5 h-5" />} />
          <StatCard label="Pending Trips" value={stats?.pendingTripRequests || 0} icon={<Compass className="w-5 h-5" />} />
          <StatCard label="Pending Concierge" value={stats?.pendingConciergeRequests || 0} icon={<Bell className="w-5 h-5" />} />
          <StatCard label="Pending Stays" value={stats?.pendingStayRequests || 0} icon={<Home className="w-5 h-5" />} />
          <StatCard label="Total Revenue" value={stats?.totalRevenue || 0} icon={<DollarSign className="w-5 h-5" />} />
          <StatCard label="Monthly Revenue" value={stats?.monthlyRevenue || 0} icon={<TrendingUp className="w-5 h-5" />} sub="This month" />
        </div>
      )}

      {/* CUSTOMERS */}
      {tab === 'customers' && (
        <div>
          <div className="relative mb-5 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bask-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9" placeholder="Search by name or email..." />
          </div>
          {usersLoading ? <PageLoader /> : (
            <div className="space-y-3">
              {(usersData?.data?.data || []).map((u: { id: number; first_name: string; last_name: string; email: string; membership_tier: string; is_admin: boolean; created_at: string }) => (
                <div key={u.id} className="bg-white rounded-xl border border-amber-100 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-body font-medium text-bask-dark">{u.first_name} {u.last_name}</p>
                      <p className="text-bask-muted text-xs font-body">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {u.is_admin && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-body">Admin</span>}
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-body font-medium ${u.membership_tier === 'Elite' ? 'bg-bask-terracotta text-white' : 'bg-amber-100 text-bask-terracotta'}`}>{u.membership_tier}</span>
                      <p className="text-bask-muted text-xs font-body hidden sm:block">{new Date(u.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TRIP REQUESTS */}
      {tab === 'trip-requests' && (
        tripReqLoading ? <PageLoader /> : (
          <div className="space-y-3">
            {(tripReqData?.data?.data || []).map((r: { id: number; destination: string; first_name: string; last_name: string; email: string; status: string; budget_range: string; group_type: string; created_at: string; admin_notes: string | null }) => (
              <div key={r.id} className="bg-white rounded-xl border border-amber-100 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-body font-medium text-bask-dark">{r.destination}</p>
                    <p className="text-bask-muted text-xs font-body">{r.first_name} {r.last_name} · {r.email}</p>
                    <p className="text-bask-muted text-xs font-body mt-1">{r.budget_range} · {r.group_type} · {new Date(r.created_at).toLocaleDateString()}</p>
                    {r.admin_notes && <p className="text-blue-600 text-xs font-body mt-1">Note: {r.admin_notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={r.status} />
                    <button onClick={() => { setEditId(editId === r.id ? null : r.id); setEditNotes(r.admin_notes || ''); setEditStatus(r.status); }}
                      className="p-1.5 rounded-lg hover:bg-amber-50 text-bask-muted">
                      {editId === r.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <EditRow id={r.id} currentStatus={r.status}
                  statusOptions={['pending', 'reviewing', 'booked', 'cancelled']}
                  onSave={(status, notes) => updateTripReq.mutate({ id: r.id, data: { status, adminNotes: notes } })}
                  loading={updateTripReq.isPending} />
              </div>
            ))}
          </div>
        )
      )}

      {/* CONCIERGE */}
      {tab === 'concierge' && (
        conciergeLoading ? <PageLoader /> : (
          <div className="space-y-3">
            {(conciergeData?.data?.data || []).map((r: { id: number; category: string; urgency: string; description: string; first_name: string; last_name: string; status: string; created_at: string; admin_notes: string | null }) => (
              <div key={r.id} className="bg-white rounded-xl border border-amber-100 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-body font-medium text-bask-dark">{r.category}</p>
                      <UrgencyBadge urgency={r.urgency} />
                    </div>
                    <p className="text-bask-muted text-xs font-body mb-2">{r.first_name} {r.last_name} · {new Date(r.created_at).toLocaleDateString()}</p>
                    <p className="text-bask-dark text-sm font-body">{r.description}</p>
                    {r.admin_notes && <p className="text-blue-600 text-xs font-body mt-2">Response: {r.admin_notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={r.status} />
                    <button onClick={() => { setEditId(editId === r.id ? null : r.id); setEditNotes(r.admin_notes || ''); setEditStatus(r.status); }}
                      className="p-1.5 rounded-lg hover:bg-amber-50 text-bask-muted">
                      {editId === r.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <EditRow id={r.id} currentStatus={r.status}
                  statusOptions={['open', 'in_progress', 'resolved']}
                  onSave={(status, notes) => updateConcierge.mutate({ id: r.id, data: { status, adminNotes: notes } })}
                  loading={updateConcierge.isPending} />
              </div>
            ))}
          </div>
        )
      )}

      {/* BOOKINGS */}
      {tab === 'bookings' && (
        bookingsLoading ? <PageLoader /> : (
          <div className="space-y-3">
            {(bookingsData?.data?.data || []).map((b: { id: number; trip_title: string; destination: string; first_name: string; last_name: string; guest_count: number; status: string; created_at: string; admin_notes: string | null }) => (
              <div key={b.id} className="bg-white rounded-xl border border-amber-100 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-body font-medium text-bask-dark">{b.trip_title}</p>
                    <p className="text-bask-muted text-xs font-body">{b.first_name} {b.last_name} · {b.guest_count} guest(s) · {new Date(b.created_at).toLocaleDateString()}</p>
                    {b.admin_notes && <p className="text-blue-600 text-xs font-body mt-1">Note: {b.admin_notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={b.status} />
                    <button onClick={() => { setEditId(editId === b.id ? null : b.id); setEditNotes(b.admin_notes || ''); setEditStatus(b.status); }}
                      className="p-1.5 rounded-lg hover:bg-amber-50 text-bask-muted">
                      {editId === b.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <EditRow id={b.id} currentStatus={b.status}
                  statusOptions={['pending', 'confirmed', 'declined', 'cancelled']}
                  onSave={(status, notes) => updateBooking.mutate({ id: b.id, data: { status, adminNotes: notes } })}
                  loading={updateBooking.isPending} />
              </div>
            ))}
          </div>
        )
      )}

      {/* STAY REQUESTS */}
      {tab === 'stay-requests' && (
        stayLoading ? <PageLoader /> : (
          <div className="space-y-3">
            {(stayData?.data?.data || []).map((s: { id: number; home_name: string; location: string; first_name: string; last_name: string; check_in_date: string; check_out_date: string; guest_count: number; status: string; created_at: string; admin_notes: string | null }) => (
              <div key={s.id} className="bg-white rounded-xl border border-amber-100 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-body font-medium text-bask-dark">{s.home_name}</p>
                    <p className="text-bask-muted text-xs font-body">{s.first_name} {s.last_name} · {s.guest_count} guest(s)</p>
                    <p className="text-bask-muted text-xs font-body">{s.check_in_date} → {s.check_out_date}</p>
                    {s.admin_notes && <p className="text-blue-600 text-xs font-body mt-1">Note: {s.admin_notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={s.status} />
                    <button onClick={() => { setEditId(editId === s.id ? null : s.id); setEditNotes(s.admin_notes || ''); setEditStatus(s.status); }}
                      className="p-1.5 rounded-lg hover:bg-amber-50 text-bask-muted">
                      {editId === s.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <EditRow id={s.id} currentStatus={s.status}
                  statusOptions={['pending', 'approved', 'declined', 'cancelled']}
                  onSave={(status, notes) => updateStay.mutate({ id: s.id, data: { status, adminNotes: notes } })}
                  loading={updateStay.isPending} />
              </div>
            ))}
          </div>
        )
      )}

      {/* PURCHASES */}
            {tab === 'trips' && (
        <div className="space-y-6">
          <h2 className="font-display text-xl text-bask-dark">Add New Trip</h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const f = e.target as any;
            const body = { title: f.trip_title.value, destination: f.destination.value, country: f.country.value, description: f.description.value, start_date: f.start_date.value, end_date: f.end_date.value, price_per_person: parseFloat(f.price_per_person.value), max_guests: parseInt(f.max_guests.value), image_url: f.image_url.value, tags: JSON.stringify(f.tags.value.split(',').map((t: string) => t.trim())), full_itinerary: f.full_itinerary.value, is_active: 1, is_past: 0 };
            const res = await fetch('/api/admin/trips', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('bask_token') }, body: JSON.stringify(body) });
            if (res.ok) { alert('Trip added!'); (e.target as HTMLFormElement).reset(); } else { alert('Failed'); }
          }} className="bg-white rounded-2xl p-6 border border-amber-100 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="font-body text-sm text-bask-muted">Title</label><input name="trip_title" required className="w-full mt-1 px-3 py-2 border border-amber-100 rounded-lg font-body text-sm" /></div>
              <div><label className="font-body text-sm text-bask-muted">Destination</label><input name="destination" required className="w-full mt-1 px-3 py-2 border border-amber-100 rounded-lg font-body text-sm" /></div>
              <div><label className="font-body text-sm text-bask-muted">Country</label><input name="country" required className="w-full mt-1 px-3 py-2 border border-amber-100 rounded-lg font-body text-sm" /></div>
              <div><label className="font-body text-sm text-bask-muted">Price Per Person</label><input name="price_per_person" type="number" required className="w-full mt-1 px-3 py-2 border border-amber-100 rounded-lg font-body text-sm" /></div>
              <div><label className="font-body text-sm text-bask-muted">Start Date</label><input name="start_date" type="date" required className="w-full mt-1 px-3 py-2 border border-amber-100 rounded-lg font-body text-sm" /></div>
              <div><label className="font-body text-sm text-bask-muted">End Date</label><input name="end_date" type="date" required className="w-full mt-1 px-3 py-2 border border-amber-100 rounded-lg font-body text-sm" /></div>
              <div><label className="font-body text-sm text-bask-muted">Max Guests</label><input name="max_guests" type="number" required className="w-full mt-1 px-3 py-2 border border-amber-100 rounded-lg font-body text-sm" /></div>
              <div><label className="font-body text-sm text-bask-muted">Image URL</label><input name="image_url" className="w-full mt-1 px-3 py-2 border border-amber-100 rounded-lg font-body text-sm" /></div>
            </div>
            <div><label className="font-body text-sm text-bask-muted">Description</label><textarea name="description" required rows={3} className="w-full mt-1 px-3 py-2 border border-amber-100 rounded-lg font-body text-sm" /></div>
            <div><label className="font-body text-sm text-bask-muted">Tags (comma separated)</label><input name="tags" placeholder="Beach, LGBTQ+, Luxury" className="w-full mt-1 px-3 py-2 border border-amber-100 rounded-lg font-body text-sm" /></div>
            <div><label className="font-body text-sm text-bask-muted">Full Itinerary</label><textarea name="full_itinerary" rows={5} className="w-full mt-1 px-3 py-2 border border-amber-100 rounded-lg font-body text-sm" /></div>
            <button type="submit" className="bg-bask-terracotta text-white px-6 py-2.5 rounded-xl font-body font-medium">Add Trip</button>
          </form>
        </div>
      )}
{tab === 'purchases' && (
        purchasesLoading ? <PageLoader /> : (
          <div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {['itinerary', 'subscription', 'shop'].map(type => {
                const items = (purchasesData?.data?.data || []).filter((p: { type: string }) => p.type === type);
                const total = items.reduce((s: number, p: { amount: number }) => s + parseFloat(String(p.amount)), 0);
                return (
                  <div key={type} className="bg-white rounded-xl border border-amber-100 p-4 text-center">
                    <p className="font-display text-2xl text-bask-terracotta">${total.toFixed(0)}</p>
                    <p className="text-bask-muted text-xs font-body capitalize">{type} Revenue</p>
                    <p className="text-bask-muted text-xs font-body">{items.length} transactions</p>
                  </div>
                );
              })}
            </div>
            <div className="space-y-2">
              {(purchasesData?.data?.data || []).map((p: { id: number; item_name: string; type: string; amount: number; first_name: string; last_name: string; status: string; created_at: string }) => (
                <div key={p.id} className="flex items-center justify-between bg-white rounded-xl border border-amber-100 p-4">
                  <div>
                    <p className="font-body font-medium text-bask-dark text-sm">{p.item_name}</p>
                    <p className="text-bask-muted text-xs font-body">{p.first_name} {p.last_name} · {p.type} · {new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-xl text-bask-terracotta">${parseFloat(String(p.amount)).toFixed(2)}</span>
                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-body">{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
};


