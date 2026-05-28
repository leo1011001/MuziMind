import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authFetch } from '../../utils/authFetch';
import { useNavigate } from 'react-router-dom';
import { FaShieldAlt, FaTrash, FaCheck, FaTimes, FaUserShield, FaUser, FaArrowLeft, FaCheckCircle, FaTimesCircle, FaClock, FaUsers, FaEdit, FaUserClock, FaSave, FaUserTie, FaBan } from 'react-icons/fa';
import './Admin.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface AdminUser {
  _id: string;
  username: string;
  email: string;
  role: string;
  approved?: boolean;
  verified?: boolean;
  verificationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  suspended?: boolean;
  suspendedReason?: string;
  lastfmUsername?: string;
  createdAt?: string;
}

type Tab = 'users' | 'pending' | 'verification';

const Admin: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({ username: '', email: '', lastfmUsername: '', role: '' });

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
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
      const res = await authFetch(`${API_URL}/api/admin/users`);
      if (res.status === 403) {
        navigate('/');
        return;
      }
      if (!res.ok) throw new Error('Грешка при зареждане');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      showMessage('Грешка при зареждане на потребители', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (id: string, updates: Record<string, any>) => {
    try {
      const res = await authFetch(`${API_URL}/api/admin/users/${id}`, {
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

  const deleteUser = async (id: string, username: string) => {
    if (!window.confirm(`Сигурни ли сте, че искате да изтриете ${username}?`)) return;
    try {
      const res = await authFetch(`${API_URL}/api/admin/users/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Грешка');
      }
      showMessage(`${username} е изтрит успешно`, 'success');
      fetchUsers();
    } catch (err: any) {
      showMessage(err.message || 'Грешка при изтриване', 'error');
    }
  };

  const handleApproval = async (id: string, username: string, approve: boolean) => {
    const success = await updateUser(id, { approved: approve });
    if (success) {
      showMessage(`${username} е ${approve ? 'одобрен' : 'отхвърлен'}`, 'success');
      fetchUsers();
    }
  };

  const handleVerification = async (id: string, username: string, action: 'approved' | 'rejected') => {
    const success = await updateUser(id, { verificationStatus: action });
    if (success) {
      const label = action === 'approved' ? 'верифициран' : 'отхвърлен';
      showMessage(`${username} е ${label}`, 'success');
      fetchUsers();
    }
  };

  const toggleRole = async (u: AdminUser) => {
    // Cycle: user → moderator → admin → user
    const cycle: Record<string, string> = { user: 'moderator', moderator: 'admin', admin: 'user' };
    const newRole = cycle[u.role] ?? 'user';
    const labels: Record<string, string> = { user: 'потребител', moderator: 'модератор', admin: 'администратор' };
    const success = await updateUser(u._id, { role: newRole });
    if (success) {
      showMessage(`${u.username} е вече ${labels[newRole]}`, 'success');
      fetchUsers();
    }
  };

  const openEdit = (u: AdminUser) => {
    setEditingUser(u);
    setEditForm({
      username: u.username,
      email: u.email,
      lastfmUsername: u.lastfmUsername || '',
      role: u.role,
    });
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    const updates: Record<string, any> = {};
    if (editForm.username !== editingUser.username) updates.username = editForm.username;
    if (editForm.email !== editingUser.email) updates.email = editForm.email;
    if (editForm.lastfmUsername !== (editingUser.lastfmUsername || '')) updates.lastfmUsername = editForm.lastfmUsername;
    if (editForm.role !== editingUser.role && editingUser._id !== currentUser?.id) updates.role = editForm.role;

    if (Object.keys(updates).length === 0) {
      setEditingUser(null);
      return;
    }

    const success = await updateUser(editingUser._id, updates);
    if (success) {
      showMessage(`${editingUser.username} е обновен`, 'success');
      setEditingUser(null);
      fetchUsers();
    }
  };

  const pendingApproval = users.filter(u => !u.approved && u.role !== 'admin');
  const pendingVerification = users.filter(u => u.verificationStatus === 'pending');

  if (loading) {
    return (
      <div className="admin-page">
        <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '3rem' }}>Зареждане…</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <button className="glass-button back-btn" onClick={() => navigate('/profile')}>
          <FaArrowLeft /> Назад
        </button>
        <h1><FaShieldAlt /> Админ панел</h1>
      </div>

      {message && (
        <div className={`admin-message ${messageType}`}>
          {messageType === 'success' && <FaCheckCircle />}
          {messageType === 'error' && <FaTimesCircle />}
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <FaUsers /> Потребители ({users.length})
        </button>
        <button
          className={`admin-tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          <FaUserClock /> Чакащи одобрение
          {pendingApproval.length > 0 && (
            <span className="tab-badge">{pendingApproval.length}</span>
          )}
        </button>
        <button
          className={`admin-tab ${activeTab === 'verification' ? 'active' : ''}`}
          onClick={() => setActiveTab('verification')}
        >
          <FaClock /> Верификация
          {pendingVerification.length > 0 && (
            <span className="tab-badge">{pendingVerification.length}</span>
          )}
        </button>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="glass-card admin-table-card">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Потребител</th>
                  <th>Имейл</th>
                  <th>Last.fm</th>
                  <th>Роля</th>
                  <th>Одобрен</th>
                  <th>Статус</th>
                  <th>Верификация</th>
                  <th>Регистрация</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td className="user-cell">
                      {u.role === 'admin' ? <FaUserShield /> : u.role === 'moderator' ? <FaUserTie /> : <FaUser />}
                      {u.username}
                    </td>
                    <td>{u.email}</td>
                    <td>{u.lastfmUsername || '—'}</td>
                    <td>
                      <button
                        className={`role-badge ${u.role}`}
                        onClick={() => toggleRole(u)}
                        title={u._id === currentUser?.id ? 'Не можете да промените собствената си роля' : 'Натисни за смяна на роля (потребител → модератор → админ)'}
                        disabled={u._id === currentUser?.id}
                        style={u._id === currentUser?.id ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                      >
                        {u.role === 'admin' ? 'Админ' : u.role === 'moderator' ? 'Модератор' : 'Потребител'}
                      </button>
                    </td>
                    <td>
                      <button
                        className={`approval-badge ${u.approved ? 'yes' : 'no'}`}
                        onClick={() => handleApproval(u._id, u.username, !u.approved)}
                        title={u.approved ? 'Натисни за отказ' : 'Натисни за одобрение'}
                      >
                        {u.approved ? <><FaCheckCircle /> Да</> : <><FaTimesCircle /> Не</>}
                      </button>
                    </td>
                    <td>
                      {u.suspended
                        ? (
                          <span
                            className="suspended-badge has-reason-tooltip"
                            data-reason={u.suspendedReason || null}
                          >
                            <FaBan /> Спрян
                          </span>
                        )
                        : <span className="active-badge">Активен</span>}
                    </td>
                    <td>
                      <span className={`verification-status ${u.approved ? 'approved' : 'rejected'}`}>
                        {u.approved
                          ? <><FaCheckCircle /> Верифициран</>
                          : <><FaTimesCircle /> Не</>}
                      </span>
                    </td>
                    <td className="date-cell">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('bg-BG') : '—'}
                    </td>
                    <td className="actions-cell">
                      <button
                        className="edit-btn"
                        onClick={() => openEdit(u)}
                        title="Редактирай потребител"
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => deleteUser(u._id, u.username)}
                        title="Изтрий потребител"
                        disabled={u._id === currentUser?.id}
                        style={u._id === currentUser?.id ? { opacity: 0.3, cursor: 'not-allowed' } : undefined}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending Approval Tab */}
      {activeTab === 'pending' && (
        <div className="verification-section">
          {pendingApproval.length === 0 ? (
            <div className="glass-card verification-empty">
              <FaCheckCircle className="empty-icon" />
              <p>Няма чакащи заявки за одобрение</p>
            </div>
          ) : (
            <div className="verification-list">
              {pendingApproval.map((u) => (
                <div key={u._id} className="glass-card verification-card">
                  <div className="verification-user-info">
                    <div className="verification-avatar">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="verification-details">
                      <h3>{u.username}</h3>
                      <p>{u.email}</p>
                      {u.lastfmUsername && <p className="verification-lastfm">Last.fm: {u.lastfmUsername}</p>}
                      <p className="verification-date">
                        Регистриран: {u.createdAt ? new Date(u.createdAt).toLocaleDateString('bg-BG') : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="verification-actions">
                    <button
                      className="glass-button approve-btn"
                      onClick={() => handleApproval(u._id, u.username, true)}
                    >
                      <FaCheck /> Одобри
                    </button>
                    <button
                      className="glass-button reject-btn"
                      onClick={() => deleteUser(u._id, u.username)}
                    >
                      <FaTrash /> Изтрий
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Verification Tab */}
      {activeTab === 'verification' && (
        <div className="verification-section">
          {pendingVerification.length === 0 ? (
            <div className="glass-card verification-empty">
              <FaCheckCircle className="empty-icon" />
              <p>Няма чакащи заявки за верификация</p>
            </div>
          ) : (
            <div className="verification-list">
              {pendingVerification.map((u) => (
                <div key={u._id} className="glass-card verification-card">
                  <div className="verification-user-info">
                    <div className="verification-avatar">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="verification-details">
                      <h3>{u.username}</h3>
                      <p>{u.email}</p>
                      {u.lastfmUsername && <p className="verification-lastfm">Last.fm: {u.lastfmUsername}</p>}
                      <p className="verification-date">
                        Регистриран: {u.createdAt ? new Date(u.createdAt).toLocaleDateString('bg-BG') : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="verification-actions">
                    <button
                      className="glass-button approve-btn"
                      onClick={() => handleVerification(u._id, u.username, 'approved')}
                    >
                      <FaCheck /> Верифицирай
                    </button>
                    <button
                      className="glass-button reject-btn"
                      onClick={() => handleVerification(u._id, u.username, 'rejected')}
                    >
                      <FaTimes /> Отхвърли
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recently reviewed */}
          {users.filter(u => u.verificationStatus === 'approved' || u.verificationStatus === 'rejected').length > 0 && (
            <div className="glass-card reviewed-section">
              <h3>Прегледани заявки</h3>
              <div className="reviewed-list">
                {users.filter(u => u.verificationStatus === 'approved' || u.verificationStatus === 'rejected').map((u) => (
                  <div key={u._id} className="reviewed-item">
                    <span className="reviewed-user">{u.username}</span>
                    <span className={`verification-status ${u.verificationStatus}`}>
                      {u.verificationStatus === 'approved' ? <><FaCheckCircle /> Верифициран</> : <><FaTimesCircle /> Отхвърлен</>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="edit-modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="glass-card edit-modal" onClick={(e) => e.stopPropagation()}>
            <h3><FaEdit /> Редактирай: {editingUser.username}</h3>
            <div className="edit-form">
              <div className="edit-form-group">
                <label>Потребителско име</label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm(f => ({ ...f, username: e.target.value }))}
                />
              </div>
              <div className="edit-form-group">
                <label>Имейл</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="edit-form-group">
                <label>Last.fm потребител</label>
                <input
                  type="text"
                  value={editForm.lastfmUsername}
                  onChange={(e) => setEditForm(f => ({ ...f, lastfmUsername: e.target.value }))}
                />
              </div>
              {editingUser._id !== currentUser?.id && (
                <div className="edit-form-group">
                  <label>Роля</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm(f => ({ ...f, role: e.target.value }))}
                  >
                    <option value="user">Потребител</option>
                    <option value="moderator">Модератор</option>
                    <option value="admin">Администратор</option>
                  </select>
                </div>
              )}
              <div className="edit-form-actions">
                <button className="glass-button approve-btn" onClick={saveEdit}>
                  <FaSave /> Запази
                </button>
                <button className="glass-button reject-btn" onClick={() => setEditingUser(null)}>
                  <FaTimes /> Отказ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
