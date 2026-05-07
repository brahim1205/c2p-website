import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { backendClient } from '@/lib/backendClient';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { SkeletonList } from '@/components/base/Skeleton';


interface Booking {
  id: number;
  client_id: string;
  client_name: string;
  provider_id: number;
  service: string;
  description: string;
  booking_date: string;
  booking_time: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  price: number;
  address: string;
  created_at: string;
}

interface Provider {
  id: number;
  name: string;
  image: string | null;
}

const statusConfig = {
  confirmed: { label: 'Confirmée', color: 'bg-green-100 text-green-700', icon: 'ri-checkbox-circle-line' },
  pending: { label: 'En attente', color: 'bg-orange-100 text-orange-700', icon: 'ri-time-line' },
  completed: { label: 'Terminée', color: 'bg-teal-100 text-teal-700', icon: 'ri-check-double-line' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700', icon: 'ri-close-circle-line' },
  in_progress: { label: 'En cours', color: 'bg-blue-100 text-blue-700', icon: 'ri-loader-4-line' }
};

export default function ClientReservationsPage() {
  const { user } = useAuth();
  const { success } = useToast();
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | Booking['status']>('all');
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [providers, setProviders] = useState<Record<number, Provider>>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setBookings([]);
        setProviders({});
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data: bData, error: bErr } = await backendClient
          .from('bookings')
          .select('*')
          .eq('client_id', user.id)
          .order('booking_date', { ascending: false });
        if (bErr) throw bErr;
        setBookings((bData || []) as Booking[]);

        const providerIds = [...new Set((bData || []).map((b: Booking) => b.provider_id))];
        if (providerIds.length > 0) {
          const { data: pData } = await backendClient
            .from('providers')
            .select('id,name,image')
            .in('id', providerIds);
          const pMap: Record<number, Provider> = {};
          (pData || []).forEach((p: Provider) => { pMap[p.id] = p; });
          setProviders(pMap);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [user?.id]);

  const filtered = statusFilter === 'all'
    ? bookings
    : bookings.filter(r => r.status === statusFilter);

  const handleCancel = async (id: number) => {
    try {
      const { error } = await backendClient.from('bookings').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' as const } : b));
      success('Réservation annulée', 'Votre réservation a été annulée. Le prestataire en a été informé.');
    } catch (err) { console.error(err); }
  };

  const handleReview = async () => {
    if (reviewRating === 0 || !reviewComment.trim() || !reviewingId) return;
    const booking = bookings.find(b => b.id === reviewingId);
    if (!booking || !user) return;
    try {
      const { error } = await backendClient.from('provider_reviews').insert({
        provider_id: booking.provider_id,
        client_id: user.id,
        client_name: `${user.firstName} ${user.lastName}`,
        rating: reviewRating,
        comment: reviewComment,
        service: booking.service,
        helpful: 0
      });
      if (error) throw error;
      success('Avis publié', 'Merci pour votre avis ! Il sera visible sur le profil du prestataire.');
      setReviewingId(null);
      setReviewRating(0);
      setReviewComment('');
    } catch (err) { console.error(err); }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Client', path: '/dashboard' }, { label: 'Mes réservations' }]} />

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Mes réservations</h1>
          <p className="text-gray-600 text-sm md:text-base">Gérez vos réservations de services et donnez votre avis</p>
        </div>

        {/* Status filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['all', 'confirmed', 'pending', 'completed', 'cancelled', 'in_progress'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                statusFilter === s ? 'bg-teal-600 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {s === 'all' ? 'Toutes' : statusConfig[s].label}
            </button>
          ))}
        </div>

        {/* Reservations list */}
        {loading ? (
          <div className="space-y-4">
            <SkeletonList count={4} />
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((r) => {
              const status = statusConfig[r.status];
              const provider = providers[r.provider_id];
              const priceStr = r.price ? `${Number(r.price).toLocaleString('fr-FR')} FCFA` : '';
              return (
                <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <img
                        src={provider?.image || 'https://readdy.ai/api/search-image?query=professional%20african%20person%20portrait%20neutral%20background%20confident%20modern&width=56&height=56&seq=presta-avatar-default&orientation=squarish'}
                        alt={provider?.name || 'Prestataire'}
                        className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{r.service}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${status.color}`}>
                            <i className={status.icon}></i>
                            {status.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{provider?.name || 'Prestataire'}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1"><i className="ri-calendar-line"></i> {r.booking_date}</span>
                          <span className="flex items-center gap-1"><i className="ri-time-line"></i> {r.booking_time}</span>
                          <span className="flex items-center gap-1"><i className="ri-map-pin-line"></i> {r.address}</span>
                          <span className="font-medium text-gray-700">{priceStr}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {r.status === 'confirmed' && (
                        <>
                          <button
                            onClick={() => handleCancel(r.id)}
                            className="px-3 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors whitespace-nowrap cursor-pointer"
                          >
                            Annuler
                          </button>
                          <a
                            href={`tel:+221000000000`}
                            className="px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors whitespace-nowrap"
                          >
                            <i className="ri-phone-line mr-1"></i>Appeler
                          </a>
                        </>
                      )}
                      {r.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(r.id)}
                          className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          Annuler
                        </button>
                      )}
                      {r.status === 'completed' && (
                        <button
                          onClick={() => setReviewingId(r.id)}
                          className="px-3 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          <i className="ri-star-line mr-1"></i>Noter
                        </button>
                      )}
                      {r.status === 'cancelled' && (
                        <Link
                          to="/dashboard/client/prestataires"
                          className="px-3 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors whitespace-nowrap"
                        >
                          <i className="ri-refresh-line mr-1"></i>Recommander
                        </Link>
                      )}
                      {r.status === 'in_progress' && (
                        <a
                          href="https://maps.google.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
                        >
                          <i className="ri-map-pin-line mr-1"></i>Suivi
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Review form */}
                  {reviewingId === r.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Noter {provider?.name || 'Prestataire'}</h4>
                      <div className="flex gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            onClick={() => setReviewRating(star)}
                            className="w-8 h-8 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <i className={`ri-star-fill text-xl ${star <= reviewRating ? 'text-yellow-500' : 'text-gray-300'}`}></i>
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Décrivez votre expérience..."
                        maxLength={500}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-500 text-sm resize-none"
                        rows={3}
                      />
                      <p className="text-xs text-gray-400 mt-1 text-right">{reviewComment.length}/500</p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={handleReview}
                          className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          Publier l&apos;avis
                        </button>
                        <button
                          onClick={() => { setReviewingId(null); setReviewRating(0); setReviewComment(''); }}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {filtered.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-calendar-line text-2xl text-gray-400"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune réservation</h3>
            <Link to="/dashboard/client/prestataires" className="text-teal-600 hover:text-teal-700 font-medium">
              Trouver un prestataire
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
