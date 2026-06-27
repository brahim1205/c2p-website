import { Link } from 'react-router-dom';
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
    <section className="bg-[#f6f4ff] pt-6">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid items-center gap-8 rounded-[28px] bg-[#f6f4ff] lg:grid-cols-[0.95fr_1.05fr]">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-[#6f63d8] shadow-sm">
              <i className="ri-sparkling-2-line" />
              {branchCopy.eyebrow}
            </span>
            <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight text-[#10183f] sm:text-5xl lg:text-6xl">
              {branchCopy.title}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-8 text-[#68718b]">{branchCopy.description}</p>
            <div className="mt-7 flex max-w-xl items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_16px_45px_rgba(78,68,163,0.10)]">
              <i className="ri-search-line text-lg text-[#6f63d8]" />
              <input
                type="text"
                aria-label="Rechercher une formation"
                placeholder="Rechercher un cours..."
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-[#10183f] outline-none placeholder:text-[#9aa2b8]"
              />
            </div>
          </div>

          <div className="relative min-h-[330px] overflow-hidden rounded-[30px] bg-white lg:min-h-[430px]">
            <img
              src="/images/home/numerique.png"
              alt="Espace numérique C2P"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white/85 via-white/35 to-transparent" />
            <div className="absolute left-6 top-6 rounded-3xl bg-white/95 p-4 shadow-[0_20px_45px_rgba(16,24,63,0.12)]">
              <p className="text-3xl font-black text-[#6f63d8]">100k+</p>
              <p className="text-xs font-bold text-[#68718b]">apprenants accompagnés</p>
            </div>
            <div className="absolute bottom-6 left-6 rounded-2xl bg-[#6f63d8] px-5 py-4 text-white shadow-[0_18px_40px_rgba(111,99,216,0.22)]">
              <p className="text-sm font-black">Vidéos, documents et certificats</p>
              <p className="mt-1 text-xs text-white/80">Le contenu réel du formateur après achat</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function EspaceNumeriqueCategories({ selectedCategory, onSelectCategory }: EspaceNumeriqueCategoriesProps) {
  return (
    <section className="bg-white px-4 py-9 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-2xl font-black text-[#10183f]">Top catégories</h2>
        <div className="mx-auto mt-3 h-1 w-14 rounded-full bg-[#f6c847]" />
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {courseCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={selectedCategory === category.id}
              onClick={() => onSelectCategory(category.id)}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                selectedCategory === category.id
                  ? 'bg-[#efeefe] text-[#6f63d8] ring-1 ring-[#6f63d8]/20'
                  : 'bg-[#f7fbfa] text-[#64708a] hover:bg-[#efeefe] hover:text-[#6f63d8]'
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#6f63d8]">
                <i className={`${category.icon} text-lg`} />
              </span>
              {category.name}
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
      <div className="mx-auto flex max-w-7xl flex-col gap-4 rounded-3xl bg-[#f8f7ff] p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-bold text-[#68718b]">
          <span className="text-[#10183f]">{formationCount}</span> formation{formationCount !== 1 ? 's' : ''} · {activeBranchLabel}
        </p>
        <div className="grid gap-3 sm:grid-cols-[180px_160px_auto]">
          <select
            aria-label="Filtrer les formations par branche"
            value={branchFilter}
            onChange={(event) => onBranchFilterChange(event.target.value as 'all' | CourseBranch)}
            className="rounded-xl border border-transparent bg-white px-4 py-2.5 text-sm font-semibold text-[#10183f] outline-none focus:border-[#6f63d8]"
          >
            <option value="all">Tous les parcours</option>
            <option value="form_actions">Formation continue</option>
            <option value="end">Parcours accompagnés</option>
          </select>
          <select
            aria-label="Filtrer les formations par format"
            value={deliveryFilter}
            onChange={(event) => onDeliveryFilterChange(event.target.value as DeliveryFilter)}
            className="rounded-xl border border-transparent bg-white px-4 py-2.5 text-sm font-semibold text-[#10183f] outline-none focus:border-[#6f63d8]"
          >
            <option value="all">Tous formats</option>
            <option value="online">En ligne</option>
            <option value="onsite">Présentiel</option>
            <option value="hybrid">Hybride</option>
          </select>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={onResetFilters}
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-[#6f63d8] transition hover:bg-[#efeefe]"
            >
              Réinitialiser
            </button>
          ) : null}
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
  if (loading) {
    return (
      <section className="bg-white px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <EspaceNumeriqueSkeletonGrid />
        </div>
      </section>
    );
  }

  if (courses.length === 0) {
    return (
      <section className="bg-white px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <EspaceNumeriqueEmptyState onResetFilters={onResetFilters} />
        </div>
      </section>
    );
  }

  const recommended = ensureSection(courses.slice(0, 4), courses);
  const popular = ensureSection(courses.slice(4, 8), courses);
  const trending = ensureSection(courses.slice(8, 12), courses);

  return (
    <section className="bg-white px-4 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-12">
        <CourseStrip title="Recommandé pour vous" courses={recommended} onEnroll={onEnroll} />

        <div className="grid overflow-hidden rounded-[28px] bg-[#f3efff] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="p-8 sm:p-10">
            <p className="text-sm font-bold text-[#6f63d8]">Parcours C2P</p>
            <h2 className="mt-4 text-3xl font-black text-[#10183f] sm:text-4xl">Développez vos compétences numériques</h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-[#68718b]">
              Suivez des formations avec vidéos, documents, exercices et suivi. Après achat, l’apprenant voit exactement le contenu publié par le formateur.
            </p>
            <Link
              to="/auth/register?role=apprenant"
              className="mt-6 inline-flex rounded-xl bg-[#6f63d8] px-5 py-3 text-sm font-black text-white transition hover:bg-[#5d52c4]"
            >
              Commencer
            </Link>
          </div>
          <img src="/images/home/numerique.png" alt="" className="h-72 w-full object-cover lg:h-full" />
        </div>

        <CourseStrip title="Cours populaires" courses={popular} onEnroll={onEnroll} />
        <CourseStrip title="Cours tendances" courses={trending} onEnroll={onEnroll} />
      </div>
    </section>
  );
}

function CourseStrip({ title, courses, onEnroll }: { title: string; courses: Course[]; onEnroll: (course: Course) => void }) {
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-black text-[#10183f] sm:text-2xl">{title}</h2>
        <Link to="/espace-numerique" className="text-xs font-black text-[#6f63d8]">Voir tout</Link>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {courses.map((formation, index) => (
          <EspaceNumeriqueCourseCard
            key={`${formation.id}-${index}`}
            formation={formation}
            onEnroll={onEnroll}
          />
        ))}
      </div>
    </div>
  );
}

function ensureSection(sectionCourses: Course[], allCourses: Course[]) {
  if (sectionCourses.length >= 4) return sectionCourses;
  return [...sectionCourses, ...allCourses].slice(0, 4);
}

function EspaceNumeriqueSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(8)].map((_, index) => (
        <div key={index} className="animate-pulse overflow-hidden rounded-2xl border border-[#edf0f7] bg-white">
          <div className="h-40 bg-[#eef0f7]"></div>
          <div className="space-y-3 p-4">
            <div className="h-4 w-2/3 rounded bg-[#eef0f7]"></div>
            <div className="h-3 w-1/2 rounded bg-[#eef0f7]"></div>
            <div className="h-3 w-1/3 rounded bg-[#eef0f7]"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EspaceNumeriqueEmptyState({ onResetFilters }: { onResetFilters: () => void }) {
  return (
    <div className="rounded-[24px] border border-[#edf0f7] bg-white p-10 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f3efff] text-[#6f63d8]">
        <i className="ri-book-open-line text-2xl"></i>
      </div>
      <h3 className="text-lg font-black text-[#10183f]">Aucune formation trouvée</h3>
      <p className="mt-2 text-sm text-[#68718b]">Essayez d’ajuster vos filtres.</p>
      <button type="button" onClick={onResetFilters} className="mt-5 rounded-xl bg-[#6f63d8] px-5 py-3 text-sm font-black text-white">
        Réinitialiser
      </button>
    </div>
  );
}
