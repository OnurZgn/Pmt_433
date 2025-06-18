// components/projects/EditProject.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ClientFunctions from '../../services/ClientFunctions';
import './CreateProject.css';

export default function EditProject() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    description: '',
    visibility: 'private',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load project data directly from Firestore
  useEffect(() => {
    const loadProject = async () => {
      try {
        const projectData = await ClientFunctions.getProjectWithCollaborators({
          projectId
        });

        if (projectData) {
          setForm({
            name: projectData.name || '',
            description: projectData.description || '',
            visibility: projectData.visibility || 'private',
          });
        }
      } catch (err) {
        setError(`An error occurred while loading the project: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [projectId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setError('Project name cannot be empty');
      return;
    }

    try {
      setIsSubmitting(true);
      await ClientFunctions.updateProject({
        projectId,
        updates: {
          name: form.name.trim(),
          description: form.description.trim(),
          visibility: form.visibility
        }
      });
      navigate(`/projects/${projectId}`);
    } catch (err) {
      setError(`An error occurred while updating the project: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="loading">Loading project data...</div>;
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
          <h1 className="project-title">Edit Project</h1>
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
              value={form.name}
              onChange={handleInputChange}
              className="form-control"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">Description</label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleInputChange}
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
                  checked={form.visibility === 'private'}
                  onChange={handleInputChange}
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
                  checked={form.visibility === 'public'}
                  onChange={handleInputChange}
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
              onClick={() => navigate(-1)}
              className="btn-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-submit"
            >
              {isSubmitting ? 'Saving...' : 'Update Project'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}