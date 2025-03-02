const { logger } = require("firebase-functions");
const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, collection, getDocs } = require("firebase-admin/firestore");
const cors = require('cors')({ origin: true }); // Add CORS support

initializeApp();

// Firestore connection
const db = getFirestore();

// Connect Firestore to the emulator (if running in a local environment)
if (process.env.FIREBASE_EMULATOR_HOST) {
  db.useEmulator("localhost", 8080);
}

// 📌 **Project Addition API**
exports.addProject = onRequest(async (req, res) => {
  try {
    const { projectName, projectDescription, startDate, endDate, status, users, tasks } = req.body;

    if (!projectName || !users || !tasks || !startDate || !endDate) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const projectRef = await db.collection("projects").add({
      projectName,
      projectDescription,  // Description
      startDate,
      endDate,
      status,  // Status
      users,
      tasks,
    });

    res.json({ result: `Project added: ${projectName}` });
  } catch (error) {
    logger.error("Error while adding project:", error);
    res.status(500).json({ error: "Project could not be added." });
  }
});

// 📌 **User Addition API (During Registration)**
exports.addUser = onRequest(async (req, res) => {
  try {
    const { name, surname, email, uid } = req.query;

    if (!name || !surname || !email || !uid) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    // Add user to Firestore (default role "user")
    await db.collection("users").doc(uid).set({
      name,
      surname,
      email,
      role: "user", // Newly registered users will have the "user" role
      createdAt: new Date(),
    });

    res.json({ result: `User added: ${name} ${surname}` });
  } catch (error) {
    logger.error("Error while adding user:", error);
    res.status(500).json({ error: "User could not be added." });
  }
});

// 📌 **Role Assignment API (Only Admin Can Use)**
exports.assignRole = onRequest(async (req, res) => {
  try {
    const { adminUid, targetUid, newRole } = req.body;

    if (!adminUid || !targetUid || !newRole) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const adminDoc = await db.collection("users").doc(adminUid).get();
    if (!adminDoc.exists || adminDoc.data().role !== "admin") {
      return res.status(403).json({ error: "Unauthorized action! Only admins can assign roles." });
    }

    const targetUserDoc = await db.collection("users").doc(targetUid).get();
    if (!targetUserDoc.exists) {
      return res.status(404).json({ error: "Target user not found." });
    }

    await db.collection("users").doc(targetUid).update({ role: newRole });

    res.json({ result: `User's role changed to: ${newRole}` });
  } catch (error) {
    logger.error("Role assignment error:", error);
    res.status(500).json({ error: "Role could not be assigned." });
  }
});

// 📌 **Get User Role API**
exports.getUserRole = onRequest(async (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    // Fetch the user with the provided uid
    const userDoc = await db.collection("users").doc(uid).get();

    // If the user is not found
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found." });
    }

    // Return the user's role
    const userRole = userDoc.data().role;

    res.status(200).json({ uid: userDoc.id, role: userRole });

  } catch (error) {
    logger.error("Error while fetching user's role:", error);
    res.status(500).json({ error: "Role could not be fetched." });
  }
});

// 📌 **Get User Profile API**
exports.getUserProfile = onRequest(async (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found." });
    }

    const user = { name: userDoc.data().name, surname: userDoc.data().surname, role: userDoc.data().role, email: userDoc.data().email };

    res.status(200).json({ name: userDoc.id, name: user.name, role: user.role, email: user.email });

  } catch (error) {
    console.error("Error while fetching user's profile:", error);
    res.status(500).json({ error: "Profile could not be fetched." });
  }
});
