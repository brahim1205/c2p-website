export interface ProjectRecord {
  id: number | string;
  owner_id: string;
  title: string;
  description: string | null;
  category: string;
  sector?: string | null;
  status: string;
  phase: string;
  porteur_name: string;
  funding: number;
  funding_goal: number;
  team_size: number;
  mentors: number;
  progress: number;
  valuation?: number;
  revenue?: number;
  last_update?: string;
  next_milestone?: string;
  location?: string | null;
  impact?: string | null;
  documents_count?: number;
  reports_count?: number;
  looking_for: string[];
  image: string | null;
  created_at: string;
}

export interface ProjectMilestone {
  id: number | string;
  project_id: number | string;
  title: string;
  description: string | null;
  due_date: string;
  status: string;
  progress: number;
  tasks: { id: number; title: string; completed: boolean }[];
}

export interface ProjectDocument {
  id: number | string;
  project_id: number | string;
  name: string;
  type: string;
  size: string;
  date: string;
  category: string;
}

export interface ProjectHistoryItem {
  id: number | string;
  project_id: number | string;
  date: string;
  user: string;
  action: string;
  type: string;
}

export interface ProjectPartnership {
  id: number | string;
  project_id: number | string;
  project_title?: string | null;
  counterpart_user_id?: string;
  name: string;
  role: string;
  type: string;
  avatar: string;
  expertise: string[];
  status: string;
  last_activity: string;
}

export interface FundingRound {
  id: number | string;
  project_id: number | string;
  project_title?: string | null;
  type: string;
  target_amount: number;
  raised_amount: number;
  investors?: number;
  deadline: string;
  start_date?: string;
  status: string;
  description?: string;
  pitch_deck?: boolean;
  business_plan?: boolean;
  valuation?: number;
  revenue?: number;
  burn_rate?: number;
  runway?: string;
  next_milestone?: string;
  progress_percent?: number;
}

export interface FundingInvestor {
  id: number;
  funding_round_id: number;
  name: string;
  avatar: string;
  type: string;
  amount: number;
  date: string;
  equity: string;
  status: string;
  notes: string;
}

export interface TrackedProject {
  id: number | string;
  partner_id: string;
  project_id: number | string;
  partner_type?: 'technique' | 'financier' | null;
  invested_amount: number;
  roi: number;
  status: string;
  last_update: string;
  next_milestone: string;
  title?: string | null;
  description?: string | null;
  sector?: string | null;
  progress?: number;
  documents?: number;
  reports?: number;
  location?: string | null;
  impact?: string | null;
  team_size?: number;
  revenue?: number;
  valuation?: number;
}

export interface Collaboration {
  id: number | string;
  partner_id: string;
  project_id: number | string;
  partner_type?: 'technique' | 'financier' | null;
  project_title?: string | null;
  counterpart_name: string;
  counterpart_role: string;
  type: string;
  status: string;
  start_date: string;
  end_date?: string | null;
  value: number;
  deliverables: string[];
  meetings: number;
}

export interface ProjectDetailPayload {
  project: ProjectRecord | null;
  milestones: ProjectMilestone[];
  documents: ProjectDocument[];
  history: ProjectHistoryItem[];
  partnerships: ProjectPartnership[];
  rounds: FundingRound[];
}

export interface PartnerInterestResult {
  trackedCreated: boolean;
  collaborationCreated: boolean;
  alreadyTracked: boolean;
}

export type PartnerType = 'technique' | 'financier';

export interface OwnerDashboardSnapshot {
  projects: ProjectRecord[];
  partnerships: ProjectPartnership[];
  rounds: FundingRound[];
}

export interface PartnerDashboardSnapshot {
  trackedProjects: TrackedProject[];
  collaborations: Collaboration[];
  openProjects: ProjectRecord[];
}

export interface OwnerProjectUpdateInput {
  title: string;
  description: string;
  status: string;
}

export interface OwnerFundingRoundCreateInput {
  projectId: number | string;
  type: string;
  targetAmount: number;
  deadline: string;
  description: string;
}

export interface OwnerPartnershipContactInput {
  counterpartUserId?: string | null;
  counterpartName: string;
  projectTitle?: string | null;
  message?: string;
}

export interface OwnerPartnershipContactResult {
  delivered: boolean;
}

export interface PartnerUserProfile {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
}

export interface PartnerOwnerConversationInput {
  partner: PartnerUserProfile;
  projectId: number | string;
  ownerId: string;
  ownerName: string;
  projectTitle: string;
}
