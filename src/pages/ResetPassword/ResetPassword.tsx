import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FaLock, FaCheckCircle, FaEye, FaEyeSlash } from 'react-icons/fa';
import './ResetPassword.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) { setError('Токенът липсва. Провери линка от имейла.'); return; }
    if (password.length < 6) { setError('Паролата трябва да е поне 6 символа'); return; }
    if (password !== confirmPassword) { setError('Паролите не съвпадат'); return; }

    setStatus('loading');
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus('success');
        setTimeout(() => navigate('/login'), 2500);
      } else {
        setError(data.error || 'Неочаквана грешка. Опитай отново.');
        setStatus('idle');
      }
    } catch {
      setError('Грешка при връзка. Провери интернет свързаността си.');
      setStatus('idle');
    }
  };

  if (!token) {
    return (
      <div className="rp-page">
        <div className="rp-card">
          <div className="rp-icon error"><FaLock /></div>
          <h1>Невалиден линк</h1>
          <p className="rp-subtitle">
            Линкът за нулиране на парола изглежда невалиден или е изтекъл.
            <br />Моля, поискай нов.
          </p>
          <button className="rp-btn-primary" onClick={() => navigate('/forgot-password')}>
            Поискай нов линк
          </button>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="rp-page">
        <div className="rp-card">
          <div className="rp-success-icon"><FaCheckCircle /></div>
          <h1>Паролата е сменена!</h1>
          <p className="rp-subtitle">Можеш да влезеш с новата си парола.</p>
          <p className="rp-redirect-hint">Пренасочване към вход...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rp-page">
      <div className="rp-card">
        <div className="rp-icon"><FaLock /></div>
        <h1>Нова парола</h1>
        <p className="rp-subtitle">Въведи новата си парола. Минимум 6 символа.</p>

        {error && <div className="rp-error">{error}</div>}

        <form onSubmit={handleSubmit} className="rp-form">
          <div className="rp-field">
            <label htmlFor="rp-pass"><FaLock /> Нова парола</label>
            <div className="rp-input-wrap">
              <input
                id="rp-pass"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={status === 'loading'}
                autoFocus
                required
              />
              <button
                type="button"
                className="rp-toggle-vis"
                onClick={() => setShowPass(v => !v)}
                tabIndex={-1}
              >
                {showPass ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="rp-field">
            <label htmlFor="rp-confirm"><FaLock /> Потвърди парола</label>
            <input
              id="rp-confirm"
              type={showPass ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={status === 'loading'}
              required
            />
          </div>

          {/* Strength indicator */}
          {password && (
            <div className="rp-strength">
              <div
                className="rp-strength-bar"
                data-strength={
                  password.length < 6 ? 'weak'
                  : password.length < 10 ? 'fair'
                  : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 'strong'
                  : 'good'
                }
              />
            </div>
          )}

          <button type="submit" className="rp-submit-btn" disabled={status === 'loading'}>
            {status === 'loading' ? 'Запазване...' : 'Запази новата парола'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
