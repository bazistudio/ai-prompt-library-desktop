export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  direction: "ltr" | "rtl" | "auto";
  script?: string;
  supportedForEditor: boolean;
  supportedForUI: boolean;
}

export const DEFAULT_LANGUAGE_CODE = "en";

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    direction: "ltr",
    script: "Latin",
    supportedForEditor: true,
    supportedForUI: true,
  },
  {
    code: "ur",
    name: "Urdu",
    nativeName: "اردو",
    direction: "rtl",
    script: "Arabic (Nastaliq/Naskh)",
    supportedForEditor: true,
    supportedForUI: false,
  },
  {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    direction: "rtl",
    script: "Arabic",
    supportedForEditor: true,
    supportedForUI: false,
  },
  {
    code: "fa",
    name: "Persian",
    nativeName: "فارسی",
    direction: "rtl",
    script: "Persian / Farsi",
    supportedForEditor: true,
    supportedForUI: false,
  },
  {
    code: "ps",
    name: "Pashto",
    nativeName: "پښتو",
    direction: "rtl",
    script: "Pashto",
    supportedForEditor: true,
    supportedForUI: false,
  },
  {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    direction: "ltr",
    script: "Devanagari",
    supportedForEditor: true,
    supportedForUI: false,
  },
  {
    code: "zh",
    name: "Chinese",
    nativeName: "中文",
    direction: "ltr",
    script: "Han (Simplified / Traditional)",
    supportedForEditor: true,
    supportedForUI: false,
  },
  {
    code: "fr",
    name: "French",
    nativeName: "Français",
    direction: "ltr",
    script: "Latin",
    supportedForEditor: true,
    supportedForUI: false,
  },
  {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    direction: "ltr",
    script: "Latin",
    supportedForEditor: true,
    supportedForUI: false,
  },
  {
    code: "nl",
    name: "Dutch",
    nativeName: "Nederlands",
    direction: "ltr",
    script: "Latin",
    supportedForEditor: true,
    supportedForUI: false,
  },
  {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    direction: "ltr",
    script: "Latin",
    supportedForEditor: true,
    supportedForUI: false,
  },
  {
    code: "pt",
    name: "Portuguese",
    nativeName: "Português",
    direction: "ltr",
    script: "Latin",
    supportedForEditor: true,
    supportedForUI: false,
  },
  {
    code: "it",
    name: "Italian",
    nativeName: "Italiano",
    direction: "ltr",
    script: "Latin",
    supportedForEditor: true,
    supportedForUI: false,
  },
  {
    code: "tr",
    name: "Turkish",
    nativeName: "Türkçe",
    direction: "ltr",
    script: "Latin",
    supportedForEditor: true,
    supportedForUI: false,
  },
  {
    code: "ru",
    name: "Russian",
    nativeName: "Русский",
    direction: "ltr",
    script: "Cyrillic",
    supportedForEditor: true,
    supportedForUI: false,
  },
  {
    code: "ja",
    name: "Japanese",
    nativeName: "日本語",
    direction: "ltr",
    script: "Kanji / Kana",
    supportedForEditor: true,
    supportedForUI: false,
  },
  {
    code: "ko",
    name: "Korean",
    nativeName: "한국어",
    direction: "ltr",
    script: "Hangul",
    supportedForEditor: true,
    supportedForUI: false,
  },
  {
    code: "bn",
    name: "Bengali",
    nativeName: "বাংলা",
    direction: "ltr",
    script: "Bengali",
    supportedForEditor: true,
    supportedForUI: false,
  },
  {
    code: "id",
    name: "Indonesian",
    nativeName: "Bahasa Indonesia",
    direction: "ltr",
    script: "Latin",
    supportedForEditor: true,
    supportedForUI: false,
  },
  {
    code: "vi",
    name: "Vietnamese",
    nativeName: "Tiếng Việt",
    direction: "ltr",
    script: "Latin",
    supportedForEditor: true,
    supportedForUI: false,
  },
  {
    code: "auto",
    name: "Auto Detect",
    nativeName: "Auto Detect",
    direction: "auto",
    script: "Dynamic / Multi-script",
    supportedForEditor: true,
    supportedForUI: false,
  },
];

export function getLanguageByCode(code?: string | null): LanguageOption {
  if (!code) {
    return SUPPORTED_LANGUAGES[0]; // English
  }
  const match = SUPPORTED_LANGUAGES.find((lang) => lang.code.toLowerCase() === code.toLowerCase());
  return match || SUPPORTED_LANGUAGES[0];
}
