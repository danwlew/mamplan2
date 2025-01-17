// App.tsx
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

import { parseTimeToMinutes, isValidEmail, getTimezoneOffsetInHours } from './utils';
import { translations, Language, TranslationKeys } from './translations';
import SingleMonthCalendar from './SingleMonthCalendar';
import RruleGraphic from './RruleGraphic';

type Attendee = {
  name?: string;
  email: string;
};

export default function App() {
  // --- STANY ---
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [language, setLanguage] = useState<Language>('pl');
  const t = (key: TranslationKeys): string => translations[language][key];

  const [title, setTitle] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>('');   // "YYYY-MM-DD"
  const [time, setTime] = useState<string>('');   // "HH:MM"
  const [endTime, setEndTime] = useState<string>(''); // "HH:MM"
  const [duration, setDuration] = useState<string>('60');
  const [useEndTime, setUseEndTime] = useState<boolean>(false);

  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'weekend' | 'workdays'>('none');

  const [timeZone, setTimeZone] = useState<string>('Europe/Warsaw');
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localOffset = getTimezoneOffsetInHours(localTz);
  const selectedOffset = getTimezoneOffsetInHours(timeZone);
  const diff = selectedOffset - localOffset;
  const diffDisplay = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} h`;

  const [contacts, setContacts] = useState<string>('');

  // Zaawansowane
  const [isAdvanced, setIsAdvanced] = useState<boolean>(false);
  const [advancedRRule, setAdvancedRRule] = useState<string>('');
  const [notificationTime, setNotificationTime] = useState<string>('5');
  const [workStart, setWorkStart] = useState<string>('09:00');
  const [workEnd, setWorkEnd] = useState<string>('17:00');
  const [ignoreWorkHours, setIgnoreWorkHours] = useState<boolean>(false);

  // Publiczne / Prywatne
  const [meetingClass, setMeetingClass] = useState<'public' | 'private'>('public');

  // Załączniki
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [attachments, setAttachments] = useState<string[]>([]);

  // Błędy
  const [errors, setErrors] = useState<string[]>([]);

  // Czas bieżący do wyświetlania
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Prośba o dostęp do powiadomień
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // --- FUNKCJE ---

  function parseContacts() {
    const emailsArr: string[] = [];
    const attendeesArr: Attendee[] = [];

    if (!contacts.trim()) {
      return { emails: emailsArr, attendees: attendeesArr };
    }

    const contactList = contacts.split(',').map((c) => c.trim());
    contactList.forEach((c) => {
      const parts = c.split(' ');
      const maybeEmail = parts[parts.length - 1];
      if (maybeEmail.includes('@')) {
        const email = maybeEmail;
        const name = parts.slice(0, parts.length - 1).join(' ');
        emailsArr.push(email);
        attendeesArr.push({ name: name || '', email });
      } else {
        emailsArr.push(c);
        attendeesArr.push({ name: '', email: c });
      }
    });

    return { emails: emailsArr, attendees: attendeesArr };
  }

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

    // Sprawdź przeszłość
    if (date && time) {
      const startDateTime = new Date(`${date}T${time}`);
      if (isBefore(startDateTime, new Date())) {
        newErrors.push(
          language === 'pl'
            ? 'Data/godzina nie może być w przeszłości.'
            : 'Date/time cannot be in the past.'
        );
      }
    }

    // Godziny pracy
    if (isAdvanced && !ignoreWorkHours && time) {
      const eventStartMin = parseTimeToMinutes(time);
      const workStartMin = parseTimeToMinutes(workStart);
      const workEndMin = parseTimeToMinutes(workEnd);

      if (eventStartMin < workStartMin || eventStartMin >= workEndMin) {
        newErrors.push(
          language === 'pl' ? t('outOfOffice') : t('eventOutsideHours')
        );
      }
    }

    // E-maile
    if (contacts.trim()) {
      const contactList = contacts.split(',').map((c) => c.trim());
      contactList.forEach((c) => {
        if (!c.includes('@')) {
          newErrors.push(
            language === 'pl'
              ? `Niepoprawny format adresu: "${c}"`
              : `Invalid email format: "${c}"`
          );
        }
      });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  }

  function scheduleNotification() {
    if (Notification.permission !== 'granted') {
      alert(
        language === 'pl'
          ? 'Proszę włączyć powiadomienia w przeglądarce (lub je odblokować).'
          : 'Please enable notifications in your browser.'
      );
      return;
    }

    const startDateTime = new Date(`${date}T${time}`);
    const notifyMinutes = parseInt(notificationTime, 10) || 5;
    const notificationTimeMs = startDateTime.getTime() - notifyMinutes * 60 * 1000;
    const currentTimeMs = new Date().getTime();

    if (notificationTimeMs > currentTimeMs) {
      const delay = notificationTimeMs - currentTimeMs;
      setTimeout(() => {
        new Notification(
          language === 'pl' ? 'Przypomnienie o wydarzeniu' : 'Event reminder',
          { body: title }
        );
      }, delay);
    } else {
      alert(
        language === 'pl'
          ? 'Ustawiona godzina powiadomienia już minęła.'
          : 'Reminder time has already passed.'
      );
    }
  }

  // Obsługa CSV
  function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (!text || typeof text !== 'string') return;

      const lines = text.split('\n');
      const validEmails: string[] = [];
      for (const line of lines) {
        const candidate = line.trim();
        if (isValidEmail(candidate)) {
          validEmails.push(candidate);
        }
      }

      let existing = contacts.trim();
      if (existing) existing += ', ';
      existing += validEmails.join(', ');
      setContacts(existing);

      alert(
        language === 'pl'
          ? `Zaimportowano ${validEmails.length} adresów e-mail z pliku CSV.`
          : `Imported ${validEmails.length} email addresses from CSV file.`
      );
    };
    reader.readAsText(file);
  }

  // Generowanie pliku ICS
  function handleGenerateICS() {
    if (!validateData()) return;

    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);

    let eventDuration = parseInt(duration, 10) || 60;
    if (useEndTime && endTime) {
      eventDuration = differenceInMinutes(
        new Date(`${date}T${endTime}`),
        new Date(`${date}T${time}`)
      );
    }

    const { attendees } = parseContacts();

    const alarms = isAdvanced
      ? [
          {
            action: 'display',
            description:
              language === 'pl'
                ? `Powiadomienie o wydarzeniu: ${title}`
                : `Event reminder: ${title}`,
            trigger: { minutes: parseInt(notificationTime, 10), before: true }
          }
        ]
      : [];

    // Załączniki
    const attachObj = attachments.map((url) => ({ uri: url }));

    // CLASS w ICS
    const icsClass = meetingClass === 'private' ? 'PRIVATE' : 'PUBLIC';

    // Określenie RRULE
    let rrule: string | undefined;
    if (isAdvanced && advancedRRule.trim()) {
      rrule = advancedRRule.trim();
    } else {
      switch (recurrence) {
        case 'daily':
          rrule = 'FREQ=DAILY';
          break;
        case 'weekly':
          rrule = 'FREQ=WEEKLY';
          break;
        case 'monthly':
          rrule = 'FREQ=MONTHLY';
          break;
        case 'yearly':
          rrule = 'FREQ=YEARLY';
          break;
        case 'weekend':
          rrule = 'FREQ=WEEKLY;BYDAY=SA,SU';
          break;
        case 'workdays':
          rrule = 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';
          break;
        default:
          rrule = undefined;
      }
    }

    // createEvents z biblioteki "ics"
    createEvents(
      [
        {
          start: [year, month, day, hours, minutes],
          duration: { minutes: eventDuration },
          title,
          description,
          location,
          attendees,
          alarms,
          attachments: attachObj,
          recurrenceRule: rrule,
          startOutputType: 'local',
          class: icsClass // 'PUBLIC'/'PRIVATE'
        }
      ],
      (error: Error | null, value: string | undefined) => {
        if (error) {
          console.error(error);
          alert(error.message);
          return;
        }
        if (!value) return;

        const blob = new Blob([value], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'plan-event.ics';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    );
  }

  // Dodawanie do Google Calendar
  function handleAddToGoogle() {
    if (!validateData()) return;

    const dateTimeStr = `${date}T${time}:00`;
    let eventDuration = parseInt(duration, 10);
    if (useEndTime && endTime) {
      eventDuration = differenceInMinutes(
        new Date(`${date}T${endTime}`),
        new Date(`${date}T${time}`)
      );
    }
    const endDateTime = new Date(dateTimeStr);
    endDateTime.setMinutes(endDateTime.getMinutes() + eventDuration);

    const googleUrl = new URL('https://calendar.google.com/calendar/render');
    googleUrl.searchParams.append('action', 'TEMPLATE');
    googleUrl.searchParams.append('text', title);

    let googleDetails = description;
    if (meetingClass === 'private') {
      googleDetails = `[PRIVATE] ${googleDetails}`;
    }
    googleUrl.searchParams.append('details', googleDetails);
    if (location) {
      googleUrl.searchParams.append('location', location);
    }
    googleUrl.searchParams.append('ctz', timeZone);

    const startStr = dateTimeStr.replace(/[-:]/g, '');
    const endStr = format(endDateTime, "yyyyMMdd'T'HHmmss");
    googleUrl.searchParams.append('dates', `${startStr}/${endStr}`);

    // RRULE
    let rrule = '';
    if (isAdvanced && advancedRRule.trim()) {
      rrule = `RRULE:${advancedRRule.trim()}`;
    } else {
      switch (recurrence) {
        case 'daily':
          rrule = 'RRULE:FREQ=DAILY';
          break;
        case 'weekly':
          rrule = 'RRULE:FREQ=WEEKLY';
          break;
        case 'monthly':
          rrule = 'RRULE:FREQ=MONTHLY';
          break;
        case 'yearly':
          rrule = 'RRULE:FREQ=YEARLY';
          break;
        case 'weekend':
          rrule = 'RRULE:FREQ=WEEKLY;BYDAY=SA,SU';
          break;
        case 'workdays':
          rrule = 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';
          break;
        default:
          rrule = '';
      }
    }
    if (rrule) {
      googleUrl.searchParams.append('recur', rrule);
    }

    const { emails } = parseContacts();
    emails.forEach((email) => {
      googleUrl.searchParams.append('add', email);
    });

    window.open(googleUrl.toString(), '_blank');
  }

  // Wysyłanie mailto + powiadomienia
  function handleShareViaEmail() {
    if (!validateData()) return;

    const dateTimeStr = `${date}T${time}:00`;
    let eventDuration = parseInt(duration, 10);
    if (useEndTime && endTime) {
      eventDuration = differenceInMinutes(
        new Date(`${date}T${endTime}`),
        new Date(`${date}T${time}`)
      );
    }
    const endDateTime = addMinutes(new Date(dateTimeStr), eventDuration);

    const formattedDate = format(new Date(dateTimeStr), 'dd.MM.yyyy');
    const formattedStartTime = format(new Date(dateTimeStr), 'HH:mm');
    const formattedEndTime = format(endDateTime, 'HH:mm');

    const { emails } = parseContacts();
    if (!emails.length) {
      alert(
        language === 'pl'
          ? 'Brak poprawnych adresów email w polu uczestników.'
          : 'No valid email addresses in the participants field.'
      );
      return;
    }

    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(
      (language === 'pl'
        ? 'Zapraszam na wydarzenie:\n\n'
        : 'I invite you to the event:\n\n') +
        `${title}\n` +
        (language === 'pl' ? 'Data' : 'Date') + `: ${formattedDate}\n` +
        (language === 'pl' ? 'Czas' : 'Time') + `: ${formattedStartTime} - ${formattedEndTime}\n` +
        (location
          ? (language === 'pl' ? `Miejsce: ` : `Location: `) + location + '\n'
          : '') +
        `\n${description}\n\n` +
        (language === 'pl'
          ? 'Dodaj do swojego kalendarza klikając w załączony plik .ics'
          : 'Add to your calendar by clicking the attached .ics file')
    );

    const mailto = `mailto:${emails.join(',')}?subject=${subject}&body=${body}`;
    window.location.href = mailto;

    // Jeżeli chcemy też ustawić powiadomienie
    if (isAdvanced) {
      scheduleNotification();
    }
  }

  // Dodawanie załącznika do listy
  function addAttachment() {
    if (!attachmentUrl.trim()) return;
    setAttachments((prev) => [...prev, attachmentUrl.trim()]);
    setAttachmentUrl('');
  }

  // --- RENDER ---
  return (
    <div
      className={
        darkMode
          ? 'bg-black text-lime-300 min-h-screen py-12 px-4 sm:px-6 lg:px-8'
          : 'bg-gradient-to-br from-purple-100 to-indigo-100 text-gray-800 min-h-screen py-12 px-4 sm:px-6 lg:px-8'
      }
    >
      <div
        className="max-w-md mx-auto rounded-xl shadow-lg overflow-hidden"
        style={{ backgroundColor: darkMode ? '#333' : '#fff' }}
      >
        <div className="px-8 py-6">
          <div className="flex justify-between items-center mb-4">
            {/* Przycisk zmiany języka */}
            <button
              onClick={() => setLanguage(language === 'pl' ? 'en' : 'pl')}
              className={
                darkMode
                  ? 'px-3 py-1 rounded bg-gray-700 text-white hover:bg-gray-600'
                  : 'px-3 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300'
              }
            >
              {t('switchLang')}
            </button>

            {/* Tryb ciemny/jasny */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={
                darkMode
                  ? 'px-3 py-1 rounded bg-gray-700 text-white hover:bg-gray-600'
                  : 'px-3 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300'
              }
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
            {/* Tytuł */}
            <div>
              <label className="block text-sm font-medium">{t('title')}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 p-2"
                placeholder={
                  language === 'pl'
                    ? 'Np. Spotkanie z przyjaciółmi'
                    : 'e.g. Meeting with friends'
                }
              />
            </div>

            {/* Lokalizacja */}
            <div>
              <label className="block text-sm font-medium">{t('location')}</label>
              <div className="mt-1 relative">
                <MapPin className="absolute left-2 top-2.5 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="block w-full pl-10 rounded-md border-gray-300 p-2"
                  placeholder={
                    language === 'pl'
                      ? 'Np. Adres / link do spotkania'
                      : 'e.g. Address / meeting link'
                  }
                />
              </div>
            </div>

            {/* Opis */}
            <div>
              <label className="block text-sm font-medium">{t('description')}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 p-2"
                rows={3}
                placeholder={
                  language === 'pl'
                    ? 'Dodatkowe informacje...'
                    : 'Additional info...'
                }
              />
            </div>

            {/* Data + godzina */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">{t('date')}</label>
                <div className="mt-1 relative">
                  <Calendar className="absolute left-2 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="block w-full pl-10 rounded-md border-gray-300 p-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium">{t('startTime')}</label>
                <div className="mt-1 relative">
                  <Clock className="absolute left-2 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="block w-full pl-10 rounded-md border-gray-300 p-2"
                  />
                </div>
              </div>
            </div>

            {/* Czas zakończenia / Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-sm font-medium mb-2">
                  <input
                    type="checkbox"
                    checked={useEndTime}
                    onChange={(e) => setUseEndTime(e.target.checked)}
                    className="mr-2 rounded border-gray-300"
                  />
                  {t('setEndTime')}
                </label>
                {useEndTime ? (
                  <div className="relative">
                    <Clock className="absolute left-2 top-2.5 h-5 w-5 text-gray-400" />
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="block w-full pl-10 rounded-md border-gray-300 p-2"
                    />
                  </div>
                ) : (
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 p-2"
                  >
                    <option value="15">15 {language === 'pl' ? 'minut' : 'minutes'}</option>
                    <option value="30">30 {language === 'pl' ? 'minut' : 'minutes'}</option>
                    <option value="45">45 {language === 'pl' ? 'minut' : 'minutes'}</option>
                    <option value="60">{language === 'pl' ? '1 godzina' : '1 hour'}</option>
                    <option value="90">{language === 'pl' ? '1.5 godziny' : '1.5 hours'}</option>
                    <option value="120">{language === 'pl' ? '2 godziny' : '2 hours'}</option>
                    <option value="180">{language === 'pl' ? '3 godziny' : '3 hours'}</option>
                    <option value="240">{language === 'pl' ? '4 godziny' : '4 hours'}</option>
                    <option value="300">{language === 'pl' ? '5 godzin' : '5 hours'}</option>
                    <option value="360">{language === 'pl' ? '6 godzin' : '6 hours'}</option>
                    <option value="420">{language === 'pl' ? '7 godzin' : '7 hours'}</option>
                    <option value="480">{language === 'pl' ? '8 godzin' : '8 hours'}</option>
                  </select>
                )}
              </div>

              {/* Powtarzanie proste */}
              <div>
                <label className="block text-sm font-medium">{t('simpleRepeat')}</label>
                <div className="mt-1 relative">
                  <Repeat className="absolute left-2 top-2.5 h-5 w-5 text-gray-400" />
                  <select
                    value={recurrence}
                    onChange={(e) =>
                      setRecurrence(
                        e.target.value as typeof recurrence
                      )
                    }
                    className="block w-full pl-10 rounded-md border-gray-300 p-2"
                  >
                    <option value="none">{t('none')}</option>
                    <option value="daily">{t('daily')}</option>
                    <option value="weekly">{t('weekly')}</option>
                    <option value="monthly">{t('monthly')}</option>
                    <option value="yearly">{t('yearly')}</option>
                    <option value="weekend">{t('weekend')}</option>
                    <option value="workdays">{t('workdays')}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Strefa czasowa */}
            <div>
              <label className="block text-sm font-medium">{t('timeZone')}</label>
              <select
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 p-2"
              >
                <option value="Europe/Warsaw">Europe/Warsaw</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
                <option value="Europe/Kiev">Europe/Kiev</option>
                <option value="Asia/Shanghai">Asia/Shanghai</option>
                <option value="Asia/Kolkata">Asia/Kolkata</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
              </select>
              <p className="text-sm mt-1">
                {t('timeDiff')}: <strong>{diffDisplay}</strong>
              </p>
            </div>

            {/* Kontakty */}
            <div>
              <label className="block text-sm font-medium">{t('contacts')}</label>
              <div className="mt-1 relative">
                <Users className="absolute left-2 top-2.5 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={contacts}
                  onChange={(e) => setContacts(e.target.value)}
                  className="block w-full pl-10 rounded-md border-gray-300 p-2"
                  placeholder={
                    language === 'pl'
                      ? 'Np. "Jan jan@example.com, anna@example.com"'
                      : 'e.g. "John john@example.com, anna@example.com"'
                  }
                />
              </div>
            </div>

            {/* Sekcja Zaawansowana */}
            <div className="border-t pt-4 mt-4">
              <label className="inline-flex items-center mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAdvanced}
                  onChange={(e) => setIsAdvanced(e.target.checked)}
                  className="mr-2 rounded border-gray-300"
                />
                {t('advanced')}
              </label>

              {isAdvanced && (
                <div className="space-y-4 pl-2">
                  {/* Publiczne/prywatne */}
                  <div>
                    <label className="block text-sm font-medium">
                      {t('meetingClassLabel')}
                    </label>
                    <div className="mt-1 flex gap-4">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="meetingClass"
                          value="public"
                          checked={meetingClass === 'public'}
                          onChange={() => setMeetingClass('public')}
                          className="mr-2"
                        />
                        {t('public')}
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="meetingClass"
                          value="private"
                          checked={meetingClass === 'private'}
                          onChange={() => setMeetingClass('private')}
                          className="mr-2"
                        />
                        {t('private')}
                      </label>
                    </div>
                  </div>

                  {/* Zaawansowana RRULE */}
                  <div>
                    <label className="block text-sm font-medium">{t('advancedRule')}</label>
                    <input
                      type="text"
                      value={advancedRRule}
                      onChange={(e) => setAdvancedRRule(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 p-2"
                      placeholder={
                        language === 'pl'
                          ? 'Np. "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE"'
                          : 'e.g. "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE"'
                      }
                    />
                  </div>

                  {/* Graficzna RRULE */}
                  <RruleGraphic
                    language={language}
                    setAdvancedRRule={setAdvancedRRule}
                  />

                  {/* Powiadomienie */}
                  <div>
                    <label className="block text-sm font-medium">{t('reminder')}</label>
                    <input
                      type="number"
                      value={notificationTime}
                      onChange={(e) => setNotificationTime(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 p-2"
                      min="1"
                    />
                  </div>

                  {/* Godziny pracy */}
                  <div className="flex space-x-2 items-center">
                    <div>
                      <label className="block text-sm font-medium">{t('workHoursStart')}</label>
                      <input
                        type="time"
                        value={workStart}
                        onChange={(e) => setWorkStart(e.target.value)}
                        className="block w-full rounded-md border-gray-300 p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">{t('workHoursEnd')}</label>
                      <input
                        type="time"
                        value={workEnd}
                        onChange={(e) => setWorkEnd(e.target.value)}
                        className="block w-full rounded-md border-gray-300 p-2"
                      />
                    </div>
                  </div>
                  <label className="inline-flex items-center cursor-pointer mt-2">
                    <input
                      type="checkbox"
                      checked={ignoreWorkHours}
                      onChange={(e) => setIgnoreWorkHours(e.target.checked)}
                      className="mr-2 rounded border-gray-300"
                    />
                    {t('ignoreWorkHours')}
                  </label>

                  {/* Import CSV */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium">{t('importCsvLabel')}</label>
                    <p className="text-sm text-gray-500 mb-2">{t('importCsvInfo')}</p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleImportCSV}
                      className="block w-full text-sm text-gray-700
                        file:mr-4 file:py-2 file:px-4
                        file:rounded file:border-0
                        file:text-sm file:font-semibold
                        file:bg-gray-100 file:text-gray-700
                        hover:file:bg-gray-200"
                    />
                  </div>

                  {/* Załącznik */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-1">
                      {t('attachLabel')}
                    </label>
                    <p className="text-sm text-gray-500 mb-2">{t('attachmentInfo')}</p>
                    <input
                      type="text"
                      value={attachmentUrl}
                      onChange={(e) => setAttachmentUrl(e.target.value)}
                      placeholder={t('attachPlaceholder')}
                      className="block w-full mb-2 rounded-md border-gray-300 p-2"
                    />
                    <button
                      onClick={addAttachment}
                      className="px-3 py-1 bg-green-600 text-white rounded"
                    >
                      {t('addAttachment')}
                    </button>
                    <ul className="mt-2 list-disc list-inside text-sm">
                      {attachments.map((att, index) => (
                        <li key={index}>{att}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Przyciski akcji */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <button
                onClick={handleGenerateICS}
                className="flex items-center justify-center px-4 py-2 
                  border border-transparent rounded-md shadow-sm text-sm font-medium 
                  text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Download className="h-5 w-5 mr-2" />
                {t('downloadICS')}
              </button>

              <button
                onClick={handleAddToGoogle}
                className="flex items-center justify-center px-4 py-2 
                  border border-transparent rounded-md shadow-sm text-sm font-medium 
                  text-white bg-red-600 hover:bg-red-700"
              >
                <Mail className="h-5 w-5 mr-2" />
                {t('google')}
              </button>

              <button
                onClick={handleShareViaEmail}
                className="flex items-center justify-center px-4 py-2 
                  border border-transparent rounded-md shadow-sm text-sm font-medium 
                  text-white bg-green-600 hover:bg-green-700"
              >
                <Share2 className="h-5 w-5 mr-2" />
                {t('send')}
              </button>
            </div>
          </div>

          {/* Kalendarz + aktualny czas */}
          <SingleMonthCalendar language={language} />

          <div className="text-center mt-6">
            <p className="text-lg font-semibold">
              {t('currentTime')}: {format(currentTime, 'HH:mm')}
            </p>
            <p className="text-sm">
              {t('todaysDate')}: {format(currentTime, 'dd.MM.yyyy')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
