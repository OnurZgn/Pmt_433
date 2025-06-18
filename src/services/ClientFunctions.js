import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  arrayUnion, 
  arrayRemove, 
  addDoc, 
  deleteDoc,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from '../firebase';

// Helper function for error handling
const handleError = (functionName, error) => {
  console.error(`Error in ${functionName}:`, error);
  throw new Error(`${functionName} failed: ${error.message}`);
};

// Basic functions used by class methods
export const getUserProfileData = async (userId) => {
  try {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    const trimmedUserId = userId.trim();
    const userDoc = await getDoc(doc(db, 'users', trimmedUserId));
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    
    return {
      id: trimmedUserId,
      ...userData,
      createdAt: userData.createdAt?.toDate().toISOString() || null,
    };
  } catch (error) {
    handleError('getUserProfileData', error);
  }
};

// Update user profile data
export const updateUserProfileData = async (userId, displayName) => {
  try {
    if (!userId || !displayName) {
      throw new Error('User ID and display name are required');
    }

    // Check if user exists
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    // Update user information in Firestore
    await updateDoc(doc(db, 'users', userId), {
      displayName: displayName
    });

    // Update user information in Firebase Auth
    if (auth.currentUser && auth.currentUser.uid === userId) {
      await updateProfile(auth.currentUser, {
        displayName: displayName
      });
    }

    return { success: true, message: 'User profile updated successfully.' };
  } catch (error) {
    handleError('updateUserProfileData', error);
  }
};

// Get project collaborators
export const getProjectCollaborators = async (projectId) => {
  try {
    if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
      throw new Error('Project ID is required');
    }

    const trimmedProjectId = projectId.trim();
    const projectDoc = await getDoc(doc(db, 'projects', trimmedProjectId));
    
    if (!projectDoc.exists()) {
      throw new Error('Project not found');
    }

    const projectData = projectDoc.data();
    const ownerId = projectData.ownerId;
    const collaborators = projectData.collaborators || [];

    // Get owner information
    const ownerDoc = await getDoc(doc(db, 'users', ownerId));
    let collaboratorsData = [];

    if (ownerDoc.exists()) {
      const ownerData = ownerDoc.data();
      collaboratorsData.push({
        id: ownerId,
        ...ownerData,
        isOwner: true,
        role: 'Project Owner',
        createdAt: ownerData.createdAt ? ownerData.createdAt.toDate().toISOString() : null
      });
    }

    // Get other collaborators' information
    for (const collab of collaborators) {
      const collabId = typeof collab === 'string' ? collab : collab.userId;
      
      // Skip if collaborator is the owner
      if (collabId === ownerId) continue;
      
      const userDoc = await getDoc(doc(db, 'users', collabId));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        collaboratorsData.push({
          id: collabId,
          ...userData,
          isOwner: false,
          role: typeof collab === 'object' && collab.role ? collab.role : 'Member',
          createdAt: userData.createdAt ? userData.createdAt.toDate().toISOString() : null
        });
      }
    }

    return { collaborators: collaboratorsData, projectId: trimmedProjectId };
  } catch (error) {
    handleError('getProjectCollaborators', error);
  }
};

