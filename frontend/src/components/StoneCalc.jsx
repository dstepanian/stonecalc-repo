import React, { useState, useEffect, useCallback } from 'react';
import { COPY, DEFAULT_LANGUAGE } from '../i18n';

const MATERIAL_KEYS = ['granite', 'marble', 'basalt', 'limestone', 'sandstone'];
const DEFAULT_LOCALE = COPY[DEFAULT_LANGUAGE];

export default function StoneCalc({ copy }) {
  const locale = copy ?? DEFAULT_LOCALE;
  const calcCopy = locale.calc;
  const units = locale.units;
  const placeholders = calcCopy.placeholders;

  const [inputType, setInputType] = useState('dimensions');
  const [shape, setShape] = useState('rectangular');
  const [dimensions, setDimensions] = useState({
    length_cm: '',
    width_cm: '',
    height_cm: '',
    radius_cm: '',
  });
  const [volumeLiters, setVolumeLiters] = useState('');
  const [material, setMaterial] = useState('granite');
  const [title, setTitle] = useState('');
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetch('/api/history');
      if (!res.ok) throw new Error('History request failed');
      const data = await res.json();
      setHistory(data);
    } catch (error) {
      console.error(error);
      setHistoryError(calcCopy.history?.error || calcCopy.errors.default);
    } finally {
      setHistoryLoading(false);
    }
  }, [calcCopy.errors.default, calcCopy.history]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDelete = async (id) => {
    if (!id) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      fetchHistory();
    } catch (error) {
      console.error(error);
      alert(calcCopy.errors.default);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCalc = async (save = false) => {
    const payload = {
      inputType,
      shape,
      dimensions,
      volume_liters: inputType === 'volume' ? parseFloat(volumeLiters) : undefined,
      material,
      title: title?.trim() ? title.trim() : undefined,
      save,
    };

    setSaving(true);
    try {
      const res = await fetch('/api/calc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setResult(data);
      if (save) {
        setTitle('');
        fetchHistory();
      }
    } catch (err) {
      console.error(err);
      alert(calcCopy.errors.default);
    } finally {
      setSaving(false);
    }
  };

  const handleDimensionChange = (key, value) => {
    setDimensions((prev) => ({ ...prev, [key]: value }));
  };

  const inputButtonClasses = (active) =>
    `flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
      active ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'
    }`;

  const labelClasses = 'text-xs font-semibold uppercase tracking-wide text-slate-500';
  const inputClasses =
    'mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition';

  const inputOptions = [
    { key: 'dimensions', label: calcCopy.modeDimensions },
    { key: 'volume', label: calcCopy.modeVolume },
  ];

  return (
    <div className="space-y-8 text-slate-900">
      <div className="rounded-3xl bg-slate-50 p-1">
        <div className="flex gap-1">
          {inputOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              className={inputButtonClasses(option.key === inputType)}
              onClick={() => setInputType(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {inputType === 'dimensions' && (
        <div className="space-y-6">
          <div>
            <p className={labelClasses}>{calcCopy.shapeLabel}</p>
            <select className={inputClasses} value={shape} onChange={(e) => setShape(e.target.value)}>
              <option value="rectangular">{calcCopy.shapeRectangular}</option>
              <option value="cylinder">{calcCopy.shapeCylinder}</option>
            </select>
          </div>

          {shape === 'rectangular' && (
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className={labelClasses}>{calcCopy.lengthLabel}</p>
                <input
                  className={inputClasses}
                  placeholder={placeholders.length}
                  value={dimensions.length_cm}
                  inputMode="decimal"
                  onChange={(e) => handleDimensionChange('length_cm', e.target.value)}
                />
              </div>
              <div>
                <p className={labelClasses}>{calcCopy.widthLabel}</p>
                <input
                  className={inputClasses}
                  placeholder={placeholders.width}
                  value={dimensions.width_cm}
                  inputMode="decimal"
                  onChange={(e) => handleDimensionChange('width_cm', e.target.value)}
                />
              </div>
              <div>
                <p className={labelClasses}>{calcCopy.heightLabel}</p>
                <input
                  className={inputClasses}
                  placeholder={placeholders.height}
                  value={dimensions.height_cm}
                  inputMode="decimal"
                  onChange={(e) => handleDimensionChange('height_cm', e.target.value)}
                />
              </div>
            </div>
          )}

          {shape === 'cylinder' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className={labelClasses}>{calcCopy.radiusLabel}</p>
                <input
                  className={inputClasses}
                  placeholder={placeholders.radius}
                  value={dimensions.radius_cm}
                  inputMode="decimal"
                  onChange={(e) => handleDimensionChange('radius_cm', e.target.value)}
                />
              </div>
              <div>
                <p className={labelClasses}>{calcCopy.heightLabel}</p>
                <input
                  className={inputClasses}
                  placeholder={placeholders.height}
                  value={dimensions.height_cm}
                  inputMode="decimal"
                  onChange={(e) => handleDimensionChange('height_cm', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {inputType === 'volume' && (
        <div>
          <p className={labelClasses}>{calcCopy.volumeInputLabel}</p>
          <input
            className={inputClasses}
            placeholder={placeholders.volume}
            inputMode="decimal"
            value={volumeLiters}
            onChange={(e) => setVolumeLiters(e.target.value)}
          />
        </div>
      )}

      <div>
        <p className={labelClasses}>{calcCopy.materialLabel}</p>
        <select className={inputClasses} value={material} onChange={(e) => setMaterial(e.target.value)}>
          {MATERIAL_KEYS.map((key) => (
            <option key={key} value={key}>
              {calcCopy.materials[key] ?? key}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className={labelClasses}>{calcCopy.titleLabel}</p>
        <input
          className={inputClasses}
          placeholder={calcCopy.titlePlaceholder}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
        />
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <button
          type="button"
          onClick={() => handleCalc(false)}
          disabled={saving}
          className="flex-1 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {saving ? calcCopy.buttons.calculating : calcCopy.buttons.calculate}
        </button>
        <button
          type="button"
          onClick={() => handleCalc(true)}
          disabled={saving}
          className="flex-1 rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
        >
          {saving ? calcCopy.buttons.saving : calcCopy.buttons.calculateAndSave}
        </button>
      </div>

      {result && (
        <div className="rounded-3xl border border-slate-100 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-slate-50 shadow-inner">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-300">{calcCopy.result.title}</p>
          <dl className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">{calcCopy.result.volume}</dt>
              <dd className="text-xl font-semibold">
                {result.volume_cm3} {units.cm3}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">{calcCopy.result.density}</dt>
              <dd className="text-xl font-semibold">
                {result.density_g_cm3} {units.density}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">{calcCopy.result.weight}</dt>
              <dd className="text-xl font-semibold">
                {result.weight_kg} {units.kg}{' '}
                <span className="text-sm text-slate-300">
                  ({result.weight_g} {units.g})
                </span>
              </dd>
            </div>
          </dl>
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-inner">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
            {calcCopy.history.title}
          </p>
          {historyLoading && (
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {calcCopy.history.loading}
            </span>
          )}
        </div>

        {historyError && (
          <p className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
            {historyError}
          </p>
        )}

        {!historyLoading && !historyError && history.length === 0 && (
          <p className="mt-4 text-sm text-slate-500">{calcCopy.history.empty}</p>
        )}

        {!historyError && history.length > 0 && (
          <ul className="mt-4 space-y-3">
            {history.map((entry) => (
              <li
                key={entry._id}
                className="rounded-3xl border border-slate-100 bg-white/95 p-4 text-sm text-slate-700 shadow"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-col">
                    {entry.title ? (
                      <p className="text-base font-semibold text-slate-900">{entry.title}</p>
                    ) : (
                      <p className="text-base font-semibold text-slate-900">
                        {calcCopy.materials[entry.material] ?? entry.material}
                      </p>
                    )}
                    {entry.title && (
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        {calcCopy.materials[entry.material] ?? entry.material}
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {entry.shape === 'rectangular'
                      ? calcCopy.shapeRectangular
                      : entry.shape === 'cylinder'
                      ? calcCopy.shapeCylinder
                      : entry.inputType === 'volume'
                      ? calcCopy.modeVolume
                      : calcCopy.modeDimensions}
                  </span>
                  <button
                    type="button"
                    className="ml-auto rounded-full border border-red-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => handleDelete(entry._id)}
                    disabled={deletingId === entry._id}
                  >
                    {calcCopy.history.delete}
                  </button>
                </div>
                <dl className="mt-3 grid gap-2 md:grid-cols-3">
                  <div>
                    <dt className="text-[0.6rem] uppercase tracking-wide text-slate-400">
                      {calcCopy.history.columns.volume}
                    </dt>
                    <dd className="text-sm font-medium text-slate-900">
                      {Number(entry.volume_cm3 ?? 0).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}{' '}
                      {units.cm3}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[0.6rem] uppercase tracking-wide text-slate-400">
                      {calcCopy.history.columns.weight}
                    </dt>
                    <dd className="text-sm font-medium text-slate-900">
                      {(Number(entry.weight_g ?? 0) / 1000).toLocaleString(undefined, {
                        maximumFractionDigits: 3,
                      })}{' '}
                      {units.kg}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[0.6rem] uppercase tracking-wide text-slate-400">
                      {calcCopy.history.columns.material}
                    </dt>
                    <dd className="text-sm font-medium text-slate-900">
                      {calcCopy.materials[entry.material] ?? entry.material}
                    </dd>
                  </div>
                </dl>
                {entry.createdAt && (
                  <p className="mt-3 text-xs text-slate-400">
                    {calcCopy.history.columns.savedAt}:{' '}
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
