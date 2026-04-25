import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { FaHome, FaChartBar, FaHandSparkles, FaInfoCircle, FaSignOutAlt, FaUser, FaBars, FaTimes, FaShieldAlt, FaSun, FaMoon } from 'react-icons/fa';
import '../UI.css';

export const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path) || location.pathname === path;
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <img src="/logo.png" alt="MuziMind" className="nav-logo-img" />
        </Link>

        {/* Always-visible right side: theme toggle + hamburger */}
        <div className="nav-actions">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Светла тема' : 'Тъмна тема'}
          >
            {theme === 'dark' ? <FaSun /> : <FaMoon />}
          </button>

          <button
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        <div className={`nav-menu ${mobileMenuOpen ? 'active' : ''}`}>
          <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
            <FaHome /> Начало
          </Link>

          {user && (
            <>
              <Link to="/stats-expanded" className={`nav-link ${isActive('/stats') ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                <FaChartBar /> Статистика
              </Link>

              <Link to="/recommendations-expanded" className={`nav-link ${isActive('/recommendations') ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                <FaHandSparkles /> Препоръки
              </Link>

              <Link to="/profile" className={`nav-link ${isActive('/profile') ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                <FaUser /> Профил
              </Link>

              {user.role === 'admin' && (
                <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                  <FaShieldAlt /> Админ
                </Link>
              )}
            </>
          )}

          <Link to="/about" className={`nav-link ${isActive('/about') ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
            <FaInfoCircle /> За нас
          </Link>

          {user ? (
            <div className="nav-user-section">
              <span className="nav-username">{user.username}</span>
              <button className="nav-logout" onClick={handleLogout}>
                <FaSignOutAlt /> Изход
              </button>
            </div>
          ) : (
            <Link to="/login" className={`nav-link login-link ${isActive('/login') ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
              Вход
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
