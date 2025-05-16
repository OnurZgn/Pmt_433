// components/projects/ProjectList.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjects } from '../../contexts/ProjectContext';
import ProjectItem from './ProjectItem';
import './ProjectList.css';

export default function ProjectList({ searchTerm = '' }) {
  const { projects, publicProjects, loading, error, fetchProjects } = useProjects();
  const [filter, setFilter] = useState('all');
  const [showPublicProjects, setShowPublicProjects] = useState(false);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [filteredPublicProjects, setFilteredPublicProjects] = useState([]);

  useEffect(() => {
    fetchProjects();
  }, []); 

  // Filter and search projects based on user input
  useEffect(() => {
    // First filter by visibility
    const visibilityFiltered = projects.filter(project => {
      if (filter === 'all') return true;
      return project.visibility === filter;
    });
    
    // Then filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      
      // Search in user's projects
      const searchFiltered = visibilityFiltered.filter(project => 
        project.name.toLowerCase().includes(searchLower) || 
        (project.description && project.description.toLowerCase().includes(searchLower))
      );
      setFilteredProjects(searchFiltered);
      
      // Search in public projects
      const publicSearchFiltered = publicProjects.filter(project => 
        project.name.toLowerCase().includes(searchLower) || 
        (project.description && project.description.toLowerCase().includes(searchLower))
      );
      setFilteredPublicProjects(publicSearchFiltered);
    } else {
      // No search term, just use visibility filter
      setFilteredProjects(visibilityFiltered);
      setFilteredPublicProjects(publicProjects);
    }
  }, [projects, publicProjects, filter, searchTerm]);

  // Sort projects by creation date (newest first)
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    const dateA = a.createdAt?.toDate?.() ?? 0;
    const dateB = b.createdAt?.toDate?.() ?? 0;
    return dateB - dateA;
  });

  // Sort public projects by creation date (newest first)
  const sortedPublicProjects = [...filteredPublicProjects].sort((a, b) => {
    const dateA = a.createdAt?.toDate?.() ?? 0;
    const dateB = b.createdAt?.toDate?.() ?? 0;
    return dateB - dateA;
  });

  if (loading) {
    return (
      <div className="projects-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
        <p>Projeler yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="projects-error">
        <p>Projeler yüklenirken bir hata oluştu: {error}</p>
        <button 
          className="retry-button"
          onClick={() => fetchProjects()}
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  // Display message when no projects match search term
  const noSearchResults = searchTerm.trim() && sortedProjects.length === 0;
  
  return (
    <div className="projects-wrapper">
      {projects.length > 0 && (
        <div className="projects-filters">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Tümü
          </button>
          <button 
            className={`filter-btn ${filter === 'public' ? 'active' : ''}`}
            onClick={() => setFilter('public')}
          >
            Herkese Açık
          </button>
          <button 
            className={`filter-btn ${filter === 'private' ? 'active' : ''}`}
            onClick={() => setFilter('private')}
          >
            Özel
          </button>
        </div>
      )}

      {/* No projects at all */}
      {projects.length === 0 ? (
        <div className="empty-projects">
          <div className="empty-projects-icon">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2,2z" />
            </svg>
          </div>
          <h3>Henüz hiç projeniz yok</h3>
          <p>Yeni bir proje oluşturarak başlayın</p>
          <Link to="/projects/create" className="start-project-btn">
            İlk Projenizi Oluşturun
          </Link>
        </div>
      ) : noSearchResults ? (
        // No search results
        <div className="empty-search-results">
          <div className="empty-search-icon">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3>Arama sonucu bulunamadı</h3>
          <p>"{searchTerm}" ile eşleşen proje bulunamadı</p>
        </div>
      ) : (
        // Display project list
        <div className="project-list">
          {sortedProjects.map(project => (
            <ProjectItem 
              key={project.id} 
              project={project} 
              isOwner={project.isOwner} 
              isCollaborator={project.isCollaborator}
            />
          ))}
        </div>
      )}

      {/* Public Projects Section */}
      {publicProjects.length > 0 && !noSearchResults && (
        <div className="public-projects-section">
          <div className="public-projects-header">
            <h2>Keşfet: Herkese Açık Projeler</h2>
            <button 
              onClick={() => setShowPublicProjects(!showPublicProjects)}
              className="toggle-public-btn"
            >
              {showPublicProjects ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="toggle-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  Gizle
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="toggle-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Keşfet ({sortedPublicProjects.length})
                </>
              )}
            </button>
          </div>

          {showPublicProjects && (
            filteredPublicProjects.length > 0 ? (
              <div className="project-list">
                {sortedPublicProjects.map(project => (
                  <ProjectItem 
                    key={project.id} 
                    project={project} 
                    isPublic={true}
                  />
                ))}
              </div>
            ) : searchTerm ? (
              <div className="empty-search-results small">
                <p>"{searchTerm}" ile eşleşen herkese açık proje bulunamadı</p>
              </div>
            ) : (
              <div className="empty-search-results small">
                <p>Henüz herkese açık proje bulunamadı</p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}