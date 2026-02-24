'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Language, LANGUAGE_LABELS } from '@/lib/i18n';

const LANGUAGES: Language[] = ['en', 'hi', 'gu', 'mr', 'ta'];

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  const nextLang = () => {
    const idx = LANGUAGES.indexOf(lang);
    setLang(LANGUAGES[(idx + 1) % LANGUAGES.length]);
  };

  return (
    <button
      onClick={nextLang}
      className="flex items-center gap-0.5 px-1 py-1 rounded-lg bg-surface-200 hover:bg-surface-300 transition-colors min-h-[36px]"
      title="Switch language"
    >
      {LANGUAGES.map((l) => (
        <span
          key={l}
          className={`px-2 py-0.5 rounded-md text-xs font-semibold transition-colors ${
            lang === l ? 'bg-brand text-white' : 'text-text-tertiary'
          }`}
        >
          {LANGUAGE_LABELS[l]}
        </span>
      ))}
    </button>
  );
}
