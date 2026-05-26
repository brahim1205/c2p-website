export interface ProfileCertificateEntry {
  courseId: number | string;
  title: string;
  instructor: string;
  issueDate: string | null;
  certificateId: string;
}

interface Props {
  completedCourses: ProfileCertificateEntry[];
  onOpenCertificate: (entry: ProfileCertificateEntry) => void;
}

export default function ProfileCertificatesPanel({ completedCourses, onOpenCertificate }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <i className="ri-award-line text-amber-500"></i>
        Mes certificats
      </h3>
      {completedCourses.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <i className="ri-award-line text-gray-400 text-lg"></i>
          </div>
          <p className="text-sm text-gray-500 mb-1">Aucun certificat pour le moment</p>
          <p className="text-xs text-gray-400">Complétez un cours à 100% pour obtenir votre certificat</p>
        </div>
      ) : (
        <div className="space-y-3">
          {completedCourses.map((entry) => (
            <div key={entry.courseId} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <i className="ri-award-line text-amber-600 text-sm"></i>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{entry.title}</p>
                  <p className="text-xs text-gray-500">Par {entry.instructor}</p>
                </div>
              </div>
              <button
                onClick={() => onOpenCertificate(entry)}
                className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 transition-colors whitespace-nowrap cursor-pointer flex-shrink-0"
              >
                <i className="ri-eye-line mr-1"></i>
                Voir le certificat
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
