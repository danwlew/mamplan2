// RruleGraphic.tsx
import React, { useState } from 'react';
import { Language, translations } from './translations';

interface RruleGraphicProps {
  language: Language;
  setAdvancedRRule: React.Dispatch<React.SetStateAction<string>>;
}

// Przykład minimalny. Możesz dodać w razie potrzeby więcej stałych/dozwolonych wartości.
export default function RruleGraphic({ language, setAdvancedRRule }: RruleGraphicProps) {
  const t = (key: keyof typeof translations['pl']) => translations[language][key];

  const [gFreq, setGFreq] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('WEEKLY');
  const [gInterval, setGInterval] = useState<number>(1);
  const [gByDays, setGByDays] = useState<string[]>(['MO']);
  const [gUntil, setGUntil] = useState('');

  const daysList = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

  const handleDayToggle = (day: string) => {
    setGByDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  function generateRrule() {
    let rruleString = `FREQ=${gFreq};INTERVAL=${gInterval}`;
    if (gByDays.length > 0 && gFreq !== 'DAILY') {
      rruleString += `;BYDAY=${gByDays.join(',')}`;
    }
    if (gUntil) {
      const dt = gUntil.replace(/-/g, '');
      rruleString += `;UNTIL=${dt}T235959Z`;
    }
    setAdvancedRRule(rruleString);
  }

  return (
    <div className="p-2 border rounded">
      <p className="font-semibold mb-2">{t('rruleGraphic')}</p>

      {/* FREQ */}
      <label className="block text-sm font-medium mb-1">{t('freq')}</label>
      <select
        onChange={(e) => setGFreq(e.target.value as typeof gFreq)}
        defaultValue={gFreq}
        className="mb-2 block w-full p-1 rounded border"
      >
        <option value="DAILY">{t('daily')}</option>
        <option value="WEEKLY">{t('weekly')}</option>
        <option value="MONTHLY">{t('monthly')}</option>
        <option value="YEARLY">{t('yearly')}</option>
      </select>

      {/* INTERVAL */}
      <label className="block text-sm font-medium mb-1">{t('interval')}</label>
      <input
        type="number"
        min={1}
        value={gInterval}
        onChange={(e) => setGInterval(Number(e.target.value))}
        className="mb-2 block w-full p-1 rounded border"
      />

      {/* BYDAY */}
      <label className="block text-sm font-medium mb-1">{t('daysOfWeek')}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {daysList.map((day) => (
          <label key={day} className="inline-flex items-center">
            <input
              type="checkbox"
              className="mr-1"
              checked={gByDays.includes(day)}
              onChange={() => handleDayToggle(day)}
            />
            {day}
          </label>
        ))}
      </div>

      {/* UNTIL */}
      <label className="block text-sm font-medium mb-1">{t('until')}</label>
      <input
        type="date"
        value={gUntil}
        onChange={(e) => setGUntil(e.target.value)}
        className="mb-2 block w-full p-1 rounded border"
      />

      <button
        type="button"
        onClick={generateRrule}
        className="px-3 py-1 bg-indigo-600 text-white rounded"
      >
        {t('generateRrule')}
      </button>
    </div>
  );
}
