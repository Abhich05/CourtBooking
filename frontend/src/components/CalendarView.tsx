import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, isBefore, startOfDay } from 'date-fns';

interface CalendarViewProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ selectedDate, onSelectDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Pad the beginning with empty cells
  const startDay = monthStart.getDay();
  const paddedDays: (Date | null)[] = Array(startDay).fill(null).concat(daysInMonth);
  
  const today = startOfDay(new Date());
  
  return (
    <div className="card">
      <h3 className="card-title">Select Date</h3>
      <div className="calendar">
        <div className="calendar-nav">
          <button 
            className="calendar-nav-btn" 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            aria-label="Previous month"
          >
            ←
          </button>
          <span className="calendar-month">{format(currentMonth, 'MMMM yyyy')}</span>
          <button 
            className="calendar-nav-btn" 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            aria-label="Next month"
          >
            →
          </button>
        </div>
        
        <div className="calendar-grid">
          {daysOfWeek.map((day, i) => (
            <div key={`header-${i}`} className="calendar-header">{day}</div>
          ))}
          
          {paddedDays.map((day, index) => (
            <div
              key={index}
              className={`calendar-day ${
                day ? '' : 'empty'
              } ${
                day && selectedDate && isSameDay(day, selectedDate) ? 'selected' : ''
              } ${
                day && isToday(day) ? 'today' : ''
              } ${
                day && isBefore(day, today) ? 'disabled' : ''
              }`}
              onClick={() => day && !isBefore(day, today) && onSelectDate(day)}
              style={{
                cursor: day && !isBefore(day, today) ? 'pointer' : 'default',
                opacity: day ? (isBefore(day, today) ? 0.4 : 1) : 0,
              }}
            >
              {day ? format(day, 'd') : ''}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
