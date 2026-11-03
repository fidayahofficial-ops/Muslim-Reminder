/**
 * Converts Quranic English phonetic transliteration (from api.alquran.cloud en.transliteration)
 * or Arabic Uthmani text into natural, Tajweed-aware Bengali script (বাংলা উচ্চারণ).
 */

const MUQATTAAT_MAP: Record<string, string> = {
  'alif-laaam-meeem': 'আলিফ-লাম-মীম।',
  'alif-laaam-meeem-saaad': 'আলিফ-লাম-মীম-সাদ।',
  'alif-laaam-raa': 'আলিফ-লাম-রা।',
  'alif-laaam-meeem-raa': 'আলিফ-লাম-মীম-রা।',
  "kaaf-haa-yaa-'ayyyn-saaad": 'কাফ-হা-ইয়া-আইন-সাদ।',
  'taa-haa': 'ত্বা-হা।',
  'taa-seeen-meeem': 'ত্বা-সীন-মীম।',
  'taa-seeen': 'ত্বা-সীন।',
  'yaa-seeen': 'ইয়া-সীন।',
  'saaad': 'সাদ।',
  'haa-meeem': 'হা-মীম।',
  "'ayyyn-seeen-qaaaf": 'আইন-সীন-কাফ।',
  'qaaaf': 'কাফ।',
  'nooon': 'নূন।'
};

function isVowelChar(ch: string): boolean {
  return ch === 'a' || ch === 'e' || ch === 'i' || ch === 'o' || ch === 'u';
}

/**
 * Converts a single phonetic word token (from en.transliteration) into Bengali script.
 */
