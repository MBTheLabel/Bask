import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MapPin, Calendar, Clock, Trash2 } from 'lucide-react';
import { tripRequestsApi } from '../lib/api';
import { Button, StatusBadge, PageLoader, EmptyState, Modal, Alert } from '../components/ui';

const MyTripsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [success, setSuccess] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['my-trip-requests'],
    queryFn: tripRequestsApi.mine,
  });

  const requests = data?.data?.data || [];

  const cancelMutation = useMutation({
    mutationFn: (id: number) => tripRequestsApi.update(id, { status: 'cancelled' }),
    onSuccess: () => {
      setCancelId(null);
      setSuccess('Trip request cancelled.');
      queryClient.invalidateQueries({ queryKey: ['my-trip-requests'] });
    },
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl text-bask-dark mb-1">My Trips</h1>
          <p className="font-body text-bask-muted">Track and manage your travel requests</p>
        </div>
        <Link to="/new-trip">
          <Button icon={<Plus className="w-4 h-4" />}>Plan a Trip</Button>
        </Link>
      </div>

      {success && <div className="mb-5"><Alert type="success" message={success} onDismiss={() => setSuccess('')} /></div>}

      {requests.length === 0 ? (
        <EmptyState
          icon={<MapPin className="w-7 h-7" />}
          title="No trip requests yet"
          description="Tell us where you want to go and our team will design the perfect itinerary."
          action={<Link to="/new-trip"><Button icon={<Plus className="w-4 h-4" />}>Plan Your First Trip</Button></Link>}
        />
      ) : (
        <div className="space-y-4">
          {requests.map((req: {
            id: number; destination: string; status: string; budget_range: string;
            group_type: string; occasion: string; travel_style: string;
            departure_date_preferred: string | null; created_at: string; admin_notes: string | null;
          }) => (
            <div key={req.id} className="bg-white rounded-2xl border border-amber-100 p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-display text-xl text-bask-dark">{req.destination}</h3>
                    <StatusBadge status={req.status} />
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm font-body text-bask-muted mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {req.departure_date_preferred
                        ? new Date(req.departure_date_preferred).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                        : 'Dates flexible'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Submitted {new Date(req.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[req.budget_range, req.group_type, req.travel_style].map(tag => (
                      <span key={tag} className="px-2.5 py-0.5 rounded-full bg-amber-50 text-bask-terracotta text-xs font-body">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {req.admin_notes && (
                    <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                      <p className="text-xs text-blue-700 font-body"><strong>BASK Team:</strong> {req.admin_notes}</p>
                    </div>
                  )}
                </div>

                {(req.status === 'pending' || req.status === 'reviewing') && (
                  <button
                    onClick={() => setCancelId(req.id)}
                    className="flex-shrink-0 p-2 rounded-lg text-bask-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Cancel request"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancel confirm modal */}
      <Modal open={cancelId !== null} onClose={() => setCancelId(null)} title="Cancel Trip Request">
        <p className="font-body text-bask-muted mb-5">
          Are you sure you want to cancel this trip request? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setCancelId(null)}>Keep It</Button>
          <Button
            variant="danger"
            className="flex-1"
            loading={cancelMutation.isPending}
            onClick={() => cancelId && cancelMutation.mutate(cancelId)}
          >
            Yes, Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default MyTripsPage;
