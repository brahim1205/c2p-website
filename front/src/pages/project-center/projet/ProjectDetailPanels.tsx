import { Link } from 'react-router-dom';
import type { PublicProject } from '@/lib/projectCenterApi';
import type { ProjectDocument, ProjectHistoryItem, ProjectMilestone, ProjectPartnership } from '@/lib/projectApi';
import {
  formatDate,
  getDocumentIcon,
  getMilestoneMeta,
  getPartnershipMeta,
} from './projectDetailModel';
export { ProjectFundingPanel } from './ProjectFundingPanels';

export function ProjectOverviewPanel({
  documents,
  milestones,
  project,
}: {
  documents: ProjectDocument[];
  milestones: ProjectMilestone[];
  project: PublicProject;
}) {
  return (
    <div className="space-y-8" role="tabpanel" id="project-panel-overview" aria-labelledby="project-tab-overview">
      <div>
        <h2 className="text-xl font-semibold text-[#06053a] sm:text-2xl">À propos du projet</h2>
        <p className="mt-4 text-sm leading-8 text-[#27346b]">{project.description || 'Aucune description détaillée n’a encore été publiée.'}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-5">
        <div className="rounded-[24px] border border-[#80bfdf] bg-[#ffffff] p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#27346b]">Impact actuel</p>
          <p className="mt-3 text-sm leading-7 text-[#27346b]">{project.impact || 'Impact en cours de qualification par l’équipe C2P.'}</p>
        </div>
        <div className="rounded-[24px] border border-[#80bfdf] bg-[#ffffff] p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#27346b]">Prochaine étape</p>
          <p className="mt-3 text-sm leading-7 text-[#27346b]">{project.next_milestone || 'Aucun jalon prioritaire publié pour le moment.'}</p>
        </div>
      </div>

      <ProjectMilestonesList milestones={milestones} />
      <ProjectDocumentsGrid documents={documents} />
    </div>
  );
}

