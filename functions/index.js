const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { onCall } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const functions = require('firebase-functions');

initializeApp();
const db = getFirestore();
const auth = getAuth();

// Helper functions for logging
const logError = (functionName, error, additionalInfo = {}) => {
  logger.error({
    function: functionName,
    error: error.message,
    code: error.code,
    details: additionalInfo
  });
};

const logInfo = (functionName, message, data = {}) => {
  logger.info({
    function: functionName,
    message,
    ...data
  });
};

// Get user profile data
exports.getUserProfileData = onCall(async (data, context) => {
  const FUNCTION_NAME = 'getUserProfileData';
  try {
    logInfo(FUNCTION_NAME, 'Function called', { data });
    
    const userId = data?.userId || data?.data?.userId;
    
    // User ID validation
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid user ID');
    }
    
    const trimmedUserId = userId.trim();
    logInfo(FUNCTION_NAME, 'Searching for user', { userId: trimmedUserId });
    
    // Get user data from Firestore
    const userDoc = await db.collection('users').doc(trimmedUserId).get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }
    
    const userData = userDoc.data();
    logInfo(FUNCTION_NAME, 'User found', { userId: trimmedUserId });
    
    // Convert timestamp
    const userResponse = {
      ...userData,
      createdAt: userData.createdAt?.toDate().toISOString() || null,
    };
    
    return userResponse;
  } catch (error) {
    logError(FUNCTION_NAME, error);
    throw new functions.https.HttpsError('internal', 'Server error: ' + error.message);
  }
});

// Update user profile data
exports.updateUserProfileData = onCall(async (data, context) => {
  const FUNCTION_NAME = 'updateUserProfileData';
  try {
    const userId = data?.data?.userId || data?.userId;
    const displayName = data?.data?.displayName || data?.displayName;
    
    // Check if user exists
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found.');
    }
    
    // Update user information in Firestore
    await db.collection('users').doc(userId).update({
      displayName: displayName
    });
    
    // Update user information in Firebase Auth
    await auth.updateUser(userId, {
      displayName: displayName
    });
    
    return { success: true, message: 'User profile updated successfully.' };
  } catch (error) {
    logError(FUNCTION_NAME, error);
    
    if (error.code && error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', error.message || 'Server error.');
  }
});

// Get project collaborators
exports.getProjectCollaborators = onCall(async (data, context) => {
  const FUNCTION_NAME = 'getProjectCollaborators';
  try {
    logInfo(FUNCTION_NAME, 'Function called', { data });
    
    const projectId = data?.projectId || data?.data?.projectId;
    
    // projectId validation
    if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
      logError(FUNCTION_NAME, new Error('Invalid projectId'), { projectId });
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'Project ID is required.'
      );
    }
    
    const trimmedProjectId = projectId.trim();
    logInfo(FUNCTION_NAME, 'Searching for project collaborators', { projectId: trimmedProjectId });
    
    // Get project data from Firestore
    const projectDoc = await db.collection('projects').doc(trimmedProjectId).get();
    
    if (!projectDoc.exists) {
      logError(FUNCTION_NAME, new Error('Project not found'), { projectId: trimmedProjectId });
      throw new functions.https.HttpsError(
        'not-found', 
        'Project not found.'
      );
    }
    
    const projectData = projectDoc.data();
    const ownerId = projectData.ownerId;
    const collaborators = projectData.collaborators || [];
    
    // Get owner information
    const ownerDoc = await db.collection('users').doc(ownerId).get();
    let collaboratorsData = [];
    
    if (ownerDoc.exists) {
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
      
      const userDoc = await db.collection('users').doc(collabId).get();
      
      if (userDoc.exists) {
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
    logError(FUNCTION_NAME, error);
    
    if (error.code && error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal', 
      'Server error: ' + (error.message || String(error))
    );
  }
});

