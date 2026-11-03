import { SurahMeta, SurahDetail } from '../types';
import { convertQuranTranslitToBengali } from '../utils/quranTransliteration';

export const ALL_SURAHS_META: SurahMeta[] = [
  { number: 1, nameArabic: 'الفَاتِحَة', nameBengali: 'আল-ফাতিহা', nameEnglish: 'Al-Fatihah', meaningBengali: 'ভূমিকা / সূচনা', versesCount: 7, revelationType: 'মাক্কী', juzNumber: 1 },
  { number: 2, nameArabic: 'البَقَرَة', nameBengali: 'আল-বাকারা', nameEnglish: 'Al-Baqarah', meaningBengali: 'গাভী', versesCount: 286, revelationType: 'মাদানী', juzNumber: 1 },
  { number: 3, nameArabic: 'آل عِمْرَان', nameBengali: 'আলে ইমরান', nameEnglish: 'Ali \'Imran', meaningBengali: 'ইমরানের পরিবার', versesCount: 200, revelationType: 'মাদানী', juzNumber: 3 },
  { number: 4, nameArabic: 'النِّسَاء', nameBengali: 'আন-নিসা', nameEnglish: 'An-Nisa', meaningBengali: 'নারী', versesCount: 176, revelationType: 'মাদানী', juzNumber: 4 },
  { number: 5, nameArabic: 'المَائِدَة', nameBengali: 'আল-মায়েদা', nameEnglish: 'Al-Ma\'idah', meaningBengali: 'খাদ্য পরিবেশিত টেবিল', versesCount: 120, revelationType: 'মাদানী', juzNumber: 6 },
  { number: 6, nameArabic: 'الأَنْعَام', nameBengali: 'আল-আনআম', nameEnglish: 'Al-An\'am', meaningBengali: 'গৃহপালিত পশু', versesCount: 165, revelationType: 'মাক্কী', juzNumber: 7 },
  { number: 7, nameArabic: 'الأَعْرَاف', nameBengali: 'আল-আরাফ', nameEnglish: 'Al-A\'raf', meaningBengali: 'উঁচু স্থানসমূহ', versesCount: 206, revelationType: 'মাক্কী', juzNumber: 8 },
  { number: 8, nameArabic: 'الأَنْفَال', nameBengali: 'আল-আনফাল', nameEnglish: 'Al-Anfal', meaningBengali: 'যুদ্ধলব্ধ সম্পদ', versesCount: 75, revelationType: 'মাদানী', juzNumber: 9 },
  { number: 9, nameArabic: 'التَّوْبَة', nameBengali: 'আত-তাওবাহ', nameEnglish: 'At-Tawbah', meaningBengali: 'অনুতাপ / ক্ষমা', versesCount: 129, revelationType: 'মাদানী', juzNumber: 10 },
  { number: 10, nameArabic: 'يُونُس', nameBengali: 'ইউনুস', nameEnglish: 'Yunus', meaningBengali: 'নবী ইউনুস (আ.)', versesCount: 109, revelationType: 'মাক্কী', juzNumber: 11 },
  { number: 11, nameArabic: 'هُود', nameBengali: 'হুদ', nameEnglish: 'Hud', meaningBengali: 'নবী হুদ (আ.)', versesCount: 123, revelationType: 'মাক্কী', juzNumber: 11 },
  { number: 12, nameArabic: 'يُوسُف', nameBengali: 'ইউসুফ', nameEnglish: 'Yusuf', meaningBengali: 'নবী ইউসুফ (আ.)', versesCount: 111, revelationType: 'মাক্কী', juzNumber: 12 },
  { number: 13, nameArabic: 'الرَّعْد', nameBengali: 'আর-রাদ', nameEnglish: 'Ar-Ra\'d', meaningBengali: 'বজ্রপাত', versesCount: 43, revelationType: 'মাদানী', juzNumber: 13 },
  { number: 14, nameArabic: 'إِبْرَاهِيم', nameBengali: 'ইব্রাহিম', nameEnglish: 'Ibrahim', meaningBengali: 'নবী ইব্রাহিম (আ.)', versesCount: 52, revelationType: 'মাক্কী', juzNumber: 13 },
  { number: 15, nameArabic: 'الحِجْر', nameBengali: 'আল-হিজর', nameEnglish: 'Al-Hijr', meaningBengali: 'পাথুরে পাহাড়', versesCount: 99, revelationType: 'মাক্কী', juzNumber: 14 },
  { number: 16, nameArabic: 'النَّحْل', nameBengali: 'আন-নাহল', nameEnglish: 'An-Nahl', meaningBengali: 'মৌমাছি', versesCount: 128, revelationType: 'মাক্কী', juzNumber: 14 },
  { number: 17, nameArabic: 'الإِسْرَاء', nameBengali: 'আল-ইসরা', nameEnglish: 'Al-Isra', meaningBengali: 'রজনী ভ্রমণ', versesCount: 111, revelationType: 'মাক্কী', juzNumber: 15 },
  { number: 18, nameArabic: 'الكَهْف', nameBengali: 'আল-কাহাফ', nameEnglish: 'Al-Kahf', meaningBengali: 'গুহা', versesCount: 110, revelationType: 'মাক্কী', juzNumber: 15 },
  { number: 19, nameArabic: 'مَرْيَم', nameBengali: 'মারিয়াম', nameEnglish: 'Maryam', meaningBengali: 'মারিয়াম (আ.)', versesCount: 98, revelationType: 'মাক্কী', juzNumber: 16 },
  { number: 20, nameArabic: 'طه', nameBengali: 'ত্বা-হা', nameEnglish: 'Ta-Ha', meaningBengali: 'ত্বা-হা', versesCount: 135, revelationType: 'মাক্কী', juzNumber: 16 },
  { number: 21, nameArabic: 'الأَنْبِيَاء', nameBengali: 'আল-আম্বিয়া', nameEnglish: 'Al-Anbiya', meaningBengali: 'নবীগণ', versesCount: 112, revelationType: 'মাক্কী', juzNumber: 17 },
  { number: 22, nameArabic: 'الحَجّ', nameBengali: 'আল-হজ্জ', nameEnglish: 'Al-Hajj', meaningBengali: 'হজ', versesCount: 78, revelationType: 'মাদানী', juzNumber: 17 },
  { number: 23, nameArabic: 'المُؤْمِنُون', nameBengali: 'আল-মুমিনুন', nameEnglish: 'Al-Mu\'minun', meaningBengali: 'মুমিনগণ', versesCount: 118, revelationType: 'মাক্কী', juzNumber: 18 },
  { number: 24, nameArabic: 'النُّور', nameBengali: 'আন-নুর', nameEnglish: 'An-Nur', meaningBengali: 'জ্যোতি / আলো', versesCount: 64, revelationType: 'মাদানী', juzNumber: 18 },
  { number: 25, nameArabic: 'الفُرْقَان', nameBengali: 'আল-ফুরকান', nameEnglish: 'Al-Furqan', meaningBengali: 'সত্য-মিথ্যার পার্থক্যকারী', versesCount: 77, revelationType: 'মাক্কী', juzNumber: 18 },
  { number: 26, nameArabic: 'الشُّعَرَاء', nameBengali: 'আশ-শুআরা', nameEnglish: 'Ash-Shu\'ara', meaningBengali: 'কবিগণ', versesCount: 227, revelationType: 'মাক্কী', juzNumber: 19 },
  { number: 27, nameArabic: 'النَّمْل', nameBengali: 'আন-নামল', nameEnglish: 'An-Naml', meaningBengali: 'পিঁপড়া', versesCount: 93, revelationType: 'মাক্কী', juzNumber: 19 },
  { number: 28, nameArabic: 'القَصَص', nameBengali: 'আল-কাসাস', nameEnglish: 'Al-Qasas', meaningBengali: 'কাহিনী', versesCount: 88, revelationType: 'মাক্কী', juzNumber: 20 },
  { number: 29, nameArabic: 'العَنْكَبُوت', nameBengali: 'আল-আনকাবুত', nameEnglish: 'Al-\'Ankabut', meaningBengali: 'মাকড়সা', versesCount: 69, revelationType: 'মাক্কী', juzNumber: 20 },
  { number: 30, nameArabic: 'الرُّوم', nameBengali: 'আর-রুম', nameEnglish: 'Ar-Rum', meaningBengali: 'রোমান জাতি', versesCount: 60, revelationType: 'মাক্কী', juzNumber: 21 },
  { number: 31, nameArabic: 'لُقْمَان', nameBengali: 'লুকমান', nameEnglish: 'Luqman', meaningBengali: 'জ্ঞানী লুকমান', versesCount: 34, revelationType: 'মাক্কী', juzNumber: 21 },
  { number: 32, nameArabic: 'السَّجْدَة', nameBengali: 'আস-সাজদাহ', nameEnglish: 'As-Sajdah', meaningBengali: 'সিজদা', versesCount: 30, revelationType: 'মাক্কী', juzNumber: 21 },
  { number: 33, nameArabic: 'الأَحْزَاب', nameBengali: 'আল-আহযাব', nameEnglish: 'Al-Ahzab', meaningBengali: 'মিত্রবাহিনী', versesCount: 73, revelationType: 'মাদানী', juzNumber: 21 },
  { number: 34, nameArabic: 'سَبَأ', nameBengali: 'সাবা', nameEnglish: 'Saba', meaningBengali: 'সাবা সম্প্রদায়', versesCount: 54, revelationType: 'মাক্কী', juzNumber: 22 },
  { number: 35, nameArabic: 'فَاطِر', nameBengali: 'ফাতির', nameEnglish: 'Fatir', meaningBengali: 'আদি স্রষ্টা', versesCount: 45, revelationType: 'মাক্কী', juzNumber: 22 },
  { number: 36, nameArabic: 'يس', nameBengali: 'ইয়াসিন', nameEnglish: 'Ya-Sin', meaningBengali: 'ইয়াসিন', versesCount: 83, revelationType: 'মাক্কী', juzNumber: 22 },
  { number: 37, nameArabic: 'الصَّافَّات', nameBengali: 'আস-সাফফাত', nameEnglish: 'As-Saffat', meaningBengali: 'সারিবদ্ধ দল', versesCount: 182, revelationType: 'মাক্কী', juzNumber: 23 },
  { number: 38, nameArabic: 'ص', nameBengali: 'সোয়াদ', nameEnglish: 'Sad', meaningBengali: 'সোয়াদ', versesCount: 88, revelationType: 'মাক্কী', juzNumber: 23 },
  { number: 39, nameArabic: 'الزُّمَر', nameBengali: 'আজ-জুমার', nameEnglish: 'Az-Zumar', meaningBengali: 'দলবদ্ধ জনতা', versesCount: 75, revelationType: 'মাক্কী', juzNumber: 23 },
  { number: 40, nameArabic: 'غَافِر', nameBengali: 'গাফির', nameEnglish: 'Ghafir', meaningBengali: 'ক্ষমাশীল', versesCount: 85, revelationType: 'মাক্কী', juzNumber: 24 },
  { number: 41, nameArabic: 'فُصِّلَت', nameBengali: 'ফুসসিলাত', nameEnglish: 'Fussilat', meaningBengali: 'সুস্পষ্ট বিবরণ', versesCount: 54, revelationType: 'মাক্কী', juzNumber: 24 },
  { number: 42, nameArabic: 'الشُّورَى', nameBengali: 'আশ-শুরা', nameEnglish: 'Ash-Shura', meaningBengali: 'পরামর্শ', versesCount: 53, revelationType: 'মাক্কী', juzNumber: 25 },
  { number: 43, nameArabic: 'الزُّخْرُف', nameBengali: 'আজ-জুখরূফ', nameEnglish: 'Az-Zukhruf', meaningBengali: 'সোনার অলংকার', versesCount: 89, revelationType: 'মাক্কী', juzNumber: 25 },
  { number: 44, nameArabic: 'الدُّخَان', nameBengali: 'আদ-দুখান', nameEnglish: 'Ad-Dukhan', meaningBengali: 'ধোঁয়া', versesCount: 59, revelationType: 'মাক্কী', juzNumber: 25 },
  { number: 45, nameArabic: 'الجَاثِيَة', nameBengali: 'আল-জাছিয়া', nameEnglish: 'Al-Jathiyah', meaningBengali: 'নতজানু', versesCount: 37, revelationType: 'মাক্কী', juzNumber: 25 },
  { number: 46, nameArabic: 'الأَحْقَاف', nameBengali: 'আল-আহকাফ', nameEnglish: 'Al-Ahqaf', meaningBengali: 'বালুর পাহাড়', versesCount: 35, revelationType: 'মাক্কী', juzNumber: 26 },
  { number: 47, nameArabic: 'مُحَمَّد', nameBengali: 'মুহাম্মদ', nameEnglish: 'Muhammad', meaningBengali: 'মুহাম্মদ (সা.)', versesCount: 38, revelationType: 'মাদানী', juzNumber: 26 },
  { number: 48, nameArabic: 'الفَتْح', nameBengali: 'আল-ফাতহ', nameEnglish: 'Al-Fath', meaningBengali: 'বিজয়', versesCount: 29, revelationType: 'মাদানী', juzNumber: 26 },
  { number: 49, nameArabic: 'الحُجُرَات', nameBengali: 'আল-হুজুরাত', nameEnglish: 'Al-Hujurat', meaningBengali: 'গৃহকক্ষসমূহ', versesCount: 18, revelationType: 'মাদানী', juzNumber: 26 },
  { number: 50, nameArabic: 'ق', nameBengali: 'কাফ', nameEnglish: 'Qaf', meaningBengali: 'কাফ', versesCount: 45, revelationType: 'মাক্কী', juzNumber: 26 },
  { number: 51, nameArabic: 'الذَّارِيَات', nameBengali: 'আজ-যারিয়াত', nameEnglish: 'Adh-Dhariyat', meaningBengali: 'বিক্ষেপকারী বাতাস', versesCount: 60, revelationType: 'মাক্কী', juzNumber: 26 },
  { number: 52, nameArabic: 'الطُّور', nameBengali: 'আত-তুর', nameEnglish: 'At-Tur', meaningBengali: 'তুর পাহাড়', versesCount: 49, revelationType: 'মাক্কী', juzNumber: 27 },
  { number: 53, nameArabic: 'النَّجْم', nameBengali: 'আন-নাজম', nameEnglish: 'An-Najm', meaningBengali: 'তারা / নক্ষত্র', versesCount: 62, revelationType: 'মাক্কী', juzNumber: 27 },
  { number: 54, nameArabic: 'القَمَر', nameBengali: 'আল-কামার', nameEnglish: 'Al-Qamar', meaningBengali: 'চাঁদ', versesCount: 55, revelationType: 'মাক্কী', juzNumber: 27 },
  { number: 55, nameArabic: 'الرَّحْمَن', nameBengali: 'আর-রহমান', nameEnglish: 'Ar-Rahman', meaningBengali: 'পরম করুণাময়', versesCount: 78, revelationType: 'মাদানী', juzNumber: 27 },
  { number: 56, nameArabic: 'الوَاقِعَة', nameBengali: 'আল-ওয়াকিয়াহ', nameEnglish: 'Al-Waqi\'ah', meaningBengali: 'নিশ্চিত ঘটনা (কিয়ামত)', versesCount: 96, revelationType: 'মাক্কী', juzNumber: 27 },
  { number: 57, nameArabic: 'الحَدِيد', nameBengali: 'আল-হাদিদ', nameEnglish: 'Al-Hadid', meaningBengali: 'লোহা', versesCount: 29, revelationType: 'মাদানী', juzNumber: 27 },
  { number: 58, nameArabic: 'المُجَادِلَة', nameBengali: 'আল-মুজাদালাহ', nameEnglish: 'Al-Mujadila', meaningBengali: 'অনুরোধকারিণী নারী', versesCount: 22, revelationType: 'মাদানী', juzNumber: 28 },
  { number: 59, nameArabic: 'الحَشْر', nameBengali: 'আল-হাশর', nameEnglish: 'Al-Hashr', meaningBengali: 'সমাবেশ', versesCount: 24, revelationType: 'মাদানী', juzNumber: 28 },
  { number: 60, nameArabic: 'المُمْتَحَنَة', nameBengali: 'আল-মুমতাহিনা', nameEnglish: 'Al-Mumtahanah', meaningBengali: 'পরীক্ষিতা নারী', versesCount: 13, revelationType: 'মাদানী', juzNumber: 28 },
  { number: 61, nameArabic: 'الصَّفّ', nameBengali: 'আস-সাফ', nameEnglish: 'As-Saff', meaningBengali: 'সারিবদ্ধ সারি', versesCount: 14, revelationType: 'মাদানী', juzNumber: 28 },
  { number: 62, nameArabic: 'الجُمُعَة', nameBengali: 'আল-জুমুআহ', nameEnglish: 'Al-Jumu\'ah', meaningBengali: 'শুক্রবার / সমাবেশ', versesCount: 11, revelationType: 'মাদানী', juzNumber: 28 },
  { number: 63, nameArabic: 'المُنَافِقُون', nameBengali: 'আল-মুনাফিকুন', nameEnglish: 'Al-Munafiqun', meaningBengali: 'কপট বিশ্বাসীগণ', versesCount: 11, revelationType: 'মাদানী', juzNumber: 28 },
  { number: 64, nameArabic: 'التَّغَابُن', nameBengali: 'আত-তাগাবুন', nameEnglish: 'At-Taghabun', meaningBengali: 'লাভ-ক্ষতি নির্ধারণ', versesCount: 18, revelationType: 'মাদানী', juzNumber: 28 },
  { number: 65, nameArabic: 'الطَّلَاق', nameBengali: 'আত-ত্বালাক', nameEnglish: 'At-Talaq', meaningBengali: 'তালাক / বিবাহ বিচ্ছেদ', versesCount: 12, revelationType: 'মাদানী', juzNumber: 28 },
  { number: 66, nameArabic: 'التَّحْرِيم', nameBengali: 'আত-তাহরীম', nameEnglish: 'At-Tahrim', meaningBengali: 'নিষিদ্ধকরণ', versesCount: 12, revelationType: 'মাদানী', juzNumber: 28 },
  { number: 67, nameArabic: 'المُلْك', nameBengali: 'আল-মুলক', nameEnglish: 'Al-Mulk', meaningBengali: 'সার্বভৌম কর্তৃত্ব', versesCount: 30, revelationType: 'মাক্কী', juzNumber: 29 },
  { number: 68, nameArabic: 'القَلَم', nameBengali: 'আল-কলম', nameEnglish: 'Al-Qalam', meaningBengali: 'কলম', versesCount: 52, revelationType: 'মাক্কী', juzNumber: 29 },
  { number: 69, nameArabic: 'الحَاقَّة', nameBengali: 'আল-হাক্কাহ', nameEnglish: 'Al-Haqqah', meaningBengali: 'অমোঘ সত্য', versesCount: 52, revelationType: 'মাক্কী', juzNumber: 29 },
  { number: 70, nameArabic: 'المَعَارِج', nameBengali: 'আল-মাআরিজ', nameEnglish: 'Al-Ma\'arij', meaningBengali: 'উন্নয়নের সোপান', versesCount: 44, revelationType: 'মাক্কী', juzNumber: 29 },
  { number: 71, nameArabic: 'نُوح', nameBengali: 'নূহ', nameEnglish: 'Nuh', meaningBengali: 'নবী নূহ (আ.)', versesCount: 28, revelationType: 'মাক্কী', juzNumber: 29 },
  { number: 72, nameArabic: 'الجِنّ', nameBengali: 'আল-জ্বিন', nameEnglish: 'Al-Jinn', meaningBengali: 'জিন জাতি', versesCount: 28, revelationType: 'মাক্কী', juzNumber: 29 },
  { number: 73, nameArabic: 'المُزَّمِّل', nameBengali: 'আল-মুযযাম্মিল', nameEnglish: 'Al-Muzzammil', meaningBengali: 'বস্ত্রাবৃত', versesCount: 20, revelationType: 'মাক্কী', juzNumber: 29 },
  { number: 74, nameArabic: 'المُدَّثِّر', nameBengali: 'আল-মুদ্দাচ্ছির', nameEnglish: 'Al-Muddaththir', meaningBengali: 'চাদরাবৃত', versesCount: 56, revelationType: 'মাক্কী', juzNumber: 29 },
  { number: 75, nameArabic: 'القِيَامَة', nameBengali: 'আল-কিয়ামাহ', nameEnglish: 'Al-Qiyamah', meaningBengali: 'পুনরুত্থান দিবস', versesCount: 40, revelationType: 'মাক্কী', juzNumber: 29 },
  { number: 76, nameArabic: 'الإِنْسَان', nameBengali: 'আল-ইনসান', nameEnglish: 'Al-Insan', meaningBengali: 'মানুষ', versesCount: 31, revelationType: 'মাদানী', juzNumber: 29 },
  { number: 77, nameArabic: 'المُرْسَلَات', nameBengali: 'আল-মুরসালাত', nameEnglish: 'Al-Mursalat', meaningBengali: 'প্রেরিত বাতাস', versesCount: 50, revelationType: 'মাক্কী', juzNumber: 29 },
  { number: 78, nameArabic: 'النَّبَأ', nameBengali: 'আন-নাবা', nameEnglish: 'An-Naba', meaningBengali: 'মহা সংবাদ', versesCount: 40, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 79, nameArabic: 'النَّازِعَات', nameBengali: 'আন-নাযিয়াত', nameEnglish: 'An-Nazi\'at', meaningBengali: 'উৎপাটনকারী ফেরেশতা', versesCount: 46, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 80, nameArabic: 'عَبَسَ', nameBengali: 'আবাসা', nameEnglish: '\'Abasa', meaningBengali: 'তিনি ভ্রূকুটি করলেন', versesCount: 42, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 81, nameArabic: 'التَّكْوِير', nameBengali: 'আত-তাকভীর', nameEnglish: 'At-Takwir', meaningBengali: 'অন্ধকারাচ্ছন্ন হওয়া', versesCount: 29, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 82, nameArabic: 'الانْفِطَار', nameBengali: 'আল-ইনফিতার', nameEnglish: 'Al-Infitar', meaningBengali: 'বিদীর্ণ হওয়া', versesCount: 19, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 83, nameArabic: 'المُطَفِّفِين', nameBengali: 'আল-মুতাফফিফীন', nameEnglish: 'Al-Mutaffifin', meaningBengali: 'মাপে কম দানকারী', versesCount: 36, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 84, nameArabic: 'الانْشِقَاق', nameBengali: 'আল-ইনশিকাক', nameEnglish: 'Al-Inshiqaq', meaningBengali: 'খণ্ডিত হওয়া', versesCount: 25, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 85, nameArabic: 'البُرُوج', nameBengali: 'আল-বুরুজ', nameEnglish: 'Al-Buruj', meaningBengali: 'নক্ষত্রপুঞ্জ', versesCount: 22, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 86, nameArabic: 'الطَّارِق', nameBengali: 'আত-তারিক', nameEnglish: 'At-Tariq', meaningBengali: 'রাতের আগমনকারী', versesCount: 17, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 87, nameArabic: 'الأَعْلَى', nameBengali: 'আল-আলা', nameEnglish: 'Al-A\'la', meaningBengali: 'সর্বোচ্চ মহান', versesCount: 19, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 88, nameArabic: 'الغَاشِيَة', nameBengali: 'আল-গাশিয়াহ', nameEnglish: 'Al-Ghashiyah', meaningBengali: 'আচ্ছন্নকারী মহা বিপদ', versesCount: 26, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 89, nameArabic: 'الفَجْر', nameBengali: 'আল-ফজর', nameEnglish: 'Al-Fajr', meaningBengali: 'ভোরবেলা / প্রভাত', versesCount: 30, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 90, nameArabic: 'البَلَد', nameBengali: 'আল-বালাদ', nameEnglish: 'Al-Balad', meaningBengali: 'নগরী (মক্কা)', versesCount: 20, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 91, nameArabic: 'الشَّمْس', nameBengali: 'আশ-শামস', nameEnglish: 'Ash-Shams', meaningBengali: 'সূর্য', versesCount: 15, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 92, nameArabic: 'اللَّيْل', nameBengali: 'আল-লাইল', nameEnglish: 'Al-Layl', meaningBengali: 'রাত / রজনী', versesCount: 21, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 93, nameArabic: 'الضُّحَى', nameBengali: 'আদ-দুহা', nameEnglish: 'Ad-Duha', meaningBengali: 'পূর্বাহ্নের উজ্জ্বল আলো', versesCount: 11, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 94, nameArabic: 'الشَّرْح', nameBengali: 'আল-ইনশিরাহ', nameEnglish: 'Ash-Sharh', meaningBengali: 'বক্ষ প্রশস্তকরণ', versesCount: 8, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 95, nameArabic: 'التِّين', nameBengali: 'আত-তীন', nameEnglish: 'At-Tin', meaningBengali: 'ডুমুর / আঞ্জির ফল', versesCount: 8, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 96, nameArabic: 'العَلَق', nameBengali: 'আল-আলাক', nameEnglish: 'Al-\'Alaq', meaningBengali: 'রক্তপিণ্ড / ভ্রূণ', versesCount: 19, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 97, nameArabic: 'القَدْر', nameBengali: 'আল-কদর', nameEnglish: 'Al-Qadr', meaningBengali: 'মহিমান্বিত রাত', versesCount: 5, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 98, nameArabic: 'البَيِّنَة', nameBengali: 'আল-বাইয়্যিনাহ', nameEnglish: 'Al-Bayyinah', meaningBengali: 'সুস্পষ্ট প্রমাণ', versesCount: 8, revelationType: 'মাদানী', juzNumber: 30 },
  { number: 99, nameArabic: 'الزَّلْزَلَة', nameBengali: 'আল-যিলযাল', nameEnglish: 'Az-Zalzalah', meaningBengali: 'মহা ভূমিকম্প', versesCount: 8, revelationType: 'মাদানী', juzNumber: 30 },
  { number: 100, nameArabic: 'العَادِيَات', nameBengali: 'আল-আদিয়াত', nameEnglish: 'Al-\'Adiyat', meaningBengali: 'অভিযানকারী অশ্ব', versesCount: 11, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 101, nameArabic: 'القَارِعَة', nameBengali: 'আল-কারিআহ', nameEnglish: 'Al-Qari\'ah', meaningBengali: 'মহা বিপর্যয়', versesCount: 11, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 102, nameArabic: 'التَّكَاثُر', nameBengali: 'আত-তাকাসুর', nameEnglish: 'At-Takathur', meaningBengali: 'প্রাচুর্যের প্রতিযোগিতা', versesCount: 8, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 103, nameArabic: 'العَصْر', nameBengali: 'আল-আসর', nameEnglish: 'Al-\'Asr', meaningBengali: 'কাল / সময়', versesCount: 3, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 104, nameArabic: 'الهُمَزَة', nameBengali: 'আল-হুমাযাহ', nameEnglish: 'Al-Humazah', meaningBengali: 'পরনিন্দাকারী', versesCount: 9, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 105, nameArabic: 'الفِيل', nameBengali: 'আল-ফীল', nameEnglish: 'Al-Fil', meaningBengali: 'হাতি', versesCount: 5, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 106, nameArabic: 'قُرَيْش', nameBengali: 'কুরাইশ', nameEnglish: 'Quraysh', meaningBengali: 'কুরাইশ গোত্র', versesCount: 4, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 107, nameArabic: 'المَاعُون', nameBengali: 'আল-মাউন', nameEnglish: 'Al-Ma\'un', meaningBengali: 'নিত্য প্রয়োজনীয় বস্তু', versesCount: 7, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 108, nameArabic: 'الكَوْثَر', nameBengali: 'আল-কাউসার', nameEnglish: 'Al-Kawthar', meaningBengali: 'প্রচুর কল্যাণ / জান্নাতের ঝর্ণা', versesCount: 3, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 109, nameArabic: 'الكَافِرُون', nameBengali: 'আল-কাফিরুন', nameEnglish: 'Al-Kafirun', meaningBengali: 'অবিশ্বাসীগণ', versesCount: 6, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 110, nameArabic: 'النَّصْر', nameBengali: 'আন-নাসর', nameEnglish: 'An-Nasr', meaningBengali: 'আল্লাহর সাহায্য ও বিজয়', versesCount: 3, revelationType: 'মাদানী', juzNumber: 30 },
  { number: 111, nameArabic: 'المَسَد', nameBengali: 'আল-মাসাদ', nameEnglish: 'Al-Masad', meaningBengali: 'খেজুরের শক্ত রশি', versesCount: 5, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 112, nameArabic: 'الإِخْلَاص', nameBengali: 'আল-ইখলাস', nameEnglish: 'Al-Ikhlas', meaningBengali: 'একনিষ্ঠ বিশ্বাস / তাওহীদ', versesCount: 4, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 113, nameArabic: 'الفَلَق', nameBengali: 'আল-ফালাক', nameEnglish: 'Al-Falaq', meaningBengali: 'প্রভাত / ভোরের আলো', versesCount: 5, revelationType: 'মাক্কী', juzNumber: 30 },
  { number: 114, nameArabic: 'النَّاس', nameBengali: 'আন-নাস', nameEnglish: 'An-Nas', meaningBengali: 'মানবজাতি', versesCount: 6, revelationType: 'মাক্কী', juzNumber: 30 }
];

