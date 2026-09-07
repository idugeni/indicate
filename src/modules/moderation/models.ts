export type ReportStatus = 'received' | 'under_review' | 'action_taken' | 'rejected';
export type ReportCategory =
  | 'copyright'
  | 'defamation'
  | 'privacy'
  | 'hate'
  | 'misinformation'
  | 'other';

export interface ContentReportRecord {
  readonly id: string;
  readonly orgId: string;
  readonly siteId: string | null;
  readonly articleId: string | null;
  readonly reporterContact: string;
  readonly reasonCategory: ReportCategory;
  readonly details: string;
  readonly articleUrl: string | null;
  readonly status: ReportStatus;
  readonly createdAt: string;
}

export type PrivacyRequestType = 'access' | 'correction' | 'deletion' | 'portability' | 'restriction';
export type PrivacyRequestStatus = 'open' | 'in_progress' | 'fulfilled' | 'rejected';

export interface PrivacyRequestRecord {
  readonly id: string;
  readonly ticketNumber: string;
  readonly orgId: string;
  readonly requestType: PrivacyRequestType;
  readonly details: string;
  readonly status: PrivacyRequestStatus;
  readonly createdAt: string;
}

export interface LitigationHoldRecord {
  readonly id: string;
  readonly orgId: string;
  readonly reason: string;
  readonly heldBy: string;
  readonly createdAt: string;
  readonly releasedAt: string | null;
  readonly releasedBy: string | null;
}

export interface ErasureRequestRecord {
  readonly id: string;
  readonly orgId: string;
  readonly requestedBy: string;
  readonly reason: string;
  readonly status: 'pending' | 'processing' | 'completed' | 'failed';
  readonly scheduledFor: string;
  readonly attempts: number;
  readonly completedAt: string | null;
  readonly createdAt: string;
}
