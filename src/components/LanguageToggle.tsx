'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
      className="flex items-center gap-0.5 px-1 py-1 rounded-lg bg-surface-200 hover:bg-surface-300 transition-colors min-w-[80px] min-h-[36px]"
      title={lang === 'en' ? 'हिंदी में बदलें' : 'Switch to English'}
    >
      <span className={`px-2 py-0.5 rounded-md text-xs font-semibold transition-colors ${
        lang === 'en' ? 'bg-brand text-white' : 'text-text-tertiary'
      }`}>
        EN
      </span>
      <span className={`px-2 py-0.5 rounded-md text-xs font-semibold transition-colors ${
        lang === 'hi' ? 'bg-brand text-white' : 'text-text-tertiary'
      }`}>
        हिंदी
      </span>
    </button>
  );
}
