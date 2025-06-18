// components/projects/ProjectDetails.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useProjects } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import CollaboratorsList from './CollaboratorsList';
import './ProjectDetails.css';
import TaskItem from './TaskItem';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import EditProject from './EditProject';
import ProjectChat from './ProjectChat';
import './CollaboratorsList.css';
import './Form.css';
import { ClientFunctions } from '../../services/ClientFunctions';

export default function ProjectDetails() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { deleteProject } = useProjects();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // States for editing
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    visibility: 'private'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States for tasks
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  const fetchProjectDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const projectRef = doc(db, "projects", projectId);
      const projectSnap = await getDoc(projectRef);

      if (projectSnap.exists()) {
        const projectData = {
          id: projectSnap.id,
          ...projectSnap.data(),
          ownerId: projectSnap.data().ownerId // Make sure this is included
        };

        const isOwner = projectData.ownerId === currentUser?.uid;
        const isCollaborator = projectData.collaborators?.some(collab =>
          typeof collab === 'string'
            ? collab === currentUser?.uid
            : collab.userId === currentUser?.uid
        );
        const isPublic = projectData.visibility === 'public';

        if (!isOwner && !isCollaborator && !isPublic) {
          setError('You do not have access to this project.');
          setProject(null);
          return;
        }

        projectData.isOwner = isOwner;
        projectData.isCollaborator = isCollaborator;

        setProject(projectData);
        setEditForm({
          name: projectData.name,
          description: projectData.description || '',
          visibility: projectData.visibility
        });
      } else {
        setError('Project not found.');
        setProject(null);
      }
    } catch (err) {
      setError('An error occurred while loading the project: ' + err.message);
      console.error("Error fetching project:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId, currentUser]);

  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const tasksRef = collection(db, 'tasks');
      const q = query(
        tasksRef,
        where('projectId', '==', projectId),
        orderBy('createdAt', 'desc')
      );

      try {
        const snap = await getDocs(q);
        setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (indexError) {
        console.error("Index error:", indexError);

        // Fallback: if the index doesn't exist, try querying without the orderBy
        if (indexError.code === 'failed-precondition' || indexError.message.includes('index')) {
          console.log("Falling back to query without orderBy due to missing index");
          const fallbackQuery = query(
            tasksRef,
            where('projectId', '==', projectId)
          );
          const fallbackSnap = await getDocs(fallbackQuery);

          // Sort the results in memory instead
          const taskDocs = fallbackSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          taskDocs.sort((a, b) => {
            const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
            const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
            return dateB - dateA; // descending order
          });

          setTasks(taskDocs);

          // Show a message to the admin to create the index
          if (project?.isOwner) {
            console.warn("ADMIN NOTICE: Please create the required Firestore index for tasks by projectId and createdAt.");
            console.warn("You can create it here: https://console.firebase.google.com/project/_/firestore/indexes");
          }
        } else {
          throw indexError; // Re-throw if it's a different error
        }
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setTasksLoading(false);
    }
  }, [projectId, project?.isOwner]);

  useEffect(() => {
    if (currentUser) {
      fetchProjectDetails();
      fetchTasks();
    } else {
      setLoading(false);
      setError('This page requires you to be logged in.');
    }
  }, [currentUser, fetchProjectDetails, fetchTasks]);
  const [hasFocus, setHasFocus] = useState(false);

  useEffect(() => {
    const handleFocus = () => {
      setHasFocus(true);
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    if (hasFocus && currentUser) {
      fetchTasks();
      setHasFocus(false);
    }
  }, [hasFocus, currentUser, fetchTasks]);

  useEffect(() => {
    if (currentUser) {
      fetchProjectDetails();
      fetchTasks();
    } else {
      setLoading(false);
      setError('This page requires you to be logged in.');
    }
  }, [currentUser, fetchProjectDetails, fetchTasks]);


  const handleDelete = async () => {
    if(window.confirm('Do you really want to delete this project? This action cannot be undone.')) {
      try {
        setIsSubmitting(true);
        await deleteProject(projectId);
        navigate('/dashboard', { replace: true });
      } catch (err) {
        setError('An error occurred while deleting the project: ' + err.message);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const refreshProject = () => {
    fetchProjectDetails();
    fetchTasks();
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Invalid date';

    try {
      const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      console.error("Date formatting error:", error);
      return 'Invalid date';
    }
  };

  const handleUpdateProject = (projectId) => {
    navigate(`/projects/${projectId}/edit`);
  };

  const handleToggleComplete = async (taskId, currentStatus) => {
    try {
      await ClientFunctions.updateTask({
        taskId,
        projectId,
        updates: {
          completed: !currentStatus
        }
      });

      setTasks(currentTasks =>
        currentTasks.map(task =>
          task.id === taskId
            ? { ...task, completed: !currentStatus }
            : task
        )
      );
    } catch (error) {
      setError('An error occurred while updating the task: ' + error.message);
    }
  };

  // Update the task deletion handler to simply refresh tasks
  const handleTaskDeleted = () => {
    fetchTasks();
  };

  const taskProps = {
    onDelete: handleTaskDeleted,
    onToggleComplete: handleToggleComplete,
    canEdit: project?.isOwner || project?.isCollaborator
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <Link to="/dashboard" className="back-link">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="empty-state">
        <p className="empty-state-text">Project cannot be found.</p>
        <Link to="/dashboard" className="empty-state-link">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const canEdit = project.isOwner || project.isCollaborator;

  return (
    <div className="project-details">
      <div className="project-header">
        <div className="header-left">
          <button onClick={() => navigate('/dashboard')} className="btn-back">
            <svg xmlns="http://www.w3.org/2000/svg" className="icon-back" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="project-title">{project.name}</h1>
          <span className={`badge badge-visibility ${project.visibility}`}>
            {project.visibility === 'public' ? 'Public' : 'Private'}
          </span>
        </div>
      </div>

      <div className="project-content">
        <div className="project-meta">
          <div className="meta-dates">
            <span>Created At: {formatDate(project.createdAt)}</span>
            {project.updatedAt && project.updatedAt !== project.createdAt && (
              <span> • Updated At: {formatDate(project.updatedAt)}</span>
            )}
          </div>
          {canEdit && (
            <div className="meta-actions">
              <button
                onClick={() => handleUpdateProject(project.id)}
                className="form-btn form-btn-secondary"
                disabled={isSubmitting}
              >
                Edit
              </button>
              {project.isOwner && (
                <button
                  onClick={handleDelete}
                  className="form-btn form-btn-danger"
                  disabled={isSubmitting}
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>

        <div className="project-card">
          <div className="project-body">
            <h3 className="project-section-title">Description</h3>
            <p className="project-description">
              {project.description || 'There is no description for this project yet.'}
            </p>
          </div>

          {project.isOwner && (
            <div className="project-body">
              <h3 className="project-section-title">Project Members</h3>
              <CollaboratorsList
                projectId={project.id}
                collaborators={project.collaborators || []}
                ownerId={project.ownerId}
                onCollaboratorUpdated={refreshProject}
              />
            </div>
          )}

          <div className="project-body">
            <h3 className="project-section-title">Tasks</h3>
            {canEdit && (
              <button
                onClick={() => {
                  console.debug('Add new task button clicked');
                  sessionStorage.setItem('prevTaskCount', tasks.length);
                  navigate(`/projects/${projectId}/tasks/create`);
                }}
                className="btn btn-create-task"
              >
                Add New Task
              </button>
            )}
            {tasksLoading ? (
              <p>Tasks are loading...</p>
            ) : tasks.length > 0 ? (
              <div className="list">
                {tasks.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    {...taskProps}
                  />
                ))}
              </div>
            ) : (
              <p>There are no tasks in this project yet.</p>
            )}
          </div>

          <div className="project-body">
            <ProjectChat projectId={projectId} canEdit={canEdit} />
          </div>

          <div className="project-footer">
            <span className="project-id">Project ID: {project.id}</span>
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="edit-overlay">
          <EditProject
            project={project}
            onUpdate={handleUpdateProject}
            onClose={() => setIsEditing(false)}
          />
        </div>
      )}
    </div>
  );
}