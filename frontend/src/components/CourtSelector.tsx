import React from 'react';
import { Court } from '../api';

interface CourtSelectorProps {
  courts: Court[];
  selectedCourt: Court | null;
  onSelectCourt: (court: Court) => void;
  availableCourtIds?: number[];
}

const CourtSelector: React.FC<CourtSelectorProps> = ({ 
  courts, 
  selectedCourt, 
  onSelectCourt,
  availableCourtIds 
}) => {
  return (
    <div className="card">
      <h3 className="card-title">Select Court</h3>
      <div className="grid grid-2">
        {courts.map((court) => {
          const isAvailable = !availableCourtIds || availableCourtIds.includes(court.id);
          const isSelected = selectedCourt?.id === court.id;
          
          return (
            <div
              key={court.id}
              className={`court-card ${isSelected ? 'selected' : ''}`}
              onClick={() => isAvailable && onSelectCourt(court)}
              style={{
                opacity: isAvailable ? 1 : 0.5,
                cursor: isAvailable ? 'pointer' : 'not-allowed',
              }}
            >
              <div className="court-icon">
                {court.type === 'indoor' ? '🏠' : '🌳'}
              </div>
              <div className="court-name">{court.name}</div>
              <div className="court-type">
                {court.type === 'indoor' ? 'Indoor Court' : 'Outdoor Court'}
              </div>
              <div className="court-price">
                ${court.base_price}<span>/hr</span>
              </div>
              {!isAvailable && (
                <div style={{ 
                  color: 'var(--danger)', 
                  fontSize: '0.8125rem', 
                  marginTop: '0.75rem',
                  fontWeight: '600'
                }}>
                  ✕ Not available
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CourtSelector;
