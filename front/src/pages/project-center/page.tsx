import { Link } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { backendClient } from '@/lib/backendClient';
import PublicLayout from '@/components/feature/PublicLayout';


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
    if (pct >= 75) return 'bg-[#d5b46f]';
    if (pct >= 50) return 'bg-[#f1d58c]';
    if (pct >= 25) return 'bg-[#a88747]';
    return 'bg-white/35';
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
    <PublicLayout>
      <div className="min-h-screen bg-[#0b0b0b] text-white">
        {/* Hero Section */}
        <section className="relative min-h-[680px] w-full overflow-hidden bg-[#090909]">
          {/* Background image */}
          <div className="absolute inset-0">
            <img
              src="/images/home/venture.jpg"
              alt="ProjectCenter"
              className="h-full w-full object-cover object-center opacity-45"
            />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,7,7,0.94)_0%,rgba(7,7,7,0.76)_46%,rgba(7,7,7,0.34)_100%)]"></div>
          <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#0b0b0b] to-transparent"></div>

          <div className="relative z-10 flex min-h-[680px] items-center px-4 pt-24 sm:px-6 lg:px-20">
            <div className="mx-auto w-full max-w-7xl">
              <div className="max-w-3xl">
                <p className="mb-5 text-xs font-semibold uppercase tracking-[0.36em] text-[#d5b46f]">
                  ProjectCenter C2P
                </p>
                <h1 className="mb-6 text-4xl font-semibold leading-[0.98] text-white sm:text-5xl lg:text-7xl">
                  Transformez vos projets en ventures finançables
                </h1>
                <p className="max-w-2xl text-base leading-8 text-white/68 sm:text-lg">
                  Structurez votre idee, gagnez en credibilite, mobilisez les bons mentors et rapprochez votre projet des opportunites de financement.
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
                    placeholder="Rechercher un projet ou un porteur..."
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
                    <div className="mb-1 text-3xl font-semibold text-white">{projects.length}+</div>
                    <div className="text-xs uppercase tracking-[0.22em] text-white/55">Projets incubes</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-black/25 p-5">
                    <div className="mb-1 text-3xl font-semibold text-white">85%</div>
                    <div className="text-xs uppercase tracking-[0.22em] text-white/55">Taux de reussite</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-black/25 p-5">
                    <div className="mb-1 text-3xl font-semibold text-white">{(totalFunding / 1000000).toFixed(1)}M+</div>
                    <div className="text-xs uppercase tracking-[0.22em] text-white/55">FCFA investis</div>
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
                <strong className="text-white">{filteredProjets.length}</strong> projet{filteredProjets.length !== 1 ? 's' : ''}
              </span>
              {(selectedCategory !== 'all' || statusFilter !== 'all' || searchQuery) && (
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
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-[#d5b46f]"
              >
                <option value="all">Tous les statuts</option>
                <option value="incubation">En incubation</option>
                <option value="croissance">En croissance</option>
                <option value="financement">Recherche financement</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-[#d5b46f]"
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
                  <div key={i} className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.05] animate-pulse">
                    <div className="h-48 bg-white/10"></div>
                    <div className="p-5 space-y-3">
                      <div className="h-5 bg-white/10 rounded w-3/4"></div>
                      <div className="h-4 bg-white/10 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProjets.length === 0 ? (
              <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.06]">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <i className="ri-lightbulb-line text-[#d5b46f] text-2xl"></i>
                  </div>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">Aucun projet trouve</h3>
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
                {filteredProjets.map((projet) => {
                  const progressPct = projet.funding_goal > 0 ? Math.round((projet.funding / projet.funding_goal) * 100) : 0;
                  return (
                    <Link
                      key={projet.id}
                      to={`/project-center/projet/${projet.id}`}
                      className="group cursor-pointer overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.05] transition-all duration-300 hover:-translate-y-1 hover:border-[#d5b46f]/45 hover:shadow-[0_30px_70px_rgba(0,0,0,0.35)]"
                    >
                      <div className="relative h-48 w-full overflow-hidden">
                        <img
                          src={getProjectImage(projet)}
                          alt={projet.title}
                          className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent"></div>
                        <div className="absolute right-4 top-4 rounded-full bg-[#d5b46f] px-3 py-1 text-xs font-semibold text-[#111]">
                          {projet.status}
                        </div>
                      </div>

                      <div className="p-5">
                        <h3 className="mb-2 text-lg font-semibold text-white">
                          {projet.title}
                        </h3>

                        <p className="mb-4 line-clamp-2 text-sm text-white/58">
                          {projet.description}
                        </p>

                        <div className="mb-4 flex items-center gap-2 text-sm text-white/52">
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

                        <div className="mb-4 flex items-center gap-2 text-xs text-white/45">
                          <div className="w-4 h-4 flex items-center justify-center">
                            <i className="ri-graduation-cap-line"></i>
                          </div>
                          <span>{projet.mentors} mentor{projet.mentors > 1 ? 's' : ''}</span>
                          <span className="mx-2">•</span>
                          <span>Phase: {projet.phase}</span>
                        </div>

                        {/* Funding Progress */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-white/55">Financement</span>
                            <span className="font-semibold text-[#d5b46f]">
                              {progressPct}%
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                              className={`h-full rounded-full ${getProgressColor(projet.funding, projet.funding_goal)}`}
                              style={{ width: `${Math.min(progressPct, 100)}%` }}
                            ></div>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-xs text-white/42">
                            <span>{(projet.funding / 1000000).toFixed(1)}M FCFA</span>
                            <span>Objectif: {(projet.funding_goal / 1000000).toFixed(1)}M FCFA</span>
                          </div>
                        </div>

                        {/* Looking For */}
                        <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
                          {projet.looking_for.map((item, index) => (
                            <span
                              key={index}
                              className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/62"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 py-20 sm:px-6 lg:px-20">
          <div className="mx-auto max-w-5xl rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(213,180,111,0.18),rgba(255,255,255,0.05)_45%,rgba(255,255,255,0.02))] p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.35)] sm:p-12">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.34em] text-[#d5b46f]">
              Incubation & financement
            </p>
            <h2 className="mb-6 text-3xl font-semibold text-white md:text-5xl">
              Vous avez un projet ?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg leading-8 text-white/65">
              Soumettez votre projet et bénéficiez de notre accompagnement complet
            </p>
            <Link
              to="/project-center/soumettre"
              className="inline-flex items-center gap-3 whitespace-nowrap rounded-full bg-[#d5b46f] px-10 py-4 text-lg font-semibold text-[#111] transition-all hover:bg-white"
            >
              <span>Soumettre Mon Projet</span>
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
