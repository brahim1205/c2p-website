import { Link } from 'react-router-dom';
import type { PublicProject } from '@/lib/projectCenterApi';
import { formatDate } from './projectDetailModel';

export default function ProjectDetailSidebar({ project }: { project: PublicProject }) {
  return (
    <aside className="space-y-6">
      <div className="rounded-[28px] border border-[#80bfdf] bg-white p-4 shadow-[0_20px_60px_rgba(39,52,107,0.08)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#27346b]">Fiche projet</p>
        <div className="mt-5 space-y-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#5fa6f3]">Porteur</span>
            <span className="font-medium text-[#06053a]">{project.porteur_name}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#5fa6f3]">Localisation</span>
            <span className="font-medium text-[#06053a]">{project.location || 'Non renseignée'}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#5fa6f3]">Dernière mise à jour</span>
            <span className="font-medium text-[#06053a]">{formatDate(project.last_update || project.created_at)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#5fa6f3]">Jalon suivant</span>
            <span className="font-medium text-right text-[#06053a]">{project.next_milestone || 'Non défini'}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#5fa6f3]">Durée estimée</span>
            <span className="font-medium text-right text-[#06053a]">
              {project.duration_months ? `${project.duration_months} mois` : 'Non renseignée'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#5fa6f3]">Catégorie</span>
            <span className="font-medium text-right text-[#06053a]">{project.project_tier || 'Non renseignée'}</span>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-[#80bfdf] bg-[#ffffff] p-4 shadow-[0_20px_60px_rgba(39,52,107,0.08)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#27346b]">Actions</p>
        <div className="mt-5 space-y-3">
          <Link to="/dashboard/partenaire/opportunites" className="c2p-btn-primary w-full px-6 py-3">
            Voir les opportunités partenaires
          </Link>
          <Link to="/project-center/soumettre" className="c2p-btn-accent w-full px-6 py-3">
            Soumettre un projet
          </Link>
          <Link to="/contact" className="c2p-btn-secondary w-full px-6 py-3">
            Parler à C2P
          </Link>
        </div>
        <p className="mt-4 text-xs leading-6 text-[#27346b]">
          Depuis cet espace, vous pouvez consulter le projet, contacter C2P ou rejoindre l’espace partenaire pour proposer un accompagnement.
        </p>
      </div>
    </aside>
  );
}
