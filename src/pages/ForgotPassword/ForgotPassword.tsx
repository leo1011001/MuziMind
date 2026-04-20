import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEnvelope, FaArrowLeft, FaCheckCircle } from 'react-icons/fa';
import './ForgotPassword.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) { setError('Въведи имейл адреса си'); return; }

    setStatus('loading');
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // Always show "sent" regardless — prevents email enumeration
      setStatus('sent');
    } catch {
      setError('Грешка при връзка. Опитай по-късно.');
      setStatus('idle');
    }
  };

  if (status === 'sent') {
    return (
      <div className="fp-page">
        <div className="fp-card">
          <div className="fp-success-icon"><FaCheckCircle /></div>
          <h1>Провери пощата си</h1>
          <p className="fp-subtitle">
            Ако акаунт с имейл <strong>{email}</strong> съществува, ще получиш
            линк за нулиране на паролата. Линкът е валиден <strong>1 час</strong>.
          </p>
          <p className="fp-hint">Не виждаш имейл? Провери папка "Спам".</p>
          <button className="fp-back-btn" onClick={() => navigate('/login')}>
            <FaArrowLeft /> Обратно към вход
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fp-page">
      <div className="fp-card">
        <div className="fp-icon"><FaEnvelope /></div>
        <h1>Забравена парола</h1>
        <p className="fp-subtitle">
          Въведи имейла на акаунта си и ще ти изпратим линк за нулиране на паролата.
        </p>

        {error && <div className="fp-error">{error}</div>}

        <form onSubmit={handleSubmit} className="fp-form">
          <div className="fp-field">
            <label htmlFor="fp-email"><FaEnvelope /> Имейл адрес</label>
            <input
              id="fp-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              disabled={status === 'loading'}
              autoFocus
              required
            />
          </div>

          <button type="submit" className="fp-submit-btn" disabled={status === 'loading'}>
            {status === 'loading' ? 'Изпращане...' : 'Изпрати линк за нулиране'}
          </button>
        </form>

        <button className="fp-back-link" onClick={() => navigate('/login')}>
          <FaArrowLeft /> Обратно към вход
        </button>
      </div>
    </div>
  );
};

export default ForgotPassword;
