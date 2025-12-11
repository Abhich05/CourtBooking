import React, { useEffect } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlayCircle, 
  Calendar, 
  LayoutDashboard, 
  Settings, 
  User, 
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  BookOpen,
  ChevronDown
} from 'lucide-react';
import LandingPage from './pages/LandingPage';
import BookingPage from './pages/BookingPage';
import MyBookingsPage from './pages/MyBookingsPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import { useAuthStore, useThemeStore } from './authStore';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ 
  children, 
  adminOnly = false 
}) => {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/booking" replace />;
  }
  
  return <>{children}</>;
};

// Layout with Navigation for authenticated pages
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  return (
    <div className={`app-layout ${isDarkMode ? 'dark-mode' : ''}`}>
      <nav className="main-nav">
        <div className="nav-container">
          <NavLink to="/" className="nav-brand">
            <PlayCircle size={28} />
            <span>CourtBook</span>
          </NavLink>

          <div className={`nav-links ${mobileMenuOpen ? 'open' : ''}`}>
            <NavLink to="/booking" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Calendar size={18} />
              <span>Book Court</span>
            </NavLink>
            
            {isAuthenticated && (
              <>
                <NavLink to="/my-bookings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <BookOpen size={18} />
                  <span>My Bookings</span>
                </NavLink>
                <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <LayoutDashboard size={18} />
                  <span>Dashboard</span>
                </NavLink>
              </>
            )}
            
            {isAuthenticated && user?.role === 'admin' && (
              <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Settings size={18} />
                <span>Admin</span>
              </NavLink>
            )}
          </div>

          <div className="nav-actions">
            <button 
              className="theme-toggle" 
              onClick={toggleDarkMode}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {isAuthenticated ? (
              <div className="user-menu-wrapper">
                <button 
                  className="user-menu-btn"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <div className="user-avatar">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="user-name">{user?.name?.split(' ')[0]}</span>
                  <ChevronDown size={16} className={userMenuOpen ? 'rotated' : ''} />
                </button>
                
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div 
                      className="user-dropdown"
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="dropdown-header">
                        <div className="dropdown-avatar">
                          {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="dropdown-info">
                          <span className="dropdown-name">{user?.name}</span>
                          <span className="dropdown-email">{user?.email}</span>
                        </div>
                      </div>
                      <div className="dropdown-divider" />
                      <NavLink to="/profile" className="dropdown-item" onClick={() => setUserMenuOpen(false)}>
                        <User size={16} />
                        <span>Profile</span>
                      </NavLink>
                      <NavLink to="/dashboard" className="dropdown-item" onClick={() => setUserMenuOpen(false)}>
                        <LayoutDashboard size={16} />
                        <span>Dashboard</span>
                      </NavLink>
                      <div className="dropdown-divider" />
                      <button 
                        onClick={() => { logout(); setUserMenuOpen(false); }} 
                        className="dropdown-item logout"
                      >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="auth-buttons">
                <NavLink to="/login" className="btn-signin">
                  Sign In
                </NavLink>
                <NavLink to="/register" className="btn-getstarted">
                  Get Started
                </NavLink>
              </div>
            )}

            <button 
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const { checkAuth } = useAuthStore();
  const { isDarkMode } = useThemeStore();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [checkAuth, isDarkMode]);

  // Pages without navigation (landing, auth pages)
  const noNavRoutes = ['/', '/login', '/register'];
  const showNav = !noNavRoutes.includes(location.pathname);

  return (
    <AnimatePresence mode="wait">
      {showNav ? (
        <AppLayout>
          <Routes location={location} key={location.pathname}>
            <Route path="/booking" element={<BookingPage />} />
            <Route 
              path="/my-bookings" 
              element={
                <ProtectedRoute>
                  <MyBookingsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/*" 
              element={
                <ProtectedRoute adminOnly>
                  <AdminPage />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/booking" replace />} />
          </Routes>
        </AppLayout>
      ) : (
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      )}
    </AnimatePresence>
  );
};

export default App;
