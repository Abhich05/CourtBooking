import React from 'react';
import { Coach } from '../api';

interface CoachSelectorProps {
  coaches: Coach[];
  selectedCoach: Coach | null;
  onSelectCoach: (coach: Coach | null) => void;
}

const CoachSelector: React.FC<CoachSelectorProps> = ({
  coaches,
  selectedCoach,
  onSelectCoach,
}) => {
  return (
    <div className="card">
      <h3 className="card-title">Add Coach (Optional)</h3>
      
      <div
        className={`coach-card ${!selectedCoach ? 'selected' : ''}`}
        onClick={() => onSelectCoach(null)}
        style={{ marginBottom: '1rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '1rem' }}
      >
        <div style={{
          width: '48px',
          height: '48px',
          background: 'var(--gray-200)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem'
        }}>👤</div>
        <div>
          <div className="coach-name">No Coach</div>
          <div style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
            Self-practice session
          </div>
        </div>
      </div>
      
      <div className="grid grid-3">
        {coaches.map((coach) => (
          <div
            key={coach.id}
            className={`coach-card ${selectedCoach?.id === coach.id ? 'selected' : ''}`}
            onClick={() => onSelectCoach(coach)}
          >
            <div className="coach-avatar">
              {coach.name.charAt(0).toUpperCase()}
            </div>
            <div className="coach-name">{coach.name}</div>
            <div className="coach-specialty">Professional Coach</div>
            <div className="coach-rate">${coach.hourly_rate}/hr</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CoachSelector;
