import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Users,
  Clock,
  Award,
  BarChart3,
  Activity,
  Target,
  Trophy,
  Zap,
  ChevronRight,
  ArrowUpRight,
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  Timer,
  Dumbbell,
  UserCheck,
  Sparkles,
  Download,
  Filter,
  Heart,
  Star,
  MapPin,
  CreditCard,
  CalendarCheck,
  Gift,
  Crown,
} from 'lucide-react';
import { getAnalyticsDashboard, getUserAnalytics, AnalyticsDashboard } from '../api';
import { useAuthStore } from '../authStore';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const }
  }
};

const DashboardPage: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  
  // Only fetch admin analytics if user is admin
  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsDashboard>({
    queryKey: ['analytics'],
    queryFn: getAnalyticsDashboard,
    refetchInterval: 60000,
    enabled: isAdmin, // Only fetch for admins
  });

  const { data: userAnalytics, isLoading: userLoading } = useQuery({
    queryKey: ['userAnalytics', user?.id],
    queryFn: () => getUserAnalytics(user!.id),
    enabled: !!user?.id,
  });

  const isLoading = isAdmin ? analyticsLoading : userLoading;

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <motion.div
          className="loading-content"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            className="loading-icon"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          >
            <Activity size={40} />
          </motion.div>
          <p>Loading your dashboard...</p>
        </motion.div>
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

  const getLoyaltyIcon = (level: string) => {
    switch (level) {
      case 'Gold': return <Crown className="loyalty-icon gold" size={24} />;
      case 'Silver': return <Award className="loyalty-icon silver" size={24} />;
      case 'Bronze+': return <Target className="loyalty-icon bronze-plus" size={24} />;
      default: return <Star className="loyalty-icon bronze" size={24} />;
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'revenue': return <TrendingUp size={20} />;
      case 'booking': return <Calendar size={20} />;
      case 'user': return <Users size={20} />;
      case 'alert': return <AlertCircle size={20} />;
      default: return <Lightbulb size={20} />;
    }
  };

  // =============================================
  // USER DASHBOARD (Non-Admin)
  // =============================================
  if (!isAdmin) {
    return (
      <motion.div 
        className="dashboard-page user-dashboard"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* User Header */}
        <motion.div className="dashboard-header" variants={itemVariants}>
          <div className="header-content">
            <div className="header-title-section">
              <div className="header-icon user-icon">
                <Heart size={28} />
              </div>
              <div>
                <h1>Welcome back, {user?.name?.split(' ')[0]}!</h1>
                <p>Your personal badminton journey at a glance</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Loyalty Card */}
        {userAnalytics && (
          <motion.div className="loyalty-banner user-loyalty" variants={itemVariants}>
            <div className="loyalty-glass-bg" />
            <div className="loyalty-content">
              <div className="loyalty-info">
                <div className="loyalty-badge">
                  {getLoyaltyIcon(userAnalytics.loyalty.level)}
                  <div className="loyalty-text">
                    <span className="loyalty-level">{userAnalytics.loyalty.level} Member</span>
                    <span className="loyalty-welcome">Member since {userAnalytics.user.member_since ? new Date(userAnalytics.user.member_since).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently'}</span>
                  </div>
                </div>
                <div className="loyalty-stats">
                  <div className="loyalty-stat-item">
                    <Sparkles size={18} className="stat-icon" />
                    <div className="stat-content">
                      <span className="stat-value">{userAnalytics.loyalty.points}</span>
                      <span className="stat-label">Points</span>
                    </div>
                  </div>
                  <div className="loyalty-stat-divider" />
                  <div className="loyalty-stat-item">
                    <Gift size={18} className="stat-icon" />
                    <div className="stat-content">
                      <span className="stat-value">{Math.max(0, userAnalytics.loyalty.next_level_at - userAnalytics.loyalty.points)}</span>
                      <span className="stat-label">To Next Level</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="loyalty-progress-section">
                <div className="progress-header">
                  <span>Progress to {userAnalytics.loyalty.level === 'Gold' ? 'Platinum' : userAnalytics.loyalty.level === 'Silver' ? 'Gold' : userAnalytics.loyalty.level === 'Bronze+' ? 'Silver' : 'Bronze+'}</span>
                  <span className="progress-points">{userAnalytics.loyalty.points} / {userAnalytics.loyalty.next_level_at} pts</span>
                </div>
                <div className="progress-bar">
                  <motion.div 
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${Math.min(100, (userAnalytics.loyalty.points / userAnalytics.loyalty.next_level_at) * 100)}%` 
                    }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* User Stats Grid */}
        {userAnalytics && (
          <div className="stats-grid user-stats">
            <motion.div className="stat-card bookings" variants={itemVariants}>
              <div className="stat-card-bg" />
              <div className="stat-header">
                <div className="stat-icon-wrapper bookings">
                  <CalendarCheck size={24} />
                </div>
              </div>
              <div className="stat-content">
                <span className="stat-label">Total Bookings</span>
                <span className="stat-value">{userAnalytics.stats.total_bookings}</span>
                <span className="stat-sublabel">Courts reserved</span>
              </div>
            </motion.div>

            <motion.div className="stat-card hours" variants={itemVariants}>
              <div className="stat-card-bg" />
              <div className="stat-header">
                <div className="stat-icon-wrapper hours">
                  <Timer size={24} />
                </div>
              </div>
              <div className="stat-content">
                <span className="stat-label">Hours Played</span>
                <span className="stat-value">{userAnalytics.stats.total_hours_played}</span>
                <span className="stat-sublabel">On the court</span>
              </div>
            </motion.div>

            <motion.div className="stat-card spent" variants={itemVariants}>
              <div className="stat-card-bg" />
              <div className="stat-header">
                <div className="stat-icon-wrapper spent">
                  <CreditCard size={24} />
                </div>
              </div>
              <div className="stat-content">
                <span className="stat-label">Total Spent</span>
                <span className="stat-value">{formatCurrency(userAnalytics.stats.total_spent)}</span>
                <span className="stat-sublabel">Lifetime</span>
              </div>
            </motion.div>

            <motion.div className="stat-card favorite" variants={itemVariants}>
              <div className="stat-card-bg" />
              <div className="stat-header">
                <div className="stat-icon-wrapper favorite">
                  <MapPin size={24} />
                </div>
              </div>
              <div className="stat-content">
                <span className="stat-label">Favorite Court</span>
                <span className="stat-value">{userAnalytics.stats.favorite_court?.name || 'None yet'}</span>
                <span className="stat-sublabel">{userAnalytics.stats.favorite_court ? `${userAnalytics.stats.favorite_court.visits} visits` : 'Book your first!'}</span>
              </div>
            </motion.div>
          </div>
        )}

        {/* Quick Actions */}
        <motion.div className="quick-actions-section" variants={itemVariants}>
          <div className="section-header">
            <div className="section-title">
              <Zap size={22} />
              <h2>Quick Actions</h2>
            </div>
          </div>
          <div className="quick-actions-grid">
            <Link to="/booking" className="quick-action-card">
              <motion.div 
                className="quick-action-content"
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="quick-action-icon booking">
                  <Calendar size={28} />
                </div>
                <div className="quick-action-text">
                  <h3>Book a Court</h3>
                  <p>Reserve your next session</p>
                </div>
                <ChevronRight size={20} className="quick-action-arrow" />
              </motion.div>
            </Link>
            
            <Link to="/my-bookings" className="quick-action-card">
              <motion.div 
                className="quick-action-content"
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="quick-action-icon bookings">
                  <CalendarCheck size={28} />
                </div>
                <div className="quick-action-text">
                  <h3>My Bookings</h3>
                  <p>View upcoming sessions</p>
                </div>
                <ChevronRight size={20} className="quick-action-arrow" />
              </motion.div>
            </Link>
          </div>
        </motion.div>

        {/* Loyalty Benefits */}
        <motion.div className="benefits-section" variants={itemVariants}>
          <div className="section-header">
            <div className="section-title">
              <Gift size={22} />
              <h2>Your Benefits</h2>
            </div>
          </div>
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">
                <Trophy size={24} />
              </div>
              <div className="benefit-content">
                <h4>Loyalty Points</h4>
                <p>Earn points with every booking</p>
              </div>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">
                <Star size={24} />
              </div>
              <div className="benefit-content">
                <h4>Priority Booking</h4>
                <p>{userAnalytics?.loyalty.level === 'Gold' ? 'Unlocked!' : `Unlock at Gold level`}</p>
              </div>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">
                <Zap size={24} />
              </div>
              <div className="benefit-content">
                <h4>Special Discounts</h4>
                <p>{userAnalytics?.loyalty.level === 'Silver' || userAnalytics?.loyalty.level === 'Gold' ? '10% off equipment' : 'Unlock at Silver level'}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // =============================================
  // ADMIN DASHBOARD
  // =============================================
  return (
    <motion.div 
      className="dashboard-page admin-dashboard"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Admin Header */}
      <motion.div className="dashboard-header" variants={itemVariants}>
        <div className="header-content">
          <div className="header-title-section">
            <div className="header-icon">
              <BarChart3 size={28} />
            </div>
            <div>
              <h1>Admin Dashboard</h1>
              <p>Business analytics and performance metrics</p>
            </div>
          </div>
        </div>
        <div className="header-actions">
          <motion.select 
            className="time-filter"
            whileHover={{ scale: 1.02 }}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </motion.select>
          <motion.button 
            className="export-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Download size={18} />
            Export
          </motion.button>
        </div>
      </motion.div>

      {/* Admin Badge */}
      <motion.div className="admin-badge-banner" variants={itemVariants}>
        <div className="admin-badge-content">
          <Crown size={20} />
          <span>Administrator Access</span>
        </div>
      </motion.div>

      {/* Summary Cards - Admin Only */}
      <div className="stats-grid">
        <motion.div className="stat-card revenue" variants={itemVariants}>
          <div className="stat-card-bg" />
          <div className="stat-header">
            <div className="stat-icon-wrapper revenue">
              <DollarSign size={24} />
            </div>
            <div className="stat-trend positive">
              <ArrowUpRight size={16} />
              <span>12%</span>
            </div>
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Revenue</span>
            <span className="stat-value">{formatCurrency(analytics?.summary.total_revenue || 0)}</span>
            <span className="stat-change">
              +{formatCurrency(analytics?.summary.weekly_revenue || 0)} this week
            </span>
          </div>
        </motion.div>

        <motion.div className="stat-card bookings" variants={itemVariants}>
          <div className="stat-card-bg" />
          <div className="stat-header">
            <div className="stat-icon-wrapper bookings">
              <Calendar size={24} />
            </div>
            <div className="stat-trend positive">
              <ArrowUpRight size={16} />
              <span>8%</span>
            </div>
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Bookings</span>
            <span className="stat-value">{analytics?.summary.total_bookings || 0}</span>
            <span className="stat-change">
              +{analytics?.summary.weekly_bookings || 0} this week
            </span>
          </div>
        </motion.div>

        <motion.div className="stat-card users" variants={itemVariants}>
          <div className="stat-card-bg" />
          <div className="stat-header">
            <div className="stat-icon-wrapper users">
              <Users size={24} />
            </div>
            <div className="stat-trend positive">
              <ArrowUpRight size={16} />
              <span>15%</span>
            </div>
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Users</span>
            <span className="stat-value">{analytics?.summary.total_users || 0}</span>
            <span className="stat-change">
              +{analytics?.summary.new_users_week || 0} new this week
            </span>
          </div>
        </motion.div>

        <motion.div className="stat-card waitlist" variants={itemVariants}>
          <div className="stat-card-bg" />
          <div className="stat-header">
            <div className="stat-icon-wrapper waitlist">
              <Clock size={24} />
            </div>
            {(analytics?.summary.pending_waitlist || 0) > 0 && (
              <div className="stat-badge">
                <Zap size={12} />
                Active
              </div>
            )}
          </div>
          <div className="stat-content">
            <span className="stat-label">Waitlist</span>
            <span className="stat-value">{analytics?.summary.pending_waitlist || 0}</span>
            <span className="stat-sublabel">Pending requests</span>
          </div>
        </motion.div>
      </div>

      {/* Insights Section */}
      {analytics?.insights && analytics.insights.length > 0 && (
        <motion.div className="insights-section" variants={itemVariants}>
          <div className="section-header">
            <div className="section-title">
              <Lightbulb size={22} />
              <h2>AI-Powered Insights</h2>
            </div>
            <motion.button 
              className="view-all-btn"
              whileHover={{ x: 4 }}
            >
              View All
              <ChevronRight size={18} />
            </motion.button>
          </div>
          <div className="insights-grid">
            {analytics.insights.map((insight, index) => (
              <motion.div 
                key={index} 
                className={`insight-card ${insight.priority}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
              >
                <div className={`insight-icon ${insight.priority}`}>
                  {getInsightIcon(insight.type)}
                </div>
                <div className="insight-content">
                  <h4>{insight.title}</h4>
                  <p>{insight.message}</p>
                </div>
                <div className={`priority-badge ${insight.priority}`}>
                  {insight.priority === 'high' && <AlertCircle size={12} />}
                  {insight.priority === 'medium' && <Zap size={12} />}
                  {insight.priority === 'low' && <CheckCircle2 size={12} />}
                  <span>{insight.priority}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Charts Section */}
      <div className="charts-section">
        {/* Revenue Trend Chart */}
        <motion.div className="chart-card" variants={itemVariants}>
          <div className="chart-header">
            <div className="chart-title">
              <TrendingUp size={20} />
              <h3>Revenue Trend</h3>
            </div>
            <span className="chart-period">Last 7 Days</span>
          </div>
          <div className="chart-container">
            <div className="bar-chart">
              {analytics?.revenue_trend.map((day, index) => {
                const maxRevenue = Math.max(...(analytics?.revenue_trend.map(d => d.revenue) || [1]));
                const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                return (
                  <motion.div 
                    key={index} 
                    className="chart-bar-container"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <motion.div 
                      className="chart-bar"
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(8, height)}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1, ease: "easeOut" }}
                      title={`${day.date}: ${formatCurrency(day.revenue)}`}
                    >
                      <span className="bar-value">{formatCurrency(day.revenue)}</span>
                    </motion.div>
                    <span className="bar-label">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Peak Hours Chart */}
        <motion.div className="chart-card" variants={itemVariants}>
          <div className="chart-header">
            <div className="chart-title">
              <Clock size={20} />
              <h3>Peak Booking Hours</h3>
            </div>
            <span className="chart-period">All Time</span>
          </div>
          <div className="chart-container">
            <div className="horizontal-bars">
              {analytics?.peak_hours.map((hour, index) => {
                const maxCount = Math.max(...(analytics?.peak_hours.map(h => h.count) || [1]));
                const width = (hour.count / maxCount) * 100;
                return (
                  <motion.div 
                    key={index} 
                    className="h-bar-row"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <span className="h-bar-label">{formatHour(hour.hour)}</span>
                    <div className="h-bar-track">
                      <motion.div 
                        className="h-bar-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${width}%` }}
                        transition={{ duration: 0.8, delay: index * 0.08, ease: "easeOut" }}
                      />
                    </div>
                    <span className="h-bar-value">{hour.count}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Metrics Section */}
      <div className="metrics-section">
        {/* Court Utilization */}
        <motion.div className="metric-card" variants={itemVariants}>
          <div className="metric-header">
            <div className="metric-title">
              <Target size={20} />
              <h3>Court Utilization</h3>
            </div>
            <motion.button className="metric-action" whileHover={{ scale: 1.1 }}>
              <Filter size={16} />
            </motion.button>
          </div>
          <div className="metric-list">
            {analytics?.court_utilization.map((court, index) => (
              <motion.div 
                key={court.id} 
                className="metric-item"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="metric-info">
                  <div className="metric-name-row">
                    <span className="metric-name">{court.name}</span>
                    <span className={`court-type-badge ${court.type}`}>
                      {court.type === 'indoor' ? '🏠 Indoor' : '☀️ Outdoor'}
                    </span>
                  </div>
                </div>
                <div className="metric-progress">
                  <div className="progress-track">
                    <motion.div 
                      className={`progress-bar-fill ${court.utilization_percent > 70 ? 'high' : court.utilization_percent > 40 ? 'medium' : 'low'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${court.utilization_percent}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1, ease: "easeOut" }}
                    />
                  </div>
                  <span className="metric-value">{court.utilization_percent.toFixed(0)}%</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Coach Performance */}
        <motion.div className="metric-card" variants={itemVariants}>
          <div className="metric-header">
            <div className="metric-title">
              <UserCheck size={20} />
              <h3>Coach Performance</h3>
            </div>
          </div>
          <div className="metric-list">
            {analytics?.coach_performance.map((coach, index) => (
              <motion.div 
                key={coach.id} 
                className="metric-item coach-item"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ x: 4 }}
              >
                <div className="coach-avatar">
                  <span>{coach.name.charAt(0)}</span>
                </div>
                <div className="metric-info">
                  <span className="metric-name">{coach.name}</span>
                  <span className="metric-rate">
                    <DollarSign size={14} />
                    {coach.hourly_rate}/hr
                  </span>
                </div>
                <div className="sessions-badge">
                  <Trophy size={14} />
                  <span>{coach.sessions} sessions</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Popular Equipment */}
        <motion.div className="metric-card" variants={itemVariants}>
          <div className="metric-header">
            <div className="metric-title">
              <Dumbbell size={20} />
              <h3>Equipment Popularity</h3>
            </div>
          </div>
          <div className="metric-list">
            {analytics?.equipment_popularity.map((eq, index) => (
              <motion.div 
                key={eq.sku} 
                className="metric-item equipment-item"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ x: 4 }}
              >
                <span className={`rank-badge rank-${index + 1}`}>
                  {index === 0 && <Trophy size={12} />}
                  #{index + 1}
                </span>
                <span className="metric-name">{eq.sku}</span>
                <span className="rentals-badge">
                  <Activity size={14} />
                  {eq.rentals} rentals
                </span>
              </motion.div>
            ))}
            {(!analytics?.equipment_popularity || analytics.equipment_popularity.length === 0) && (
              <div className="empty-state-small">
                <Dumbbell size={24} />
                <span>No equipment rental data yet</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default DashboardPage;
