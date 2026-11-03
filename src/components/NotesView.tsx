import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Search, 
  AlertTriangle,
  Tag,
  Clock,
  Sparkles,
  Cloud,
  CloudCheck,
  RefreshCw,
  LogIn
} from 'lucide-react';
import { PersonalNote } from '../types';
import { triggerHaptic } from '../utils/audio';
import { useSync } from '../context/SyncContext';

const NOTE_CATEGORIES = [
  'কুরআনের ভাবনা',
  'দোয়া ও আমল',
  'হাদিসের শিক্ষা',
  'ব্যক্তিগত চিন্তা',
  'প্রশ্ন ও জিজ্ঞাসা',
  'সাধারণ'
] as const;

export const NotesView: React.FC = () => {
  const { notes, saveNote, deleteNote, user, syncStatus, signInWithGoogle } = useSync();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string>('কুরআনের ভাবনা');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('সব');
  
  // Custom in-app delete confirmation modal state
  const [noteToDelete, setNoteToDelete] = useState<PersonalNote | null>(null);

  // Open editor for new note
  const handleOpenNewNote = () => {
    triggerHaptic(20);
    setTitle('');
    setContent('');
    setCategory('কুরআনের ভাবনা');
    setEditingId(null);
    setIsEditorOpen(true);
  };

  // Open editor for editing existing note
  const handleStartEdit = (note: PersonalNote) => {
    triggerHaptic(20);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category || 'সাধারণ');
    setEditingId(note.id);
    setIsEditorOpen(true);
  };

  // Save note to persistent storage & Firestore
  const handleSaveNote = async () => {
    if (!title.trim() && !content.trim()) return;
    triggerHaptic(30);

    const finalTitle = title.trim() || content.trim().slice(0, 30) || 'নতুন নোট';

    if (editingId) {
      const existing = notes.find((n) => n.id === editingId);
      const updatedNote: PersonalNote = {
        id: editingId,
        title: finalTitle,
        content: content.trim(),
        category,
        createdAt: existing?.createdAt || Date.now(),
        updatedAt: Date.now()
      };
      await saveNote(updatedNote);
    } else {
      const newNote: PersonalNote = {
        id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: finalTitle,
        content: content.trim(),
        category,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await saveNote(newNote);
    }

    // Reset and close
    setTitle('');
    setContent('');
    setIsEditorOpen(false);
    setEditingId(null);
  };

  // Trigger delete modal
  const handlePromptDelete = (note: PersonalNote) => {
    triggerHaptic(25);
    setNoteToDelete(note);
  };

  // Confirm delete single note
  const handleConfirmDelete = async () => {
    if (!noteToDelete) return;
    triggerHaptic(40);
    await deleteNote(noteToDelete.id);
    setNoteToDelete(null);
  };

  // Filter notes based on category and search query
  const filteredNotes = notes.filter((n) => {
    const matchesCategory = selectedCategory === 'সব' || n.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="pb-24 pt-3 px-4 max-w-xl mx-auto space-y-4">
      {/* 1. Header Card */}
      <div className="bg-white dark:bg-[#151B22] rounded-2xl p-4 shadow-xs border border-stone-200 dark:border-stone-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ব্যক্তিগত ইসলামিক নোট
            </h2>
            <span className="text-xs text-stone-500 dark:text-stone-400">
              কুরআনি চিন্তা, দোয়া ও দ্বীনি শিক্ষা সংরক্ষণ ({notes.length}টি সংরক্ষিত)
            </span>
          </div>

          <button
            onClick={handleOpenNewNote}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন নোট</span>
          </button>
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

      {/* 2. Search & Category Filters */}
      <div className="bg-white dark:bg-[#151B22] rounded-2xl p-3.5 shadow-xs border border-stone-200 dark:border-stone-800 space-y-3">
        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="নোট বা বিষয়ে খুঁজুন..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs text-stone-800 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-emerald-600 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('সব')}
            className={`px-3 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ${
              selectedCategory === 'সব'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            সব ({notes.length})
          </button>
          {NOTE_CATEGORIES.map((cat) => {
            const count = notes.filter((n) => n.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                {cat} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Note Editor Modal / Drawer */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#151B22] rounded-2xl w-full max-w-lg p-5 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {editingId ? 'নোট সম্পাদনা করুন' : 'নতুন ইসলামিক নোট লিখুন'}
              </h3>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                শিরোনাম
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="যেমন: সূরা বাকারার বিশেষ শিক্ষা..."
                className="w-full p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-emerald-600"
              />
            </div>

            {/* Category Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                ক্যাটাগরি
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {NOTE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`p-2 rounded-lg text-xs font-medium border text-center transition-colors cursor-pointer ${
                      category === cat
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold'
                        : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Textarea */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                বিস্তারিত নোট / অনুভূতি
              </label>
              <textarea
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="আপনার ভাবনা, আয়াতের অনুভূতি, হাদিসের আমল বা দোয়া সুন্দরভাবে লিখুন..."
                className="w-full p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-emerald-600 resize-none leading-relaxed"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                disabled={!title.trim() && !content.trim()}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>সংরক্ষণ করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Notes List */}
      <div className="space-y-3">
        {filteredNotes.map((note) => (
          <div
            key={note.id}
            className="bg-white dark:bg-[#151B22] rounded-2xl p-4 shadow-xs border border-stone-200 dark:border-stone-800 space-y-2.5 transition-all hover:border-emerald-500/40"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[10px] font-semibold">
                    <Tag className="w-2.5 h-2.5" />
                    {note.category}
                  </span>
                  <span className="text-[10px] text-stone-400 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(note.updatedAt).toLocaleDateString('bn-BD', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <h4 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 leading-snug">
                  {note.title}
                </h4>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleStartEdit(note)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                  title="সম্পাদনা করুন"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handlePromptDelete(note)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="মুছে ফেলুন"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-sm sm:text-base text-stone-800 dark:text-stone-200 leading-relaxed whitespace-pre-wrap font-medium">
              {note.content}
            </p>
          </div>
        ))}

        {filteredNotes.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-[#151B22] rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-3">
            <FileText className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto" />
            <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
              কোনো নোট পাওয়া যায়নি
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
              {searchQuery
                ? 'আপনার অনুসন্ধানের সাথে মিলে এমন কোনো নোট পাওয়া যায়নি।'
                : 'আপনার আধ্যাত্মিক ভাবনা ও কুরআনি শিক্ষা সংরক্ষণ করতে উপরের বাটনে চাপ দিন।'}
            </p>
            <button
              onClick={handleOpenNewNote}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>প্রথম নোটটি লিখুন</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. Custom In-App Delete Confirmation Modal (NO window.confirm!) */}
      {noteToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#151B22] rounded-2xl w-full max-w-sm p-5 shadow-2xl border border-rose-200 dark:border-rose-900/40 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                নোট মুছে ফেলা নিশ্চিতকরণ
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                আপনি কি নিশ্চিতভাবে এই নোটটি মুছে ফেলতে চান?
              </p>
              <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800 text-xs font-semibold text-stone-800 dark:text-stone-200 line-clamp-1 border border-stone-200 dark:border-stone-700">
                “{noteToDelete.title}”
              </div>
              <p className="text-[11px] text-stone-400 pt-1">
                মুছে ফেলার পর এটি লোকাল ও ক্লাউড ডেটাবেস উভয় স্থান থেকেই মুছে যাবে।
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNoteToDelete(null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>মুছে ফেলুন</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
