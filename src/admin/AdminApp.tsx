import React, { useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  Unsubscribe
} from 'firebase/firestore';
import {
  LayoutDashboard,
  Users,
  Clock,
  Volume2,
  FileText,
  HelpCircle,
  Bell,
  Megaphone,
  BarChart3,
  Trophy,
  ShieldCheck,
  History,
  LogOut,
  Menu,
  X,
  ArrowLeft,
  Cloud
} from 'lucide-react';
import { auth, db, googleProvider } from '../firebase/config';
import {
  AdminAccount,
  ManagedUserRecord,
  AppPrayerSystemConfig,
  AzanAudioConfig,
  ManagedContentItem,
  ManagedQuizQuestion,
  ManagedNotification,
  AppAnnouncement,
  RankingModerationFlag,
  AdminAuditLog
} from '../types/admin';
import {
  BOOTSTRAPPED_SUPER_ADMIN_EMAIL,
  verifyAdminTokenOnBackend,
  verifyStoredBackendSession,
  setStoredBackendAdminToken,
  resolveOrBootstrapAdminAccount,
  recordAdminAuditLog
} from './adminService';
import { AdminLoginView } from './AdminLoginView';
import {
  AdminDashboardOverview,
  AdminUserManagement,
  AdminPrayerConfigView,
  AdminAzanManagement,
  AdminContentManagement,
  AdminQuizManagement
} from './AdminModulesPart1';
import {
  AdminNotificationManagement,
  AdminAnnouncementManagement,
  AdminAnalyticsView,
  AdminRankingActivityView,
  AdminRolesManagement,
  AdminAuditLogsView
} from './AdminModulesPart2';
import { WaqtoLogo } from '../components/WaqtoLogo';

export type AdminModuleKey =
  | 'overview'
  | 'users'
  | 'prayer_config'
  | 'azan'
  | 'content'
  | 'quiz'
  | 'notifications'
  | 'announcements'
  | 'analytics'
  | 'ranking'
  | 'roles'
  | 'audit_logs';

interface AdminAppProps {
  onExitAdmin: () => void;
}

