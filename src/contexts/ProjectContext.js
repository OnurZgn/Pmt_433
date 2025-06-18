// contexts/ProjectContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc,
  doc,
  updateDoc,
  Timestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { useAuth } from './AuthContext';

const ProjectContext = createContext();

export function useProjects() {
  return useContext(ProjectContext);
}

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [publicProjects, setPublicProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();

  // Fetch projects user has access to (owned + shared with user + public)
  async function fetchProjects() {
    if (!currentUser) {
      setProjects([]);
      setPublicProjects([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const projectsRef = collection(db, "projects");
      const allProjectsSnapshot = await getDocs(projectsRef);

      const mainProjects = [];
      const publicProjectsList = [];

      allProjectsSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const isOwner = data.ownerId === currentUser.uid;
        const isCollaborator = Array.isArray(data.collaborators) &&
          data.collaborators.some(
            collab => typeof collab === 'string'
              ? collab === currentUser.uid
              : collab.userId === currentUser.uid
          );
        const isPublic = data.visibility === 'public';

        // Main projects: owner or collaborator (any visibility)
        if (isOwner) {
          mainProjects.push({
            id: docSnap.id,
            ...data,
            isOwner: true,
            createdAt: data.createdAt || Timestamp.now(),
            updatedAt: data.updatedAt || Timestamp.now()
          });
        } else if (isCollaborator) {
          mainProjects.push({
            id: docSnap.id,
            ...data,
            isCollaborator: true,
            createdAt: data.createdAt || Timestamp.now(),
            updatedAt: data.updatedAt || Timestamp.now()
          });
        } else if (isPublic) {
          // Public section: not owner, not collaborator, and public
          publicProjectsList.push({
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt || Timestamp.now(),
            updatedAt: data.updatedAt || Timestamp.now()
          });
        }
        // else: private and not owner/collaborator => do not show
      });

      // Sort both lists by createdAt descending
      mainProjects.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
      publicProjectsList.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

      setProjects(mainProjects);
      setPublicProjects(publicProjectsList);
    } catch (error) {
      console.error("Error fetching projects:", error);
      setError("Projeler yüklenirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  // Create a new project
  async function createProject(projectData) {
    if (!currentUser) return;
    
    try {
      const newProject = {
        name: projectData.name.trim(),
        description: projectData.description.trim(),
        visibility: projectData.visibility || 'private',
        ownerId: currentUser.uid,
        collaborators: [], // Initialize empty array for collaborators
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      const docRef = await addDoc(collection(db, "projects"), newProject);
      
      // Update local state
      const createdProject = { id: docRef.id, ...newProject, isOwner: true };
      setProjects(prevProjects => [createdProject, ...prevProjects]);
      
      // If the project is public, also add to public projects
      if (newProject.visibility === 'public') {
        setPublicProjects(prevPublicProjects => [createdProject, ...prevPublicProjects]);
      }
      
      return createdProject;
    } catch (error) {
      console.error("Error creating project:", error);
      throw error;
    }
  }

  // Update project
  async function updateProject(projectId, projectData) {
    if (!currentUser) return;
    
    try {
      const projectRef = doc(db, "projects", projectId);
      
      const updateData = {
        ...(projectData.name !== undefined && { name: projectData.name.trim() }),
        ...(projectData.description !== undefined && { description: projectData.description.trim() }),
        ...(projectData.visibility !== undefined && { visibility: projectData.visibility }),
        updatedAt: Timestamp.now()
      };
      
      await updateDoc(projectRef, updateData);
      
      // Update local state
      setProjects(projects.map(project => 
        project.id === projectId 
          ? { ...project, ...updateData } 
          : project
      ));
      
      // Handle visibility changes for public projects list
      if (projectData.visibility === "public") {
        const projectInPublic = publicProjects.find(p => p.id === projectId);
        if (!projectInPublic) {
          // Get the updated project to add to public projects if needed
          const updatedProject = projects.find(p => p.id === projectId);
          if (updatedProject) {
            setPublicProjects(prev => [{ ...updatedProject, ...updateData }, ...prev]);
          }
        } else {
          // Update the existing public project
          setPublicProjects(prev => prev.map(p => 
            p.id === projectId ? { ...p, ...updateData } : p
          ));
        }
      } else if (projectData.visibility === "private") {
        // Remove from public projects if visibility changed to private
        setPublicProjects(prev => prev.filter(p => p.id !== projectId));
      }
      
      return true;
    } catch (error) {
      console.error("Error updating project:", error);
      throw error;
    }
  }

  // Delete project
  async function deleteProject(projectId) {
    if (!currentUser) return;
    
    try {
      await deleteDoc(doc(db, "projects", projectId));
      
      // Update local state
      setProjects(projects.filter(project => project.id !== projectId));
      setPublicProjects(publicProjects.filter(project => project.id !== projectId));
      
      return true;
    } catch (error) {
      console.error("Error deleting project:", error);
      throw error;
    }
  }

  // Add collaborator to project
  async function addCollaborator(projectId, userId) {
    if (!currentUser) return;
    
    try {
      const projectRef = doc(db, "projects", projectId);
      await updateDoc(projectRef, {
        collaborators: arrayUnion(userId),
        updatedAt: Timestamp.now()
      });
      
      // Update local state
      setProjects(projects.map(project => 
        project.id === projectId 
          ? { 
              ...project, 
              collaborators: [...(project.collaborators || []), userId],
              updatedAt: Timestamp.now()
            } 
          : project
      ));
      
      // Update in public projects if necessary
      const publicProject = publicProjects.find(p => p.id === projectId);
      if (publicProject) {
        setPublicProjects(prev => prev.map(p => 
          p.id === projectId
            ? {
                ...p,
                collaborators: [...(p.collaborators || []), userId],
                updatedAt: Timestamp.now()
              }
            : p
        ));
      }
      
      return true;
    } catch (error) {
      console.error("Error adding collaborator:", error);
      throw error;
    }
  }

  // Remove collaborator from project
  async function removeCollaborator(projectId, userId) {
    if (!currentUser) return;
    
    try {
      const projectRef = doc(db, "projects", projectId);
      await updateDoc(projectRef, {
        collaborators: arrayRemove(userId),
        updatedAt: Timestamp.now()
      });
      
      // Update local state
      setProjects(projects.map(project => 
        project.id === projectId 
          ? { 
              ...project, 
              collaborators: (project.collaborators || []).filter(id => id !== userId),
              updatedAt: Timestamp.now()
            } 
          : project
      ));
      
      // Update in public projects if necessary
      const publicProject = publicProjects.find(p => p.id === projectId);
      if (publicProject) {
        setPublicProjects(prev => prev.map(p => 
          p.id === projectId
            ? {
                ...p,
                collaborators: (p.collaborators || []).filter(id => id !== userId),
                updatedAt: Timestamp.now()
              }
            : p
        ));
      }
      
      return true;
    } catch (error) {
      console.error("Error removing collaborator:", error);
      throw error;
    }
  }

  // Check if user has access to a specific project
  function hasAccessToProject(projectId) {
    // Check if project exists in user's projects (owned or shared)
    const project = projects.find(p => p.id === projectId);
    if (project) return true;
    
    // Check if it's a public project
    const publicProject = publicProjects.find(p => p.id === projectId);
    if (publicProject) return true;
    
    return false;
  }

  // Check if user is owner of a specific project
  function isProjectOwner(projectId) {
    const project = projects.find(p => p.id === projectId);
    return project?.isOwner === true;
  }

  // Check if user is collaborator of a specific project
  function isProjectCollaborator(projectId) {
    const project = projects.find(p => p.id === projectId);
    return project?.isCollaborator === true;
  }

  // Effect to load projects when currentUser changes
  useEffect(() => {
    if (currentUser) {
      fetchProjects();
    } else {
      setProjects([]);
      setPublicProjects([]);
      setLoading(false);
    }
  }, [currentUser]);

  const value = {
    projects,
    publicProjects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    fetchProjects,
    addCollaborator,
    removeCollaborator,
    hasAccessToProject,
    isProjectOwner,
    isProjectCollaborator
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}