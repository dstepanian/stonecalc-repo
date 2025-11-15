import React, { useState } from 'react';
import StoneCalc from './components/StoneCalc';
import { COPY, LANGUAGES, DEFAULT_LANGUAGE } from './i18n';

export default function App() {
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const locale = COPY[language];

  return (
    <div className="min-h-screen p-6 text-slate-900 md:p-12">
      <main className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="rounded-3xl bg-white/80 p-8 text-center shadow-glass backdrop-blur">
          <p className="text-sm uppercase tracking-[0.4em] text-slate-500">{locale.heroBadge}</p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900 md:text-4xl">{locale.heroTitle}</h1>
          <p className="mt-3 text-base text-slate-500 md:text-lg">{locale.heroSubtitle}</p>

          <div className="mt-6 flex flex-col items-center gap-3">
            <label className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
              {locale.languageLabel}
            </label>
            <div className="relative">
              <select
                className="w-56 appearance-none rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-center text-sm font-semibold text-slate-700 shadow-inner focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {LANGUAGES.map((option) => (
                  <option key={option.code} value={option.code}>
                    {`${option.flag} ${option.label}`}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">⌄</span>
            </div>
          </div>
        </header>

        <section className="rounded-3xl bg-white/90 p-6 shadow-glass backdrop-blur">
          <StoneCalc copy={locale} />
        </section>
      </main>
    </div>
  );
}
