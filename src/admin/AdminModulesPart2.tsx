import React, { useState, useMemo } from 'react';
import {
  Bell,
  Megaphone,
  BarChart3,
  Trophy,
  ShieldCheck,
  FileSpreadsheet,
  Plus,
  Send,
  Calendar,
  XCircle,
  Trash2,
  Flag,
  CheckCircle2,
  RefreshCw,
  Search,
  AlertTriangle,
  UserPlus
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  doc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import {
  AdminAccount,
  AdminRole,
  ManagedUserRecord,
  ManagedNotification,
  AppAnnouncement,
  RankingModerationFlag,
  AdminAuditLog
} from '../types/admin';
import {
  recordAdminAuditLog,
  auditAndRecalculateUserRanking,
  BOOTSTRAPPED_SUPER_ADMIN_EMAIL
} from './adminService';

// ============================================================================
// 7. NOTIFICATION MANAGEMENT MODULE
// ============================================================================
export const AdminNotificationManagement: React.FC<{
  admin: AdminAccount;
  notifications: ManagedNotification[];
}> = ({ admin, notifications }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all_users' | 'active_users' | 'new_users'>('all_users');
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [sending, setSending] = useState(false);

  const handleCreateNotification = async (mode: 'send_now' | 'schedule') => {
    if (!title.trim() || !message.trim()) return;
    if (mode === 'schedule' && !scheduleDateTime) return;

    setSending(true);
    const now = Date.now();
    const id = `notif_${now}`;
    const status = mode === 'send_now' ? 'sent' : 'scheduled';

    const payload: ManagedNotification = {
      id,
      title: title.trim().slice(0, 250),
      message: message.trim().slice(0, 2000),
      targetAudience,
      status,
      scheduledFor: mode === 'schedule' ? scheduleDateTime : new Date(now).toISOString(),
      sentAt: mode === 'send_now' ? now : null,
      createdAt: now,
      updatedAt: now,
      createdBy: admin.email
    };

    try {
      await setDoc(doc(db, 'admin_notifications', id), payload);
      await recordAdminAuditLog(
        admin,
        mode === 'send_now' ? 'NOTIFICATION_SEND' : 'NOTIFICATION_SCHEDULE',
        `${mode === 'send_now' ? 'তাৎক্ষণিক নোটিফিকেশন প্রেরণ' : 'নোটিফিকেশন শিডিউল'}: "${payload.title}" (Target: ${targetAudience})`,
        'admin_notifications',
        id
      );
      setTitle('');
      setMessage('');
      setScheduleDateTime('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `admin_notifications/${id}`);
    } finally {
      setSending(false);
    }
  };

  const handleCancelScheduled = async (notif: ManagedNotification) => {
    try {
      await setDoc(
        doc(db, 'admin_notifications', notif.id),
        { ...notif, status: 'cancelled', updatedAt: Date.now() },
        { merge: true }
      );
      await recordAdminAuditLog(
        admin,
        'NOTIFICATION_CANCEL',
        `শিডিউলকৃত নোটিফিকেশন বাতিল করা হয়েছে: "${notif.title}"`,
        'admin_notifications',
        notif.id
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `admin_notifications/${notif.id}`);
    }
  };

  const handleDispatchScheduledNow = async (notif: ManagedNotification) => {
    const now = Date.now();
    try {
      await setDoc(
        doc(db, 'admin_notifications', notif.id),
        { ...notif, status: 'sent', sentAt: now, updatedAt: now },
        { merge: true }
      );
      await recordAdminAuditLog(
        admin,
        'NOTIFICATION_SEND',
        `শিডিউলকৃত নোটিফিকেশন তাৎক্ষণিক প্রেরণ করা হয়েছে: "${notif.title}"`,
        'admin_notifications',
        notif.id
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `admin_notifications/${notif.id}`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Compose Notification Form */}
      <div className="bg-[#131b17] border border-stone-800 rounded-xl p-5 space-y-4">
        <div className="border-b border-stone-800 pb-3">
          <h3 className="text-sm font-bold text-white">নতুন নোটিফিকেশন তৈরি করুন</h3>
          <p className="text-xs text-stone-400 mt-0.5">
            সালাতের আজান নোটিফিকেশন এবং অ্যাডমিন নোটিফিকেশন সম্পূর্ণ আলাদা চ্যানেলে পরিচালিত হয়।
          </p>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-stone-300 font-semibold mb-1">শিরোনাম (Title) *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="যেমন: জুমুআর দিনের বিশেষ আমল"
              className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
            />
          </div>

          <div>
            <label className="block text-stone-300 font-semibold mb-1">বার্তা (Message) *</label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="নোটিফিকেশনের মূল বার্তা লিখুন..."
              className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
            />
          </div>

          <div>
            <label className="block text-stone-300 font-semibold mb-1">টার্গেট ব্যবহারকারী (Target Users)</label>
            <select
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
            >
              <option value="all_users">সকল ব্যবহারকারী (All Users)</option>
              <option value="active_users">সক্রিয় ব্যবহারকারী (Active Users)</option>
              <option value="new_users">নতুন ব্যবহারকারী (New Users)</option>
            </select>
          </div>

          <div>
            <label className="block text-stone-300 font-semibold mb-1">
              শিডিউল তারিখ ও সময় (Schedule Date/Time — ঐচ্ছিক)
            </label>
            <input
              type="datetime-local"
              value={scheduleDateTime}
              onChange={(e) => setScheduleDateTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white font-mono"
            />
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={sending || !title.trim() || !message.trim()}
              onClick={() => handleCreateNotification('send_now')}
              className="flex-1 py-2.5 px-3 rounded-lg bg-[#177a56] hover:bg-[#136647] disabled:opacity-50 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Now (এখনই পাঠান)</span>
            </button>

            <button
              type="button"
              disabled={sending || !title.trim() || !message.trim() || !scheduleDateTime}
              onClick={() => handleCreateNotification('schedule')}
              className="flex-1 py-2.5 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-200 font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Schedule করুন</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notification History & Scheduled Queue */}
      <div className="lg:col-span-2 bg-[#131b17] border border-stone-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-stone-800">
          <h3 className="text-sm font-bold text-white">নোটিফিকেশন তালিকা ও শিডিউল স্ট্যাটাস</h3>
        </div>

        {notifications.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500">
            এখনো কোনো অ্যাডমিন নোটিফিকেশন পাঠানো বা শিডিউল করা হয়নি।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-800 bg-stone-900/50 text-stone-400">
                  <th className="py-3 px-4 font-semibold">শিরোনাম ও বার্তা</th>
                  <th className="py-3 px-3 font-semibold">টার্গেট</th>
                  <th className="py-3 px-3 font-semibold">সময়</th>
                  <th className="py-3 px-3 font-semibold">স্ট্যাটাস</th>
                  <th className="py-3 px-4 font-semibold text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {notifications.map((n) => (
                  <tr key={n.id} className="hover:bg-stone-900/40">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{n.title}</div>
                      <div className="text-[11px] text-stone-400 max-w-sm line-clamp-1">
                        {n.message}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-stone-300">{n.targetAudience}</td>
                    <td className="py-3 px-3 font-mono tabular-nums text-stone-400 whitespace-nowrap">
                      {n.scheduledFor
                        ? new Date(n.scheduledFor).toLocaleString('bn-BD', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : '—'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-semibold ${
                          n.status === 'sent'
                            ? 'text-emerald-400'
                            : n.status === 'scheduled'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {n.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {n.status === 'scheduled' && (
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleDispatchScheduledNow(n)}
                            className="px-2.5 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 cursor-pointer"
                          >
                            Send Now
                          </button>
                          <button
                            onClick={() => handleCancelScheduled(n)}
                            className="px-2.5 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 8. APP ANNOUNCEMENT MODULE
// ============================================================================
export const AdminAnnouncementManagement: React.FC<{
  admin: AdminAccount;
  announcements: AppAnnouncement[];
}> = ({ admin, announcements }) => {
  const [titleBn, setTitleBn] = useState('');
  const [messageBn, setMessageBn] = useState('');
  const [type, setType] = useState<'update' | 'maintenance' | 'islamic_reminder' | 'new_feature'>('islamic_reminder');
  const [priority, setPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [status, setStatus] = useState<'draft' | 'published' | 'unpublished'>('published');
  const [expiryDate, setExpiryDate] = useState('');

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleBn.trim() || !messageBn.trim()) return;
    const now = Date.now();
    const id = `ann_${now}`;
    const payload: AppAnnouncement = {
      id,
      titleBn: titleBn.trim().slice(0, 250),
      messageBn: messageBn.trim().slice(0, 2000),
      type,
      priority,
      status,
      publishDate: new Date().toISOString().slice(0, 10),
      expiryDate: expiryDate || '',
      createdAt: now,
      updatedAt: now,
      createdBy: admin.email
    };

    try {
      await setDoc(doc(db, 'announcements', id), payload);
      await recordAdminAuditLog(
        admin,
        'ANNOUNCEMENT_PUBLISH',
        `অ্যানাউন্সমেন্ট তৈরি (${type}): "${payload.titleBn}" [${status}]`,
        'announcements',
        id
      );
      setTitleBn('');
      setMessageBn('');
      setExpiryDate('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `announcements/${id}`);
    }
  };

  const handleToggleStatus = async (ann: AppAnnouncement) => {
    const next = ann.status === 'published' ? 'unpublished' : 'published';
    try {
      await setDoc(
        doc(db, 'announcements', ann.id),
        { ...ann, status: next, updatedAt: Date.now() },
        { merge: true }
      );
      await recordAdminAuditLog(
        admin,
        next === 'published' ? 'ANNOUNCEMENT_PUBLISH' : 'ANNOUNCEMENT_UNPUBLISH',
        `অ্যানাউন্সমেন্ট "${ann.titleBn}" ${next} করা হয়েছে।`,
        'announcements',
        ann.id
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `announcements/${ann.id}`);
    }
  };

  const handleDelete = async (ann: AppAnnouncement) => {
    try {
      await deleteDoc(doc(db, 'announcements', ann.id));
      await recordAdminAuditLog(
        admin,
        'ANNOUNCEMENT_DELETE',
        `অ্যানাউন্সমেন্ট "${ann.titleBn}" ডিলিট করা হয়েছে।`,
        'announcements',
        ann.id
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `announcements/${ann.id}`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form
        onSubmit={handleCreateAnnouncement}
        className="bg-[#131b17] border border-stone-800 rounded-xl p-5 space-y-4"
      >
        <div className="border-b border-stone-800 pb-3">
          <h3 className="text-sm font-bold text-white">গুরুত্বপূর্ণ অ্যানাউন্সমেন্ট প্রকাশ করুন</h3>
          <p className="text-xs text-stone-400 mt-0.5">
            প্রকাশিত (Published) অ্যানাউন্সমেন্ট অ্যাপে স্বয়ংক্রিয়ভাবে রিয়েল-টাইমে প্রদর্শিত হবে।
          </p>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-stone-300 font-semibold mb-1">অ্যানাউন্সমেন্টের ধরন</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
            >
              <option value="islamic_reminder">Islamic Reminder (দ্বীনি রিমাইন্ডার)</option>
              <option value="update">New Update (নতুন আপডেট)</option>
              <option value="new_feature">New Feature (নতুন ফিচার)</option>
              <option value="maintenance">Maintenance (সিস্টেম রক্ষণাবেক্ষণ)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-stone-300 font-semibold mb-1">গুরুত্ব (Priority)</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
              >
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
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

          <div>
            <label className="block text-stone-300 font-semibold mb-1">শিরোনাম *</label>
            <input
              type="text"
              required
              value={titleBn}
              onChange={(e) => setTitleBn(e.target.value)}
              placeholder="যেমন: শাবান মাসের বিশেষ আমল ও রোজা"
              className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
            />
          </div>

          <div>
            <label className="block text-stone-300 font-semibold mb-1">বিস্তারিত বার্তা *</label>
            <textarea
              rows={3}
              required
              value={messageBn}
              onChange={(e) => setMessageBn(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
            />
          </div>

          <div>
            <label className="block text-stone-300 font-semibold mb-1">মেয়াদ শেষের তারিখ (ঐচ্ছিক)</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white font-mono"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-lg bg-[#177a56] hover:bg-[#136647] text-white font-bold cursor-pointer"
          >
            অ্যানাউন্সমেন্ট প্রকাশ করুন
          </button>
        </div>
      </form>

      <div className="lg:col-span-2 bg-[#131b17] border border-stone-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-stone-800">
          <h3 className="text-sm font-bold text-white">অ্যানাউন্সমেন্ট তালিকা</h3>
        </div>
        {announcements.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500">
            কোনো অ্যানাউন্সমেন্ট পাওয়া যায়নি।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-800 bg-stone-900/50 text-stone-400">
                  <th className="py-3 px-4 font-semibold">শিরোনাম ও বার্তা</th>
                  <th className="py-3 px-3 font-semibold">ধরন</th>
                  <th className="py-3 px-3 font-semibold">স্ট্যাটাস</th>
                  <th className="py-3 px-4 font-semibold text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {announcements.map((a) => (
                  <tr key={a.id} className="hover:bg-stone-900/40">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{a.titleBn}</div>
                      <div className="text-[11px] text-stone-400 max-w-md">{a.messageBn}</div>
                    </td>
                    <td className="py-3 px-3 text-stone-300">{a.type}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-semibold ${
                          a.status === 'published' ? 'text-emerald-400' : 'text-stone-500'
                        }`}
                      >
                        {a.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(a)}
                          className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer"
                        >
                          {a.status === 'published' ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          onClick={() => handleDelete(a)}
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
    </div>
  );
};

// ============================================================================
// 9. PRIVACY-SAFE AGGREGATE ANALYTICS MODULE
// ============================================================================
export const AdminAnalyticsView: React.FC<{
  users: ManagedUserRecord[];
}> = ({ users }) => {
  const analytics = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    let dau = 0;
    let wau = 0;
    let mau = 0;
    let appOpens = 0;
    let quranPages = 0;
    let quranMinutes = 0;
    let prayers = 0;
    let quizAnswered = 0;
    let quizCorrect = 0;
    let tasbih = 0;

    const langCounts = { bn: 0, en: 0 };
    const themeCounts = { light: 0, dark: 0, system: 0 };

    users.forEach((u) => {
      const lastAct = Number(u.lastActiveAt) || (u.joinedDate ? new Date(u.joinedDate).getTime() : 0);
      if (lastAct > 0) {
        if (now - lastAct <= dayMs) dau++;
        if (now - lastAct <= 7 * dayMs) wau++;
        if (now - lastAct <= 30 * dayMs) mau++;
      }

      appOpens += Number(u.appOpens) || 1;
      quranPages += Number(u.quranPagesRead) || 0;
      quranMinutes += Number(u.quranReadMinutes) || 0;
      prayers += Number(u.prayerCount) || 0;
      quizAnswered += Number(u.quizTotalAnswered) || 0;
      quizCorrect += Number(u.quizCorrectCount) || 0;
      tasbih += Number(u.tasbihCount) || 0;

      if (u.language === 'en') langCounts.en++;
      else langCounts.bn++;

      if (u.theme === 'light') themeCounts.light++;
      else if (u.theme === 'dark') themeCounts.dark++;
      else themeCounts.system++;
    });

    const featureChartData = [
      { name: 'সালাত (ওয়াক্ত)', count: prayers },
      { name: 'কুরআন (পৃষ্ঠা)', count: quranPages },
      { name: 'কুইজ অংশগ্রহণ', count: quizAnswered },
      { name: 'কুইজ সঠিক', count: quizCorrect },
      { name: 'অ্যাপ ওপেন', count: appOpens }
    ];

    return {
      dau,
      wau,
      mau,
      appOpens,
      quranPages,
      quranMinutes,
      prayers,
      quizAnswered,
      quizCorrect,
      tasbih,
      langCounts,
      themeCounts,
      featureChartData
    };
  }, [users]);

  const totalUsers = Math.max(1, users.length);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[#131b17] border border-stone-800">
          <span className="text-xs text-stone-400 block">মোট অ্যাপ ওপেন (App Opens)</span>
          <span className="text-2xl font-bold text-white font-mono tabular-nums mt-1 block">
            {analytics.appOpens}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-[#131b17] border border-stone-800">
          <span className="text-xs text-stone-400 block">সালাত ফিচার ব্যবহার</span>
          <span className="text-2xl font-bold text-emerald-400 font-mono tabular-nums mt-1 block">
            {analytics.prayers} ওয়াক্ত
          </span>
        </div>
        <div className="p-4 rounded-xl bg-[#131b17] border border-stone-800">
          <span className="text-xs text-stone-400 block">কুরআন ব্যবহার</span>
          <span className="text-2xl font-bold text-white font-mono tabular-nums mt-1 block">
            {analytics.quranPages} পৃষ্ঠা ({analytics.quranMinutes} মি.)
          </span>
        </div>
        <div className="p-4 rounded-xl bg-[#131b17] border border-stone-800">
          <span className="text-xs text-stone-400 block">তাসবিহ গণনা (Tasbih Usage)</span>
          <span className="text-2xl font-bold text-amber-400 font-mono tabular-nums mt-1 block">
            {analytics.tasbih} বার
          </span>
        </div>
      </div>

      {/* Feature Usage Chart */}
      <div className="bg-[#131b17] border border-stone-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white">
          প্রাইভেসি-সেফ সমষ্টিগত ফিচার ব্যবহার চার্ট (Aggregate Feature Activity)
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.featureChartData}>
              <XAxis dataKey="name" stroke="#a8a29e" fontSize={12} />
              <YAxis stroke="#a8a29e" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1c1917',
                  borderColor: '#292524',
                  color: '#f5f5f4',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="count" fill="#177a56" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Language & Theme Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#131b17] border border-stone-800 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white">ভাষা বিন্যাস (Language Distribution)</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-stone-300">বাংলা (bn)</span>
              <span className="font-mono font-bold text-white">
                {analytics.langCounts.bn} জন ({Math.round((analytics.langCounts.bn / totalUsers) * 100)}%)
              </span>
            </div>
            <div className="h-2 bg-stone-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#177a56]"
                style={{ width: `${Math.round((analytics.langCounts.bn / totalUsers) * 100)}%` }}
              />
            </div>

            <div className="flex justify-between pt-2">
              <span className="text-stone-300">English (en)</span>
              <span className="font-mono font-bold text-white">
                {analytics.langCounts.en} জন ({Math.round((analytics.langCounts.en / totalUsers) * 100)}%)
              </span>
            </div>
            <div className="h-2 bg-stone-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500"
                style={{ width: `${Math.round((analytics.langCounts.en / totalUsers) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-[#131b17] border border-stone-800 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white">থিম বিন্যাস (Theme Distribution)</h3>
          <div className="space-y-2 text-xs">
            {[
              { label: 'System Default', count: analytics.themeCounts.system, color: 'bg-emerald-500' },
              { label: 'Dark Mode', count: analytics.themeCounts.dark, color: 'bg-amber-500' },
              { label: 'Light Mode', count: analytics.themeCounts.light, color: 'bg-sky-500' }
            ].map((t) => (
              <div key={t.label} className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-300">{t.label}</span>
                  <span className="font-mono font-bold text-white">
                    {t.count} জন ({Math.round((t.count / totalUsers) * 100)}%)
                  </span>
                </div>
                <div className="h-2 bg-stone-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${t.color}`}
                    style={{ width: `${Math.round((t.count / totalUsers) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 10. RANKING / ACTIVITY & ABUSE DETECTION MODULE
// ============================================================================
export const AdminRankingActivityView: React.FC<{
  admin: AdminAccount;
  users: ManagedUserRecord[];
  flags: RankingModerationFlag[];
}> = ({ admin, users, flags }) => {
  const [flagModalUser, setFlagModalUser] = useState<ManagedUserRecord | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [auditingUserId, setAuditingUserId] = useState<string | null>(null);
  const [auditMessage, setAuditMessage] = useState<string | null>(null);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => (Number(b.totalCoins) || 0) - (Number(a.totalCoins) || 0));
  }, [users]);

  const handleFlagSuspicious = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagModalUser || !flagReason.trim()) return;
    const now = Date.now();
    const flagId = `flag_${flagModalUser.id}_${now}`;

    const flagDoc: RankingModerationFlag = {
      id: flagId,
      userId: flagModalUser.id,
      userName: flagModalUser.name || 'মুসাফির',
      reportedCoins: Number(flagModalUser.totalCoins) || 0,
      reportedStreak: Number(flagModalUser.streakDays) || 1,
      reason: flagReason.trim().slice(0, 500),
      status: 'flagged',
      flaggedBy: admin.email,
      createdAt: now,
      updatedAt: now
    };

    try {
      await setDoc(doc(db, 'ranking_flags', flagId), flagDoc);
      await setDoc(
        doc(db, 'users', flagModalUser.id),
        { ...flagModalUser, isFlagged: true, flagReason: flagDoc.reason, updatedAt: now },
        { merge: true }
      );
      await setDoc(
        doc(db, 'leaderboard', flagModalUser.id),
        {
          userId: flagModalUser.id,
          name: flagModalUser.name || 'মুসাফির',
          totalCoins: Number(flagModalUser.totalCoins) || 0,
          streakDays: Number(flagModalUser.streakDays) || 1,
          isFlagged: true,
          updatedAt: now
        },
        { merge: true }
      );
      await recordAdminAuditLog(
        admin,
        'RANKING_FLAG',
        `সন্দেহজনক র‌্যাংকিং অ্যাক্টিভিটির জন্য ${flagModalUser.name} (${flagModalUser.id}) কে ফ্ল্যাগ করা হয়েছে। কারণ: ${flagDoc.reason}`,
        'ranking_flags',
        flagId
      );
      setFlagModalUser(null);
      setFlagReason('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `ranking_flags/${flagId}`);
    }
  };

  const handleClearFlag = async (u: ManagedUserRecord) => {
    const now = Date.now();
    try {
      await setDoc(
        doc(db, 'users', u.id),
        { ...u, isFlagged: false, flagReason: '', updatedAt: now },
        { merge: true }
      );
      await setDoc(
        doc(db, 'leaderboard', u.id),
        {
          userId: u.id,
          name: u.name || 'মুসাফির',
          totalCoins: Number(u.totalCoins) || 0,
          streakDays: Number(u.streakDays) || 1,
          isFlagged: false,
          updatedAt: now
        },
        { merge: true }
      );
      await recordAdminAuditLog(
        admin,
        'RANKING_FLAG_RESOLVE',
        `ব্যবহারকারী ${u.name} (${u.id}) এর র‌্যাংকিং ফ্ল্যাগ প্রত্যাহার করা হয়েছে।`,
        'users',
        u.id
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${u.id}`);
    }
  };

  const handleAuditedRecalculation = async (u: ManagedUserRecord) => {
    setAuditingUserId(u.id);
    setAuditMessage(null);
    try {
      const res = await auditAndRecalculateUserRanking(
        admin,
        u.id,
        'প্রকৃত আমল রেকর্ড (amal_records) থেকে সিস্টেম অডিট ও স্কোর যাচাইকরণ'
      );
      setAuditMessage(
        `${u.name}-এর প্রকৃত আমল রেকর্ড যাচাই সম্পন্ন: পূর্বের স্কোর ${res.previousCoins} কয়েন → যাচাইকৃত প্রকৃত স্কোর ${res.verifiedCoins} কয়েন (${res.verifiedStreak} দিন স্ট্রিক)। অডিট লগে রেকর্ড সংরক্ষিত হয়েছে।`
      );
    } catch (err: any) {
      setAuditMessage(err?.message || 'অডিট সম্পন্ন করা যায়নি।');
    } finally {
      setAuditingUserId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-[#131b17] border border-stone-800 space-y-1">
        <h3 className="text-sm font-bold text-white">
          রিয়েল ইউজার র‌্যাংকিং ও সিস্টেম অ্যাবিউজ ডিটেকশন (No Arbitrary Score Manipulation)
        </h3>
        <p className="text-xs text-stone-400">
          অ্যাডমিন কখনোই ইচ্ছামতো কোনো ব্যবহারকারীর কয়েন বা স্কোর ম্যানুয়ালি লিখে পরিবর্তন করতে পারবেন না। সন্দেহজনক অ্যাক্টিভিটি দেখা গেলে ব্যবহারকারীকে <strong>Flag</strong> করা যাবে এবং ডাটাবেসের প্রকৃত <code className="text-emerald-400">amal_records</code> থেকে স্বয়ংক্রিয় অডিট ও পুনঃগণনা (Recalculate) করা যাবে।
        </p>
      </div>

      {auditMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-700 text-emerald-200 text-xs">
          {auditMessage}
        </div>
      )}

      <div className="bg-[#131b17] border border-stone-800 rounded-xl overflow-hidden">
        {sortedUsers.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500">
            এখনো কোনো ব্যবহারকারীর র‌্যাংকিং ডাটা নেই।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-800 bg-stone-900/50 text-stone-400">
                  <th className="py-3 px-4 font-semibold">র‌্যাংক</th>
                  <th className="py-3 px-3 font-semibold">ব্যবহারকারী</th>
                  <th className="py-3 px-3 font-semibold text-right">হাসানাহ কয়েন</th>
                  <th className="py-3 px-3 font-semibold text-right">স্ট্রিক</th>
                  <th className="py-3 px-3 font-semibold">ফ্ল্যাগ স্ট্যাটাস</th>
                  <th className="py-3 px-4 font-semibold text-right">অডিট ও মডারেশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {sortedUsers.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-stone-900/40">
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">#{idx + 1}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-white">{u.name}</div>
                      <div className="text-[11px] text-stone-500 font-mono">{u.email || u.id}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-emerald-400">
                      {u.totalCoins || 0}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-300">
                      {u.streakDays || 1} দিন
                    </td>
                    <td className="py-3 px-3">
                      {u.isFlagged ? (
                        <span className="text-rose-400 font-semibold">
                          Flagged ({u.flagReason || 'সন্দেহজনক'})
                        </span>
                      ) : (
                        <span className="text-emerald-400">Verified Normal</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          disabled={auditingUserId === u.id}
                          onClick={() => handleAuditedRecalculation(u)}
                          className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer"
                          title="প্রকৃত আমল রেকর্ড থেকে স্কোর যাচাই ও রিক্যালকুলেট করুন"
                        >
                          {auditingUserId === u.id ? 'যাচাই হচ্ছে...' : 'Audit & Verify Score'}
                        </button>

                        {u.isFlagged ? (
                          <button
                            onClick={() => handleClearFlag(u)}
                            className="px-2.5 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 cursor-pointer"
                          >
                            Clear Flag
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setFlagModalUser(u);
                              setFlagReason('');
                            }}
                            className="px-2.5 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 cursor-pointer"
                          >
                            Flag Suspicious
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {flagModalUser && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form
            onSubmit={handleFlagSuspicious}
            className="bg-[#131b17] border border-stone-800 rounded-2xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-white">
              সন্দেহজনক অ্যাক্টিভিটি ফ্ল্যাগ করুন: {flagModalUser.name}
            </h3>
            <div className="text-xs space-y-2">
              <label className="block text-stone-300 font-semibold">ফ্ল্যাগ করার কারণ *</label>
              <textarea
                rows={3}
                required
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="যেমন: অস্বাভাবিক দ্রুত কয়েন বৃদ্ধি বা অটোমেটেড স্ক্রিপ্ট সন্দেহ..."
                className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-white"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setFlagModalUser(null)}
                className="px-4 py-2 rounded-lg bg-stone-800 text-xs font-semibold text-stone-300 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white cursor-pointer"
              >
                Flag নিশ্চিত করুন
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 11. ADMIN ROLES (RBAC) MODULE
// ============================================================================
export const AdminRolesManagement: React.FC<{
  admin: AdminAccount;
  adminsList: AdminAccount[];
}> = ({ admin }) => {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-xl bg-[#131b17] border border-emerald-700/40 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-950 border border-emerald-600/40 text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              একক প্রধান অ্যাডমিন সুরক্ষা নীতি (Single-Owner Exclusive Lock)
            </h3>
            <p className="text-xs text-emerald-400 font-medium">
              এই অ্যাডমিন প্যানেল শুধুমাত্র প্রধান অ্যাডমিন ইমেইলের জন্য স্থায়ীভাবে লক করা হয়েছে
            </p>
          </div>
        </div>

        <p className="text-xs text-stone-300 leading-relaxed">
          নিরাপত্তা নীতিমালা অনুযায়ী <span className="text-emerald-400 font-mono font-bold">{BOOTSTRAPPED_SUPER_ADMIN_EMAIL}</span> ছাড়া অন্য কোনো Gmail বা ইমেইল দিয়ে এই অ্যাডমিন প্যানেলে নতুন অ্যাকাউন্ট খোলা, পাসওয়ার্ড সেটআপ করা বা প্রবেশ করা সম্পূর্ণ নিষিদ্ধ। ব্যাকএন্ড সার্ভার এবং ডাটাবেস রুলস উভয় স্তরেই এই একক মালিকানা সুরক্ষা সক্রিয় রয়েছে।
        </p>

        <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <div className="text-stone-400">অনুমোদিত প্রধান অ্যাডমিন ইমেইল (Main Admin Gmail)</div>
            <div className="text-sm font-mono font-bold text-white">{BOOTSTRAPPED_SUPER_ADMIN_EMAIL}</div>
            <div className="text-[11px] text-stone-400">নাম: {admin.name || 'Main Super Admin'}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-700/50 text-emerald-300 font-bold">
              SUPER ADMIN (PRIMARY OWNER)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 12. IMMUTABLE AUDIT LOG MODULE
// ============================================================================
export const AdminAuditLogsView: React.FC<{
  logs: AdminAuditLog[];
}> = ({ logs }) => {
  const [search, setSearch] = useState('');

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(
      (l) =>
        l.adminEmail.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q)
    );
  }, [logs, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#131b17] p-4 rounded-xl border border-stone-800">
        <div>
          <h3 className="text-sm font-bold text-white">
            অপরিবর্তনীয় সিকিউরিটি অডিট লগ (Immutable Audit Trail)
          </h3>
          <p className="text-xs text-stone-400">
            কোন অ্যাডমিন কখন লগইন করেছেন, কোন কনটেন্ট বা সেটিং পরিবর্তন করেছেন, তার অপরিবর্তনীয় রেকর্ড।
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="অ্যাডমিন বা অ্যাকশন খুঁজুন..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-xs text-white"
          />
        </div>
      </div>

      <div className="bg-[#131b17] border border-stone-800 rounded-xl overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500">
            কোনো অডিট লগ পাওয়া যায়নি।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-800 bg-stone-900/50 text-stone-400">
                  <th className="py-3 px-4 font-semibold">অ্যাডমিন (Admin)</th>
                  <th className="py-3 px-3 font-semibold">রোল</th>
                  <th className="py-3 px-3 font-semibold">অ্যাকশন (Action)</th>
                  <th className="py-3 px-3 font-semibold">বিস্তারিত বিবরণ</th>
                  <th className="py-3 px-3 font-semibold">তারিখ (Date)</th>
                  <th className="py-3 px-4 font-semibold text-right">সময় (Time)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-stone-900/40">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{l.adminName || 'Admin'}</div>
                      <div className="text-[11px] text-stone-400 font-mono">{l.adminEmail}</div>
                    </td>
                    <td className="py-3 px-3 text-stone-300">{l.adminRole || 'admin'}</td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-400 whitespace-nowrap">
                      {l.action}
                    </td>
                    <td className="py-3 px-3 text-stone-200 max-w-md">{l.details}</td>
                    <td className="py-3 px-3 font-mono tabular-nums text-stone-400 whitespace-nowrap">
                      {l.dateStr}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-stone-400 text-right whitespace-nowrap">
                      {l.timeStr}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
