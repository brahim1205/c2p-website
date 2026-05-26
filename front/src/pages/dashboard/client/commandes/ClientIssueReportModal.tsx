import { emptyReportForm, type ReportForm } from './clientCommandesModel';
import type { ClientDashboardOrder as Order } from '@/lib/clientDashboardApi';

export function ClientIssueReportModal({
  reportForm,
  reportTarget,
  setReportForm,
  submitProblemReport,
}: {
  reportForm: ReportForm;
  reportTarget: Order;
  setReportForm: (form: ReportForm | ((current: ReportForm) => ReportForm)) => void;
  submitProblemReport: () => void | Promise<void>;
}) {
  const closeModal = () => setReportForm(emptyReportForm);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={closeModal}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Signaler un problème</h3>
            <p className="text-sm text-gray-600">Commande #{reportTarget.id}</p>
          </div>
          <button onClick={closeModal} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100">
            <i className="ri-close-line text-gray-500"></i>
          </button>
        </div>
        <div className="space-y-4">
          <label className="block space-y-2 text-sm text-gray-600">
            <span>Motif</span>
            <input
              type="text"
              value={reportForm.reason}
              onChange={(event) => setReportForm((current) => ({ ...current, reason: event.target.value }))}
              placeholder="Livraison, article, paiement..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
            />
          </label>
          <label className="block space-y-2 text-sm text-gray-600">
            <span>Priorité</span>
            <select
              value={reportForm.priority}
              onChange={(event) => setReportForm((current) => ({ ...current, priority: event.target.value as ReportForm['priority'] }))}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
            >
              <option value="low">Basse</option>
              <option value="medium">Moyenne</option>
              <option value="high">Haute</option>
            </select>
          </label>
          <label className="block space-y-2 text-sm text-gray-600">
            <span>Description</span>
            <textarea
              rows={5}
              value={reportForm.description}
              onChange={(event) => setReportForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Décrivez précisément le problème..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
            />
          </label>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button onClick={() => void submitProblemReport()} className="rounded-xl bg-teal-600 px-4 py-3 text-sm font-medium text-white hover:bg-teal-700">
            Envoyer le signalement
          </button>
          <button onClick={closeModal} className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
