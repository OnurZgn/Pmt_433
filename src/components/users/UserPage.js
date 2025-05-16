import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import '../projects/CreateProject.css'; // Import CreateProject.css instead of UserPage.css
import './Avatar.css';

export default function UserPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          setUser({
            ...userData,
            createdAt: userData.createdAt?.toDate() || null, // Ensure createdAt is converted to a Date object
          });
        } else {
          setError('Kullanıcı bulunamadı.');
        }
      } catch (err) {
        setError('Kullanıcı bilgileri yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  const handleUpdateDisplayName = async (e) => {
    e.preventDefault();
    if (!newDisplayName.trim()) return;

    try {
      setIsSaving(true);
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        displayName: newDisplayName.trim()
      });
      setUser(prev => ({ ...prev, displayName: newDisplayName.trim() }));
      setIsEditing(false);
    } catch (err) {
      setError('İsim güncellenirken bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="loading">Kullanıcı bilgileri yükleniyor...</div>;
  if (error) return <div className="error-alert">{error}</div>;

  const isCurrentUser = currentUser?.uid === userId;

  return (
    <>
      <div className="project-header">
        <div className="header-content">
          <button onClick={() => navigate(-1)} className="btn-back">
            <svg xmlns="http://www.w3.org/2000/svg" className="icon-back" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Geri
          </button>
          <h1 className="project-title">Kullanıcı Profili</h1>
        </div>
      </div>

      <div className="create-project">
        <div className="user-info">
          <div className="avatar large">
            {user?.displayName?.charAt(0).toUpperCase() || '?'}
          </div>

          {isEditing ? (
            <form onSubmit={handleUpdateDisplayName} className="form-group">
              <label htmlFor="displayName" className="form-label">İsim</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  id="displayName"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="form-control"
                  placeholder="İsminizi girin"
                  required
                />
                <button type="submit" className="btn-submit" disabled={isSaving}>
                  {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={() => setIsEditing(false)}
                >
                  İptal
                </button>
              </div>
            </form>
          ) : (
            <div className="form-group">
              <label className="form-label">İsim</label>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="user-display-name">{user?.displayName || 'İsimsiz Kullanıcı'}</span>
                {isCurrentUser && (
                  <button 
                    onClick={() => {
                      setNewDisplayName(user?.displayName || '');
                      setIsEditing(true);
                    }} 
                    className="btn-edit"
                  >
                    İsmi Düzenle
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">E-posta</label>
            <span className="user-email">{user?.email}</span>
          </div>

          <div className="form-group">
            <label className="form-label">Hesap Oluşturulma Tarihi</label>
            <span className="user-meta">
              {user?.createdAt ? user.createdAt.toLocaleString('tr-TR') : 'Bilinmiyor'}
            </span>
          </div>
        </div>

        {isCurrentUser && (
          <div className="form-actions">
            <button onClick={() => navigate('/dashboard')} className="btn-submit">
              Panele Dön
            </button>
          </div>
        )}
      </div>
    </>
  );
}
