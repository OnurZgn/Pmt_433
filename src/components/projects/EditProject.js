// components/projects/EditProject.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
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
        const projectRef = doc(db, 'projects', projectId);
        const projectSnap = await getDoc(projectRef);

        if (!projectSnap.exists()) {
          setError('Proje bulunamadı');
          return;
        }

        const projectData = projectSnap.data();
        setForm({
          name: projectData.name || '',
          description: projectData.description || '',
          visibility: projectData.visibility || 'private',
        });
      } catch (err) {
        setError(`Proje yüklenirken bir hata oluştu: ${err.message}`);
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
      setError('Proje adı boş olamaz');
      return;
    }

    try {
      setIsSubmitting(true);
      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, { 
        ...form,
        updatedAt: Timestamp.now() 
      });
      navigate(`/projects/${projectId}`);
    } catch (err) {
      setError(`Proje güncellenirken bir hata oluştu: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="loading">Proje verileri yükleniyor...</div>;
  }

  return (
    <>
      <div className="project-header">
        <div className="header-content">
          <button onClick={() => navigate(-1)} className="btn-back">
            <svg xmlns="http://www.w3.org/2000/svg" className="icon-back" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Geri
          </button>
          <h1 className="project-title">Projeyi Düzenle</h1>
        </div>
      </div>

      <div className="create-project">
        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name" className="form-label">Proje Adı</label>
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
              placeholder="Bu proje hakkında açıklama yazın (isteğe bağlı)"
            ></textarea>
          </div>

          <div className="form-group">
            <label className="form-label">Görünürlük</label>
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
                  <div className="radio-label-title">Özel</div>
                  <div className="radio-label-description">
                    Sadece siz ve davet ettiğiniz kişiler görebilir ve düzenleyebilir
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
                  <div className="radio-label-title">Herkese açık</div>
                  <div className="radio-label-description">
                    Herkes bu projeyi görüntüleyebilir, sadece izin verilenler düzenleyebilir
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
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-submit"
            >
              {isSubmitting ? 'Kaydediliyor...' : 'Proje Güncelle'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}