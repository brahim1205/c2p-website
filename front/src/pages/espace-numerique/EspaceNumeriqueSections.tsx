import { type CourseBranch } from '@/lib/courseBranch';
import EspaceNumeriqueCourseCard from './EspaceNumeriqueCourseCard';
import { courseCategories, type Course } from './espaceNumeriquePageModel';

type DeliveryFilter = 'all' | 'online' | 'onsite' | 'hybrid';

interface BranchCopy {
  eyebrow: string;
  title: string;
  description: string;
}

interface EspaceNumeriqueHeroProps {
  branchCopy: BranchCopy;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

interface EspaceNumeriqueCategoriesProps {
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

interface EspaceNumeriqueFiltersProps {
  activeBranchLabel: string;
  branchFilter: 'all' | CourseBranch;
  deliveryFilter: DeliveryFilter;
  formationCount: number;
  hasActiveFilters: boolean;
  selectedCategory: string;
  searchQuery: string;
  onBranchFilterChange: (value: 'all' | CourseBranch) => void;
  onDeliveryFilterChange: (value: DeliveryFilter) => void;
  onResetFilters: () => void;
}

interface EspaceNumeriqueCoursesGridProps {
  courses: Course[];
  loading: boolean;
  onEnroll: (course: Course) => void;
  onResetFilters: () => void;
}

export function EspaceNumeriqueHero({ branchCopy, searchQuery, onSearchChange }: EspaceNumeriqueHeroProps) {
  return (
    <section className="relative min-h-[540px] w-full overflow-hidden bg-[#ffffff]">
      <div className="absolute inset-0">
        <img
          src="/images/home/academy.jpg"
          alt="Espace Numérique"
          className="h-full w-full object-cover object-center opacity-[0.36]"
        />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.82)_48%,rgba(248,250,252,0.48)_100%)]"></div>
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#ffffff] to-transparent"></div>

      <div className="relative z-10 flex min-h-[540px] items-center px-4 pt-20 sm:px-6 sm:pt-24 lg:px-20">
        <div className="mx-auto w-full max-w-7xl">
          <div className="max-w-3xl">
            <p className="c2p-eyebrow mb-5">{branchCopy.eyebrow}</p>
            <h1 className="mb-5 text-3xl font-semibold leading-tight text-[#06053a] sm:text-5xl">
              {branchCopy.title}
            </h1>
            <p className="max-w-2xl text-base leading-8 text-[#27346b] sm:text-lg">{branchCopy.description}</p>
          </div>

