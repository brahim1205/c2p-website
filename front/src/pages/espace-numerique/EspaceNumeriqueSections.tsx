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
    <section style={{ backgroundColor: '#f4f0ff' }}>
      <div className="mx-auto max-w-7xl overflow-hidden px-4 pb-10 pt-24 sm:px-8 lg:px-14 lg:py-16">
        <div className="grid items-center gap-7 lg:min-h-[600px] lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative z-10 max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-bold text-[#7b3ff2] shadow-sm">
              <i className="ri-sparkling-2-line text-base" />
              {branchCopy.eyebrow}
            </div>
            <h1 className="text-4xl font-black leading-[1.02] tracking-tight text-[#102033] sm:text-5xl lg:text-6xl">
              {branchCopy.title}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-8 text-[#526275]">{branchCopy.description}</p>

            <div className="mt-8 max-w-xl rounded-2xl border border-white/80 bg-white p-2 shadow-[0_20px_55px_rgba(84,56,168,0.10)]">
              <div className="flex min-h-12 items-center gap-3 rounded-xl bg-[#faf9ff] px-4">
                <i className="ri-search-line text-lg text-[#7b3ff2]" />
              <input
                type="text"
                aria-label="Rechercher une formation"
                  placeholder="Rechercher un cours..."
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                  className="min-w-0 flex-1 border-0 bg-transparent text-sm font-medium text-[#102033] outline-none placeholder:text-[#8b96a8]"
              />
                <span className="hidden h-8 w-8 items-center justify-center rounded-lg bg-[#dff5ef] text-[#147f7b] sm:flex">
                  <i className="ri-arrow-right-line" />
                </span>
              </div>
            </div>
          </div>

          <div className="relative min-h-[280px] sm:min-h-[370px] lg:min-h-[520px]">
            <div className="absolute right-3 top-4 z-10 rounded-2xl bg-white px-4 py-3 shadow-[0_18px_44px_rgba(15,28,53,0.12)]">
              <div className="flex items-center gap-2">
                <div className="-space-x-2">
                  <span className="inline-flex h-7 w-7 rounded-full bg-[#7b3ff2]" />
                  <span className="inline-flex h-7 w-7 rounded-full bg-[#147f7b]" />
                  <span className="inline-flex h-7 w-7 rounded-full bg-[#ffd15a]" />
                </div>
                <div>
                  <p className="text-sm font-black text-[#102033]">100k+</p>
                  <p className="text-[11px] font-medium text-[#6b7a8d]">apprenants suivis</p>
                </div>
              </div>
            </div>

            <div className="absolute left-4 top-20 z-10 rounded-2xl bg-[#147f7b] px-5 py-4 text-white shadow-[0_18px_40px_rgba(20,127,123,0.28)] sm:left-10">
              <i className="ri-graduation-cap-line text-xl" />
              <p className="mt-1 text-2xl font-black leading-none">1,235</p>
              <p className="text-[11px] font-semibold">cours actifs</p>
            </div>

            <div className="absolute bottom-8 left-4 z-10 rounded-2xl bg-white px-4 py-3 shadow-[0_18px_44px_rgba(15,28,53,0.12)] sm:left-10">
              <p className="text-xs font-bold text-[#102033]">Vidéos • documents • certificats</p>
              <p className="mt-1 text-[11px] text-[#6b7a8d]">Un parcours complet après achat</p>
            </div>

            <div className="absolute inset-x-8 bottom-2 h-[72%] rounded-t-full bg-[#fff0c7]" />
            <img
              src="/images/home/numerique.png"
              alt="Apprentissage numérique C2P"
              className="absolute bottom-6 right-0 h-[80%] w-full rounded-[28px] object-contain object-center drop-shadow-[0_24px_45px_rgba(15,28,53,0.14)] lg:bottom-10 lg:w-[86%]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export function EspaceNumeriqueCategories({ selectedCategory, onSelectCategory }: EspaceNumeriqueCategoriesProps) {
  return (
    <section className="bg-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-black text-[#102033] sm:text-3xl">Top catégories</h2>
          <div className="mx-auto mt-3 h-1 w-14 rounded-full bg-[#ffd15a]" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="group" aria-label="Filtrer les formations par catégorie">
          {courseCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={selectedCategory === category.id}
              onClick={() => onSelectCategory(category.id)}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-bold transition-all ${
                selectedCategory === category.id
                  ? 'border-[#147f7b] bg-[#e9f8f4] text-[#147f7b] shadow-sm'
                  : 'border-[#edf1ef] bg-[#fbfdfc] text-[#607083] hover:border-[#147f7b]/40 hover:bg-[#f2fbf6]'
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#7b3ff2]">
                <i className={`${category.icon} text-xl`} />
              </span>
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
    <section className="bg-white px-4 pb-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 rounded-[24px] border border-[#edf1ef] bg-white p-4 shadow-[0_18px_44px_rgba(15,28,53,0.05)] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-bold text-[#147f7b]">Cours populaires</p>
          <span className="mt-1 block text-sm text-[#607083]">
            <strong className="text-[#102033]">{formationCount}</strong> formation{formationCount !== 1 ? 's' : ''} dans <strong className="text-[#102033]">{activeBranchLabel}</strong>
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="mt-2 cursor-pointer whitespace-nowrap text-sm font-bold text-[#7b3ff2]"
            >
              Réinitialiser
            </button>
          )}
        </div>
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto">
          <select
            aria-label="Filtrer les formations par branche"
            value={branchFilter}
            onChange={(event) => onBranchFilterChange(event.target.value as 'all' | CourseBranch)}
            className="w-full cursor-pointer rounded-xl border border-[#dbe7e2] bg-[#fbfdfc] px-4 py-3 text-sm font-medium text-[#102033] outline-none focus:border-[#147f7b]"
          >
            <option value="all">Tous les parcours</option>
            <option value="form_actions">Formation continue</option>
            <option value="end">Parcours accompagnés</option>
          </select>
          <select
            aria-label="Filtrer les formations par format"
            value={deliveryFilter}
            onChange={(event) => onDeliveryFilterChange(event.target.value as DeliveryFilter)}
            className="w-full cursor-pointer rounded-xl border border-[#dbe7e2] bg-[#fbfdfc] px-4 py-3 text-sm font-medium text-[#102033] outline-none focus:border-[#147f7b]"
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
    <section className="bg-white px-4 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {loading ? (
          <EspaceNumeriqueSkeletonGrid />
        ) : courses.length === 0 ? (
          <EspaceNumeriqueEmptyState onResetFilters={onResetFilters} />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
          className="animate-pulse overflow-hidden rounded-[22px] border border-[#edf1ef] bg-white shadow-[0_18px_45px_rgba(12,14,58,0.05)]"
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
    <div className="rounded-[24px] border border-[#edf1ef] bg-white p-6 text-center shadow-[0_18px_45px_rgba(12,14,58,0.05)] sm:p-12">
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