function ProjectMilestonesList({ milestones }: { milestones: ProjectMilestone[] }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-[#06053a] sm:text-xl">Jalons</h3>
      <div className="mt-5 space-y-4">
        {milestones.length ? (
          milestones.map((milestone) => {
            const meta = getMilestoneMeta(milestone.status);
            return (
              <div key={milestone.id} className="rounded-[22px] border border-[#80bfdf] bg-white p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-3">
                    <span className={`mt-1 h-3 w-3 rounded-full ${meta.dot}`}></span>
                    <div>
                      <h4 className="font-semibold text-[#06053a]">{milestone.title}</h4>
                      <p className="mt-1 text-sm leading-6 text-[#27346b]">{milestone.description || 'Jalon en cours de structuration.'}</p>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <p className={`text-sm font-semibold ${meta.tone}`}>{meta.label}</p>
                    <p className="mt-1 text-xs text-[#5fa6f3]">Echéance : {formatDate(milestone.due_date)}</p>
                  </div>
                </div>
                {Array.isArray(milestone.tasks) && milestone.tasks.length ? (
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {milestone.tasks.map((task) => (
                      <li key={task.id} className="flex items-center gap-2 text-sm text-[#27346b]">
                        <i className={task.completed ? 'ri-checkbox-circle-fill text-emerald-500' : 'ri-checkbox-blank-circle-line text-[#5fa6f3]'}></i>
                        <span>{task.title}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })
        ) : (
          <div className="rounded-[22px] border border-[#80bfdf] bg-[#ffffff] p-5 text-sm text-[#27346b]">Aucun jalon public publié pour ce projet.</div>
        )}
      </div>
    </div>
  );
}

function ProjectDocumentsGrid({ documents }: { documents: ProjectDocument[] }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-[#06053a] sm:text-xl">Documents déclarés</h3>
      <div className="mt-5 grid gap-3 sm:gap-4 md:grid-cols-2">
        {documents.length ? (
          documents.map((document) => (
            <div key={document.id} className="flex items-start gap-3 rounded-[22px] border border-[#80bfdf] bg-[#ffffff] p-4 sm:gap-4 sm:p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#27346b] sm:h-11 sm:w-11">
                <i className={`${getDocumentIcon(document.type)} text-xl`}></i>
              </div>
              <div className="min-w-0">
                <h4 className="truncate font-semibold text-[#06053a]">{document.name}</h4>
                <p className="mt-1 text-sm text-[#27346b]">{String(document.type || '').toUpperCase()} • {document.size || 'Taille non précisée'}</p>
                <p className="mt-2 text-xs text-[#5fa6f3]">Mis à jour le {formatDate(document.date)}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[22px] border border-[#80bfdf] bg-[#ffffff] p-5 text-sm text-[#27346b]">
            Aucun document public n’est encore listé pour ce projet.
          </div>
        )}
      </div>
    </div>
  );
}

export function ProjectEcosystemPanel({ partnerships, project }: { partnerships: ProjectPartnership[]; project: PublicProject }) {
  return (
    <div className="space-y-8" role="tabpanel" id="project-panel-ecosystem" aria-labelledby="project-tab-ecosystem">
      <div className="rounded-[24px] border border-[#80bfdf] bg-[#ffffff] p-4 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#27346b]">Porteur du projet</p>
        <h2 className="mt-3 text-2xl font-semibold text-[#06053a]">{project.porteur_name}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[#5fa6f3]">Localisation</p>
            <p className="mt-1 text-sm text-[#27346b]">{project.location || 'Non renseignée'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[#5fa6f3]">Équipe</p>
            <p className="mt-1 text-sm text-[#27346b]">{project.team_size || 1} membres</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[#5fa6f3]">Mentors annoncés</p>
            <p className="mt-1 text-sm text-[#27346b]">{project.mentors || 0}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-[#06053a] sm:text-xl">Mentors et partenaires visibles</h3>
        <div className="mt-5 grid gap-3 sm:gap-4 md:grid-cols-2">
          {partnerships.length ? partnerships.map((partnership) => <ProjectPartnershipCard key={partnership.id} partnership={partnership} />) : (
            <div className="rounded-[22px] border border-[#80bfdf] bg-[#ffffff] p-5 text-sm text-[#27346b]">
              Aucun mentor ou partenaire public n’est encore publié sur ce dossier.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProjectPartnershipCard({ partnership }: { partnership: ProjectPartnership }) {
  const meta = getPartnershipMeta(partnership.type);
  return (
    <article className="rounded-[24px] border border-[#80bfdf] bg-white p-4 shadow-[0_18px_45px_rgba(39,52,107,0.08)] sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-lg font-semibold text-[#06053a]">{partnership.name}</h4>
          <p className="mt-1 text-sm text-[#27346b]">{partnership.role}</p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${meta.tone}`}>
          <i className={meta.icon}></i>
          <span>{meta.label}</span>
        </span>
      </div>
      {Array.isArray(partnership.expertise) && partnership.expertise.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {partnership.expertise.map((item) => (
            <span key={item} className="rounded-full border border-[#80bfdf] bg-[#ffffff] px-3 py-1 text-xs text-[#27346b]">
              {item}
            </span>
          ))}
        </div>
      ) : null}
      <p className="mt-4 text-xs text-[#5fa6f3]">Dernière activité : {partnership.last_activity || 'Non renseignée'}</p>
    </article>
  );
}

export function ProjectUpdatesPanel({ history }: { history: ProjectHistoryItem[] }) {
  return (
    <div className="space-y-4" role="tabpanel" id="project-panel-updates" aria-labelledby="project-tab-updates">
      {history.length ? history.map((item) => (
        <article key={item.id} className="rounded-[24px] border border-[#80bfdf] bg-white p-4 shadow-[0_18px_45px_rgba(39,52,107,0.08)] sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#06053a]">{item.action}</p>
              <p className="mt-1 text-sm text-[#27346b]">{item.user}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-sm font-semibold text-[#27346b]">{item.type}</p>
              <p className="mt-1 text-xs text-[#5fa6f3]">{formatDate(item.date)}</p>
            </div>
          </div>
        </article>
      )) : (
        <div className="rounded-[22px] border border-[#80bfdf] bg-[#ffffff] p-5 text-sm text-[#27346b]">
          Aucune actualité publique n’a encore été publiée pour ce projet.
        </div>
      )}
    </div>
  );
}

export function RelatedProjectsPanel({ relatedProjects }: { relatedProjects: PublicProject[] }) {
  if (!relatedProjects.length) return null;

  return (
    <div className="rounded-[28px] border border-[#80bfdf] bg-white p-4 shadow-[0_20px_60px_rgba(39,52,107,0.08)] sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#27346b]">Même secteur</p>
          <h3 className="mt-2 text-xl font-semibold text-[#06053a]">Autres projets à suivre</h3>
        </div>
        <Link to="/project-center" className="c2p-link text-sm font-medium">
          Voir tout
        </Link>
      </div>
      <div className="mt-5 space-y-4">
        {relatedProjects.map((item) => (
          <Link
            key={item.id}
            to={`/project-center/projet/${item.id}`}
            className="block rounded-[20px] border border-[#80bfdf] bg-[#ffffff] p-3.5 transition hover:border-[#27346b]/50 hover:bg-white sm:p-4"
          >
            <p className="font-semibold text-[#06053a]">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-[#27346b]">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
