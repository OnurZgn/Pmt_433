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

export default function ProjectDetails() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { deleteProject, updateProject } = useProjects();
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

  const { name: editName, description: editDescription, visibility: editVisibility } = editForm;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

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
          setError('Bu projeye erişim izniniz yok.');
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
        setError('Proje bulunamadı.');
        setProject(null);
      }
    } catch (err) {
      setError('Proje yüklenirken bir hata oluştu: ' + err.message);
      console.error("Error fetching project:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId, currentUser]);

  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      // Modified query to handle the index error
      // Option 1: Use only a single orderBy with where
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
      setError('Bu sayfayı görüntülemek için oturum açmanız gerekiyor.');
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
      setError('Bu sayfayı görüntülemek için oturum açmanız gerekiyor.');
    }
  }, [currentUser, fetchProjectDetails, fetchTasks]);

  const handleOpenTaskModal = (task = null) => {
    console.debug('Task modal functionality removed'); // Debug log
  };

  const handleCloseTaskModal = () => {
    console.debug('Task modal functionality removed'); // Debug log
  };

  const handleTaskSaved = () => {
    fetchTasks();
  };

  const handleDelete = async () => {
    if (window.confirm('Bu projeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      try {
        setIsSubmitting(true);
        await deleteProject(projectId);
        navigate('/dashboard', { replace: true });
      } catch (err) {
        setError('Proje silinirken bir hata oluştu: ' + err.message);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!editName.trim()) {
      return setError('Proje adı boş olamaz');
    }

    try {
      setIsSubmitting(true);
      setError('');

      await updateProject(projectId, {
        name: editName,
        description: editDescription,
        visibility: editVisibility
      });

      setProject(prev => ({
        ...prev,
        name: editName,
        description: editDescription,
        visibility: editVisibility,
        updatedAt: new Date()
      }));

      setIsEditing(false);
    } catch (err) {
      setError('Proje güncellenirken bir hata oluştu: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const refreshProject = () => {
    fetchProjectDetails();
    fetchTasks();
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Tarih yok';

    try {
      const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
      return new Intl.DateTimeFormat('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      console.error("Date formatting error:", error);
      return 'Geçersiz tarih';
    }
  };

  const handleEdit = () => {
    navigate(`/projects/${projectId}/edit`);
  };

  const handleUpdateProject = (projectId) => {
    navigate(`/projects/${projectId}/edit`);
  };

  const getProjectRole = () => {
    if (project.isOwner) return 'owner';
    if (project.isCollaborator) return 'collaborator';
    return null;
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
          Panele Dön
        </Link>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="empty-state">
        <p className="empty-state-text">Proje bulunamadı.</p>
        <Link to="/dashboard" className="empty-state-link">
          Panele Dön
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
            Geri
          </button>
          <h1 className="project-title">{project.name}</h1>
          <span className={`badge badge-visibility ${project.visibility}`}>
            {project.visibility === 'public' ? 'Herkese Açık' : 'Özel'}
          </span>
        </div>
      </div>

      <div className="project-content">
        <div className="project-meta">
          <div className="meta-dates">
            <span>Oluşturulma: {formatDate(project.createdAt)}</span>
            {project.updatedAt && project.updatedAt !== project.createdAt && (
              <span> • Güncellenme: {formatDate(project.updatedAt)}</span>
            )}
          </div>
          {canEdit && (
            <div className="meta-actions">
              <button
                onClick={() => handleUpdateProject(project.id)}
                className="form-btn form-btn-secondary"
                disabled={isSubmitting}
              >
                Düzenle
              </button>
              {project.isOwner && (
                <button
                  onClick={handleDelete}
                  className="form-btn form-btn-danger"
                  disabled={isSubmitting}
                >
                  Sil
                </button>
              )}
            </div>
          )}
        </div>

        <div className="project-card">
          <div className="project-body">
            <h3 className="project-section-title">Açıklama</h3>
            <p className="project-description">
              {project.description || 'Bu proje için bir açıklama eklenmemiş.'}
            </p>
          </div>

          {project.isOwner && (
            <div className="project-body">
              <h3 className="project-section-title">Proje Ekibi</h3>
              <CollaboratorsList
                projectId={project.id}
                collaborators={project.collaborators || []}
                ownerId={project.ownerId}
                onCollaboratorUpdated={refreshProject}
              />
            </div>
          )}

          <div className="project-body">
            <h3 className="project-section-title">Görevler</h3>
            {canEdit && (
              <button
                onClick={() => {
                  console.debug('Yeni Görev Ekle button clicked');
                  sessionStorage.setItem('prevTaskCount', tasks.length);
                  navigate(`/projects/${projectId}/tasks/create`);
                }}
                className="btn btn-create-task"
              >
                Yeni Görev Ekle
              </button>
            )}
            {tasksLoading ? (
              <p>Görevler yükleniyor...</p>
            ) : tasks.length > 0 ? (
              <ul className="task-list">
                {tasks.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    canEdit={canEdit}
                    onToggleComplete={refreshProject}
                    onDelete={() => {
                      setTasks(currentTasks => currentTasks.filter(t => t.id !== task.id));
                      fetchTasks();
                    }}
                  />
                ))}
              </ul>
            ) : (
              <p>Bu proje için henüz görev eklenmemiş.</p>
            )}
          </div>

          <div className="project-body">
            <ProjectChat projectId={projectId} canEdit={canEdit} />
          </div>

          <div className="project-footer">
            <span className="project-id">Proje ID: {project.id}</span>
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