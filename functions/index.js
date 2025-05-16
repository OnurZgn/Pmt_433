const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// User creation trigger
exports.createUserProfile = functions.auth.user().onCreate(async (user) => {
  try {
    await admin.firestore().collection('users').doc(user.uid).set({
      email: user.email,
      displayName: user.displayName || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      projects: []
    });
  } catch (error) {
    console.error('Error creating user profile:', error);
  }
});

// Project functions
exports.onProjectUpdate = functions.firestore
  .document('projects/{projectId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const previousData = change.before.data();
    const projectId = context.params.projectId;

    // Update all related tasks' timestamps
    if (newData.updatedAt !== previousData.updatedAt) {
      const tasksSnapshot = await admin.firestore()
        .collection('tasks')
        .where('projectId', '==', projectId)
        .get();

      const batch = admin.firestore().batch();
      tasksSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          projectUpdatedAt: newData.updatedAt
        });
      });

      await batch.commit();
    }
  });

// Task functions
exports.onTaskComplete = functions.firestore
  .document('tasks/{taskId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const previousData = change.before.data();

    // If task was just completed
    if (newData.completed && !previousData.completed) {
      // Update project statistics
      const projectRef = admin.firestore().collection('projects').doc(newData.projectId);
      await projectRef.update({
        completedTasks: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Create notification
      await admin.firestore().collection('notifications').add({
        type: 'TASK_COMPLETED',
        taskId: context.params.taskId,
        taskName: newData.name,
        projectId: newData.projectId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        userId: newData.completedBy || newData.createdBy
      });
    }
  });

// Collaborator management
exports.onCollaboratorAdd = functions.firestore
  .document('projects/{projectId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const previousData = change.before.data();
    
    // Check if collaborators were added
    const newCollaborators = newData.collaborators || [];
    const oldCollaborators = previousData.collaborators || [];
    
    if (newCollaborators.length > oldCollaborators.length) {
      const addedCollaborators = newCollaborators.filter(
        c => !oldCollaborators.includes(c)
      );
      
      // Create notifications for new collaborators
      const batch = admin.firestore().batch();
      addedCollaborators.forEach(userId => {
        batch.create(admin.firestore().collection('notifications').doc(), {
          type: 'ADDED_TO_PROJECT',
          projectId: context.params.projectId,
          projectName: newData.name,
          userId: userId,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      
      await batch.commit();
    }
  });

// Project cleanup when deleted
exports.onProjectDelete = functions.firestore
  .document('projects/{projectId}')
  .onDelete(async (snap, context) => {
    const projectId = context.params.projectId;
    const projectData = snap.data();

    try {
      // Delete all tasks
      const tasksSnapshot = await admin.firestore()
        .collection('tasks')
        .where('projectId', '==', projectId)
        .get();

      const batch = admin.firestore().batch();
      tasksSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete all messages
      const messagesSnapshot = await admin.firestore()
        .collection('messages')
        .where('projectId', '==', projectId)
        .get();

      messagesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Remove project from collaborators' projects list
      if (projectData.collaborators) {
        const collaborators = projectData.collaborators;
        for (const userId of collaborators) {
          const userRef = admin.firestore().collection('users').doc(userId);
          batch.update(userRef, {
            projects: admin.firestore.FieldValue.arrayRemove(projectId)
          });
        }
      }

      await batch.commit();
    } catch (error) {
      console.error('Error cleaning up project:', error);
    }
  });

// Project statistics update
exports.updateProjectStats = functions.firestore
  .document('tasks/{taskId}')
  .onWrite(async (change, context) => {
    const taskData = change.after.exists ? change.after.data() : null;
    const previousData = change.before.exists ? change.before.data() : null;
    
    if (!taskData) return; // Task was deleted

    const projectId = taskData.projectId;
    const projectRef = admin.firestore().collection('projects').doc(projectId);

    try {
      // Get all tasks for the project
      const tasksSnapshot = await admin.firestore()
        .collection('tasks')
        .where('projectId', '==', projectId)
        .get();

      const stats = {
        totalTasks: tasksSnapshot.size,
        completedTasks: 0,
        highPriorityTasks: 0,
        overdueTasks: 0
      };

      const now = admin.firestore.Timestamp.now();

      tasksSnapshot.docs.forEach(doc => {
        const task = doc.data();
        if (task.completed) stats.completedTasks++;
        if (task.priority === 'high') stats.highPriorityTasks++;
        if (task.dueDate && task.dueDate.toDate() < now.toDate() && !task.completed) {
          stats.overdueTasks++;
        }
      });

      await projectRef.update({
        stats: stats,
        updatedAt: now
      });
    } catch (error) {
      console.error('Error updating project stats:', error);
    }
  });

// Notification system
exports.createNotification = functions.firestore
  .document('{collection}/{docId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const collection = context.params.collection;

    if (['projects', 'tasks', 'messages'].includes(collection)) {
      try {
        const notificationData = {
          type: `NEW_${collection.toUpperCase().slice(0, -1)}`,
          createdAt: admin.firestore.Timestamp.now(),
          read: false
        };

        switch (collection) {
          case 'projects':
            notificationData.projectId = snap.id;
            notificationData.projectName = data.name;
            notificationData.recipients = data.collaborators || [];
            break;
          case 'tasks':
            notificationData.taskId = snap.id;
            notificationData.taskName = data.name;
            notificationData.projectId = data.projectId;
            break;
          case 'messages':
            notificationData.messageId = snap.id;
            notificationData.projectId = data.projectId;
            notificationData.senderId = data.userId;
            break;
        }

        await admin.firestore()
          .collection('notifications')
          .add(notificationData);
      } catch (error) {
        console.error('Error creating notification:', error);
      }
    }
  });

// User presence system
exports.onUserStatusChanged = functions.database
  .ref('/status/{uid}')
  .onUpdate(async (change, context) => {
    const eventStatus = change.after.val();
    const userStatusFirestoreRef = admin.firestore()
      .collection('users')
      .doc(context.params.uid);

    const statusSnapshot = await change.after.ref.once('value');
    const status = statusSnapshot.val();

    if (status.lastChanged > eventStatus.lastChanged) {
      return null;
    }

    return userStatusFirestoreRef.update({
      online: eventStatus.state === 'online',
      lastSeen: admin.firestore.Timestamp.fromMillis(eventStatus.lastChanged)
    });
  });
