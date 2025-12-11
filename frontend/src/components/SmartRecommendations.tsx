import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSmartRecommendations, Recommendation } from '../api';
import { useAuthStore } from '../authStore';
import { format, addDays } from 'date-fns';

interface SmartRecommendationsProps {
  date: Date | null;
  onSelectTime?: (hour: number, date: string) => void;
  onSelectCourt?: (courtId: number) => void;
  onSelectCoach?: (coachId: number) => void;
}

const SmartRecommendations: React.FC<SmartRecommendationsProps> = ({
  date,
  onSelectTime,
  onSelectCourt,
  onSelectCoach
}) => {
  const { user } = useAuthStore();
  const targetDate = date ? format(date, 'yyyy-MM-dd') : format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['recommendations', targetDate, user?.email],
    queryFn: () => getSmartRecommendations(targetDate, user?.email),
    staleTime: 60000, // 1 minute
  });

  const handleAction = (rec: Recommendation) => {
    if (!rec.action) return;

    switch (rec.action.type) {
      case 'book_time':
        if (rec.action.hour !== undefined && rec.action.date && onSelectTime) {
          onSelectTime(rec.action.hour, rec.action.date);
        }
        break;
      case 'book_court':
        if (rec.action.court_id && onSelectCourt) {
          onSelectCourt(rec.action.court_id);
        }
        break;
      case 'add_coach':
        if (rec.action.coach_id && onSelectCoach) {
          onSelectCoach(rec.action.coach_id);
        }
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="recommendations-skeleton">
        {[1, 2, 3].map(i => (
          <div key={i} className="recommendation-skeleton-item" />
        ))}
      </div>
    );
  }

  if (!data?.recommendations.length) {
    return null;
  }

  return (
    <div className="smart-recommendations">
      <div className="recommendations-header">
        <div className="header-icon">✨</div>
        <div className="header-content">
          <h3>Smart Recommendations</h3>
          <p>AI-powered suggestions based on your preferences</p>
        </div>
      </div>

      <div className="recommendations-list">
        {data.recommendations.slice(0, 4).map((rec, index) => (
          <div 
            key={index} 
            className={`recommendation-card priority-${rec.priority}`}
            onClick={() => handleAction(rec)}
            role={rec.action ? 'button' : undefined}
            tabIndex={rec.action ? 0 : undefined}
          >
            <div className="recommendation-icon">{rec.icon}</div>
            <div className="recommendation-content">
              <h4>{rec.title}</h4>
              <p>{rec.description}</p>
            </div>
            {rec.action && (
              <div className="recommendation-action">
                <span className="action-arrow">→</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {data.recommendations.length > 4 && (
        <button className="view-more-btn">
          View {data.recommendations.length - 4} more suggestions
        </button>
      )}
    </div>
  );
};

export default SmartRecommendations;