// Add project collaborator
exports.addProjectCollaborator = onCall(async (data, context) => {
  const FUNCTION_NAME = 'addProjectCollaborator';
  try {
    logInfo(FUNCTION_NAME, 'Function called', { data });
    
    const projectId = data?.projectId || data?.data?.projectId;
    const email = data?.email || data?.data?.email;
    const role = data?.role || data?.data?.role || 'Member';
    
    // Parameter validation
    if (!projectId || !email) {
      logError(FUNCTION_NAME, new Error('Missing parameters'), { projectId, email });
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'Project ID and user email are required.'
      );
    }
    
    // Find user by email
    const usersRef = db.collection('users');
    const userQuery = await usersRef.where('email', '==', email.toLowerCase().trim()).get();
    
    if (userQuery.empty) {
      logError(FUNCTION_NAME, new Error('User not found'), { email });
      throw new functions.https.HttpsError(
        'not-found', 
        'No user found with this email address.'
      );
    }
    
    const userDoc = userQuery.docs[0];
    const userId = userDoc.id;
    
    // Get project data
    const projectRef = db.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();
    
    if (!projectDoc.exists) {
      logError(FUNCTION_NAME, new Error('Project not found'), { projectId });
      throw new functions.https.HttpsError(
        'not-found', 
        'Project not found.'
      );
    }
    
    const projectData = projectDoc.data();
    
    // Check if user is already the owner
    if (projectData.ownerId === userId) {
      logError(FUNCTION_NAME, new Error('User is already the project owner'), { userId });
      throw new functions.https.HttpsError(
        'already-exists', 
        'This user is already the project owner.'
      );
    }
    
    // Check if user is already a collaborator
    const collaborators = projectData.collaborators || [];
    const isAlreadyCollaborator = collaborators.some(collab => 
      typeof collab === 'string' ? collab === userId : collab.userId === userId
    );
    
    if (isAlreadyCollaborator) {
      logError(FUNCTION_NAME, new Error('User is already a collaborator'), { userId });
      throw new functions.https.HttpsError(
        'already-exists', 
        'This user is already added to the project.'
      );
    }
    
    // Add collaborator
    collaborators.push({
      userId,
      role,
      addedAt: Timestamp.now()
    });
    
    await projectRef.update({
      collaborators,
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
    logError(FUNCTION_NAME, error);
    
    if (error.code && error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal', 
      'Server error: ' + (error.message || String(error))
    );
  }
});

// Remove project collaborator
exports.removeProjectCollaborator = onCall(async (data, context) => {
  const FUNCTION_NAME = 'removeProjectCollaborator';
  try {
    logInfo(FUNCTION_NAME, 'Function called', { data });
    
    const projectId = data?.projectId || data?.data?.projectId;
    const userId = data?.userId || data?.data?.userId;
    
    // Parameter validation
    if (!projectId || !userId) {
      logError(FUNCTION_NAME, new Error('Missing parameters'), { projectId, userId });
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'Project ID and user ID are required.'
      );
    }
    
    // Get project data
    const projectRef = db.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();
    
    if (!projectDoc.exists) {
      logError(FUNCTION_NAME, new Error('Project not found'), { projectId });
      throw new functions.https.HttpsError(
        'not-found', 
        'Project not found.'
      );
    }
    
    const projectData = projectDoc.data();
    
    // Check if user is the owner
    if (projectData.ownerId === userId) {
      logError(FUNCTION_NAME, new Error('Project owner cannot be removed'), { userId });
      throw new functions.https.HttpsError(
        'permission-denied', 
        'Project owner cannot be removed from the project.'
      );
    }
    
    // Check collaborators
    const collaborators = projectData.collaborators || [];
    const updatedCollaborators = collaborators.filter(collab => 
      typeof collab === 'string' ? collab !== userId : collab.userId !== userId
    );
    
    // If no changes, user is not a collaborator
    if (collaborators.length === updatedCollaborators.length) {
      logError(FUNCTION_NAME, new Error('User is not a collaborator'), { userId });
      throw new functions.https.HttpsError(
        'not-found', 
        'This user is not a collaborator on the project.'
      );
    }
    
    // Remove collaborator
    await projectRef.update({
      collaborators: updatedCollaborators,
      updatedAt: Timestamp.now()
    });
    
    return { 
      success: true, 
      message: 'Collaborator removed successfully.',
      userId,
      projectId 
    };
  } catch (error) {
    logError(FUNCTION_NAME, error);
    
    if (error.code && error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal', 
      'Server error: ' + (error.message || String(error))
    );
  }
});