// Add project collaborator
export const addProjectCollaborator = async (projectId, email, role = 'Member') => {
  try {
    if (!projectId || !email) {
      throw new Error('Project ID and user email are required');
    }

    // Find user by email
    const usersRef = collection(db, 'users');
    const userQuery = query(usersRef, where('email', '==', email.toLowerCase().trim()));
    const userSnapshot = await getDocs(userQuery);

    if (userSnapshot.empty) {
      throw new Error('No user found with this email address');
    }

    const userDoc = userSnapshot.docs[0];
    const userId = userDoc.id;

    // Get project data
    const projectRef = doc(db, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);

    if (!projectDoc.exists()) {
      throw new Error('Project not found');
    }

    const projectData = projectDoc.data();

    // Check if user is already the owner
    if (projectData.ownerId === userId) {
      throw new Error('This user is already the project owner');
    }

    // Check if user is already a collaborator
    const collaborators = projectData.collaborators || [];
    const isAlreadyCollaborator = collaborators.some(collab => 
      typeof collab === 'string' ? collab === userId : collab.userId === userId
    );

    if (isAlreadyCollaborator) {
      throw new Error('This user is already added to the project');
    }

    // Create the new collaborator object with current timestamp
    const newCollaborator = {
      userId,
      role,
      addedAt: Timestamp.now() // Use Timestamp.now() instead of serverTimestamp()
    };

    // Add collaborator to array
    await updateDoc(projectRef, {
      collaborators: arrayUnion(newCollaborator),
      updatedAt: Timestamp.now()
    });

    return { 
      success: true, 
      message: 'Collaborator added successfully.',
      userId,
      projectId,
      role 
    };
  } catch (error) {
    handleError('addProjectCollaborator', error);
  }
};

// Remove project collaborator
export const removeProjectCollaborator = async (projectId, userId) => {
  try {
    if (!projectId || !userId) {
      throw new Error('Project ID and user ID are required');
    }

    // Get project data
    const projectRef = doc(db, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);

    if (!projectDoc.exists()) {
      throw new Error('Project not found');
    }

    const projectData = projectDoc.data();

    // Check if user is the owner
    if (projectData.ownerId === userId) {
      throw new Error('Project owner cannot be removed from the project');
    }

    // Find the collaborator to remove
    const collaborators = projectData.collaborators || [];
    const collaboratorToRemove = collaborators.find(collab => 
      typeof collab === 'string' ? collab === userId : collab.userId === userId
    );

    if (!collaboratorToRemove) {
      throw new Error('This user is not a collaborator on the project');
    }

    // Remove collaborator
    await updateDoc(projectRef, {
      collaborators: arrayRemove(collaboratorToRemove),
      updatedAt: serverTimestamp()
    });

    return { 
      success: true, 
      message: 'Collaborator removed successfully.',
      userId,
      projectId 
    };
  } catch (error) {
    handleError('removeProjectCollaborator', error);
  }
};

// Get project with collaborators
export const getProjectWithCollaborators = async (projectId) => {
  try {
    if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
      throw new Error('Project ID is required');
    }

    const trimmedProjectId = projectId.trim();
    const projectDoc = await getDoc(doc(db, 'projects', trimmedProjectId));

    if (!projectDoc.exists()) {
      throw new Error('Project not found');
    }

    const projectData = projectDoc.data();
    const ownerId = projectData.ownerId;
    const collaborators = projectData.collaborators || [];

    // Get owner information
    const ownerDoc = await getDoc(doc(db, 'users', ownerId));
    let ownerData = null;
    let collaboratorsData = [];

    if (ownerDoc.exists()) {
      const userData = ownerDoc.data();
      ownerData = {
        id: ownerId,
        ...userData,
        isOwner: true,
        role: 'Project Owner',
        createdAt: userData.createdAt ? userData.createdAt.toDate().toISOString() : null
      };
    }

    // Get other collaborators' information
    for (const collab of collaborators) {
      const collabId = typeof collab === 'string' ? collab : collab.userId;
      
      // Skip if collaborator is the owner
      if (collabId === ownerId) continue;
      
      const userDoc = await getDoc(doc(db, 'users', collabId));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        collaboratorsData.push({
          id: collabId,
          ...userData,
          isOwner: false,
          role: typeof collab === 'object' && collab.role ? collab.role : 'Member',
          createdAt: userData.createdAt ? userData.createdAt.toDate().toISOString() : null,
          addedAt: collab.addedAt ? collab.addedAt.toDate().toISOString() : null
        });
      }
    }

    // Convert timestamps
    const projectResponse = {
      ...projectData,
      id: projectDoc.id,
      createdAt: projectData.createdAt ? projectData.createdAt.toDate().toISOString() : null,
      updatedAt: projectData.updatedAt ? projectData.updatedAt.toDate().toISOString() : null,
      owner: ownerData,
      collaboratorsData
    };

    return projectResponse;
  } catch (error) {
    handleError('getProjectWithCollaborators', error);
  }
};

