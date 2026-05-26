import { useEffect, useMemo, useState } from 'react';
import { fetchPublicProjectCenterProjects, type PublicProject } from '@/lib/projectCenterApi';
import {
  ProjectCenterCategoryBar,
  ProjectCenterFilterBar,
  ProjectCenterGrid,
  ProjectCenterHero,
} from './ProjectCenterSections';
import { filterPublicProjects } from './projectCenterPublicModel';

export default function ProjectCenterPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchProjects = async () => {
      setLoading(true);
      try {
        const nextProjects = await fetchPublicProjectCenterProjects();
        if (isMounted) {
          setProjects(nextProjects);
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setProjects([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProjects();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredProjects = useMemo(
    () => filterPublicProjects(projects, selectedCategory, searchQuery, statusFilter),
    [projects, searchQuery, selectedCategory, statusFilter],
  );

  const resetFilters = () => {
    setSelectedCategory('all');
    setSearchQuery('');
    setStatusFilter('all');
  };

  const hasActiveFilters = selectedCategory !== 'all' || statusFilter !== 'all' || Boolean(searchQuery);

  return (
    <div className="public-premium-page min-h-screen bg-c2p-bg text-c2p-text">
      <ProjectCenterHero searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <ProjectCenterCategoryBar selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
      <ProjectCenterFilterBar
        projectCount={filteredProjects.length}
        hasActiveFilters={hasActiveFilters}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onResetFilters={resetFilters}
      />
      <ProjectCenterGrid loading={loading} projects={filteredProjects} onResetFilters={resetFilters} />
    </div>
  );
}