// Get project with collaborators
exports.getProjectWithCollaborators = onCall(async (data, context) => {
  const FUNCTION_NAME = 'getProjectWithCollaborators';
  try {
    logInfo(FUNCTION_NAME, 'Function called', { data });
    
    const projectId = data?.projectId || data?.data?.projectId;
    
    // projectId validation
    if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
      logError(FUNCTION_NAME, new Error('Invalid projectId'), { projectId });
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'Project ID is required.'
      );
    }
    
    const trimmedProjectId = projectId.trim();
    
    // Get project data from Firestore
    const projectDoc = await db.collection('projects').doc(trimmedProjectId).get();
    
    if (!projectDoc.exists) {
      logError(FUNCTION_NAME, new Error('Project not found'), { projectId: trimmedProjectId });
      throw new functions.https.HttpsError(
        'not-found', 
        'Project not found.'
      );
    }
    
    const projectData = projectDoc.data();
    const ownerId = projectData.ownerId;
    const collaborators = projectData.collaborators || [];
    
    // Get owner information
    const ownerDoc = await db.collection('users').doc(ownerId).get();
    let ownerData = null;
    let collaboratorsData = [];
    
    if (ownerDoc.exists) {
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
      
      const userDoc = await db.collection('users').doc(collabId).get();
      
      if (userDoc.exists) {
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
    logError(FUNCTION_NAME, error);
    
    if (error.code && error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal', 
      'Server error: ' + (error.message || String(error))
    );
  }
});

// Create task
exports.createTask = onCall(async (data, context) => {
  const FUNCTION_NAME = 'createTask';
  try {
    logInfo(FUNCTION_NAME, 'Function called', { data });

    const projectId = data?.projectId || data?.data?.projectId;
    const name = data?.name || data?.data?.name;
    const description = data?.description || data?.data?.description;
    const priority = data?.priority || data?.data?.priority;
    const dueDate = data?.dueDate || data?.data?.dueDate;
    const userId = data?.userId || data?.data?.userId; // Get user ID from data
    
    // Parameter validation
    if (!projectId || !name || !userId) {
      logError(FUNCTION_NAME, new Error('Missing parameters'), { projectId, name, userId });
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Project ID, task name, and user ID are required.'
      );
    }

    // Check if project exists
    const projectRef = db.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Project not found.');
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
      throw new functions.https.HttpsError(
        'permission-denied',
        'You do not have permission to create tasks in this project.'
      );
    }

    // Create new task
    const taskData = {
      projectId,
      name: name.trim(),
      description: description ? description.trim() : '',
      priority: priority || 'medium',
      dueDate: dueDate ? Timestamp.fromDate(new Date(dueDate)) : null,
      completed: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: userId
    };

    const taskRef = await db.collection('tasks').add(taskData);
    
    // Update project's updatedAt field
    await projectRef.update({
      updatedAt: Timestamp.now()
    });

    return {
      success: true,
      message: 'Task created successfully.',
      taskId: taskRef.id,
      projectId
    };

  } catch (error) {
    logError(FUNCTION_NAME, error);
    
    if (error.code && error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Server error: ' + (error.message || String(error))
    );
  }
});

