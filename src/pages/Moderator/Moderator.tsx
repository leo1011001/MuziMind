import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authFetch } from '../../utils/authFetch';
import { useNavigate } from 'react-router-dom';
import {
  FaUserShield, FaCheck, FaTimes, FaArrowLeft, FaCheckCircle,
  FaTimesCircle, FaClock, FaUsers, FaUserClock, FaBan, FaUnlock,
  FaStickyNote, FaSave, FaUser, FaUserTie,
} from 'react-icons/fa';
import './Moderator.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ModUser {
  _id: string;
  username: string;
  email: string;
  role: string;
  approved?: boolean;
  suspended?: boolean;
  suspendedReason?: string;
  modNotes?: string;
  verificationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  lastfmUsername?: string;
  createdAt?: string;
}

type Tab = 'pending' | 'users' | 'suspended';
type ModalMode = 'suspend' | 'notes' | null;

const Moderator: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<ModUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [modalUser, setModalUser] = useState<ModUser | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [notesText, setNotesText] = useState('');

  useEffect(() => {
    if (!currentUser) { navigate('/login'); return; }
    if (currentUser.role !== 'admin' && currentUser.role !== 'moderator') {
      navigate('/'); return;
    }
    fetchUsers();
  }, [currentUser, navigate]);

  const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  const fetchUsers = async () => {
    try {
      const res = await authFetch(`${API_URL}/api/mod/users`);
      if (res.status === 403) { navigate('/'); return; }
      if (!res.ok) throw new Error('Грешка при зареждане');
      setUsers(await res.json());
    } catch {
      showMessage('Грешка при зареждане на потребители', 'error');
    } finally {
      setLoading(false);
    }
  };

  const modUpdate = async (id: string, updates: Record<string, any>): Promise<boolean> => {
    try {
      const res = await authFetch(`${API_URL}/api/mod/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Грешка');
      }
      return true;
    } catch (err: any) {
      showMessage(err.message || 'Грешка при обновяване', 'error');
      return false;
    }
  };

  const handleApproval = async (u: ModUser, approve: boolean) => {
    const ok = await modUpdate(u._id, { approved: approve });
    if (ok) { showMessage(`${u.username} е ${approve ? 'одобрен' : 'отхвърлен'}`, 'success'); fetchUsers(); }
  };

  const handleVerification = async (u: ModUser, action: 'approved' | 'rejected') => {
    const ok = await modUpdate(u._id, { verificationStatus: action });
    if (ok) { showMessage(`${u.username} е ${action === 'approved' ? 'верифициран' : 'отхвърлен'}`, 'success'); fetchUsers(); }
  };

  const handleUnsuspend = async (u: ModUser) => {
    const ok = await modUpdate(u._id, { suspended: false, suspendedReason: '' });
    if (ok) { showMessage(`${u.username} е върнат`, 'success'); fetchUsers(); }
  };

  const openSuspend = (u: ModUser) => { setModalUser(u); setModalMode('suspend'); setSuspendReason(u.suspendedReason || ''); };
  const openNotes  = (u: ModUser) => { setModalUser(u); setModalMode('notes');   setNotesText(u.modNotes || ''); };
  const closeModal = () => { setModalUser(null); setModalMode(null); };

  const saveSuspend = async () => {
    if (!modalUser) return;
    const updates: Record<string, any> = { suspended: true };
    if (suspendReason.trim()) updates.suspendedReason = suspendReason.trim();
    const ok = await modUpdate(modalUser._id, updates);
    if (ok) { showMessage(`${modalUser.username} е спрян`, 'success'); fetchUsers(); closeModal(); }
  };

  const saveNotes = async () => {
    if (!modalUser) return;
    const ok = await modUpdate(modalUser._id, { modNotes: notesText });
    if (ok) { showMessage(`Бележката за ${modalUser.username} е запазена`, 'success'); fetchUsers(); closeModal(); }
  };

  const canModerate = (u: ModUser) =>
    u.role !== 'admin' && !(u.role === 'moderator' && currentUser?.role !== 'admin');

  const pendingApproval    = users.filter(u => !u.approved && u.role === 'user');
  const pendingVerification = users.filter(u => u.verificationStatus === 'pending');
  const suspendedUsers     = users.filter(u => u.suspended);
  const regularUsers       = users.filter(u => u.role === 'user' || u.role === 'moderator');

  const roleIcon = (role: string) => {
    if (role === 'admin')     return <FaUserShield style={{ color: '#c4b5fd' }} />;
    if (role === 'moderator') return <FaUserTie    style={{ color: '#2dd4bf' }} />;
    return <FaUser style={{ color: 'rgba(255,255,255,0.35)' }} />;
  };

  if (loading) return (
    <div className="mod-page">
      <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '3rem' }}>Зареждане…</p>
    </div>
  );

  return (
    <div className="mod-page">

      {/* Header */}
      <div className="mod-header">
        <button className="glass-button back-btn" onClick={() => navigate('/profile')}>
          <FaArrowLeft /> Назад
        </button>
        <h1><FaUserShield /> Модераторски панел</h1>
        <span className="mod-role-chip">
          {currentUser?.role === 'admin' ? 'Администратор' : 'Модератор'}
        </span>
      </div>

      {/* Flash message */}
      {message && (
        <div className={`mod-message ${messageType}`}>
          {messageType === 'success' && <FaCheckCircle />}
          {messageType === 'error'   && <FaTimesCircle />}
          {message}
        </div>
      )}

      {/* Stats bar */}
      <div className="mod-stats-bar">
        <div className="mod-stat">
          <span className="mod-stat-value">{users.filter(u => u.role === 'user').length}</span>
          <span className="mod-stat-label">Потребители</span>
        </div>
        <div className="mod-stat mod-stat-warn">
          <span className="mod-stat-value">{pendingApproval.length}</span>
          <span className="mod-stat-label">Чакат одобрение</span>
        </div>
        <div className="mod-stat mod-stat-info">
          <span className="mod-stat-value">{pendingVerification.length}</span>
          <span className="mod-stat-label">Чакат верификация</span>
        </div>
        <div className="mod-stat mod-stat-danger">
          <span className="mod-stat-value">{suspendedUsers.length}</span>
          <span className="mod-stat-label">Спрени</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="mod-tabs">
        <button className={`mod-tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
          <FaUserClock /> Чакащи
          {(pendingApproval.length + pendingVerification.length) > 0 && (
            <span className="tab-badge">{pendingApproval.length + pendingVerification.length}</span>
          )}
        </button>
        <button className={`mod-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          <FaUsers /> Потребители ({regularUsers.length})
        </button>
        <button className={`mod-tab ${activeTab === 'suspended' ? 'active' : ''}`} onClick={() => setActiveTab('suspended')}>
          <FaBan /> Спрени
          {suspendedUsers.length > 0 && <span className="tab-badge">{suspendedUsers.length}</span>}
        </button>
      </div>

      {/* ── Pending Tab ── */}
      {activeTab === 'pending' && (
        <div className="mod-section">
          <h3 className="mod-section-title"><FaUserClock /> Чакащи одобрение ({pendingApproval.length})</h3>
          {pendingApproval.length === 0 ? (
            <div className="glass-card mod-empty"><FaCheckCircle className="empty-icon" /><p>Няма чакащи заявки</p></div>
          ) : (
            <div className="mod-card-list">
              {pendingApproval.map(u => (
                <div key={u._id} className="glass-card mod-user-card">
                  <div className="mod-user-info">
                    <div className="mod-avatar">{u.username.charAt(0).toUpperCase()}</div>
                    <div>
                      <div className="mod-username">{u.username}</div>
                      <div className="mod-email">{u.email}</div>
                      {u.lastfmUsername && <div className="mod-lastfm">Last.fm: {u.lastfmUsername}</div>}
                      <div className="mod-date">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('bg-BG') : '—'}</div>
                    </div>
                  </div>
                  <div className="mod-actions">
                    <button className="glass-button approve-btn" onClick={() => handleApproval(u, true)}>
                      <FaCheck /> Одобри
                    </button>
                    <button className="glass-button mod-notes-btn" onClick={() => openNotes(u)}>
                      <FaStickyNote /> Бележка
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h3 className="mod-section-title" style={{ marginTop: '2rem' }}><FaClock /> Чакащи верификация ({pendingVerification.length})</h3>
          {pendingVerification.length === 0 ? (
            <div className="glass-card mod-empty"><FaCheckCircle className="empty-icon" /><p>Няма чакащи верификации</p></div>
          ) : (
            <div className="mod-card-list">
              {pendingVerification.map(u => (
                <div key={u._id} className="glass-card mod-user-card">
                  <div className="mod-user-info">
                    <div className="mod-avatar">{u.username.charAt(0).toUpperCase()}</div>
                    <div>
                      <div className="mod-username">{u.username}</div>
                      <div className="mod-email">{u.email}</div>
                    </div>
                  </div>
                  <div className="mod-actions">
                    <button className="glass-button approve-btn" onClick={() => handleVerification(u, 'approved')}>
                      <FaCheck /> Верифицирай
                    </button>
                    <button className="glass-button reject-btn" onClick={() => handleVerification(u, 'rejected')}>
                      <FaTimes /> Отхвърли
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Users Tab ── */}
      {activeTab === 'users' && (
        <div className="glass-card mod-table-card">
          <div className="mod-table-wrap">
            <table className="mod-table">
              <thead>
                <tr>
                  <th>Потребител</th>
                  <th>Имейл</th>
                  <th>Last.fm</th>
                  <th>Роля</th>
                  <th>Одобрен</th>
                  <th>Статус</th>
                  <th>Регистрация</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {regularUsers.map(u => (
                  <tr key={u._id} className={u.suspended ? 'row-suspended' : ''}>
                    <td className="mod-user-cell">
                      {roleIcon(u.role)}
                      {u.username}
                      {u.modNotes && (
                        <span className="has-notes-dot" title={`Бележка: ${u.modNotes}`}>●</span>
                      )}
                    </td>
                    <td>{u.email}</td>
                    <td>{u.lastfmUsername || '—'}</td>
                    <td>
                      <span className={`mod-role-badge ${u.role}`}>
                        {u.role === 'moderator' ? 'Модератор' : 'Потребител'}
                      </span>
                    </td>
                    <td>
                      <span className={`approval-badge ${u.approved ? 'yes' : 'no'}`}>
                        {u.approved ? <><FaCheckCircle /> Да</> : <><FaTimesCircle /> Не</>}
                      </span>
                    </td>
                    <td>
                      {u.suspended
                        ? <span className="suspended-badge"><FaBan /> Спрян</span>
                        : <span className="active-badge">Активен</span>}
                    </td>
                    <td className="date-cell">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('bg-BG') : '—'}
                    </td>
                    <td className="actions-cell">
                      {canModerate(u) && (
                        <>
                          <button
                            className={u.suspended ? 'unsuspend-btn' : 'suspend-btn'}
                            onClick={() => u.suspended ? handleUnsuspend(u) : openSuspend(u)}
                            title={u.suspended ? 'Върни достъп' : 'Спри акаунт'}
                          >
                            {u.suspended ? <FaUnlock /> : <FaBan />}
                          </button>
                          <button className="notes-btn" onClick={() => openNotes(u)} title="Бележка">
                            <FaStickyNote />
                          </button>
                          {!u.approved && (
                            <button className="approve-icon-btn" onClick={() => handleApproval(u, true)} title="Одобри">
                              <FaCheck />
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Suspended Tab ── */}
      {activeTab === 'suspended' && (
        <div className="mod-section">
          {suspendedUsers.length === 0 ? (
            <div className="glass-card mod-empty"><FaCheckCircle className="empty-icon" /><p>Няма спрени акаунти</p></div>
          ) : (
            <div className="mod-card-list">
              {suspendedUsers.map(u => (
                <div key={u._id} className="glass-card mod-user-card mod-suspended-card">
                  <div className="mod-user-info">
                    <div className="mod-avatar mod-avatar-suspended">{u.username.charAt(0).toUpperCase()}</div>
                    <div>
                      <div className="mod-username">{u.username} <span className="suspended-tag">СПРЯН</span></div>
                      <div className="mod-email">{u.email}</div>
                      {u.suspendedReason && <div className="mod-reason">Причина: {u.suspendedReason}</div>}
                      {u.modNotes && <div className="mod-notes-preview">Бележка: {u.modNotes}</div>}
                    </div>
                  </div>
                  <div className="mod-actions">
                    <button className="glass-button unsuspend-glass-btn" onClick={() => handleUnsuspend(u)}>
                      <FaUnlock /> Върни достъп
                    </button>
                    <button className="glass-button mod-notes-btn" onClick={() => openNotes(u)}>
                      <FaStickyNote /> Бележка
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Suspend Modal ── */}
      {modalUser && modalMode === 'suspend' && (
        <div className="mod-modal-overlay" onClick={closeModal}>
          <div className="glass-card mod-modal" onClick={e => e.stopPropagation()}>
            <h3><FaBan /> Спри акаунт: {modalUser.username}</h3>
            <div className="mod-modal-body">
              <label>Причина за спиране (незадължително)</label>
              <textarea
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
                placeholder="Нарушение на правилата, спам..."
                rows={3}
              />
            </div>
            <div className="mod-modal-actions">
              <button className="glass-button reject-btn" onClick={saveSuspend}>
                <FaBan /> Спри акаунта
              </button>
              <button className="glass-button" onClick={closeModal}>
                <FaTimes /> Отказ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Notes Modal ── */}
      {modalUser && modalMode === 'notes' && (
        <div className="mod-modal-overlay" onClick={closeModal}>
          <div className="glass-card mod-modal" onClick={e => e.stopPropagation()}>
            <h3><FaStickyNote /> Бележка за: {modalUser.username}</h3>
            <div className="mod-modal-body">
              <label>Вътрешна бележка (видима само за модератори и администратори)</label>
              <textarea
                value={notesText}
                onChange={e => setNotesText(e.target.value)}
                placeholder="Напр. Подозрително поведение, повторна регистрация..."
                rows={4}
              />
            </div>
            <div className="mod-modal-actions">
              <button className="glass-button approve-btn" onClick={saveNotes}>
                <FaSave /> Запази
              </button>
              <button className="glass-button" onClick={closeModal}>
                <FaTimes /> Отказ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Moderator;
