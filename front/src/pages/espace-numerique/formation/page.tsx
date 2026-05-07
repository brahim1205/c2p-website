import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
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

const instructorData: Record<string, { name: string; image: string; bio: string; rating: number; students: number }> = {
  informatique: {
    name: 'Dr. Amadou Diallo',
    image: 'https://readdy.ai/api/search-image?query=professional%20african%20male%20software%20developer%20instructor%20portrait%20clean%20white%20background%20confident%20smile%20modern%20tech%20professional%20attire&width=100&height=100&seq=inst1&orientation=squarish',
    bio: 'Développeur senior avec 12 ans d\'expérience. Formateur certifié et consultant en technologies web.',
    rating: 4.9,
    students: 342,
  },
  communication: {
    name: 'Fatou Ndiaye',
    image: 'https://readdy.ai/api/search-image?query=professional%20african%20female%20marketing%20expert%20instructor%20portrait%20clean%20white%20background%20confident%20smile%20business%20attire&width=100&height=100&seq=inst2&orientation=squarish',
    bio: 'Experte en marketing digital avec 8 ans d\'expérience. Spécialiste des réseaux sociaux et stratégies de contenu.',
    rating: 4.8,
    students: 567,
  },
  entrepreneuriat: {
    name: 'Moussa Koné',
    image: 'https://readdy.ai/api/search-image?query=professional%20african%20male%20business%20coach%20instructor%20portrait%20clean%20white%20background%20confident%20smile%20business%20attire&width=100&height=100&seq=inst3&orientation=squarish',
    bio: 'Entrepreneur en série et consultant en business development. A accompagné plus de 200 startups.',
    rating: 4.7,
    students: 189,
  },
  commerce: {
    name: 'Aminata Diop',
    image: 'https://readdy.ai/api/search-image?query=professional%20african%20female%20commerce%20instructor%20portrait%20clean%20white%20background%20warm%20smile%20elegant%20business%20attire&width=100&height=100&seq=inst4&orientation=squarish',
    bio: 'Experte en e-commerce et stratégie digitale. Ancienne directrice commerciale d\'une grande marketplace.',
    rating: 4.6,
    students: 234,
  },
  langues: {
    name: 'Dr. Sarah Mboup',
    image: 'https://readdy.ai/api/search-image?query=professional%20african%20female%20language%20instructor%20portrait%20clean%20white%20background%20warm%20smile%20academic%20attire&width=100&height=100&seq=inst5&orientation=squarish',
    bio: 'Professeure de langues et linguiste. Spécialisée en anglais des affaires et formation professionnelle.',
    rating: 4.8,
    students: 412,
  },
  gestion: {
    name: 'Ibrahim Sarr',
    image: 'https://readdy.ai/api/search-image?query=professional%20african%20male%20project%20manager%20instructor%20portrait%20clean%20white%20background%20confident%20smile%20formal%20attire&width=100&height=100&seq=inst6&orientation=squarish',
    bio: 'PMP certifié et consultant en gestion de projet Agile. Plus de 10 ans d\'expérience internationale.',
    rating: 4.9,
    students: 156,
  },
};

const defaultCurriculum = [
  {
    module: 'Module 1: Fondamentaux',
    lessons: [
      { title: 'Introduction au cours', duration: '45 min', type: 'video' },
      { title: 'Concepts fondamentaux', duration: '1h 20min', type: 'video' },
      { title: 'Pratique guidée', duration: '1h 30min', type: 'video' },
      { title: 'Quiz de validation', duration: '20 min', type: 'quiz' },
    ],
  },
  {
    module: 'Module 2: Approfondissement',
    lessons: [
      { title: 'Études de cas', duration: '50 min', type: 'video' },
      { title: 'Techniques avancées', duration: '1h 10min', type: 'video' },
      { title: 'Projet pratique', duration: '2h', type: 'exercise' },
    ],
  },
  {
    module: 'Module 3: Expertise',
    lessons: [
      { title: 'Applications professionnelles', duration: '55 min', type: 'video' },
      { title: 'Bonnes pratiques', duration: '1h 20min', type: 'video' },
      { title: 'Examen final', duration: '1h', type: 'quiz' },
    ],
  },
];

