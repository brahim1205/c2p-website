import type { Dispatch, SetStateAction } from 'react';
import type { ProjectRecord } from '@/lib/projectApi';

export type FundingRoundDraft = {
  projectId: string;
  type: string;
  targetAmount: string;
  deadline: string;
  description: string;
};

type CreateFundingRoundModalProps = {
  projects: ProjectRecord[];
  newRound: FundingRoundDraft;
  setNewRound: Dispatch<SetStateAction<FundingRoundDraft>>;
  subscriptionAllowed: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export default function CreateFundingRoundModal({
  projects,
  newRound,
  setNewRound,
  subscriptionAllowed,
  onClose,
  onSubmit,
}: CreateFundingRoundModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Demande de financement</h3>
            <p className="mt-1 text-sm text-gray-500">C2P utilisera ces informations pour cadrer la levee et suivre les partenaires financiers.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100">
            <i className="ri-close-line text-xl text-gray-500"></i>
          </button>
        </div>
        <div className="grid gap-4">
          <div>
            <label htmlFor="porteur-round-project" className="block text-sm font-medium text-gray-700 mb-1">Projet</label>
            <select id="porteur-round-project" value={newRound.projectId} onChange={(e) => setNewRound((prev) => ({ ...prev, projectId: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20">
              <option value="">Selectionnez un projet</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
            </select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="porteur-round-type" className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select id="porteur-round-type" value={newRound.type} onChange={(e) => setNewRound((prev) => ({ ...prev, type: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20">
                <option value="amorcage">Amorcage</option>
                <option value="subvention">Subvention</option>
                <option value="concours">Concours</option>
                <option value="serie_a">Serie A</option>
              </select>
            </div>
            <div>
              <label htmlFor="porteur-round-target" className="block text-sm font-medium text-gray-700 mb-1">Objectif</label>
              <input id="porteur-round-target" type="number" value={newRound.targetAmount} onChange={(e) => setNewRound((prev) => ({ ...prev, targetAmount: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20" />
            </div>
          </div>
          <div>
            <label htmlFor="porteur-round-deadline" className="block text-sm font-medium text-gray-700 mb-1">Date limite</label>
            <input id="porteur-round-deadline" type="date" value={newRound.deadline} onChange={(e) => setNewRound((prev) => ({ ...prev, deadline: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20" />
          </div>
          <div>
            <label htmlFor="porteur-round-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea id="porteur-round-description" rows={4} value={newRound.description} onChange={(e) => setNewRound((prev) => ({ ...prev, description: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Annuler</button>
          <button onClick={onSubmit} disabled={!subscriptionAllowed} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60">Enregistrer la demande</button>
        </div>
      </div>
    </div>
  );
}
