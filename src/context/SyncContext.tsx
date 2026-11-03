import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
  query,
  where,
  Unsubscribe
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType, testConnection } from '../firebase/config';
import { PersonalNote, BookmarkItem, DailyAmalRecord } from '../types';
import {
  AppAnnouncement,
  AppPrayerSystemConfig,
  AzanAudioConfig,
  ManagedContentItem,
  ManagedQuizQuestion
} from '../types/admin';
import { storage } from '../utils/storage';
import { computeCoinBreakdown, getRankTier, RemoteLeaderboardRecord } from '../utils/coins';
import { BANGLADESH_DISTRICTS } from '../data/districts';
import { sendNotification } from '../utils/audio';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error' | 'suspended';

interface SyncContextType {
  user: User | null;
  authLoading: boolean;
  syncStatus: SyncStatus;
  lastSyncTime: number | null;
  accountStatus: 'active' | 'suspended';
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;

  // Real-time synchronized user entities
  notes: PersonalNote[];
  bookmarks: BookmarkItem[];
  amalRecords: Record<string, DailyAmalRecord>;

  // Real-time synchronized public & admin-managed entities
  remoteLeaderboard: RemoteLeaderboardRecord[];
  publishedAnnouncements: AppAnnouncement[];
  publishedQuizzes: ManagedQuizQuestion[];
  publishedCmsContents: ManagedContentItem[];
  azanCatalog: AzanAudioConfig[];
  prayerSystemConfig: AppPrayerSystemConfig | null;

  // Synchronized Mutation Methods
  saveNote: (note: PersonalNote) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  saveBookmark: (bookmark: BookmarkItem) => Promise<void>;
  deleteBookmark: (id: string) => Promise<void>;
  saveAmalRecord: (record: DailyAmalRecord) => Promise<void>;
}

