import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { backendClient } from '@/lib/backendClient';
import { useAuth } from '@/hooks/useAuth';
import { notifyInstructorEnrollment } from '@/hooks/useCreateNotification';
import { useToast } from '@/hooks/useToast';
import {
  getCourseDeliveryBadgeClass,
  getCourseDeliveryIcon,
  getCourseDeliveryLabel,
  normalizeCourseDeliveryMode,
} from '@/lib/courseDelivery';
import {
  getCourseBranchBadgeClass,
  getCourseBranchDescription,
  getCourseBranchLabel,
  normalizeCourseBranch,
  type CourseBranch,
} from '@/lib/courseBranch';

interface Course {
  id: number;
  title: string;
  category: string;
  description: string | null;
  instructor_id: string | null;
  modules: number | null;
  duration: string | null;
  students_count: number | null;
  price: number | null;
  current_price?: number | null;
  thumbnail: string | null;
  status: string;
  level?: string | null;
  rating?: number | null;
  access_type?: 'free' | 'paid' | null;
  is_free?: boolean | null;
  delivery_mode?: string | null;
  program_branch?: string | null;
  instructor_name?: string | null;
  created_at: string;
}

function normalizeCourseLevel(value: string | null | undefined) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'debutant' || normalized === 'beginner') return 'beginner';
  if (normalized === 'avance' || normalized === 'advanced') return 'advanced';
  if (normalized === 'tous niveaux' || normalized === 'all_levels') return 'all_levels';
  return 'intermediate';
}

function getCourseLevelLabel(value: string | null | undefined) {
  const level = normalizeCourseLevel(value);
  if (level === 'beginner') return 'Débutant';
  if (level === 'advanced') return 'Avancé';
  if (level === 'all_levels') return 'Tous niveaux';
  return 'Intermédiaire';
}

