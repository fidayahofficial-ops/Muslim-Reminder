import React from 'react';
import { Bookmark, Trash2, Cloud, RefreshCw, LogIn } from 'lucide-react';
import { triggerHaptic } from '../utils/audio';
import { useSync } from '../context/SyncContext';

interface BookmarksViewProps {
  onNavigateToDua?: (duaId: string) => void;
  onNavigateToQuran?: (surahNumber: number) => void;
}

export const BookmarksView: React.FC<BookmarksViewProps> = () => {
  const { bookmarks, deleteBookmark, user, syncStatus, signInWithGoogle } = useSync();

  const handleRemove = async (id: string) => {
    triggerHaptic(20);
    await deleteBookmark(id);
  };

  return (
    <div className="pb-24 pt-3 px-4 max-w-xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-[#151B22] rounded-2xl p-4 shadow-xs border border-stone-200 dark:border-stone-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              আমার সংরক্ষিত বুকমার্ক
            </h2>
            <span className="text-xs text-stone-500 dark:text-stone-400">
              আপনার প্রিয় আয়াত, দোয়া ও হাদিসসমূহ ({bookmarks.length}টি সংরক্ষিত)
            </span>
          </div>
        </div>

        {/* Real-time Cloud Sync Status Banner */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-[11px]">
          {user ? (
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
              {syncStatus === 'syncing' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
              <span>ক্লাউড সিঙ্ক সক্রিয় (রিয়েল-টাইম • {user.email?.split('@')[0]})</span>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1">
                <Cloud className="w-3.5 h-3.5" />
                ডিভাইসে সংরক্ষিত
              </span>
              <button
                onClick={() => signInWithGoogle()}
                className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <LogIn className="w-3 h-3" />
                গুগল দিয়ে সিঙ্ক করুন
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bookmarks List */}
      <div className="space-y-3">
        {bookmarks.map((b) => (
          <div
            key={b.id}
            className="bg-white dark:bg-[#151B22] rounded-2xl p-4 shadow-xs border border-stone-200 dark:border-stone-800 space-y-2 flex items-start justify-between gap-3 hover:border-emerald-500/40 transition-colors"
          >
            <div>
              <span className="text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-400 block mb-0.5">
                {b.type === 'ayah' ? 'কুরআনের আয়াত' : b.type === 'dua' ? 'দোয়া' : 'হাদিস'}
              </span>
              <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {b.title}
              </h4>
              {b.subtitle && (
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 line-clamp-2">
                  {b.subtitle}
                </p>
              )}
              <span className="text-[11px] text-stone-400 block mt-1">
                রেফারেন্স: {b.reference}
              </span>
            </div>

            <button
              onClick={() => handleRemove(b.id)}
              className="p-1.5 text-stone-400 hover:text-rose-600 cursor-pointer shrink-0 transition-colors"
              title="মুছে ফেলুন"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {bookmarks.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-[#151B22] rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-2">
            <Bookmark className="w-8 h-8 text-stone-300 dark:text-stone-600 mx-auto" />
            <div className="text-xs text-stone-500 dark:text-stone-400">
              কোনো বুকমার্ক সংরক্ষিত নেই। কুরআন বা দোয়া পড়ার সময় বুকমার্ক আইকনে চাপুন।
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
