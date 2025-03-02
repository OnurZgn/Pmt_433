import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import './CreateProject.css';

const CreateProject = () => {
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState(''); 
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('active');  
  const [users, setUsers] = useState('');
  const [tasks, setTasks] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        setError('Please log in to create a project.');
      }
    });

    return () => unsubscribe();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      setError('Please log in to create a project.');
      return;
    }

    try {
      const url = "http://localhost:5001/projectmanagmenttool433/us-central1/addProject";
      const projectData = {
        projectName,
        projectDescription,  
        startDate,
        endDate,
        status,
        users: [
          {
            userId: currentUser.uid,
            role: 'owner',
          },
          ...users.split(',').map((email) => ({ email, role: 'member' }))
        ],
        tasks: tasks.split(',').map((task) => task.trim()),
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Project successfully created!');
        navigate('/dashboard');
      } else {
        setError('Failed to create project. Please try again.');
      }
    } catch (err) {
      setError('Project creation failed. Please try again.');
    }
  };

  return (
    <div className="create-project-container">
      <h2>Create New Project</h2>
      <form onSubmit={handleCreateProject}>
        <input
          type="text"
          placeholder="Project Name"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          required
        />
        <textarea
          placeholder="Project Description"
          value={projectDescription}
          onChange={(e) => setProjectDescription(e.target.value)}
        />
        <input
          type="date"
          placeholder="Start Date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <input
          type="date"
          placeholder="End Date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="canceled">Canceled</option>
        </select>
        <input
          type="text"
          placeholder="Users (comma separated emails)"
          value={users}
          onChange={(e) => setUsers(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Tasks (comma separated)"
          value={tasks}
          onChange={(e) => setTasks(e.target.value)}
          required
        />
        <button type="submit">Create Project</button>
      </form>

      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}
    </div>
  );
};

export default CreateProject;