export default function EspaceNumeriquePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { success, error: toastError } = useToast();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [levelFilter, setLevelFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState<'all' | CourseBranch>(() => normalizeCourseBranch(searchParams.get('branche')) ?? 'all');
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'online' | 'onsite' | 'hybrid'>(() => {
    const value = normalizeCourseDeliveryMode(searchParams.get('format'));
    return value ?? 'all';
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: 'all', name: 'Toutes les formations', icon: 'ri-apps-line' },
    { id: 'langues', name: 'Langues', icon: 'ri-translate-2' },
    { id: 'informatique', name: 'Informatique', icon: 'ri-computer-line' },
    { id: 'entrepreneuriat', name: 'Entrepreneuriat', icon: 'ri-lightbulb-line' },
    { id: 'commerce', name: 'Commerce', icon: 'ri-store-line' },
    { id: 'communication', name: 'Communication', icon: 'ri-chat-3-line' },
    { id: 'gestion', name: 'Gestion de Projet', icon: 'ri-task-line' }
  ];

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const { data, error: err } = await backendClient
          .from('courses')
          .select('*')
          .eq('status', 'published')
          .order('students_count', { ascending: false });
        if (err) throw err;
        setCourses(data || []);
      } catch (err) {
        console.error(err);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);
    if (branchFilter === 'all') nextParams.delete('branche');
    else nextParams.set('branche', branchFilter);

    if (deliveryFilter === 'all') nextParams.delete('format');
    else nextParams.set('format', deliveryFilter);

    const current = searchParams.toString();
    const next = nextParams.toString();
    if (current !== next) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [branchFilter, deliveryFilter, searchParams, setSearchParams]);

  const filteredFormations = useMemo(() => {
    let result = [...courses];

    if (selectedCategory !== 'all') {
      result = result.filter((f) => (f.category || '').toLowerCase().includes(selectedCategory.toLowerCase()));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          (f.description || '').toLowerCase().includes(q)
      );
    }

    if (levelFilter !== 'all') {
      result = result.filter((f) => normalizeCourseLevel(f.level) === levelFilter);
    }

    if (branchFilter !== 'all') {
      result = result.filter((f) => normalizeCourseBranch(f.program_branch) === branchFilter);
    }

    if (deliveryFilter !== 'all') {
      result = result.filter((f) => normalizeCourseDeliveryMode(f.delivery_mode) === deliveryFilter);
    }

    result.sort((a, b) => {
      if (sortBy === 'popular') return (b.students_count || 0) - (a.students_count || 0);
      if (sortBy === 'price-low') return (a.current_price ?? a.price ?? 0) - (b.current_price ?? b.price ?? 0);
      if (sortBy === 'price-high') return (b.current_price ?? b.price ?? 0) - (a.current_price ?? a.price ?? 0);
      return 0;
    });

    return result;
  }, [courses, selectedCategory, searchQuery, sortBy, levelFilter, branchFilter, deliveryFilter]);

  const resetFilters = () => {
    setSelectedCategory('all');
    setSearchQuery('');
    setSortBy('popular');
    setLevelFilter('all');
    setBranchFilter('all');
    setDeliveryFilter('all');
  };

  const branchCounts = useMemo(
    () => ({
      form_actions: courses.filter((course) => normalizeCourseBranch(course.program_branch) === 'form_actions').length,
      end: courses.filter((course) => normalizeCourseBranch(course.program_branch) === 'end').length,
    }),
    [courses],
  );

  const activeBranchCopy = branchFilter === 'form_actions'
    ? {
        eyebrow: 'Form Actions | Post-formation et perfectionnement',
        title: 'Bootcamps, stages et perfectionnement métier portés par Form Actions',
        description: 'Cette branche couvre la post-formation, les parcours complémentaires, les séminaires spécialisés et les programmes de renforcement de compétences.',
      }
    : branchFilter === 'end'
      ? {
          eyebrow: 'END | École Numérique de Dakar',
          title: 'Cours programmés, classes et suivi apprenant pilotés par END',
          description: "Cette branche couvre les parcours d'enseignement, les classes programmées, le suivi apprenant et la logique parent-enfant portée par l'END.",
        }
      : {
          eyebrow: 'Form Actions + END | Espace Numérique C2P',
          title: 'Formations, classes et parcours souples pour progresser durablement',
          description: "L'Espace Numérique couvre les besoins de post-formation, de cours programmés, de classes en ligne et de parcours en présentiel portés par Form Actions et l'École Numérique de Dakar.",
        };

  const activeBranchLabel = branchFilter === 'all' ? 'Form Actions + END' : getCourseBranchLabel(branchFilter);

  const formatPrice = (price: number | null) => {
    if (!price || price === 0) return 'Gratuit';
    return price.toLocaleString('fr-FR') + ' FCFA';
  };

  const getCategoryLabel = (cat: string) => {
    const found = categories.find(c => c.id.toLowerCase() === cat.toLowerCase());
    return found ? found.name : cat;
  };

  const getCourseImage = (course: Course) => {
    if (course.thumbnail) return course.thumbnail;
    const catImages: Record<string, string> = {
      informatique: '/images/home/academy.jpg',
      langues: '/images/home/global.jpg',
      entrepreneuriat: '/images/home/venture.jpg',
      commerce: '/images/home/service.jpg',
      communication: '/images/home/precision.jpg',
      gestion: '/images/home/trust.jpg',
    };
    return catImages[(course.category || '').toLowerCase()] || catImages['informatique'];
  };

  const handleEnroll = async (course: Course) => {
    if (!user?.id) {
      toastError('Connexion requise', 'Connectez-vous pour vous inscrire a cette formation.');
      navigate('/auth/login', { state: { from: `/espace-numerique/formation/${course.id}` } });
      return;
    }
    if (user.role !== 'apprenant' && user.role !== 'admin') {
      toastError('Compte apprenant requis', 'Utilisez un compte apprenant pour suivre cette formation.');
      return;
    }

    try {
      const { error: err } = await backendClient.from('course_enrollments').insert({
        course_id: course.id,
        student_id: user.id,
        student_name: `${user.firstName} ${user.lastName}`.trim(),
        student_email: user.email,
        progress: 0,
        status: 'active',
        enrolled_at: new Date().toISOString(),
        last_active: new Date().toISOString(),
      });
      if (err) {
        if (err.message?.includes('duplicate')) {
          toastError('Déjà inscrit', 'Vous êtes déjà inscrit à cette formation.');
          return;
        }
        throw err;
      }
      success('Inscription réussie', `Vous êtes maintenant inscrit à "${course.title}".`);

      if (course.instructor_id) {
        await notifyInstructorEnrollment(course.instructor_id, course.title);
      }
      navigate('/espace-numerique/mon-apprentissage');
    } catch (err) {
      toastError('Erreur', 'Impossible de s\'inscrire à cette formation.');
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-c2p-bg text-c2p-text">
        {/* Hero Section */}
        <section className="relative min-h-[680px] w-full overflow-hidden bg-[#ffffff]">
          {/* Background image */}
          <div className="absolute inset-0">
            <img
              src="/images/brand/images10.jpeg"
              alt="Espace Numérique"
              className="h-full w-full object-cover object-center opacity-24"
            />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(247,248,252,0.94)_0%,rgba(247,248,252,0.78)_46%,rgba(247,248,252,0.36)_100%)]"></div>
          <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#ffffff] to-transparent"></div>

          <div className="relative z-10 flex min-h-[680px] items-center px-4 pt-24 sm:px-6 lg:px-20">
            <div className="mx-auto w-full max-w-7xl">
              <div className="max-w-3xl">
                <p className="mb-5 text-xs font-semibold uppercase tracking-[0.36em] text-[#27346b]">
                  {activeBranchCopy.eyebrow}
                </p>
                <h1 className="mb-6 text-4xl font-semibold leading-[0.98] text-[#06053a] sm:text-5xl lg:text-7xl">
                  {activeBranchCopy.title}
                </h1>
                <p className="max-w-2xl text-base leading-8 text-[#27346b] sm:text-lg">
                  {activeBranchCopy.description}
                </p>
              </div>

              {/* Search */}
              <div className="c2p-panel mt-12 max-w-3xl p-3">
                <div className="flex min-h-14 items-center gap-3 rounded-2xl bg-white/82 px-5 py-3">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <i className="ri-search-line text-[#27346b] text-xl"></i>
                  </div>
                  <input
                    type="text"
                    aria-label="Rechercher une formation"
                    placeholder="Rechercher une formation..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="c2p-input flex-1 border-0 bg-transparent px-0 text-[15px] shadow-none focus:ring-0"
                  />
                </div>
              </div>

              {/* Quick Stats */}
              <div className="mt-12 grid max-w-3xl grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[#80bfdf] bg-[#80bfdf] sm:grid-cols-3">
                <div className="text-center">
                  <div className="bg-white/78 p-5">
                    <div className="mb-1 text-3xl font-semibold text-[#06053a]">{branchFilter === 'all' ? courses.length : filteredFormations.length}+</div>
                    <div className="text-xs uppercase tracking-[0.22em] text-[#5fa6f3]">Parcours {branchFilter === 'all' ? 'disponibles' : activeBranchLabel}</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-white/78 p-5">
                    <div className="mb-1 text-3xl font-semibold text-[#06053a]">{branchCounts.form_actions}</div>
                    <div className="text-xs uppercase tracking-[0.22em] text-[#5fa6f3]">Form Actions</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-white/78 p-5">
                    <div className="mb-1 text-3xl font-semibold text-[#06053a]">{branchCounts.end}</div>
                    <div className="text-xs uppercase tracking-[0.22em] text-[#5fa6f3]">END</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="border-y border-[#80bfdf] bg-[#ffffff] px-4 py-6 sm:px-6 lg:px-20">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 overflow-x-auto pb-2" role="group" aria-label="Filtrer les formations par categorie">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={selectedCategory === category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border px-5 py-3 text-sm font-medium transition-all ${
                    selectedCategory === category.id
                      ? 'border-[#27346b] bg-[#27346b] text-white'
                      : 'border-[#80bfdf] bg-white text-[#27346b] hover:border-[#27346b]/60 hover:text-[#06053a]'
                  }`}
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    <i className={`${category.icon} text-lg`}></i>
                  </div>
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f8fbff] px-4 py-5 sm:px-6 lg:px-20">
          <div className="mx-auto grid max-w-7xl gap-3 md:grid-cols-2">
            {(['form_actions', 'end'] as CourseBranch[]).map((branch) => (
              <button
                key={branch}
                type="button"
                aria-pressed={branchFilter === branch}
                onClick={() => setBranchFilter((current) => current === branch ? 'all' : branch)}
                className={`rounded-2xl border px-4 py-4 text-left transition-colors ${branchFilter === branch ? 'border-[#27346b]/25 bg-white shadow-sm' : 'border-[#d7e6fb] bg-white/75 hover:bg-white'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getCourseBranchBadgeClass(branch)}`}>
                    {getCourseBranchLabel(branch)}
                  </span>
                  <span className="text-xs text-[#5b6778]">{branchCounts[branch]} parcours</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#31445f]">{getCourseBranchDescription(branch)}</p>
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-[#27346b]">
                  {branchFilter === branch ? 'Sous-produit actif' : 'Cliquer pour basculer'}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* Filters & Sort */}
        <section className="border-b border-[#80bfdf] bg-[#ffffff] px-4 py-4 sm:px-6 lg:px-20">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-[#27346b]">
                <strong className="text-[#06053a]">{filteredFormations.length}</strong> formation{filteredFormations.length !== 1 ? 's' : ''} dans <strong className="text-[#06053a]">{activeBranchLabel}</strong>
              </span>
              {(selectedCategory !== 'all' || levelFilter !== 'all' || branchFilter !== 'all' || deliveryFilter !== 'all' || searchQuery) && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="c2p-link cursor-pointer whitespace-nowrap text-sm font-medium"
                >
                  Réinitialiser
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <select
                aria-label="Filtrer les formations par niveau"
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="cursor-pointer rounded-xl border border-[#80bfdf] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#27346b]"
              >
                <option value="all">Tous niveaux</option>
              <option value="beginner">Débutant</option>
              <option value="intermediate">Intermédiaire</option>
              <option value="advanced">Avancé</option>
              <option value="all_levels">Tous niveaux publics</option>
              </select>
              <select
                aria-label="Filtrer les formations par branche"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value as 'all' | CourseBranch)}
                className="cursor-pointer rounded-xl border border-[#80bfdf] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#27346b]"
              >
                <option value="all">Form Actions + END</option>
                <option value="form_actions">Form Actions</option>
                <option value="end">END</option>
              </select>
              <select
                aria-label="Filtrer les formations par format"
                value={deliveryFilter}
                onChange={(e) => setDeliveryFilter(e.target.value as 'all' | 'online' | 'onsite' | 'hybrid')}
                className="cursor-pointer rounded-xl border border-[#80bfdf] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#27346b]"
              >
                <option value="all">Tous formats</option>
                <option value="online">En ligne</option>
                <option value="onsite">Présentiel</option>
                <option value="hybrid">Hybride</option>
              </select>
              <select
                aria-label="Trier les formations"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="cursor-pointer rounded-xl border border-[#80bfdf] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#27346b]"
              >
                <option value="popular">Plus populaires</option>
                <option value="price-low">Prix croissant</option>
                <option value="price-high">Prix décroissant</option>
              </select>
            </div>
          </div>
        </section>

        {/* Formations Grid */}
        <section className="py-12 px-4 sm:px-6 lg:px-20">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-[24px] border border-[#80bfdf] bg-white animate-pulse shadow-[0_18px_45px_rgba(12,14,58,0.05)]">
                    <div className="h-48 bg-[#e9eef5]"></div>
                    <div className="p-5 space-y-3">
                      <div className="h-5 bg-[#e9eef5] rounded w-3/4"></div>
                      <div className="h-4 bg-[#e9eef5] rounded w-1/2"></div>
                      <div className="h-4 bg-[#e9eef5] rounded w-1/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredFormations.length === 0 ? (
              <div className="rounded-[24px] border border-[#80bfdf] bg-white p-12 text-center shadow-[0_18px_45px_rgba(12,14,58,0.05)]">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#ffffff]">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <i className="ri-book-open-line text-[#27346b] text-2xl"></i>
                  </div>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-[#06053a]">Aucune formation trouvée</h3>
                <p className="mb-4 text-sm text-[#27346b]">Essayez d&apos;ajuster vos filtres</p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="c2p-btn-accent cursor-pointer whitespace-nowrap px-6 py-2"
                >
                  Réinitialiser
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
                {filteredFormations.map((formation) => (
                  <div
                    key={formation.id}
                    className="group overflow-hidden rounded-[24px] border border-[#80bfdf] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#27346b]/45 hover:shadow-[0_24px_60px_rgba(12,14,58,0.10)]"
                  >
                    <Link to={`/espace-numerique/formation/${formation.id}`}>
                      <div className="relative h-40 w-full overflow-hidden sm:h-48">
                        <img
                          src={getCourseImage(formation)}
                          alt={formation.title}
                          className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent"></div>
                        <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5 sm:right-4 sm:top-4 sm:gap-2">
                          <div className="rounded-full bg-[#27346b] px-2.5 py-1 text-[11px] font-semibold text-white sm:px-3 sm:text-xs">
                            {getCategoryLabel(formation.category)}
                          </div>
                          <div className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:px-3 sm:text-xs ${getCourseBranchBadgeClass(formation.program_branch)}`}>
                            {getCourseBranchLabel(formation.program_branch)}
                          </div>
                          <div className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:px-3 sm:text-xs ${getCourseDeliveryBadgeClass(formation.delivery_mode)}`}>
                            <i className={getCourseDeliveryIcon(formation.delivery_mode)}></i>
                            <span>{getCourseDeliveryLabel(formation.delivery_mode)}</span>
                          </div>
                        </div>
                      </div>
                    </Link>

                    <div className="p-4 sm:p-5">
                      <Link to={`/espace-numerique/formation/${formation.id}`}>
                        <h3 className="mb-2 text-base font-semibold text-[#06053a] transition-colors hover:text-[#27346b] sm:text-lg">
                          {formation.title}
                        </h3>
                      </Link>

                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[#80bfdf] bg-[#ffffff] px-2.5 py-1 text-[11px] font-medium text-[#27346b] sm:text-xs">
                          {getCourseLevelLabel(formation.level)}
                        </span>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium sm:text-xs ${getCourseBranchBadgeClass(formation.program_branch)}`}>
                          {getCourseBranchLabel(formation.program_branch)}
                        </span>
                        <span className="rounded-full border border-[#80bfdf] bg-[#ffffff] px-2.5 py-1 text-[11px] font-medium text-[#5fa6f3] sm:text-xs">
                          {formation.is_free ? 'Accès gratuit' : 'Accès payant'}
                        </span>
                      </div>

                      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-[#27346b] sm:mb-4 sm:gap-4">
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 flex items-center justify-center">
                            <i className="ri-time-line"></i>
                          </div>
                          <span>{formation.duration || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 flex items-center justify-center">
                            <i className="ri-book-line"></i>
                          </div>
                          <span>{formation.modules || 0} modules</span>
                        </div>
                      </div>

                      <div className="mb-3 flex flex-wrap items-center gap-2.5 sm:gap-3">
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 flex items-center justify-center">
                            <i className="ri-group-line text-gray-400 text-sm"></i>
                          </div>
                          <span className="text-sm text-[#5fa6f3]">
                            {formation.students_count || 0} apprenants
                          </span>
                        </div>
                        {formation.instructor_name ? (
                          <div className="flex items-center gap-1 text-sm text-[#5fa6f3]">
                            <i className="ri-user-star-line text-gray-400 text-sm"></i>
                            <span>{formation.instructor_name}</span>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex items-end justify-between gap-3 border-t border-[#eee4d3] pt-3 sm:pt-4">
                        <div className="text-lg font-semibold text-[#27346b] sm:text-xl">
                          {formatPrice(formation.current_price ?? formation.price)}
                        </div>
                        <button
                          type="button"
                          aria-label={`S’inscrire à la formation ${formation.title}`}
                          onClick={() => handleEnroll(formation)}
                          className="c2p-btn-accent whitespace-nowrap px-3.5 py-2 text-sm"
                        >
                          {normalizeCourseBranch(formation.program_branch) === 'end' ? "Rejoindre la classe" : "Rejoindre le parcours"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

    </div>
  );
}
