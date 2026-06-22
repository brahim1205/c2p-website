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
  partner_badge?: 'nianthio' | 'djambars' | 'ndanane' | null;
  opportunity_score?: number;
  flagged_by_c2p?: boolean;
  alert_reason?: string;
  suggested_roles?: PartnerAction[];
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
export type PartnerAction = 'coach' | 'mentor' | 'evaluate' | 'carry' | 'technical';
export type ProjectFundingType = 'donation' | 'profit_share_loan' | 'interest_loan';

export interface FundingScheduleEntry {
  period: number;
  openingBalance: number;
  principal: number;
  profit: number;
  interest: number;
  payment: number;
  partnerProfitSharePercent: number;
  closingBalance: number;
  status?: 'pending' | 'paid';
  paidAt?: string | null;
}

export interface ProjectFundingSimulation {
  projectId: string | number;
  projectTitle: string;
  amount: number;
  durationMonths: number;
  fundingType: ProjectFundingType;
  partnerBadge: 'nianthio' | 'djambars' | 'ndanane';
  projectedProfit: number;
  projectedInterest: number;
  projectedReturnRate: number;
  totalExpected: number;
  schedule: FundingScheduleEntry[];
  guarantee: string;
  disclaimer: string;
}

export interface ProjectFundingCommitment {
  id: string | number;
  project_id: string | number;
  project_title: string;
  partner_id: string;
  partner_badge: string;
  funding_type: ProjectFundingType;
  amount: number;
  duration_months: number;
  projected_profit: number;
  projected_interest: number;
  total_expected: number;
  schedule: FundingScheduleEntry[];
  guarantee: string;
  status: string;
  created_at: string;
  owner_id?: string;
  partner_name?: string;
  payment_reference?: string | null;
  contract_status?: string;
  total_repaid?: number;
  review_reason?: string | null;
}

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
