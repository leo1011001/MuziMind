import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaSave, FaArrowLeft, FaLastfm, FaCalendarAlt, FaMusic, FaCrown, FaHeadphones, FaCheckCircle, FaTimesCircle, FaEdit, FaShieldAlt } from 'react-icons/fa';
import './Profile.css';

interface ProfileData {
  username: string;
  email: string;
  lastfmUsername: string;
  role: string;
  createdAt: string;
  profile: {
    bio?: string;
    pronouns?: string;
    nationality?: string;
    gender?: string;
  };
  stats: {
    totalScrobbles?: number;
    totalArtists?: number;
  };
}

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Editable fields
  const [bio, setBio] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [nationality, setNationality] = useState('');
  const [gender, setGender] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    if (!user) return;
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/api/profile`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setBio(data.profile?.bio || '');
        setPronouns(data.profile?.pronouns || '');
        setNationality(data.profile?.nationality || '');
        setGender(data.profile?.gender || '');
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/api/profile`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio, pronouns, nationality, gender })
      });
      if (res.ok) {
        setMessage('success');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('error');
      }
    } catch (e) {
      setMessage('error');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="page-container profile-page">
        <p className="auth-prompt">Моля, влезте в системата за да видите профила си.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container profile-page">
        <p>Зареждане на профил...</p>
      </div>
    );
  }

  const joinDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('bg-BG', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <div className="page-container profile-page">
      <div className="profile-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <FaArrowLeft /> Назад
        </button>
        <h1><FaUser /> Моят профил</h1>
      </div>

      {/* User Info Card */}
      <div className="glass-card profile-info-card">
        <div className="profile-avatar">
          <div className="avatar-circle">
            {profile?.username?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="profile-identity">
            <h2>{profile?.username}</h2>
            {pronouns && <span className="profile-pronouns">{pronouns}</span>}
            <span className="profile-role">{profile?.role === 'admin' ? <><FaCrown /> Администратор</> : <><FaHeadphones /> Потребител</>}</span>
          </div>
        </div>

        <div className="profile-meta">
          <div className="meta-item">
            <FaLastfm /> <span>{profile?.lastfmUsername || 'Не е свързан'}</span>
          </div>
          <div className="meta-item">
            <FaCalendarAlt /> <span>Регистриран: {joinDate}</span>
          </div>
          <div className="meta-item">
            <FaMusic /> <span>{profile?.stats?.totalScrobbles?.toLocaleString() || 0} слушания</span>
          </div>
        </div>

        {(user?.role === 'admin' || profile?.role === 'admin') && (
          <button className="glass-button admin-panel-btn" onClick={() => navigate('/admin')}>
            <FaShieldAlt /> Админ панел
          </button>
        )}
      </div>

      {/* Edit Profile Form */}
      <div className="glass-card profile-edit-card">
        <h3><FaEdit /> Редактирай профила</h3>

        <div className="profile-form">
          <div className="form-group">
            <label>Биография</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Разкажи за себе си и музикалните си вкусове..."
              maxLength={500}
              rows={3}
            />
            <span className="char-count">{bio.length}/500</span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Местоимения</label>
              <input
                type="text"
                value={pronouns}
                onChange={(e) => setPronouns(e.target.value)}
                placeholder="напр. той/него, тя/нея"
                maxLength={50}
              />
            </div>
            <div className="form-group">
              <label>Пол</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">Не е посочен</option>
                <option value="male">Мъж</option>
                <option value="female">Жена</option>
                <option value="nonbinary">Небинарен</option>
                <option value="other">Друго</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Националност</label>
            <input
              type="text"
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              placeholder="напр. България"
              maxLength={100}
            />
          </div>

          {message && (
            <div className={`profile-message ${message === 'success' ? 'success' : 'error'}`}>
              {message === 'success' 
                ? <><FaCheckCircle /> Профилът е обновен успешно!</> 
                : <><FaTimesCircle /> Грешка при запазване</>}
            </div>
          )}

          <button className="glass-button save-btn" onClick={handleSave} disabled={saving}>
            <FaSave /> {saving ? 'Запазване...' : 'Запази промените'}
          </button>
        </div>
      </div>
    </div>
  );
}
