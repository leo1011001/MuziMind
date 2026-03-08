import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaShieldAlt, FaTrash, FaCheck, FaTimes, FaUserShield, FaUser } from 'react-icons/fa';
import './Admin.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface AdminUser {
  _id: string;
  username: string;
  email: string;
  role: string;
  approved?: boolean;
  verified?: boolean;
  lastfmUsername?: string;
  createdAt?: string;
}

const Admin: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchUsers();
  }, [user, navigate]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, { credentials: 'include' });
      if (res.status === 403) {
        navigate('/');
        return;
      }
      if (!res.ok) throw new Error('Грешка при зареждане');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setMessage('Грешка при зареждане на потребители');
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (id: string, updates: Partial<AdminUser>) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Грешка');
      }
      setMessage('Потребителят е обновен');
      fetchUsers();
    } catch (err: any) {
      setMessage(err.message || 'Грешка при обновяване');
    }
  };

  const deleteUser = async (id: string, username: string) => {
    if (!window.confirm(`Сигурни ли сте, че искате да изтриете ${username}?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Грешка');
      }
      setMessage(`${username} е изтрит`);
      fetchUsers();
    } catch (err: any) {
      setMessage(err.message || 'Грешка при изтриване');
    }
  };

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
        <h1><FaShieldAlt /> Админ панел</h1>
      </div>

      {message && <div className="admin-message">{message}</div>}

      <div className="glass-card admin-table-card">
        <h3>Потребители ({users.length})</h3>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Потребител</th>
                <th>Имейл</th>
                <th>Last.fm</th>
                <th>Роля</th>
                <th>Одобрен</th>
                <th>Верифициран</th>
                <th>Регистрация</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td className="user-cell">
                    {u.role === 'admin' ? <FaUserShield /> : <FaUser />}
                    {u.username}
                  </td>
                  <td>{u.email}</td>
                  <td>{u.lastfmUsername || '—'}</td>
                  <td>
                    <button
                      className={`role-badge ${u.role}`}
                      onClick={() => updateUser(u._id, { role: u.role === 'admin' ? 'user' : 'admin' })}
                      title="Натисни за смяна на роля"
                    >
                      {u.role === 'admin' ? 'Админ' : 'Потребител'}
                    </button>
                  </td>
                  <td>
                    <button
                      className={`toggle-btn ${u.approved ? 'active' : ''}`}
                      onClick={() => updateUser(u._id, { approved: !u.approved })}
                    >
                      {u.approved ? <FaCheck /> : <FaTimes />}
                    </button>
                  </td>
                  <td>
                    <button
                      className={`toggle-btn ${u.verified ? 'active' : ''}`}
                      onClick={() => updateUser(u._id, { verified: !u.verified })}
                    >
                      {u.verified ? <FaCheck /> : <FaTimes />}
                    </button>
                  </td>
                  <td className="date-cell">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('bg-BG') : '—'}
                  </td>
                  <td>
                    <button
                      className="delete-btn"
                      onClick={() => deleteUser(u._id, u.username)}
                      title="Изтрий потребител"
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
    </div>
  );
};

export default Admin;
