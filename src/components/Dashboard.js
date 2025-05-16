import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import ProjectList from './projects/ProjectList';
import './Dashboard.css';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Page loading animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    
    return () => clearTimeout(timer);
  }, []);

  // Handle search input changes
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div className={`dashboard ${isLoading ? 'loading' : 'loaded'}`}>
      <div className="dashboard-header">
        <div className="user-welcome">
          <span>Hoş geldin, {currentUser ? currentUser.email : 'Ziyaretçi'}</span>
        </div>
        <div className="dashboard-actions">
          <Link to="/projects/create" className="btn-create-project">
            <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Yeni Proje Oluştur
          </Link>
        </div>
      </div>

      <div className="search-container">
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="Proje ara..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
          <svg xmlns="http://www.w3.org/2000/svg" className="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="projects-container">
        {isLoading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : (
          <ProjectList searchTerm={searchTerm} />
        )}
      </div>
      <div className="dashboard-footer">
        <p>&copy; 2023 Proje Yönetim Uygulaması</p>
      </div>  
    </div>
  );
}
