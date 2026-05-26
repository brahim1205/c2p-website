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
    <section className="relative min-h-[680px] w-full overflow-hidden bg-[#ffffff]">
      <div className="absolute inset-0">
        <img
          src="/images/home/venture.jpg"
          alt="ProjectCenter"
          className="h-full w-full object-cover object-center opacity-[0.36]"
        />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.82)_48%,rgba(248,250,252,0.48)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#ffffff] to-transparent" />

      <div className="relative z-10 flex min-h-[680px] items-center px-4 pt-24 sm:px-6 lg:px-20">
        <div className="mx-auto w-full max-w-7xl">
          <div className="max-w-3xl">
            <p className="c2p-eyebrow mb-5">Projects Center C2P</p>
            <h1 className="mb-6 text-4xl font-semibold leading-[0.98] text-[#0f1c35] sm:text-5xl lg:text-7xl">
              De l&apos;idée au lancement
            </h1>
            <p className="max-w-2xl text-base leading-8 text-[#64748b] sm:text-lg">
              Notre centre d&apos;incubation vous accompagne à chaque étape avec des experts, des outils et un réseau de partenaires engagés.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/project-center/soumettre" className="c2p-btn-accent px-7 py-4">
                Soumettre mon projet
              </Link>
              <a href="#project-center-results" className="c2p-btn-secondary bg-white/82 px-7 py-4">
                Découvrir les projets
              </a>
            </div>
            <div className="mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-5">
              {projectCenterSteps.map((step, index) => (
                <div key={step} className="rounded-2xl border border-[#dbe7f3] bg-white/82 px-4 py-3 shadow-sm">
                  <span className="text-sm font-semibold text-[#1a9a96]">{index + 1}</span>
                  <p className="mt-1 text-sm font-semibold text-[#0f1c35]">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="c2p-panel mt-12 max-w-3xl p-3">
            <div className="flex min-h-14 items-center gap-3 rounded-2xl bg-white/82 px-5 py-3">
              <div className="flex h-6 w-6 items-center justify-center">
                <i className="ri-search-line text-xl text-[#64748b]" />
              </div>
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
      </div>
    </section>
  );
}

export function ProjectCenterCategoryBar({ selectedCategory, onSelectCategory }: ProjectCenterCategoryBarProps) {
  return (
    <section className="border-y border-[#d6dbe1] bg-[#ffffff] px-4 py-6 sm:px-6 lg:px-20">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center gap-3 overflow-x-auto pb-2" role="group" aria-label="Filtrer les projets par categorie">
          {projectCenterCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={selectedCategory === category.id}
              onClick={() => onSelectCategory(category.id)}
              className={`flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border px-5 py-3 text-sm font-medium transition-all ${
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
    <section className="border-b border-[#d6dbe1] bg-[#ffffff] px-4 py-4 sm:px-6 lg:px-20">
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
    <section id="project-center-results" className="px-4 py-12 sm:px-6 lg:px-20">
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
