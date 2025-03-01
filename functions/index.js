const { logger } = require("firebase-functions");
const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

// Connect Firestore to the emulator if running locally
if (process.env.FIREBASE_EMULATOR_HOST) {
  const firestore = getFirestore();
  firestore.useEmulator("localhost", 8080);  // Ensure it uses the Firestore emulator
}

exports.addProject = onRequest(async (req, res) => {
  try {
    // Log the incoming request body
    logger.info('Request Body:', req.body);

    const { projectName, users, tasks } = req.body;  // Expect data in the body

    // Validate inputs
    if (!projectName || !users || !tasks) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    // Add the new project to Firestore
    const writeResult = await getFirestore()
      .collection("projects")
      .add({
        projectName,
        users,
        tasks,
      });

    res.json({ result: `Project: ${projectName} added.` });
  } catch (error) {
    logger.error("Error adding new project:", error);
    res.status(500).json({ error: 'Failed to add project data.' });
  }
});


exports.addmessage = onRequest(async (req, res) => {
  try {
    const { name, surname, email, uid } = req.query;

    // Validate inputs
    if (!name || !surname || !email || !uid) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    // Push the user data into Firestore using the Firebase Admin SDK
    const writeResult = await getFirestore()
      .collection("users")
      .doc(uid)  // Use the UID to set the document ID
      .set({
        name: name,
        surname: surname,
        email: email,
        createdAt: new Date(),
      });

    res.json({ result: `User data with UID: ${uid} added.` });
  } catch (error) {
    logger.error("Error adding user data:", error);
    res.status(500).json({ error: 'Failed to add user data.' });
  }
});