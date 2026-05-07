import { Course, Resource } from '../types';
import { useToast } from '@/hooks/useToast';
import { downloadTextFile } from '@/lib/downloads';

interface Props {
  course: Course;
}

export default function ResourcesTab({ course }: Props) {
  const { success } = useToast();

  const handleDownloadResource = (resource: Resource) => {
    downloadTextFile(
      `${resource.title}.txt`,
      `Centre C2P\nRessource: ${resource.title}\nType: ${resource.type}\nTaille: ${resource.size}\n\nCette ressource est disponible depuis votre espace numerique.\n`,
    );
    success('Téléchargement', `Le fichier "${resource.title}" est en cours de téléchargement.`);
  };

  return (
    <div className="space-y-3">
      {course.resources.map((resource) => (
        <div
          key={resource.id}
          className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-teal-300 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
              <i className={`${resource.icon} text-teal-600 text-lg`}></i>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{resource.title}</p>
              <p className="text-xs text-gray-500">
                {resource.type} · {resource.size}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleDownloadResource(resource)}
            className="px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors whitespace-nowrap cursor-pointer"
          >
            <i className="ri-download-line mr-1"></i>
            Télécharger
          </button>
        </div>
      ))}
    </div>
  );
}
