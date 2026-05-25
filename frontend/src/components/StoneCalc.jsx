import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { COPY, DEFAULT_LANGUAGE } from '../i18n';

const DEFAULT_MATERIALS = [
  { key: 'granite', density: 2.7 },
  { key: 'marble', density: 2.6 },
  { key: 'basalt', density: 2.9 },
  { key: 'limestone', density: 2.6 },
  { key: 'sandstone', density: 2.3 },
];
const DEFAULT_LOCALE = COPY[DEFAULT_LANGUAGE];
const LOCAL_HISTORY_KEY = 'stonecalc:history';
const LOCAL_MATERIALS_KEY = 'stonecalc:materials';

const formatNumber = (value, maximumFractionDigits = 2) =>
  Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits });

const toNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const readStoredArray = (key) => {
  try {
    const value = window.localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeStoredArray = (key, value) => {
  window.localStorage.setItem(key, JSON.stringify(value));
};

const isLocalEntry = (id) => String(id || '').startsWith('local-');

const buildLocalResult = ({ inputType, shape, dimensions, volumeLiters, material, densityMap }) => {
  let volumeCm3 = 0;

  if (inputType === 'volume') {
    volumeCm3 = toNumber(volumeLiters) * 1000;
  } else if (shape === 'cylinder') {
    volumeCm3 = Math.PI * Math.pow(toNumber(dimensions.radius_cm), 2) * toNumber(dimensions.height_cm);
  } else {
    volumeCm3 =
      toNumber(dimensions.length_cm) * toNumber(dimensions.width_cm) * toNumber(dimensions.height_cm);
  }

  const density = densityMap[material] || densityMap.granite || 2.7;
  const weightG = volumeCm3 * density;

  return {
    volume_cm3: Math.round(volumeCm3 * 100) / 100,
    density_g_cm3: density,
    weight_g: Math.round(weightG * 100) / 100,
    weight_kg: Math.round((weightG / 1000) * 100000) / 100000,
  };
};

export default function StoneCalc({ copy }) {
  const locale = copy ?? DEFAULT_LOCALE;
  const calcCopy = locale.calc;
  const units = locale.units;
  const placeholders = calcCopy.placeholders;
  const featureCopy = calcCopy.features || {};

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
  const [formError, setFormError] = useState('');
  const [saveNotice, setSaveNotice] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [customMaterials, setCustomMaterials] = useState(() => readStoredArray(LOCAL_MATERIALS_KEY));
  const [customName, setCustomName] = useState('');
  const [customDensity, setCustomDensity] = useState('');

  const materialOptions = useMemo(
    () => [
      ...DEFAULT_MATERIALS.map((item) => ({
        ...item,
        label: calcCopy.materials[item.key] ?? item.key,
      })),
      ...customMaterials.map((item) => ({
        key: item.key,
        density: toNumber(item.density),
        label: item.name,
        custom: true,
      })),
    ],
    [calcCopy.materials, customMaterials]
  );

  const densityMap = useMemo(
    () =>
      materialOptions.reduce((acc, option) => {
        acc[option.key] = option.density;
        return acc;
      }, {}),
    [materialOptions]
  );

  const materialLabel = useCallback(
    (key) => materialOptions.find((option) => option.key === key)?.label || key,
    [materialOptions]
  );

  const localPreview = useMemo(
    () => buildLocalResult({ inputType, shape, dimensions, volumeLiters, material, densityMap }),
    [densityMap, dimensions, inputType, material, shape, volumeLiters]
  );

  const requiredValues = useMemo(() => {
    if (inputType === 'volume') return [volumeLiters];
    if (shape === 'cylinder') return [dimensions.radius_cm, dimensions.height_cm];
    return [dimensions.length_cm, dimensions.width_cm, dimensions.height_cm];
  }, [dimensions, inputType, shape, volumeLiters]);

  const hasValidInput = requiredValues.every((value) => toNumber(value) > 0);

  const localHistory = useCallback(() => readStoredArray(LOCAL_HISTORY_KEY), []);

  const storeLocalHistory = useCallback((items) => {
    writeStoredArray(LOCAL_HISTORY_KEY, items);
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetch('/api/history');
      if (!res.ok) throw new Error('History request failed');
      const data = await res.json();
      const locals = localHistory();
      setHistory([...locals, ...data]);
    } catch (error) {
      console.error(error);
      const locals = localHistory();
      setHistory(locals);
      setHistoryError(locals.length ? featureCopy.localMode : calcCopy.history?.error || calcCopy.errors.default);
    } finally {
      setHistoryLoading(false);
    }
  }, [calcCopy.errors.default, calcCopy.history, featureCopy.localMode, localHistory]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (!materialOptions.some((option) => option.key === material)) {
      setMaterial('granite');
    }
  }, [material, materialOptions]);

  const projectTotals = useMemo(
    () =>
      history.reduce(
        (totals, entry) => ({
          count: totals.count + 1,
          volume: totals.volume + Number(entry.volume_cm3 ?? 0),
          weight: totals.weight + Number(entry.weight_g ?? 0),
        }),
        { count: 0, volume: 0, weight: 0 }
      ),
    [history]
  );

  const createLocalEntry = (payload, calculatedResult) => ({
    _id: `local-${Date.now()}`,
    ...payload,
    materialName: materialLabel(payload.material),
    density_g_cm3: calculatedResult.density_g_cm3,
    volume_cm3: calculatedResult.volume_cm3,
    weight_g: calculatedResult.weight_g,
    createdAt: new Date().toISOString(),
    source: 'local',
  });

  const saveEntryLocally = (entry) => {
    const nextHistory = [entry, ...localHistory()].slice(0, 100);
    storeLocalHistory(nextHistory);
    setHistory((current) => [entry, ...current]);
  };

  const handleDelete = async (id) => {
    if (!id) return;
    setDeletingId(id);
    setSaveNotice('');
    try {
      if (isLocalEntry(id)) {
        const nextHistory = localHistory().filter((entry) => entry._id !== id);
        storeLocalHistory(nextHistory);
        setHistory((current) => current.filter((entry) => entry._id !== id));
        return;
      }

      const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      fetchHistory();
    } catch (error) {
      console.error(error);
      setSaveNotice(calcCopy.errors.default);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCalc = async (save = false) => {
    setFormError('');
    setSaveNotice('');

    if (!hasValidInput) {
      setFormError(calcCopy.errors.invalidInput || calcCopy.errors.default);
      return;
    }

    const payload = {
      inputType,
      shape,
      dimensions,
      volume_liters: inputType === 'volume' ? toNumber(volumeLiters) : undefined,
      material,
      title: title?.trim() ? title.trim() : undefined,
      save,
    };

    const localResult = buildLocalResult({ inputType, shape, dimensions, volumeLiters, material, densityMap });
    setResult(localResult);

    if (!save) return;

    if (String(material).startsWith('custom-')) {
      saveEntryLocally(createLocalEntry(payload, localResult));
      setTitle('');
      setSaveNotice(featureCopy.localSaved || calcCopy.errors.default);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/calc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      setResult(data);
      setTitle('');
      fetchHistory();
    } catch (err) {
      console.error(err);
      saveEntryLocally(createLocalEntry(payload, localResult));
      setTitle('');
      setSaveNotice(featureCopy.localSaved || calcCopy.errors.default);
    } finally {
      setSaving(false);
    }
  };

  const handleAddMaterial = () => {
    const name = customName.trim();
    const density = toNumber(customDensity);
    setFormError('');
    setSaveNotice('');

    if (!name || density <= 0) {
      setFormError(featureCopy.invalidMaterial || calcCopy.errors.invalidInput);
      return;
    }

    const customMaterial = {
      key: `custom-${Date.now()}`,
      name,
      density,
    };
    const nextMaterials = [...customMaterials, customMaterial].slice(-12);
    setCustomMaterials(nextMaterials);
    writeStoredArray(LOCAL_MATERIALS_KEY, nextMaterials);
    setMaterial(customMaterial.key);
    setCustomName('');
    setCustomDensity('');
    setSaveNotice(featureCopy.materialAdded || '');
  };

  const handleDimensionChange = (key, value) => {
    setDimensions((prev) => ({ ...prev, [key]: value }));
  };

  const inputButtonClasses = (active) =>
    `rounded-md px-3 py-2 text-center text-sm font-medium leading-snug transition ${
      active
        ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-white dark:ring-slate-700'
        : 'text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
    }`;

  const labelClasses = 'text-xs font-semibold text-slate-500 dark:text-slate-400';
  const inputClasses =
    'mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm transition placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-600/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500';

  const inputOptions = [
    { key: 'dimensions', label: calcCopy.modeDimensions },
    { key: 'volume', label: calcCopy.modeVolume },
  ];

  const primaryResult = result || localPreview;
  const visibleHistory = history.slice(0, 5);
  const hiddenHistoryCount = Math.max(history.length - visibleHistory.length, 0);
  return (
    <div className="grid w-full gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
          <div className="grid w-full grid-cols-2 gap-1">
            {inputOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className={inputButtonClasses(option.key === inputType)}
                onClick={() => {
                  setInputType(option.key);
                  setFormError('');
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {inputType === 'dimensions' && (
            <>
              <div>
                <label className={labelClasses} htmlFor="shape">
                  {calcCopy.shapeLabel}
                </label>
                <select
                  id="shape"
                  className={inputClasses}
                  value={shape}
                  onChange={(e) => setShape(e.target.value)}
                >
                  <option value="rectangular">{calcCopy.shapeRectangular}</option>
                  <option value="cylinder">{calcCopy.shapeCylinder}</option>
                </select>
              </div>

              {shape === 'rectangular' && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <NumberField
                    label={calcCopy.lengthLabel}
                    value={dimensions.length_cm}
                    placeholder={placeholders.length}
                    classes={{ label: labelClasses, input: inputClasses }}
                    onChange={(value) => handleDimensionChange('length_cm', value)}
                  />
                  <NumberField
                    label={calcCopy.widthLabel}
                    value={dimensions.width_cm}
                    placeholder={placeholders.width}
                    classes={{ label: labelClasses, input: inputClasses }}
                    onChange={(value) => handleDimensionChange('width_cm', value)}
                  />
                  <NumberField
                    label={calcCopy.heightLabel}
                    value={dimensions.height_cm}
                    placeholder={placeholders.height}
                    classes={{ label: labelClasses, input: inputClasses }}
                    onChange={(value) => handleDimensionChange('height_cm', value)}
                  />
                </div>
              )}

              {shape === 'cylinder' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField
                    label={calcCopy.radiusLabel}
                    value={dimensions.radius_cm}
                    placeholder={placeholders.radius}
                    classes={{ label: labelClasses, input: inputClasses }}
                    onChange={(value) => handleDimensionChange('radius_cm', value)}
                  />
                  <NumberField
                    label={calcCopy.heightLabel}
                    value={dimensions.height_cm}
                    placeholder={placeholders.height}
                    classes={{ label: labelClasses, input: inputClasses }}
                    onChange={(value) => handleDimensionChange('height_cm', value)}
                  />
                </div>
              )}
            </>
          )}

          {inputType === 'volume' && (
            <NumberField
              label={calcCopy.volumeInputLabel}
              value={volumeLiters}
              placeholder={placeholders.volume}
              classes={{ label: labelClasses, input: inputClasses }}
              onChange={setVolumeLiters}
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClasses} htmlFor="material">
                {calcCopy.materialLabel}
              </label>
              <select
                id="material"
                className={inputClasses}
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
              >
                {materialOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label} ({formatNumber(option.density, 3)} {units.density})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClasses} htmlFor="title">
                {calcCopy.titleLabel}
              </label>
              <input
                id="title"
                className={inputClasses}
                placeholder={calcCopy.titlePlaceholder}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
              />
            </div>
          </div>

          <details className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">
              {featureCopy.customMaterialTitle || 'Custom Material'}
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_130px_auto]">
              <input
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-600/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                placeholder={featureCopy.materialNamePlaceholder || 'Travertine'}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
              <input
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-600/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                placeholder={featureCopy.densityPlaceholder || '2.5'}
                value={customDensity}
                inputMode="decimal"
                type="number"
                min="0"
                step="any"
                onChange={(e) => setCustomDensity(e.target.value)}
              />
              <button
                type="button"
                className="min-h-10 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                onClick={handleAddMaterial}
              >
                {featureCopy.addMaterial || 'Add'}
              </button>
            </div>
          </details>

          {formError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200">
              {formError}
            </p>
          )}

          {saveNotice && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">
              {saveNotice}
            </p>
          )}

          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => handleCalc(false)}
              disabled={saving}
              className="min-h-10 rounded-lg bg-teal-700 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:min-w-32"
            >
              {saving ? calcCopy.buttons.calculating : calcCopy.buttons.calculate}
            </button>
            <button
              type="button"
              onClick={() => handleCalc(true)}
              disabled={saving}
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 sm:min-w-36 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 dark:disabled:text-slate-600"
            >
              {saving ? calcCopy.buttons.saving : calcCopy.buttons.calculateAndSave}
            </button>
          </div>
        </div>
      </div>

      <aside className="min-w-0 space-y-4">
        <section className="rounded-xl bg-slate-950 p-4 text-white shadow-sm sm:p-5 dark:border dark:border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-200 sm:tracking-[0.22em]">
            {calcCopy.result.title}
          </p>
          <p className="mt-4 break-words text-3xl font-semibold leading-none sm:text-4xl">
            {formatNumber(primaryResult.weight_kg, 3)}
            <span className="ml-2 text-base font-medium text-slate-300">{units.kg}</span>
          </p>
          <dl className="mt-5 grid gap-3 sm:mt-6">
            <Metric label={calcCopy.result.volume} value={`${formatNumber(primaryResult.volume_cm3)} ${units.cm3}`} />
            <Metric
              label={calcCopy.result.density}
              value={`${formatNumber(primaryResult.density_g_cm3)} ${units.density}`}
            />
            <Metric label={calcCopy.result.weight} value={`${formatNumber(primaryResult.weight_g)} ${units.g}`} />
          </dl>
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              {featureCopy.projectTitle || 'Project total'}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <CompactStat label={featureCopy.items || 'Items'} value={formatNumber(projectTotals.count, 0)} />
              <CompactStat label={calcCopy.result.volume} value={formatNumber(projectTotals.volume)} />
              <CompactStat label={calcCopy.result.weight} value={`${formatNumber(projectTotals.weight / 1000, 2)} ${units.kg}`} />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 sm:tracking-[0.18em] dark:text-slate-300">
              {calcCopy.history.title}
            </p>
            {historyLoading && (
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {calcCopy.history.loading}
              </span>
            )}
          </div>

          {historyError && (
            <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              {historyError}
            </p>
          )}

          {!historyLoading && !historyError && history.length === 0 && (
            <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">{calcCopy.history.empty}</p>
          )}

          {history.length > 0 && (
            <ul className="mt-4 space-y-3">
              {visibleHistory.map((entry) => (
                <li key={entry._id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-950 dark:text-slate-100">
                        {entry.title || entry.materialName || materialLabel(entry.material)}
                      </p>
                      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {entry.materialName || materialLabel(entry.material)}
                        {isLocalEntry(entry._id) ? ` · ${featureCopy.localBadge || 'Local'}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="min-h-9 rounded-md border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-0 dark:border-red-900/70 dark:text-red-300 dark:hover:bg-red-950/40"
                      onClick={() => handleDelete(entry._id)}
                      disabled={deletingId === entry._id}
                    >
                      {calcCopy.history.delete}
                    </button>
                  </div>
                  <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Metric
                      label={calcCopy.history.columns.volume}
                      value={`${formatNumber(entry.volume_cm3)} ${units.cm3}`}
                      compact
                    />
                    <Metric
                      label={calcCopy.history.columns.weight}
                      value={`${formatNumber(Number(entry.weight_g ?? 0) / 1000, 3)} ${units.kg}`}
                      compact
                    />
                  </dl>
                </li>
              ))}
            </ul>
          )}

          {hiddenHistoryCount > 0 && (
            <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
              +{hiddenHistoryCount} {featureCopy.moreSaved || 'more saved'}
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}

function NumberField({ label, value, placeholder, onChange, classes }) {
  return (
    <div>
      <label className={classes.label}>{label}</label>
      <input
        className={classes.input}
        placeholder={placeholder}
        value={value}
        inputMode="decimal"
        type="number"
        min="0"
        step="any"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Metric({ label, value, compact = false }) {
  return (
    <div className={compact ? '' : 'rounded-lg bg-white/10 p-3'}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className={`${compact ? 'text-sm' : 'mt-1 text-lg'} font-semibold text-current`}>{value}</dd>
    </div>
  );
}

function CompactStat({ label, value }) {
  return (
    <div>
      <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate font-semibold text-white">{value}</p>
    </div>
  );
}
