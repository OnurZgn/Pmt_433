import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ClientFunctions from '../../services/ClientFunctions';
import '../projects/CreateProject.css';
import './Avatar.css';

export default function UserPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { currentUser, updateUserDisplayName } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Move isCurrentUser declaration before useEffect
  const isCurrentUser = currentUser && currentUser.uid === userId;

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) {
        setLoading(false);
        setError("User ID not found");
        return;
      }

      try {
        setLoading(true);
        setError('');

        const userData = await ClientFunctions.getUserProfileData({ 
          userId: userId 
        });

        if (userData) {
          setUser({
            ...userData,
            createdAt: userData.createdAt ? new Date(userData.createdAt) : null,
          });
          
          // Set initial display name if editing
          if (isCurrentUser) {
            setNewDisplayName(userData.displayName || '');
          }
        }
      } catch (err) {
        console.error('Error fetching user:', err);
        setError(err.message || 'Error loading user information');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId, isCurrentUser]);

  const handleUpdateDisplayName = async (e) => {
    e.preventDefault();
    if (!newDisplayName.trim()) return;

    try {
      setIsSaving(true);
      setError('');

      // Update user profile using ClientFunctions
      await ClientFunctions.updateUserProfileData({
        userId: userId.trim(),
        displayName: newDisplayName.trim()
      });

      // Update Auth profile if current user
      if (isCurrentUser && currentUser) {
        try {
          await updateUserDisplayName(newDisplayName.trim());
        } catch (authErr) {
          console.error("Error updating auth display name:", authErr);
        }
      }

      // Update local state
      setUser(prev => ({ ...prev, displayName: newDisplayName.trim() }));
      setIsEditing(false);
    } catch (err) {
      setError('An error occurred while updating the name: ' + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  // Check if we have a valid user before rendering
  if (loading) return <div className="loading">Loading user information...</div>;
  if (error) return <div className="error-alert">{error}</div>;
  if (!user) return <div className="error-alert">User not found</div>;

  return (
    <>
      <div className="project-header">
        <div className="header-content">
          <button onClick={() => navigate(-1)} className="btn-back">
            <svg xmlns="http://www.w3.org/2000/svg" className="icon-back" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="project-title">User Profile</h1>
        </div>
      </div>

      <div className="create-project">
        <div className="user-info">
          <div className="avatar large">
            {user?.displayName?.charAt(0).toUpperCase() || '?'}
          </div>

          {isEditing ? (
            <form onSubmit={handleUpdateDisplayName} className="form-group">
              <label htmlFor="displayName" className="form-label">Name</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  id="displayName"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="form-control"
                  placeholder="Enter your name"
                  required
                />
                <button type="submit" className="btn-submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="form-group">
              <label className="form-label">Name</label>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="user-display-name">{user?.displayName || 'Unnamed User'}</span>
                {isCurrentUser && (
                  <button 
                    onClick={() => {
                      setNewDisplayName(user?.displayName || '');
                      setIsEditing(true);
                    }} 
                    className="btn-edit"
                  >
                    Edit Name
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <span className="user-email">{user?.email}</span>
          </div>

          <div className="form-group">
            <label className="form-label">Account Created At</label>
            <span className="user-meta">
              {user?.createdAt 
                ? new Date(user.createdAt).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'Unknown'
              }
            </span>
          </div>
        </div>

        {isCurrentUser && (
          <div className="form-actions">
            <button onClick={() => navigate('/dashboard')} className="btn-submit">
              Return to Dashboard
            </button>
          </div>
        )}
      </div>
    </>
  );
}