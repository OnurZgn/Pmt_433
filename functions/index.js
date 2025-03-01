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


exports.addmessage = onRequest(async (req, res) => {
  try {
    const { name, surname, email } = req.query;

    // Validate inputs
    if (!name || !surname || !email) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    // Push the user data into Firestore using the Firebase Admin SDK
    const writeResult = await getFirestore()
      .collection("users")
      .add({
        name: name,
        surname: surname,
        email: email,
        createdAt: new Date(),
      });

    res.json({ result: `User data with ID: ${writeResult.id} added.` });
  } catch (error) {
    logger.error("Error adding user data:", error);
    res.status(500).json({ error: 'Failed to add user data.' });
  }
});
