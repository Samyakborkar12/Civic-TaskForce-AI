export type IssueSeverity = 'urgent' | 'high' | 'medium' | 'low';

export type IssueStatus = 
  | 'reported' 
  | 'ai_analyzed' 
  | 'under_review'
  | 'assigned' 
  | 'inspection' 
  | 'in_progress' 
  | 'resolved' 
  | 'verified' 
  | 'closed' 
  | 'archived';

export interface AssignedOfficer {
  name: string;
  dept: string;
  role: string;
  deadline: string;
  avatar?: string;
}

export interface InspectionReport {
  inspectorName: string;
  verifiedStatus: 'valid' | 'invalid' | 'resolved_already';
  notes: string;
  timestamp: string;
}

export interface ResourceAllocation {
  teams: number;
  budget: string;
  equipment: string[];
  assignedBudget?: number;
  spentBudget?: number;
}

export interface TimelineEvent {
  status: IssueStatus | 'comment' | 'escalated';
  timestamp: string;
  note: string;
  actor: string;
}

export interface Issue {
  id: string;
  title: string;
  type: string;
  severity: IssueSeverity;
  riskScore: number;
  confidence: number;
  department: string;
  repairTime: string;
  description: string;
  status: IssueStatus;
  latitude: number;
  longitude: number;
  image: string;
  reporterName: string;
  reporterEmail: string;
  reportedAt: string;
  assignedOfficer: AssignedOfficer | null;
  inspectionReport: InspectionReport | null;
  resourceAllocation: ResourceAllocation | null;
  timeline: TimelineEvent[];
  upvotes: number;
  verifiedBy: string[]; // List of citizen emails who confirmed
  isEmergency: boolean;
  isDuplicateOf: string | null; // Merged issue ID if any
}

export interface User {
  name: string;
  email: string;
  role: string;
  xp: number;
  badges: string[];
  reportedCount: number;
  verifiedCount: number;
}

export interface CityMetrics {
  healthScore: number;
  roadsScore: number;
  waterScore: number;
  wasteScore: number;
  electricityScore: number;
  safetyScore: number;
  resolvedCount: number;
  activeCount: number;
  totalSavedBudget: string;
}

export interface LeaderboardUser {
  rank: number;
  name: string;
  xp: number;
  badgesCount: number;
  resolvedIssues: number;
  isCurrentUser?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  suggestions?: string[];
}