// Delete task
exports.deleteTask = onCall(async (data, context) => {
  const FUNCTION_NAME = 'deleteTask';
  try {
    const taskId = data?.taskId || data?.data?.taskId;
    const projectId = data?.projectId || data?.data?.projectId;

    
    // Parameter validation
    if (!taskId || !projectId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Task ID and Project ID are required.'
      );
    }

    const taskRef = db.collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Task not found.');
    }

    await taskRef.delete();
    
    // Update project's updatedAt field
    await db.collection('projects').doc(projectId).update({
      updatedAt: Timestamp.now()
    });

    return {
      success: true,
      message: 'Task deleted successfully.'
    };
  } catch (error) {
    logError(FUNCTION_NAME, error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Update task
exports.updateTask = onCall(async (data, context) => {
  const FUNCTION_NAME = 'updateTask';
  try {
    const { taskId, projectId, updates } = data;
    
    // Parameter validation
    if (!taskId || !projectId || !updates) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Task ID, Project ID, and fields to update are required.'
      );
    }

    const taskRef = db.collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Task not found.');
    }

    await taskRef.update({
      ...updates,
      updatedAt: Timestamp.now()
    });

    // Update project's updatedAt field
    await db.collection('projects').doc(projectId).update({
      updatedAt: Timestamp.now()
    });

    return {
      success: true,
      message: 'Task updated successfully.'
    };
  } catch (error) {
    logError(FUNCTION_NAME, error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Get task details
exports.getTaskDetails = onCall(async (data, context) => {
  const FUNCTION_NAME = 'getTaskDetails';
  try {
    logInfo(FUNCTION_NAME, 'Function called', { data });
    
    const taskId = data?.taskId || data?.data?.taskId;
    const userId = data?.userId || data?.data?.userId;
    
    // Parameter validation
    if (!taskId || !userId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Task ID and user ID are required.'
      );
    }

    const taskRef = db.collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Task not found.');
    }

    const taskData = taskDoc.data();
    const projectRef = db.collection('projects').doc(taskData.projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Related project not found.');
    }

    // Check user permission
    const projectData = projectDoc.data();
    const isOwner = projectData.ownerId === userId;
    const isCollaborator = projectData.collaborators?.some(
      collab => typeof collab === 'string' ? collab === userId : collab.userId === userId
    );

    if (!isOwner && !isCollaborator && projectData.visibility !== 'public') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You do not have permission to view this task.'
      );
    }

    return {
      ...taskData,
      id: taskDoc.id,
      canEdit: isOwner || isCollaborator
    };
  } catch (error) {
    logError(FUNCTION_NAME, error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Add subtask
exports.addSubtask = onCall(async (data, context) => {
  const FUNCTION_NAME = 'addSubtask';
  try {
    const taskId = data?.taskId || data?.data?.taskId;
    const name = data?.name || data?.data?.name;
    const projectId = data?.projectId || data?.data?.projectId;
    const userId = data?.userId || data?.data?.userId;

    // Detailed parameter validation
    if (!taskId || !name || !projectId || !userId) {
      logError(FUNCTION_NAME, new Error('Missing required parameters'), {
        providedParams: { taskId, name, projectId, userId }
      });
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Task ID, subtask name, project ID, and user ID are required.'
      );
    }

    const taskRef = db.collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Task not found.');
    }

    const newSubtask = {
      name: name.trim(),
      completed: false,
      createdAt: Timestamp.now()
    };

    await taskRef.update({
      subtasks: FieldValue.arrayUnion(newSubtask),
      updatedAt: Timestamp.now()
    });

    // Update project's updatedAt field
    await db.collection('projects').doc(projectId).update({
      updatedAt: Timestamp.now()
    });

    return {
      success: true,
      message: 'Subtask added successfully.',
      subtask: newSubtask
    };
  } catch (error) {
    logError(FUNCTION_NAME, error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
 
// Create project
exports.createProject = onCall(async (data, context) => {
  const FUNCTION_NAME = 'createProject';
  try {
    logInfo(FUNCTION_NAME, 'Function called', { data });

    const projectData = data?.data || data;
    const { name, description, visibility, ownerId, collaborators } = projectData;

    // Validate required fields
    if (!name?.trim() || !ownerId) {
      logError(FUNCTION_NAME, new Error('Missing required fields'), {
        providedFields: { name, ownerId }
      });
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Project name and owner ID are required.'
      );
    }

    // Create project document
    const newProject = {
      name: name.trim(),
      description: description ? description.trim() : '',
      visibility: visibility || 'private',
      ownerId,
      collaborators: collaborators || [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const projectRef = await db.collection('projects').add(newProject);

    logInfo(FUNCTION_NAME, 'Project created successfully', {
      projectId: projectRef.id,
      ownerId
    });

    return {
      success: true,
      message: 'Project created successfully',
      projectId: projectRef.id
    };

  } catch (error) {
    logError(FUNCTION_NAME, error);
    
    if (error.code && error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Server error: ' + (error.message || String(error))
    );
  }
});