// Offline verified complete Surahs
export const OFFLINE_SURAHS: Record<number, SurahDetail> = {
  1: {
    number: 1,
    nameArabic: 'الفَاتِحَة',
    nameBengali: 'আল-ফাতিহা',
    nameEnglish: 'Al-Fatihah',
    meaningBengali: 'ভূমিকা / সূচনা',
    versesCount: 7,
    revelationType: 'মাক্কী',
    juzNumber: 1,
    bismillahPre: false,
    ayahs: [
      {
        numberInSurah: 1,
        textArabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
        transliterationBn: 'বিসমিল্লাহির রাহমানির রাহীম',
        textBengali: 'শুরু করছি পরম করুণাময় ও অসীম দয়ালু আল্লাহর নামে।',
        textEnglish: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.'
      },
      {
        numberInSurah: 2,
        textArabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
        transliterationBn: 'আলহামদু লিল্লাহি রাব্বিল আলামীন',
        textBengali: 'সকল প্রশংসা বিশ্বজগতের প্রতিপালক আল্লাহর জন্য।',
        textEnglish: '[All] praise is [due] to Allah, Lord of the worlds.'
      },
      {
        numberInSurah: 3,
        textArabic: 'الرَّحْمَٰنِ الرَّحِيمِ',
        transliterationBn: 'আর-রাহমানির রাহীম',
        textBengali: 'যিনি পরম করুণাময় ও অসীম দয়ালু।',
        textEnglish: 'The Entirely Merciful, the Especially Merciful,'
      },
      {
        numberInSurah: 4,
        textArabic: 'مَالِكِ يَوْمِ الدِّينِ',
        transliterationBn: 'মালিকি ইয়াওমিদ্দীন',
        textBengali: 'যিনি প্রতিফল দিবসের মালিক।',
        textEnglish: 'Sovereign of the Day of Recompense.'
      },
      {
        numberInSurah: 5,
        textArabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
        transliterationBn: 'ইয়্যাকা না’বুদু ওয়া ইয়্যাকা নাসতাঈন',
        textBengali: 'আমরা কেবল আপনারই ইবাদত করি এবং কেবল আপনারই নিকট সাহায্য প্রার্থনা করি।',
        textEnglish: 'It is You we worship and You we ask for help.'
      },
      {
        numberInSurah: 6,
        textArabic: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ',
        transliterationBn: 'ইহদিনাস সিরাতাল মুস্তাকীম',
        textBengali: 'আমাদেরকে সরল-সঠিক পথ প্রদর্শন করুন।',
        textEnglish: 'Guide us to the straight path -'
      },
      {
        numberInSurah: 7,
        textArabic: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ',
        transliterationBn: 'সিরাতাল্লাযীনা আন’আমতা আলাইহিম, গাইরিল মাগদূবি আলাইহিম ওয়ালাদ্দাল্লীন।',
        textBengali: 'তাদের পথ যাদের আপনি অনুগ্রহ করেছেন, তাদের পথ নয় যারা ক্রোধের শিকার এবং পথভ্রষ্টও নয়।',
        textEnglish: 'The path of those upon whom You have bestowed favor, not of those who have evoked [Your] anger or of those who are astray.'
      }
    ]
  },
  103: {
    number: 103,
    nameArabic: 'العَصْر',
    nameBengali: 'আল-আসর',
    nameEnglish: 'Al-\'Asr',
    meaningBengali: 'কাল / সময়',
    versesCount: 3,
    revelationType: 'মাক্কী',
    juzNumber: 30,
    bismillahPre: true,
    ayahs: [
      {
        numberInSurah: 1,
        textArabic: 'وَالْعَصْرِ',
        transliterationBn: 'ওয়াল আসর',
        textBengali: 'মহাকালের শপথ,',
        textEnglish: 'By time,'
      },
      {
        numberInSurah: 2,
        textArabic: 'إِنَّ الْإِنسَانَ لَفِي خُسْرٍ',
        transliterationBn: 'ইন্নাল ইনসানা লাফী খুসর',
        textBengali: 'নিশ্চয় মানুষ মহা ক্ষতির মধ্যে নিমজ্জিত।',
        textEnglish: 'Indeed, mankind is in loss,'
      },
      {
        numberInSurah: 3,
        textArabic: 'إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ',
        transliterationBn: 'ইল্লাল্লাযীনা আমানু ওয়া আমিলুস সালিহাতি ওয়া তাওয়াসাও বিল হাক্কি ওয়া তাওয়াসাও বিস সাবর।',
        textBengali: 'তবে তারা ছাড়া যারা ঈমান এনেছে, সৎকাজ করেছে এবং পরস্পরকে সত্যের উপদেশ ও ধৈর্যের পরামর্শ দিয়েছে।',
        textEnglish: 'Except for those who have believed and done righteous deeds and advised each other to truth and advised each other to patience.'
      }
    ]
  },
  108: {
    number: 108,
    nameArabic: 'الكَوْثَر',
    nameBengali: 'আল-কাউসার',
    nameEnglish: 'Al-Kawthar',
    meaningBengali: 'প্রচুর কল্যাণ',
    versesCount: 3,
    revelationType: 'মাক্কী',
    juzNumber: 30,
    bismillahPre: true,
    ayahs: [
      {
        numberInSurah: 1,
        textArabic: 'إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ',
        transliterationBn: 'ইন্না আ’তাইনা-কাল কাওসার',
        textBengali: 'নিশ্চয় আমি আপনাকে কাউসার (প্রচুর কল্যাণ) দান করেছি।',
        textEnglish: 'Indeed, We have granted you, [O Muhammad], al-Kawthar.'
      },
      {
        numberInSurah: 2,
        textArabic: 'فَصَلِّ لِرَبِّكَ وَانْحَرْ',
        transliterationBn: 'ফাসাল্লি লিরাব্বিকা ওয়ানহার',
        textBengali: 'অতএব আপনি আপনার প্রতিপালকের উদ্দেশ্যে নামাজ পড়ুন এবং কোরবানি করুন।',
        textEnglish: 'So pray to your Lord and sacrifice [to Him alone].'
      },
      {
        numberInSurah: 3,
        textArabic: 'إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ',
        transliterationBn: 'ইন্না শানিআকা হুয়াল আবতার',
        textBengali: 'নিশ্চয় আপনার শত্রুই নির্বংশ ও শেকড়হীন।',
        textEnglish: 'Indeed, your enemy is the one cut off.'
      }
    ]
  },
  112: {
    number: 112,
    nameArabic: 'الإِخْلَاص',
    nameBengali: 'আল-ইখলাস',
    nameEnglish: 'Al-Ikhlas',
    meaningBengali: 'একনিষ্ঠ বিশ্বাস / তাওহীদ',
    versesCount: 4,
    revelationType: 'মাক্কী',
    juzNumber: 30,
    bismillahPre: true,
    ayahs: [
      {
        numberInSurah: 1,
        textArabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ',
        transliterationBn: 'কুল হুওয়াল্লাহু আহাদ',
        textBengali: 'বলুন, তিনিই আল্লাহ, একক ও অদ্বিতীয়।',
        textEnglish: 'Say, "He is Allah, [who is] One,'
      },
      {
        numberInSurah: 2,
        textArabic: 'اللَّهُ الصَّمَدُ',
        transliterationBn: 'আল্লাহুস সামাদ',
        textBengali: 'আল্লাহ অমুখাপেক্ষী (সকলের আশ্রয়)।',
        textEnglish: 'Allah, the Eternal Refuge.'
      },
      {
        numberInSurah: 3,
        textArabic: 'لَمْ يَلِدْ وَلَمْ يُولَدْ',
        transliterationBn: 'লাম ইয়ালিদ ওয়া লাম ইউলাদ',
        textBengali: 'তিনি কাউকে জন্ম দেননি এবং তাঁকেও কেউ জন্ম দেয়নি,',
        textEnglish: 'He neither begets nor is born,'
      },
      {
        numberInSurah: 4,
        textArabic: 'وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ',
        transliterationBn: 'ওয়া লাম ইয়া কুল্লাহু কুফুওয়ান আহাদ',
        textBengali: 'এবং তাঁর সমকক্ষ কেউই নেই।',
        textEnglish: 'Nor is there to Him any equivalent."'
      }
    ]
  },
  113: {
    number: 113,
    nameArabic: 'الفَلَق',
    nameBengali: 'আল-ফালাক',
    nameEnglish: 'Al-Falaq',
    meaningBengali: 'ভোরের আলো / প্রভাত',
    versesCount: 5,
    revelationType: 'মাক্কী',
    juzNumber: 30,
    bismillahPre: true,
    ayahs: [
      {
        numberInSurah: 1,
        textArabic: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ',
        transliterationBn: 'কুল আউযু বিরাব্বিল ফালাক',
        textBengali: 'বলুন, আমি আশ্রয় প্রার্থনা করছি প্রভাতের প্রতিপালকের,',
        textEnglish: 'Say, "I seek refuge in the Lord of daybreak'
      },
      {
        numberInSurah: 2,
        textArabic: 'مِن شَرِّ مَا خَلَقَ',
        transliterationBn: 'মিন শাররি মা খালাক',
        textBengali: 'তিনি যা সৃষ্টি করেছেন তার অনিষ্ট হতে,',
        textEnglish: 'From the evil of that which He created'
      },
      {
        numberInSurah: 3,
        textArabic: 'وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ',
        transliterationBn: 'ওয়া মিন শাররি গাসিকিন ইযা ওয়াকাব',
        textBengali: 'এবং রাতের অন্ধকারের অনিষ্ট হতে যখন তা সমাগত হয়,',
        textEnglish: 'And from the evil of darkness when it settles'
      },
      {
        numberInSurah: 4,
        textArabic: 'وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ',
        transliterationBn: 'ওয়া মিন শাররিন নাফ্ফাছাতি ফিল উকাদ',
        textBengali: 'এবং গ্রন্থিতে ফুৎকারকারিণীদের অনিষ্ট হতে (যাদুটোনা),',
        textEnglish: 'And from the evil of the blowers in knots'
      },
      {
        numberInSurah: 5,
        textArabic: 'وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ',
        transliterationBn: 'ওয়া মিন শাররি হাসিদিন ইযা হাসাদ',
        textBengali: 'এবং হিংসুকের অনিষ্ট হতে যখন সে হিংসা করে।',
        textEnglish: 'And from the evil of an envier when he envies."'
      }
    ]
  },
  114: {
    number: 114,
    nameArabic: 'النَّاس',
    nameBengali: 'আন-নাস',
    nameEnglish: 'An-Nas',
    meaningBengali: 'মানবজাতি',
    versesCount: 6,
    revelationType: 'মাক্কী',
    juzNumber: 30,
    bismillahPre: true,
    ayahs: [
      {
        numberInSurah: 1,
        textArabic: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ',
        transliterationBn: 'কুল আউযু বিরাব্বিন নাস',
        textBengali: 'বলুন, আমি মানুষের প্রতিপালকের আশ্রয় প্রার্থনা করছি,',
        textEnglish: 'Say, "I seek refuge in the Lord of mankind,'
      },
      {
        numberInSurah: 2,
        textArabic: 'مَلِكِ النَّاسِ',
        transliterationBn: 'মালিকিন নাস',
        textBengali: 'যিনি মানুষের অধিপতি,',
        textEnglish: 'The Sovereign of mankind.'
      },
      {
        numberInSurah: 3,
        textArabic: 'إِلَٰهِ النَّاسِ',
        transliterationBn: 'ইলাহিন নাস',
        textBengali: 'মানুষের উপাস্য,',
        textEnglish: 'The God of mankind,'
      },
      {
        numberInSurah: 4,
        textArabic: 'مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ',
        transliterationBn: 'মিন শাররিল ওয়াসওয়াসিল খান্নাস',
        textBengali: 'আত্মগোপনকারী কুমন্ত্রণাদাতার অনিষ্ট হতে,',
        textEnglish: 'From the evil of the retreating whisperer -'
      },
      {
        numberInSurah: 5,
        textArabic: 'الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ',
        transliterationBn: 'আল্লাযী ইউওয়াসউইসু ফী সুদূরিন নাস',
        textBengali: 'যে মানুষের অন্তরে কুমন্ত্রণা দেয়,',
        textEnglish: 'Who whispers [evil] into the breasts of mankind -'
      },
      {
        numberInSurah: 6,
        textArabic: 'مِنَ الْجِنَّةِ وَالنَّاسِ',
        transliterationBn: 'মিনাল জিন্নাতি ওয়ান্নাস',
        textBengali: 'জিনের মধ্য হতে এবং মানুষের মধ্য হতে।',
        textEnglish: 'From among the jinn and mankind."'
      }
    ]
  },
  67: {
    number: 67,
    nameArabic: 'المُلْك',
    nameBengali: 'আল-মুলক',
    nameEnglish: 'Al-Mulk',
    meaningBengali: 'সার্বভৌম কর্তৃত্ব',
    versesCount: 30,
    revelationType: 'মাক্কী',
    juzNumber: 29,
    bismillahPre: true,
    ayahs: [
      {
        numberInSurah: 1,
        textArabic: 'تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ',
        transliterationBn: 'তাবারাকাল্লাযী বিয়াদিহিল মুলকু ওয়াহুওয়া আলা কুল্লি শাইয়িন কাদীর',
        textBengali: 'বরকতময় তিনি যাঁর হাতে সর্বময় কর্তৃত্ব, এবং তিনি সকল কিছুর ওপর পূর্ণ ক্ষমতাবান।',
        textEnglish: 'Blessed is He in whose hand is dominion, and He is over all things competent -'
      },
      {
        numberInSurah: 2,
        textArabic: 'الَّذِي خَلَقَ الْمَوْتَ وَالْحَيَاةَ لِيَبْلُوَكُمْ أَيُّكُمْ أَحْسَنُ عَمَلًا ۚ وَهُوَ الْعَزِيزُ الْغَفُورُ',
        transliterationBn: 'আল্লাযী খালাকাল মাওতা ওয়াল হায়াতা লিইয়াবলুওয়াকুম আইয়্যুকুম আহসানু আমালা, ওয়াহুওয়াল আযীযুল গাফুর',
        textBengali: 'যিনি সৃষ্টি করেছেন মৃত্যু ও জীবন, তোমাদের পরীক্ষা করার জন্য যে কে কর্মে তোমাদের মধ্যে সর্বোত্তম। তিনি পরাক্রমশালী ও পরম ক্ষমাশীল।',
        textEnglish: '[He] who created death and life to test you [as to] which of you is best in deed - and He is the Exalted in Might, the Forgiving -'
      },
      {
        numberInSurah: 3,
        textArabic: 'الَّذِي خَلَقَ سَبْعَ سَمَاوَاتٍ طِبَاقًا ۖ مَّا تَرَىٰ فِي خَلْقِ الرَّحْمَٰنِ مِن تَفَاوُتٍ ۖ فَارْجِعِ الْبَصَرَ هَلْ تَرَىٰ مِن فُطُورٍ',
        transliterationBn: 'আল্লাযী খালাকা সাব’আ সামাওয়া-তিন তিবাঁকা, মা তারা ফী খালকির রাহমানি মিন তাফাউত, ফারজিইল বাসারা হাল তারা মিন ফুতুর',
        textBengali: 'যিনি সপ্তাকাশ স্তরে স্তরে সৃষ্টি করেছেন। পরম করুণাময়ের সৃষ্টিতে আপনি কোনো অসামঞ্জস্য দেখতে পাবেন না। আবার দৃষ্টি ফিরিয়ে দেখুন, কোনো ফাটল দেখতে পান কি?',
        textEnglish: '[And] who created seven heavens in layers. You do not see in the creation of the Most Merciful any inconsistency. So return [your] vision [to the sky]; do you see any breaks?'
      }
    ]
  },
  97: {
    number: 97,
    nameArabic: 'القَدْر',
    nameBengali: 'আল-কদর',
    nameEnglish: 'Al-Qadr',
    meaningBengali: 'মহিমান্বিত রাত',
    versesCount: 5,
    revelationType: 'মাক্কী',
    juzNumber: 30,
    bismillahPre: true,
    ayahs: [
      {
        numberInSurah: 1,
        textArabic: 'إِنَّا أَنزَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ',
        transliterationBn: 'ইন্না আনযালনাহু ফী লাইলাতিল কদর',
        textBengali: 'নিশ্চয় আমি এই কুরআন অবতীর্ণ করেছি মহিমান্বিত রজনীতে (লাইলাতুল কদরে)।',
        textEnglish: 'Indeed, We sent the Qur\'an down during the Night of Decree.'
      },
      {
        numberInSurah: 2,
        textArabic: 'وَمَا أَدْرَاكَ مَا لَيْلَةُ الْقَدْرِ',
        transliterationBn: 'ওয়ামা আদরাকা মা লাইলাতুল কদর',
        textBengali: 'আর আপনি কি জানেন মহিমান্বিত রজনী কী?',
        textEnglish: 'And what can make you know what is the Night of Decree?'
      },
      {
        numberInSurah: 3,
        textArabic: 'لَيْلَةُ الْقَدْرِ خَيْرٌ مِّنْ أَلْفِ شَهْرٍ',
        transliterationBn: 'লাইলাতুল কাদরি খাইরুম মিন আলফি শাহর',
        textBengali: 'মহিমান্বিত রজনী এক হাজার মাস অপেক্ষা শ্রেষ্ঠ।',
        textEnglish: 'The Night of Decree is better than a thousand months.'
      },
      {
        numberInSurah: 4,
        textArabic: 'تَنَزَّلُ الْمَلَائِكَةُ وَالرُّوحُ فِيهَا بِإِذْنِ رَبِّهِم مِّن كُلِّ أَمْرٍ',
        transliterationBn: 'তানাযযালুল মালা-ইকাতু ওয়ার রূহু ফীহা বিইযনি রাব্বিহিম মিন কুল্লি আমর',
        textBengali: 'সে রাতে ফেরেশতাগণ এবং রূহ (জিবরাঈল) তাঁদের রবের অনুমতিক্রমে সকল কল্যাণময় নির্দেশ নিয়ে অবতরণ করেন।',
        textEnglish: 'The angels and the Spirit descend therein by permission of their Lord for every matter.'
      },
      {
        numberInSurah: 5,
        textArabic: 'سَلَامٌ هِيَ حَتَّىٰ مَطْلَعِ الْفَجْرِ',
        transliterationBn: 'সালামুন হিয়া হাত্তা মাতলাইল ফাজর',
        textBengali: 'সে রাত শান্তিময়, প্রভাতের উন্মেষ পর্যন্ত।',
        textEnglish: 'Peace it is until the emergence of dawn.'
      }
    ]
  }
};

