import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CreateProject.css';

const CreateProject = () => {
  const [projectName, setProjectName] = useState('');
  const [users, setUsers] = useState('');
  const [tasks, setTasks] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleCreateProject = async (e) => {
    e.preventDefault();

    try {
      // Firestore Emulator kullanıyorsan LOCALHOST'u kullan
      const url = "http://127.0.0.1:5001/projectmanagmenttool433/us-central1/addProject";

      const projectData = {
        projectName: projectName,
        users: users,
        tasks: tasks,
      };

      // Cloud Function'a GET isteği yap
      const response = await fetch(`${url}?projectName=${encodeURIComponent(projectData.projectName)}&projects=${encodeURIComponent(projectData.users)}&tasks=${encodeURIComponent(projectData.tasks)}`, {
        method: 'GET',
      });

      const data = await response.json();
      console.log("Response from Cloud Function:", data);

      if (response.ok) {
        setMessage('Proje başarıyla oluşturuldu!');
        navigate('/dashboard');  // Başarılıysa Dashboard’a yönlendir
      } else {
        setError('Proje eklenemedi. Lütfen tekrar deneyin.');
      }

    } catch (err) {
      setError('Proje oluşturma başarısız. Lütfen tekrar deneyin.');
    }
  };

  return (
    <div className="create-project-container">
      <h2>Yeni Proje Oluştur</h2>
      <form onSubmit={handleCreateProject}>
        <input
          type="text"
          placeholder="Proje Adı"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Kullanıcı Email (Virgülle Ayır)"
          value={users}
          onChange={(e) => setUsers(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="İşler (Virgülle Ayır)"
          value={tasks}
          onChange={(e) => setTasks(e.target.value)}
          required
        />
        <button type="submit">Proje Oluştur</button>
      </form>
      
      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}
    </div>
  );
};

export default CreateProject;
