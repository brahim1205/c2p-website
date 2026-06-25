import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import {
  createPrestataireAvailabilityBlock,
  deletePrestataireAvailabilityBlock,
  fetchPrestataireAvailabilityBlocks,
} from '@/lib/prestataireDashboardApi';

function toLocalDateTime(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('fr-SN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function toIsoLocal(value: string) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export default function PrestataireAgendaPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [reason, setReason] = useState('');
  const queryKey = ['prestataire', user?.id, 'availability-blocks'];

  const blocksQuery = useQuery({
    queryKey,
    queryFn: () => fetchPrestataireAvailabilityBlocks(user!.id),
    enabled: Boolean(user?.id),
  });

  const blocks = useMemo(() => (
    [...(blocksQuery.data?.blocks ?? [])].sort((left, right) =>
      Date.parse(left.starts_at) - Date.parse(right.starts_at)
    )
  ), [blocksQuery.data?.blocks]);

  const handleCreate = async () => {
    const startsIso = toIsoLocal(startsAt);
    const endsIso = toIsoLocal(endsAt);
    if (!startsIso || !endsIso || new Date(endsIso) <= new Date(startsIso)) {
      error('Créneau invalide', 'Renseignez un début et une fin cohérents.');
      return;
    }
    try {
      await createPrestataireAvailabilityBlock({
        starts_at: startsIso,
        ends_at: endsIso,
        reason: reason.trim() || 'Créneau bloqué',
      });
      setStartsAt('');
      setEndsAt('');
      setReason('');
      await queryClient.invalidateQueries({ queryKey });
      success('Créneau bloqué', 'Les clients ne pourront pas réserver ce créneau.');
    } catch (err) {
      error('Erreur', err instanceof Error ? err.message : 'Impossible de bloquer le créneau.');
    }
  };

  const handleDelete = async (blockId: string | number) => {
    try {
      await deletePrestataireAvailabilityBlock(blockId);
      await queryClient.invalidateQueries({ queryKey });
      success('Créneau libéré', 'Le créneau est à nouveau réservable.');
    } catch (err) {
      error('Erreur', err instanceof Error ? err.message : 'Impossible de libérer le créneau.');
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Prestataire', path: '/dashboard/prestataire' }, { label: 'Agenda' }]} />

        <header className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-600">Disponibilités</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">Agenda prestataire</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Bloquez les créneaux où vous n’êtes pas disponible. Une demande client sur un créneau bloqué est refusée automatiquement.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-950">Bloquer un créneau</h2>
            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="agenda-starts-at" className="mb-1 block text-sm font-medium text-slate-700">Début</label>
                <input
                  id="agenda-starts-at"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
                />
              </div>
              <div>
                <label htmlFor="agenda-ends-at" className="mb-1 block text-sm font-medium text-slate-700">Fin</label>
                <input
                  id="agenda-ends-at"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(event) => setEndsAt(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
                />
              </div>
              <div>
                <label htmlFor="agenda-reason" className="mb-1 block text-sm font-medium text-slate-700">Motif</label>
                <input
                  id="agenda-reason"
                  type="text"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Ex: chantier, rendez-vous, indisponible"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
                />
              </div>
              <button
                type="button"
                onClick={handleCreate}
                className="w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700"
              >
                Bloquer ce créneau
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-950">Créneaux bloqués</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{blocks.length} créneau(x)</span>
            </div>
            <div className="mt-5 space-y-3">
              {blocksQuery.isLoading ? (
                <p className="text-sm text-slate-500">Chargement de l’agenda...</p>
              ) : blocks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  Aucun créneau bloqué pour le moment.
                </div>
              ) : blocks.map((block) => (
                <article key={String(block.id)} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{toLocalDateTime(block.starts_at)} → {toLocalDateTime(block.ends_at)}</p>
                    <p className="mt-1 text-sm text-slate-500">{block.reason || 'Créneau bloqué'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(block.id)}
                    className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    Libérer
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
