import type { NgxEditorFont, NgxEditorFontCategory, NgxEditorFontFile } from './types';

// the subsets of Google Fonts that ship in the package (fonts/<dir>/)
const ARABIC_RANGE = 'U+0600-06FF, U+0750-077F, U+0870-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, '
  + 'U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC, U+102E0-102FB, U+10E60-10E7E, U+10EC2-10EC7, '
  + 'U+10EC9-10EEE, U+10EF0-10EFF, U+1EE00-1EE03, U+1EE05-1EE1F, U+1EE21-1EE22, U+1EE24, U+1EE27, U+1EE29-1EE32, '
  + 'U+1EE34-1EE37, U+1EE39, U+1EE3B, U+1EE42, U+1EE47, U+1EE49, U+1EE4B, U+1EE4D-1EE4F, U+1EE51-1EE52, U+1EE54, '
  + 'U+1EE57, U+1EE59, U+1EE5B, U+1EE5D, U+1EE5F, U+1EE61-1EE62, U+1EE64, U+1EE67-1EE6A, U+1EE6C-1EE72, '
  + 'U+1EE74-1EE77, U+1EE79-1EE7C, U+1EE7E, U+1EE80-1EE89, U+1EE8B-1EE9B, U+1EEA1-1EEA3, U+1EEA5-1EEA9, '
  + 'U+1EEAB-1EEBB, U+1EEF0-1EEF1';
const LATIN_RANGE = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, '
  + 'U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';

const SUBSETS: [string, string][] = [['arabic', ARABIC_RANGE], ['latin', LATIN_RANGE]];

// a variable font is one file per subset for both weights, a static font one file per weight
const files = (dir: string, variable: boolean): NgxEditorFontFile[] => SUBSETS.flatMap(([subset, unicodeRange]): NgxEditorFontFile[] => {
  if (variable) {
    return [{ weight: '400 700', path: `${dir}/${dir}-${subset}.woff2`, unicodeRange }];
  }

  return [400, 700].map((weight) => ({ weight, path: `${dir}/${dir}-${weight}-${subset}.woff2`, unicodeRange }));
});

interface WebFont {
  id: string;
  name: string;
  dir: string;
  category: NgxEditorFontCategory;
  variable: boolean;
  fa: string;
  ar: string;
}

const webFont = ({ id, name, dir, category, variable, fa, ar }: WebFont): NgxEditorFont => ({
  id,
  family: `${name.includes(' ') ? `'${name}'` : name}, ${category === 'serif' ? 'serif' : 'sans-serif'}`,
  label: { en: name, fa, ar },
  category,
  google: { family: name, weights: [400, 700] },
  files: files(dir, variable),
});

/** the web fonts that ship in the package, in the order of the font menu */
export const NGX_EDITOR_WEB_FONTS: NgxEditorFont[] = [
  webFont({ id: 'vazirmatn', name: 'Vazirmatn', dir: 'vazirmatn', category: 'sans-serif', variable: true, fa: 'وزیرمتن', ar: 'فزيرمتن' }),
  webFont({
    id: 'noto-sans-arabic', name: 'Noto Sans Arabic', dir: 'notosansarabic', category: 'sans-serif', variable: true,
    fa: 'نوتو سنس عربی', ar: 'نوتو سانس العربي',
  }),
  webFont({
    id: 'noto-naskh-arabic', name: 'Noto Naskh Arabic', dir: 'notonaskharabic', category: 'serif', variable: true,
    fa: 'نوتو نسخ عربی', ar: 'نوتو نسخ العربي',
  }),
  webFont({ id: 'amiri', name: 'Amiri', dir: 'amiri', category: 'serif', variable: false, fa: 'امیری', ar: 'أميري' }),
  webFont({ id: 'cairo', name: 'Cairo', dir: 'cairo', category: 'sans-serif', variable: true, fa: 'قاهره', ar: 'القاهرة' }),
  webFont({ id: 'tajawal', name: 'Tajawal', dir: 'tajawal', category: 'sans-serif', variable: false, fa: 'تجوال', ar: 'تجوال' }),
  webFont({
    id: 'ibm-plex-sans-arabic', name: 'IBM Plex Sans Arabic', dir: 'ibmplexsansarabic', category: 'sans-serif',
    variable: false, fa: 'آی‌بی‌ام پلکس سنس عربی', ar: 'آي بي إم بلكس سانس العربي',
  }),
  webFont({ id: 'almarai', name: 'Almarai', dir: 'almarai', category: 'sans-serif', variable: false, fa: 'المراعی', ar: 'المراعي' }),
  webFont({ id: 'harmattan', name: 'Harmattan', dir: 'harmattan', category: 'sans-serif', variable: false, fa: 'هرمتان', ar: 'هرمتان' }),
  webFont({ id: 'lateef', name: 'Lateef', dir: 'lateef', category: 'serif', variable: false, fa: 'لطیف', ar: 'لطيف' }),
  webFont({
    id: 'scheherazade-new', name: 'Scheherazade New', dir: 'scheherazadenew', category: 'serif', variable: false,
    fa: 'شهرزاد نو', ar: 'شهرزاد الجديد',
  }),
  webFont({ id: 'el-messiri', name: 'El Messiri', dir: 'elmessiri', category: 'sans-serif', variable: true, fa: 'المسیری', ar: 'المسيري' }),
  webFont({ id: 'reem-kufi', name: 'Reem Kufi', dir: 'reemkufi', category: 'display', variable: true, fa: 'ریم کوفی', ar: 'ريم كوفي' }),
];

/** fonts of the operating system, which need no loading */
export const NGX_EDITOR_SYSTEM_FONTS: NgxEditorFont[] = [
  { id: 'tahoma', family: 'Tahoma, sans-serif', label: { en: 'Tahoma', fa: 'تاهوما', ar: 'تاهوما' }, category: 'sans-serif' },
  { id: 'arial', family: 'Arial, sans-serif', label: { en: 'Arial', fa: 'آریال', ar: 'آريال' }, category: 'sans-serif' },
  {
    id: 'times-new-roman',
    family: '\'Times New Roman\', serif',
    label: { en: 'Times New Roman', fa: 'تایمز نیو رومن', ar: 'تايمز نيو رومان' },
    category: 'serif',
  },
  {
    id: 'courier-new',
    family: '\'Courier New\', monospace',
    label: { en: 'Courier New', fa: 'کوریر نیو', ar: 'كوريير نيو' },
    category: 'monospace',
  },
];

/** the default font list: the web fonts, then the system fonts */
export const NGX_EDITOR_FONTS: NgxEditorFont[] = [...NGX_EDITOR_WEB_FONTS, ...NGX_EDITOR_SYSTEM_FONTS];
