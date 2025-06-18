// components/projects/TaskItem.js
import React from 'react';
import { Link } from 'react-router-dom';
import { updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import './TaskItem.css';
import './List.css';
import ClientFunctions from '../../services/ClientFunctions';

export default function TaskItem({
  task,
  canEdit,
  onToggleComplete,
  onDelete,
}) {
  const {
    id,
    name,
    completed,
    dueDate,
    assignedToName,
    priority,
    description,
    projectId,
  } = task;

  const formatDate = (ts) => {
    // Check if timestamp is defined
    if (!ts) return '–';
    
    // Check if it's a Firestore Timestamp
    if (ts?.toDate && typeof ts.toDate === 'function') {
      return new Intl.DateTimeFormat('tr-TR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(ts.toDate());
    }
    
    // Handle string date or timestamp with _seconds property
    if (ts._seconds) {
      return new Intl.DateTimeFormat('tr-TR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date(ts._seconds * 1000));
    }
    
    // If it's a string or another format, try to create a date
    try {
      return new Intl.DateTimeFormat('tr-TR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date(ts));
    } catch (e) {
      console.error('Error formatting date:', e);
      return '–';
    }
  };

  const getPriorityBadgeClass = () => {
    if (priority === 'low') return 'badge-priority-low';
    if (priority === 'medium') return 'badge-priority-medium';
    if (priority === 'high') return 'badge-priority-high';
    return '';
  };

  const calculateCompletionPercentage = (subtasks) => {
    if (!subtasks || subtasks.length === 0) return 0;
    const completedCount = subtasks.filter((subtask) => subtask.completed).length;
    return Math.round((completedCount / subtasks.length) * 100);
  };

  // Update the project's updatedAt timestamp whenever a task is modified
  const updateProjectTimestamp = async () => {
    try {
      if (!projectId) return;
      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, {
        updatedAt: Timestamp.now()
      });
    } catch (err) {
      console.error('Error updating project timestamp:', err);
    }
  };

  const handleCheckboxChange = async () => {
    if (!canEdit) return; // Prevent unauthorized users from toggling
    try {
      const taskRef = doc(db, 'tasks', id);
      await updateDoc(taskRef, { 
        completed: !completed,
        updatedAt: Timestamp.now()
      });
      
      // Update project timestamp when task completion status changes
      await updateProjectTimestamp();
      
      onToggleComplete(id, completed); // Update parent state
    } catch (err) {
      console.error('Error updating task completion:', err);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canEdit) return;
    
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }
    
    try {
      await ClientFunctions.deleteTask({
        taskId: id,
        projectId
      });
      
      if (onDelete) {
        onDelete(id);
      }
    } catch (err) {
      console.error('Error deleting task:', err);
      alert('Failed to delete task: ' + err.message);
    }
  };

  // Calculate if task is overdue
  const isOverdue = () => {
    if (!dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = dueDate.toDate ? dueDate.toDate() : new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today && !completed;
  };

  // Get progress bar color based on completion percentage
  const getProgressBarColor = (percentage) => {
    if (percentage < 30) return 'progress-low';
    if (percentage < 70) return 'progress-medium';
    return 'progress-high';
  };

  // Get short description preview
  const getDescriptionPreview = () => {
    if (!description) return null;
    return description.length > 50 ? `${description.substring(0, 50)}...` : description;
  };

  return (
    <div className={`list-item task-item ${completed ? 'completed-task' : ''} ${isOverdue() ? 'overdue-task' : ''}`}>
      <div className="list-main">
        <div className="task-header">
          {canEdit && (
            <input
              type="checkbox"
              checked={completed}
              onChange={handleCheckboxChange}
              className="task-checkbox"
            />
          )}
          {canEdit ? (
            <Link to={`/projects/${projectId}/tasks/${id}`} className="task-title-link">
              <h4 className={`task-title ${completed ? 'completed' : ''}`}>{name}</h4>
            </Link>
          ) : (
            <h4 className={`task-title ${completed ? 'completed' : ''}`}>{name}</h4>
          )}
        </div>
        {getDescriptionPreview() && (
          <div className="task-description-preview">
            {getDescriptionPreview()}
          </div>
        )}
        <div className="task-meta">
          {dueDate && (
            <span className={`task-due ${isOverdue() ? 'overdue' : ''}`}>
              <i className="icon-calendar"></i> {formatDate(dueDate)}
            </span>
          )}
          {assignedToName && (
            <span className="task-assignee">
              <i className="icon-user"></i> {assignedToName}
            </span>
          )}
          {priority && (
            <span className={`task-priority ${getPriorityBadgeClass()}`}>
              {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </span>
          )}
        </div>
        <div className="task-progress">
          <div className="progress-bar-container">
            <div
              className={`progress-bar ${getProgressBarColor(calculateCompletionPercentage(task.subtasks))}`}
              style={{ width: `${calculateCompletionPercentage(task.subtasks)}%` }}
            ></div>
          </div>
          <span className="task-completion">
            {calculateCompletionPercentage(task.subtasks)}% Completed
          </span>
        </div>
      </div>
      {canEdit && (
        <div className="list-actions">
          <Link to={`/projects/${task.projectId}/tasks/${id}/edit`} className="list-action-btn">
            <i className="icon-edit"></i> Edit
          </Link>
          <button onClick={handleDelete} className="list-action-btn delete">
            <i className="icon-trash"></i> Delete
          </button>
        </div>
      )}
    </div>
  );
}