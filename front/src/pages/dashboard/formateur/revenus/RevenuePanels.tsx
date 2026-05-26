import { getPayoutStatusLabel, getPayoutStatusTone } from '@/lib/paymentStatus';
import { type PayoutAccount, type PayoutRequest } from '@/lib/saasApi';
import {
  getMethodLabel,
  methodLabels,
  type CourseRevenue,
  type SupportedPayoutMethod,
} from './revenueModel';

type AccountForm = {
  method: SupportedPayoutMethod;
  account_name: string;
  account_identifier: string;
  label: string;
  is_default: boolean;
};

export function RevenueTotalsGrid({ totals }: { totals: { grossRevenue: number; available: number; pending: number; paidOut: number } }) {
  const items = [
    { label: 'Revenus bruts', value: `${totals.grossRevenue.toLocaleString('fr-FR')} FCFA`, color: 'text-gray-900' },
    { label: 'Disponible', value: `${totals.available.toLocaleString('fr-FR')} FCFA`, color: 'text-emerald-700' },
    { label: 'En attente', value: `${totals.pending.toLocaleString('fr-FR')} FCFA`, color: 'text-amber-700' },
    { label: 'Déjà versé', value: `${totals.paidOut.toLocaleString('fr-FR')} FCFA`, color: 'text-blue-700' },
  ];

  return (
    <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="text-sm text-gray-500">{item.label}</div>
          <div className={`mt-2 text-2xl font-bold ${item.color}`}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function PayoutBreakdownGrid({ breakdown }: { breakdown: { pending: number; approved: number; paid: number; rejected: number } }) {
  const items = [
    { label: 'Demandes en attente', value: breakdown.pending, className: 'border-amber-200 bg-amber-50 text-amber-700', valueClassName: 'text-amber-900' },
    { label: 'Approuvées', value: breakdown.approved, className: 'border-blue-200 bg-blue-50 text-blue-700', valueClassName: 'text-blue-900' },
    { label: 'Payées', value: breakdown.paid, className: 'border-emerald-200 bg-emerald-50 text-emerald-700', valueClassName: 'text-emerald-900' },
    { label: 'Rejetées', value: breakdown.rejected, className: 'border-red-200 bg-red-50 text-red-700', valueClassName: 'text-red-900' },
  ];

  return (
    <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className={`rounded-xl border p-5 ${item.className}`}>
          <div className="text-sm">{item.label}</div>
          <div className={`mt-2 text-2xl font-bold ${item.valueClassName}`}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function CourseRevenuePanel({ courses, loading }: { courses: CourseRevenue[]; loading: boolean }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Formations les plus contributrices</h2>
      <div className="space-y-3">
        {(loading ? [] : courses).map((course, index) => (
          <div key={`${String(course.id)}-${index}`} className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
            <div>
              <div className="font-medium text-gray-900">{course.title}</div>
              <div className="text-sm text-gray-500">{course.students_count} apprenants</div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-gray-900">{Number(course.revenue || 0).toLocaleString('fr-FR')} FCFA</div>
              <div className="text-xs text-gray-500">{Number(course.current_price || 0).toLocaleString('fr-FR')} FCFA / inscription</div>
            </div>
          </div>
        ))}
        {!loading && courses.length === 0 ? <p className="text-sm text-gray-500">Aucune donnée de revenu disponible pour le moment.</p> : null}
      </div>
    </section>
  );
}

export function PayoutRequestsPanel({ requests }: { requests: PayoutRequest[] }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Historique des retraits</h2>
      <div className="space-y-3">
        {requests.map((request) => (
          <div key={request.id} className="rounded-xl border border-gray-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="font-medium text-gray-900">
                  {Number(request.amount).toLocaleString('fr-FR')} {request.currency}
                </div>
                <div className="text-sm text-gray-500">{request.account_label || getMethodLabel(request.method)}</div>
                <div className="mt-1 text-xs text-gray-500">Demandé le {new Date(request.requested_at).toLocaleDateString('fr-FR')}</div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${getPayoutStatusTone(request.status)}`}>
                {getPayoutStatusLabel(request.status)}
              </span>
            </div>
            {request.note ? <p className="mt-3 text-sm text-gray-600">{request.note}</p> : null}
          </div>
        ))}
        {!requests.length ? <p className="text-sm text-gray-500">Aucune demande de retrait pour le moment.</p> : null}
      </div>
    </section>
  );
}

export function PayoutAccountsPanel({ accounts, onDefault }: { accounts: PayoutAccount[]; onDefault: (account: PayoutAccount) => void }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Comptes de retrait</h2>
      <div className="space-y-3">
        {accounts.map((account) => (
          <div key={account.id} className="rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium text-gray-900">{account.label}</div>
                <div className="text-sm text-gray-500">{getMethodLabel(account.method)}</div>
                <div className="mt-1 text-xs text-gray-500">
                  {account.account_name} • {account.account_identifier}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {account.is_default ? (
                  <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-teal-700">Par défaut</span>
                ) : (
                  <button onClick={() => onDefault(account)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                    Définir par défaut
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {!accounts.length ? <p className="text-sm text-gray-500">Ajoutez au moins un compte de retrait.</p> : null}
      </div>
    </section>
  );
}

export function AccountFormPanel({
  accountForm,
  savingAccount,
  onCreateAccount,
  onFormChange,
}: {
  accountForm: AccountForm;
  savingAccount: boolean;
  onCreateAccount: () => void;
  onFormChange: (patch: Partial<AccountForm>) => void;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Ajouter un compte</h2>
      <div className="space-y-4">
        <select value={accountForm.method} onChange={(event) => onFormChange({ method: event.target.value as SupportedPayoutMethod })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none">
          {Object.entries(methodLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input value={accountForm.account_name} onChange={(event) => onFormChange({ account_name: event.target.value })} placeholder="Nom du bénéficiaire" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
        <input value={accountForm.account_identifier} onChange={(event) => onFormChange({ account_identifier: event.target.value })} placeholder="IBAN, numéro ou identifiant" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
        <input value={accountForm.label} onChange={(event) => onFormChange({ label: event.target.value })} placeholder="Libellé interne" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
        <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700">
          <input type="checkbox" checked={accountForm.is_default} onChange={(event) => onFormChange({ is_default: event.target.checked })} className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
          Compte principal
        </label>
        <button onClick={onCreateAccount} disabled={savingAccount} className="w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">
          {savingAccount ? 'Enregistrement...' : 'Ajouter le compte'}
        </button>
      </div>
    </section>
  );
}

export function PayoutRequestFormPanel({
  accounts,
  payoutAmount,
  payoutNote,
  requestingPayout,
  selectedAccountId,
  onAmountChange,
  onNoteChange,
  onRequestPayout,
  onSelectedAccountChange,
}: {
  accounts: PayoutAccount[];
  payoutAmount: string;
  payoutNote: string;
  requestingPayout: boolean;
  selectedAccountId: string;
  onAmountChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onRequestPayout: () => void;
  onSelectedAccountChange: (value: string) => void;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Demander un retrait</h2>
      <div className="space-y-4">
        <select value={selectedAccountId} onChange={(event) => onSelectedAccountChange(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none">
          <option value="">Sélectionner un compte</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.label} • {getMethodLabel(account.method)}
            </option>
          ))}
        </select>
        <input type="number" min={1000} value={payoutAmount} onChange={(event) => onAmountChange(event.target.value)} placeholder="Montant à retirer (FCFA)" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
        <textarea value={payoutNote} onChange={(event) => onNoteChange(event.target.value)} rows={3} placeholder="Note interne ou contexte du retrait" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
        <button onClick={onRequestPayout} disabled={requestingPayout || !accounts.length} className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50">
          {requestingPayout ? 'Envoi...' : 'Envoyer la demande'}
        </button>
      </div>
    </section>
  );
}