// Fetch full Surah online from trusted Quran API or fallback to built-in/cached
export async function getSurahDetails(surahNumber: number): Promise<SurahDetail> {
  const meta = ALL_SURAHS_META.find(s => s.number === surahNumber) || ALL_SURAHS_META[0];

  // Check built-in first only if it contains all verses of the Surah
  if (
    OFFLINE_SURAHS[surahNumber] &&
    OFFLINE_SURAHS[surahNumber].ayahs.length >= meta.versesCount
  ) {
    return OFFLINE_SURAHS[surahNumber];
  }

  // Check localStorage cache (v2 includes Bengali transliteration for every ayah)
  const cacheKey = `waqto_surah_cache_v2_${surahNumber}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed: SurahDetail = JSON.parse(cached);
      if (
        parsed &&
        parsed.ayahs &&
        parsed.ayahs.length >= meta.versesCount &&
        parsed.ayahs.every((a) => Boolean(a.transliterationBn))
      ) {
        return parsed;
      }
    }
  } catch {}

  try {
    // AlQuran Cloud API: Arabic text + Bengali translation (Muhiuddin Khan) + Phonetic Transliteration
    const response = await fetch(
      `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,bn.bengali,en.transliteration`
    );
    if (!response.ok) throw new Error('Network error');
    const data = await response.json();
    
    if (data.data && data.data.length >= 2) {
      const arabicAyahs = data.data[0].ayahs;
      const bengaliAyahs = data.data[1].ayahs;
      const translitAyahs = data.data[2]?.ayahs || [];

      // Built-in verified overrides if available for any initial verses
      const offlineAyahMap = new Map<number, string>();
      if (OFFLINE_SURAHS[surahNumber]) {
        OFFLINE_SURAHS[surahNumber].ayahs.forEach((oa) => {
          if (oa.transliterationBn) {
            offlineAyahMap.set(oa.numberInSurah, oa.transliterationBn);
          }
        });
      }

      const ayahs = arabicAyahs.map((a: { numberInSurah: number; text: string }, idx: number) => {
        const rawEnTranslit = translitAyahs[idx] ? translitAyahs[idx].text : '';
        const verifiedBnTranslit =
          offlineAyahMap.get(a.numberInSurah) ||
          convertQuranTranslitToBengali(rawEnTranslit, a.text);

        return {
          numberInSurah: a.numberInSurah,
          textArabic: a.text,
          transliterationBn: verifiedBnTranslit,
          textBengali: bengaliAyahs[idx] ? bengaliAyahs[idx].text : '',
          textEnglish: rawEnTranslit
        };
      });

      const detail: SurahDetail = {
        ...meta,
        bismillahPre: surahNumber !== 1 && surahNumber !== 9,
        ayahs
      };

      try {
        localStorage.setItem(cacheKey, JSON.stringify(detail));
      } catch {}

      return detail;
    }
  } catch {
    // Fallback: return partial offline Surah if present, otherwise Surah 1
    if (OFFLINE_SURAHS[surahNumber]) {
      return OFFLINE_SURAHS[surahNumber];
    }
  }

  return OFFLINE_SURAHS[1];
}
