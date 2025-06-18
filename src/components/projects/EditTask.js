import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ClientFunctions from '../../services/ClientFunctions';
import '../projects/CreateProject.css';

export default function EditTask() {
  const { projectId, taskId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [form, setForm] = useState({
    name: '',
    description: '',
    priority: 'medium',
    dueDate: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTask = async () => {
      try {
        const taskData = await ClientFunctions.getTaskDetails({
          taskId,
          userId: currentUser.uid
        });

        if (taskData) {
          setForm({
            name: taskData.name || '',
            description: taskData.description || '',
            priority: taskData.priority || 'medium',
            dueDate: taskData.dueDate ? new Date(taskData.dueDate).toISOString().split('T')[0] : ''
          });
        }
      } catch (err) {
        setError(`Error loading task: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadTask();
  }, [taskId, currentUser.uid]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setError('Task name cannot be empty');
      return;
    }

    try {
      setIsSubmitting(true);
      await ClientFunctions.updateTask({
        taskId,
        projectId,
        updates: {
          name: form.name.trim(),
          description: form.description.trim(),
          priority: form.priority,
          dueDate: form.dueDate ? new Date(form.dueDate) : null
        }
      });
      navigate(`/projects/${projectId}/tasks/${taskId}`);
    } catch (err) {
      setError(`Error updating task: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="loading">Loading task data...</div>;
  }

  return (
    <>
      <div className="project-header">
        <div className="header-content">
          <button onClick={() => {
            sessionStorage.setItem('navigatingFromTask', 'true');
            navigate(-1);
          }} className="btn-back">
            <svg xmlns="http://www.w3.org/2000/svg" className="icon-back" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="project-title">Edit Task</h1>
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
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
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
              onChange={(e) => setForm({ ...form, description: e.target.value })}
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
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
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
                  checked={form.priority === 'low'}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
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
                  checked={form.priority === 'medium'}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
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
                  checked={form.priority === 'high'}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
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
              onClick={() => {
                sessionStorage.setItem('navigatingFromTask', 'true');
                navigate(-1);
              }}
              className="btn-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-submit"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}