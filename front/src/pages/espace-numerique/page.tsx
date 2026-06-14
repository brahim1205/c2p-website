import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { usePageMeta } from '@/lib/usePageMeta';
import { enrollEspaceCourse, fetchEspaceCourses } from '@/lib/espaceNumeriqueApi';
import {
  normalizeCourseDeliveryMode,
} from '@/lib/courseDelivery';
import {
  normalizeCourseBranch,
  type CourseBranch,
} from '@/lib/courseBranch';
import {
  EspaceNumeriqueCategories,
  EspaceNumeriqueCoursesGrid,
  EspaceNumeriqueFilters,
  EspaceNumeriqueHero,
} from './EspaceNumeriqueSections';
import {
  getPublicBranchLabel,
  type Course,
} from './espaceNumeriquePageModel';

export default function EspaceNumeriquePage() {
  usePageMeta({
    title: 'Espace Numérique C2P | Formation professionnelle continue',
    description: 'Apprenez à votre rythme, obtenez des certifications reconnues et développez vos compétences avec C2P.',
    path: '/espace-numerique',
    image: 'https://c2p.sn/images/brand/image3.jpeg',
  });

  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { success, error: toastError } = useToast();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState<'all' | CourseBranch>(() => normalizeCourseBranch(searchParams.get('branche')) ?? 'all');
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'online' | 'onsite' | 'hybrid'>(() => {
    const value = normalizeCourseDeliveryMode(searchParams.get('format'));
    return value ?? 'all';
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        setCourses(await fetchEspaceCourses());
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

    if (branchFilter !== 'all') {
      result = result.filter((f) => normalizeCourseBranch(f.program_branch) === branchFilter);
    }

    if (deliveryFilter !== 'all') {
      result = result.filter((f) => normalizeCourseDeliveryMode(f.delivery_mode) === deliveryFilter);
    }

    result.sort((a, b) => {
      return (b.students_count || 0) - (a.students_count || 0);
    });

    return result;
  }, [courses, selectedCategory, searchQuery, branchFilter, deliveryFilter]);

  const resetFilters = () => {
    setSelectedCategory('all');
    setSearchQuery('');
    setBranchFilter('all');
    setDeliveryFilter('all');
  };

  const activeBranchCopy = branchFilter === 'form_actions'
    ? {
        eyebrow: 'Formation professionnelle continue',
        title: 'Votre plateforme de formation professionnelle continue',
        description: 'Apprenez à votre rythme, obtenez des certifications reconnues et boostez votre employabilité.',
      }
    : branchFilter === 'end'
      ? {
          eyebrow: 'Parcours accompagnés',
          title: 'Cours programmés, classes et suivi apprenant',
          description: "Suivez des parcours encadrés avec classes programmées, suivi de progression et accompagnement pédagogique.",
        }
      : {
          eyebrow: 'Espace Numérique C2P',
          title: 'Formations, classes et parcours souples pour progresser durablement',
          description: "Apprenez en ligne, en présentiel ou en hybride avec des parcours conçus pour développer vos compétences et renforcer votre employabilité.",
        };

  const activeBranchLabel = branchFilter === 'all' ? 'Tous les parcours' : getPublicBranchLabel(branchFilter);

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
    if (!course.is_free && Number(course.current_price ?? course.price ?? 0) > 0) {
      navigate(`/espace-numerique/formation/${course.id}`);
      return;
    }

    try {
      await enrollEspaceCourse(course.id);
      success('Inscription réussie', `Vous êtes maintenant inscrit à "${course.title}".`);
      navigate('/espace-numerique/mon-apprentissage');
    } catch (err) {
      toastError('Erreur', 'Impossible de s\'inscrire à cette formation.');
      console.error(err);
    }
  };

  return (
    <div className="public-premium-page min-h-screen bg-c2p-bg text-c2p-text">
      <EspaceNumeriqueHero branchCopy={activeBranchCopy} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <EspaceNumeriqueCategories selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
      <EspaceNumeriqueFilters
        activeBranchLabel={activeBranchLabel}
        branchFilter={branchFilter}
        deliveryFilter={deliveryFilter}
        formationCount={filteredFormations.length}
        hasActiveFilters={selectedCategory !== 'all' || branchFilter !== 'all' || deliveryFilter !== 'all' || Boolean(searchQuery)}
        selectedCategory={selectedCategory}
        searchQuery={searchQuery}
        onBranchFilterChange={setBranchFilter}
        onDeliveryFilterChange={setDeliveryFilter}
        onResetFilters={resetFilters}
      />
      <EspaceNumeriqueCoursesGrid
        courses={filteredFormations}
        loading={loading}
        onEnroll={handleEnroll}
        onResetFilters={resetFilters}
      />
    </div>
  );
}