// Create task
export const createTask = async (projectId, name, description, priority, dueDate, userId) => {
  try {
    if (!projectId || !name || !userId) {
      throw new Error('Project ID, task name, and user ID are required');
    }

    // Check if project exists
    const projectRef = doc(db, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);

    if (!projectDoc.exists()) {
      throw new Error('Project not found');
    }

    // Check user permission
    const projectData = projectDoc.data();
    const isOwner = projectData.ownerId === userId;
    const isCollaborator = projectData.collaborators?.some(
      collab => typeof collab === 'string' 
        ? collab === userId 
        : collab.userId === userId
    );

    if (!isOwner && !isCollaborator) {
      throw new Error('You do not have permission to create tasks in this project');
    }

    // Create new task
    const taskData = {
      projectId,
      name: name.trim(),
      description: description ? description.trim() : '',
      priority: priority || 'medium',
      dueDate: dueDate ? Timestamp.fromDate(new Date(dueDate)) : null,
      completed: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId
    };

    const taskRef = await addDoc(collection(db, 'tasks'), taskData);
    
    // Update project's updatedAt field
    await updateDoc(projectRef, {
      updatedAt: serverTimestamp()
    });

    return {
      success: true,
      message: 'Task created successfully.',
      taskId: taskRef.id,
      projectId
    };
  } catch (error) {
    handleError('createTask', error);
  }
};

// Delete task
export const deleteTask = async (taskId, projectId) => {
  try {
    if (!taskId || !projectId) {
      throw new Error('Task ID and Project ID are required');
    }

    const taskRef = doc(db, 'tasks', taskId);
    const taskDoc = await getDoc(taskRef);

    if (!taskDoc.exists()) {
      throw new Error('Task not found');
    }

    await deleteDoc(taskRef);
    
    // Update project's updatedAt field
    await updateDoc(doc(db, 'projects', projectId), {
      updatedAt: serverTimestamp()
    });

    return {
      success: true,
      message: 'Task deleted successfully.'
    };
  } catch (error) {
    handleError('deleteTask', error);
  }
};

