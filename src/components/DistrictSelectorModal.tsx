import React, { useState } from 'react';
import { X, Search, MapPin, Navigation, Check } from 'lucide-react';
import { BANGLADESH_DISTRICTS } from '../data/districts';
import { District } from '../types';
import { triggerHaptic } from '../utils/audio';

interface DistrictSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDistrict: District;
  onSelectDistrict: (district: District) => void;
  onUseGps: () => void;
}

export const DistrictSelectorModal: React.FC<DistrictSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedDistrict,
  onSelectDistrict,
  onUseGps
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('সব');

  if (!isOpen) return null;

  const divisions = ['সব', 'ঢাকা', 'চট্টগ্রাম', 'রাজশাহী', 'খুলনা', 'সিলেট', 'বরিশাল', 'রংপুর', 'ময়মনসিংহ', 'সৌদি আরব'];

  const filteredDistricts = BANGLADESH_DISTRICTS.filter((d) => {
    const matchesDiv = selectedDivision === 'সব' || d.division === selectedDivision;
    const q = searchQuery.toLowerCase();
    const matchesQuery = d.nameBn.toLowerCase().includes(q) || d.nameEn.toLowerCase().includes(q);
    return matchesDiv && matchesQuery;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col overflow-hidden border border-stone-200 dark:border-stone-800 shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              জেলা বা শহর নির্বাচন করুন
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GPS Button & Search */}
        <div className="p-4 space-y-3 bg-stone-50 dark:bg-stone-800/40 border-b border-stone-100 dark:border-stone-800">
          <button
            onClick={() => {
              triggerHaptic(30);
              onUseGps();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            <Navigation className="w-4 h-4" />
            বর্তমান জিপিএস লোকেশন ব্যবহার করুন
          </button>

          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="জেলার নাম লিখুন (বাংলা বা ইংরেজি)..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs focus:outline-none focus:border-emerald-600"
            />
          </div>

          {/* Division filters */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {divisions.map((div) => (
              <button
                key={div}
                onClick={() => setSelectedDivision(div)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  selectedDivision === div
                    ? 'bg-emerald-700 text-white'
                    : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                }`}
              >
                {div}
              </button>
            ))}
          </div>
        </div>

        {/* Districts List */}
        <div className="p-3 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800 max-h-[50vh]">
          {filteredDistricts.map((d) => {
            const isSelected = selectedDistrict.id === d.id;
            return (
              <button
                key={d.id}
                onClick={() => {
                  triggerHaptic(20);
                  onSelectDistrict(d);
                  onClose();
                }}
                className={`w-full p-3 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 font-semibold text-emerald-900 dark:text-emerald-200'
                    : 'hover:bg-stone-50 dark:hover:bg-stone-800/50 text-stone-800 dark:text-stone-200'
                }`}
              >
                <div>
                  <span className="text-sm block">{d.nameBn}</span>
                  <span className="text-[11px] text-stone-400 font-normal">
                    {d.nameEn} · বিভাগ: {d.division}
                  </span>
                </div>

                {isSelected && (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                )}
              </button>
            );
          })}

          {filteredDistricts.length === 0 && (
            <div className="text-center py-8 text-stone-500 text-xs">
              কোনো জেলা খুঁজে পাওয়া যায়নি
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