const SyncContext = createContext<SyncContextType | null>(null);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [accountStatus, setAccountStatus] = useState<'active' | 'suspended'>('active');

  // Local state initialized from storage
  const [notes, setNotes] = useState<PersonalNote[]>(() => storage.getNotes());
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() => storage.getBookmarks());
  const [amalRecords, setAmalRecords] = useState<Record<string, DailyAmalRecord>>(() => storage.getAmalRecords());

  // Public & Admin-managed real-time collections
  const [remoteLeaderboard, setRemoteLeaderboard] = useState<RemoteLeaderboardRecord[]>([]);
  const [publishedAnnouncements, setPublishedAnnouncements] = useState<AppAnnouncement[]>([]);
  const [publishedQuizzes, setPublishedQuizzes] = useState<ManagedQuizQuestion[]>([]);
  const [publishedCmsContents, setPublishedCmsContents] = useState<ManagedContentItem[]>([]);
  const [azanCatalog, setAzanCatalog] = useState<AzanAudioConfig[]>([]);
  const [prayerSystemConfig, setPrayerSystemConfig] = useState<AppPrayerSystemConfig | null>(null);

  // Firestore listeners unsubscribers ref
  const unsubsRef = useRef<Unsubscribe[]>([]);
  const publicUnsubsRef = useRef<Unsubscribe[]>([]);
  const deliveredNotifIdsRef = useRef<Set<string>>(new Set());

  // Initial connection test & public real-time listeners
  useEffect(() => {
    testConnection();

    // Load previously delivered admin notification IDs from localStorage
    try {
      const raw = localStorage.getItem('waqto_delivered_admin_notifs_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((id) => deliveredNotifIdsRef.current.add(String(id)));
        }
      }
    } catch {}

    // 1. Public Leaderboard Listener
    const unsubLb = onSnapshot(
      collection(db, 'leaderboard'),
      (snap) => {
        const list: RemoteLeaderboardRecord[] = [];
        snap.forEach((d) => {
          const data = d.data();
          if (!data.isFlagged) {
            list.push({
              userId: data.userId || d.id,
              name: data.name || 'মুসাফির',
              city: data.city || 'বাংলাদেশ',
              totalCoins: Number(data.totalCoins) || 0,
              streakDays: Number(data.streakDays) || 1,
              tier: data.tier || '',
              isFlagged: Boolean(data.isFlagged),
              updatedAt: Number(data.updatedAt) || 0
            });
          }
        });
        setRemoteLeaderboard(list);
      },
      () => {}
    );
    publicUnsubsRef.current.push(unsubLb);

    // 2. Published Announcements Listener
    const qAnnouncements = query(collection(db, 'announcements'), where('status', '==', 'published'));
    const unsubAnnouncements = onSnapshot(
      qAnnouncements,
      (snap) => {
        const todayStr = new Date().toISOString().slice(0, 10);
        const list: AppAnnouncement[] = [];
        snap.forEach((d) => {
          const data = d.data() as AppAnnouncement;
          if (data.expiryDate && data.expiryDate < todayStr) return;
          if (data.publishDate && data.publishDate > todayStr) return;
          list.push({ ...data, id: d.id });
        });
        list.sort((a, b) => b.updatedAt - a.updatedAt);
        setPublishedAnnouncements(list);
      },
      () => {}
    );
    publicUnsubsRef.current.push(unsubAnnouncements);

    // 3. Published Quizzes Listener
    const qQuizzes = query(collection(db, 'quizzes'), where('status', '==', 'published'));
    const unsubQuizzes = onSnapshot(
      qQuizzes,
      (snap) => {
        const todayStr = new Date().toISOString().slice(0, 10);
        const list: ManagedQuizQuestion[] = [];
        snap.forEach((d) => {
          const data = d.data() as ManagedQuizQuestion;
          if (data.expiryDate && data.expiryDate < todayStr) return;
          if (data.publishDate && data.publishDate > todayStr) return;
          list.push({ ...data, id: d.id });
        });
        list.sort((a, b) => b.updatedAt - a.updatedAt);
        setPublishedQuizzes(list);
      },
      () => {}
    );
    publicUnsubsRef.current.push(unsubQuizzes);

    // 4. Published CMS Contents Listener
    const qCms = query(collection(db, 'cms_contents'), where('status', '==', 'published'));
    const unsubCms = onSnapshot(
      qCms,
      (snap) => {
        const list: ManagedContentItem[] = [];
        snap.forEach((d) => {
          const data = d.data() as ManagedContentItem;
          list.push({ ...data, id: d.id });
        });
        list.sort((a, b) => b.updatedAt - a.updatedAt);
        setPublishedCmsContents(list);
      },
      () => {}
    );
    publicUnsubsRef.current.push(unsubCms);

    // 5. Azan Catalog Listener
    const unsubAzans = onSnapshot(
      collection(db, 'azan_catalog'),
      (snap) => {
        const list: AzanAudioConfig[] = [];
        snap.forEach((d) => {
          const data = d.data() as AzanAudioConfig;
          list.push({ ...data, id: d.id });
        });
        setAzanCatalog(list);
      },
      () => {}
    );
    publicUnsubsRef.current.push(unsubAzans);

    // 6. System Prayer Config Listener
    const unsubPrayerConfig = onSnapshot(
      doc(db, 'app_config', 'prayer_settings'),
      (snap) => {
        if (snap.exists()) {
          setPrayerSystemConfig(snap.data() as AppPrayerSystemConfig);
        }
      },
      () => {}
    );
    publicUnsubsRef.current.push(unsubPrayerConfig);

    // 7. Sent Admin Broadcast Notifications Listener (Separate from Prayer Azan notifications)
    const qNotifs = query(collection(db, 'admin_notifications'), where('status', '==', 'sent'));
    const unsubNotifs = onSnapshot(
      qNotifs,
      (snap) => {
        const now = Date.now();
        snap.forEach((d) => {
          const data = d.data();
          const notifId = d.id;
          const sentAt = Number(data.sentAt) || Number(data.updatedAt) || 0;
          // Only trigger push notification if sent within last 24h and not yet delivered on this device
          if (!deliveredNotifIdsRef.current.has(notifId) && now - sentAt < 24 * 60 * 60 * 1000) {
            deliveredNotifIdsRef.current.add(notifId);
            try {
              localStorage.setItem(
                'waqto_delivered_admin_notifs_v1',
                JSON.stringify(Array.from(deliveredNotifIdsRef.current).slice(-100))
              );
            } catch {}
            sendNotification(
              `Muslim Reminder বার্তা — ${data.title}`,
              data.message,
              '/icons/icon-192x192.png',
              false
            );
          }
        });
      },
      () => {}
    );
    publicUnsubsRef.current.push(unsubNotifs);

    return () => {
      publicUnsubsRef.current.forEach((u) => u());
      publicUnsubsRef.current = [];
    };
  }, []);

  // Helper to sync aggregate stats & public leaderboard entry for the authenticated user
  const syncUserAggregateTelemetry = useCallback(
    async (
      currentUser: User,
      currentAmalMap: Record<string, DailyAmalRecord>,
      currentNotesCount: number,
      currentBookmarksCount: number,
      incrementAppOpen: boolean = false
    ) => {
      try {
        const userId = currentUser.uid;
        const userDocRef = doc(db, 'users', userId);
        const existingSnap = await getDoc(userDocRef);
        const existingData = existingSnap.exists() ? existingSnap.data() : null;

        if (existingData?.status === 'suspended') {
          setAccountStatus('suspended');
          setSyncStatus('suspended');
          return;
        }

        const settings = storage.getSettings();
        const quizStats = storage.getQuizStats();
        const rozaStats = storage.getRozaTracker();
        const breakdown = computeCoinBreakdown(currentAmalMap, quizStats, rozaStats);

        const daysWithAmal = new Set<string>();
        Object.values(currentAmalMap).forEach((rec) => {
          let hasDeed = false;
          if (rec.prayers && Object.values(rec.prayers).some(Boolean)) hasDeed = true;
          if (rec.morningAzkarDone || rec.eveningAzkarDone || rec.fastingDone || rec.sadaqahDone) hasDeed = true;
          if (rec.sunnahDone || rec.duaDone || rec.quizDone || (rec.tasbihCount && rec.tasbihCount > 0)) hasDeed = true;
          if (hasDeed) daysWithAmal.add(rec.dateKey);
        });
        const streakDays = Math.max(1, daysWithAmal.size);
        const tierInfo = getRankTier(breakdown.totalCoins);

        const providerId = currentUser.providerData?.[0]?.providerId || 'google.com';
        const loginMethod = providerId.includes('password') ? 'Email/Password' : 'Google';
        const districtObj = BANGLADESH_DISTRICTS.find((d) => d.id === settings.selectedDistrictId);

        const prevAppOpens = Number(existingData?.appOpens) || 0;
        const nextAppOpens = incrementAppOpen ? prevAppOpens + 1 : Math.max(1, prevAppOpens);
        const displayName = (existingData?.name || currentUser.displayName || settings.userName || 'মুসাফির').slice(0, 150);

        await setDoc(
          userDocRef,
          {
            id: userId,
            name: displayName,
            email: (currentUser.email || existingData?.email || '').slice(0, 200),
            avatarIcon: existingData?.avatarIcon || 'moon',
            bio: (existingData?.bio || 'Muslim Reminder ব্যবহারকারী').slice(0, 500),
            joinedDate: existingData?.joinedDate || new Date().toISOString(),
            lastActiveAt: Date.now(),
            loginMethod,
            status: existingData?.status || 'active',
            language: settings.language || 'bn',
            theme: settings.theme || 'system',
            districtId: settings.selectedDistrictId || 'dhaka',
            appOpens: nextAppOpens,
            totalCoins: breakdown.totalCoins,
            streakDays,
            prayerCount: breakdown.prayerCount,
            quranPagesRead: breakdown.quranPagesCount,
            quranReadMinutes: breakdown.quranReadMinutes,
            tasbihCount: breakdown.tasbihCount,
            quizCorrectCount: breakdown.quizCorrectCount,
            quizTotalAnswered: Number(quizStats?.totalAnswered) || 0,
            notesCount: currentNotesCount,
            bookmarksCount: currentBookmarksCount,
            isFlagged: Boolean(existingData?.isFlagged),
            flagReason: existingData?.flagReason || '',
            updatedAt: Date.now()
          },
          { merge: true }
        );

        // Also update non-PII public leaderboard document
        const lbDocRef = doc(db, 'leaderboard', userId);
        await setDoc(
          lbDocRef,
          {
            userId,
            name: displayName,
            city: (districtObj?.nameBn || 'বাংলাদেশ').slice(0, 100),
            totalCoins: breakdown.totalCoins,
            streakDays,
            tier: tierInfo.tierName,
            isFlagged: Boolean(existingData?.isFlagged),
            updatedAt: Date.now()
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Aggregate telemetry sync notice:', err);
      }
    },
    []
  );

  // Sync state with Firestore on auth change
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      // Clean up previous user listeners
      unsubsRef.current.forEach((unsub) => unsub());
      unsubsRef.current = [];

      if (!currentUser) {
        setSyncStatus('offline');
        setAccountStatus('active');
        setNotes(storage.getNotes());
        setBookmarks(storage.getBookmarks());
        setAmalRecords(storage.getAmalRecords());
        return;
      }

      setSyncStatus('syncing');

      try {
        const userId = currentUser.uid;

        // 1. Live Listener on User Profile Document (monitors account suspension status)
        const userDocRef = doc(db, 'users', userId);
        const unsubUserDoc = onSnapshot(
          userDocRef,
          (snap) => {
            if (snap.exists()) {
              const d = snap.data();
              if (d.status === 'suspended') {
                setAccountStatus('suspended');
                setSyncStatus('suspended');
              } else {
                setAccountStatus('active');
              }
            }
          },
          () => {}
        );
        unsubsRef.current.push(unsubUserDoc);

        // Ensure user profile & aggregate telemetry exist on boot
        await syncUserAggregateTelemetry(
          currentUser,
          storage.getAmalRecords(),
          storage.getNotes().length,
          storage.getBookmarks().length,
          true
        );

        // 2. Real-time Listener for Personal Notes
        const notesColRef = collection(db, 'users', userId, 'notes');
        const unsubNotes = onSnapshot(
          notesColRef,
          (snapshot) => {
            const fetchedNotes: PersonalNote[] = [];
            snapshot.forEach((docSnap) => {
              const d = docSnap.data();
              fetchedNotes.push({
                id: docSnap.id,
                title: d.title,
                content: d.content,
                category: d.category || 'সাধারণ',
                createdAt: Number(d.createdAt) || Date.now(),
                updatedAt: Number(d.updatedAt) || Date.now()
              });
            });

            fetchedNotes.sort((a, b) => b.updatedAt - a.updatedAt);
            setNotes(fetchedNotes);
            storage.saveNotes(fetchedNotes);
            setLastSyncTime(Date.now());
            setSyncStatus((prev) => (prev === 'suspended' ? 'suspended' : 'synced'));
          },
          (error) => {
            setSyncStatus('error');
            try {
              handleFirestoreError(error, OperationType.LIST, `users/${userId}/notes`);
            } catch (logged) {
              console.error('Diagnostic error logged:', logged);
            }
          }
        );
        unsubsRef.current.push(unsubNotes);

        // 3. Real-time Listener for Bookmarks
        const bookmarksColRef = collection(db, 'users', userId, 'bookmarks');
        const unsubBookmarks = onSnapshot(
          bookmarksColRef,
          (snapshot) => {
            const fetchedBookmarks: BookmarkItem[] = [];
            snapshot.forEach((docSnap) => {
              const d = docSnap.data();
              fetchedBookmarks.push({
                id: docSnap.id,
                type: d.type,
                title: d.title,
                subtitle: d.subtitle,
                reference: d.reference || '',
                dataRefId: d.dataRefId || '',
                createdAt: Number(d.createdAt) || Date.now()
              });
            });

            fetchedBookmarks.sort((a, b) => b.createdAt - a.createdAt);
            setBookmarks(fetchedBookmarks);
            storage.saveBookmarks(fetchedBookmarks);
            setLastSyncTime(Date.now());
            setSyncStatus((prev) => (prev === 'suspended' ? 'suspended' : 'synced'));
          },
          (error) => {
            setSyncStatus('error');
            try {
              handleFirestoreError(error, OperationType.LIST, `users/${userId}/bookmarks`);
            } catch (logged) {
              console.error('Diagnostic error logged:', logged);
            }
          }
        );
        unsubsRef.current.push(unsubBookmarks);

        // 4. Real-time Listener for Amal Records
        const amalColRef = collection(db, 'users', userId, 'amal_records');
        const unsubAmal = onSnapshot(
          amalColRef,
          (snapshot) => {
            const fetchedAmal: Record<string, DailyAmalRecord> = {};
            snapshot.forEach((docSnap) => {
              const d = docSnap.data();
              const rec: DailyAmalRecord = {
                dateKey: docSnap.id,
                prayers: d.prayers || { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
                morningAzkarDone: Boolean(d.morningAzkarDone),
                eveningAzkarDone: Boolean(d.eveningAzkarDone),
                fastingDone: Boolean(d.fastingDone),
                sadaqahDone: Boolean(d.sadaqahDone),
                tasbihCount: Number(d.tasbihCount) || 0,
                quranReadMinutes: d.quranReadMinutes ? Number(d.quranReadMinutes) : undefined,
                quranPagesRead: d.quranPagesRead !== undefined ? Number(d.quranPagesRead) : undefined,
                sunnahDone: d.sunnahDone !== undefined ? Boolean(d.sunnahDone) : undefined,
                completedSunnahKeys: Array.isArray(d.completedSunnahKeys) ? d.completedSunnahKeys : undefined,
                duaDone: d.duaDone !== undefined ? Boolean(d.duaDone) : undefined,
                completedDuaKeys: Array.isArray(d.completedDuaKeys) ? d.completedDuaKeys : undefined,
                quizDone: d.quizDone !== undefined ? Boolean(d.quizDone) : undefined,
                quizScore: d.quizScore !== undefined ? Number(d.quizScore) : undefined,
                earnedCoins: d.earnedCoins !== undefined ? Number(d.earnedCoins) : undefined
              };
              fetchedAmal[docSnap.id] = rec;
              storage.saveAmalRecord(rec);
            });

            setAmalRecords((prev) => ({ ...prev, ...fetchedAmal }));
            setLastSyncTime(Date.now());
            setSyncStatus((prev) => (prev === 'suspended' ? 'suspended' : 'synced'));
          },
          (error) => {
            setSyncStatus('error');
            try {
              handleFirestoreError(error, OperationType.LIST, `users/${userId}/amal_records`);
            } catch (logged) {
              console.error('Diagnostic error logged:', logged);
            }
          }
        );
        unsubsRef.current.push(unsubAmal);

        // 5. Initial upload of pre-existing local records (if any) to cloud
        const localNotes = storage.getNotes();
        for (const n of localNotes) {
          try {
            const noteDocRef = doc(db, 'users', userId, 'notes', n.id);
            const noteSnap = await getDoc(noteDocRef);
            if (!noteSnap.exists()) {
              await setDoc(noteDocRef, {
                id: n.id,
                userId,
                title: (n.title || '').slice(0, 200),
                content: (n.content || '').slice(0, 10000),
                category: (n.category || 'সাধারণ').slice(0, 100),
                createdAt: Number(n.createdAt) || Date.now(),
                updatedAt: Number(n.updatedAt) || Date.now()
              });
            }
          } catch (e) {
            console.warn('Initial note sync error:', e);
          }
        }

        const localBookmarks = storage.getBookmarks();
        for (const b of localBookmarks) {
          try {
            const bDocRef = doc(db, 'users', userId, 'bookmarks', b.id);
            const bSnap = await getDoc(bDocRef);
            if (!bSnap.exists()) {
              await setDoc(bDocRef, {
                id: b.id,
                userId,
                type: b.type,
                title: (b.title || '').slice(0, 300),
                subtitle: (b.subtitle || '').slice(0, 1000),
                reference: (b.reference || '').slice(0, 300),
                dataRefId: (b.dataRefId || '').slice(0, 128),
                createdAt: Number(b.createdAt) || Date.now()
              });
            }
          } catch (e) {
            console.warn('Initial bookmark sync error:', e);
          }
        }

        const localAmal = storage.getAmalRecords();
        for (const [dateKey, rec] of Object.entries(localAmal)) {
          try {
            const aDocRef = doc(db, 'users', userId, 'amal_records', dateKey);
            const aSnap = await getDoc(aDocRef);
            if (!aSnap.exists()) {
              await setDoc(aDocRef, {
                dateKey,
                userId,
                prayers: rec.prayers || { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
                morningAzkarDone: Boolean(rec.morningAzkarDone),
                eveningAzkarDone: Boolean(rec.eveningAzkarDone),
                fastingDone: Boolean(rec.fastingDone),
                sadaqahDone: Boolean(rec.sadaqahDone),
                tasbihCount: Number(rec.tasbihCount) || 0,
                quranReadMinutes: Number(rec.quranReadMinutes) || 0,
                quranPagesRead: Number(rec.quranPagesRead) || 0,
                sunnahDone: Boolean(rec.sunnahDone),
                duaDone: Boolean(rec.duaDone),
                quizDone: Boolean(rec.quizDone),
                updatedAt: Date.now()
              });
            }
          } catch (e) {
            console.warn('Initial amal sync error:', e);
          }
        }
      } catch (err) {
        console.error('Sync setup error:', err);
        setSyncStatus('error');
      }
    });

    return () => {
      unsubAuth();
      unsubsRef.current.forEach((unsub) => unsub());
    };
  }, [syncUserAggregateTelemetry]);

  // Google Sign-In Action
  const signInWithGoogle = useCallback(async () => {
    try {
      setSyncStatus('syncing');
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      const errorCode = error?.code || '';
      if (
        errorCode === 'auth/popup-closed-by-user' ||
        errorCode === 'auth/cancelled-popup-request'
      ) {
        // User closed or dismissed the popup without completing sign in.
        // This is a normal user cancellation, not a system failure.
        setSyncStatus(user ? 'synced' : 'offline');
        return;
      }

      if (errorCode === 'auth/popup-blocked') {
        console.warn('Google Sign-In popup was blocked by browser settings.');
        setSyncStatus(user ? 'synced' : 'offline');
        return;
      }

      console.warn('Google Sign-In notice:', error?.message || error);
      setSyncStatus('error');
    }
  }, [user]);

  // Sign-Out Action
  const signOutUser = useCallback(async () => {
    try {
      await signOut(auth);
      setSyncStatus('offline');
    } catch (error) {
      console.error('Sign-Out failed:', error);
    }
  }, []);

  // Real-Time Note Save
  const saveNote = useCallback(
    async (note: PersonalNote) => {
      let nextNotes: PersonalNote[] = [];
      setNotes((prev) => {
        const index = prev.findIndex((n) => n.id === note.id);
        nextNotes = index >= 0 ? prev.map((n) => (n.id === note.id ? note : n)) : [note, ...prev];
        storage.saveNotes(nextNotes);
        return nextNotes;
      });

      if (!user || accountStatus === 'suspended') return;

      try {
        setSyncStatus('syncing');
        const noteDocRef = doc(db, 'users', user.uid, 'notes', note.id);
        await setDoc(noteDocRef, {
          id: note.id,
          userId: user.uid,
          title: note.title.slice(0, 200),
          content: note.content.slice(0, 10000),
          category: note.category || 'সাধারণ',
          createdAt: note.createdAt,
          updatedAt: note.updatedAt
        });
        await syncUserAggregateTelemetry(user, amalRecords, nextNotes.length, bookmarks.length, false);
        setLastSyncTime(Date.now());
        setSyncStatus('synced');
      } catch (error) {
        setSyncStatus('error');
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/notes/${note.id}`);
      }
    },
    [user, accountStatus, amalRecords, bookmarks.length, syncUserAggregateTelemetry]
  );

  // Real-Time Note Delete
  const deleteNote = useCallback(
    async (id: string) => {
      let nextNotes: PersonalNote[] = [];
      setNotes((prev) => {
        nextNotes = prev.filter((n) => n.id !== id);
        storage.saveNotes(nextNotes);
        return nextNotes;
      });

      if (!user || accountStatus === 'suspended') return;

      try {
        setSyncStatus('syncing');
        const noteDocRef = doc(db, 'users', user.uid, 'notes', id);
        await deleteDoc(noteDocRef);
        await syncUserAggregateTelemetry(user, amalRecords, nextNotes.length, bookmarks.length, false);
        setLastSyncTime(Date.now());
        setSyncStatus('synced');
      } catch (error) {
        setSyncStatus('error');
        handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/notes/${id}`);
      }
    },
    [user, accountStatus, amalRecords, bookmarks.length, syncUserAggregateTelemetry]
  );

  // Real-Time Bookmark Save
  const saveBookmark = useCallback(
    async (bookmark: BookmarkItem) => {
      let nextBookmarks: BookmarkItem[] = [];
      setBookmarks((prev) => {
        nextBookmarks = [bookmark, ...prev.filter((b) => b.id !== bookmark.id)];
        storage.saveBookmarks(nextBookmarks);
        return nextBookmarks;
      });

      if (!user || accountStatus === 'suspended') return;

      try {
        setSyncStatus('syncing');
        const bDocRef = doc(db, 'users', user.uid, 'bookmarks', bookmark.id);
        await setDoc(bDocRef, {
          id: bookmark.id,
          userId: user.uid,
          type: bookmark.type,
          title: bookmark.title.slice(0, 200),
          subtitle: (bookmark.subtitle || '').slice(0, 1000),
          reference: (bookmark.reference || '').slice(0, 200),
          dataRefId: (bookmark.dataRefId || '').slice(0, 128),
          createdAt: bookmark.createdAt
        });
        await syncUserAggregateTelemetry(user, amalRecords, notes.length, nextBookmarks.length, false);
        setLastSyncTime(Date.now());
        setSyncStatus('synced');
      } catch (error) {
        setSyncStatus('error');
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/bookmarks/${bookmark.id}`);
      }
    },
    [user, accountStatus, amalRecords, notes.length, syncUserAggregateTelemetry]
  );

  // Real-Time Bookmark Delete
  const deleteBookmark = useCallback(
    async (id: string) => {
      let nextBookmarks: BookmarkItem[] = [];
      setBookmarks((prev) => {
        nextBookmarks = prev.filter((b) => b.id !== id);
        storage.saveBookmarks(nextBookmarks);
        return nextBookmarks;
      });

      if (!user || accountStatus === 'suspended') return;

      try {
        setSyncStatus('syncing');
        const bDocRef = doc(db, 'users', user.uid, 'bookmarks', id);
        await deleteDoc(bDocRef);
        await syncUserAggregateTelemetry(user, amalRecords, notes.length, nextBookmarks.length, false);
        setLastSyncTime(Date.now());
        setSyncStatus('synced');
      } catch (error) {
        setSyncStatus('error');
        handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/bookmarks/${id}`);
      }
    },
    [user, accountStatus, amalRecords, notes.length, syncUserAggregateTelemetry]
  );

  // Real-Time Amal Record Save
  const saveAmalRecord = useCallback(
    async (record: DailyAmalRecord) => {
      let nextAmalMap: Record<string, DailyAmalRecord> = {};
      setAmalRecords((prev) => {
        nextAmalMap = { ...prev, [record.dateKey]: record };
        storage.saveAmalRecord(record);
        return nextAmalMap;
      });

      if (!user || accountStatus === 'suspended') return;

      try {
        setSyncStatus('syncing');
        const aDocRef = doc(db, 'users', user.uid, 'amal_records', record.dateKey);
        await setDoc(aDocRef, {
          dateKey: record.dateKey,
          userId: user.uid,
          prayers: record.prayers,
          morningAzkarDone: Boolean(record.morningAzkarDone),
          eveningAzkarDone: Boolean(record.eveningAzkarDone),
          fastingDone: Boolean(record.fastingDone),
          sadaqahDone: Boolean(record.sadaqahDone),
          tasbihCount: Number(record.tasbihCount) || 0,
          quranReadMinutes: record.quranReadMinutes ? Number(record.quranReadMinutes) : 0,
          quranPagesRead: record.quranPagesRead ? Number(record.quranPagesRead) : 0,
          sunnahDone: Boolean(record.sunnahDone),
          duaDone: Boolean(record.duaDone),
          quizDone: Boolean(record.quizDone),
          updatedAt: Date.now()
        });
        await syncUserAggregateTelemetry(user, nextAmalMap, notes.length, bookmarks.length, false);
        setLastSyncTime(Date.now());
        setSyncStatus('synced');
      } catch (error) {
        setSyncStatus('error');
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/amal_records/${record.dateKey}`);
      }
    },
    [user, accountStatus, notes.length, bookmarks.length, syncUserAggregateTelemetry]
  );

  return (
    <SyncContext.Provider
      value={{
        user,
        authLoading,
        syncStatus,
        lastSyncTime,
        accountStatus,
        signInWithGoogle,
        signOutUser,
        notes,
        bookmarks,
        amalRecords,
        remoteLeaderboard,
        publishedAnnouncements,
        publishedQuizzes,
        publishedCmsContents,
        azanCatalog,
        prayerSystemConfig,
        saveNote,
        deleteNote,
        saveBookmark,
        deleteBookmark,
        saveAmalRecord
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
