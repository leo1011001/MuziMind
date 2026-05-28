import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaClock, FaExclamationCircle, FaBan } from 'react-icons/fa';
import './LoginForm.css';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');
  const [unverifiedEmail, setUnverifiedEmail] = useState<string>('');
  const [isSuspended, setIsSuspended] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSuspended(false);

    if (!formData.email || !formData.password) {
      setError('Моля, попълнете всички полета');
      return;
    }

    try {
      await login(formData.email, formData.password);
      navigate('/');
    } catch (err: any) {
      const msg = err?.message || 'Неочаквана грешка при вход';
      // Server sends code:'EMAIL_NOT_VERIFIED' — parse from message or direct prop
      if (err?.code === 'EMAIL_NOT_VERIFIED' || msg.includes('верифициран')) {
        setUnverifiedEmail(formData.email);
      }
      if (err?.code === 'ACCOUNT_SUSPENDED') {
        setIsSuspended(true);
      }
      setError(msg);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="auth-form">
      <h2>Вход</h2>
      <form onSubmit={handleSubmit} className="form-container">
        {error && (
          isSuspended ? (
            <div className="suspended-message">
              <FaBan className="suspended-message-icon" />
              <h3>Акаунтът е спрян</h3>
              <p>{error}</p>
              <p className="suspended-hint">Свържи се с администратор за повече информация.</p>
            </div>
          ) : unverifiedEmail ? (
            <div className="approval-denied-message">
              <FaExclamationCircle className="approval-denied-icon" style={{ color: '#a78bfa' }} />
              <h3>Имейлът не е верифициран</h3>
              <p>{error}</p>
              <button
                className="submit-btn"
                style={{ marginTop: '0.75rem', fontSize: '0.85rem', padding: '0.6rem 1rem' }}
                onClick={() => navigate(`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`)}
              >
                Въведи верификационен код
              </button>
            </div>
          ) : error.includes('одобрен') ? (
            <div className="approval-denied-message">
              <FaClock className="approval-denied-icon" />
              <h3>Чакащо одобрение</h3>
              <p>{error}</p>
              <p className="approval-hint">Администраторът ще прегледа заявката ти скоро. Опитай да влезеш отново след малко.</p>
            </div>
          ) : (
            <div className="error-message">{error}</div>
          )
        )}

        <div className="form-group">
          <label htmlFor="email"><FaEnvelope /> Имейл</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="example@gmail.com"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password"><FaLock /> Парола</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            required
            disabled={loading}
          />
        </div>

        <div className="forgot-password-row">
          <button
            type="button"
            className="link-btn forgot-password-link"
            onClick={() => navigate('/forgot-password')}
          >
            Забравена парола?
          </button>
        </div>

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Влизане...' : 'Влез'}
        </button>
      </form>

      <div className="form-footer">
        <p>Нямате акаунт? <button onClick={onSwitchToRegister} className="link-btn">Регистрирайте се</button></p>
      </div>
    </div>
  );
};

export default LoginForm;