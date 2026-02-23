import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FaHome, FaChartBar, FaHandSparkles, FaInfoCircle, FaSignOutAlt, FaMusic, FaUser, FaBars, FaTimes } from 'react-icons/fa';
import './UIComponents.css';

export const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          <FaMusic /> MuziMind
        </Link>

        <button
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

        <div className={`nav-menu ${mobileMenuOpen ? 'active' : ''}`}>
          <Link to="/" className="nav-link">
            <FaHome /> Начало
          </Link>

          {user && (
            <>
              <Link to="/stats-expanded" className="nav-link">
                <FaChartBar /> Статистика
              </Link>

              <Link to="/recommendations-expanded" className="nav-link">
                <FaHandSparkles /> Препоръки
              </Link>

              <Link to="/profile" className="nav-link">
                <FaUser /> Профил
              </Link>
            </>
          )}

          <Link to="/about" className="nav-link">
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
            <Link to="/login" className="nav-link login-link">
              Вход
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
