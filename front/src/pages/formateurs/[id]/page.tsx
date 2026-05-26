import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Breadcrumb from '@/components/base/Breadcrumb';
import { fetchPublicInstructorCourses, fetchPublicInstructorProfile, type PublicInstructorCourse } from '@/lib/accountApi';
import type { AuthUser } from '@/lib/roles';

export default function PublicInstructorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [courses, setCourses] = useState<PublicInstructorCourse[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    void (async () => {
      try {
        const [publicProfile, coursesRes] = await Promise.all([
          fetchPublicInstructorProfile(id),
          fetchPublicInstructorCourses(id),
        ]);
        setProfile(publicProfile);
        setCourses(coursesRes);
      } catch (err) {
        console.error(err);
        setErrorMessage('Profil formateur indisponible.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="bg-[#f8f9fa]">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-gray-500">Chargement du profil formateur...</div>
        </div>
      </div>
    );
  }

  if (!profile || errorMessage) {
    return (
      <div className="bg-[#f8f9fa]">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-red-700">{errorMessage || 'Profil indisponible.'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8f9fa]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Breadcrumb items={[{ label: 'Accueil', path: '/' }, { label: 'Formateurs' }, { label: `${profile.firstName} ${profile.lastName}` }]} />

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-8">
          <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div>
              {profile.avatar ? (
                <img src={profile.avatar} alt={`${profile.firstName} ${profile.lastName}`} className="h-56 w-full rounded-2xl object-cover" />
              ) : (
                <div className="flex h-56 w-full items-center justify-center rounded-2xl bg-teal-50 text-5xl font-bold text-teal-600">
                  {profile.firstName[0]}{profile.lastName[0]}
                </div>
              )}
            </div>
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">{profile.firstName} {profile.lastName}</h1>
                {profile.expertVerified ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">Expert vérifié</span>
                ) : null}
              </div>
              <p className="text-lg text-gray-600">{profile.publicTitle || 'Formateur C2P'}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
                {profile.location ? <span><i className="ri-map-pin-line mr-1"></i>{profile.location}</span> : null}
                {profile.preferredLanguage ? <span><i className="ri-translate-2 mr-1"></i>{profile.preferredLanguage}</span> : null}
                {profile.website ? (
                  <a href={profile.website} target="_blank" rel="noreferrer" className="text-teal-700 hover:text-teal-800">
                    <i className="ri-links-line mr-1"></i>Site web
                  </a>
                ) : null}
              </div>
              <p className="mt-6 whitespace-pre-line text-gray-700">{profile.bio || 'Profil formateur à compléter.'}</p>

              {profile.skills?.length ? (
                <div className="mt-6">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Compétences</h2>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <span key={skill} className="rounded-full bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700">{skill}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              {profile.languages?.length ? (
                <div className="mt-6">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Langues</h2>
                  <div className="flex flex-wrap gap-2">
                    {profile.languages.map((language) => (
                      <span key={language} className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">{language}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {profile.introVideo ? (
          <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Vidéo de présentation</h2>
            <video src={profile.introVideo} controls className="h-[420px] w-full rounded-2xl bg-black object-cover" />
          </section>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Certifications</h2>
            <div className="space-y-3">
              {profile.certifications?.length ? profile.certifications.map((item) => (
                <div key={item.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.title}</h3>
                      <p className="text-sm text-gray-600">{item.issuer} • {item.year}</p>
                    </div>
                    {item.credentialUrl ? (
                      <a href={item.credentialUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-teal-700 hover:text-teal-800">
                        Voir
                      </a>
                    ) : null}
                  </div>
                </div>
              )) : <p className="text-sm text-gray-500">Aucune certification publique.</p>}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Portfolio</h2>
            <div className="space-y-4">
              {profile.portfolioItems?.length ? profile.portfolioItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-gray-200 p-4">
                  {item.image ? <img src={item.image} alt={item.title} className="mb-3 h-40 w-full rounded-xl object-cover" /> : null}
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-gray-600">{item.summary}</p>
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-medium text-teal-700 hover:text-teal-800">
                      Voir le projet
                    </a>
                  ) : null}
                </div>
              )) : <p className="text-sm text-gray-500">Aucune réalisation publique.</p>}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Formations publiées</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {courses.length ? courses.map((course) => (
              <div key={course.id} className="overflow-hidden rounded-xl border border-gray-200">
                {course.thumbnail ? (
                  <img src={course.thumbnail} alt={course.title} className="h-40 w-full object-cover" />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-teal-50 text-teal-600">
                    <i className="ri-book-open-line text-4xl"></i>
                  </div>
                )}
                <div className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">{course.category}</span>
                    <span className="text-xs text-gray-500">{course.level || 'Intermédiaire'}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{course.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-gray-600">{course.description || 'Formation publiée sur C2P.'}</p>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-gray-500">{course.duration || 'Durée à préciser'}</span>
                    <span className="font-semibold text-gray-900">
                      {course.is_free ? 'Gratuit' : `${Number(course.current_price || 0).toLocaleString('fr-FR')} FCFA`}
                    </span>
                  </div>
                </div>
              </div>
            )) : <p className="text-sm text-gray-500">Aucune formation publique pour le moment.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
