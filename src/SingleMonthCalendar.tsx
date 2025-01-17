// SingleMonthCalendar.tsx
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
  isToday
} from 'date-fns';
import { Language, translations } from './translations';

interface SingleMonthCalendarProps {
  language: Language;
}

export default function SingleMonthCalendar({ language }: SingleMonthCalendarProps) {
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
    <div className="mt-8">
      <div className="flex justify-between items-center mb-2">
        <button
          onClick={handlePrev}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
        >
          {language === 'pl' ? 'Poprzedni' : 'Previous'}
        </button>
        <h3 className="text-center font-semibold">{monthName}</h3>
        <button
          onClick={handleNext}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
        >
          {language === 'pl' ? 'Następny' : 'Next'}
        </button>
      </div>

      <table className="border-collapse w-full text-xs">
        <thead>
          <tr>
            {dayNames.map((d) => (
              <th key={d} className="p-1 border text-center font-medium bg-gray-100">
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
                        ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-800'}
                        ${highlightToday ? 'bg-yellow-200 font-semibold' : ''}
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
