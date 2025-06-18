import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ClientFunctions from '../../services/ClientFunctions';
import './CreateProject.css';

export default function CreateTask() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dueDate: '',
    priority: 'medium',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const projectRef = doc(db, 'projects', projectId);
        const projectSnap = await getDoc(projectRef);

        if (projectSnap.exists()) {
          const projectData = projectSnap.data();
          const isOwner = projectData.ownerId === currentUser?.uid;
          const isCollaborator = projectData.collaborators?.some(
            collab => typeof collab === 'string' 
              ? collab === currentUser?.uid 
              : collab.userId === currentUser?.uid
          );

          setHasAccess(isOwner || isCollaborator);
          if (!(isOwner || isCollaborator)) {
            navigate(`/projects/${projectId}`);
          }
        }
      } catch (err) {
        console.error('Error checking access:', err);
        navigate(`/projects/${projectId}`);
      }
    };

    if (currentUser) {
      checkAccess();
    } else {
      navigate(`/projects/${projectId}`);
    }
  }, [projectId, currentUser, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      return setError('Task name cannot be empty');
    }

    try {
      setIsSubmitting(true);

      const result = await ClientFunctions.createTask({
        projectId,
        name: formData.name,
        description: formData.description,
        priority: formData.priority,
        dueDate: formData.dueDate,
        userId: currentUser.uid
      });

      if (result.success) {
        navigate(`/projects/${projectId}`);
      }
    } catch (err) {
      setError(`Error creating task: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasAccess) {
    return null;
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
          <h1 className="project-title">Create New Task</h1>
        </div>
      </div>

      <div className="create-project">
        {error && <div className="error-alert">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name" className="form-label">Task Name</label>
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
              placeholder="Write a description about this task (optional)"
            ></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="dueDate" className="form-label">Due Date</label>
            <input
              type="date"
              id="dueDate"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Priority</label>
            <div className="radio-group">
              <div className="radio-option">
                <input
                  id="priority-low"
                  name="priority"
                  type="radio"
                  value="low"
                  checked={formData.priority === 'low'}
                  onChange={handleChange}
                  className="radio-input"
                />
                <label htmlFor="priority-low" className="radio-label">
                  <div className="radio-label-title">Low</div>
                </label>
              </div>
              <div className="radio-option">
                <input
                  id="priority-medium"
                  name="priority"
                  type="radio"
                  value="medium"
                  checked={formData.priority === 'medium'}
                  onChange={handleChange}
                  className="radio-input"
                />
                <label htmlFor="priority-medium" className="radio-label">
                  <div className="radio-label-title">Medium</div>
                </label>
              </div>
              <div className="radio-option">
                <input
                  id="priority-high"
                  name="priority"
                  type="radio"
                  value="high"
                  checked={formData.priority === 'high'}
                  onChange={handleChange}
                  className="radio-input"
                />
                <label htmlFor="priority-high" className="radio-label">
                  <div className="radio-label-title">High</div>
                </label>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate(`/projects/${projectId}`)}
              className="btn-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-submit"
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}