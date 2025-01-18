import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Download,
  Mail,
  Repeat,
  Share2,
  MapPin,
  Users
} from 'lucide-react';
import { createEvents } from 'ics';
import { format, addMinutes, differenceInMinutes, isBefore } from 'date-fns';

import {
  parseTimeToMinutes,
  isValidEmail,
  getTimezoneOffsetInHours,
  isIOSSafari
} from './utils';
import { translations, Language, TranslationKeys } from './translations';
import SingleMonthCalendar from './SingleMonthCalendar';
import RruleGraphic from './RruleGraphic';
import CookieBanner from './CookieBanner';
import MainAppColors from './MainAppColors';

type Attendee = {
  name?: string;
  email: string;
};

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [language, setLanguage] = useState<Language>('pl');
  const t = (key: TranslationKeys): string => translations[language][key];

  const colors = darkMode ? MainAppColors.darkMode : MainAppColors.lightMode;

  const [title, setTitle] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [duration, setDuration] = useState<string>('60');
  const [useEndTime, setUseEndTime] = useState<boolean>(false);

  const [recurrence, setRecurrence] = useState<
    'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'weekend' | 'workdays'
  >('none');

  const [timeZone, setTimeZone] = useState<string>('Europe/Warsaw');
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localOffset = getTimezoneOffsetInHours(localTz);
  const selectedOffset = getTimezoneOffsetInHours(timeZone);
  const diff = selectedOffset - localOffset;
  const diffDisplay = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} h`;

  const [contacts, setContacts] = useState<string>('');
  const [isAdvanced, setIsAdvanced] = useState<boolean>(false);
  const [advancedRRule, setAdvancedRRule] = useState<string>('');
  const [notificationTime, setNotificationTime] = useState<string>('5');
  const [workStart, setWorkStart] = useState<string>('09:00');
  const [workEnd, setWorkEnd] = useState<string>('17:00');
  const [ignoreWorkHours, setIgnoreWorkHours] = useState<boolean>(false);
  const [meetingClass, setMeetingClass] = useState<'public' | 'private'>('public');
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isIOSSafari()) {
      setIsIOS(true);
    }
  }, []);

  const [alternativeFileName, setAlternativeFileName] = useState<boolean>(false);

  function validateData(): boolean {
    const newErrors: string[] = [];
    if (!title.trim()) {
      newErrors.push(
        language === 'pl' ? 'Tytuł nie może być pusty.' : 'Title cannot be empty.'
      );
    }
    if (!date) {
      newErrors.push(
        language === 'pl' ? 'Data nie może być pusta.' : 'Date cannot be empty.'
      );
    }
    if (!time) {
      newErrors.push(
        language === 'pl'
          ? 'Godzina rozpoczęcia nie może być pusta.'
          : 'Start time cannot be empty.'
      );
    }
    setErrors(newErrors);
    return newErrors.length === 0;
  }

  return (
    <div
      className={`${colors.background} ${colors.text} min-h-screen py-12 px-4 sm:px-6 lg:px-8`}
    >
      <div className="max-w-md mx-auto rounded-xl shadow-lg overflow-hidden">
        <div className="px-8 py-6">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setLanguage(language === 'pl' ? 'en' : 'pl')}
              className={`px-3 py-1 rounded ${colors.button}`}
            >
              {t('switchLang')}
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`px-3 py-1 rounded ${colors.button}`}
            >
              {darkMode ? t('lightMode') : t('darkMode')}
            </button>
          </div>

          <h1 className="text-3xl font-bold text-center mb-8">{t('planName')}</h1>

          {errors.length > 0 && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
              <ul className="list-disc list-inside">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className={`block text-sm font-medium ${colors.label}`}>{t('date')}</label>
              <div className="mt-1 relative">
                <Calendar className={`absolute left-2 top-2.5 h-5 w-5 ${colors.placeholder}`} />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`block w-full pl-10 rounded-md ${colors.border} p-2 ${colors.background} ${colors.text} ${colors.focus}`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium ${colors.label}`}>{t('startTime')}</label>
              <div className="mt-1 relative">
                <Clock className={`absolute left-2 top-2.5 h-5 w-5 ${colors.placeholder}`} />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={`block w-full pl-10 rounded-md ${colors.border} p-2 ${colors.background} ${colors.text} ${colors.focus}`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium ${colors.label}`}>{t('timeZone')}</label>
              <select
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className={`mt-1 block w-full rounded-md ${colors.border} p-2 ${colors.background} ${colors.text} ${colors.focus}`}
              >
                <option value="Europe/Warsaw">Europe/Warsaw</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
                <option value="Asia/Shanghai">Asia/Shanghai</option>
                <option value="UTC">UTC</option>
              </select>
              <p className="text-sm mt-1">
                {t('timeDiff')}: <strong>{diffDisplay}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
