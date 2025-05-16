import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import './CreateProject.css';

export default function EditTask() {
  const { taskId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    description: '',
    priority: 'low',
    dueDate: '',
    completed: false,
  });
  const [projectId, setProjectId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTask = async () => {
      try {
        const taskRef = doc(db, 'tasks', taskId);
        const taskSnap = await getDoc(taskRef);
        if (!taskSnap.exists()) {
          setError('Görev bulunamadı');
          return;
        }
        const taskData = taskSnap.data();
        setForm({
          name: taskData.name || '',
          description: taskData.description || '',
          priority: taskData.priority || 'low',
          dueDate: taskData.dueDate && taskData.dueDate instanceof Timestamp ? 
            taskData.dueDate.toDate().toISOString().split('T')[0] : '',
          completed: taskData.completed || false,
        });
        setProjectId(taskData.projectId);
      } catch (err) {
        setError(`Görev yüklenirken bir hata oluştu: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    loadTask();
  }, [taskId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
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
  
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setError('Görev adı boş olamaz');
      return;
    }

    try {
      setIsSubmitting(true);
      const taskRef = doc(db, 'tasks', taskId);
      
      // Add updatedAt to the task itself
      const taskData = { 
        ...form,
        updatedAt: Timestamp.now() 
      };
      
      await updateDoc(taskRef, taskData);
      
      // Update the project's timestamp as well
      await updateProjectTimestamp();
      
      sessionStorage.setItem('navigatingFromTask', 'true');
      navigate(-1);
    } catch (err) {
      setError(`Görev güncellenirken bir hata oluştu: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="loading">Görev verileri yükleniyor...</div>;
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
            Geri
          </button>
          <h1 className="project-title">Görevi Düzenle</h1>
        </div>
      </div>

      <div className="create-project">
        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name" className="form-label">Görev Adı</label>
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
            <label htmlFor="description" className="form-label">Açıklama</label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleInputChange}
              rows="4"
              className="form-control"
              placeholder="Bu görev hakkında açıklama yazın (isteğe bağlı)"
            ></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="dueDate" className="form-label">Son Tarih</label>
            <input
              type="date"
              id="dueDate"
              name="dueDate"
              value={form.dueDate}
              onChange={handleInputChange}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Öncelik</label>
            <div className="radio-group">
              <div className="radio-option">
                <input
                  id="priority-low"
                  name="priority"
                  type="radio"
                  value="low"
                  checked={form.priority === 'low'}
                  onChange={handleInputChange}
                  className="radio-input"
                />
                <label htmlFor="priority-low" className="radio-label">
                  <div className="radio-label-title">Düşük</div>
                </label>
              </div>
              <div className="radio-option">
                <input
                  id="priority-medium"
                  name="priority"
                  type="radio"
                  value="medium"
                  checked={form.priority === 'medium'}
                  onChange={handleInputChange}
                  className="radio-input"
                />
                <label htmlFor="priority-medium" className="radio-label">
                  <div className="radio-label-title">Orta</div>
                </label>
              </div>
              <div className="radio-option">
                <input
                  id="priority-high"
                  name="priority"
                  type="radio"
                  value="high"
                  checked={form.priority === 'high'}
                  onChange={handleInputChange}
                  className="radio-input"
                />
                <label htmlFor="priority-high" className="radio-label">
                  <div className="radio-label-title">Yüksek</div>
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
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-submit"
            >
              {isSubmitting ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}