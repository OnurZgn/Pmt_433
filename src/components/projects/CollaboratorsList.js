// components/projects/CollaboratorsList.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import ClientFunctions from '../../services/ClientFunctions';
import './CollaboratorsList.css';
import './CreateProject.css';
import './ProjectDetails.css';
import './List.css';
import './Form.css';
import '../users/Avatar.css';

// Define Cloud Functions
export default function CollaboratorsList({ projectId, ownerId, onCollaboratorUpdated }) {
  const [collaboratorUsers, setCollaboratorUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('');
  const [error, setError] = useState('');
  const [addingCollaborator, setAddingCollaborator] = useState(false);
  const [existingEmails, setExistingEmails] = useState(new Set());
  const navigate = useNavigate();

  // Load collaborators
  const fetchCollaborators = React.useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const result = await ClientFunctions.getProjectCollaborators({
        projectId
      });

      const collaboratorsData = result.collaborators || [];
      
      const emailSet = new Set();
      collaboratorsData.forEach(user => {
        if (user.email) {
          emailSet.add(user.email.toLowerCase());
        }
      });

      setCollaboratorUsers(collaboratorsData);
      setExistingEmails(emailSet);

    } catch (err) {
      console.error('Error loading collaborators:', err);
      setError('Failed to load team members.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Fetch collaborators when component mounts
  useEffect(() => {
    if (projectId) {
      fetchCollaborators();
    }
  }, [projectId, fetchCollaborators]);

  // Add collaborator
  const handleAddCollaborator = async (e) => {
    e.preventDefault();

    const trimmedEmail = newCollaboratorEmail.trim().toLowerCase();
    
    if (!trimmedEmail) {
      return setError('Please enter an email address');
    }

    if (existingEmails.has(trimmedEmail)) {
      return setError('This email is already in the project');
    }

    try {
      setError('');
      setAddingCollaborator(true);

      await ClientFunctions.addProjectCollaborator({
        projectId,
        email: trimmedEmail,
        role: 'Member'
      });
      
      setNewCollaboratorEmail('');
      setExistingEmails(prev => new Set([...prev, trimmedEmail]));
      fetchCollaborators();
      
      if (onCollaboratorUpdated) {
        onCollaboratorUpdated();
      }
    } catch (err) {
      setError('An error occurred: ' + (err.message || 'Could not add user'));
    } finally {
      setAddingCollaborator(false);
    }
  };

  // Remove collaborator
  const handleRemoveCollaborator = async (userId, email) => {
    if (!window.confirm('Are you sure you want to remove this user from the project?')) {
      return;
    }

    try {
      setError('');
      
      await ClientFunctions.removeProjectCollaborator({
        projectId,
        userId
      });
      
      if (email) {
        setExistingEmails(prev => {
          const updated = new Set(prev);
          updated.delete(email.toLowerCase());
          return updated;
        });
      }
      
      fetchCollaborators();
      
      if (onCollaboratorUpdated) {
        onCollaboratorUpdated();
      }
    } catch (err) {
      setError('Error removing user: ' + (err.message || 'Operation failed'));
    }
  };

  return (
    <div className="list-container">
      <form onSubmit={handleAddCollaborator} className="collab-form">
        <input
          type="email"
          placeholder="User Email Address"
          value={newCollaboratorEmail}
          onChange={(e) => setNewCollaboratorEmail(e.target.value)}
          className="form-input"
        />
        <button
          type="submit"
          disabled={addingCollaborator}
          className="form-btn form-btn-primary"
        >
          {addingCollaborator ? 'Adding...' : 'Add'}
        </button>
      </form>
      {error && <p className="form-error">{error}</p>}
      
      {loading ? (
        <div className="collaborators-loading">Loading...</div>
      ) : collaboratorUsers.length === 0 ? (
        <p className="collaborators-empty">No users added to this project yet</p>
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
                  {user.displayName || 'Unnamed User'}
                  <span className={`list-badge ${user.isOwner ? 'owner' : 'collaborator'}`}>
                    {user.role || (user.isOwner ? 'Project Owner' : 'Member')}
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
                    Remove
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