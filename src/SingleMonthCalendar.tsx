import React, { useState } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
} from 'date-fns';
import { Language } from './translations';

interface SingleMonthCalendarProps {
  language: Language;
  darkMode: boolean; // Nowy prop
}

export default function SingleMonthCalendar({
  language,
  darkMode,
}: SingleMonthCalendarProps) {
  const [displayDate, setDisplayDate] = useState<Date>(new Date());
  const monthName: string = format(displayDate, 'LLLL yyyy');

  const handlePrev = () => setDisplayDate((prev) => subMonths(prev, 1));
  const handleNext = () => setDisplayDate((prev) => addMonths(prev, 1));

  const startOfM = startOfMonth(displayDate);
  const endOfM = endOfMonth(displayDate);
  const startDisplay = startOfWeek(startOfM, { weekStartsOn: 1 });
  const endDisplay = endOfWeek(endOfM, { weekStartsOn: 1 });
  const allDays = eachDayOfInterval({ start: startDisplay, end: endDisplay });

  const dayNames = language === 'pl'
    ? ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className={`mt-8 ${darkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-900'}`}>
      <div className="flex justify-between items-center mb-2">
        <button
          onClick={handlePrev}
          className={`px-3 py-1 rounded ${darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'}`}
        >
          {language === 'pl' ? 'Poprzedni' : 'Previous'}
        </button>
        <h3 className="text-center font-semibold">{monthName}</h3>
        <button
          onClick={handleNext}
          className={`px-3 py-1 rounded ${darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'}`}
        >
          {language === 'pl' ? 'Następny' : 'Next'}
        </button>
      </div>

      <table className="border-collapse w-full text-xs">
        <thead>
          <tr>
            {dayNames.map((d) => (
              <th
                key={d}
                className={`p-1 border text-center font-medium ${
                  darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'
                }`}
              >
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.ceil(allDays.length / 7) }).map((_, weekIndex) => {
            const weekDays = allDays.slice(weekIndex * 7, (weekIndex + 1) * 7);

            return (
              <tr key={weekIndex}>
                {weekDays.map((day) => {
                  const isCurrentMonth = day.getMonth() === displayDate.getMonth();
                  const highlightToday = isToday(day);

                  return (
                    <td
                      key={day.toISOString()}
                      className={`
                        p-1 border text-center
                        ${
                          !isCurrentMonth
                            ? darkMode
                              ? 'text-gray-500'
                              : 'text-gray-400'
                            : darkMode
                            ? 'text-gray-200'
                            : 'text-gray-800'
                        }
                        ${highlightToday ? (darkMode ? 'bg-yellow-600' : 'bg-yellow-200') : ''}
                      `}
                    >
                      {format(day, 'd')}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