const reviewsData = [
  {
    id: 1, name: 'Khadija Mbaye',
    avatar: 'https://readdy.ai/api/search-image?query=professional%20african%20female%20student%20portrait%20clean%20white%20background%20happy%20smile%20casual%20attire&width=80&height=80&seq=rev1&orientation=squarish',
    rating: 5,
    date: '15 janvier 2026',
    comment: 'Excellente formation ! Les explications sont claires et les projets pratiques très enrichissants.',
  },
  {
    id: 2, name: 'Mamadou Seck',
    avatar: 'https://readdy.ai/api/search-image?query=professional%20african%20male%20student%20portrait%20clean%20white%20background%20confident%20smile%20casual%20attire&width=80&height=80&seq=rev2&orientation=squarish',
    rating: 5,
    date: '8 janvier 2026',
    comment: 'Formateur excellent. Le contenu est à jour et correspond parfaitement aux besoins du marché.',
  },
  {
    id: 3, name: 'Aminata Diop',
    avatar: 'https://readdy.ai/api/search-image?query=professional%20african%20female%20student%20portrait%20clean%20white%20background%20warm%20smile%20casual%20attire&width=80&height=80&seq=rev3&orientation=squarish',
    rating: 4,
    date: '2 janvier 2026',
    comment: 'Très bonne formation avec beaucoup de pratique. Je recommande vivement !',
  },
];