          <div className="c2p-panel mt-8 max-w-3xl p-2 sm:mt-10 sm:p-3">
            <div className="flex min-h-14 items-center gap-3 rounded-2xl bg-white/82 px-4 py-3 sm:px-5">
              <div className="flex h-6 w-6 items-center justify-center">
                <i className="ri-search-line text-xl text-[#27346b]"></i>
              </div>
              <input
                type="text"
                aria-label="Rechercher une formation"
                placeholder="Rechercher une formation..."
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

export function EspaceNumeriqueCategories({ selectedCategory, onSelectCategory }: EspaceNumeriqueCategoriesProps) {
  return (
    <section className="border-y border-[#80bfdf] bg-[#ffffff] px-4 py-4 sm:px-6 lg:px-20">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center gap-3 overflow-x-auto pb-2" role="group" aria-label="Filtrer les formations par catégorie">
          {courseCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={selectedCategory === category.id}
              onClick={() => onSelectCategory(category.id)}
              className={`flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2.5 text-sm font-medium transition-all ${
                selectedCategory === category.id
                  ? 'border-[#27346b] bg-[#27346b] text-white'
                  : 'border-[#80bfdf] bg-white text-[#27346b] hover:border-[#27346b]/60 hover:text-[#06053a]'
              }`}
            >
              <div className="flex h-5 w-5 items-center justify-center">
                <i className={`${category.icon} text-lg`}></i>
              </div>
              <span>{category.name}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function EspaceNumeriqueFilters({
  activeBranchLabel,
  branchFilter,
  deliveryFilter,
  formationCount,
  hasActiveFilters,
  onBranchFilterChange,
  onDeliveryFilterChange,
  onResetFilters,
}: EspaceNumeriqueFiltersProps) {
  return (
    <section className="border-b border-[#80bfdf] bg-[#ffffff] px-4 py-3 sm:px-6 lg:px-20">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
          <span className="text-sm text-[#27346b]">
            <strong className="text-[#06053a]">{formationCount}</strong> formation{formationCount !== 1 ? 's' : ''} dans{' '}
            <strong className="text-[#06053a]">{activeBranchLabel}</strong>
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="c2p-link cursor-pointer whitespace-nowrap text-sm font-medium"
            >
              Réinitialiser
            </button>
          )}
        </div>
        <div className="grid w-full grid-cols-1 gap-3 sm:w-auto sm:grid-cols-2">
          <select
            aria-label="Filtrer les formations par branche"
            value={branchFilter}
            onChange={(event) => onBranchFilterChange(event.target.value as 'all' | CourseBranch)}
            className="w-full cursor-pointer rounded-xl border border-[#80bfdf] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#27346b]"
          >
            <option value="all">Tous les parcours</option>
            <option value="form_actions">Formation continue</option>
            <option value="end">Parcours accompagnés</option>
          </select>
          <select
            aria-label="Filtrer les formations par format"
            value={deliveryFilter}
            onChange={(event) => onDeliveryFilterChange(event.target.value as DeliveryFilter)}
            className="w-full cursor-pointer rounded-xl border border-[#80bfdf] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#27346b]"
          >
            <option value="all">Tous formats</option>
            <option value="online">En ligne</option>
            <option value="onsite">Présentiel</option>
            <option value="hybrid">Hybride</option>
          </select>
        </div>
      </div>
    </section>
  );
}

export function EspaceNumeriqueCoursesGrid({
  courses,
  loading,
  onEnroll,
  onResetFilters,
}: EspaceNumeriqueCoursesGridProps) {
  return (
    <section className="px-4 py-12 sm:px-6 lg:px-20">
      <div className="mx-auto max-w-7xl">
        {loading ? (
          <EspaceNumeriqueSkeletonGrid />
        ) : courses.length === 0 ? (
          <EspaceNumeriqueEmptyState onResetFilters={onResetFilters} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
            {courses.map((formation) => (
              <EspaceNumeriqueCourseCard key={formation.id} formation={formation} onEnroll={onEnroll} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function EspaceNumeriqueSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, index) => (
        <div
          key={index}
          className="animate-pulse overflow-hidden rounded-[24px] border border-[#80bfdf] bg-white shadow-[0_18px_45px_rgba(12,14,58,0.05)]"
        >
          <div className="h-48 bg-[#e9eef5]"></div>
          <div className="space-y-3 p-5">
            <div className="h-5 w-3/4 rounded bg-[#e9eef5]"></div>
            <div className="h-4 w-1/2 rounded bg-[#e9eef5]"></div>
            <div className="h-4 w-1/4 rounded bg-[#e9eef5]"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EspaceNumeriqueEmptyState({ onResetFilters }: { onResetFilters: () => void }) {
  return (
    <div className="rounded-[24px] border border-[#80bfdf] bg-white p-6 text-center shadow-[0_18px_45px_rgba(12,14,58,0.05)] sm:p-12">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#ffffff]">
        <div className="flex h-8 w-8 items-center justify-center">
          <i className="ri-book-open-line text-2xl text-[#27346b]"></i>
        </div>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-[#06053a]">Aucune formation trouvée</h3>
      <p className="mb-4 text-sm text-[#27346b]">Essayez d&apos;ajuster vos filtres</p>
      <button type="button" onClick={onResetFilters} className="c2p-btn-accent w-full cursor-pointer px-6 py-2 sm:w-auto">
        Réinitialiser
      </button>
    </div>
  );
}