// Update task
export const updateTask = async (taskId, projectId, updates) => {
  try {
    if (!taskId || !projectId || !updates) {
      throw new Error('Task ID, Project ID, and fields to update are required');
    }

    const taskRef = doc(db, 'tasks', taskId);
    const taskDoc = await getDoc(taskRef);

    if (!taskDoc.exists()) {
      throw new Error('Task not found');
    }

    await updateDoc(taskRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    // Update project's updatedAt field
    await updateDoc(doc(db, 'projects', projectId), {
      updatedAt: serverTimestamp()
    });

    return {
      success: true,
      message: 'Task updated successfully.'
    };
  } catch (error) {
    handleError('updateTask', error);
  }
};

// Get task details
export const getTaskDetails = async (taskId, userId) => {
  try {
    if (!taskId || !userId) {
      throw new Error('Task ID and user ID are required');
    }

    const taskRef = doc(db, 'tasks', taskId);
    const taskDoc = await getDoc(taskRef);

    if (!taskDoc.exists()) {
      throw new Error('Task not found');
    }

    const taskData = taskDoc.data();
    const projectRef = doc(db, 'projects', taskData.projectId);
    const projectDoc = await getDoc(projectRef);

    if (!projectDoc.exists()) {
      throw new Error('Related project not found');
    }

    // Check user permission
    const projectData = projectDoc.data();
    const isOwner = projectData.ownerId === userId;
    const isCollaborator = projectData.collaborators?.some(
      collab => typeof collab === 'string' ? collab === userId : collab.userId === userId
    );

    if (!isOwner && !isCollaborator && projectData.visibility !== 'public') {
      throw new Error('You do not have permission to view this task');
    }

    return {
      ...taskData,
      id: taskDoc.id,
      canEdit: isOwner || isCollaborator
    };
  } catch (error) {
    handleError('getTaskDetails', error);
  }
};

// Add subtask
export const addSubtask = async (taskId, name, projectId, userId) => {
  try {
    if (!taskId || !name || !projectId || !userId) {
      throw new Error('Task ID, subtask name, project ID, and user ID are required');
    }

    const taskRef = doc(db, 'tasks', taskId);
    const taskDoc = await getDoc(taskRef);

    if (!taskDoc.exists()) {
      throw new Error('Task not found');
    }

    const newSubtask = {
      name: name.trim(),
      completed: false,
      createdAt: Timestamp.now() // Changed from serverTimestamp() to Timestamp.now()
    };

    await updateDoc(taskRef, {
      subtasks: arrayUnion(newSubtask),
      updatedAt: Timestamp.now() // Changed this as well for consistency
    });

    // Update project's updatedAt field
    await updateDoc(doc(db, 'projects', projectId), {
      updatedAt: Timestamp.now() // Changed this as well for consistency
    });

    return {
      success: true,
      message: 'Subtask added successfully.',
      subtask: newSubtask
    };
  } catch (error) {
    handleError('addSubtask', error);
  }
};

// Create project
export const createProject = async (name, description, visibility, ownerId, collaborators = []) => {
  try {
    if (!name?.trim() || !ownerId) {
      throw new Error('Project name and owner ID are required');
    }

    // Create project document
    const newProject = {
      name: name.trim(),
      description: description ? description.trim() : '',
      visibility: visibility || 'private',
      ownerId,
      collaborators: collaborators || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const projectRef = await addDoc(collection(db, 'projects'), newProject);

    return {
      success: true,
      message: 'Project created successfully',
      projectId: projectRef.id
    };
  } catch (error) {
    handleError('createProject', error);
  }
};

// Update project
export const updateProject = async (projectId, updates) => {
  try {
    if (!projectId || !updates) {
      throw new Error('Project ID and updates are required');
    }

    const projectRef = doc(db, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);

    if (!projectDoc.exists()) {
      throw new Error('Project not found');
    }

    await updateDoc(projectRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });

    return {
      success: true,
      message: 'Project updated successfully'
    };
  } catch (error) {
    handleError('updateProject', error);
  }
};

// Get projects for user
export const getUserProjects = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const projectsRef = collection(db, 'projects');
    
    // Get projects where user is owner
    const ownedProjectsQuery = query(projectsRef, where('ownerId', '==', userId));
    const ownedProjectsSnapshot = await getDocs(ownedProjectsQuery);
    
    // Get projects where user is collaborator
    const collaboratorProjectsQuery = query(projectsRef, where('collaborators', 'array-contains-any', [
      userId, // Simple string format
      { userId } // Object format
    ]));
    const collaboratorProjectsSnapshot = await getDocs(collaboratorProjectsQuery);
    
    const projects = [];
    const processedIds = new Set();

    // Process owned projects
    ownedProjectsSnapshot.forEach(doc => {
      if (!processedIds.has(doc.id)) {
        const data = doc.data();
        projects.push({
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate().toISOString() || null,
          updatedAt: data.updatedAt?.toDate().toISOString() || null,
          isOwner: true
        });
        processedIds.add(doc.id);
      }
    });

    // Process collaborator projects
    collaboratorProjectsSnapshot.forEach(doc => {
      if (!processedIds.has(doc.id)) {
        const data = doc.data();
        const isCollaborator = data.collaborators?.some(collab => 
          typeof collab === 'string' ? collab === userId : collab.userId === userId
        );
        
        if (isCollaborator) {
          projects.push({
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate().toISOString() || null,
            updatedAt: data.updatedAt?.toDate().toISOString() || null,
            isOwner: false
          });
          processedIds.add(doc.id);
        }
      }
    });

    return projects;
  } catch (error) {
    handleError('getUserProjects', error);
  }
};

