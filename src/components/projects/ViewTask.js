import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import './ViewTask.css';

export default function ViewTask() {
  const { taskId } = useParams();
  const navigate = useNavigate();
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

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const taskRef = doc(db, 'tasks', taskId);
        const taskSnap = await getDoc(taskRef);

        if (taskSnap.exists()) {
          const taskData = taskSnap.data();
          setTask({
            id: taskSnap.id,
            ...taskData,
            subtasks: taskData.subtasks || [],
            createdAt: taskData.createdAt || null,
            updatedAt: taskData.updatedAt || null
          });
        } else {
          setError('Görev bulunamadı');
        }
      } catch (err) {
        setError(`Görev yüklenirken hata oluştu: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId]);

 const updateProjectTimestamp = async (projectId) => {
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


  const updateSubtasksInFirestore = async (updatedSubtasks) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, { subtasks: updatedSubtasks });
      return true;
    } catch (err) {
      console.error('Alt görevleri güncellerken hata:', err);
      return false;
    }
  };

  const handleToggleSubtask = async (index) => {
    const updatedSubtasks = task.subtasks.map((subtask, i) =>
      i === index ? { ...subtask, completed: !subtask.completed } : subtask
    );

    const success = await updateSubtasksInFirestore(updatedSubtasks);
    if (success) {
      await updateProjectTimestamp(task.projectId);
      setTask((prev) => ({ ...prev, subtasks: updatedSubtasks }));
    }
  };

  const handleToggleTaskCompletion = async () => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const newCompletionStatus = !task.completed;
      await updateDoc(taskRef, { completed: newCompletionStatus });
      await updateProjectTimestamp(task.projectId);
      setTask((prev) => ({ ...prev, completed: newCompletionStatus }));
    } catch (err) {
      console.error('Görev durumunu güncellerken hata:', err);
    }
  };

  const calculateCompletionPercentage = (subtasks) => {
    if (!subtasks || subtasks.length === 0) return 0;
    const completedCount = subtasks.filter((subtask) => subtask.completed).length;
    return Math.round((completedCount / subtasks.length) * 100);
  };

  const handleAddSubtask = async () => {
    const subtaskName = prompt('Yeni alt görevin adını girin:');
    if (!subtaskName?.trim()) return;

    const newSubtask = { name: subtaskName.trim(), completed: false };
    const updatedSubtasks = [...(task.subtasks || []), newSubtask];

    const success = await updateSubtasksInFirestore(updatedSubtasks);
    if (success) {
      await updateProjectTimestamp(task.projectId);
      setTask((prev) => ({ ...prev, subtasks: updatedSubtasks }));
    }
  };

  const handleRemoveSubtask = async (index) => {
    if (!window.confirm('Bu alt görevi silmek istediğinizden emin misiniz?')) {
      return;
    }

    const updatedSubtasks = task.subtasks.filter((_, i) => i !== index);
    const success = await updateSubtasksInFirestore(updatedSubtasks);
    if (success) {
      await updateProjectTimestamp(task.projectId);
      setTask((prev) => ({ ...prev, subtasks: updatedSubtasks }));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Belirtilmemiş';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      return 'Geçersiz tarih';
    }
  };

  if (loading) return <div className="loading">Görev yükleniyor...</div>;
  if (error) return <div className="error-message">{error}</div>;

  const completionPercentage = calculateCompletionPercentage(task.subtasks);

  return (
    <>
      <div className="project-details">
        <div className="project-header">
          <div className="header-left">
            <button onClick={() => navigate(-1)} className="btn-back">
              <svg xmlns="http://www.w3.org/2000/svg" className="icon-back" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Geri
            </button>
            <h1 className="project-title">{task.name}</h1>
            <span className={`status-badge ${task.completed ? 'completed' : 'pending'}`}>
              {task.completed ? 'Tamamlandı' : 'Devam Ediyor'}
            </span>
          </div>
        </div>

        <div className="project-content">
          <div className="task-metadata">
            <div className="meta-dates">
              <div className="metadata-item">
                <span className="metadata-label">Oluşturulma:</span>
                <span>{formatDate(task.createdAt?.toDate())}</span>
              </div>
              {task.updatedAt && (
                <div className="metadata-item">
                  <span className="metadata-label">Son Güncelleme:</span>
                  <span>{formatDate(task.updatedAt?.toDate())}</span>
                </div>
              )}
            </div>
            <div className="meta-actions">
              <button
                onClick={handleToggleTaskCompletion}
                className={`btn ${task.completed ? 'btn-incomplete' : 'btn-complete'}`}
              >
                {task.completed ? 'Tamamlanmadı İşaretle' : 'Tamamlandı İşaretle'}
              </button>
              <Link to={`/projects/${task.projectId}/tasks/${task.id}/edit`} className="btn btn-edit">
                Görevi Düzenle
              </Link>
            </div>
          </div>

          <div className="view-task-details">
            {task.description && (
              <div className="detail-item">
                <h3 className="project-section-title">Açıklama</h3>
                <p className="project-description">{task.description}</p>
              </div>
            )}

            <div className="detail-item">
              <h3 className="project-section-title">Detaylar</h3>
              <div className="metadata-items">
                <div className="metadata-item">
                  <span className="metadata-label">Son Tarih:</span>
                  <span>{formatDate(task.dueDate)}</span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">Öncelik:</span>
                  <span className={`priority-badge priority-${task.priority?.toLowerCase() || 'normal'}`}>
                    {task.priority || 'Normal'}
                  </span>
                </div>
              </div>
              
              <div className="progress-container">
                <div className="progress-label">
                  <span>İlerleme</span>
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
                <h3>Alt Görevler</h3>
                <button onClick={handleAddSubtask} className="btn btn-add">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Alt Görev Ekle
                </button>
              </div>

              {task.subtasks && task.subtasks.length > 0 ? (
                <ul className="subtask-list">
                  {task.subtasks.map((subtask, index) => (
                    <li key={index} className={`subtask-item ${subtask.completed ? 'subtask-completed' : ''}`}>
                      <div className="subtask-content">
                        <input
                          type="checkbox"
                          id={`subtask-${index}`}
                          checked={subtask.completed}
                          onChange={() => handleToggleSubtask(index)}
                          className="subtask-checkbox"
                        />
                        <label
                          htmlFor={`subtask-${index}`}
                          className={subtask.completed ? 'completed' : ''}
                        >
                          {subtask.name}
                        </label>
                      </div>
                      <button
                        onClick={() => handleRemoveSubtask(index)}
                        className="btn btn-remove"
                        title="Alt görevi sil"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-subtasks">Henüz alt görev eklenmemiş.</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}