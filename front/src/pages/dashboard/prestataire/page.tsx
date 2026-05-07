import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import GlobalSearch from '../components/GlobalSearch';
import { backendClient } from '@/lib/backendClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { createNotification } from '@/hooks/useCreateNotification';
import { formatCurrency } from '@/lib/formatters';

interface Provider {
  id: number;
  user_id?: string;
  rating: number;
  reviews_count: number;
  completed_jobs: number;
}

interface Booking {
  id: number;
  client_id: string;
  client_name: string;
  provider_id: number;
  service: string;
  booking_date: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'declined';
  price: number | null;
}

interface Review {
  id: number;
  client_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export default function PrestataireDashboardPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [requests, setRequests] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const loadDashboard = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: providerData, error: providerError } = await backendClient
        .from('providers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (providerError || !providerData) {
        throw new Error(providerError?.message || 'Prestataire introuvable.');
      }

      const providerRow = providerData as Provider;
      const [bookingsRes, reviewsRes] = await Promise.all([
        backendClient.from('bookings').select('*').eq('provider_id', providerRow.id).order('created_at', { ascending: false }).limit(4),
        backendClient.from('provider_reviews').select('*').eq('provider_id', providerRow.id).order('created_at', { ascending: false }).limit(3),
      ]);

      if (bookingsRes.error) throw new Error(bookingsRes.error.message);
      if (reviewsRes.error) throw new Error(reviewsRes.error.message);

      setProvider(providerRow);
      setRequests((bookingsRes.data as Booking[]) || []);
      setReviews((reviewsRes.data as Review[]) || []);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger le tableau de bord prestataire.');
    } finally {
      setLoading(false);
    }
  }, [error, user?.id]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const stats = useMemo(() => {
    const pending = requests.filter((request) => request.status === 'pending').length;
    const inProgress = requests.filter((request) => request.status === 'in_progress' || request.status === 'confirmed').length;
    return [
      { label: 'Demandes recues', value: requests.length, icon: 'ri-inbox-line', color: 'bg-[#14B8A6]' },
      { label: 'Prestations en cours', value: inProgress, icon: 'ri-time-line', color: 'bg-teal-500' },
      { label: 'Prestations terminees', value: provider?.completed_jobs || 0, icon: 'ri-checkbox-circle-line', color: 'bg-green-500' },
      { label: 'Note moyenne', value: provider?.rating?.toFixed(1) || '0.0', icon: 'ri-star-line', color: 'bg-yellow-500', helper: `${pending} en attente` },
    ];
  }, [provider?.completed_jobs, provider?.rating, requests]);

  const updateStatus = async (booking: Booking, status: Booking['status']) => {
    try {
      const { error: apiError } = await backendClient
        .from('bookings')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', booking.id);
      if (apiError) throw new Error(apiError.message);

      setRequests((prev) => prev.map((request) => (request.id === booking.id ? { ...request, status } : request)));
      await createNotification(
        booking.client_id,
        'Reservation mise a jour',
        `Votre demande "${booking.service}" est maintenant ${status === 'confirmed' ? 'acceptee' : 'refusee'}.`,
        'booking',
        '/dashboard/client/reservations',
      );
      success('Statut mis a jour', 'Le client a ete notifie du changement.');
    } catch (err) {
      console.error(err);
      error('Erreur', 'La demande n a pas pu etre mise a jour.');
    }
  };

  const getStatusBadge = (status: Booking['status']) => {
    const styles: Record<Booking['status'], string> = {
      pending: 'bg-amber-100 text-amber-700',
      confirmed: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-purple-100 text-purple-700',
      completed: 'bg-green-100 text-green-700',
      declined: 'bg-red-100 text-red-700',
    };
    const labels: Record<Booking['status'], string> = {
      pending: 'En attente',
      confirmed: 'Confirmee',
      in_progress: 'En cours',
      completed: 'Terminee',
      declined: 'Refusee',
    };
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Prestataire' }]} />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tableau de bord Prestataire</h1>
          <p className="text-gray-600">Demandes clients, avis recents et suivi de vos interventions.</p>
        </div>

        <GlobalSearch context="prestataire" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-white`}>
                  <i className={`${stat.icon} text-xl`}></i>
                </div>
                {'helper' in stat && stat.helper ? <span className="text-xs text-gray-500">{stat.helper}</span> : null}
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg lg:text-xl font-bold text-gray-900">Demandes recentes</h2>
              <Link to="/dashboard/prestataire/demandes" className="text-sm font-medium text-[#14B8A6] hover:text-[#0D9488]">Voir tout</Link>
            </div>

            <div className="space-y-4">
              {loading && <p className="text-sm text-gray-500">Chargement des demandes...</p>}
              {!loading && requests.map((request) => (
                <div key={request.id} className="rounded-xl border border-gray-200 p-4 hover:border-[#14B8A6]/40 transition-colors">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{request.service}</h3>
                      <p className="text-sm text-gray-600">{request.client_name} · {request.booking_date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(request.status)}
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(request.price)}</span>
                    </div>
                  </div>
                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => updateStatus(request, 'confirmed')} className="px-4 py-2 bg-[#14B8A6] text-white rounded-lg text-sm font-medium hover:bg-[#0D9488]">
                        Accepter
                      </button>
                      <button onClick={() => updateStatus(request, 'declined')} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                        Refuser
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg lg:text-xl font-bold text-gray-900">Avis clients</h2>
              <span className="text-sm text-gray-500">{provider?.reviews_count || 0} avis</span>
            </div>

            <div className="space-y-4">
              {loading && <p className="text-sm text-gray-500">Chargement des avis...</p>}
              {!loading && reviews.map((review) => (
                <div key={review.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{review.client_name}</span>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <i key={index} className={`ri-star-fill text-sm ${index < review.rating ? 'text-yellow-500' : 'text-gray-300'}`}></i>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{review.comment}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-8">
          <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-6">Actions rapides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Mes services', icon: 'ri-briefcase-line', link: '/dashboard/prestataire/services', tone: 'text-[#14B8A6] bg-[#14B8A6]/10' },
              { label: 'Demandes', icon: 'ri-inbox-line', link: '/dashboard/prestataire/demandes', tone: 'text-blue-600 bg-blue-100' },
              { label: 'Avis clients', icon: 'ri-star-line', link: '/dashboard/prestataire/avis', tone: 'text-yellow-600 bg-yellow-100' },
              { label: 'Messagerie', icon: 'ri-message-3-line', link: '/dashboard/messages', tone: 'text-green-600 bg-green-100' },
              { label: 'Mes revenus', icon: 'ri-wallet-3-line', link: '/dashboard/paiements', tone: 'text-purple-600 bg-purple-100' },
            ].map((action) => (
              <Link key={action.link} to={action.link} className="p-4 border-2 border-gray-200 rounded-lg hover:border-[#14B8A6]/40 transition-all text-center">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3 ${action.tone}`}>
                  <i className={`${action.icon} text-xl`}></i>
                </div>
                <p className="font-medium text-gray-900 text-sm">{action.label}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
