import type { PublicProject } from '@/lib/projectCenterApi';
import type { ProjectDocument, ProjectPartnership } from '@/lib/projectApi';
import { formatCompactCurrency, getStatusMeta } from './projectDetailModel';

interface ProjectDetailHeroProps {
  documents: ProjectDocument[];
  fundingPercent: number;
  partnerships: ProjectPartnership[];
  project: PublicProject;
}

export default function ProjectDetailHero({ documents, fundingPercent, partnerships, project }: ProjectDetailHeroProps) {
  const statusMeta = getStatusMeta(project.status);

  return (
    <section className="relative overflow-hidden border-b border-[#80bfdf] bg-[#ffffff]">
      <div className="absolute inset-0">
        <img src={project.image || '/images/brand/image8.jpeg'} alt={project.title} className="h-full w-full object-cover object-center opacity-22" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0.82)_50%,rgba(255,255,255,0.56)_100%)]"></div>
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white to-transparent"></div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-10 pt-24 sm:px-6 sm:pb-14 sm:pt-28 lg:px-20 lg:pb-18">
        <div className="max-w-4xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusMeta.className}`}>
              {statusMeta.label}
            </span>
            <span className="inline-flex rounded-full border border-[#5fa6f3] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#27346b]">
              {project.sector || project.category}
            </span>
            <span className="inline-flex rounded-full border border-[#80bfdf] bg-white px-3 py-1 text-xs font-medium text-[#27346b]">
              Phase : {project.phase || 'Non renseignée'}
            </span>
          </div>

          <h1 className="mt-5 text-3xl font-semibold leading-tight text-[#06053a] sm:text-5xl lg:text-6xl">
            {project.title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-[#27346b] sm:text-lg">
            {project.description || 'Projet en cours de structuration au sein de ProjectCenter.'}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {(project.looking_for || []).map((item) => (
              <span key={item} className="rounded-full border border-[#80bfdf] bg-white px-3 py-1.5 text-xs text-[#27346b] sm:text-sm">
                {item}
              </span>
            ))}
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
            <div className="rounded-[22px] border border-[#80bfdf] bg-white/90 px-4 py-4 shadow-[0_18px_45px_rgba(39,52,107,0.08)] sm:px-5 sm:py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5fa6f3]">Financement</p>
              <p className="mt-2 text-2xl font-semibold text-[#06053a]">{fundingPercent}%</p>
              <p className="mt-1 text-sm text-[#27346b]">{formatCompactCurrency(project.funding)} leve sur {formatCompactCurrency(project.funding_goal)}</p>
            </div>
            <div className="rounded-[22px] border border-[#80bfdf] bg-white/90 px-4 py-4 shadow-[0_18px_45px_rgba(39,52,107,0.08)] sm:px-5 sm:py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5fa6f3]">Equipe</p>
              <p className="mt-2 text-2xl font-semibold text-[#06053a]">{project.team_size || 1}</p>
              <p className="mt-1 text-sm text-[#27346b]">membres déclarés sur le projet</p>
            </div>
            <div className="rounded-[22px] border border-[#80bfdf] bg-white/90 px-4 py-4 shadow-[0_18px_45px_rgba(39,52,107,0.08)] sm:px-5 sm:py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5fa6f3]">Réseau C2P</p>
              <p className="mt-2 text-2xl font-semibold text-[#06053a]">{partnerships.length}</p>
              <p className="mt-1 text-sm text-[#27346b]">partenaires et mentors visibles</p>
            </div>
            <div className="rounded-[22px] border border-[#80bfdf] bg-white/90 px-4 py-4 shadow-[0_18px_45px_rgba(39,52,107,0.08)] sm:px-5 sm:py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5fa6f3]">Documentation</p>
              <p className="mt-2 text-2xl font-semibold text-[#06053a]">{documents.length}</p>
              <p className="mt-1 text-sm text-[#27346b]">éléments déclarés dans le dossier</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
