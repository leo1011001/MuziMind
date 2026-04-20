import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaCheckCircle, FaRedo } from 'react-icons/fa';
import './VerifyEmail.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const emailFromUrl = searchParams.get('email') || '';
  const codeFromUrl = searchParams.get('code') || '';

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [email, setEmail] = useState(emailFromUrl);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-fill code from URL and submit immediately
  useEffect(() => {
    if (codeFromUrl.length === 6) {
      const arr = codeFromUrl.split('');
      setDigits(arr);
      // Small delay so the UI renders the filled code before submitting
      const t = setTimeout(() => submitCode(codeFromUrl, emailFromUrl), 400);
      return () => clearTimeout(t);
    }
  }, []);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const updated = [...digits];

    if (value.length > 1) {
      // Handle paste: spread digits across boxes
      const pasted = value.replace(/\D/g, '').slice(0, 6);
      const newDigits = [...digits];
      pasted.split('').forEach((d, i) => { if (index + i < 6) newDigits[index + i] = d; });
      setDigits(newDigits);
      const nextFocus = Math.min(index + pasted.length, 5);
      inputRefs.current[nextFocus]?.focus();
      if (newDigits.every(d => d !== '')) submitCode(newDigits.join(''), email);
      return;
    }

    updated[index] = value;
    setDigits(updated);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (updated.every(d => d !== '')) submitCode(updated.join(''), email);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const submitCode = async (code: string, emailAddr: string) => {
    if (!emailAddr) { setMessage('Имейл адресът липсва. Моля, провери линка.'); setStatus('error'); return; }
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailAddr, code }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus('success');
        setMessage(data.message || 'Имейлът е верифициран успешно!');
        setTimeout(() => navigate('/login'), 2500);
      } else {
        setStatus('error');
        setMessage(data.error || 'Невалиден код. Опитай отново.');
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setStatus('error');
      setMessage('Грешка при връзка. Провери интернет свързаността си.');
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMessage(data.message || (res.ok ? 'Нов код е изпратен!' : data.error));
      if (res.ok) setResendCooldown(60);
    } catch {
      setMessage('Не можахме да изпратим нов код. Опитай по-късно.');
    }
  };

  if (status === 'success') {
    return (
      <div className="verify-page">
        <div className="verify-card">
          <div className="verify-success-icon"><FaCheckCircle /></div>
          <h1>Верифициран!</h1>
          <p>{message}</p>
          <p className="verify-redirect-hint">Пренасочване към вход...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="verify-page">
      <div className="verify-card">
        <div className="verify-icon"><FaEnvelope /></div>

        <h1>Потвърди имейла си</h1>
        <p className="verify-subtitle">
          Изпратихме 6-цифрен код на{' '}
          {email ? <strong>{email}</strong> : 'твоя имейл адрес'}.
          <br />Въведи го по-долу.
        </p>

        {message && (
          <div className={`verify-message ${status === 'error' ? 'error' : 'info'}`}>
            {message}
          </div>
        )}

        {/* 6 digit boxes */}
        <div className="verify-digits">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el; }}
              className={`verify-digit ${status === 'loading' ? 'loading' : ''} ${status === 'error' ? 'shake' : ''}`}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={d}
              onChange={e => handleDigitChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onFocus={e => e.target.select()}
              disabled={status === 'loading' || status === 'success'}
              autoFocus={i === 0 && !codeFromUrl}
            />
          ))}
        </div>

        {status === 'loading' && <p className="verify-loading">Проверяване...</p>}

        <div className="verify-resend">
          <span>Не получи код?</span>
          <button
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="verify-resend-btn"
          >
            <FaRedo />
            {resendCooldown > 0 ? ` Изпрати отново (${resendCooldown}s)` : ' Изпрати отново'}
          </button>
        </div>

        <button className="verify-back-btn" onClick={() => navigate('/login')}>
          ← Обратно към вход
        </button>
      </div>
    </div>
  );
};

export default VerifyEmail;
