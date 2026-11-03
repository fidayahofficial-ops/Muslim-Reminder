import { CalculationMethod, JuristicMethod } from './index';

export type AdminRole = 'super_admin' | 'admin' | 'content_manager';

export interface AdminAccount {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  status: 'active' | 'suspended';
  createdAt: number;
  createdBy?: string;
  lastLoginAt?: number;
}

export interface ManagedUserRecord {
  id: string;
  name: string;
  email?: string;
  avatarIcon?: string;
  bio?: string;
  joinedDate: string;
  lastActiveAt?: number;
  loginMethod?: string;
  status?: 'active' | 'suspended';
  language?: 'bn' | 'en';
  theme?: 'light' | 'dark' | 'system';
  districtId?: string;
  appOpens?: number;
  totalCoins?: number;
  streakDays?: number;
  prayerCount?: number;
  quranPagesRead?: number;
  quranReadMinutes?: number;
  tasbihCount?: number;
  quizCorrectCount?: number;
  quizTotalAnswered?: number;
  notesCount?: number;
  bookmarksCount?: number;
  isFlagged?: boolean;
  flagReason?: string;
  updatedAt?: number;
}

export interface AppPrayerSystemConfig {
  id: string;
  calcMethod: CalculationMethod;
  juristicMethod: JuristicMethod;
  defaultDistrictId: string;
  timezone: string;
  hijriDayAdjustment: number;
  fajrOffset: number;
  dhuhrOffset: number;
  asrOffset: number;
  maghribOffset: number;
  ishaOffset: number;
  updatedAt: number;
  updatedBy?: string;
}

export interface AzanAudioConfig {
  id: string;
  nameBn: string;
  nameEn?: string;
  reciterName: string;
  sourceName?: string;
  descriptionBn?: string;
  badgeBn?: string;
  audioUrl: string;
  durationSeconds: number;
  isActive: boolean;
  isBuiltIn?: boolean;
  prayerType?: 'all' | 'fajr';
  licenseInfo?: string;
  updatedAt: number;
  updatedBy?: string;
}

export type CmsContentType = 'article' | 'dua' | 'daily_amal' | 'notification_template';

export interface ManagedContentItem {
  id: string;
  type: CmsContentType;
  titleBn: string;
  categoryBn?: string;
  arabic?: string;
  transliteration?: string;
  translationBn: string;
  reference?: string;
  status: 'draft' | 'published' | 'unpublished';
  publishDate?: string;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
}

export interface ManagedQuizQuestion {
  id: string;
  category?: string;
  categoryBn: string;
  difficulty: 'সহজ' | 'মাঝারি' | 'কঠিন';
  questionBn: string;
  optionsBn: string[];
  explanationBn: string;
  reference: string;
  publishDate: string; // YYYY-MM-DD
  expiryDate?: string; // YYYY-MM-DD
  status: 'draft' | 'published' | 'unpublished';
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
}

export interface QuizSecretAnswer {
  quizId: string;
  correctAnswerIndex: number;
  updatedAt: number;
}

export interface ManagedNotification {
  id: string;
  title: string;
  message: string;
  targetAudience: 'all_users' | 'active_users' | 'new_users';
  status: 'sent' | 'scheduled' | 'cancelled';
  scheduledFor?: string;
  sentAt?: number | null;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
}

export interface AppAnnouncement {
  id: string;
  titleBn: string;
  messageBn: string;
  type: 'update' | 'maintenance' | 'islamic_reminder' | 'new_feature';
  priority: 'normal' | 'important' | 'urgent';
  status: 'draft' | 'published' | 'unpublished';
  publishDate?: string;
  expiryDate?: string;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
}

export interface RankingModerationFlag {
  id: string;
  userId: string;
  userName: string;
  reportedCoins: number;
  reportedStreak?: number;
  reason: string;
  status: 'flagged' | 'under_review' | 'resolved' | 'dismissed';
  adminNote?: string;
  flaggedBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  adminName?: string;
  adminRole?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details: string;
  dateStr: string;
  timeStr: string;
  timestamp: number;
}
