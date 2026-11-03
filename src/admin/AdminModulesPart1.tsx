import React, { useState, useMemo, useRef } from 'react';
import {
  Users,
  Activity,
  BookOpen,
  Clock,
  HelpCircle,
  Bell,
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit3,
  Plus,
  Play,
  Square,
  Upload,
  ShieldAlert,
  Lock,
  Eye,
  RefreshCw,
  Sliders,
  Volume2,
  Calendar,
  Download,
  CheckSquare,
  Ban,
  UserCheck
} from 'lucide-react';
import {
  doc,
  setDoc,
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import {
  AdminAccount,
  ManagedUserRecord,
  AppPrayerSystemConfig,
  AzanAudioConfig,
  ManagedContentItem,
  CmsContentType,
  ManagedQuizQuestion,
  ManagedNotification,
  AdminAuditLog
} from '../types/admin';
import { CalculationMethod, JuristicMethod } from '../types';
import { BANGLADESH_DISTRICTS } from '../data/districts';
import { computePrayerTimes } from '../utils/prayerTimes';
import {
  recordAdminAuditLog,
  initializeBuiltInAzansIfNeeded,
  validateAudioDurationSeconds
} from './adminService';

// ============================================================================
// 1. ADMIN DASHBOARD OVERVIEW
// ============================================================================
export const AdminDashboardOverview: React.FC<{
  users: ManagedUserRecord[];
  notifications: ManagedNotification[];
  quizzes: ManagedQuizQuestion[];
  cmsContents: ManagedContentItem[];
  auditLogs: AdminAuditLog[];
  onNavigateModule: (mod: string) => void;
}> = ({ users, notifications, quizzes, cmsContents, auditLogs, onNavigateModule }) => {
  const stats = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;
    const monthMs = 30 * dayMs;

    let activeUsers = 0;
    let suspendedUsers = 0;
    let newUsers7d = 0;
    let dau = 0;
    let wau = 0;
    let mau = 0;

    let totalPrayers = 0;
    let totalQuranPages = 0;
    let totalQuranMinutes = 0;
    let totalQuizAnswered = 0;
    let totalQuizCorrect = 0;
    let totalNotesCount = 0;
    let totalBookmarksCount = 0;
    let totalTasbihCount = 0;

    users.forEach((u) => {
      if (u.status === 'suspended') suspendedUsers++;
      else activeUsers++;

      const joinedMs = u.joinedDate ? new Date(u.joinedDate).getTime() : 0;
      if (joinedMs && now - joinedMs <= weekMs) newUsers7d++;

      const lastAct = Number(u.lastActiveAt) || joinedMs || 0;
      if (lastAct > 0) {
        if (now - lastAct <= dayMs) dau++;
        if (now - lastAct <= weekMs) wau++;
        if (now - lastAct <= monthMs) mau++;
      }

      totalPrayers += Number(u.prayerCount) || 0;
      totalQuranPages += Number(u.quranPagesRead) || 0;
      totalQuranMinutes += Number(u.quranReadMinutes) || 0;
      totalQuizAnswered += Number(u.quizTotalAnswered) || 0;
      totalQuizCorrect += Number(u.quizCorrectCount) || 0;
      totalNotesCount += Number(u.notesCount) || 0;
      totalBookmarksCount += Number(u.bookmarksCount) || 0;
      totalTasbihCount += Number(u.tasbihCount) || 0;
    });

    const sentNotifs = notifications.filter((n) => n.status === 'sent').length;
    const scheduledNotifs = notifications.filter((n) => n.status === 'scheduled').length;
    const cancelledNotifs = notifications.filter((n) => n.status === 'cancelled').length;

    return {
      totalUsers: users.length,
      activeUsers,
      suspendedUsers,
      newUsers7d,
      dau,
      wau,
      mau,
      totalPrayers,
      totalQuranPages,
      totalQuranMinutes,
      totalQuizAnswered,
      totalQuizCorrect,
      totalNotesCount,
      totalBookmarksCount,
      totalTasbihCount,
      sentNotifs,
      scheduledNotifs,
      cancelledNotifs
    };
  }, [users, notifications]);

  return (
    <div className="space-y-6">
      {/* Primary User Metrics Grid */}
      <div>
        <h2 className="text-sm font-bold text-stone-200 mb-3">
          রিয়েল-টাইম ব্যবহারকারী পরিসংখ্যান (Real Database Metrics)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-xl bg-[#131b17] border border-stone-800">
            <span className="text-xs text-stone-400 block">মোট ব্যবহারকারী</span>
            <span className="text-2xl font-bold text-white font-mono tabular-nums mt-1 block">
              {stats.totalUsers}
            </span>
            <span className="text-[11px] text-emerald-400 mt-1 block">
              নিবন্ধিত প্রোফাইল
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#131b17] border border-stone-800">
            <span className="text-xs text-stone-400 block">সক্রিয় অ্যাকাউন্ট</span>
            <span className="text-2xl font-bold text-emerald-400 font-mono tabular-nums mt-1 block">
              {stats.activeUsers}
            </span>
            <span className="text-[11px] text-stone-500 mt-1 block">
              স্থগিত: {stats.suspendedUsers}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#131b17] border border-stone-800">
            <span className="text-xs text-stone-400 block">নতুন ব্যবহারকারী (৭ দিন)</span>
            <span className="text-2xl font-bold text-amber-400 font-mono tabular-nums mt-1 block">
              {stats.newUsers7d}
            </span>
            <span className="text-[11px] text-stone-500 mt-1 block">
              গত ৭ দিনে যুক্ত
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#131b17] border border-stone-800">
            <span className="text-xs text-stone-400 block">Daily Active (DAU)</span>
            <span className="text-2xl font-bold text-white font-mono tabular-nums mt-1 block">
              {stats.dau}
            </span>
            <span className="text-[11px] text-stone-500 mt-1 block">
              গত ২৪ ঘণ্টায় সক্রিয়
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#131b17] border border-stone-800">
            <span className="text-xs text-stone-400 block">Weekly Active (WAU)</span>
            <span className="text-2xl font-bold text-white font-mono tabular-nums mt-1 block">
              {stats.wau}
            </span>
            <span className="text-[11px] text-stone-500 mt-1 block">
              গত ৭ দিনে সক্রিয়
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#131b17] border border-stone-800">
            <span className="text-xs text-stone-400 block">Monthly Active (MAU)</span>
            <span className="text-2xl font-bold text-white font-mono tabular-nums mt-1 block">
              {stats.mau}
            </span>
            <span className="text-[11px] text-stone-500 mt-1 block">
              গত ৩০ দিনে সক্রিয়
            </span>
          </div>
        </div>
      </div>

      {/* Spiritual & App Feature Activity Grid */}
      <div>
        <h2 className="text-sm font-bold text-stone-200 mb-3">
          দ্বীনি ও অ্যাপ ফিচার অ্যাক্টিভিটি (Aggregate Privacy-Safe Data)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-4 rounded-xl bg-[#131b17] border border-stone-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span>মোট সালাত অ্যাক্টিভিটি</span>
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-white font-mono tabular-nums">
              {stats.totalPrayers} ওয়াক্ত
            </div>
            <p className="text-[11px] text-stone-500">
              সকল ব্যবহারকারীর ট্র্যাককৃত সালাত
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#131b17] border border-stone-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span>মোট কুরআন তিলাওয়াত</span>
              <BookOpen className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-white font-mono tabular-nums">
              {stats.totalQuranPages} পৃষ্ঠা
            </div>
            <p className="text-[11px] text-stone-500">
              মোট সময়: {stats.totalQuranMinutes} মিনিট
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#131b17] border border-stone-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span>মোট কুইজ অ্যাক্টিভিটি</span>
              <HelpCircle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-bold text-white font-mono tabular-nums">
              {stats.totalQuizCorrect} সঠিক উত্তর
            </div>
            <p className="text-[11px] text-stone-500">
              মোট অংশগ্রহণ: {stats.totalQuizAnswered} বার · প্রশ্ন ভাণ্ডার: {quizzes.length}টি
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#131b17] border border-stone-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span>নোটস ও বুকমার্ক (সমষ্টিগত)</span>
              <FileText className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-white font-mono tabular-nums">
              {stats.totalNotesCount} নোট · {stats.totalBookmarksCount} বুকমার্ক
            </div>
            <p className="text-[11px] text-stone-500">
              ব্যক্তিগত নোটের টেক্সট গোপন ও এনক্রিপ্টেড
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#131b17] border border-stone-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span>নোটিফিকেশন স্ট্যাটাস</span>
              <Bell className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-bold text-white font-mono tabular-nums">
              {stats.sentNotifs} প্রেরিত
            </div>
            <p className="text-[11px] text-stone-500">
              শিডিউলড: {stats.scheduledNotifs} · বাতিল: {stats.cancelledNotifs}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Admin Control Matrix: What Can Be Updated & Where It Reflects */}
      <div className="p-5 rounded-xl bg-[#131b17] border border-emerald-800/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white">
              অ্যাডমিন কন্ট্রোল গাইড — এখান থেকে অ্যাপে কী কী লাইভ আপডেট করা যায়
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              যেকোনো কার্ডে ক্লিক করে সরাসরি সংশ্লিষ্ট মডিউলে যান এবং পরিবর্তন সেভ করলেই অ্যাপে সাথে সাথে রিয়েল-টাইমে আপডেট হয়ে যাবে।
            </p>
          </div>
          <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-700/40 px-2.5 py-1 rounded-lg shrink-0">
            প্রধান অ্যাডমিন: nafiulislam3810@gmail.com
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <button
            type="button"
            onClick={() => onNavigateModule('prayer_config')}
            className="p-3.5 rounded-xl bg-stone-900/90 hover:bg-stone-900 border border-stone-800 hover:border-emerald-500/50 text-left space-y-1.5 transition-colors cursor-pointer"
          >
            <div className="font-bold text-emerald-400 flex items-center justify-between">
              <span>১. সালাত সময় ও হিজরি তারিখ</span>
              <span>→</span>
            </div>
            <p className="text-stone-300 leading-relaxed">
              ৫ ওয়াক্তের মিনিট সমন্বয় (+/-), ৬৪ জেলার কাস্টম সময়, মাজহাব এবং চাঁদ দেখার ওপর ভিত্তি করে হিজরি তারিখ (-২ থেকে +২ দিন) আপডেট করুন।
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigateModule('azan')}
            className="p-3.5 rounded-xl bg-stone-900/90 hover:bg-stone-900 border border-stone-800 hover:border-emerald-500/50 text-left space-y-1.5 transition-colors cursor-pointer"
          >
            <div className="font-bold text-emerald-400 flex items-center justify-between">
              <span>২. পূর্ণাঙ্গ আজান অডিও</span>
              <span>→</span>
            </div>
            <p className="text-stone-300 leading-relaxed">
              মক্কা, মদিনা, মিশারি ও আল-আকসার আজান চালু/বন্ধ করুন অথবা নতুন পূর্ণাঙ্গ আজান (MP3/অডিও লিংক) অ্যাপে যুক্ত করুন।
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigateModule('content')}
            className="p-3.5 rounded-xl bg-stone-900/90 hover:bg-stone-900 border border-stone-800 hover:border-emerald-500/50 text-left space-y-1.5 transition-colors cursor-pointer"
          >
            <div className="font-bold text-emerald-400 flex items-center justify-between">
              <span>৩. দোয়া, সুন্নাহ ও দ্বীনি আমল</span>
              <span>→</span>
            </div>
            <p className="text-stone-300 leading-relaxed">
              নতুন মাসনুন দোয়া, সুন্নাহ রিমাইন্ডার, রমজান আমল ও ইসলামিক আর্টিকেল প্রকাশ করুন (হোম স্ক্রিন, দোয়া ও সুন্নাহ ট্যাবে যুক্ত হবে)।
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigateModule('quiz')}
            className="p-3.5 rounded-xl bg-stone-900/90 hover:bg-stone-900 border border-stone-800 hover:border-emerald-500/50 text-left space-y-1.5 transition-colors cursor-pointer"
          >
            <div className="font-bold text-emerald-400 flex items-center justify-between">
              <span>৪. ডেইলি ইসলামিক কুইজ</span>
              <span>→</span>
            </div>
            <p className="text-stone-300 leading-relaxed">
              ৪টি অপশন, সঠিক উত্তর ও রেফারেন্সসহ নতুন কুইজ প্রশ্ন তৈরি ও পাবলিশ করুন যা অ্যাপের কুইজ সেকশনে সাথে সাথে যুক্ত হবে।
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigateModule('announcements')}
            className="p-3.5 rounded-xl bg-stone-900/90 hover:bg-stone-900 border border-stone-800 hover:border-emerald-500/50 text-left space-y-1.5 transition-colors cursor-pointer"
          >
            <div className="font-bold text-emerald-400 flex items-center justify-between">
              <span>৫. অ্যাপ অ্যানাউন্সমেন্ট ব্যানার</span>
              <span>→</span>
            </div>
            <p className="text-stone-300 leading-relaxed">
              রমজান, ঈদ, চাঁদ দেখা বা জরুরি ঘোষণার ব্যানার প্রকাশ করুন যা অ্যাপের একদম উপরে সকল ব্যবহারকারী দেখতে পাবেন।
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigateModule('notifications')}
            className="p-3.5 rounded-xl bg-stone-900/90 hover:bg-stone-900 border border-stone-800 hover:border-emerald-500/50 text-left space-y-1.5 transition-colors cursor-pointer"
          >
            <div className="font-bold text-emerald-400 flex items-center justify-between">
              <span>৬. পুশ নোটিফিকেশন ব্রডকাস্ট</span>
              <span>→</span>
            </div>
            <p className="text-stone-300 leading-relaxed">
              সকল ব্যবহারকারীকে তাৎক্ষণিক (Send Now) অথবা নির্দিষ্ট সময়ে (Schedule) দ্বীনি রিমাইন্ডার নোটিফিকেশন পাঠান।
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigateModule('users')}
            className="p-3.5 rounded-xl bg-stone-900/90 hover:bg-stone-900 border border-stone-800 hover:border-emerald-500/50 text-left space-y-1.5 transition-colors cursor-pointer"
          >
            <div className="font-bold text-emerald-400 flex items-center justify-between">
              <span>৭. ইউজার অ্যাকাউন্ট নিয়ন্ত্রণ</span>
              <span>→</span>
            </div>
            <p className="text-stone-300 leading-relaxed">
              নিবন্ধিত ব্যবহারকারীদের তালিকা দেখুন, সার্চ করুন এবং প্রয়োজনে যেকোনো অ্যাকাউন্ট Suspend বা Reactivate করুন।
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigateModule('ranking')}
            className="p-3.5 rounded-xl bg-stone-900/90 hover:bg-stone-900 border border-stone-800 hover:border-emerald-500/50 text-left space-y-1.5 transition-colors cursor-pointer"
          >
            <div className="font-bold text-emerald-400 flex items-center justify-between">
              <span>৮. র‌্যাংকিং ও কয়েন অডিট</span>
              <span>→</span>
            </div>
            <p className="text-stone-300 leading-relaxed">
              লিডারবোর্ডে অস্বাভাবিক স্কোর ফ্ল্যাগ করুন এবং প্রকৃত আমল রেকর্ড থেকে ব্যবহারকারীর কয়েন যাচাই ও পুনর্গণনা করুন।
            </p>
          </button>
        </div>
      </div>

      {/* Recent Audit Logs & Quick Management Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 p-5 rounded-xl bg-[#131b17] border border-stone-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">সাম্প্রতিক অ্যাডমিন অডিট লগ</h3>
            <button
              onClick={() => onNavigateModule('audit_logs')}
              className="text-xs text-emerald-400 hover:underline cursor-pointer"
            >
              সব লগ দেখুন →
            </button>
          </div>
          {auditLogs.length === 0 ? (
            <p className="text-xs text-stone-500 py-6 text-center">
              এখনো কোনো অডিট লগ রেকর্ড হয়নি।
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-800 text-stone-400">
                    <th className="py-2 pr-3 font-semibold">অ্যাডমিন</th>
                    <th className="py-2 px-3 font-semibold">অ্যাকশন</th>
                    <th className="py-2 px-3 font-semibold">বিবরণ</th>
                    <th className="py-2 pl-3 font-semibold text-right">সময়</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {auditLogs.slice(0, 6).map((log) => (
                    <tr key={log.id} className="hover:bg-stone-900/40">
                      <td className="py-2.5 pr-3 font-medium text-stone-200 whitespace-nowrap">
                        {log.adminEmail}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-emerald-400 whitespace-nowrap">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-3 text-stone-300 max-w-xs truncate">
                        {log.details}
                      </td>
                      <td className="py-2.5 pl-3 text-stone-500 font-mono tabular-nums text-right whitespace-nowrap">
                        {log.dateStr} · {log.timeStr}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="p-5 rounded-xl bg-[#131b17] border border-stone-800 space-y-3">
          <h3 className="text-sm font-bold text-white">কনটেন্ট ও সিস্টেম সারাংশ</h3>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-stone-800/70">
              <span className="text-stone-400">প্রকাশিত সিএমএস কনটেন্ট</span>
              <span className="font-mono font-bold text-white tabular-nums">
                {cmsContents.filter((c) => c.status === 'published').length} / {cmsContents.length}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-stone-800/70">
              <span className="text-stone-400">প্রকাশিত ডেইলি কুইজ</span>
              <span className="font-mono font-bold text-white tabular-nums">
                {quizzes.filter((q) => q.status === 'published').length} / {quizzes.length}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-stone-800/70">
              <span className="text-stone-400">মোট তাসবিহ জিকির গণনা</span>
              <span className="font-mono font-bold text-emerald-400 tabular-nums">
                {stats.totalTasbihCount} বার
              </span>
            </div>
          </div>

          <div className="pt-2 grid grid-cols-2 gap-2">
            <button
              onClick={() => onNavigateModule('quiz')}
              className="py-2 px-3 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 text-xs font-semibold text-stone-200 cursor-pointer text-center"
            >
              + নতুন কুইজ
            </button>
            <button
              onClick={() => onNavigateModule('notifications')}
              className="py-2 px-3 rounded-lg bg-[#177a56] hover:bg-[#136647] text-xs font-semibold text-white cursor-pointer text-center"
            >
              + নোটিফিকেশন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. USER MANAGEMENT MODULE
// ============================================================================
export const AdminUserManagement: React.FC<{
  admin: AdminAccount;
  users: ManagedUserRecord[];
}> = ({ admin, users }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [selectedUser, setSelectedUser] = useState<ManagedUserRecord | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<ManagedUserRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkActionNotice, setBulkActionNotice] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const canModifyUsers = admin.role === 'super_admin' || admin.role === 'admin';

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const st = u.status || 'active';
      if (statusFilter !== 'all' && st !== statusFilter) return false;
      if (!q) return true;
      return (
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
      );
    });
  }, [users, search, statusFilter]);

  const selectedSet = useMemo(() => new Set(selectedUserIds), [selectedUserIds]);

  const selectedUsersList = useMemo(
    () => users.filter((u) => selectedSet.has(u.id)),
    [users, selectedSet]
  );

  const allFilteredSelected =
    filteredUsers.length > 0 && filteredUsers.every((u) => selectedSet.has(u.id));

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredIdSet = new Set(filteredUsers.map((u) => u.id));
      setSelectedUserIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    } else {
      const merged = new Set(selectedUserIds);
      filteredUsers.forEach((u) => merged.add(u.id));
      setSelectedUserIds(Array.from(merged));
    }
  };

  const clearSelection = () => {
    setSelectedUserIds([]);
    setConfirmBulkDelete(false);
  };

  const handleToggleUserStatus = async (target: ManagedUserRecord, nextStatus: 'active' | 'suspended') => {
    if (!canModifyUsers) return;
    setBusyId(target.id);
    try {
      const userRef = doc(db, 'users', target.id);
      await setDoc(
        userRef,
        {
          ...target,
          id: target.id,
          name: target.name || 'মুসাফির',
          status: nextStatus,
          updatedAt: Date.now()
        },
        { merge: true }
      );
      await recordAdminAuditLog(
        admin,
        nextStatus === 'suspended' ? 'USER_SUSPEND' : 'USER_ACTIVATE',
        `ব্যবহারকারী ${target.name} (${target.email || target.id}) কে ${
          nextStatus === 'suspended' ? 'স্থগিত (Suspend)' : 'সক্রিয় (Activate)'
        } করা হয়েছে।`,
        'user',
        target.id
      );
      if (selectedUser?.id === target.id) {
        setSelectedUser({ ...target, status: nextStatus });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${target.id}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleBulkStatusChange = async (nextStatus: 'active' | 'suspended') => {
    if (!canModifyUsers || selectedUsersList.length === 0 || bulkBusy) return;
    setBulkBusy(true);
    setBulkActionNotice(null);
    try {
      const now = Date.now();
      for (const target of selectedUsersList) {
        const userRef = doc(db, 'users', target.id);
        await setDoc(
          userRef,
          {
            ...target,
            id: target.id,
            name: target.name || 'মুসাফির',
            status: nextStatus,
            updatedAt: now
          },
          { merge: true }
        );
      }

      const count = selectedUsersList.length;
      const sampleNames = selectedUsersList
        .slice(0, 4)
        .map((u) => u.name || u.email || u.id)
        .join(', ');

      await recordAdminAuditLog(
        admin,
        nextStatus === 'suspended' ? 'USER_BULK_SUSPEND' : 'USER_BULK_ACTIVATE',
        `বাল্ক অ্যাকশনের মাধ্যমে ${count} জন ব্যবহারকারীকে ${
          nextStatus === 'suspended' ? 'স্থগিত (Suspend)' : 'সক্রিয় (Activate)'
        } করা হয়েছে (${sampleNames}${count > 4 ? '...' : ''})।`,
        'user_bulk',
        `bulk_${count}`
      );

      if (selectedUser && selectedSet.has(selectedUser.id)) {
        setSelectedUser({ ...selectedUser, status: nextStatus });
      }

      setBulkActionNotice(
        `সফলভাবে ${count} জন নির্বাচিত ব্যবহারকারীকে ${
          nextStatus === 'suspended' ? 'স্থগিত (Suspended)' : 'সক্রিয় (Active)'
        } করা হয়েছে।`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users/bulk_status_update');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkDeleteUsers = async () => {
    if (!canModifyUsers || selectedUsersList.length === 0 || bulkBusy) return;
    setBulkBusy(true);
    setBulkActionNotice(null);
    try {
      const count = selectedUsersList.length;
      for (const target of selectedUsersList) {
        await deleteDoc(doc(db, 'users', target.id));
        try {
          await deleteDoc(doc(db, 'leaderboard', target.id));
        } catch {}
      }

      await recordAdminAuditLog(
        admin,
        'USER_BULK_DELETE',
        `বাল্ক অ্যাকশনের মাধ্যমে ${count} জন ব্যবহারকারীর প্রোফাইল ডিলিট করা হয়েছে।`,
        'user_bulk',
        `bulk_del_${count}`
      );

      if (selectedUser && selectedSet.has(selectedUser.id)) {
        setSelectedUser(null);
      }
      setSelectedUserIds([]);
      setConfirmBulkDelete(false);
      setBulkActionNotice(`সফলভাবে ${count} জন ব্যবহারকারীর প্রোফাইল ডিলিট করা হয়েছে।`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'users/bulk_delete');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleExportUsers = async (
    format: 'csv' | 'json',
    scope: 'selected' | 'filtered'
  ) => {
    const listToExport = scope === 'selected' && selectedUsersList.length > 0 ? selectedUsersList : filteredUsers;
    if (listToExport.length === 0) return;

    const timestampStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const filename = `muslim-reminder-users-${scope}-${listToExport.length}-${timestampStr}.${format}`;

    if (format === 'csv') {
      const escapeCsv = (val: unknown) => {
        const str = val === null || val === undefined ? '' : String(val);
        if (str.includes('"') || str.includes(',') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const headers = [
        'User ID',
        'Name',
        'Email',
        'Status',
        'Login Method',
        'Joined Date',
        'Last Active',
        'Total Coins',
        'Streak Days',
        'Prayer Count',
        'Quran Pages Read',
        'Quiz Correct Count',
        'Tasbih Count',
        'Notes Count (Metadata Only)',
        'Bookmarks Count'
      ];

      const rows = listToExport.map((u) => [
        u.id,
        u.name || 'মুসাফির',
        u.email || '',
        u.status || 'active',
        u.loginMethod || 'Google',
        u.joinedDate || '',
        u.lastActiveAt ? new Date(u.lastActiveAt).toISOString() : '',
        u.totalCoins ?? 0,
        u.streakDays ?? 0,
        u.prayerCount ?? 0,
        u.quranPagesRead ?? 0,
        u.quizCorrectCount ?? 0,
        u.tasbihCount ?? 0,
        u.notesCount ?? 0,
        u.bookmarksCount ?? 0
      ]);

      const csvContent =
        '\uFEFF' +
        [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      const sanitizedExport = listToExport.map((u) => ({
        id: u.id,
        name: u.name || 'মুসাফির',
        email: u.email || null,
        status: u.status || 'active',
        loginMethod: u.loginMethod || 'Google',
        joinedDate: u.joinedDate || null,
        lastActiveAt: u.lastActiveAt ? new Date(u.lastActiveAt).toISOString() : null,
        totalCoins: u.totalCoins ?? 0,
        streakDays: u.streakDays ?? 0,
        prayerCount: u.prayerCount ?? 0,
        quranPagesRead: u.quranPagesRead ?? 0,
        quizCorrectCount: u.quizCorrectCount ?? 0,
        tasbihCount: u.tasbihCount ?? 0,
        notesCount: u.notesCount ?? 0,
        bookmarksCount: u.bookmarksCount ?? 0
      }));

      const jsonContent = JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          exportedBy: admin.email,
          scope,
          totalExported: sanitizedExport.length,
          users: sanitizedExport
        },
        null,
        2
      );

      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    await recordAdminAuditLog(
      admin,
      'USER_LIST_EXPORT',
      `${listToExport.length} জন ব্যবহারকারীর তালিকা (${format.toUpperCase()} ফরম্যাটে, স্কোপ: ${scope}) এক্সপোর্ট করা হয়েছে।`,
      'user_export',
      filename
    );

    setBulkActionNotice(
      `${listToExport.length} জন ব্যবহারকারীর তালিকা সফলভাবে ${format.toUpperCase()} ফরম্যাটে এক্সপোর্ট হয়েছে।`
    );
  };

  const handleDeleteUser = async (target: ManagedUserRecord) => {
    if (!canModifyUsers) return;
    setBusyId(target.id);
    try {
      await deleteDoc(doc(db, 'users', target.id));
      try {
        await deleteDoc(doc(db, 'leaderboard', target.id));
      } catch {}
      await recordAdminAuditLog(
        admin,
        'USER_DELETE',
        `ব্যবহারকারী ${target.name} (${target.email || target.id}) এর প্রোফাইল ডিলিট করা হয়েছে।`,
        'user',
        target.id
      );
      setConfirmDeleteUser(null);
      setSelectedUserIds((prev) => prev.filter((id) => id !== target.id));
      if (selectedUser?.id === target.id) setSelectedUser(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${target.id}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Privacy Notice Banner */}
      <div className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800 flex items-center justify-between text-xs text-stone-300">
        <div className="flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>প্রাইভেসি ও নিরাপত্তা সুরক্ষা:</strong> ব্যবহারকারীর পাসওয়ার্ড কখনোই ডাটাবেসে সংরক্ষিত থাকে না এবং ব্যক্তিগত নোটের (Personal Notes) ভেতরের লেখা অ্যাডমিন প্যানেল থেকে সম্পূর্ণ অপ্রবেশযোগ্য।
          </span>
        </div>
      </div>

      {/* Bulk Action Feedback Notice */}
      {bulkActionNotice && (
        <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-700/60 flex items-center justify-between text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{bulkActionNotice}</span>
          </div>
          <button
            onClick={() => setBulkActionNotice(null)}
            className="text-emerald-300 hover:text-white cursor-pointer text-[11px] font-semibold"
          >
            বন্ধ করুন ✕
          </button>
        </div>
      )}

      {/* Search, Filter & Export Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#131b17] p-4 rounded-xl border border-stone-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="নাম, ইমেইল বা User ID দিয়ে খুঁজুন..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-stone-900 border border-stone-800 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-stone-900 rounded-lg border border-stone-800 text-xs">
            {(['all', 'active', 'suspended'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  statusFilter === st ? 'bg-[#177a56] text-white' : 'text-stone-400 hover:text-white'
                }`}
              >
                {st === 'all' ? `সকল (${users.length})` : st === 'active' ? 'সক্রিয়' : 'স্থগিত'}
              </button>
            ))}
          </div>

          <button
            disabled={filteredUsers.length === 0}
            onClick={() => handleExportUsers('csv', 'filtered')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-40 border border-stone-700 text-xs font-semibold text-stone-200 cursor-pointer"
            title="বর্তমান ফিল্টারকৃত তালিকা CSV হিসেবে ডাউনলোড করুন"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV ({filteredUsers.length})</span>
          </button>

          <button
            disabled={filteredUsers.length === 0}
            onClick={() => handleExportUsers('json', 'filtered')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-40 border border-stone-700 text-xs font-semibold text-stone-200 cursor-pointer"
            title="বর্তমান ফিল্টারকৃত তালিকা JSON হিসেবে ডাউনলোড করুন"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Multi-User Selection Bulk Action Toolbar */}
      {selectedUserIds.length > 0 && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold font-mono tabular-nums">
              {selectedUserIds.length} জন নির্বাচিত
            </span>
            <span className="text-stone-300">
              নির্বাচিত ব্যবহারকারীদের ওপর বাল্ক অ্যাকশন প্রয়োগ করুন:
            </span>
            <button
              onClick={clearSelection}
              className="text-stone-400 hover:text-white underline text-[11px] cursor-pointer ml-1"
            >
              নির্বাচন মুছুন
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canModifyUsers && (
              <>
                <button
                  disabled={bulkBusy}
                  onClick={() => handleBulkStatusChange('suspended')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-900/70 hover:bg-amber-800 disabled:opacity-50 border border-amber-700/60 text-amber-100 text-xs font-semibold cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Bulk Suspend (স্থগিত করুন)</span>
                </button>

                <button
                  disabled={bulkBusy}
                  onClick={() => handleBulkStatusChange('active')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-900/70 hover:bg-emerald-800 disabled:opacity-50 border border-emerald-700/60 text-emerald-100 text-xs font-semibold cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Bulk Activate (সক্রিয় করুন)</span>
                </button>
              </>
            )}

            <button
              disabled={bulkBusy}
              onClick={() => handleExportUsers('csv', 'selected')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-100 text-xs font-semibold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Selected (CSV)</span>
            </button>

            <button
              disabled={bulkBusy}
              onClick={() => handleExportUsers('json', 'selected')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-100 text-xs font-semibold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Export Selected (JSON)</span>
            </button>

            {canModifyUsers && (
              <button
                disabled={bulkBusy}
                onClick={() => setConfirmBulkDelete(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800/70 text-rose-200 text-xs font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bulk Delete</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-[#131b17] rounded-xl border border-stone-800 overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500">
            কোনো ব্যবহারকারী পাওয়া যায়নি। অ্যাপে নিবন্ধিত ব্যবহারকারীরা স্বয়ংক্রিয়ভাবে এখানে তালিকাভুক্ত হবেন।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-800 bg-stone-900/50 text-stone-400">
                  <th className="py-3 pl-4 pr-2 w-10">
                    <button
                      type="button"
                      onClick={toggleSelectAllFiltered}
                      className="inline-flex items-center justify-center text-stone-400 hover:text-emerald-400 cursor-pointer"
                      title={allFilteredSelected ? 'সব নির্বাচন বাতিল করুন' : 'সকল ব্যবহারকারী নির্বাচন করুন'}
                    >
                      {allFilteredSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3 font-semibold">ব্যবহারকারী</th>
                  <th className="py-3 px-3 font-semibold">লগইন মাধ্যম</th>
                  <th className="py-3 px-3 font-semibold">অ্যাকাউন্ট তৈরি</th>
                  <th className="py-3 px-3 font-semibold">সর্বশেষ সক্রিয়</th>
                  <th className="py-3 px-3 font-semibold text-right">আমল স্কোর</th>
                  <th className="py-3 px-3 font-semibold">স্ট্যাটাস</th>
                  <th className="py-3 px-4 font-semibold text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {filteredUsers.map((u) => {
                  const isSuspended = u.status === 'suspended';
                  const isRowSelected = selectedSet.has(u.id);
                  return (
                    <tr
                      key={u.id}
                      className={`transition-colors ${
                        isRowSelected ? 'bg-emerald-950/25 hover:bg-emerald-950/35' : 'hover:bg-stone-900/40'
                      }`}
                    >
                      <td className="py-3 pl-4 pr-2">
                        <button
                          type="button"
                          onClick={() => toggleSelectUser(u.id)}
                          className="inline-flex items-center justify-center text-stone-400 hover:text-emerald-400 cursor-pointer"
                          title={isRowSelected ? 'নির্বাচন সরান' : 'নির্বাচন করুন'}
                        >
                          {isRowSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{u.name || 'মুসাফির'}</div>
                        <div className="text-[11px] text-stone-400 font-mono">
                          {u.email || u.id}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-stone-300">
                        {u.loginMethod || 'Google'}
                      </td>
                      <td className="py-3 px-3 text-stone-400 font-mono tabular-nums whitespace-nowrap">
                        {u.joinedDate ? new Date(u.joinedDate).toLocaleDateString('bn-BD') : '—'}
                      </td>
                      <td className="py-3 px-3 text-stone-400 font-mono tabular-nums whitespace-nowrap">
                        {u.lastActiveAt
                          ? new Date(u.lastActiveAt).toLocaleString('bn-BD', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-amber-400">
                        {u.totalCoins || 0} কয়েন
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-xs font-semibold ${
                            isSuspended ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {isSuspended ? 'Suspended (স্থগিত)' : 'Active (সক্রিয়)'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => setSelectedUser(u)}
                            className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer"
                            title="বিস্তারিত দেখুন"
                          >
                            বিস্তারিত
                          </button>
                          {canModifyUsers && (
                            <>
                              {isSuspended ? (
                                <button
                                  disabled={busyId === u.id || bulkBusy}
                                  onClick={() => handleToggleUserStatus(u, 'active')}
                                  className="px-2.5 py-1 rounded bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 cursor-pointer"
                                >
                                  Activate
                                </button>
                              ) : (
                                <button
                                  disabled={busyId === u.id || bulkBusy}
                                  onClick={() => handleToggleUserStatus(u, 'suspended')}
                                  className="px-2.5 py-1 rounded bg-amber-900/60 hover:bg-amber-800 text-amber-200 cursor-pointer"
                                >
                                  Suspend
                                </button>
                              )}
                              <button
                                disabled={busyId === u.id || bulkBusy}
                                onClick={() => setConfirmDeleteUser(u)}
                                className="p-1.5 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 cursor-pointer"
                                title="ডিলিট করুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#131b17] border border-stone-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-stone-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{selectedUser.name}</h3>
                <p className="text-xs text-stone-400 font-mono">{selectedUser.email || 'ইমেইল নেই'}</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-xs text-stone-400 hover:text-white cursor-pointer"
              >
                বন্ধ করুন ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-stone-900 border border-stone-800">
                <span className="text-stone-500 block">User UID</span>
                <span className="font-mono text-stone-200 break-all">{selectedUser.id}</span>
              </div>
              <div className="p-3 rounded-lg bg-stone-900 border border-stone-800">
                <span className="text-stone-500 block">লগইন মেথড ও স্ট্যাটাস</span>
                <span className="font-semibold text-stone-200">
                  {selectedUser.loginMethod || 'Google'} ·{' '}
                  {selectedUser.status === 'suspended' ? 'স্থগিত' : 'সক্রিয়'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-stone-900 border border-stone-800">
                <span className="text-stone-500 block">অ্যাকাউন্ট তৈরির তারিখ</span>
                <span className="font-mono text-stone-200">
                  {selectedUser.joinedDate
                    ? new Date(selectedUser.joinedDate).toLocaleString('bn-BD')
                    : '—'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-stone-900 border border-stone-800">
                <span className="text-stone-500 block">সর্বশেষ সক্রিয়</span>
                <span className="font-mono text-stone-200">
                  {selectedUser.lastActiveAt
                    ? new Date(selectedUser.lastActiveAt).toLocaleString('bn-BD')
                    : '—'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-stone-900 border border-stone-800">
                <span className="text-stone-500 block">সালাত ও কুরআন অ্যাক্টিভিটি</span>
                <span className="font-mono text-emerald-400">
                  {selectedUser.prayerCount || 0} ওয়াক্ত · {selectedUser.quranPagesRead || 0} পৃষ্ঠা
                </span>
              </div>
              <div className="p-3 rounded-lg bg-stone-900 border border-stone-800">
                <span className="text-stone-500 block">কুইজ ও তাসবিহ</span>
                <span className="font-mono text-amber-400">
                  {selectedUser.quizCorrectCount || 0} কুইজ · {selectedUser.tasbihCount || 0} তাসবিহ
                </span>
              </div>
              <div className="p-3 rounded-lg bg-stone-900 border border-stone-800 col-span-2">
                <span className="text-stone-500 block">সমষ্টিগত নোটস ও বুকমার্ক সংখ্যা (Content Isolated)</span>
                <span className="font-mono text-stone-300">
                  মোট নোট: {selectedUser.notesCount || 0}টি (ব্যক্তিগত নোটের টেক্সট গোপনীয়তা নীতিমালা অনুযায়ী প্রদর্শিত হয় না) · বুকমার্ক: {selectedUser.bookmarksCount || 0}টি
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 rounded-lg bg-stone-800 text-xs font-semibold text-stone-200 cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Delete Confirmation Modal */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#131b17] border border-rose-800/80 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-rose-400">
              ব্যবহারকারী ডিলিট নিশ্চিতকরণ
            </h3>
            <p className="text-xs text-stone-300 leading-relaxed">
              আপনি কি নিশ্চিতভাবে <strong>{confirmDeleteUser.name}</strong> ({confirmDeleteUser.email || confirmDeleteUser.id})-এর প্রোফাইল ডিলিট করতে চান? এই অ্যাকশনটি অডিট লগে রেকর্ড করা হবে।
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDeleteUser(null)}
                className="px-4 py-2 rounded-lg bg-stone-800 text-xs font-semibold text-stone-300 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                onClick={() => handleDeleteUser(confirmDeleteUser)}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white cursor-pointer"
              >
                স্থায়ীভাবে ডিলিট করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {confirmBulkDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#131b17] border border-rose-800/80 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-rose-400">
              বাল্ক ডিলিট নিশ্চিতকরণ ({selectedUsersList.length} জন)
            </h3>
            <p className="text-xs text-stone-300 leading-relaxed">
              আপনি কি নিশ্চিতভাবে নির্বাচিত <strong>{selectedUsersList.length} জন ব্যবহারকারীর</strong> প্রোফাইল ডিলিট করতে চান? এই অ্যাকশনটি অপরিবর্তনীয় এবং অডিট লগে রেকর্ড করা হবে।
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                disabled={bulkBusy}
                onClick={() => setConfirmBulkDelete(false)}
                className="px-4 py-2 rounded-lg bg-stone-800 text-xs font-semibold text-stone-300 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                disabled={bulkBusy}
                onClick={handleBulkDeleteUsers}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-xs font-bold text-white cursor-pointer"
              >
                {bulkBusy ? 'ডিলিট হচ্ছে...' : 'স্থায়ীভাবে ডিলিট করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 3. PRAYER TIME CONFIGURATION MODULE
// ============================================================================
export const AdminPrayerConfigView: React.FC<{
  admin: AdminAccount;
  currentConfig: AppPrayerSystemConfig | null;
}> = ({ admin, currentConfig }) => {
  const [calcMethod, setCalcMethod] = useState<CalculationMethod>(currentConfig?.calcMethod || 'karachi');
  const [juristicMethod, setJuristicMethod] = useState<JuristicMethod>(currentConfig?.juristicMethod || 'hanafi');
  const [defaultDistrictId, setDefaultDistrictId] = useState<string>(currentConfig?.defaultDistrictId || 'dhaka');
  const [timezone, setTimezone] = useState<string>(currentConfig?.timezone || 'Asia/Dhaka');
  const [hijriDayAdjustment, setHijriDayAdjustment] = useState<number>(currentConfig?.hijriDayAdjustment ?? 0);
  const [fajrOffset, setFajrOffset] = useState<number>(currentConfig?.fajrOffset ?? 0);
  const [dhuhrOffset, setDhuhrOffset] = useState<number>(currentConfig?.dhuhrOffset ?? 0);
  const [asrOffset, setAsrOffset] = useState<number>(currentConfig?.asrOffset ?? 0);
  const [maghribOffset, setMaghribOffset] = useState<number>(currentConfig?.maghribOffset ?? 0);
  const [ishaOffset, setIshaOffset] = useState<number>(currentConfig?.ishaOffset ?? 0);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const selectedDistrict = useMemo(() => {
    return BANGLADESH_DISTRICTS.find((d) => d.id === defaultDistrictId) || BANGLADESH_DISTRICTS[0];
  }, [defaultDistrictId]);

  // Real astronomical calculation preview using the app's actual computePrayerTimes engine
  const previewTimes = useMemo(() => {
    return computePrayerTimes(
      new Date(),
      selectedDistrict.lat,
      selectedDistrict.lng,
      juristicMethod,
      calcMethod,
      {
        fajr: fajrOffset,
        dhuhr: dhuhrOffset,
        asr: asrOffset,
        maghrib: maghribOffset,
        isha: ishaOffset
      },
      hijriDayAdjustment
    );
  }, [
    selectedDistrict,
    juristicMethod,
    calcMethod,
    fajrOffset,
    dhuhrOffset,
    asrOffset,
    maghribOffset,
    ishaOffset,
    hijriDayAdjustment
  ]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedNotice(null);
    try {
      const payload: AppPrayerSystemConfig = {
        id: 'prayer_settings',
        calcMethod,
        juristicMethod,
        defaultDistrictId,
        timezone,
        hijriDayAdjustment: Number(hijriDayAdjustment) || 0,
        fajrOffset: Number(fajrOffset) || 0,
        dhuhrOffset: Number(dhuhrOffset) || 0,
        asrOffset: Number(asrOffset) || 0,
        maghribOffset: Number(maghribOffset) || 0,
        ishaOffset: Number(ishaOffset) || 0,
        updatedAt: Date.now(),
        updatedBy: admin.email
      };
      await setDoc(doc(db, 'app_config', 'prayer_settings'), payload);
      await recordAdminAuditLog(
        admin,
        'PRAYER_CONFIG_UPDATE',
        `সালাত ক্যালকুলেশন কনফিগারেশন আপডেট করা হয়েছে: Method=${calcMethod}, Asr=${juristicMethod}, DefaultDistrict=${defaultDistrictId}`,
        'app_config',
        'prayer_settings'
      );
      setSavedNotice('সালাত ক্যালকুলেশন কনফিগারেশন সফলভাবে সংরক্ষিত ও অ্যাপের সাথে সিঙ্ক হয়েছে।');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'app_config/prayer_settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form
        onSubmit={handleSaveConfig}
        className="lg:col-span-2 bg-[#131b17] border border-stone-800 rounded-xl p-5 space-y-5"
      >
        <div className="border-b border-stone-800 pb-3">
          <h3 className="text-sm font-bold text-white">
            সালাত ক্যালকুলেশন ইঞ্জিন প্যারামিটার (System Calculation Parameters)
          </h3>
          <p className="text-xs text-stone-400 mt-0.5">
            এখানে কোনো ব্যবহারকারীর ওয়াক্ত হার্ড-কোড করে ওভাররাইড করা হয় না; বরং অ্যাপের অ্যাস্ট্রোনমিক্যাল ক্যালকুলেশন ইঞ্জিনের ডিফল্ট মেথড ও অফসেট নিয়ন্ত্রণ করা হয়।
          </p>
        </div>

        {savedNotice && (
          <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-700/60 text-emerald-200 text-xs">
            {savedNotice}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-stone-300 block">Calculation Method (হিসাব পদ্ধতি)</label>
            <select
              value={calcMethod}
              onChange={(e) => setCalcMethod(e.target.value as CalculationMethod)}
              className="w-full px-3 py-2.5 rounded-lg bg-stone-900 border border-stone-800 text-white"
            >
              <option value="karachi">University of Islamic Sciences, Karachi (বাংলাদেশ/দক্ষিণ এশিয়া আদর্শ)</option>
              <option value="mwl">Muslim World League (MWL)</option>
              <option value="makkah">Umm al-Qura University, Makkah</option>
              <option value="egypt">Egyptian General Authority of Survey</option>
              <option value="isna">Islamic Society of North America (ISNA)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-stone-300 block">Asr Juristic Method (আসর মাজহাব পদ্ধতি)</label>
            <select
              value={juristicMethod}
              onChange={(e) => setJuristicMethod(e.target.value as JuristicMethod)}
              className="w-full px-3 py-2.5 rounded-lg bg-stone-900 border border-stone-800 text-white"
            >
              <option value="hanafi">হানাফি (ছায়া দ্বিগুণ হলে আসর)</option>
              <option value="shafii">শাফেয়ী / মালেকি / হাম্বলি (ছায়া একগুণ)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-stone-300 block">ডিফল্ট জেলা / লোকেশন (Default Location)</label>
            <select
              value={defaultDistrictId}
              onChange={(e) => setDefaultDistrictId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-stone-900 border border-stone-800 text-white"
            >
              {BANGLADESH_DISTRICTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nameBn} ({d.nameEn}) — {d.division}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-stone-300 block">টাইমজোন (Timezone Configuration)</label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-stone-900 border border-stone-800 text-white font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-stone-300 block">হিজরি তারিখ সমন্বয় (Hijri Day Adjustment)</label>
            <input
              type="number"
              min={-3}
              max={3}
              value={hijriDayAdjustment}
              onChange={(e) => setHijriDayAdjustment(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-lg bg-stone-900 border border-stone-800 text-white font-mono"
            />
          </div>
        </div>

        {/* Minute Offsets */}
        <div className="pt-2 border-t border-stone-800 space-y-3">
          <h4 className="text-xs font-bold text-stone-300">
            সতর্কতামূলক মিনিট সমন্বয় (Global Minute Offsets: -30 থেকে +30 মিনিট)
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="text-stone-400 block mb-1">ফজর (Fajr)</label>
              <input
                type="number"
                min={-30}
                max={30}
                value={fajrOffset}
                onChange={(e) => setFajrOffset(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-stone-400 block mb-1">যোহর (Dhuhr)</label>
              <input
                type="number"
                min={-30}
                max={30}
                value={dhuhrOffset}
                onChange={(e) => setDhuhrOffset(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-stone-400 block mb-1">আসর (Asr)</label>
              <input
                type="number"
                min={-30}
                max={30}
                value={asrOffset}
                onChange={(e) => setAsrOffset(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-stone-400 block mb-1">মাগরিব (Maghrib)</label>
              <input
                type="number"
                min={-30}
                max={30}
                value={maghribOffset}
                onChange={(e) => setMaghribOffset(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-stone-400 block mb-1">এশা (Isha)</label>
              <input
                type="number"
                min={-30}
                max={30}
                value={ishaOffset}
                onChange={(e) => setIshaOffset(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white font-mono"
              />
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-[#177a56] hover:bg-[#136647] text-white text-xs font-bold cursor-pointer"
          >
            {saving ? 'সংরক্ষণ হচ্ছে...' : 'কনফিগারেশন সংরক্ষণ ও সিঙ্ক করুন'}
          </button>
        </div>
      </form>

      {/* Live Astronomical Engine Preview */}
      <div className="bg-[#131b17] border border-stone-800 rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white">
            লাইভ ক্যালকুলেশন ইঞ্জিন প্রিভিউ
          </h3>
          <p className="text-xs text-stone-400 mt-0.5">
            {selectedDistrict.nameBn} ({selectedDistrict.lat.toFixed(2)}°N, {selectedDistrict.lng.toFixed(2)}°E) — আজকের প্রকৃত সূর্য-অবস্থানভিত্তিক ওয়াক্ত:
          </p>
        </div>

        <div className="space-y-2 text-xs">
          {[
            { label: 'ফজর (Fajr)', time: previewTimes.fajr },
            { label: 'সূর্যোদয় (Sunrise)', time: previewTimes.sunrise },
            { label: 'যোহর (Dhuhr)', time: previewTimes.dhuhr },
            { label: 'আসর (Asr)', time: previewTimes.asr },
            { label: 'মাগরিব (Maghrib)', time: previewTimes.maghrib },
            { label: 'এশা (Isha)', time: previewTimes.isha }
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-stone-900 border border-stone-800"
            >
              <span className="text-stone-300 font-medium">{row.label}</span>
              <span className="font-mono font-bold text-emerald-400 tabular-nums">{row.time}</span>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-lg bg-stone-900/60 border border-stone-800 text-[11px] text-stone-400 space-y-1">
          <div>হিজরি তারিখ: <strong className="text-stone-200">{previewTimes.hijriDateStr}</strong></div>
          <div>বঙ্গাব্দ: <strong className="text-stone-200">{previewTimes.bengaliDateStr}</strong></div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. AZAN MANAGEMENT MODULE
// ============================================================================
export const AdminAzanManagement: React.FC<{
  admin: AdminAccount;
  azanCatalog: AzanAudioConfig[];
}> = ({ admin, azanCatalog }) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [replacingAzan, setReplacingAzan] = useState<AzanAudioConfig | null>(null);

  const [nameBn, setNameBn] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [reciterName, setReciterName] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [prayerType, setPrayerType] = useState<'all' | 'fajr'>('all');
  const [licenseInfo, setLicenseInfo] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [verifiedDuration, setVerifiedDuration] = useState<number | null>(null);
  const [verifyingAudio, setVerifyingAudio] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const stopPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlayingId(null);
  };

  const togglePreview = (azan: AzanAudioConfig) => {
    if (playingId === azan.id) {
      stopPreview();
      return;
    }
    stopPreview();
    const audio = new Audio(azan.audioUrl);
    audioRef.current = audio;
    setPlayingId(azan.id);
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
    audio.play().catch(() => setPlayingId(null));
  };

  const handleFileUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError(null);
    setVerifiedDuration(null);

    if (file.size > 700 * 1024) {
      // If file is larger than Firestore doc limit, guide to use URL or compressed MP3
      setFormError(
        'সরাসরি ডাটাবেস ডকুমেন্টে আপলোডের জন্য অডিও ফাইলটি ৭০০ KB-এর নিচে হতে হবে, অথবা যেকোনো আকারের পূর্ণাঙ্গ আজানের জন্য সরাসরি লাইসেন্সকৃত HTTPS Audio URL প্রদান করুন।'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || '');
      setAudioUrl(dataUrl);
      setVerifyingAudio(true);
      try {
        const dur = await validateAudioDurationSeconds(dataUrl);
        setVerifiedDuration(dur);
      } catch (err: any) {
        setFormError(err?.message || 'অডিও যাচাই ব্যর্থ হয়েছে।');
        setVerifiedDuration(null);
      } finally {
        setVerifyingAudio(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleVerifyUrl = async (urlToTest: string) => {
    setFormError(null);
    setVerifiedDuration(null);
    if (!urlToTest.trim()) return;
    setVerifyingAudio(true);
    try {
      const dur = await validateAudioDurationSeconds(urlToTest.trim());
      setVerifiedDuration(dur);
    } catch (err: any) {
      setFormError(err?.message || 'অডিও যাচাই ব্যর্থ হয়েছে।');
    } finally {
      setVerifyingAudio(false);
    }
  };

  const handleSaveNewAzan = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!nameBn.trim() || !reciterName.trim() || !audioUrl.trim()) {
      setFormError('অনুগ্রহ করে আজানের নাম, মুয়াজ্জিনের নাম এবং অডিও প্রদান করুন।');
      return;
    }

    setSaving(true);
    try {
      const dur = verifiedDuration || (await validateAudioDurationSeconds(audioUrl.trim()));
      const id = replacingAzan ? replacingAzan.id : `azan_custom_${Date.now()}`;
      const payload: AzanAudioConfig = {
        id,
        nameBn: nameBn.trim().slice(0, 200),
        nameEn: (nameEn.trim() || nameBn.trim()).slice(0, 200),
        reciterName: reciterName.trim().slice(0, 200),
        sourceName: (sourceName.trim() || 'ইসলামিক অডিও আর্কাইভ').slice(0, 200),
        descriptionBn: `${reciterName.trim()} এর কণ্ঠে পূর্ণাঙ্গ আজান`,
        badgeBn: prayerType === 'fajr' ? 'ফজর বিশেষ' : 'পূর্ণাঙ্গ আজান',
        audioUrl: audioUrl.trim(),
        durationSeconds: dur,
        isActive: true,
        isBuiltIn: replacingAzan?.isBuiltIn || false,
        prayerType,
        licenseInfo: (licenseInfo.trim() || 'Licensed Full Azan Audio').slice(0, 500),
        updatedAt: Date.now(),
        updatedBy: admin.email
      };

      await setDoc(doc(db, 'azan_catalog', id), payload);
      await recordAdminAuditLog(
        admin,
        replacingAzan ? 'AZAN_REPLACE' : 'AZAN_UPLOAD',
        `${replacingAzan ? 'আজান অডিও রিপ্লেস' : 'নতুন পূর্ণাঙ্গ আজান যুক্ত'}: ${payload.nameBn} (${dur} সেকেন্ড)`,
        'azan_catalog',
        id
      );

      setShowAddModal(false);
      setReplacingAzan(null);
      setNameBn('');
      setNameEn('');
      setReciterName('');
      setSourceName('');
      setLicenseInfo('');
      setAudioUrl('');
      setVerifiedDuration(null);
    } catch (err: any) {
      setFormError(err?.message || 'আজান সংরক্ষণ করা যায়নি।');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (azan: AzanAudioConfig) => {
    try {
      const nextActive = !azan.isActive;
      await setDoc(
        doc(db, 'azan_catalog', azan.id),
        { ...azan, isActive: nextActive, updatedAt: Date.now(), updatedBy: admin.email },
        { merge: true }
      );
      await recordAdminAuditLog(
        admin,
        nextActive ? 'AZAN_ACTIVATE' : 'AZAN_DEACTIVATE',
        `আজান "${azan.nameBn}" ${nextActive ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Inactive)'} করা হয়েছে।`,
        'azan_catalog',
        azan.id
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `azan_catalog/${azan.id}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#131b17] p-4 rounded-xl border border-stone-800">
        <div>
          <h3 className="text-sm font-bold text-white">আজান অডিও ম্যানেজমেন্ট (Full Azan Catalog)</h3>
          <p className="text-xs text-stone-400">
            কোনো ২-সেকেন্ডের নোটিফিকেশন টোন পূর্ণাঙ্গ আজান হিসেবে গ্রহণ করা হয় না (সর্বনিম্ন ৩০ সেকেন্ডের পূর্ণাঙ্গ আজান বাধ্যতামূলক)।
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => initializeBuiltInAzansIfNeeded(admin)}
            className="px-3.5 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-xs font-semibold text-stone-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>ডিফল্ট আজান সিঙ্ক</span>
          </button>
          <button
            onClick={() => {
              setReplacingAzan(null);
              setNameBn('');
              setReciterName('');
              setAudioUrl('');
              setVerifiedDuration(null);
              setFormError(null);
              setShowAddModal(true);
            }}
            className="px-4 py-2 rounded-lg bg-[#177a56] hover:bg-[#136647] text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>নতুন আজান আপলোড</span>
          </button>
        </div>
      </div>

      {/* Azan List Table */}
      <div className="bg-[#131b17] rounded-xl border border-stone-800 overflow-hidden">
        {azanCatalog.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-xs text-stone-400">
              ডাটাবেস ক্যাটালগে এখনো আজান সিঙ্ক করা হয়নি। অ্যাপের ৫টি বিল্ট-ইন পূর্ণাঙ্গ আজান ক্যাটালগে লোড করতে নিচের বাটনে ক্লিক করুন:
            </p>
            <button
              onClick={() => initializeBuiltInAzansIfNeeded(admin)}
              className="px-4 py-2 rounded-lg bg-[#177a56] text-white text-xs font-bold cursor-pointer"
            >
              ৫টি পূর্ণাঙ্গ আজান ডাটাবেসে সিঙ্ক করুন
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-800 bg-stone-900/50 text-stone-400">
                  <th className="py-3 px-4 font-semibold">আজানের নাম</th>
                  <th className="py-3 px-3 font-semibold">মুয়াজ্জিন / উৎস</th>
                  <th className="py-3 px-3 font-semibold">দৈর্ঘ্য ও ধরন</th>
                  <th className="py-3 px-3 font-semibold">স্ট্যাটাস</th>
                  <th className="py-3 px-4 font-semibold text-right">প্রিভিউ ও অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {azanCatalog.map((azan) => {
                  const isPlaying = playingId === azan.id;
                  return (
                    <tr key={azan.id} className="hover:bg-stone-900/40">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{azan.nameBn}</div>
                        <div className="text-[11px] text-stone-500">{azan.licenseInfo || 'Licensed Audio'}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-stone-200 font-medium">{azan.reciterName}</div>
                        <div className="text-[11px] text-stone-500">{azan.sourceName}</div>
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-stone-300">
                        {Math.floor(azan.durationSeconds / 60)}m {azan.durationSeconds % 60}s ·{' '}
                        {azan.prayerType === 'fajr' ? 'ফজর' : 'সকল ওয়াক্ত'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-semibold ${
                            azan.isActive ? 'text-emerald-400' : 'text-stone-500'
                          }`}
                        >
                          {azan.isActive ? 'Active (সক্রিয়)' : 'Inactive (নিষ্ক্রিয়)'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => togglePreview(azan)}
                            className={`px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer ${
                              isPlaying
                                ? 'bg-amber-500 text-stone-950 font-bold'
                                : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                            }`}
                          >
                            {isPlaying ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                            <span>{isPlaying ? 'থামান' : 'প্রিভিউ'}</span>
                          </button>

                          <button
                            onClick={() => handleToggleActive(azan)}
                            className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer"
                          >
                            {azan.isActive ? 'Deactivate' : 'Activate'}
                          </button>

                          <button
                            onClick={() => {
                              setReplacingAzan(azan);
                              setNameBn(azan.nameBn);
                              setNameEn(azan.nameEn || '');
                              setReciterName(azan.reciterName);
                              setSourceName(azan.sourceName || '');
                              setPrayerType(azan.prayerType || 'all');
                              setLicenseInfo(azan.licenseInfo || '');
                              setAudioUrl(azan.audioUrl);
                              setVerifiedDuration(azan.durationSeconds);
                              setFormError(null);
                              setShowAddModal(true);
                            }}
                            className="px-2.5 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 cursor-pointer"
                          >
                            Replace
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload / Replace Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveNewAzan}
            className="bg-[#131b17] border border-stone-800 rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {replacingAzan ? `আজান রিপ্লেস: ${replacingAzan.nameBn}` : 'নতুন লাইসেন্সকৃত পূর্ণাঙ্গ আজান আপলোড'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-xs text-stone-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-200 text-xs">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-stone-300 font-semibold mb-1">আজানের নাম (বাংলায়) *</label>
                <input
                  type="text"
                  required
                  value={nameBn}
                  onChange={(e) => setNameBn(e.target.value)}
                  placeholder="যেমন: মক্কা শরিফের আজান"
                  className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
                />
              </div>
              <div>
                <label className="block text-stone-300 font-semibold mb-1">মুয়াজ্জিন / ক্বারীর নাম *</label>
                <input
                  type="text"
                  required
                  value={reciterName}
                  onChange={(e) => setReciterName(e.target.value)}
                  placeholder="যেমন: শায়খ আলী আহমাদ মোল্লা"
                  className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
                />
              </div>
              <div>
                <label className="block text-stone-300 font-semibold mb-1">মসজিদ বা উৎস</label>
                <input
                  type="text"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder="যেমন: মসজিদুল হারাম"
                  className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
                />
              </div>
              <div>
                <label className="block text-stone-300 font-semibold mb-1">ওয়াক্তের ধরন</label>
                <select
                  value={prayerType}
                  onChange={(e) => setPrayerType(e.target.value as 'all' | 'fajr')}
                  className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
                >
                  <option value="all">সকল ওয়াক্তের সাধারণ আজান</option>
                  <option value="fajr">ফজর বিশেষ আজান</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block text-stone-300 font-semibold">
                অডিও ফাইল আপলোড অথবা লাইসেন্সকৃত অডিও স্ট্রিম URL *
              </label>
              <input
                type="file"
                accept="audio/mp3,audio/mpeg,audio/wav,audio/ogg"
                onChange={handleFileUploadChange}
                className="w-full text-xs text-stone-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-stone-800 file:text-stone-200 hover:file:bg-stone-700"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={audioUrl}
                  onChange={(e) => {
                    setAudioUrl(e.target.value);
                    setVerifiedDuration(null);
                  }}
                  placeholder="অথবা অডিও URL দিন (যেমন: /audio/azan_makkah.mp3 বা https://...)"
                  className="flex-1 px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleVerifyUrl(audioUrl)}
                  className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold cursor-pointer whitespace-nowrap"
                >
                  {verifyingAudio ? 'যাচাই হচ্ছে...' : 'দৈর্ঘ্য যাচাই'}
                </button>
              </div>
              {verifiedDuration !== null && (
                <p className="text-emerald-400 font-semibold">
                  ✓ পূর্ণাঙ্গ আজান যাচাইকৃত (দৈর্ঘ্য: {verifiedDuration} সেকেন্ড)
                </p>
              )}
            </div>

            <div className="text-xs">
              <label className="block text-stone-300 font-semibold mb-1">লাইসেন্স / কপিরাইট তথ্য</label>
              <input
                type="text"
                value={licenseInfo}
                onChange={(e) => setLicenseInfo(e.target.value)}
                placeholder="যেমন: Public Domain / Properly Licensed Recording"
                className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-lg bg-stone-800 text-xs font-semibold text-stone-300 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={saving || verifyingAudio}
                className="px-4 py-2 rounded-lg bg-[#177a56] hover:bg-[#136647] text-xs font-bold text-white cursor-pointer"
              >
                {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 5. CONTENT MANAGEMENT (CMS) MODULE
// ============================================================================
export const AdminContentManagement: React.FC<{
  admin: AdminAccount;
  contents: ManagedContentItem[];
}> = ({ admin, contents }) => {
  const [filterType, setFilterType] = useState<'all' | CmsContentType>('all');
  const [editingItem, setEditingItem] = useState<ManagedContentItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [type, setType] = useState<CmsContentType>('dua');
  const [titleBn, setTitleBn] = useState('');
  const [categoryBn, setCategoryBn] = useState('');
  const [arabic, setArabic] = useState('');
  const [transliteration, setTransliteration] = useState('');
  const [translationBn, setTranslationBn] = useState('');
  const [reference, setReference] = useState('');
  const [status, setStatus] = useState<'draft' | 'published' | 'unpublished'>('published');

  const filtered = useMemo(() => {
    if (filterType === 'all') return contents;
    return contents.filter((c) => c.type === filterType);
  }, [contents, filterType]);

  const openCreate = () => {
    setEditingItem(null);
    setType('dua');
    setTitleBn('');
    setCategoryBn('দৈনন্দিন দোয়া');
    setArabic('');
    setTransliteration('');
    setTranslationBn('');
    setReference('');
    setStatus('published');
    setIsModalOpen(true);
  };

  const openEdit = (item: ManagedContentItem) => {
    setEditingItem(item);
    setType(item.type);
    setTitleBn(item.titleBn);
    setCategoryBn(item.categoryBn || '');
    setArabic(item.arabic || '');
    setTransliteration(item.transliteration || '');
    setTranslationBn(item.translationBn);
    setReference(item.reference || '');
    setStatus(item.status);
    setIsModalOpen(true);
  };

  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleBn.trim() || !translationBn.trim()) return;
    const now = Date.now();
    const id = editingItem ? editingItem.id : `cms_${now}`;
    const payload: ManagedContentItem = {
      id,
      type,
      titleBn: titleBn.trim().slice(0, 300),
      categoryBn: (categoryBn.trim() || 'সাধারণ').slice(0, 150),
      arabic: arabic.trim().slice(0, 5000),
      transliteration: transliteration.trim().slice(0, 5000),
      translationBn: translationBn.trim().slice(0, 10000),
      reference: (reference.trim() || 'সহিহ সূত্র').slice(0, 300),
      status,
      publishDate: new Date().toISOString().slice(0, 10),
      createdAt: editingItem ? editingItem.createdAt : now,
      updatedAt: now,
      createdBy: admin.email
    };

    try {
      await setDoc(doc(db, 'cms_contents', id), payload);
      await recordAdminAuditLog(
        admin,
        editingItem ? 'CONTENT_EDIT' : 'CONTENT_CREATE',
        `${editingItem ? 'কনটেন্ট সম্পাদনা' : 'নতুন কনটেন্ট তৈরি'} (${type}): "${payload.titleBn}" [স্ট্যাটাস: ${status}]`,
        'cms_contents',
        id
      );
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `cms_contents/${id}`);
    }
  };

  const handleTogglePublish = async (item: ManagedContentItem) => {
    const nextStatus = item.status === 'published' ? 'unpublished' : 'published';
    try {
      await setDoc(
        doc(db, 'cms_contents', item.id),
        { ...item, status: nextStatus, updatedAt: Date.now() },
        { merge: true }
      );
      await recordAdminAuditLog(
        admin,
        nextStatus === 'published' ? 'CONTENT_PUBLISH' : 'CONTENT_UNPUBLISH',
        `কনটেন্ট "${item.titleBn}" ${nextStatus === 'published' ? 'Publish' : 'Unpublish'} করা হয়েছে।`,
        'cms_contents',
        item.id
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `cms_contents/${item.id}`);
    }
  };

  const handleDeleteContent = async (item: ManagedContentItem) => {
    try {
      await deleteDoc(doc(db, 'cms_contents', item.id));
      await recordAdminAuditLog(
        admin,
        'CONTENT_DELETE',
        `কনটেন্ট "${item.titleBn}" ডিলিট করা হয়েছে।`,
        'cms_contents',
        item.id
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `cms_contents/${item.id}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#131b17] p-4 rounded-xl border border-stone-800">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-900 rounded-lg border border-stone-800 text-xs">
          {[
            { id: 'all', label: 'সকল কনটেন্ট' },
            { id: 'dua', label: 'দোয়া কনটেন্ট' },
            { id: 'article', label: 'ইসলামিক আর্টিকেল' },
            { id: 'daily_amal', label: 'দৈনিক আমল' },
            { id: 'notification_template', label: 'নোটিফিকেশন মেসেজ' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
                filterType === tab.id ? 'bg-[#177a56] text-white' : 'text-stone-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-lg bg-[#177a56] hover:bg-[#136647] text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন কনটেন্ট তৈরি করুন</span>
        </button>
      </div>

      <div className="bg-[#131b17] rounded-xl border border-stone-800 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500">
            কোনো পরিবর্তনযোগ্য কনটেন্ট পাওয়া যায়নি। নতুন দোয়া, আর্টিকেল বা দৈনিক আমল যুক্ত করতে উপরে "নতুন কনটেন্ট তৈরি করুন" বাটনে ক্লিক করুন।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-800 bg-stone-900/50 text-stone-400">
                  <th className="py-3 px-4 font-semibold">শিরোনাম</th>
                  <th className="py-3 px-3 font-semibold">ধরন</th>
                  <th className="py-3 px-3 font-semibold">রেফারেন্স</th>
                  <th className="py-3 px-3 font-semibold">স্ট্যাটাস</th>
                  <th className="py-3 px-4 font-semibold text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-900/40">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{item.titleBn}</div>
                      <div className="text-[11px] text-stone-400 line-clamp-1 max-w-md">
                        {item.translationBn}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-stone-300">{item.type}</td>
                    <td className="py-3 px-3 text-stone-400">{item.reference}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-semibold ${
                          item.status === 'published'
                            ? 'text-emerald-400'
                            : item.status === 'draft'
                            ? 'text-amber-400'
                            : 'text-stone-500'
                        }`}
                      >
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleTogglePublish(item)}
                          className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer"
                        >
                          {item.status === 'published' ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          onClick={() => openEdit(item)}
                          className="px-2.5 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteContent(item)}
                          className="p-1.5 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveContent}
            className="bg-[#131b17] border border-stone-800 rounded-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingItem ? 'কনটেন্ট সম্পাদনা করুন' : 'নতুন কনটেন্ট তৈরি করুন'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-stone-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-stone-300 font-semibold mb-1">কনটেন্টের ধরন *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as CmsContentType)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
                >
                  <option value="dua">দোয়া কনটেন্ট (Dua)</option>
                  <option value="article">ইসলামিক আর্টিকেল (Article)</option>
                  <option value="daily_amal">দৈনিক আমল (Daily Amal)</option>
                  <option value="notification_template">নোটিফিকেশন মেসেজ (Notification Message)</option>
                </select>
              </div>
              <div>
                <label className="block text-stone-300 font-semibold mb-1">স্ট্যাটাস *</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
                >
                  <option value="published">Published (প্রকাশিত)</option>
                  <option value="draft">Draft (খসড়া)</option>
                  <option value="unpublished">Unpublished (অপ্রকাশিত)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-stone-300 font-semibold mb-1">শিরোনাম (বাংলায়) *</label>
                <input
                  type="text"
                  required
                  value={titleBn}
                  onChange={(e) => setTitleBn(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
                />
              </div>
              <div>
                <label className="block text-stone-300 font-semibold mb-1">ক্যাটাগরি</label>
                <input
                  type="text"
                  value={categoryBn}
                  onChange={(e) => setCategoryBn(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
                />
              </div>
              <div>
                <label className="block text-stone-300 font-semibold mb-1">সহিহ রেফারেন্স / দলিল</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="যেমন: সহিহ বুখারি: ৬৩০৭"
                  className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-stone-300 font-semibold mb-1">আরবি পাঠ (ঐচ্ছিক)</label>
                <textarea
                  rows={2}
                  dir="rtl"
                  value={arabic}
                  onChange={(e) => setArabic(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white font-arabic text-base"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-stone-300 font-semibold mb-1">বাংলা উচ্চারণ (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={transliteration}
                  onChange={(e) => setTransliteration(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-stone-300 font-semibold mb-1">মূল বাংলা অনুবাদ / বিস্তারিত বিবরণ *</label>
                <textarea
                  rows={4}
                  required
                  value={translationBn}
                  onChange={(e) => setTranslationBn(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-stone-800 text-xs font-semibold text-stone-300 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#177a56] hover:bg-[#136647] text-xs font-bold text-white cursor-pointer"
              >
                সংরক্ষণ করুন
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 6. QUIZ MANAGEMENT MODULE
// ============================================================================
export const AdminQuizManagement: React.FC<{
  admin: AdminAccount;
  quizzes: ManagedQuizQuestion[];
}> = ({ admin, quizzes }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<ManagedQuizQuestion | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [questionBn, setQuestionBn] = useState('');
  const [categoryBn, setCategoryBn] = useState('আকিদা ও ইমান');
  const [difficulty, setDifficulty] = useState<'সহজ' | 'মাঝারি' | 'কঠিন'>('সহজ');
  const [option0, setOption0] = useState('');
  const [option1, setOption1] = useState('');
  const [option2, setOption2] = useState('');
  const [option3, setOption3] = useState('');
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number>(0);
  const [explanationBn, setExplanationBn] = useState('');
  const [reference, setReference] = useState('');
  const [publishDate, setPublishDate] = useState(todayStr);
  const [expiryDate, setExpiryDate] = useState('');
  const [status, setStatus] = useState<'draft' | 'published' | 'unpublished'>('published');

  const openCreateQuiz = () => {
    setEditingQuiz(null);
    setQuestionBn('');
    setCategoryBn('আকিদা ও ইমান');
    setDifficulty('সহজ');
    setOption0('');
    setOption1('');
    setOption2('');
    setOption3('');
    setCorrectAnswerIndex(0);
    setExplanationBn('');
    setReference('');
    setPublishDate(todayStr);
    setExpiryDate('');
    setStatus('published');
    setIsModalOpen(true);
  };

  const openEditQuiz = async (q: ManagedQuizQuestion) => {
    setEditingQuiz(q);
    setQuestionBn(q.questionBn);
    setCategoryBn(q.categoryBn);
    setDifficulty(q.difficulty);
    setOption0(q.optionsBn[0] || '');
    setOption1(q.optionsBn[1] || '');
    setOption2(q.optionsBn[2] || '');
    setOption3(q.optionsBn[3] || '');
    setExplanationBn(q.explanationBn);
    setReference(q.reference);
    setPublishDate(q.publishDate || todayStr);
    setExpiryDate(q.expiryDate || '');
    setStatus(q.status);

    // Fetch protected correctAnswerIndex from /quiz_secrets/{quizId}
    try {
      const secretSnap = await getDoc(doc(db, 'quiz_secrets', q.id));
      if (secretSnap.exists()) {
        setCorrectAnswerIndex(Number(secretSnap.data().correctAnswerIndex) || 0);
      }
    } catch {}
    setIsModalOpen(true);
  };

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = Date.now();
    const quizId = editingQuiz ? editingQuiz.id : `quiz_${now}`;

    const publicQuizDoc: ManagedQuizQuestion = {
      id: quizId,
      category: 'islamic',
      categoryBn: categoryBn.trim().slice(0, 150),
      difficulty,
      questionBn: questionBn.trim().slice(0, 1000),
      optionsBn: [
        option0.trim().slice(0, 200),
        option1.trim().slice(0, 200),
        option2.trim().slice(0, 200),
        option3.trim().slice(0, 200)
      ],
      explanationBn: explanationBn.trim().slice(0, 2000),
      reference: reference.trim().slice(0, 300),
      publishDate: publishDate || todayStr,
      expiryDate: expiryDate || '',
      status,
      createdAt: editingQuiz ? editingQuiz.createdAt : now,
      updatedAt: now,
      createdBy: admin.email
    };

    try {
      // 1. Save public question without correctAnswerIndex
      await setDoc(doc(db, 'quizzes', quizId), publicQuizDoc);
      // 2. Save protected answer in /quiz_secrets/{quizId}
      await setDoc(doc(db, 'quiz_secrets', quizId), {
        quizId,
        correctAnswerIndex: Number(correctAnswerIndex),
        updatedAt: now
      });

      await recordAdminAuditLog(
        admin,
        editingQuiz ? 'QUIZ_UPDATE' : 'QUIZ_CREATE',
        `${editingQuiz ? 'কুইজ আপডেট' : 'নতুন কুইজ তৈরি'}: "${publicQuizDoc.questionBn.slice(0, 80)}" (Publish: ${publicQuizDoc.publishDate})`,
        'quizzes',
        quizId
      );
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `quizzes/${quizId}`);
    }
  };

  const handleDeleteQuiz = async (q: ManagedQuizQuestion) => {
    try {
      await deleteDoc(doc(db, 'quizzes', q.id));
      try {
        await deleteDoc(doc(db, 'quiz_secrets', q.id));
      } catch {}
      await recordAdminAuditLog(
        admin,
        'QUIZ_DELETE',
        `কুইজ ডিলিট করা হয়েছে: "${q.questionBn.slice(0, 80)}"`,
        'quizzes',
        q.id
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `quizzes/${q.id}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#131b17] p-4 rounded-xl border border-stone-800">
        <div>
          <h3 className="text-sm font-bold text-white">কুইজ ম্যানেজমেন্ট (Daily & Scheduled Quiz)</h3>
          <p className="text-xs text-stone-400">
            কুইজের সঠিক উত্তর (Correct Answer) আলাদা সুরক্ষিত <code className="text-emerald-400">quiz_secrets</code> কালেকশনে সংরক্ষিত থাকে, যাতে উত্তর দেওয়ার আগে অ্যাপ ব্যবহারকারীর কাছে প্রকাশ না পায়।
          </p>
        </div>

        <button
          onClick={openCreateQuiz}
          className="px-4 py-2 rounded-lg bg-[#177a56] hover:bg-[#136647] text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন কুইজ যুক্ত করুন</span>
        </button>
      </div>

      <div className="bg-[#131b17] rounded-xl border border-stone-800 overflow-hidden">
        {quizzes.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500">
            কোনো কাস্টম কুইজ পাওয়া যায়নি। নতুন কুইজ তৈরি করলে নির্ধারিত Publish Date অনুযায়ী স্বয়ংক্রিয়ভাবে অ্যাপে প্রদর্শিত হবে।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-800 bg-stone-900/50 text-stone-400">
                  <th className="py-3 px-4 font-semibold">প্রশ্ন ও ক্যাটাগরি</th>
                  <th className="py-3 px-3 font-semibold">প্রকাশের তারিখ</th>
                  <th className="py-3 px-3 font-semibold">মেয়াদ শেষ</th>
                  <th className="py-3 px-3 font-semibold">স্ট্যাটাস</th>
                  <th className="py-3 px-4 font-semibold text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {quizzes.map((q) => (
                  <tr key={q.id} className="hover:bg-stone-900/40">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{q.questionBn}</div>
                      <div className="text-[11px] text-stone-400">
                        {q.categoryBn} · {q.difficulty} · রেফারেন্স: {q.reference}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums text-stone-300">
                      {q.publishDate}
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums text-stone-400">
                      {q.expiryDate || 'চলমান'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-semibold ${
                          q.status === 'published' ? 'text-emerald-400' : 'text-stone-500'
                        }`}
                      >
                        {q.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openEditQuiz(q)}
                          className="px-2.5 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteQuiz(q)}
                          className="p-1.5 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveQuiz}
            className="bg-[#131b17] border border-stone-800 rounded-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingQuiz ? 'কুইজ সম্পাদনা' : 'নতুন কুইজ তৈরি করুন'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-stone-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-300 font-semibold mb-1">প্রশ্ন (Question) *</label>
                <input
                  type="text"
                  required
                  value={questionBn}
                  onChange={(e) => setQuestionBn(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">ক্যাটাগরি</label>
                  <input
                    type="text"
                    required
                    value={categoryBn}
                    onChange={(e) => setCategoryBn(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">স্তর (Difficulty)</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
                  >
                    <option value="সহজ">সহজ</option>
                    <option value="মাঝারি">মাঝারি</option>
                    <option value="কঠিন">কঠিন</option>
                  </select>
                </div>
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">স্ট্যাটাস</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="unpublished">Unpublished</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">অপশন ১ (Index 0) *</label>
                  <input
                    type="text"
                    required
                    value={option0}
                    onChange={(e) => setOption0(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">অপশন ২ (Index 1) *</label>
                  <input
                    type="text"
                    required
                    value={option1}
                    onChange={(e) => setOption1(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">অপশন ৩ (Index 2) *</label>
                  <input
                    type="text"
                    required
                    value={option2}
                    onChange={(e) => setOption2(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">অপশন ৪ (Index 3) *</label>
                  <input
                    type="text"
                    required
                    value={option3}
                    onChange={(e) => setOption3(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-emerald-400 font-bold mb-1">
                    সঠিক উত্তর (গোপন থাকবে) *
                  </label>
                  <select
                    value={correctAnswerIndex}
                    onChange={(e) => setCorrectAnswerIndex(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-emerald-700 text-white"
                  >
                    <option value={0}>অপশন ১</option>
                    <option value={1}>অপশন ২</option>
                    <option value={2}>অপশন ৩</option>
                    <option value={3}>অপশন ৪</option>
                  </select>
                </div>
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">Publish Date *</label>
                  <input
                    type="date"
                    required
                    value={publishDate}
                    onChange={(e) => setPublishDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">Expiry Date (ঐচ্ছিক)</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">ব্যাখ্যা (Explanation) *</label>
                <textarea
                  rows={2}
                  required
                  value={explanationBn}
                  onChange={(e) => setExplanationBn(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">সহিহ রেফারেন্স (Reference) *</label>
                <input
                  type="text"
                  required
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="যেমন: সূরা বাকারা: ১৮৫ / সহিহ মুসলিম"
                  className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-stone-800 text-xs font-semibold text-stone-300 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#177a56] hover:bg-[#136647] text-xs font-bold text-white cursor-pointer"
              >
                সংরক্ষণ করুন
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
