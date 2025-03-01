import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth'; // Import Firebase Auth
import './CreateProject.css';

const CreateProject = () => {
  const [projectName, setProjectName] = useState('');
  const [users, setUsers] = useState('');
  const [tasks, setTasks] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null); // State to store the current user
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);  // Set the current user
      } else {
        setError('Please log in to create a project.');
      }
    });

    // Cleanup the subscription on unmount
    return () => unsubscribe();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
  
    if (!currentUser) {
      setError('Please log in to create a project.');
      return;
    }
  
    try {
      // Firestore Emulator kullanıyorsan LOCALHOST'u kullan
      const url = "http://127.0.0.1:5001/projectmanagmenttool433/us-central1/addProject";
  
      // Constructing the projectData object
      const projectData = {
        projectName: projectName,
        users: [
          {
            userId: currentUser.uid, // Add the current user's UID as the "owner"
            role: 'owner', // Set the current user's role as "owner"
          },
          // Add other users as members (split by commas)
          ...users.split(',').map((email) => ({ email, role: 'member' }))
        ],
        tasks: tasks.split(',').map((task) => task.trim()), // Assuming tasks are comma separated
      };
  
      console.log('Project Data:', projectData);  // Log project data
  
      // Cloud Function'a POST isteği yap
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),  // Send the project data as the request body
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
      console.error('Error creating project:', err);  // Log any errors
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
          placeholder="Kullanıcı Email (Virgülle Ayır), kendini owner olarak oto ekliyor"
          value={users}
          onChange={(e) => setUsers(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="İşler (Virgülle Ayır), sonra burası proje oluştuktan sonra yapılacak"
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
