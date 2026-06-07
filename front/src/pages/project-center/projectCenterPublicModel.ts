import type { PublicProject } from '@/lib/projectCenterApi';

export type ProjectCenterCategory = {
  id: string;
  name: string;
  icon: string;
};

export const projectCenterCategories: ProjectCenterCategory[] = [
  { id: 'all', name: 'Tous les projets', icon: 'ri-apps-line' },
  { id: 'tech', name: 'Technologies', icon: 'ri-smartphone-line' },
  { id: 'agriculture', name: 'Agriculture', icon: 'ri-plant-line' },
  { id: 'education', name: 'Éducation', icon: 'ri-book-open-line' },
  { id: 'sante', name: 'Santé', icon: 'ri-heart-pulse-line' },
  { id: 'commerce', name: 'Commerce', icon: 'ri-store-line' },
  { id: 'environnement', name: 'Environnement', icon: 'ri-leaf-line' },
];

export const projectCenterSteps = ['Idéation', 'Validation', 'Incubation', 'Financement', 'Lancement'];

export function filterPublicProjects(
  projects: PublicProject[],
  selectedCategory: string,
  searchQuery: string,
  statusFilter: string,
) {
  let result = [...projects];

  if (selectedCategory !== 'all') {
    result = result.filter((project) => project.category === selectedCategory);
  }

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    result = result.filter(
      (project) =>
        project.title.toLowerCase().includes(query) ||
        project.porteur_name.toLowerCase().includes(query) ||
        (project.description || '').toLowerCase().includes(query),
    );
  }

  if (statusFilter !== 'all') {
    result = result.filter((project) => project.status.toLowerCase().includes(statusFilter.toLowerCase()));
  }

  return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function getProgressColor(funding: number, goal: number) {
  const percentage = goal > 0 ? (funding / goal) * 100 : 0;
  if (percentage >= 75) return 'bg-[#0f1c35]';
  if (percentage >= 50) return 'bg-[#1a9a96]';
  if (percentage >= 25) return 'bg-[#6fbdb9]';
  return 'bg-[#b8dddb]';
}

export function getProjectImage(project: PublicProject) {
  if (project.image) return project.image;

  const categoryImages: Record<string, string> = {
    tech: '/images/brand/images11.jpeg',
    agriculture: '/images/brand/image8.jpeg',
    education: '/images/brand/image3.jpeg',
    sante: '/images/brand/images10.jpeg',
    commerce: '/images/brand/image2.jpeg',
    environnement: '/images/brand/images12.jpeg',
  };

  return categoryImages[project.category] || categoryImages.tech;
}