// Get tasks for project
export const getProjectTasks = async (projectId) => {
  try {
    if (!projectId) {
      throw new Error('Project ID is required');
    }

    const tasksRef = collection(db, 'tasks');
    const tasksQuery = query(tasksRef, where('projectId', '==', projectId));
    const tasksSnapshot = await getDocs(tasksQuery);

    const tasks = [];
    tasksSnapshot.forEach(doc => {
      const data = doc.data();
      tasks.push({
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate().toISOString() || null,
        updatedAt: data.updatedAt?.toDate().toISOString() || null,
        dueDate: data.dueDate?.toDate().toISOString() || null
      });
    });

    return tasks;
  } catch (error) {
    handleError('getProjectTasks', error);
  }
};

export class ClientFunctions {
  static async getUserProfileData(data) {
    const userId = data?.userId;
    if (!userId) {
      throw new Error('User ID is required');
    }
    return getUserProfileData(userId);
  }

  static async updateUserProfileData(data) {
    const { userId, displayName } = data;
    if (!userId || !displayName) {
      throw new Error('User ID and display name are required');
    }
    return updateUserProfileData(userId, displayName);
  }

  static async createProject(data) {
    const { name, description, visibility, ownerId, collaborators } = data;
    return createProject(name, description, visibility, ownerId, collaborators);
  }

  static async getProjectCollaborators(data) {
    const { projectId } = data;
    return getProjectCollaborators(projectId);
  }

  static async addProjectCollaborator(data) {
    const { projectId, email, role } = data;
    return addProjectCollaborator(projectId, email, role);
  }

  static async removeProjectCollaborator(data) {
    const { projectId, userId } = data;
    return removeProjectCollaborator(projectId, userId);
  }

  static async createTask(data) {
    const { projectId, name, description, priority, dueDate, userId } = data;
    return createTask(projectId, name, description, priority, dueDate, userId);
  }

  static async getTaskDetails(data) {
    const { taskId, userId } = data;
    return getTaskDetails(taskId, userId);
  }

  static async addSubtask(data) {
    const { taskId, name, projectId, userId } = data;
    return addSubtask(taskId, name, projectId, userId);
  }

  static async updateTask(data) {
    const { taskId, projectId, updates } = data;
    return updateTask(taskId, projectId, updates);
  }

  static async deleteTask(data) {
    const { taskId, projectId } = data;
    return deleteTask(taskId, projectId);
  }

  static async updateProject(data) {
    const { projectId, updates } = data;
    return updateProject(projectId, updates);
  }

  static async deleteProject(data) {
    const { projectId } = data;
    return deleteProject(projectId);
  }

  static async getProjectWithCollaborators(data) {
    const { projectId } = data;
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    return getProjectWithCollaborators(projectId);
  }
}

// Add deleteProject function before the ClientFunctions class
export const deleteProject = async (projectId) => {
  try {
    if (!projectId) {
      throw new Error('Project ID is required');
    }

    const projectRef = doc(db, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);

    if (!projectDoc.exists()) {
      throw new Error('Project not found');
    }

    // Delete all tasks associated with the project
    const tasksRef = collection(db, 'tasks');
    const tasksQuery = query(tasksRef, where('projectId', '==', projectId));
    const tasksSnapshot = await getDocs(tasksQuery);
    
    const batch = writeBatch(db);
    
    tasksSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete the project itself
    batch.delete(projectRef);
    
    // Commit the batch
    await batch.commit();

    return {
      success: true,
      message: 'Project and all associated tasks deleted successfully'
    };
  } catch (error) {
    handleError('deleteProject', error);
  }
};

export const firebaseService = new ClientFunctions();
export default ClientFunctions;