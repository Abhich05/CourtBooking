import React from 'react';
import { Slot } from '../api';
import { format, parseISO } from 'date-fns';

interface SlotGridProps {
  slots: Slot[];
  selectedSlot: Slot | null;
  onSelectSlot: (slot: Slot) => void;
  bookedSlots?: string[]; // List of start times that are booked
}

const SlotGrid: React.FC<SlotGridProps> = ({ slots, selectedSlot, onSelectSlot, bookedSlots = [] }) => {
  // Group slots by morning/afternoon/evening
  const morningSlots = slots.filter(slot => {
    const hour = parseISO(slot.start).getHours();
    return hour < 12;
  });
  
  const afternoonSlots = slots.filter(slot => {
    const hour = parseISO(slot.start).getHours();
    return hour >= 12 && hour < 17;
  });
  
  const eveningSlots = slots.filter(slot => {
    const hour = parseISO(slot.start).getHours();
    return hour >= 17;
  });

  const renderSlots = (slotsToRender: Slot[]) => (
    <div className="slot-grid">
      {slotsToRender.map((slot) => {
        const isBooked = bookedSlots.includes(slot.start);
        const isSelected = selectedSlot?.start === slot.start;
        
        return (
          <div
            key={slot.start}
            className={`slot ${isBooked ? 'booked' : 'available'} ${isSelected ? 'selected' : ''}`}
            onClick={() => !isBooked && onSelectSlot(slot)}
          >
            {format(parseISO(slot.start), 'h:mm a')}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="card">
      <h3 className="card-title">Select Time</h3>
      
      {morningSlots.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            marginBottom: '0.75rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: 'var(--gray-500)'
          }}>
            <span>☀️</span> Morning
          </div>
          {renderSlots(morningSlots)}
        </div>
      )}
      
      {afternoonSlots.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            marginBottom: '0.75rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: 'var(--gray-500)'
          }}>
            <span>🌤️</span> Afternoon
          </div>
          {renderSlots(afternoonSlots)}
        </div>
      )}
      
      {eveningSlots.length > 0 && (
        <div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            marginBottom: '0.75rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: 'var(--gray-500)'
          }}>
            <span>🌙</span> Evening
          </div>
          {renderSlots(eveningSlots)}
        </div>
      )}
    </div>
  );
};

export default SlotGrid;
