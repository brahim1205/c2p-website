import { useState } from 'react';
import { Link } from 'react-router-dom';

interface Course {
  id: string;
  title: string;
  instructor: string;
  image: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  lastAccessed: string;
  nextLesson: string;
}

const enrolledCourses: Course[] = [
  {
    id: '1',
    title: 'Développement Web Full Stack',
    instructor: 'Dr. Amadou Diallo',
    image: 'https://readdy.ai/api/search-image?query=modern%20web%20development%20coding%20workspace%20laptop%20screen%20showing%20colorful%20code%20clean%20minimal%20desk%20setup%20professional%20lighting%20technology%20education&width=300&height=200&seq=mycourse1&orientation=landscape',
    progress: 65,
    totalLessons: 48,
    completedLessons: 31,
    lastAccessed: 'Il y a 2 heures',
    nextLesson: 'React Router - Navigation avancée'
  },
  {
    id: '3',
    title: 'Entrepreneuriat et Business Model',
    instructor: 'Moussa Traoré',
    image: 'https://readdy.ai/api/search-image?query=business%20planning%20workspace%20notebook%20with%20business%20model%20canvas%20laptop%20coffee%20clean%20desk%20entrepreneurship%20concept%20professional%20lighting&width=300&height=200&seq=mycourse2&orientation=landscape',
    progress: 40,
    totalLessons: 32,
    completedLessons: 13,
    lastAccessed: 'Il y a 1 jour',
    nextLesson: 'Analyse de marché et concurrence'
  },
  {
    id: '5',
    title: 'Gestion de Projet Agile',
    instructor: 'Ibrahim Koné',
    image: 'https://readdy.ai/api/search-image?query=agile%20project%20management%20workspace%20kanban%20board%20sticky%20notes%20laptop%20team%20collaboration%20tools%20clean%20modern%20office&width=300&height=200&seq=mycourse3&orientation=landscape',
    progress: 85,
    totalLessons: 24,
    completedLessons: 20,
    lastAccessed: 'Il y a 3 jours',
    nextLesson: 'Rétrospective et amélioration continue'
  }
];

interface Certificate {
  id: string;
  title: string;
  completedDate: string;
  instructor: string;
  certificateNumber: string;
}

const certificates: Certificate[] = [
  {
    id: '1',
    title: 'Marketing Digital et Réseaux Sociaux',
    completedDate: '15 janvier 2024',
    instructor: 'Fatou Ndiaye',
    certificateNumber: 'C2P-2024-001234'
  },
  {
    id: '2',
    title: 'Communication Interpersonnelle',
    completedDate: '8 décembre 2023',
    instructor: 'Marie Kamara',
    certificateNumber: 'C2P-2023-009876'
  }
];

export default function MonApprentissagePage() {
  const [activeTab, setActiveTab] = useState<'courses' | 'certificates'>('courses');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mon apprentissage</h1>
          <p className="text-base text-gray-600">Suivez votre progression et accédez à vos formations</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('courses')}
              className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'courses'
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Mes formations ({enrolledCourses.length})
            </button>
            <button
              onClick={() => setActiveTab('certificates')}
              className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'certificates'
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Certificats ({certificates.length})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'courses' && (
          <div className="space-y-6">
            {enrolledCourses.map((course) => (
              <div key={course.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-64 h-48 md:h-auto flex-shrink-0">
                    <img
                      src={course.image}
                      alt={course.title}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{course.title}</h3>
                        <p className="text-sm text-gray-600">Par {course.instructor}</p>
                      </div>
                      <span className="text-xs text-gray-500">{course.lastAccessed}</span>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {course.completedLessons} sur {course.totalLessons} leçons terminées
                        </span>
                        <span className="text-sm font-bold text-teal-600">{course.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${course.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <div className="w-5 h-5 flex items-center justify-center">
                          <i className="ri-play-circle-line text-base"></i>
                        </div>
                        <span>Prochaine leçon: {course.nextLesson}</span>
                      </div>
                      <Link
                        to={`/espace-numerique/classe-virtuelle/${course.id}`}
                        className="px-6 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap"
                      >
                        Continuer
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {enrolledCourses.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-full mx-auto mb-4">
                  <i className="ri-book-open-line text-2xl text-gray-400"></i>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Aucune formation en cours</h3>
                <p className="text-sm text-gray-600 mb-6">Explorez notre catalogue et commencez votre apprentissage</p>
                <Link
                  to="/espace-numerique"
                  className="inline-block px-6 py-3 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap"
                >
                  Parcourir les formations
                </Link>
              </div>
            )}
          </div>
        )}

        {activeTab === 'certificates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {certificates.map((cert) => (
              <div key={cert.id} className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-teal-500 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 flex items-center justify-center bg-teal-50 rounded-lg">
                    <i className="ri-award-line text-2xl text-teal-600"></i>
                  </div>
                  <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                    Terminé
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2">{cert.title}</h3>
                <p className="text-sm text-gray-600 mb-4">Par {cert.instructor}</p>

                <div className="border-t border-gray-200 pt-4 mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Date d'obtention</span>
                    <span className="font-medium text-gray-900">{cert.completedDate}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">N° de certificat</span>
                    <span className="font-medium text-gray-900">{cert.certificateNumber}</span>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button className="flex-1 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap">
                    Télécharger
                  </button>
                  <button className="flex-1 px-4 py-2 text-teal-600 border border-teal-600 text-sm font-medium rounded-lg hover:bg-teal-50 transition-colors whitespace-nowrap">
                    Partager
                  </button>
                </div>
              </div>
            ))}

            {certificates.length === 0 && (
              <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-full mx-auto mb-4">
                  <i className="ri-award-line text-2xl text-gray-400"></i>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Aucun certificat obtenu</h3>
                <p className="text-sm text-gray-600">Terminez vos formations pour obtenir des certificats</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}