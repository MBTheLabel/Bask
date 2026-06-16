import { useState, useEffect } from 'react';
import { Trash2, Plus } from 'lucide-react';

interface Event { id: number; title: string; date: string; time: string; location: string; description: string; capacity: number; price: number; tier: string; }

export default function AdminEventsTab({ token }: { token: string }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', date: '', time: '', location: '', description: '', capacity: '50', price: '0', tier: 'standard' });
  const [saving, setSaving] = useState(false);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const load = () => {
    fetch('/api/admin/events', { headers }).then(r => r.json()).then(d => { setEvents(d.data || []); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/admin/events', { method: 'POST', headers, body: JSON.stringify({ ...form, capacity: Number(form.capacity), price: Number(form.price) }) });
    setForm({ title: '', date: '', time: '', location: '', description: '', capacity: '50', price: '0', tier: 'standard' });
    setSaving(false);
    load();
  };

  const del = async (id: number) => {
    if (!confirm('Delete this event?')) return;
    await fetch(`/api/admin/events/${id}`, { method: 'DELETE', headers });
    load();
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl border border-amber-100 p-6">
        <h2 className="font-display text-xl text-bask-dark mb-4">Create Event</h2>
        <form onSubmit={submit} className="grid grid-cols-2 gap-4">
          <input required placeholder="Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="input-field col-span-2" />
          <input required placeholder="Date (e.g. July 12, 2026)" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="input-field" />
          <input required placeholder="Time (e.g. 7:00 PM - 10:00 PM)" value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="input-field" />
          <input required placeholder="Location" value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="input-field col-span-2" />
          <textarea required placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input-field col-span-2" rows={3} />
          <input type="number" placeholder="Capacity" value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} className="input-field" />
          <input type="number" placeholder="Price (0 = Free)" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="input-field" />
          <select value={form.tier} onChange={e => setForm({...form, tier: e.target.value})} className="input-field">
            <option value="standard">Standard</option>
            <option value="elite">Elite Only</option>
          </select>
          <button type="submit" disabled={saving} className="bg-bask-terracotta text-white px-6 py-2.5 rounded-xl font-body font-medium flex items-center gap-2">
            <Plus size={16} />{saving ? 'Saving...' : 'Add Event'}
          </button>
        </form>
      </div>

      <div className="space-y-3">
        <h2 className="font-display text-xl text-bask-dark">All Events ({events.length})</h2>
        {loading ? <p className="text-bask-muted font-body">Loading...</p> : events.map(e => (
          <div key={e.id} className="bg-white rounded-xl border border-amber-100 p-4 flex items-start justify-between gap-4">
            <div>
              <p className="font-body font-medium text-bask-dark">{e.title}</p>
              <p className="text-bask-muted text-sm font-body">{e.date} · {e.time} · {e.location}</p>
              <p className="text-bask-muted text-xs font-body mt-1">{e.tier === 'elite' ? '👑 Elite' : 'Standard'} · {e.capacity} spots · {e.price === 0 ? 'Free' : `$${e.price}`}</p>
            </div>
            <button onClick={() => del(e.id)} className="text-red-400 hover:text-red-600 transition-colors shrink-0">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
