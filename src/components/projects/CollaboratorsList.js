// components/projects/CollaboratorsList.js
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useProjects } from '../../contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';
import './CollaboratorsList.css';
import './CreateProject.css';
import './ProjectDetails.css';
import './List.css';
import './Form.css';
import '../users/Avatar.css';

export default function CollaboratorsList({ projectId, collaborators = [], ownerId, onCollaboratorUpdated }) {
  const [collaboratorUsers, setCollaboratorUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('');
  const [error, setError] = useState('');
  const [addingCollaborator, setAddingCollaborator] = useState(false);
  const [existingEmails, setExistingEmails] = useState(new Set());
  const { addCollaborator, removeCollaborator } = useProjects();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchCollaborators() {
      try {
        setLoading(true);
        const usersData = [];
        const emailSet = new Set();

        // Fetch owner details
        if (ownerId) {
          const ownerRef = doc(db, 'users', ownerId);
          const ownerSnap = await getDoc(ownerRef);
          if (ownerSnap.exists()) {
            const ownerData = ownerSnap.data();
            usersData.push({
              id: ownerSnap.id,
              ...ownerData,
              isOwner: true, // Mark as owner
              role: 'Proje Sahibi' // Add role
            });
            
            // Add owner email to the set
            if (ownerData.email) {
              emailSet.add(ownerData.email.toLowerCase());
            }
          }
        }

        // Fetch collaborator details
        if (collaborators && collaborators.length > 0) {
          for (const collab of collaborators) {
            // Skip if this is the owner (already added)
            const collabId = typeof collab === 'string' ? collab : collab.userId;
            if (collabId === ownerId) continue;
            
            const userRef = doc(db, 'users', collabId);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
              const userData = userSnap.data();
              usersData.push({
                id: userSnap.id,
                ...userData,
                isOwner: false,
                role: typeof collab === 'object' && collab.role ? collab.role : 'Üye' // Use role if available
              });
              
              // Add collaborator email to the set
              if (userData.email) {
                emailSet.add(userData.email.toLowerCase());
              }
            }
          }
        }

        setCollaboratorUsers(usersData);
        setExistingEmails(emailSet);
      } catch (err) {
        console.error('Error fetching collaborators:', err);
        setError('Ekip üyeleri yüklenemedi.');
      } finally {
        setLoading(false);
      }
    }

    fetchCollaborators();
  }, [collaborators, ownerId]);

  const handleAddCollaborator = async (e) => {
    e.preventDefault();

    const trimmedEmail = newCollaboratorEmail.trim().toLowerCase();
    
    if (!trimmedEmail) {
      return setError('Lütfen bir e-posta adresi girin');
    }

    // Check if the email is already in the project
    if (existingEmails.has(trimmedEmail)) {
      return setError('Bu e-posta adresi zaten projede bulunuyor');
    }

    try {
      setError('');
      setAddingCollaborator(true);

      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', trimmedEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return setError('Bu e-posta adresine sahip bir kullanıcı bulunamadı');
      }

      const userDoc = querySnapshot.docs[0];
      const userId = userDoc.id;

      // Check if user is already a collaborator
      const isAlreadyCollaborator = collaborators.some(collab => 
        typeof collab === 'string' 
          ? collab === userId 
          : collab.userId === userId
      );

      if (isAlreadyCollaborator || userId === ownerId) {
        return setError('Bu kullanıcı zaten projede ekli');
      }

      await addCollaborator(projectId, userId);
      setNewCollaboratorEmail('');
      
      // Update the existingEmails set
      setExistingEmails(prev => new Set([...prev, trimmedEmail]));
      
      if (onCollaboratorUpdated) {
        onCollaboratorUpdated();
      }
    } catch (err) {
      setError('Bir hata oluştu: ' + err.message);
    } finally {
      setAddingCollaborator(false);
    }
  };

  const handleRemoveCollaborator = async (userId, email) => {
    if (window.confirm('Bu kullanıcıyı projeden çıkarmak istediğinizden emin misiniz?')) {
      try {
        await removeCollaborator(projectId, userId);
        
        if (email) {
          setExistingEmails(prev => {
            const updated = new Set(prev);
            updated.delete(email.toLowerCase());
            return updated;
          });
        }
        
        if (onCollaboratorUpdated) {
          onCollaboratorUpdated();
        }
      } catch (err) {
        setError('Kullanıcı çıkarılırken bir hata oluştu: ' + err.message);
      }
    }
  };

  return (
    <div className="list-container">
      <form onSubmit={handleAddCollaborator} className="collab-form">
        <input
          type="email"
          placeholder="Kullanıcı E-posta Adresi"
          value={newCollaboratorEmail}
          onChange={(e) => setNewCollaboratorEmail(e.target.value)}
          className="form-input"
        />
        <button
          type="submit"
          disabled={addingCollaborator}
          className="form-btn form-btn-primary"
        >
          {addingCollaborator ? 'Ekleniyor...' : 'Ekle'}
        </button>
      </form>
      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <div className="collaborators-loading">Yükleniyor...</div>
      ) : collaboratorUsers.length === 0 ? (
        <p className="collaborators-empty">Henüz bu projeye eklenmiş kullanıcı yok</p>
      ) : (
        <ul className="list">
          {collaboratorUsers.map((user) => (
            <li
              key={user.id}
              className="list-item clickable"
              onClick={() => navigate(`/user/${user.id}`)}
            >
              <div className="avatar medium">
                {user.displayName?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="list-main">
                <span className="list-title">
                  {user.displayName || 'İsimsiz Kullanıcı'}
                  <span className={`list-badge ${user.isOwner ? 'owner' : 'collaborator'}`}>
                    {user.role || (user.isOwner ? 'Proje Sahibi' : 'Üye')}
                  </span>
                </span>
                <span className="list-desc">{user.email}</span>
              </div>
              {!user.isOwner && (
                <div className="list-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveCollaborator(user.id, user.email);
                    }}
                    className="list-action-btn delete"
                  >
                    Çıkar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}