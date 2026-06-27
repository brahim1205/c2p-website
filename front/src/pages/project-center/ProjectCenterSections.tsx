import { Link } from 'react-router-dom';
import type { PublicProject } from '@/lib/projectCenterApi';
import {
  getProgressColor,
  getProjectImage,
  projectCenterCategories,
  projectCenterSteps,
} from './projectCenterPublicModel';

type ProjectCenterHeroProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
};

type ProjectCenterCategoryBarProps = {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
};

type ProjectCenterFilterBarProps = {
  projectCount: number;
  hasActiveFilters: boolean;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onResetFilters: () => void;
};

type ProjectCenterGridProps = {
  loading: boolean;
  projects: PublicProject[];
  onResetFilters: () => void;
};

export function ProjectCenterHero({ searchQuery, onSearchChange }: ProjectCenterHeroProps) {
  return (
    <section className="relative overflow-hidden bg-[#e8f5d8] px-4 pb-10 pt-[92px] sm:px-6 lg:px-20 lg:pb-16 lg:pt-28">
      <div className="absolute left-[-8rem] top-[-8rem] h-72 w-72 rounded-full bg-white/45 blur-3xl" />
      <div className="absolute bottom-[-10rem] right-[-8rem] h-80 w-80 rounded-full bg-[#f5c542]/25 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="mb-5 inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-[#147f7b] shadow-sm">
            <i className="ri-rocket-line text-lg" />
            ProjectCenter C2P
          </p>
          <h1 className="max-w-3xl text-4xl font-black leading-[1.02] text-[#0f1c35] sm:text-5xl lg:text-6xl">
            Transformez une idée en projet accompagné et finançable.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[#506176] sm:text-lg">
            Soumettez votre projet, trouvez des mentors, mobilisez des partenaires techniques ou financiers et suivez votre progression jusqu’à l’autonomie.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link to="/project-center/soumettre" className="c2p-btn-accent px-7 py-4">
              Soumettre mon projet
            </Link>
            <a href="#project-center-results" className="c2p-btn-secondary bg-white px-7 py-4">
              Découvrir les projets
            </a>
          </div>

          <div className="mt-7 grid gap-2 sm:grid-cols-3">
            {projectCenterSteps.map((step, index) => (
              <div key={step} className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3 shadow-sm backdrop-blur">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-[#147f7b]">Étape {index + 1}</span>
                <p className="mt-1 text-sm font-bold text-[#0f1c35]">{step}</p>
              </div>
            ))}
          </div>

          <div className="mt-7 max-w-2xl rounded-[24px] border border-white/80 bg-white/86 p-3 shadow-[0_20px_55px_rgba(15,28,53,0.08)] backdrop-blur">
            <div className="flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4 py-3">
              <i className="ri-search-line text-xl text-[#64748b]" />
              <input
                type="text"
                aria-label="Rechercher un projet ou un porteur"
                placeholder="Rechercher un projet ou un porteur..."
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                className="c2p-input flex-1 border-0 bg-transparent px-0 text-[15px] shadow-none focus:ring-0"
              />
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-5 bottom-12 hidden h-44 w-20 rounded-full bg-[#ffd166] lg:block" />
          <img
            src="/images/home/project.png"
            alt="ProjectCenter"
            className="relative h-[320px] w-full rounded-[32px] object-cover object-center shadow-[0_28px_80px_rgba(15,28,53,0.16)] sm:h-[430px] lg:h-[520px]"
          />
          <div className="absolute right-4 top-4 rounded-3xl bg-white/92 px-5 py-4 shadow-[0_18px_45px_rgba(15,28,53,0.12)]">
            <p className="text-2xl font-black text-[#147f7b]">100%</p>
            <p className="text-xs font-semibold text-[#64748b]">soumission gratuite</p>
          </div>
          <div className="absolute bottom-5 left-5 right-5 rounded-3xl bg-white/92 p-5 shadow-[0_18px_45px_rgba(15,28,53,0.12)] backdrop-blur">
            <p className="text-sm font-black text-[#0f1c35]">Projets • mentors • financement</p>
            <p className="mt-1 text-xs leading-5 text-[#64748b]">Un espace pour construire, évaluer et accompagner les projets.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProjectCenterCategoryBar({ selectedCategory, onSelectCategory }: ProjectCenterCategoryBarProps) {
  return (
    <section className="bg-white px-4 py-5 sm:px-6 lg:px-20">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center gap-3 overflow-x-auto pb-2" role="group" aria-label="Filtrer les projets par categorie">
          {projectCenterCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={selectedCategory === category.id}
              onClick={() => onSelectCategory(category.id)}
              className={`flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2.5 text-sm font-medium transition-all ${
                selectedCategory === category.id
                  ? 'border-[#0f1c35] bg-[#0f1c35] text-white'
                  : 'border-[#d6dbe1] bg-white text-[#64748b] hover:border-[#1a9a96] hover:text-[#0f1c35]'
              }`}
            >
              <div className="flex h-5 w-5 items-center justify-center">
                <i className={`${category.icon} text-lg`} />
              </div>
              <span>{category.name}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ProjectCenterFilterBar({
  projectCount,
  hasActiveFilters,
  statusFilter,
  onStatusFilterChange,
  onResetFilters,
}: ProjectCenterFilterBarProps) {
  return (
    <section className="border-y border-[#e3eadb] bg-[#f7fbef] px-4 py-4 sm:px-6 lg:px-20">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#64748b]">
            <strong className="text-[#0f1c35]">{projectCount}</strong> projet{projectCount !== 1 ? 's' : ''}
          </span>
          {hasActiveFilters ? (
            <button type="button" onClick={onResetFilters} className="c2p-link cursor-pointer whitespace-nowrap text-sm font-medium">
              Réinitialiser
            </button>
          ) : null}
        </div>
        <select
          aria-label="Filtrer les projets par statut"
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value)}
          className="cursor-pointer rounded-xl border border-[#d6dbe1] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#1a9a96]"
        >
          <option value="all">Tous les statuts</option>
          <option value="pre-incubation">Pré-incubation</option>
          <option value="incubation">En incubation</option>
          <option value="acceleration">Accélération</option>
        </select>
      </div>
    </section>
  );
}

export function ProjectCenterGrid({ loading, projects, onResetFilters }: ProjectCenterGridProps) {
  return (
    <section id="project-center-results" className="bg-[#fbfdf7] px-4 py-12 sm:px-6 lg:px-20">
      <div className="mx-auto max-w-7xl">
        {loading ? <ProjectSkeletonGrid /> : null}
        {!loading && projects.length === 0 ? <EmptyProjectsState onResetFilters={onResetFilters} /> : null}
        {!loading && projects.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ProjectSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, index) => (
        <div key={index} className="animate-pulse overflow-hidden rounded-[24px] border border-[#d6dbe1] bg-white shadow-[0_18px_45px_rgba(15,28,53,0.05)]">
          <div className="h-48 bg-[#eceff3]" />
          <div className="space-y-3 p-5">
            <div className="h-5 w-3/4 rounded bg-[#eceff3]" />
            <div className="h-4 w-1/2 rounded bg-[#eceff3]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyProjectsState({ onResetFilters }: { onResetFilters: () => void }) {
  return (
    <div className="rounded-[24px] border border-[#d6dbe1] bg-white p-12 text-center shadow-[0_18px_45px_rgba(15,28,53,0.05)]">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#ffffff]">
        <div className="flex h-8 w-8 items-center justify-center">
          <i className="ri-lightbulb-line text-2xl text-[#1a9a96]" />
        </div>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-[#0f1c35]">Aucun projet trouvé</h3>
      <p className="mb-4 text-sm text-[#64748b]">Essayez d&apos;ajuster vos filtres</p>
      <button type="button" onClick={onResetFilters} className="c2p-btn-accent cursor-pointer whitespace-nowrap px-6 py-2">
        Réinitialiser
      </button>
    </div>
  );
}

function ProjectCard({ project }: { project: PublicProject }) {
  const progressPct = project.funding_goal > 0 ? Math.round((project.funding / project.funding_goal) * 100) : 0;

  return (
    <Link
      to={`/project-center/projet/${project.id}`}
      className="group cursor-pointer overflow-hidden rounded-[24px] border border-[#d6dbe1] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#1a9a96]/35 hover:shadow-[0_24px_60px_rgba(15,28,53,0.10)]"
    >
      <div className="relative h-40 w-full overflow-hidden sm:h-48">
        <img
          src={getProjectImage(project)}
          alt={project.title}
          className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="absolute right-3 top-3 rounded-full bg-[#0f1c35] px-2.5 py-1 text-[11px] font-semibold text-white sm:right-4 sm:top-4 sm:px-3 sm:text-xs">
          {project.status}
        </div>
        {project.project_tier ? (
          <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold uppercase text-[#1a9a96]">
            {project.project_tier === 'nano_bronze' ? 'Nano / Bronze' : project.project_tier}
          </div>
        ) : null}
      </div>

      <div className="p-4 sm:p-5">
        <h3 className="mb-2 text-base font-semibold text-[#0f1c35] sm:text-lg">{project.title}</h3>
        <p className="mb-3 line-clamp-2 text-sm text-[#64748b] sm:mb-4">{project.description}</p>

        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-[#64748b] sm:mb-4">
          <div className="flex h-4 w-4 items-center justify-center">
            <i className="ri-user-line" />
          </div>
          <span>{project.porteur_name}</span>
          <span className="mx-2">•</span>
          <div className="flex h-4 w-4 items-center justify-center">
            <i className="ri-team-line" />
          </div>
          <span>{project.team_size} membres</span>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-[#1a9a96] sm:mb-4">
          <div className="flex h-4 w-4 items-center justify-center">
            <i className="ri-graduation-cap-line" />
          </div>
          <span>{project.mentors} mentor{project.mentors > 1 ? 's' : ''}</span>
          <span className="mx-2">•</span>
          <span>Phase : {project.phase}</span>
          {project.duration_months ? <span>· {project.duration_months} mois</span> : null}
        </div>

        <div className="mb-3 sm:mb-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-[#64748b]">Financement</span>
            <span className="font-semibold text-[#0f1c35]">{progressPct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#ffffff]">
            <div className={`h-full rounded-full ${getProgressColor(project.funding, project.funding_goal)}`} style={{ width: `${Math.min(progressPct, 100)}%` }} />
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-[#94a3b8] sm:text-xs">
            <span>{(project.funding / 1000000).toFixed(1)}M FCFA</span>
            <span className="text-right">Objectif: {(project.funding_goal / 1000000).toFixed(1)}M FCFA</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-[#eceff3] pt-3 sm:pt-4">
          {project.looking_for.slice(0, 3).map((item, index) => (
            <span key={index} className="rounded-full border border-[#d6dbe1] bg-[#ffffff] px-2.5 py-1 text-[11px] text-[#64748b] sm:px-3 sm:text-xs">
              {item}
            </span>
          ))}
          {project.looking_for.length > 3 ? (
            <span className="rounded-full border border-[#d6dbe1] bg-[#ffffff] px-2.5 py-1 text-[11px] text-[#1a9a96] sm:px-3 sm:text-xs">
              +{project.looking_for.length - 3}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
