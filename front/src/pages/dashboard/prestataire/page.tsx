import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import SubscriptionRequiredBanner from '@/components/feature/SubscriptionRequiredBanner';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useToast } from '@/hooks/useToast';
import { formatCurrency } from '@/lib/formatters';
import {
  fetchPrestataireDashboardSnapshot,
  requestPrestataireVerification,
  updatePrestataireBookingStatus,
  type PrestataireBooking as Booking,
  type PrestataireProvider as Provider,
  type PrestataireReview as Review,
  type PrestataireVerificationRequest,
  type PrestataireVisibilityPass,
} from '@/lib/prestataireDashboardApi';
import type { FinanceSnapshot } from '@/lib/saasApi';

export default function PrestataireDashboardPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const { gateFor } = useSubscriptionAccess(user);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [requests, setRequests] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [finance, setFinance] = useState<FinanceSnapshot | null>(null);
  const [visibilityPass, setVisibilityPass] = useState<PrestataireVisibilityPass | null>(null);
  const [verificationRequest, setVerificationRequest] = useState<PrestataireVerificationRequest | null>(null);
  const [requestingVerification, setRequestingVerification] = useState(false);
  const subscriptionGate = gateFor('provider_services_manage');

  const loadDashboard = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const snapshot = await fetchPrestataireDashboardSnapshot({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        role: user.role,
      });

      setProvider(snapshot.provider);
      setRequests(snapshot.bookings);
      setReviews(snapshot.reviews);
      setFinance(snapshot.finance);
      setVisibilityPass(snapshot.visibilityPass);
      setVerificationRequest(snapshot.verificationRequest);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger le tableau de bord prestataire.');
    } finally {
      setLoading(false);
    }
  }, [error, user?.avatar, user?.firstName, user?.id, user?.lastName, user?.role]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const stats = useMemo(() => {
    const pending = requests.filter((request) => request.status === 'pending').length;
    const inProgress = requests.filter((request) => request.status === 'in_progress' || request.status === 'confirmed').length;
    const revenue = requests
      .filter((request) => ['confirmed', 'in_progress', 'completed'].includes(request.status))
      .reduce((sum, request) => sum + Number(request.price || 0), 0);
    return [
      {
        label: 'Missions attribuées',
        value: String(requests.length),
        detail: `${pending} encore en revue C2P`,
        icon: 'ri-inbox-line',
        surface: 'bg-teal-50 text-teal-700',
      },
      {
        label: 'Prestations en cours',
        value: String(inProgress),
        detail: `${Math.max(0, requests.length - inProgress)} clôturée(s)`,
        icon: 'ri-time-line',
        surface: 'bg-sky-50 text-sky-700',
      },
      {
        label: 'Prestations terminées',
        value: String(provider?.completed_jobs || 0),
        detail: formatCurrency(revenue),
        icon: 'ri-checkbox-circle-line',
        surface: 'bg-emerald-50 text-emerald-700',
      },
      {
        label: 'Note moyenne',
        value: provider?.rating?.toFixed(1) || '0.0',
        detail: `${provider?.reviews_count || 0} avis`,
        icon: 'ri-star-line',
        surface: 'bg-amber-50 text-amber-700',
      },
    ];
  }, [provider?.completed_jobs, provider?.rating, provider?.reviews_count, requests]);

  const quickLinks = [
    { label: 'Mes services', icon: 'ri-briefcase-line', link: '/dashboard/prestataire/services', tone: 'bg-teal-50 text-teal-700' },
    { label: 'Demandes', icon: 'ri-inbox-line', link: '/dashboard/prestataire/demandes', tone: 'bg-sky-50 text-sky-700' },
    { label: 'Avis clients', icon: 'ri-star-line', link: '/dashboard/prestataire/avis', tone: 'bg-amber-50 text-amber-700' },
    { label: 'Messagerie', icon: 'ri-message-3-line', link: '/dashboard/messages', tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Paiements', icon: 'ri-wallet-3-line', link: '/dashboard/paiements', tone: 'bg-violet-50 text-violet-700' },
  ];

  const activeSubscription = finance?.subscriptions.find((entry) => entry.status === 'active') ?? null;
  const providerEscrows = finance?.escrowCases.filter((entry) => ['assigned', 'in_progress', 'delivery_review'].includes(entry.status)) ?? [];
  const canRequestVerification = Boolean(
    provider?.id
    && !provider?.verified
    && visibilityPass?.verification_eligible
    && (!verificationRequest || ['rejected', 'cancelled'].includes(verificationRequest.status)),
  );

  const updateStatus = async (booking: Booking, status: Booking['status']) => {
    try {
      await updatePrestataireBookingStatus(booking, status);
      setRequests((prev) => prev.map((request) => (request.id === booking.id ? { ...request, status } : request)));
      success('Statut mis a jour', 'Le client a ete notifie du changement.');
    } catch (err) {
      console.error(err);
      error('Erreur', 'La demande n a pas pu etre mise a jour.');
    }
  };

  const requestVerification = async () => {
    if (!provider?.id) return;
    setRequestingVerification(true);
    try {
      const created = await requestPrestataireVerification(provider.id);
      setVerificationRequest(created as PrestataireVerificationRequest);
      success('Demande envoyée', 'C2P a bien reçu votre demande de vérification SenPresta.');
    } catch (err) {
      console.error(err);
      error('Erreur', 'La demande de vérification n’a pas pu être envoyée.');
    } finally {
      setRequestingVerification(false);
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

  const verificationStatusLabel: Record<NonNullable<PrestataireVerificationRequest['status']>, string> = {
    pending: 'Demande en attente',
    in_review: 'En revue C2P',
    approved: 'Vérification approuvée',
    rejected: 'Vérification refusée',
    cancelled: 'Demande annulée',
  };

  const verificationStatusTone: Record<NonNullable<PrestataireVerificationRequest['status']>, string> = {
    pending: 'bg-amber-100 text-amber-700',
    in_review: 'bg-sky-100 text-sky-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-200 text-gray-700',
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Prestataire' }]} />

        <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <div className="min-w-0">
            <p className="text-sm font-medium text-teal-600">Espace prestataire</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">
              Bonjour, {user?.firstName || 'Prestataire'} <span className="align-middle">👋</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600 md:text-base">
              C2P vous attribue les missions, vous pilotez l’exécution et les avis restent centralisés ici.
            </p>
          </div>
        </section>

        <SubscriptionRequiredBanner gate={subscriptionGate} />

        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="mt-2 text-sm text-gray-500">{stat.detail}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.surface}`}>
                  <i className={`${stat.icon} text-xl`}></i>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <p className="text-sm text-gray-500">Abonnement C2P</p>
            <p className="mt-2 text-xl font-bold text-gray-900">{activeSubscription?.plan_name || 'Aucun plan actif'}</p>
            <p className="mt-2 text-sm text-gray-500">
              {activeSubscription ? `Commission ${activeSubscription.commission_rate}% · renouvellement ${new Date(activeSubscription.renews_at).toLocaleDateString('fr-FR')}` : 'Passez sur un plan pour améliorer votre priorité de matching.'}
            </p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <p className="text-sm text-gray-500">Billet SenPresta</p>
            <p className="mt-2 text-xl font-bold text-gray-900">{visibilityPass?.pass_label || 'Aucun billet actif'}</p>
            <p className="mt-2 text-sm text-gray-500">
              {visibilityPass
                ? `${visibilityPass.code} · expiration ${visibilityPass.expires_at ? new Date(visibilityPass.expires_at).toLocaleDateString('fr-FR') : 'non définie'}`
                : 'Activez un plan prestataire pour obtenir un billet de visibilité.'}
            </p>
            {visibilityPass ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-sky-100 px-3 py-1 font-medium text-sky-700">{visibilityPass.pass_tier}</span>
                <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700">
                  Matching {visibilityPass.matching_priority}
                </span>
              </div>
            ) : (
              <Link to="/dashboard/paiements" className="mt-3 inline-flex text-sm font-medium text-teal-600 hover:text-teal-700">
                Voir les plans
              </Link>
            )}
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <p className="text-sm text-gray-500">Wallet disponible</p>
            <p className="mt-2 text-xl font-bold text-gray-900">{formatCurrency(Number(finance?.wallet?.available_balance ?? finance?.wallet?.balance ?? 0))}</p>
            <p className="mt-2 text-sm text-gray-500">Retraits en attente : {formatCurrency(Number(finance?.wallet?.pending_payout_amount ?? 0))}</p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <p className="text-sm text-gray-500">Séquestres en supervision</p>
            <p className="mt-2 text-xl font-bold text-gray-900">{providerEscrows.length}</p>
            <p className="mt-2 text-sm text-gray-500">Net à libérer : {formatCurrency(providerEscrows.reduce((sum, entry) => sum + Number(entry.provider_amount || 0), 0))}</p>
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-gray-500">Vérification SenPresta</p>
              <h2 className="mt-1 text-lg font-bold text-gray-900">
                {provider?.verified ? 'Compte vérifié par C2P' : 'Statut de vérification en cours'}
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                {provider?.verified
                  ? 'Votre profil complet peut être exploité par les équipes C2P dans les mises en relation.'
                  : visibilityPass?.verification_eligible
                    ? 'Votre billet actuel vous permet de demander la vérification C2P.'
                    : 'Passez sur un billet éligible pour lancer une demande de vérification.'}
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              {verificationRequest ? (
                <>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${verificationStatusTone[verificationRequest.status]}`}>
                    {verificationStatusLabel[verificationRequest.status]}
                  </span>
                  <p className="text-sm text-gray-500">
                    Demandé le {new Date(verificationRequest.requested_at).toLocaleDateString('fr-FR')}
                  </p>
                </>
              ) : null}

              {canRequestVerification ? (
                <button
                  type="button"
                  onClick={requestVerification}
                  disabled={requestingVerification}
                  className="rounded-xl bg-[#06053a] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#27346b] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {requestingVerification ? 'Envoi...' : 'Demander la vérification'}
                </button>
              ) : !provider?.verified && !visibilityPass ? (
                <Link to="/dashboard/paiements" className="text-sm font-medium text-teal-600 hover:text-teal-700">
                  Activer un billet éligible
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Accès rapide</h2>
            <Link to="/dashboard/prestataire/demandes" className="text-sm font-medium text-teal-600 hover:text-teal-700">
              Voir le flux complet
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {quickLinks.map((action) => (
              <Link
                key={action.link}
                to={action.link}
                className={`rounded-2xl border border-transparent px-4 py-4 transition-all hover:border-gray-200 hover:bg-white ${action.tone}`}
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                  <i className={`${action.icon} text-lg`}></i>
                </div>
                <p className="text-sm font-medium">{action.label}</p>
              </Link>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr,1fr]">
          <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Missions attribuées</h2>
                <p className="text-sm text-gray-500">Les demandes que C2P vous a confiées et qui attendent votre action.</p>
              </div>
              <Link to="/dashboard/prestataire/demandes" className="text-sm font-medium text-teal-600 hover:text-teal-700">Voir tout</Link>
            </div>

            <div className="space-y-4">
              {loading && <p className="text-sm text-gray-500">Chargement des demandes...</p>}
              {!loading && requests.map((request) => (
                <div key={request.id} className="rounded-2xl border border-gray-200 p-4 transition-colors hover:border-teal-300">
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
                  {request.status === 'pending' ? (
                    <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">
                      Mission encore en revue chez C2P.
                    </div>
                  ) : null}
                  {request.status === 'confirmed' && (
                    <div className="flex gap-2">
                      <button onClick={() => updateStatus(request, 'in_progress')} className="px-4 py-2 bg-[#5fa6f3] text-white rounded-lg text-sm font-medium hover:bg-[#27346b]">
                        Démarrer
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

          <div className="space-y-6">
            <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Réputation</h2>
                <Link to="/dashboard/prestataire/avis" className="text-sm font-medium text-teal-600 hover:text-teal-700">
                  Gérer les avis
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Note moyenne</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{provider?.rating?.toFixed(1) || '0.0'}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Avis reçus</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{provider?.reviews_count || 0}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Prestations clôturées</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{provider?.completed_jobs || 0}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">En attente</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{requests.filter((request) => request.status === 'pending').length}</p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">Avis récents</h2>
                <span className="text-sm text-gray-500">{provider?.reviews_count || 0} avis</span>
              </div>

              <div className="space-y-4">
                {loading && <p className="text-sm text-gray-500">Chargement des avis...</p>}
                {!loading && reviews.map((review) => (
                  <div key={review.id} className="rounded-2xl border border-gray-200 p-4">
                    <div className="mb-2 flex items-center justify-between">
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
        </div>
      </div>
    </DashboardLayout>
  );
}
