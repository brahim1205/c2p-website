import { Link } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { backendClient } from '@/lib/backendClient';
import PublicLayout from '@/components/feature/PublicLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';


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
  thumbnail: string | null;
  status: string;
  created_at: string;
}

export default function EspaceNumeriquePage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [levelFilter, setLevelFilter] = useState('all');
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

    result.sort((a, b) => {
      if (sortBy === 'popular') return (b.students_count || 0) - (a.students_count || 0);
      if (sortBy === 'price-low') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'price-high') return (b.price || 0) - (a.price || 0);
      return 0;
    });

    return result;
  }, [courses, selectedCategory, searchQuery, sortBy]);

  const resetFilters = () => {
    setSelectedCategory('all');
    setSearchQuery('');
    setSortBy('popular');
    setLevelFilter('all');
  };

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
    try {
      const { error: err } = await backendClient.from('course_enrollments').insert({
        course_id: course.id,
        student_id: user?.id ?? 'usr-apprenant',
        student_name: user ? `${user.firstName} ${user.lastName}` : 'Ibrahim Toure',
        student_email: user?.email ?? 'apprenant@c2p.sn',
        progress: 0,
        status: 'active',
      });
      if (err) {
        if (err.message?.includes('duplicate')) {
          toastError('Déjà inscrit', 'Vous êtes déjà inscrit à cette formation.');
          return;
        }
        throw err;
      }
      success('Inscription réussie', `Vous êtes maintenant inscrit à "${course.title}".`);

      // Send notification
      await backendClient.from('notifications').insert({
        user_id: course.instructor_id ?? 'usr-formateur',
        title: 'Nouvelle inscription',
        message: `Un apprenant s'est inscrit à "${course.title}"`,
        type: 'formation',
        is_read: false,
        link: '/dashboard/formateur/apprenants',
      });
    } catch (err) {
      toastError('Erreur', 'Impossible de s\'inscrire à cette formation.');
      console.error(err);
    }
  };

  return (
    <PublicLayout>
      <div className="min-h-screen bg-[#0b0b0b] text-white">
        {/* Hero Section */}
        <section className="relative min-h-[680px] w-full overflow-hidden bg-[#090909]">
          {/* Background image */}
          <div className="absolute inset-0">
            <img
              src="/images/home/academy.jpg"
              alt="Espace Numérique"
              className="h-full w-full object-cover object-center opacity-45"
            />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,7,7,0.94)_0%,rgba(7,7,7,0.76)_46%,rgba(7,7,7,0.34)_100%)]"></div>
          <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#0b0b0b] to-transparent"></div>

          <div className="relative z-10 flex min-h-[680px] items-center px-4 pt-24 sm:px-6 lg:px-20">
            <div className="mx-auto w-full max-w-7xl">
              <div className="max-w-3xl">
                <p className="mb-5 text-xs font-semibold uppercase tracking-[0.36em] text-[#d5b46f]">
                  Espace Numerique C2P
                </p>
                <h1 className="mb-6 text-4xl font-semibold leading-[0.98] text-white sm:text-5xl lg:text-7xl">
                  Des formations premium pour accelerer votre progression
                </h1>
                <p className="max-w-2xl text-base leading-8 text-white/68 sm:text-lg">
                  Accedez a des parcours structures, des experts metiers et des modules concus pour transformer vos competences en resultats professionnels.
                </p>
              </div>

              {/* Search */}
              <div className="mt-12 max-w-3xl rounded-[26px] border border-white/12 bg-white/[0.08] p-3 shadow-[0_30px_90px_rgba(0,0,0,0.4)] backdrop-blur">
                <div className="flex min-h-14 items-center gap-3 rounded-2xl bg-black/25 px-5 py-3">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <i className="ri-search-line text-[#d5b46f] text-xl"></i>
                  </div>
                  <input
                    type="text"
                    placeholder="Rechercher une formation..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/42"
                  />
                </div>
              </div>

              {/* Quick Stats */}
              <div className="mt-12 grid max-w-3xl grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/12 bg-white/12 sm:grid-cols-3">
                <div className="text-center">
                  <div className="bg-black/25 p-5">
                    <div className="mb-1 text-3xl font-semibold text-white">{courses.length}+</div>
                    <div className="text-xs uppercase tracking-[0.22em] text-white/55">Formations disponibles</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-black/25 p-5">
                    <div className="mb-1 text-3xl font-semibold text-white">2,500+</div>
                    <div className="text-xs uppercase tracking-[0.22em] text-white/55">Apprenants actifs</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-black/25 p-5">
                    <div className="mb-1 text-3xl font-semibold text-white">95%</div>
                    <div className="text-xs uppercase tracking-[0.22em] text-white/55">Satisfaction</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="border-y border-white/10 bg-[#111] px-4 py-6 sm:px-6 lg:px-20">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border px-5 py-3 text-sm font-medium transition-all ${
                    selectedCategory === category.id
                      ? 'border-[#d5b46f] bg-[#d5b46f] text-[#111]'
                      : 'border-white/10 bg-white/[0.04] text-white/62 hover:border-[#d5b46f]/60 hover:text-white'
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

        {/* Filters & Sort */}
        <section className="border-b border-white/10 bg-[#0f0f0f] px-4 py-4 sm:px-6 lg:px-20">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/62">
                <strong className="text-white">{filteredFormations.length}</strong> formation{filteredFormations.length !== 1 ? 's' : ''}
              </span>
              {(selectedCategory !== 'all' || levelFilter !== 'all' || searchQuery) && (
                <button
                  onClick={resetFilters}
                  className="cursor-pointer whitespace-nowrap text-sm font-medium text-[#d5b46f] hover:text-white"
                >
                  Réinitialiser
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-[#d5b46f]"
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
                  <div key={i} className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.05] animate-pulse">
                    <div className="h-48 bg-white/10"></div>
                    <div className="p-5 space-y-3">
                      <div className="h-5 bg-white/10 rounded w-3/4"></div>
                      <div className="h-4 bg-white/10 rounded w-1/2"></div>
                      <div className="h-4 bg-white/10 rounded w-1/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredFormations.length === 0 ? (
              <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.06]">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <i className="ri-book-open-line text-[#d5b46f] text-2xl"></i>
                  </div>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">Aucune formation trouvee</h3>
                <p className="mb-4 text-sm text-white/58">Essayez d&apos;ajuster vos filtres</p>
                <button
                  onClick={resetFilters}
                  className="cursor-pointer whitespace-nowrap rounded-full bg-[#d5b46f] px-6 py-2 text-sm font-semibold text-[#111] transition-colors hover:bg-[#f1d58c]"
                >
                  Réinitialiser
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFormations.map((formation) => (
                  <div
                    key={formation.id}
                    className="group overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.05] transition-all duration-300 hover:-translate-y-1 hover:border-[#d5b46f]/45 hover:shadow-[0_30px_70px_rgba(0,0,0,0.35)]"
                  >
                    <Link to={`/espace-numerique/formation/${formation.id}`}>
                      <div className="relative h-48 w-full overflow-hidden">
                        <img
                          src={getCourseImage(formation)}
                          alt={formation.title}
                          className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent"></div>
                        <div className="absolute right-4 top-4 rounded-full bg-[#d5b46f] px-3 py-1 text-xs font-semibold text-[#111]">
                          {getCategoryLabel(formation.category)}
                        </div>
                      </div>
                    </Link>

                    <div className="p-5">
                      <Link to={`/espace-numerique/formation/${formation.id}`}>
                        <h3 className="mb-2 text-lg font-semibold text-white transition-colors hover:text-[#d5b46f]">
                          {formation.title}
                        </h3>
                      </Link>

                      <div className="mb-4 flex items-center gap-4 text-sm text-white/52">
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

                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 flex items-center justify-center">
                            <i className="ri-group-line text-gray-400 text-sm"></i>
                          </div>
                          <span className="text-sm text-white/45">
                            {formation.students_count || 0} apprenants
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/10 pt-4">
                        <div className="text-xl font-semibold text-[#d5b46f]">
                          {formatPrice(formation.price)}
                        </div>
                        <button
                          onClick={() => handleEnroll(formation)}
                          className="whitespace-nowrap rounded-full bg-[#d5b46f] px-4 py-2 text-sm font-semibold text-[#111] transition-colors hover:bg-white"
                        >
                          S'inscrire
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 py-20 sm:px-6 lg:px-20">
          <div className="mx-auto max-w-5xl rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(213,180,111,0.18),rgba(255,255,255,0.05)_45%,rgba(255,255,255,0.02))] p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.35)] sm:p-12">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.34em] text-[#d5b46f]">
              Espace formateur
            </p>
            <h2 className="mb-6 text-3xl font-semibold text-white md:text-5xl">
              Devenez Formateur
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg leading-8 text-white/65">
              Partagez votre expertise et accompagnez les apprenants dans leur développement professionnel
            </p>
            <Link
              to="/auth/register"
              className="inline-flex items-center gap-3 whitespace-nowrap rounded-full bg-[#d5b46f] px-10 py-4 text-lg font-semibold text-[#111] transition-all hover:bg-white"
            >
              <span>Rejoindre Comme Formateur</span>
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-arrow-right-line"></i>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
