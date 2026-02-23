import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaMusic, FaUser } from 'react-icons/fa';
import '../LoginForm/LoginForm.css';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    lastfmUsername: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.username || !formData.email || !formData.password || !formData.lastfmUsername) {
      setError('Моля, попълнете всички полета (включително Last.fm потребител)');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Паролите не съвпадат');
      return;
    }
    if (formData.password.length < 6) {
      setError('Паролата трябва да е поне 6 символа');
      return;
    }

    try {
      await register(
        formData.username,
        formData.email,
        formData.password,
        formData.lastfmUsername
      );
      navigate('/');
    } catch (error) {
      setError((error as Error).message || 'Неочаквана грешка при регистрация');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="auth-form register-form">
      <h2>Регистрация</h2>
      <form onSubmit={handleSubmit} className="form-container">
        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label htmlFor="username"><FaUser /> Потребителско име</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Your username"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="email"><FaEnvelope /> Имейл</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="example@email.com"
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

        <div className="form-group">
          <label htmlFor="confirmPassword"><FaLock /> Потвърди парола</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group lastfm-required">
          <label htmlFor="lastfmUsername"><FaMusic /> Last.fm потребител <span className="required">*</span></label>
          <input
            type="text"
            id="lastfmUsername"
            name="lastfmUsername"
            value={formData.lastfmUsername}
            onChange={handleChange}
            placeholder="leo1011001"
            required
            disabled={loading}
          />
          <small>Вашето Last.fm потребителско име за синхронизиране на музиката</small>
        </div>

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Регистриране...' : 'Регистрирай се'}
        </button>
      </form>

      <div className="form-footer">
        <p>Вече имате акаунт? <button onClick={onSwitchToLogin} className="link-btn">Влезте</button></p>
      </div>
    </div>
  );
};

export default RegisterForm;
