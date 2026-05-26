import { Link } from 'react-router-dom';
import { formatCurrency } from '@/lib/formatters';
import type {
  PrestataireBooking as Booking,
  PrestataireProvider,
  PrestataireVerificationRequest,
  PrestataireVisibilityPass,
} from '@/lib/prestataireDashboardApi';

export interface PrestataireDashboardStat {
  label: string;
  value: string;
  detail: string;
  icon: string;
  surface: string;
}

export interface PrestataireQuickLink {
  label: string;
  icon: string;
  link: string;
  tone: string;
}

interface PrestataireHeroProps {
  firstName?: string | null;
}

interface PrestataireStatsGridProps {
  stats: PrestataireDashboardStat[];
}

interface PrestataireVerificationPanelProps {
  provider: PrestataireProvider | null;
  visibilityPass: PrestataireVisibilityPass | null;
  verificationRequest: PrestataireVerificationRequest | null;
  canRequestVerification: boolean;
  requestingVerification: boolean;
  onRequestVerification: () => void;
}

interface PrestataireQuickLinksPanelProps {
  quickLinks: PrestataireQuickLink[];
}

interface PrestataireMissionsPanelProps {
  loading: boolean;
  requests: Booking[];
  onUpdateStatus: (booking: Booking, status: Booking['status']) => void;
}

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

const bookingStatusStyles: Record<Booking['status'], string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
};

const bookingStatusLabels: Record<Booking['status'], string> = {
  pending: 'En attente',
  confirmed: 'Confirmee',
  in_progress: 'En cours',
  completed: 'Terminee',
  declined: 'Refusee',
};

export function PrestataireHero({ firstName }: PrestataireHeroProps) {
  return (
    <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
      <div className="min-w-0">
        <p className="text-sm font-medium text-teal-600">Espace prestataire</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">
          Bonjour, {firstName || 'Prestataire'} <span className="align-middle">👋</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600 md:text-base">
          C2P vous attribue les missions, vous pilotez l’exécution et les avis restent centralisés ici.
        </p>
      </div>
    </section>
  );
}

export function PrestataireStatsGrid({ stats }: PrestataireStatsGridProps) {
  return (
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
  );
}

export function PrestataireVerificationPanel({
  provider,
  visibilityPass,
  verificationRequest,
  canRequestVerification,
  requestingVerification,
  onRequestVerification,
}: PrestataireVerificationPanelProps) {
  return (
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
              onClick={onRequestVerification}
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
  );
}

export function PrestataireQuickLinksPanel({ quickLinks }: PrestataireQuickLinksPanelProps) {
  return (
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
  );
}

export function PrestataireMissionsPanel({ loading, requests, onUpdateStatus }: PrestataireMissionsPanelProps) {
  return (
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
                <BookingStatusBadge status={request.status} />
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
                <button onClick={() => onUpdateStatus(request, 'in_progress')} className="px-4 py-2 bg-[#5fa6f3] text-white rounded-lg text-sm font-medium hover:bg-[#27346b]">
                  Démarrer
                </button>
                <button onClick={() => onUpdateStatus(request, 'declined')} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Refuser
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function BookingStatusBadge({ status }: { status: Booking['status'] }) {
  return <span className={`px-3 py-1 rounded-full text-xs font-medium ${bookingStatusStyles[status]}`}>{bookingStatusLabels[status]}</span>;
}
