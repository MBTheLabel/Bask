import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, MapPin } from 'lucide-react';
import { tripRequestsApi } from '../lib/api';
import { Button, Alert } from '../components/ui';

const STEPS = ['Destination', 'Dates & Budget', 'Group Details', 'Interests', 'Review'];

const BUDGET_OPTIONS = ['Under $2k', '$2k–$5k', '$5k–$10k', '$10k+'];
const GROUP_TYPES = ['Solo', 'Couple', 'Small Group (3–8)', 'Large Group (9+)'];
const OCCASIONS = ['Vacation', 'Birthday', 'Anniversary', 'Honeymoon', 'Work Retreat', 'Other'];
const TRAVEL_STYLES = ['Adventure', 'Relaxation', 'Cultural', 'Luxury', 'Mixed'];
const INTERESTS = ['Beach', 'Nightlife', 'Wellness', 'Food & Dining', 'History', 'Nature', 'Arts & Culture', 'Hiking', 'Water Sports', 'Shopping', 'LGBTQ+ Events', 'Nude-Friendly'];

const Chip: React.FC<{ label: string; selected: boolean; onClick: () => void }> = ({ label, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-4 py-2 rounded-xl text-sm font-body font-medium transition-all duration-150 border-2 ${
      selected
        ? 'bg-bask-terracotta text-white border-bask-terracotta'
        : 'bg-white text-bask-dark border-amber-200 hover:border-bask-terracotta hover:text-bask-terracotta'
    }`}
  >
    {selected && <Check className="w-3.5 h-3.5 inline mr-1.5" />}
    {label}
  </button>
);

interface FormData {
  destination: string;
  departureDatePreferred: string;
  returnDatePreferred: string;
  budgetRange: string;
  groupType: string;
  occasion: string;
  travelStyle: string;
  interests: string[];
  additionalNotes: string;
}

const NewTripRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormData>({
    destination: '', departureDatePreferred: '', returnDatePreferred: '',
    budgetRange: '', groupType: '', occasion: '', travelStyle: '', interests: [], additionalNotes: '',
  });

  const mutation = useMutation({
    mutationFn: () => tripRequestsApi.create({
      destination: form.destination,
      departureDatePreferred: form.departureDatePreferred || undefined,
      returnDatePreferred: form.returnDatePreferred || undefined,
      budgetRange: form.budgetRange,
      groupType: form.groupType,
      occasion: form.occasion,
      travelStyle: form.travelStyle,
      interests: form.interests,
      additionalNotes: form.additionalNotes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-trip-requests'] });
      navigate('/my-trips');
    },
    onError: () => setError('Failed to submit trip request. Please try again.'),
  });

  const set = (key: keyof FormData) => (val: string) => setForm(f => ({ ...f, [key]: val }));
  const toggleInterest = (i: string) => setForm(f => ({
    ...f,
    interests: f.interests.includes(i) ? f.interests.filter(x => x !== i) : [...f.interests, i],
  }));

  const canNext = () => {
    if (step === 0) return form.destination.trim().length > 0;
    if (step === 1) return !!form.budgetRange;
    if (step === 2) return !!form.groupType && !!form.occasion && !!form.travelStyle;
    if (step === 3) return form.interests.length > 0;
    return true;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-bask-muted hover:text-bask-dark font-body text-sm mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h1 className="font-display text-4xl text-bask-dark mb-2">Plan Your Trip</h1>
      <p className="font-body text-bask-muted mb-8">Tell us about your dream trip and we'll design it for you</p>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-10">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium font-body transition-all ${
                i < step ? 'bg-bask-terracotta text-white' :
                i === step ? 'bg-bask-terracotta text-white ring-4 ring-bask-terracotta/20' :
                'bg-amber-100 text-bask-muted'
              }`}>
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-xs font-body hidden sm:block ${i === step ? 'text-bask-dark font-medium' : 'text-bask-muted'}`}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? 'bg-bask-terracotta' : 'bg-amber-100'}`} />}
          </React.Fragment>
        ))}
      </div>

      {error && <div className="mb-5"><Alert type="error" message={error} onDismiss={() => setError('')} /></div>}

      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-8">
        {/* Step 0: Destination */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-2xl text-bask-dark mb-1">Where do you want to go?</h2>
              <p className="text-bask-muted text-sm font-body">Country, city, or region — be as specific or broad as you like</p>
            </div>
            <div>
              <label className="label">Destination</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bask-muted" />
                <input
                  value={form.destination}
                  onChange={e => set('destination')(e.target.value)}
                  className="input-field pl-10"
                  placeholder="e.g. Greece, Tokyo, Mykonos, South Africa..."
                  autoFocus
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Dates & Budget */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-2xl text-bask-dark mb-1">Dates & Budget</h2>
              <p className="text-bask-muted text-sm font-body">Approximate dates are fine — we'll confirm the best options</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Preferred Departure</label>
                <input type="date" value={form.departureDatePreferred} onChange={e => set('departureDatePreferred')(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="label">Preferred Return</label>
                <input type="date" value={form.returnDatePreferred} onChange={e => set('returnDatePreferred')(e.target.value)} className="input-field" />
              </div>
            </div>
            <div>
              <label className="label">Budget per person *</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {BUDGET_OPTIONS.map(b => <Chip key={b} label={b} selected={form.budgetRange === b} onClick={() => set('budgetRange')(b)} />)}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Group details */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl text-bask-dark mb-1">About your group</h2>
              <p className="text-bask-muted text-sm font-body">Help us tailor the right experience</p>
            </div>
            <div>
              <label className="label">Group type *</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {GROUP_TYPES.map(g => <Chip key={g} label={g} selected={form.groupType === g} onClick={() => set('groupType')(g)} />)}
              </div>
            </div>
            <div>
              <label className="label">Occasion *</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {OCCASIONS.map(o => <Chip key={o} label={o} selected={form.occasion === o} onClick={() => set('occasion')(o)} />)}
              </div>
            </div>
            <div>
              <label className="label">Travel style *</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {TRAVEL_STYLES.map(s => <Chip key={s} label={s} selected={form.travelStyle === s} onClick={() => set('travelStyle')(s)} />)}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Interests */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-2xl text-bask-dark mb-1">What excites you?</h2>
              <p className="text-bask-muted text-sm font-body">Select all that apply</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map(i => <Chip key={i} label={i} selected={form.interests.includes(i)} onClick={() => toggleInterest(i)} />)}
            </div>
            <div>
              <label className="label">Additional notes (optional)</label>
              <textarea
                value={form.additionalNotes}
                onChange={e => set('additionalNotes')(e.target.value)}
                className="input-field min-h-[80px] resize-none"
                placeholder="Anything else we should know? Special occasions, accessibility needs, must-haves..."
              />
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-2xl text-bask-dark mb-1">Review Your Request</h2>
              <p className="text-bask-muted text-sm font-body">Everything look right?</p>
            </div>
            <div className="space-y-3 bg-amber-50 rounded-xl p-5 border border-amber-100">
              {[
                { label: 'Destination', value: form.destination },
                { label: 'Dates', value: form.departureDatePreferred ? `${form.departureDatePreferred} → ${form.returnDatePreferred || 'Open return'}` : 'Flexible' },
                { label: 'Budget', value: form.budgetRange },
                { label: 'Group', value: form.groupType },
                { label: 'Occasion', value: form.occasion },
                { label: 'Style', value: form.travelStyle },
                { label: 'Interests', value: form.interests.join(', ') },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-3 text-sm font-body">
                  <span className="text-bask-muted w-24 flex-shrink-0">{label}</span>
                  <span className="text-bask-dark font-medium">{value}</span>
                </div>
              ))}
              {form.additionalNotes && (
                <div className="flex gap-3 text-sm font-body">
                  <span className="text-bask-muted w-24 flex-shrink-0">Notes</span>
                  <span className="text-bask-dark">{form.additionalNotes}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <Button variant="secondary" onClick={() => setStep(s => s - 1)} icon={<ArrowLeft className="w-4 h-4" />}>
              Back
            </Button>
          )}
          <div className="flex-1" />
          {step < STEPS.length - 1 ? (
            <Button disabled={!canNext()} onClick={() => setStep(s => s + 1)} icon={<ArrowRight className="w-4 h-4" />}>
              Continue
            </Button>
          ) : (
            <Button loading={mutation.isPending} onClick={() => mutation.mutate()} icon={<Check className="w-4 h-4" />}>
              Submit Request
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewTripRequestPage;