const ADMIN_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export const AdminApp: React.FC<AdminAppProps> = ({ onExitAdmin }) => {
  const [authChecking, setAuthChecking] = useState(true);
  const [adminAccount, setAdminAccount] = useState<AdminAccount | null>(null);
  const [hasFirebaseCloudSession, setHasFirebaseCloudSession] = useState(false);
  const [unauthorizedError, setUnauthorizedError] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<AdminModuleKey>('overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Real-time Firestore collections state
  const [users, setUsers] = useState<ManagedUserRecord[]>([]);
  const [adminsList, setAdminsList] = useState<AdminAccount[]>([]);
  const [prayerConfig, setPrayerConfig] = useState<AppPrayerSystemConfig | null>(null);
  const [azanCatalog, setAzanCatalog] = useState<AzanAudioConfig[]>([]);
  const [cmsContents, setCmsContents] = useState<ManagedContentItem[]>([]);
  const [quizzes, setQuizzes] = useState<ManagedQuizQuestion[]>([]);
  const [notifications, setNotifications] = useState<ManagedNotification[]>([]);
  const [announcements, setAnnouncements] = useState<AppAnnouncement[]>([]);
  const [rankingFlags, setRankingFlags] = useState<RankingModerationFlag[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  const unsubsRef = useRef<Unsubscribe[]>([]);
  const loggedLoginUidRef = useRef<string | null>(null);
  const preserveInactivityNoticeRef = useRef(false);

  const attachFirestoreListeners = useCallback(
    (resolvedAdmin: AdminAccount, firebaseAuthenticated: boolean) => {
      unsubsRef.current.forEach((u) => u());
      unsubsRef.current = [];

      const isFullOrSuper =
        resolvedAdmin.role === 'super_admin' || resolvedAdmin.role === 'admin';

      // Publicly readable system configs & catalogs
      unsubsRef.current.push(
        onSnapshot(
          doc(db, 'app_config', 'prayer_settings'),
          (snap) => {
            if (snap.exists()) {
              setPrayerConfig(snap.data() as AppPrayerSystemConfig);
            }
          },
          () => {}
        )
      );

      unsubsRef.current.push(
        onSnapshot(
          collection(db, 'azan_catalog'),
          (snap) => {
            const list: AzanAudioConfig[] = [];
            snap.forEach((d) => list.push({ ...(d.data() as AzanAudioConfig), id: d.id }));
            setAzanCatalog(list);
          },
          () => {}
        )
      );

      if (firebaseAuthenticated) {
        // Full authenticated admin listeners (includes drafts, users, audit logs, flags)
        unsubsRef.current.push(
          onSnapshot(
            collection(db, 'cms_contents'),
            (snap) => {
              const list: ManagedContentItem[] = [];
              snap.forEach((d) => list.push({ ...(d.data() as ManagedContentItem), id: d.id }));
              list.sort((a, b) => b.updatedAt - a.updatedAt);
              setCmsContents(list);
            },
            () => {}
          )
        );

        unsubsRef.current.push(
          onSnapshot(
            collection(db, 'quizzes'),
            (snap) => {
              const list: ManagedQuizQuestion[] = [];
              snap.forEach((d) => list.push({ ...(d.data() as ManagedQuizQuestion), id: d.id }));
              list.sort((a, b) => b.updatedAt - a.updatedAt);
              setQuizzes(list);
            },
            () => {}
          )
        );

        unsubsRef.current.push(
          onSnapshot(
            collection(db, 'announcements'),
            (snap) => {
              const list: AppAnnouncement[] = [];
              snap.forEach((d) => list.push({ ...(d.data() as AppAnnouncement), id: d.id }));
              list.sort((a, b) => b.updatedAt - a.updatedAt);
              setAnnouncements(list);
            },
            () => {}
          )
        );

        unsubsRef.current.push(
          onSnapshot(
            collection(db, 'users'),
            (snap) => {
              const list: ManagedUserRecord[] = [];
              snap.forEach((d) => list.push({ ...(d.data() as ManagedUserRecord), id: d.id }));
              list.sort((a, b) => (Number(b.lastActiveAt) || 0) - (Number(a.lastActiveAt) || 0));
              setUsers(list);
            },
            () => {}
          )
        );

        unsubsRef.current.push(
          onSnapshot(
            collection(db, 'audit_logs'),
            (snap) => {
              const list: AdminAuditLog[] = [];
              snap.forEach((d) => list.push({ ...(d.data() as AdminAuditLog), id: d.id }));
              list.sort((a, b) => b.timestamp - a.timestamp);
              setAuditLogs(list);
            },
            () => {}
          )
        );

        unsubsRef.current.push(
          onSnapshot(
            collection(db, 'admins'),
            (snap) => {
              const list: AdminAccount[] = [];
              snap.forEach((d) => list.push({ ...(d.data() as AdminAccount), id: d.id }));
              setAdminsList(list);
            },
            () => {}
          )
        );

        if (isFullOrSuper) {
          unsubsRef.current.push(
            onSnapshot(
              collection(db, 'admin_notifications'),
              (snap) => {
                const list: ManagedNotification[] = [];
                snap.forEach((d) => list.push({ ...(d.data() as ManagedNotification), id: d.id }));
                list.sort((a, b) => b.createdAt - a.createdAt);
                setNotifications(list);
              },
              () => {}
            )
          );

          unsubsRef.current.push(
            onSnapshot(
              collection(db, 'ranking_flags'),
              (snap) => {
                const list: RankingModerationFlag[] = [];
                snap.forEach((d) => list.push({ ...(d.data() as RankingModerationFlag), id: d.id }));
                list.sort((a, b) => b.createdAt - a.createdAt);
                setRankingFlags(list);
              },
              () => {}
            )
          );
        }
      } else {
        // Fallback listeners when logged in via Backend Email+Password before linking Firebase Google Auth
        unsubsRef.current.push(
          onSnapshot(
            query(collection(db, 'cms_contents'), where('status', '==', 'published')),
            (snap) => {
              const list: ManagedContentItem[] = [];
              snap.forEach((d) => list.push({ ...(d.data() as ManagedContentItem), id: d.id }));
              list.sort((a, b) => b.updatedAt - a.updatedAt);
              setCmsContents(list);
            },
            () => {}
          )
        );

        unsubsRef.current.push(
          onSnapshot(
            query(collection(db, 'quizzes'), where('status', '==', 'published')),
            (snap) => {
              const list: ManagedQuizQuestion[] = [];
              snap.forEach((d) => list.push({ ...(d.data() as ManagedQuizQuestion), id: d.id }));
              list.sort((a, b) => b.updatedAt - a.updatedAt);
              setQuizzes(list);
            },
            () => {}
          )
        );

        unsubsRef.current.push(
          onSnapshot(
            query(collection(db, 'announcements'), where('status', '==', 'published')),
            (snap) => {
              const list: AppAnnouncement[] = [];
              snap.forEach((d) => list.push({ ...(d.data() as AppAnnouncement), id: d.id }));
              list.sort((a, b) => b.updatedAt - a.updatedAt);
              setAnnouncements(list);
            },
            () => {}
          )
        );

        unsubsRef.current.push(
          onSnapshot(
            query(collection(db, 'admin_notifications'), where('status', '==', 'sent')),
            (snap) => {
              const list: ManagedNotification[] = [];
              snap.forEach((d) => list.push({ ...(d.data() as ManagedNotification), id: d.id }));
              list.sort((a, b) => b.createdAt - a.createdAt);
              setNotifications(list);
            },
            () => {}
          )
        );

        unsubsRef.current.push(
          onSnapshot(
            collection(db, 'leaderboard'),
            (snap) => {
              const list: ManagedUserRecord[] = [];
              snap.forEach((d) => {
                const data = d.data();
                list.push({
                  id: data.userId || d.id,
                  name: data.name || 'মুসাফির',
                  email: '',
                  joinedDate: '',
                  lastActiveAt: Number(data.updatedAt) || 0,
                  loginMethod: 'Google',
                  status: 'active',
                  totalCoins: Number(data.totalCoins) || 0,
                  streakDays: Number(data.streakDays) || 1,
                  isFlagged: Boolean(data.isFlagged)
                });
              });
              list.sort((a, b) => (Number(b.totalCoins) || 0) - (Number(a.totalCoins) || 0));
              setUsers(list);
            },
            () => {}
          )
        );
      }
    },
    []
  );

  const evaluateAdminSession = useCallback(async () => {
    setAuthChecking(true);
    if (!preserveInactivityNoticeRef.current) {
      setUnauthorizedError(null);
    }

    try {
      const currentUser = auth.currentUser;
      const currentEmail = (currentUser?.email || '').trim().toLowerCase();

      // Strict enforcement: If signed into Firebase with any account other than nafiulislam3810@gmail.com, block immediately
      if (currentUser && currentEmail !== BOOTSTRAPPED_SUPER_ADMIN_EMAIL) {
        preserveInactivityNoticeRef.current = false;
        setStoredBackendAdminToken(null);
        setAdminAccount(null);
        setHasFirebaseCloudSession(false);
        setUnauthorizedError(
          `প্রবেশাধিকার নিষিদ্ধ! আপনার অ্যাকাউন্ট (${currentUser.email || currentUser.uid}) অনুমোদিত নয়। শুধুমাত্র প্রধান অ্যাডমিন ইমেইল (${BOOTSTRAPPED_SUPER_ADMIN_EMAIL}) এই অ্যাডমিন প্যানেলে প্রবেশ করতে পারবেন।`
        );
        setAuthChecking(false);
        return;
      }

      // Require 2-Factor Authenticated (2FA) Backend Session Token for all Admin Panel access
      const backendAdmin = await verifyStoredBackendSession();
      if (
        !backendAdmin ||
        backendAdmin.email.trim().toLowerCase() !== BOOTSTRAPPED_SUPER_ADMIN_EMAIL
      ) {
        setAdminAccount(null);
        setHasFirebaseCloudSession(false);
        setAuthChecking(false);
        return;
      }

      // Case 1: 2FA Backend Session verified + Active Firebase Auth User matching nafiulislam3810@gmail.com
      if (currentUser && currentEmail === BOOTSTRAPPED_SUPER_ADMIN_EMAIL) {
        const backendCheck = await verifyAdminTokenOnBackend(currentUser);
        const resolvedAdmin = await resolveOrBootstrapAdminAccount(currentUser);

        if (
          backendCheck.verified &&
          resolvedAdmin &&
          resolvedAdmin.email.trim().toLowerCase() === BOOTSTRAPPED_SUPER_ADMIN_EMAIL
        ) {
          preserveInactivityNoticeRef.current = false;
          setUnauthorizedError(null);
          setAdminAccount(resolvedAdmin);
          setHasFirebaseCloudSession(true);
          setAuthChecking(false);

          if (loggedLoginUidRef.current !== resolvedAdmin.id) {
            loggedLoginUidRef.current = resolvedAdmin.id;
            recordAdminAuditLog(
              resolvedAdmin,
              'ADMIN_LOGIN_2FA_VERIFIED',
              `২-ধাপ যাচাইকরণ (2FA) সম্পন্ন করে অ্যাডমিন প্যানেলে লগইন করেছেন (${resolvedAdmin.role})`,
              'session',
              resolvedAdmin.id
            ).catch(() => {});
          }

          attachFirestoreListeners(resolvedAdmin, true);
          return;
        }
      }

      // Case 2: 2FA-Verified Backend Admin Session (strictly locked to nafiulislam3810@gmail.com)
      preserveInactivityNoticeRef.current = false;
      setUnauthorizedError(null);
      setAdminAccount(backendAdmin);
      const isCloudLinked = Boolean(currentUser && currentEmail === BOOTSTRAPPED_SUPER_ADMIN_EMAIL);
      setHasFirebaseCloudSession(isCloudLinked);
      setAuthChecking(false);
      attachFirestoreListeners(backendAdmin, isCloudLinked);
      return;
    } catch (err) {
      console.error('Admin verification error:', err);
      setAdminAccount(null);
      setUnauthorizedError('অ্যাডমিন সেশন যাচাই করা যায়নি।');
      setAuthChecking(false);
    }
  }, [attachFirestoreListeners]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, () => {
      evaluateAdminSession();
    });

    return () => {
      unsubAuth();
      unsubsRef.current.forEach((u) => u());
    };
  }, [evaluateAdminSession]);

  const handleLinkFirebaseCloudSession = async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const linkedEmail = (cred.user?.email || '').trim().toLowerCase();
      if (linkedEmail !== BOOTSTRAPPED_SUPER_ADMIN_EMAIL) {
        await signOut(auth);
        setUnauthorizedError(
          `প্রবেশাধিকার নিষিদ্ধ! ক্লাউড রাইট সংযোগের জন্য শুধুমাত্র প্রধান অ্যাডমিন ইমেইল (${BOOTSTRAPPED_SUPER_ADMIN_EMAIL}) ব্যবহার করা যাবে।`
        );
        return;
      }
      await evaluateAdminSession();
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        return;
      }
      console.warn('Cloud session link notice:', err);
    }
  };

  const handleLogout = useCallback(
    async (reasonOrEvent?: unknown) => {
      const isAutoLogout = reasonOrEvent === 'inactivity';

      if (adminAccount && hasFirebaseCloudSession) {
        try {
          await recordAdminAuditLog(
            adminAccount,
            isAutoLogout ? 'ADMIN_AUTO_LOGOUT_INACTIVITY' : 'ADMIN_LOGOUT',
            isAutoLogout
              ? '৩০ মিনিট নিষ্ক্রিয় থাকার কারণে স্বয়ংক্রিয়ভাবে লগআউট হয়েছে'
              : 'অ্যাডমিন প্যানেল থেকে লগআউট করেছেন',
            'session',
            adminAccount.id
          );
        } catch {}
      }

      unsubsRef.current.forEach((u) => u());
      unsubsRef.current = [];
      loggedLoginUidRef.current = null;
      setStoredBackendAdminToken(null);

      if (isAutoLogout) {
        preserveInactivityNoticeRef.current = true;
        setUnauthorizedError(
          'নিরাপত্তার স্বার্থে ৩০ মিনিট নিষ্ক্রিয় থাকার কারণে আপনার অ্যাডমিন সেশন স্বয়ংক্রিয়ভাবে লগআউট করা হয়েছে। অনুগ্রহ করে পুনরায় লগইন করুন।'
        );
      } else {
        preserveInactivityNoticeRef.current = false;
      }

      await signOut(auth);
      setAdminAccount(null);
      setHasFirebaseCloudSession(false);
    },
    [adminAccount, hasFirebaseCloudSession]
  );

  // Automatic logout after 30 minutes of inactivity in the admin panel
  useEffect(() => {
    if (!adminAccount) return;

    let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
    let lastActivityTimestamp = Date.now();

    const triggerInactivityLogout = () => {
      handleLogout('inactivity');
    };

    const resetInactivityTimer = () => {
      const now = Date.now();
      if (now - lastActivityTimestamp >= ADMIN_INACTIVITY_TIMEOUT_MS) {
        triggerInactivityLogout();
        return;
      }
      lastActivityTimestamp = now;
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      inactivityTimer = setTimeout(triggerInactivityLogout, ADMIN_INACTIVITY_TIMEOUT_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (Date.now() - lastActivityTimestamp >= ADMIN_INACTIVITY_TIMEOUT_MS) {
          triggerInactivityLogout();
        } else {
          resetInactivityTimer();
        }
      }
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click'
    ];

    // Initialize timer on session start
    inactivityTimer = setTimeout(triggerInactivityLogout, ADMIN_INACTIVITY_TIMEOUT_MS);

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetInactivityTimer, { passive: true });
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetInactivityTimer);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [adminAccount, handleLogout]);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#0c120f] text-stone-200 flex items-center justify-center font-bengali">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-stone-400">সিকিউর অ্যাডমিন সেশন ও পারমিশন যাচাই করা হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (!adminAccount || adminAccount.email.trim().toLowerCase() !== BOOTSTRAPPED_SUPER_ADMIN_EMAIL) {
    return (
      <AdminLoginView
        unauthorizedError={unauthorizedError}
        onBackToApp={onExitAdmin}
        onBackendAdminAuthenticated={evaluateAdminSession}
      />
    );
  }

  // Navigation items filtered by Admin Role (RBAC)
  const allNavItems: Array<{
    key: AdminModuleKey;
    labelBn: string;
    icon: React.FC<{ className?: string }>;
    allowedRoles: Array<'super_admin' | 'admin' | 'content_manager'>;
  }> = [
    {
      key: 'overview',
      labelBn: 'ড্যাশবোর্ড ওভারভিউ',
      icon: LayoutDashboard,
      allowedRoles: ['super_admin', 'admin', 'content_manager']
    },
    {
      key: 'users',
      labelBn: 'ইউজার ম্যানেজমেন্ট',
      icon: Users,
      allowedRoles: ['super_admin', 'admin']
    },
    {
      key: 'prayer_config',
      labelBn: 'সালাত সময় কনফিগারেশন',
      icon: Clock,
      allowedRoles: ['super_admin', 'admin']
    },
    {
      key: 'azan',
      labelBn: 'আজান ম্যানেজমেন্ট',
      icon: Volume2,
      allowedRoles: ['super_admin', 'admin']
    },
    {
      key: 'content',
      labelBn: 'কনটেন্ট ম্যানেজমেন্ট',
      icon: FileText,
      allowedRoles: ['super_admin', 'admin', 'content_manager']
    },
    {
      key: 'quiz',
      labelBn: 'কুইজ ম্যানেজমেন্ট',
      icon: HelpCircle,
      allowedRoles: ['super_admin', 'admin', 'content_manager']
    },
    {
      key: 'notifications',
      labelBn: 'নোটিফিকেশন ম্যানেজমেন্ট',
      icon: Bell,
      allowedRoles: ['super_admin', 'admin']
    },
    {
      key: 'announcements',
      labelBn: 'অ্যাপ অ্যানাউন্সমেন্ট',
      icon: Megaphone,
      allowedRoles: ['super_admin', 'admin', 'content_manager']
    },
    {
      key: 'analytics',
      labelBn: 'অ্যানালিটিক্স',
      icon: BarChart3,
      allowedRoles: ['super_admin', 'admin']
    },
    {
      key: 'ranking',
      labelBn: 'র‌্যাংকিং ও অ্যাক্টিভিটি',
      icon: Trophy,
      allowedRoles: ['super_admin', 'admin']
    },
    {
      key: 'roles',
      labelBn: 'অ্যাডমিন রোল (RBAC)',
      icon: ShieldCheck,
      allowedRoles: ['super_admin', 'admin']
    },
    {
      key: 'audit_logs',
      labelBn: 'অডিট লগ (Audit Log)',
      icon: History,
      allowedRoles: ['super_admin', 'admin', 'content_manager']
    }
  ];

  const visibleNavItems = allNavItems.filter((item) =>
    item.allowedRoles.includes(adminAccount.role)
  );

  const currentModuleTitle =
    visibleNavItems.find((i) => i.key === activeModule)?.labelBn || 'ড্যাশবোর্ড';

  return (
    <div className="min-h-screen bg-[#0c120f] text-stone-100 flex font-bengali selection:bg-emerald-500 selection:text-stone-950">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-[#111814] border-r border-stone-800/90 shrink-0">
        <div className="h-16 px-5 flex items-center gap-3 border-b border-stone-800/90">
          <WaqtoLogo size={32} />
          <span className="text-base font-bold tracking-tight text-white">
            Muslim Reminder Admin
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveModule(item.key)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#177a56] text-white'
                    : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.labelBn}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-stone-800/90 space-y-3 text-xs">
          <div>
            <div className="font-bold text-white truncate">{adminAccount.name}</div>
            <div className="text-[11px] text-stone-400 font-mono truncate">{adminAccount.email}</div>
            <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">
              Role: {adminAccount.role.toUpperCase()}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onExitAdmin}
              className="flex-1 py-2 px-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>অ্যাপ</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 py-2 px-2.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-800/60 text-rose-200 font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>লগআউট</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="relative z-10 w-64 bg-[#111814] border-r border-stone-800 flex flex-col h-full">
            <div className="h-16 px-4 flex items-center justify-between border-b border-stone-800">
              <span className="text-base font-bold text-white">Muslim Reminder Admin</span>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setActiveModule(item.key);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#177a56] text-white'
                        : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.labelBn}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract */}
        <header className="h-16 px-4 sm:px-6 bg-[#111814] border-b border-stone-800/90 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-stone-900 border border-stone-800 text-stone-300 cursor-pointer"
              aria-label="মেনু খুলুন"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-sm sm:text-base font-bold text-white truncate">
              ওয়াক্ত অ্যাডমিন / {currentModuleTitle}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-4 text-xs text-stone-400">
            <span>
              {hasFirebaseCloudSession ? 'ফায়ারবেস রিয়েল-টাইম সিঙ্ক সক্রিয়' : 'ব্যাকএন্ড সেশন সক্রিয়'}
            </span>
            <span>·</span>
            <span>রোল: {adminAccount.role}</span>
          </div>

          <div className="flex items-center gap-2.5">
            {!hasFirebaseCloudSession && (
              <button
                onClick={handleLinkFirebaseCloudSession}
                className="px-3 py-1.5 rounded-lg bg-[#177a56] hover:bg-[#126446] text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="ফায়ারবেস ডাটাবেসে সরাসরি রাইট অ্যাক্সেসের জন্য গুগল সেশন সংযুক্ত করুন"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ক্লাউড রাইট সংযুক্ত করুন</span>
              </button>
            )}
            <button
              onClick={onExitAdmin}
              className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 text-xs font-semibold text-stone-200 cursor-pointer whitespace-nowrap"
            >
              অ্যাপ ভিউ
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-xs font-semibold text-rose-200 cursor-pointer whitespace-nowrap"
            >
              লগআউট
            </button>
          </div>
        </header>

        {/* Active Module Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {!hasFirebaseCloudSession && (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-950/40 border border-amber-700/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200">
              <span>
                আপনি ব্যাকএন্ড ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করেছেন। ফায়ারবেস ডাটাবেসে নতুন কুইজ, আজান বা কনটেন্ট সরাসরি সেভ করতে একবার আপনার অ্যাডমিন গুগল সেশন সংযুক্ত করুন।
              </span>
              <button
                onClick={handleLinkFirebaseCloudSession}
                className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shrink-0 cursor-pointer"
              >
                ফায়ারবেস ক্লাউড সংযুক্ত করুন →
              </button>
            </div>
          )}

          {activeModule === 'overview' && (
            <AdminDashboardOverview
              users={users}
              notifications={notifications}
              quizzes={quizzes}
              cmsContents={cmsContents}
              auditLogs={auditLogs}
              onNavigateModule={(m) => setActiveModule(m as AdminModuleKey)}
            />
          )}

          {activeModule === 'users' && (
            <AdminUserManagement admin={adminAccount} users={users} />
          )}

          {activeModule === 'prayer_config' && (
            <AdminPrayerConfigView admin={adminAccount} currentConfig={prayerConfig} />
          )}

          {activeModule === 'azan' && (
            <AdminAzanManagement admin={adminAccount} azanCatalog={azanCatalog} />
          )}

          {activeModule === 'content' && (
            <AdminContentManagement admin={adminAccount} contents={cmsContents} />
          )}

          {activeModule === 'quiz' && (
            <AdminQuizManagement admin={adminAccount} quizzes={quizzes} />
          )}

          {activeModule === 'notifications' && (
            <AdminNotificationManagement admin={adminAccount} notifications={notifications} />
          )}

          {activeModule === 'announcements' && (
            <AdminAnnouncementManagement admin={adminAccount} announcements={announcements} />
          )}

          {activeModule === 'analytics' && (
            <AdminAnalyticsView users={users} />
          )}

          {activeModule === 'ranking' && (
            <AdminRankingActivityView
              admin={adminAccount}
              users={users}
              flags={rankingFlags}
            />
          )}

          {activeModule === 'roles' && (
            <AdminRolesManagement admin={adminAccount} adminsList={adminsList} />
          )}

          {activeModule === 'audit_logs' && (
            <AdminAuditLogsView logs={auditLogs} />
          )}
        </main>
      </div>
    </div>
  );
};
