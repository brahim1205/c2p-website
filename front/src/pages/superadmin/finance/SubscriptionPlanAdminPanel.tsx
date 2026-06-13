import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/hooks/useToast';
import {
  createAdminSubscriptionPlan,
  deactivateAdminSubscriptionPlan,
  fetchAdminSubscriptionPlans,
  updateAdminSubscriptionPlan,
} from '@/lib/saasApi';
import type { SubscriptionPlan } from '@/lib/saasApi';

const emptyPlan: Partial<SubscriptionPlan> = {
  role: 'prestataire',
  name: '',
  slug: '',
  price_monthly: 0,
  currency: 'XAF',
  commission_rate: 0,
  duration_value: 1,
  duration_unit: 'mois',
  promotional: true,
  description: '',
  features: [],
  verified_badge: false,
  active: true,
};

export default function SubscriptionPlanAdminPanel() {
  const { success, error } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [form, setForm] = useState<Partial<SubscriptionPlan>>(emptyPlan);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [featuresText, setFeaturesText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setPlans(await fetchAdminSubscriptionPlans());
    } catch (loadError) {
      console.error(loadError);
      error('Erreur', 'Impossible de charger les tarifs.');
    }
  }, [error]);

  useEffect(() => {
    void load();
  }, [load]);

  const edit = (plan: SubscriptionPlan) => {
    setEditingId(plan.id);
    setForm(plan);
    setFeaturesText((plan.features ?? []).join('\n'));
  };

  const reset = () => {
    setEditingId(null);
    setForm(emptyPlan);
    setFeaturesText('');
  };

  const save = async () => {
    if (!form.name?.trim()) {
      error('Nom requis', 'Renseignez le nom du plan.');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...form,
        features: featuresText.split('\n').map((item) => item.trim()).filter(Boolean),
      };
      if (editingId) {
        await updateAdminSubscriptionPlan(editingId, payload);
        success('Tarif modifié', form.name);
      } else {
        await createAdminSubscriptionPlan(payload);
        success('Tarif créé', form.name);
      }
      reset();
      await load();
    } catch (saveError) {
      console.error(saveError);
      error('Erreur', saveError instanceof Error ? saveError.message : 'Impossible d enregistrer le tarif.');
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async (plan: SubscriptionPlan) => {
    setBusy(true);
    try {
      await deactivateAdminSubscriptionPlan(plan.id);
      success('Tarif désactivé', plan.name);
      await load();
    } catch (deactivateError) {
      console.error(deactivateError);
      error('Erreur', 'Impossible de désactiver le tarif.');
    } finally {
      setBusy(false);
    }
  };

  const field = (key: keyof SubscriptionPlan, value: unknown) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-medium text-rose-600">Tarification dynamique</p>
        <h2 className="mt-1 text-2xl font-bold text-gray-900">Plans et abonnements</h2>
        <p className="mt-2 text-sm text-gray-600">Ces valeurs alimentent directement la page publique Tarifs.</p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <select value={form.role} onChange={(event) => field('role', event.target.value)} className="rounded-xl border border-gray-300 px-3 py-2">
          <option value="prestataire">Prestataire</option>
          <option value="formateur">Formateur</option>
          <option value="partenaire">Partenaire</option>
        </select>
        <input value={form.name ?? ''} onChange={(event) => field('name', event.target.value)} placeholder="Nom du plan" className="rounded-xl border border-gray-300 px-3 py-2" />
        <input type="number" min="0" value={form.price_monthly ?? 0} onChange={(event) => field('price_monthly', Number(event.target.value))} placeholder="Prix FCFA" className="rounded-xl border border-gray-300 px-3 py-2" />
        <input type="number" min="0" max="100" value={form.commission_rate ?? 0} onChange={(event) => field('commission_rate', Number(event.target.value))} placeholder="Commission %" className="rounded-xl border border-gray-300 px-3 py-2" />
        <input type="number" min="1" value={form.duration_value ?? 1} onChange={(event) => field('duration_value', Number(event.target.value))} className="rounded-xl border border-gray-300 px-3 py-2" />
        <select value={form.duration_unit ?? 'mois'} onChange={(event) => field('duration_unit', event.target.value)} className="rounded-xl border border-gray-300 px-3 py-2">
          <option value="jour">Jour</option>
          <option value="mois">Mois</option>
          <option value="an">An</option>
          <option value="ponctuel">Ponctuel</option>
        </select>
        <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm">
          <input type="checkbox" checked={Boolean(form.promotional)} onChange={(event) => field('promotional', event.target.checked)} />
          Promotionnel
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm">
          <input type="checkbox" checked={Boolean(form.verified_badge)} onChange={(event) => field('verified_badge', event.target.checked)} />
          Badge vérifié
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm">
          <input type="checkbox" checked={Boolean(form.active)} onChange={(event) => field('active', event.target.checked)} />
          Visible et actif
        </label>
      </div>
      <textarea value={form.description ?? ''} onChange={(event) => field('description', event.target.value)} placeholder="Description publique" rows={2} className="mt-4 w-full rounded-xl border border-gray-300 px-3 py-2" />
      <textarea value={featuresText} onChange={(event) => setFeaturesText(event.target.value)} placeholder="Un avantage par ligne" rows={4} className="mt-4 w-full rounded-xl border border-gray-300 px-3 py-2" />
      <div className="mt-4 flex gap-3">
        <button type="button" disabled={busy} onClick={() => void save()} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {editingId ? 'Enregistrer les modifications' : 'Créer le tarif'}
        </button>
        {editingId ? <button type="button" onClick={reset} className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm">Annuler</button> : null}
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <article key={plan.id} className={`rounded-2xl border p-4 ${plan.active ? 'border-gray-200' : 'border-red-100 bg-red-50/40'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">{plan.role}</p>
                <h3 className="mt-1 font-bold text-gray-900">{plan.name}</h3>
                <p className="mt-2 text-xl font-bold text-teal-700">{new Intl.NumberFormat('fr-SN').format(plan.price_monthly)} FCFA</p>
                <p className="text-xs text-gray-500">{plan.duration_value ?? 1} {plan.duration_unit ?? 'mois'} · {plan.active ? 'Actif' : 'Désactivé'}</p>
              </div>
              {plan.promotional ? <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">Promo</span> : null}
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" disabled={busy} onClick={() => edit(plan)} className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-medium text-blue-700">Modifier</button>
              {plan.active ? <button type="button" disabled={busy} onClick={() => void deactivate(plan)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700">Désactiver</button> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
