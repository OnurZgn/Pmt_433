// components/projects/CreateProject.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext'; // Auth context'i eklendi
import './CreateProject.css';


export default function CreateProject() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visibility: 'private'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { createProject } = useProjects();
  const { currentUser } = useAuth(); // Kullanıcı bilgisini al
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return setError('Proje adı boş olamaz');
    }
    
    try {
      setError('');
      setLoading(true);
      
      // Projeyi oluşturan kişiyi collaborators listesine ekle
      const collaborators = [{
        userId: currentUser.uid,
        email: currentUser.email,
        role: 'Proje Sahibi', // Ünvan: Proje Sahibi
        addedAt: new Date()
      }];
      
      const newProject = await createProject({
        name: formData.name,
        description: formData.description,
        visibility: formData.visibility,
        ownerId: currentUser.uid, // Owner ID'yi ekle
        collaborators: collaborators // Collaborators listesini ekle
      });
      
      navigate(`/projects/${newProject.id}`);
    } catch (error) {
      setError('Proje oluşturulamadı: ' + error.message);
    } finally {
      setLoading(false);
    }
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
          <h1 className="project-title">Yeni Proje Oluştur</h1>
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
              value={formData.name}
              onChange={handleChange}
              className="form-control"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="description" className="form-label">Açıklama</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
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
                  checked={formData.visibility === 'private'}
                  onChange={handleChange}
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
                  checked={formData.visibility === 'public'}
                  onChange={handleChange}
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
              onClick={() => navigate('/dashboard')}
              className="btn-cancel"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-submit"
            >
              {loading ? 'Oluşturuluyor...' : 'Proje Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}