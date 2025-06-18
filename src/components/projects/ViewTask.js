import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import ClientFunctions from '../../services/ClientFunctions';
import './ViewTask.css';

export default function ViewTask() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [task, setTask] = useState({
    name: '',
    description: '',
    priority: '',
    dueDate: null,
    subtasks: [],
    completed: false,
    projectId: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch task details function
  const fetchTask = useCallback(async () => {
    if (!currentUser || !taskId) return;

    try {
      setLoading(true);
      setError('');

      const result = await ClientFunctions.getTaskDetails({
        taskId,
        userId: currentUser.uid
      });

      setTask({
        id: taskId,
        ...result
      });
      setCanEdit(result.canEdit);
    } catch (err) {
      setError(`Error loading task: ${err.message}`);
      console.error('Error fetching task:', err);
    } finally {
      setLoading(false);
    }
  }, [taskId, currentUser?.uid]);

  useEffect(() => {
    let isMounted = true;

    const loadTask = async () => {
      if (!isMounted) return;
      await fetchTask();
    };

    loadTask();

    return () => {
      isMounted = false;
    };
  }, [fetchTask, refreshKey]);

  const formatDate = useCallback((timestamp) => {
    if (!timestamp) return 'Not specified';
    try {
      let date;
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp._seconds) {
        date = new Date(timestamp._seconds * 1000);
      } else {
        date = new Date(timestamp);
      }

      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (err) {
      console.error('Date formatting error:', err);
      return 'Invalid date';
    }
  }, []);

  const completionPercentage = useMemo(() => {
    if (!task.subtasks || task.subtasks.length === 0) return 0;
    const completedCount = task.subtasks.filter((subtask) => subtask.completed).length;
    return Math.round((completedCount / task.subtasks.length) * 100);
  }, [task.subtasks]);

  const updateProjectTimestamp = useCallback(async (projectId) => {
    try {
      if (!projectId) return;
      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, {
        updatedAt: Timestamp.now()
      });
    } catch (err) {
      console.error('Error updating project timestamp:', err);
    }
  }, []);

  const updateSubtasksInFirestore = useCallback(async (updatedSubtasks) => {
    if (!taskId) return false;
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, { subtasks: updatedSubtasks });
      return true;
    } catch (err) {
      console.error('Error updating subtasks:', err);
      return false;
    }
  }, [taskId]);

  // Toggle subtask completion
  const handleToggleSubtask = useCallback(async (index) => {
    const currentSubtasks = task.subtasks;
    const updatedSubtasks = currentSubtasks.map((subtask, i) =>
      i === index ? { ...subtask, completed: !subtask.completed } : subtask
    );

    const success = await updateSubtasksInFirestore(updatedSubtasks);
    if (success) {
      setTask(prev => ({ ...prev, subtasks: updatedSubtasks }));
      await updateProjectTimestamp(task.projectId);
    }
  }, [task.subtasks, task.projectId, updateSubtasksInFirestore, updateProjectTimestamp]);

  // Toggle task completion, then refresh
  const handleToggleTaskCompletion = useCallback(async () => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const newCompletionStatus = !task.completed;
      await updateDoc(taskRef, { completed: newCompletionStatus });
      await updateProjectTimestamp(task.projectId);
      setRefreshKey(prev => prev + 1); // Trigger refresh
    } catch (err) {
      console.error('Error updating task completion:', err);
    }
  }, [taskId, task.completed, task.projectId, updateProjectTimestamp]);

  // Add subtask, then refresh
  const handleAddSubtask = useCallback(async () => {
    if (!taskId || !task.projectId || !currentUser?.uid) {
      setError('Required information is missing');
      return;
    }

    const subtaskName = prompt('Enter new subtask name:');
    if (!subtaskName?.trim()) {
      setError('Subtask name cannot be empty');
      return;
    }

    try {
      setError('');
      const result = await ClientFunctions.addSubtask({
        taskId,
        name: subtaskName.trim(),
        projectId: task.projectId,
        userId: currentUser.uid
      });

      if (result.success) {
        setTask(prev => ({
          ...prev,
          subtasks: [...(prev.subtasks || []), result.subtask]
        }));
      }
    } catch (err) {
      console.error('Error adding subtask:', err);
      setError(err.message || 'Failed to add subtask');
    }
  }, [taskId, task.projectId, currentUser?.uid]);

  // Remove subtask, then refresh
  const handleRemoveSubtask = useCallback(async (index) => {
    if (!window.confirm('Are you sure you want to remove this subtask?')) {
      return;
    }

    const updatedSubtasks = task.subtasks.filter((_, i) => i !== index);
    const success = await updateSubtasksInFirestore(updatedSubtasks);
    if (success) {
      await updateProjectTimestamp(task.projectId);
      setRefreshKey(prev => prev + 1); // Trigger refresh
    }
  }, [task.subtasks, task.projectId, updateSubtasksInFirestore, updateProjectTimestamp]);

  const getPriorityBadgeClass = () => {
    if (task.priority?.toLowerCase() === 'low') return 'badge-priority-low';
    if (task.priority?.toLowerCase() === 'medium') return 'badge-priority-medium';
    if (task.priority?.toLowerCase() === 'high') return 'badge-priority-high';
    return '';
  };

  const getStatusBadgeClass = () => {
    return task.completed ? 'badge-status-completed' : 'badge-status-pending';
  };

  if (loading) return <div className="loading">Loading task...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <>
      <div className="project-details">
        <div className="project-header">
          <div className="header-left">
            <button onClick={() => navigate(-1)} className="btn-back">
              <svg xmlns="http://www.w3.org/2000/svg" className="icon-back" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h1 className="project-title">{task.name}</h1>
            <span className={`status-badge ${getStatusBadgeClass()}`}>
              {task.completed ? 'Completed' : 'In Progress'}
            </span>
          </div>
        </div>

        <div className="project-content">
          <div className="task-metadata">
            <div className="meta-dates">
              <div className="metadata-item">
                <span className="metadata-label">Created:</span>
                <span>{task.createdAt ? formatDate(task.createdAt) : 'Not specified'}</span>
              </div>
              {task.updatedAt && (
                <div className="metadata-item">
                  <span className="metadata-label">Last Update:</span>
                  <span>{formatDate(task.updatedAt)}</span>
                </div>
              )}
            </div>
            <div className="meta-actions">
              <button
                onClick={handleToggleTaskCompletion}
                className={`btn ${task.completed ? 'btn-incomplete' : 'btn-complete'}`}
              >
                {task.completed ? 'Mark as Incomplete' : 'Mark as Completed'}
              </button>
              <Link to={`/projects/${task.projectId}/tasks/${task.id}/edit`} className="btn btn-edit">
                Edit Task
              </Link>
            </div>
          </div>

          <div className="view-task-details">
            {task.description && (
              <div className="detail-item">
                <h3 className="project-section-title">Description</h3>
                <p className="project-description">{task.description}</p>
              </div>
            )}

            <div className="detail-item">
              <h3 className="project-section-title">Details</h3>
              <div className="metadata-items">
                <div className="metadata-item">
                  <span className="metadata-label">Due Date:</span>
                  <span>{formatDate(task.dueDate)}</span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">Priority:</span>
                  <span className={`priority-badge ${getPriorityBadgeClass()}`}>
                    {task.priority || 'Normal'}
                  </span>
                </div>
              </div>
              
              <div className="progress-container">
                <div className="progress-label">
                  <span>Progress</span>
                  <span>{completionPercentage}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${completionPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <section className="detail-item">
              <div className="subtasks-header">
                <h3>Subtasks</h3>
                <button onClick={handleAddSubtask} className="btn btn-add">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add Subtask
                </button>
              </div>

              {task.subtasks && task.subtasks.length > 0 ? (
                <ul className="subtask-list">
                  {task.subtasks.map((subtask, index) => (
                    <li key={index} className={`subtask-item ${subtask.completed ? 'completed' : ''}`}>
                      <label className="checkbox-container">
                        <input
                          type="checkbox"
                          checked={subtask.completed}
                          onChange={() => handleToggleSubtask(index)}
                          disabled={!canEdit}
                        />
                        <span className="checkmark"></span>
                        <span className="subtask-name">{subtask.name}</span>
                      </label>
                      {canEdit && (
                        <button
                          className="btn btn-remove-subtask"
                          onClick={() => handleRemoveSubtask(index)}
                          aria-label="Remove subtask"
                        >
                          &times;
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No subtasks yet.</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}