export default function FormationDetailPage() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum' | 'reviews'>('overview');
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data, error: err } = await backendClient
          .from('courses')
          .select('*')
          .eq('id', parseInt(id))
          .eq('status', 'published')
          .maybeSingle();
        if (err) throw err;
        setCourse(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [id]);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;
    setEnrolling(true);
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
      setShowEnrollModal(false);

      // Notification
      await backendClient.from('notifications').insert({
        user_id: course.instructor_id ?? 'usr-formateur',
        title: 'Nouvelle inscription',
        message: `Un apprenant s'est inscrit à "${course.title}"`,
        type: 'formation',
        is_read: false,
        link: '/dashboard/formateur/apprenants',
      });

      // Redirect to apprenant dashboard
      navigate('/dashboard/apprenant/mes-cours');
    } catch (err) {
      toastError('Erreur', 'Impossible de s\'inscrire à cette formation.');
      console.error(err);
    } finally {
      setEnrolling(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return 'ri-play-circle-line';
      case 'quiz': return 'ri-question-line';
      case 'exercise': return 'ri-code-s-slash-line';
      case 'pdf': return 'ri-file-pdf-line';
      default: return 'ri-file-line';
    }
  };

  const getCourseImage = (c: Course) => {
    if (c.thumbnail) return c.thumbnail;
    const catImages: Record<string, string> = {
      informatique: 'https://readdy.ai/api/search-image?query=modern%20web%20development%20coding%20on%20computer%20screen%20showing%20html%20css%20javascript%20code%20in%20professional%20development%20environment%20with%20clean%20minimal%20background&width=800&height=400&seq=form1det&orientation=landscape',
      langues: 'https://readdy.ai/api/search-image?query=business%20english%20language%20learning%20classroom%20with%20professional%20teacher%20and%20students%20practicing%20conversation%20in%20modern%20educational%20setting%20with%20simple%20background&width=800&height=400&seq=form2det&orientation=landscape',
      entrepreneuriat: 'https://readdy.ai/api/search-image?query=entrepreneurship%20business%20planning%20workshop%20with%20startup%20founders%20working%20on%20business%20model%20canvas%20and%20strategy%20in%20modern%20collaborative%20space%20with%20simple%20background&width=800&height=400&seq=form3det&orientation=landscape',
      commerce: 'https://readdy.ai/api/search-image?query=ecommerce%20online%20store%20dashboard%20showing%20product%20listings%20sales%20analytics%20and%20customer%20orders%20on%20computer%20screen%20in%20professional%20workspace%20with%20simple%20background&width=800&height=400&seq=form4det&orientation=landscape',
      communication: 'https://readdy.ai/api/search-image?query=digital%20marketing%20social%20media%20analytics%20dashboard%20on%20computer%20screen%20showing%20engagement%20metrics%20and%20campaign%20performance%20in%20professional%20workspace%20with%20simple%20background&width=800&height=400&seq=form5det&orientation=landscape',
      gestion: 'https://readdy.ai/api/search-image?query=agile%20project%20management%20scrum%20board%20with%20sticky%20notes%20and%20team%20collaboration%20in%20modern%20office%20environment%20showing%20sprint%20planning%20with%20simple%20background&width=800&height=400&seq=form6det&orientation=landscape',
    };
    return catImages[c.category.toLowerCase()] || catImages['informatique'];
  };

  const getInstructor = (c: Course) => {
    const cat = c.category.toLowerCase();
    return instructorData[cat] || instructorData['informatique'];
  };

  const getCurriculum = (c: Course) => {
    // Generate curriculum based on module count
    const totalModules = c.modules || 3;
    const base = [...defaultCurriculum];
    if (totalModules <= 3) return base.slice(0, totalModules);
    return base;
  };

  if (loading) {
    return (
      <PublicLayout hideFooter>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="animate-pulse text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!course) {
    return (
      <PublicLayout hideFooter>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Formation non trouvée</h2>
            <Link to="/espace-numerique" className="text-teal-600 hover:text-teal-700">
              Retour aux formations
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const instructor = getInstructor(course);
  const curriculum = getCurriculum(course);
  const rating = instructor.rating;
  const totalLessons = curriculum.reduce((acc, mod) => acc + mod.lessons.length, 0);

  const objectives = [
    'Maîtriser les fondamentaux théoriques et pratiques',
    'Appliquer les meilleures pratiques du secteur',
    'Développer un projet concret de A à Z',
    'Obtenir une certification reconnue',
  ];

  const requirements = [
    'Ordinateur avec connexion internet',
    'Motivation et engagement pour le programme',
    'Aucun prérequis technique spécifique',
  ];

  return (
    <PublicLayout hideFooter>
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 text-white">
          <div className="absolute inset-0 opacity-20">
            <img src={getCourseImage(course)} alt="" className="w-full h-full object-cover object-top" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/40"></div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <Link to="/espace-numerique" className="inline-flex items-center space-x-2 text-sm text-gray-300 hover:text-white mb-6">
              <i className="ri-arrow-left-line"></i>
              <span>Retour aux formations</span>
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="flex items-center space-x-3 mb-4">
                  <span className="px-3 py-1 bg-teal-500 text-white text-sm font-medium rounded-full">
                    {course.category}
                  </span>
                </div>

                <h1 className="text-3xl md:text-4xl font-bold mb-4">{course.title}</h1>
                <p className="text-lg text-gray-200 mb-6">
                  {course.description || 'Formation professionnelle de qualité pour développer vos compétences.'}
                </p>

                <div className="flex flex-wrap items-center gap-6 mb-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <i className="ri-star-fill text-base text-yellow-400"></i>
                    </div>
                    <span className="text-base font-medium">{rating}</span>
                    <span className="text-sm text-gray-300">({reviewsData.length} avis)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <i className="ri-user-line text-base text-gray-300"></i>
                    </div>
                    <span className="text-sm text-gray-300">{course.students_count || 0} apprenants</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <i className="ri-time-line text-base text-gray-300"></i>
                    </div>
                    <span className="text-sm text-gray-300">{course.duration || 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <i className="ri-book-line text-base text-gray-300"></i>
                    </div>
                    <span className="text-sm text-gray-300">{course.modules || 3} modules</span>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <img src={instructor.image} alt={instructor.name} className="w-12 h-12 rounded-full object-cover object-top" />
                  <div>
                    <div className="text-sm text-gray-300">Formateur</div>
                    <div className="text-base font-medium">{instructor.name}</div>
                  </div>
                </div>
              </div>

              {/* Enrollment Card */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-xl p-6 text-gray-900 sticky top-24">
                  <div className="aspect-video rounded-lg overflow-hidden mb-4">
                    <img src={getCourseImage(course)} alt={course.title} className="w-full h-full object-cover object-top" />
                  </div>

                  <div className="text-3xl font-bold text-teal-600 mb-4">
                    {course.price ? `${course.price.toLocaleString()} FCFA` : 'Gratuit'}
                  </div>

                  <button
                    onClick={() => setShowEnrollModal(true)}
                    className="w-full px-6 py-3 bg-teal-600 text-white text-base font-medium rounded-lg hover:bg-teal-700 transition-colors mb-3 whitespace-nowrap"
                  >
                    S'inscrire maintenant
                  </button>

                  <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Durée</span>
                      <span className="font-medium">{course.duration || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Modules</span>
                      <span className="font-medium">{course.modules || 3}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Certificat</span>
                      <span className="font-medium">Oui</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Accès</span>
                      <span className="font-medium">À vie</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-white sticky top-16 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              <button onClick={() => setActiveTab('overview')} className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
                Vue d'ensemble
              </button>
              <button onClick={() => setActiveTab('curriculum')} className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'curriculum' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
                Programme ({totalLessons} leçons)
              </button>
              <button onClick={() => setActiveTab('reviews')} className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'reviews' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
                Avis ({reviewsData.length})
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Description</h2>
                    <p className="text-base text-gray-700 leading-relaxed">
                      {course.description || 'Cette formation vous donnera les compétences essentielles pour exceller dans votre domaine. Avec un programme structuré et des projets pratiques, vous acquerrez une expertise reconnue sur le marché du travail.'}
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Ce que vous allez apprendre</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {objectives.map((obj, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <i className="ri-check-line text-base text-teal-600"></i>
                          </div>
                          <span className="text-sm text-gray-700">{obj}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Prérequis</h2>
                    <ul className="space-y-2">
                      {requirements.map((req, index) => (
                        <li key={index} className="flex items-start space-x-3">
                          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <i className="ri-checkbox-circle-line text-base text-gray-400"></i>
                          </div>
                          <span className="text-sm text-gray-700">{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'curriculum' && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Programme de la formation</h2>
                  {curriculum.map((module, moduleIndex) => (
                    <div key={moduleIndex} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900">{module.module}</h3>
                        <p className="text-sm text-gray-600 mt-1">{module.lessons.length} leçons</p>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {module.lessons.map((lesson, lessonIndex) => (
                          <div key={lessonIndex} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 flex items-center justify-center bg-teal-50 rounded-lg">
                                <i className={`${getTypeIcon(lesson.type)} text-base text-teal-600`}></i>
                              </div>
                              <span className="text-sm font-medium text-gray-900">{lesson.title}</span>
                            </div>
                            <span className="text-sm text-gray-500">{lesson.duration}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Avis des apprenants</h2>
                  <div className="bg-gray-50 rounded-xl p-6 mb-8">
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="text-5xl font-bold text-gray-900 mb-2">{rating}</div>
                        <div className="flex items-center justify-center space-x-1 mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <div key={star} className="w-5 h-5 flex items-center justify-center">
                              <i className={`ri-star-fill text-base ${star <= Math.floor(rating) ? 'text-yellow-500' : 'text-gray-300'}`}></i>
                            </div>
                          ))}
                        </div>
                        <div className="text-sm text-gray-600">{reviewsData.length} avis</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    {reviewsData.map((review) => (
                      <div key={review.id} className="bg-white border border-gray-200 rounded-xl p-6">
                        <div className="flex items-start space-x-4">
                          <img src={review.avatar} alt={review.name} className="w-12 h-12 rounded-full object-cover object-top" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-base font-bold text-gray-900">{review.name}</h4>
                              <span className="text-sm text-gray-500">{review.date}</span>
                            </div>
                            <div className="flex items-center space-x-1 mb-3">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <div key={star} className="w-4 h-4 flex items-center justify-center">
                                  <i className={`ri-star-fill text-sm ${star <= review.rating ? 'text-yellow-500' : 'text-gray-300'}`}></i>
                                </div>
                              ))}
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Instructor Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-gray-200 rounded-xl p-6 sticky top-24">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Votre formateur</h3>
                <div className="flex items-center space-x-4 mb-4">
                  <img src={instructor.image} alt={instructor.name} className="w-16 h-16 rounded-full object-cover object-top" />
                  <div>
                    <h4 className="text-base font-bold text-gray-900">{instructor.name}</h4>
                    <div className="flex items-center space-x-1 mt-1">
                      <div className="w-4 h-4 flex items-center justify-center">
                        <i className="ri-star-fill text-sm text-yellow-500"></i>
                      </div>
                      <span className="text-sm text-gray-600">{rating} • {instructor.students} apprenants</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{instructor.bio}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Enrollment Modal */}
        {showEnrollModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Inscription à la formation</h3>
                <button onClick={() => setShowEnrollModal(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>

              <div className="mb-6">
                <h4 className="text-base font-bold text-gray-900 mb-2">{course.title}</h4>
                <div className="text-2xl font-bold text-teal-600 mb-4">
                  {course.price ? `${course.price.toLocaleString()} FCFA` : 'Gratuit'}
                </div>
              </div>

              <form onSubmit={handleEnroll} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom complet</label>
                  <input type="text" required defaultValue="Utilisateur C2P" className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" placeholder="Votre nom complet" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input type="email" required defaultValue="user@example.com" className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" placeholder="votre@email.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                  <input type="tel" defaultValue="+221 77 XXX XX XX" className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" placeholder="+221 XX XXX XX XX" />
                </div>
                <button type="submit" disabled={enrolling} className="w-full px-6 py-3 bg-teal-600 text-white text-base font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap disabled:opacity-50">
                  {enrolling ? (
                    <span className="flex items-center justify-center gap-2">
                      <i className="ri-loader-4-line animate-spin"></i>
                      Inscription en cours...
                    </span>
                  ) : (
                    'Confirmer l\'inscription'
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
