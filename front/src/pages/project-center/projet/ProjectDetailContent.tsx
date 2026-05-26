import type { PublicProject } from '@/lib/projectCenterApi';
import type { FundingInvestor, FundingRound, ProjectDocument, ProjectHistoryItem, ProjectMilestone, ProjectPartnership } from '@/lib/projectApi';
import {
  PROJECT_DETAIL_TABS,
  type ProjectTab,
} from './projectDetailModel';
import {
  ProjectEcosystemPanel,
  ProjectFundingPanel,
  ProjectOverviewPanel,
  ProjectUpdatesPanel,
  RelatedProjectsPanel,
} from './ProjectDetailPanels';

interface ProjectDetailContentProps {
  activeTab: ProjectTab;
  documents: ProjectDocument[];
  fundingPercent: number;
  history: ProjectHistoryItem[];
  investorsByRound: Map<number, FundingInvestor[]>;
  milestones: ProjectMilestone[];
  partnerships: ProjectPartnership[];
  project: PublicProject;
  relatedProjects: PublicProject[];
  rounds: FundingRound[];
  setActiveTab: (tab: ProjectTab) => void;
}

export default function ProjectDetailContent({
  activeTab,
  documents,
  fundingPercent,
  history,
  investorsByRound,
  milestones,
  partnerships,
  project,
  relatedProjects,
  rounds,
  setActiveTab,
}: ProjectDetailContentProps) {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-[#80bfdf] bg-white shadow-[0_20px_60px_rgba(39,52,107,0.08)]">
        <div className="flex flex-wrap gap-2 border-b border-[#80bfdf] px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="contents" role="tablist" aria-label="Navigation de la fiche projet">
            {PROJECT_DETAIL_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`project-tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls={`project-panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors sm:px-4 ${
                  activeTab === tab.id ? 'bg-[#27346b] text-white' : 'bg-[#ffffff] text-[#27346b] hover:bg-[#ffffff] hover:text-[#27346b]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {activeTab === 'overview' ? (
            <ProjectOverviewPanel documents={documents} milestones={milestones} project={project} />
          ) : null}

          {activeTab === 'ecosystem' ? (
            <ProjectEcosystemPanel partnerships={partnerships} project={project} />
          ) : null}

          {activeTab === 'funding' ? (
            <ProjectFundingPanel
              fundingPercent={fundingPercent}
              investorsByRound={investorsByRound}
              project={project}
              rounds={rounds}
            />
          ) : null}

          {activeTab === 'updates' ? (
            <ProjectUpdatesPanel history={history} />
          ) : null}
        </div>
      </div>

      <RelatedProjectsPanel relatedProjects={relatedProjects} />
    </div>
  );
}
