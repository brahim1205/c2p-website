import { Link } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { backendClient } from '@/lib/backendClient';


interface Project {
  id: number;
  title: string;
  description: string | null;
  category: string;
  status: string;
  phase: string;
  porteur_name: string;
  funding: number;
  funding_goal: number;
  team_size: number;
  mentors: number;
  image: string | null;
  looking_for: string[];
  created_at: string;
}

export default function ProjectCenterPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: 'all', name: 'Tous les projets', icon: 'ri-apps-line' },
    { id: 'tech', name: 'Technologies', icon: 'ri-smartphone-line' },
    { id: 'agriculture', name: 'Agriculture', icon: 'ri-plant-line' },
    { id: 'education', name: 'Éducation', icon: 'ri-book-open-line' },
    { id: 'sante', name: 'Santé', icon: 'ri-heart-pulse-line' },
    { id: 'commerce', name: 'Commerce', icon: 'ri-store-line' },
    { id: 'environnement', name: 'Environnement', icon: 'ri-leaf-line' }
  ];

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const { data, error: err } = await backendClient
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });
        if (err) throw err;
        const mapped: Project[] = (data || []).map((p) => ({
          ...p,
          looking_for: Array.isArray(p.looking_for) ? p.looking_for : [],
        }));
        setProjects(mapped);
      } catch (err) {
        console.error(err);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const filteredProjets = useMemo(() => {
    let result = [...projects];

    if (selectedCategory !== 'all') {
      result = result.filter((p) => p.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.porteur_name.toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status.toLowerCase().includes(statusFilter.toLowerCase()));
    }

    if (sortBy === 'recent') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'funding') {
      result.sort((a, b) => b.funding - a.funding);
    } else if (sortBy === 'progress') {
      result.sort((a, b) => ((b.funding / (b.funding_goal || 1)) || 0) - ((a.funding / (a.funding_goal || 1)) || 0));
    }

    return result;
  }, [projects, selectedCategory, searchQuery, statusFilter, sortBy]);

  const resetFilters = () => {
    setSelectedCategory('all');
    setSearchQuery('');
    setStatusFilter('all');
    setSortBy('recent');
  };

  const getProgressColor = (funding: number, goal: number) => {
    const pct = goal > 0 ? (funding / goal) * 100 : 0;
    if (pct >= 75) return 'bg-[#27346b]';
    if (pct >= 50) return 'bg-[#8b5cf6]';
    if (pct >= 25) return 'bg-[#dbad29]';
    return 'bg-[#5fa6f3]';
  };

  const getProjectImage = (project: Project) => {
    if (project.image) return project.image;
    const catImages: Record<string, string> = {
      tech: '/images/home/precision.jpg',
      agriculture: '/images/home/venture.jpg',
      education: '/images/home/academy.jpg',
      sante: '/images/home/support.jpg',
      commerce: '/images/home/service.jpg',
      environnement: '/images/home/global.jpg',
    };
    return catImages[project.category] || catImages['tech'];
  };

  const totalFunding = projects.reduce((sum, p) => sum + (p.funding || 0), 0);

  return (
    <div className="min-h-screen bg-c2p-bg text-c2p-text">
        {/* Hero Section */}
        <section className="relative min-h-[680px] w-full overflow-hidden bg-[#ffffff]">
          {/* Background image */}
          <div className="absolute inset-0">
            <img
              src="/images/brand/images11.jpeg"
              alt="ProjectCenter"
              className="h-full w-full object-cover object-center opacity-24"
            />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(247,248,252,0.94)_0%,rgba(247,248,252,0.78)_46%,rgba(247,248,252,0.36)_100%)]"></div>
          <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#ffffff] to-transparent"></div>

          <div className="relative z-10 flex min-h-[680px] items-center px-4 pt-24 sm:px-6 lg:px-20">
            <div className="mx-auto w-full max-w-7xl">
              <div className="max-w-3xl">
                <p className="mb-5 text-xs font-semibold uppercase tracking-[0.36em] text-[#27346b]">
                  Projects Center C2P
                </p>
                <h1 className="mb-6 text-4xl font-semibold leading-[0.98] text-[#06053a] sm:text-5xl lg:text-7xl">
                  Structurez vos projets avec experts associés et partenaires financiers
                </h1>
                <p className="max-w-2xl text-base leading-8 text-[#27346b] sm:text-lg">
                  Projects Center accompagne le co-portage des projets, le mentorat technique et la mobilisation de partenaires financiers jusqu’à l’autonomisation.
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
                    aria-label="Rechercher un projet ou un porteur"
                    placeholder="Rechercher un projet ou un porteur..."
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
                    <div className="mb-1 text-3xl font-semibold text-[#06053a]">{projects.length}+</div>
                    <div className="text-xs uppercase tracking-[0.22em] text-[#5fa6f3]">Projets incubés</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-white/78 p-5">
                    <div className="mb-1 text-3xl font-semibold text-[#06053a]">85%</div>
                    <div className="text-xs uppercase tracking-[0.22em] text-[#5fa6f3]">Taux de réussite</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-white/78 p-5">
                    <div className="mb-1 text-3xl font-semibold text-[#06053a]">{(totalFunding / 1000000).toFixed(1)}M+</div>
                    <div className="text-xs uppercase tracking-[0.22em] text-[#5fa6f3]">FCFA investis</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="border-y border-[#80bfdf] bg-[#ffffff] px-4 py-6 sm:px-6 lg:px-20">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 overflow-x-auto pb-2" role="group" aria-label="Filtrer les projets par categorie">
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

        {/* Filters & Sort */}
        <section className="border-b border-[#80bfdf] bg-[#ffffff] px-4 py-4 sm:px-6 lg:px-20">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-[#27346b]">
                <strong className="text-[#06053a]">{filteredProjets.length}</strong> projet{filteredProjets.length !== 1 ? 's' : ''}
              </span>
              {(selectedCategory !== 'all' || statusFilter !== 'all' || searchQuery) && (
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
                aria-label="Filtrer les projets par statut"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="cursor-pointer rounded-xl border border-[#80bfdf] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#27346b]"
              >
                <option value="all">Tous les statuts</option>
                <option value="pre-incubation">Pré-incubation</option>
                <option value="incubation">En incubation</option>
                <option value="acceleration">Accélération</option>
              </select>
              <select
                aria-label="Trier les projets"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="cursor-pointer rounded-xl border border-[#80bfdf] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#27346b]"
              >
                <option value="recent">Plus récents</option>
                <option value="funding">Financement reçu</option>
                <option value="progress">Progression</option>
              </select>
            </div>
          </div>
        </section>

        {/* Projects Grid */}
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
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProjets.length === 0 ? (
              <div className="rounded-[24px] border border-[#80bfdf] bg-white p-12 text-center shadow-[0_18px_45px_rgba(12,14,58,0.05)]">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#ffffff]">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <i className="ri-lightbulb-line text-[#27346b] text-2xl"></i>
                  </div>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-[#06053a]">Aucun projet trouvé</h3>
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
                {filteredProjets.map((projet) => {
                  const progressPct = projet.funding_goal > 0 ? Math.round((projet.funding / projet.funding_goal) * 100) : 0;
                  return (
                    <Link
                      key={projet.id}
                      to={`/project-center/projet/${projet.id}`}
                      className="group cursor-pointer overflow-hidden rounded-[24px] border border-[#80bfdf] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#27346b]/45 hover:shadow-[0_24px_60px_rgba(12,14,58,0.10)]"
                    >
                      <div className="relative h-40 w-full overflow-hidden sm:h-48">
                        <img
                          src={getProjectImage(projet)}
                          alt={projet.title}
                          className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent"></div>
                        <div className="absolute right-3 top-3 rounded-full bg-[#27346b] px-2.5 py-1 text-[11px] font-semibold text-white sm:right-4 sm:top-4 sm:px-3 sm:text-xs">
                          {projet.status}
                        </div>
                      </div>

                      <div className="p-4 sm:p-5">
                        <h3 className="mb-2 text-base font-semibold text-[#06053a] sm:text-lg">
                          {projet.title}
                        </h3>

                        <p className="mb-3 line-clamp-2 text-sm text-[#27346b] sm:mb-4">
                          {projet.description}
                        </p>

                        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-[#27346b] sm:mb-4">
                          <div className="w-4 h-4 flex items-center justify-center">
                            <i className="ri-user-line"></i>
                          </div>
                          <span>{projet.porteur_name}</span>
                          <span className="mx-2">•</span>
                          <div className="w-4 h-4 flex items-center justify-center">
                            <i className="ri-team-line"></i>
                          </div>
                          <span>{projet.team_size} membres</span>
                        </div>

                        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-[#5fa6f3] sm:mb-4">
                          <div className="w-4 h-4 flex items-center justify-center">
                            <i className="ri-graduation-cap-line"></i>
                          </div>
                          <span>{projet.mentors} mentor{projet.mentors > 1 ? 's' : ''}</span>
                          <span className="mx-2">•</span>
                          <span>Phase : {projet.phase}</span>
                        </div>

                        {/* Funding Progress */}
                        <div className="mb-3 sm:mb-4">
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="text-[#27346b]">Financement</span>
                            <span className="font-semibold text-[#27346b]">
                              {progressPct}%
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-[#ffffff]">
                            <div
                              className={`h-full rounded-full ${getProgressColor(projet.funding, projet.funding_goal)}`}
                              style={{ width: `${Math.min(progressPct, 100)}%` }}
                            ></div>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-[#94a3b8] sm:text-xs">
                            <span>{(projet.funding / 1000000).toFixed(1)}M FCFA</span>
                            <span className="text-right">Objectif: {(projet.funding_goal / 1000000).toFixed(1)}M FCFA</span>
                          </div>
                        </div>

                        {/* Looking For */}
                        <div className="flex flex-wrap gap-2 border-t border-[#eee4d3] pt-3 sm:pt-4">
                          {projet.looking_for.slice(0, 3).map((item, index) => (
                            <span
                              key={index}
                              className="rounded-full border border-[#80bfdf] bg-[#ffffff] px-2.5 py-1 text-[11px] text-[#27346b] sm:px-3 sm:text-xs"
                            >
                              {item}
                            </span>
                          ))}
                          {projet.looking_for.length > 3 ? (
                            <span className="rounded-full border border-[#80bfdf] bg-[#ffffff] px-2.5 py-1 text-[11px] text-[#5fa6f3] sm:px-3 sm:text-xs">
                              +{projet.looking_for.length - 3}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>

    </div>
  );
}
