import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAnalyticsDashboard, getUserAnalytics, AnalyticsDashboard } from '../api';
import { useAuthStore } from '../authStore';

const DashboardPage: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  
  const { data: analytics, isLoading } = useQuery<AnalyticsDashboard>({
    queryKey: ['analytics'],
    queryFn: getAnalyticsDashboard,
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: userAnalytics } = useQuery({
    queryKey: ['userAnalytics', user?.id],
    queryFn: () => getUserAnalytics(user!.id),
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner-large"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>📊 Analytics Dashboard</h1>
          <p>Real-time insights and performance metrics</p>
        </div>
        <div className="header-actions">
          <select className="time-filter">
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button className="export-btn">
            📥 Export
          </button>
        </div>
      </div>

      {/* User Loyalty Card (if authenticated) */}
      {isAuthenticated && userAnalytics && (
        <div className="loyalty-banner">
          <div className="loyalty-info">
            <div className="loyalty-badge">
              {userAnalytics.loyalty.level === 'Gold' && '🥇'}
              {userAnalytics.loyalty.level === 'Silver' && '🥈'}
              {userAnalytics.loyalty.level === 'Bronze+' && '🥉'}
              {userAnalytics.loyalty.level === 'Bronze' && '🏅'}
              <span>{userAnalytics.loyalty.level} Member</span>
            </div>
            <div className="loyalty-stats">
              <div className="stat-item">
                <span className="stat-label">Loyalty Points</span>
                <span className="stat-value">{userAnalytics.loyalty.points}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Bookings</span>
                <span className="stat-value">{userAnalytics.stats.total_bookings}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Hours Played</span>
                <span className="stat-value">{userAnalytics.stats.total_hours_played}h</span>
              </div>
            </div>
          </div>
          <div className="loyalty-progress">
            <div className="progress-label">
              Next level: {userAnalytics.loyalty.next_level_at} pts
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${Math.min(100, (userAnalytics.loyalty.points / userAnalytics.loyalty.next_level_at) * 100)}%` 
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card revenue">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <span className="stat-label">Total Revenue</span>
            <span className="stat-value">{formatCurrency(analytics?.summary.total_revenue || 0)}</span>
            <span className="stat-change positive">
              +{formatCurrency(analytics?.summary.weekly_revenue || 0)} this week
            </span>
          </div>
        </div>

        <div className="stat-card bookings">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <span className="stat-label">Total Bookings</span>
            <span className="stat-value">{analytics?.summary.total_bookings || 0}</span>
            <span className="stat-change positive">
              +{analytics?.summary.weekly_bookings || 0} this week
            </span>
          </div>
        </div>

        <div className="stat-card users">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <span className="stat-label">Total Users</span>
            <span className="stat-value">{analytics?.summary.total_users || 0}</span>
            <span className="stat-change positive">
              +{analytics?.summary.new_users_week || 0} new this week
            </span>
          </div>
        </div>

        <div className="stat-card waitlist">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <span className="stat-label">Waitlist</span>
            <span className="stat-value">{analytics?.summary.pending_waitlist || 0}</span>
            <span className="stat-sublabel">Pending requests</span>
          </div>
        </div>
      </div>

      {/* Insights Section */}
      {analytics?.insights && analytics.insights.length > 0 && (
        <div className="insights-section">
          <h2>🧠 AI-Powered Insights</h2>
          <div className="insights-grid">
            {analytics.insights.map((insight, index) => (
              <div key={index} className={`insight-card ${insight.priority}`}>
                <div className="insight-icon">{insight.icon}</div>
                <div className="insight-content">
                  <h4>{insight.title}</h4>
                  <p>{insight.message}</p>
                </div>
                <div className={`priority-badge ${insight.priority}`}>
                  {insight.priority}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="charts-section">
        {/* Revenue Trend Chart */}
        <div className="chart-card">
          <h3>📈 Revenue Trend (Last 7 Days)</h3>
          <div className="chart-container">
            <div className="simple-chart">
              {analytics?.revenue_trend.map((day, index) => {
                const maxRevenue = Math.max(...(analytics?.revenue_trend.map(d => d.revenue) || [1]));
                const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={index} className="chart-bar-container">
                    <div 
                      className="chart-bar"
                      style={{ height: `${Math.max(5, height)}%` }}
                      title={`${day.date}: ${formatCurrency(day.revenue)}`}
                    >
                      <span className="bar-value">{formatCurrency(day.revenue)}</span>
                    </div>
                    <span className="bar-label">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Peak Hours Chart */}
        <div className="chart-card">
          <h3>⏰ Peak Booking Hours</h3>
          <div className="chart-container">
            <div className="horizontal-bars">
              {analytics?.peak_hours.map((hour, index) => {
                const maxCount = Math.max(...(analytics?.peak_hours.map(h => h.count) || [1]));
                const width = (hour.count / maxCount) * 100;
                return (
                  <div key={index} className="h-bar-row">
                    <span className="h-bar-label">{formatHour(hour.hour)}</span>
                    <div className="h-bar-track">
                      <div 
                        className="h-bar-fill"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <span className="h-bar-value">{hour.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Court Utilization & Coach Performance */}
      <div className="metrics-section">
        {/* Court Utilization */}
        <div className="metric-card">
          <h3>🏸 Court Utilization</h3>
          <div className="metric-list">
            {analytics?.court_utilization.map((court) => (
              <div key={court.id} className="metric-item">
                <div className="metric-info">
                  <span className="metric-name">{court.name}</span>
                  <span className="metric-type">
                    {court.type === 'indoor' ? '🏠 Indoor' : '☀️ Outdoor'}
                  </span>
                </div>
                <div className="metric-progress">
                  <div className="progress-track">
                    <div 
                      className="progress-bar-fill"
                      style={{ width: `${court.utilization_percent}%` }}
                    />
                  </div>
                  <span className="metric-value">{court.utilization_percent.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coach Performance */}
        <div className="metric-card">
          <h3>👨‍🏫 Coach Performance</h3>
          <div className="metric-list">
            {analytics?.coach_performance.map((coach) => (
              <div key={coach.id} className="metric-item coach-item">
                <div className="coach-avatar">
                  {coach.name.charAt(0)}
                </div>
                <div className="metric-info">
                  <span className="metric-name">{coach.name}</span>
                  <span className="metric-rate">${coach.hourly_rate}/hr</span>
                </div>
                <div className="sessions-badge">
                  {coach.sessions} sessions
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Equipment */}
        <div className="metric-card">
          <h3>🎾 Equipment Popularity</h3>
          <div className="metric-list">
            {analytics?.equipment_popularity.map((eq, index) => (
              <div key={eq.sku} className="metric-item equipment-item">
                <span className="rank-badge">#{index + 1}</span>
                <span className="metric-name">{eq.sku}</span>
                <span className="rentals-badge">{eq.rentals} rentals</span>
              </div>
            ))}
            {(!analytics?.equipment_popularity || analytics.equipment_popularity.length === 0) && (
              <div className="empty-state-small">
                No equipment rental data yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
