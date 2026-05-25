import React, { useEffect, useState } from 'react';
import StoneCalc from './components/StoneCalc';
import { COPY, LANGUAGES, DEFAULT_LANGUAGE } from './i18n';
import logo from './assets/stone-calculator-logo.svg';

const FLAG_SRC = {
  en: 'https://flagcdn.com/w40/us.png',
  hy: 'https://flagcdn.com/w40/am.png',
  ru: 'https://flagcdn.com/w40/ru.png',
  ka: 'https://flagcdn.com/w40/ge.png',
};

export default function App() {
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [theme, setTheme] = useState(() => window.localStorage.getItem('stonecalc:theme') || 'light');
  const locale = COPY[language];
  const isDark = theme === 'dark';

  useEffect(() => {
    window.localStorage.setItem('stonecalc:theme', theme);
    document.documentElement.classList.toggle('dark', isDark);
  }, [theme]);

  return (
    <div className="min-h-screen overflow-x-hidden px-3 py-4 text-slate-900 transition-colors sm:px-6 sm:py-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <header className="flex flex-col gap-4 pb-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <img
                src={logo}
                alt=""
                className="h-9 w-9 shrink-0 rounded-xl shadow-sm"
              />
              <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                {locale.heroBadge}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 sm:justify-end">
            <div className="flex shrink-0 rounded-full border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              {['light', 'dark'].map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    theme === option
                      ? 'bg-teal-700 text-white'
                      : 'text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
                  }`}
                  onClick={() => setTheme(option)}
                  aria-pressed={theme === option}
                >
                  {option === 'light' ? 'Light' : 'Dark'}
                </button>
              ))}
            </div>
            {LANGUAGES.map((option) => (
              <button
                key={option.code}
                type="button"
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border bg-white shadow-sm transition hover:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-600/10 sm:h-9 sm:w-9 dark:bg-slate-900 ${
                  language === option.code
                    ? 'border-teal-600 ring-2 ring-teal-600/20 dark:border-teal-300'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
                onClick={() => setLanguage(option.code)}
                title={option.label}
                aria-label={`${locale.languageLabel}: ${option.label}`}
              >
                <img
                  src={FLAG_SRC[option.code]}
                  alt=""
                  className="h-3.5 w-5 rounded-[2px] object-cover sm:h-4 sm:w-6"
                  loading="lazy"
                />
              </button>
            ))}
            </div>
          </div>

          <div className="max-w-2xl">
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              {locale.heroSubtitle}
            </p>
          </div>
        </header>

        <section>
          <StoneCalc copy={locale} />
        </section>
      </main>
    </div>
  );
}