function convertWordToBengali(rawWord: string): string {
  if (!rawWord) return '';

  // Strip HTML tags if any exist in API response
  let w = rawWord.replace(/<[^>]*>/g, '').trim();
  if (!w) return '';

  // Separate leading/trailing punctuation
  const leadingPunctMatch = w.match(/^([("'[\-]+)*/);
  const trailingPunctMatch = w.match(/([.,;!?)"'\]\-]+)$/);
  const leadingPunct = leadingPunctMatch && leadingPunctMatch[0] ? leadingPunctMatch[0] : '';
  let trailingPunct = trailingPunctMatch && trailingPunctMatch[0] ? trailingPunctMatch[0] : '';

  // Keep apostrophe if it's part of the word phonetics
  let core = w;
  if (leadingPunct && !leadingPunct.includes("'")) {
    core = core.slice(leadingPunct.length);
  }
  if (trailingPunct && !trailingPunct.includes("'")) {
    core = core.slice(0, core.length - trailingPunct.length);
  }

  const lowerCheck = core.toLowerCase().replace(/[.;,!]/g, '');
  if (MUQATTAAT_MAP[lowerCheck]) {
    return MUQATTAAT_MAP[lowerCheck];
  }

  // Handle hyphenated compounds recursively (e.g., "Al-Hamdu", "'a-anzartahum")
  if (core.includes('-')) {
    const parts = core.split('-').filter(Boolean);
    if (parts.length > 1) {
      return parts.map((p) => convertWordToBengali(p)).join('-');
    }
  }

  // Normalize string to lowercase for phonetic parsing
  let s = core
    .toLowerCase()
    .replace(/[’`‘]/g, "'")
    .replace(/aa+/g, 'A') // Long a
    .replace(/ee+|ii+/g, 'I') // Long i
    .replace(/oo+|uu+/g, 'U'); // Long u

  let out = '';
  let i = 0;
  // Track whether the last emitted token was a consonant (waiting for a vowel kar)
  let afterConsonant = false;

  const isAnyVowel = (c: string) =>
    c === 'a' || c === 'e' || c === 'i' || c === 'o' || c === 'u' || c === 'A' || c === 'I' || c === 'U';

  while (i < s.length) {
    const ch = s[i];
    const next = s[i + 1] || '';
    const next2 = s[i + 2] || '';

    // 1. Handle apostrophe ('Ayn or Hamzah)
    if (ch === "'") {
      if (i > 0 && afterConsonant && isAnyVowel(next)) {
        // Syllable break between consonant and vowel: e.g. an'amta -> আন’আমতা, mas'ala -> মাস’আলা
        out += '’';
        afterConsonant = false;
        i++;
        continue;
      } else if (i > 0 && !afterConsonant && !isAnyVowel(next) && next !== '') {
        // Syllable-closing hamzah/'ayn after vowel: e.g. yu'minoon -> ইউ’মিনূন, na'budu -> না’বুদু
        out += '’';
        afterConsonant = false;
        i++;
        continue;
      } else {
        // Word-initial ('alaa, 'alameen) or intervocalic (ulaaa'ika, sawaaa'un)
        afterConsonant = false;
        i++;
        continue;
      }
    }

    // 2. Handle glides y and w before vowels
    if (ch === 'y' && isAnyVowel(next)) {
      const v = next;
      // Check if 'au'/'ai' diphthong follows y (e.g., yaum, yaina)
      if ((v === 'a' || v === 'A') && (next2 === 'u' || next2 === 'w') && !isAnyVowel(s[i + 3] || '')) {
        out += afterConsonant ? 'ইয়াও' : 'ইয়াও';
        afterConsonant = false;
        i += 3;
        continue;
      }
      if ((v === 'a' || v === 'A') && (next2 === 'i' || next2 === 'y') && !isAnyVowel(s[i + 3] || '')) {
        out += afterConsonant ? 'ইয়াই' : 'ইয়াই';
        afterConsonant = false;
        i += 3;
        continue;
      }

      if (v === 'a' || v === 'A') {
        out += afterConsonant ? 'ইয়া' : 'ইয়া';
      } else if (v === 'i') {
        out += afterConsonant ? 'য়ি' : 'ইয়ি';
      } else if (v === 'I') {
        out += afterConsonant ? 'য়ী' : 'ইয়ী';
      } else if (v === 'u') {
        out += afterConsonant ? 'ইউ' : 'ইউ';
      } else if (v === 'U') {
        out += afterConsonant ? 'ইউ' : 'ইউ';
      } else if (v === 'e') {
        out += 'ইয়ে';
      } else if (v === 'o') {
        out += 'ইয়ো';
      }
      afterConsonant = false;
      i += 2;
      continue;
    }

    if ((ch === 'w' || ch === 'v') && isAnyVowel(next)) {
      const v = next;
      if ((v === 'a' || v === 'A') && (next2 === 'i' || next2 === 'y') && !isAnyVowel(s[i + 3] || '')) {
        out += 'ওয়াই';
        afterConsonant = false;
        i += 3;
        continue;
      }
      if ((v === 'a' || v === 'A') && (next2 === 'u' || next2 === 'w') && !isAnyVowel(s[i + 3] || '')) {
        out += 'ওয়াও';
        afterConsonant = false;
        i += 3;
        continue;
      }

      if (v === 'a' || v === 'A') {
        out += 'ওয়া';
      } else if (v === 'i') {
        out += 'উই';
      } else if (v === 'I') {
        out += 'উঈ';
      } else if (v === 'u' || v === 'U') {
        out += 'উ';
      } else {
        out += 'ও';
      }
      afterConsonant = false;
      i += 2;
      continue;
    }

    // 3. Handle double glides 'yy' and 'ww'
    if (ch === 'y' && next === 'y') {
      if (isAnyVowel(next2)) {
        const v = next2;
        if (v === 'a' || v === 'A') {
          out += afterConsonant ? 'ইয়্যা' : 'ইয়্যা';
        } else if (v === 'u' || v === 'U') {
          out += afterConsonant ? 'ইয়্যু' : 'ইয়্যু';
        } else if (v === 'i' || v === 'I') {
          out += afterConsonant ? 'ইয়্যি' : 'ইয়্যি';
        } else {
          out += 'ইয়্য';
        }
        afterConsonant = false;
        i += 3;
        continue;
      } else {
        out += 'ইয়্য';
        afterConsonant = false;
        i += 2;
        continue;
      }
    }

    if (ch === 'w' && next === 'w') {
      if (isAnyVowel(next2)) {
        const v = next2;
        if (v === 'a' || v === 'A') {
          out += 'ওয়া';
        } else if (v === 'u' || v === 'U') {
          out += 'উউ';
        } else if (v === 'i' || v === 'I') {
          out += 'উই';
        }
        afterConsonant = false;
        i += 3;
        continue;
      } else {
        out += 'ও';
        afterConsonant = false;
        i += 2;
        continue;
      }
    }

    // 4. Handle Diphthongs: ai / ay and au / aw (when NOT followed by a vowel)
    if ((ch === 'a' || ch === 'A') && (next === 'i' || next === 'y') && !isAnyVowel(next2)) {
      out += afterConsonant ? 'াই' : 'আই';
      afterConsonant = false;
      i += 2;
      continue;
    }

    if ((ch === 'a' || ch === 'A') && (next === 'u' || next === 'w') && !isAnyVowel(next2)) {
      out += afterConsonant ? 'াও' : 'আও';
      afterConsonant = false;
      i += 2;
      continue;
    }

    // 5. Handle Vowels (Short & Long)
    if (isAnyVowel(ch)) {
      if (ch === 'a' || ch === 'A') {
        out += afterConsonant ? 'া' : 'আ';
      } else if (ch === 'i') {
        out += afterConsonant ? 'ি' : 'ই';
      } else if (ch === 'I') {
        out += afterConsonant ? 'ী' : 'ঈ';
      } else if (ch === 'u') {
        out += afterConsonant ? 'ু' : 'উ';
      } else if (ch === 'U') {
        out += afterConsonant ? 'ূ' : 'ঊ';
      } else if (ch === 'e') {
        out += afterConsonant ? 'ে' : 'এ';
      } else if (ch === 'o') {
        out += afterConsonant ? 'ো' : 'ও';
      }
      afterConsonant = false;
      i++;
      continue;
    }

    // 6. Handle Consonant Digraphs & Geminates
    const two = ch + next;
    const three = ch + next + next2;

    if (three === 'shh') {
      out += 'শ';
      afterConsonant = true;
      i += 3;
      continue;
    }

    if (two === 'sh') {
      out += 'শ';
      afterConsonant = true;
      i += 2;
      continue;
    }
    if (two === 'kh') {
      out += 'খ';
      afterConsonant = true;
      i += 2;
      continue;
    }
    if (two === 'gh') {
      out += 'গ';
      afterConsonant = true;
      i += 2;
      continue;
    }
    if (two === 'th') {
      out += 'ছ';
      afterConsonant = true;
      i += 2;
      continue;
    }
    if (two === 'dh') {
      out += 'য';
      afterConsonant = true;
      i += 2;
      continue;
    }
    if (two === 'ph') {
      out += 'ফ';
      afterConsonant = true;
      i += 2;
      continue;
    }

    // Double consonants (Tashdeed)
    if (two === 'll') {
      out += 'ল্ল';
      afterConsonant = true;
      i += 2;
      continue;
    }
    if (two === 'mm') {
      out += 'ম্ম';
      afterConsonant = true;
      i += 2;
      continue;
    }
    if (two === 'nn') {
      out += 'ন্ন';
      afterConsonant = true;
      i += 2;
      continue;
    }
    if (two === 'bb') {
      out += 'ব্ব';
      afterConsonant = true;
      i += 2;
      continue;
    }
    if (two === 'dd') {
      out += 'দ্দ';
      afterConsonant = true;
      i += 2;
      continue;
    }
    if (two === 'tt') {
      out += 'ত্ত';
      afterConsonant = true;
      i += 2;
      continue;
    }
    if (two === 'ss') {
      out += 'স্স';
      afterConsonant = true;
      i += 2;
      continue;
    }
    if (two === 'zz') {
      out += 'য্য';
      afterConsonant = true;
      i += 2;
      continue;
    }
    if (two === 'qq' || two === 'kk') {
      out += 'ক্ক';
      afterConsonant = true;
      i += 2;
      continue;
    }
    if (two === 'ff') {
      out += 'ফফ';
      afterConsonant = true;
      i += 2;
      continue;
    }
    if (two === 'rr') {
      out += 'রর';
      afterConsonant = true;
      i += 2;
      continue;
    }

    // 7. Single Consonants
    const singleConsonantMap: Record<string, string> = {
      b: 'ব',
      t: 'ত',
      j: 'জ',
      h: 'হ',
      d: 'দ',
      r: 'র',
      z: 'য',
      s: 'স',
      f: 'ফ',
      q: 'ক',
      k: 'ক',
      l: 'ল',
      m: 'ম',
      n: 'ন',
      w: 'ও',
      v: 'ভ',
      y: 'ই',
      g: 'গ',
      p: 'প',
      c: 'ক'
    };

    if (singleConsonantMap[ch]) {
      out += singleConsonantMap[ch];
      afterConsonant = ch !== 'w' && ch !== 'y';
      i++;
      continue;
    }

    // Any other char
    out += ch;
    afterConsonant = false;
    i++;
  }

  // Convert trailing punctuation (; -> , and . -> ।)
  let formattedTrailing = '';
  if (trailingPunct.includes(';') || trailingPunct.includes(',')) {
    formattedTrailing = ',';
  }

  return out + formattedTrailing;
}

/**
 * Direct Arabic-to-Bengali fallback transliterator when English transliteration is not present.
 */
export function transliterateArabicToBengali(arabicText: string): string {
  if (!arabicText) return '';

  const words = arabicText
    .replace(/[۞۩۝]/g, '')
    .trim()
    .split(/\s+/);

  const charMap: Record<string, string> = {
    'ا': 'আ',
    'أ': 'আ',
    'إ': 'ই',
    'آ': 'আ',
    'ٱ': 'আ',
    'ب': 'ব',
    'ت': 'ত',
    'ة': 'হ',
    'ث': 'ছ',
    'ج': 'জ',
    'ح': 'হ',
    'خ': 'খ',
    'د': 'দ',
    'ذ': 'য',
    'ر': 'র',
    'ز': 'য',
    'س': 'স',
    'ش': 'শ',
    'ص': 'স',
    'ض': 'দ',
    'ط': 'ত্ব',
    'ظ': 'য',
    'ع': 'আ',
    'غ': 'গ',
    'ف': 'ফ',
    'ق': 'ক',
    'ك': 'ক',
    'ل': 'ল',
    'م': 'ম',
    'ن': 'ন',
    'ه': 'হ',
    'و': 'ও',
    'ؤ': 'উ',
    'ي': 'ই',
    'ى': 'া',
    'ئ': 'ই',
    'ء': '’'
  };

  const resultWords = words.map((word) => {
    let res = '';
    let hasConsonant = false;

    for (let i = 0; i < word.length; i++) {
      const c = word[i];
      const next = word[i + 1] || '';

      // Harakat (diacritics)
      if (c === '\u064E' || c === '\u0670') {
        // Fathah or Dagger Alif
        if (hasConsonant && next !== 'ا' && next !== 'ى') {
          res += 'া';
        }
        hasConsonant = false;
      } else if (c === '\u0650') {
        // Kasrah
        if (hasConsonant) {
          res += next === 'ي' ? 'ী' : 'ি';
        } else {
          res += 'ই';
        }
        hasConsonant = false;
      } else if (c === '\u064F') {
        // Dammah
        if (hasConsonant) {
          res += next === 'و' ? 'ূ' : 'ু';
        } else {
          res += 'উ';
        }
        hasConsonant = false;
      } else if (c === '\u064B') {
        // Fathatan
        res += (hasConsonant ? 'া' : '') + 'ন';
        hasConsonant = false;
      } else if (c === '\u064D') {
        // Kasratan
        res += (hasConsonant ? 'ি' : 'ই') + 'ন';
        hasConsonant = false;
      } else if (c === '\u064C') {
        // Dammatan
        res += (hasConsonant ? 'ু' : 'উ') + 'ন';
        hasConsonant = false;
      } else if (c === '\u0652' || c === '\u06E1') {
        // Sukun
        hasConsonant = false;
      } else if (c === '\u0651') {
        // Shaddah (handled by consonant)
        continue;
      } else if (c === 'ا' && i > 0) {
        res += 'া';
        hasConsonant = false;
      } else if (charMap[c]) {
        if ((c === 'و' || c === 'ي') && !hasConsonant && i > 0) {
          // Madd letter already handled by preceding dammah/kasrah
          continue;
        }
        res += charMap[c];
        hasConsonant = c !== 'ا' && c !== 'آ' && c !== 'ٱ' && c !== 'ى' && c !== 'ء';
      }
    }
    return res;
  });

  const joined = resultWords.filter(Boolean).join(' ');
  return joined ? joined + '।' : '';
}

/**
 * Main converter: converts English phonetic transliteration (with full Tajweed rules)
 * into clean Bengali pronunciation, with Arabic text fallback.
 */
export function convertQuranTranslitToBengali(enTranslit?: string, arabicText?: string): string {
  if (enTranslit && enTranslit.trim().length > 0) {
    const cleaned = enTranslit.replace(/<[^>]*>/g, '').trim();
    const tokens = cleaned.split(/\s+/).filter(Boolean);
    const converted = tokens.map((token) => convertWordToBengali(token)).join(' ');
    if (converted) {
      return converted.endsWith('।') ? converted : converted + '।';
    }
  }

  if (arabicText) {
    return transliterateArabicToBengali(arabicText);
  }

  return '';
}
