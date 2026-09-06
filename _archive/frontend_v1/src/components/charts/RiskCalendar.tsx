import { useState } from 'react';
import type { RiskDay } from '../../types';

interface RiskCalendarProps {
  data: RiskDay[];
}

const riskColors: Record<string, string> = {
  'none': 'bg-dark-800/60',
  'low': 'bg-emerald-500/40 border-emerald-500/40',
  'medium': 'bg-amber-500/50 border-amber-500/40',
  'high': 'bg-red-500/60 border-red-500/50',
};

const riskLabels: Record<string, string> = {
  'none': 'No Data',
  'low': 'Low Risk',
  'medium': 'Medium Risk',
  'high': 'High Risk',
};

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function RiskCalendar({ data }: RiskCalendarProps) {
  const [hoveredDay, setHoveredDay] = useState<RiskDay | null>(null);

  // Group data by weeks
  const weeks: (RiskDay | null)[][] = [];
  let currentWeek: (RiskDay | null)[] = [];

  if (data.length > 0) {
    const startDate = new Date(data[0].date);
    const startDayOfWeek = (startDate.getDay() + 6) % 7; // Monday-based

    // Add empty days before the first day
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push(null);
    }

    data.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }
  }

  return (
    <div className="w-full">
      {/* Legend */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-xs text-dark-400 font-medium">Risk Level:</span>
        {['low', 'medium', 'high'].map((level) => (
          <div key={level} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm border ${riskColors[level]}`} />
            <span className="text-[10px] text-dark-500">{riskLabels[level]}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-1 mr-1">
          {weekDays.map((day) => (
            <div key={day} className="w-8 h-8 flex items-center justify-center text-[10px] text-dark-500 font-medium">
              {day}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div className="flex gap-1 overflow-x-auto">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-1">
              {week.map((day, dayIdx) => (
                <div
                  key={dayIdx}
                  className={`w-8 h-8 rounded-md border transition-all duration-200 cursor-pointer ${
                    day
                      ? `${riskColors[day.risk_level]} hover:scale-125 hover:z-10`
                      : 'bg-transparent border-transparent'
                  }`}
                  onMouseEnter={() => day && setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  title={day ? `${day.date}: ${riskLabels[day.risk_level]}` : ''}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Hover info */}
      {hoveredDay && (
        <div className="mt-3 px-3 py-2 bg-dark-800/80 border border-dark-700/50 rounded-lg inline-flex items-center gap-3 animate-fade-in">
          <span className="text-xs text-dark-400">{hoveredDay.date}</span>
          <span className={`text-xs font-medium ${
            hoveredDay.risk_level === 'low' ? 'text-emerald-400' : hoveredDay.risk_level === 'medium' ? 'text-amber-400' : 'text-red-400'
          }`}>
            {riskLabels[hoveredDay.risk_level]}
          </span>
        </div>
      )}
    </div>
  );
}
