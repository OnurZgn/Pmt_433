// components/projects/CreateProject.js
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ClientFunctions from '../../services/ClientFunctions';
import './CreateProject.css';

export default function CreateProject() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visibility: 'private'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return setError('Project name cannot be empty');
    }

    if (!currentUser?.uid) {
      return setError('User authentication required');
    }
    
    try {
      setError('');
      setLoading(true);
      
      const collaborators = [{
        userId: currentUser.uid,
        email: currentUser.email,
        role: 'Project Owner',
        addedAt: new Date()
      }];
      
      const result = await ClientFunctions.createProject({
        name: formData.name.trim(),
        description: formData.description.trim(),
        visibility: formData.visibility,
        ownerId: currentUser.uid,
        collaborators: collaborators
      });

      if (result.success) {
        navigate(`/projects/${result.projectId}`);
      }
    } catch (error) {
      console.error('Project creation error:', error);
      setError('Project could not be created: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

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
          <h1 className="project-title">Create New Project</h1>
        </div>
      </div>

      <div className="create-project">
        {error && <div className="error-alert">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name" className="form-label">Project Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="form-control"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="description" className="form-label">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              className="form-control"
              placeholder="Write a description about this project (optional)"
            ></textarea>
          </div>
          
          <div className="form-group">
            <label className="form-label">Visibility</label>
            <div className="radio-group">
              <div className="radio-option">
                <input
                  id="private"
                  name="visibility"
                  type="radio"
                  value="private"
                  checked={formData.visibility === 'private'}
                  onChange={handleChange}
                  className="radio-input"
                />
                <label htmlFor="private" className="radio-label">
                  <div className="radio-label-title">Private</div>
                  <div className="radio-label-description">
                    Only you and invited users can view and edit
                  </div>
                </label>
              </div>
              <div className="radio-option">
                <input
                  id="public"
                  name="visibility"
                  type="radio"
                  value="public"
                  checked={formData.visibility === 'public'}
                  onChange={handleChange}
                  className="radio-input"
                />
                <label htmlFor="public" className="radio-label">
                  <div className="radio-label-title">Public</div>
                  <div className="radio-label-description">
                    Everyone can view this project, only allowed users can edit
                  </div>
                </label>
              </div>
            </div>
          </div>
          
          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-submit"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}