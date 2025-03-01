import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase-config'; // Import Firebase config
import { useNavigate } from 'react-router-dom';
import { getFirestore, collection, addDoc, doc, updateDoc } from 'firebase/firestore'; // Add missing imports

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const db = getFirestore(); // Firestore instance

  // Handle authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate('/');  // Redirect to home if no user
      } else {
        setUser(currentUser);  // Set the user when logged in
      }
    });

    return () => unsubscribe();  // Cleanup subscription
  }, [navigate]);

  // Sign out function
  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        navigate('/');  // Redirect to home after sign out
      })
      .catch((error) => {
        console.error("Sign out error:", error.message);
      });
  };

  // Navigate to the user’s page
  const goToUserPage = () => {
    navigate(`/user/${user.uid}`); // Navigate to user’s unique page using their UID
  };

  // Create a dummy project function
  const createDummyProject = async () => {
    try {
      // Create a new project document with name and description
      const docRef = await addDoc(collection(db, "projects"), {
        name: "Dummy Project",
        description: "This is a dummy project created as a placeholder.",
        users: [{
          userId: user.uid, // Add the current user's ID as a reference
          role: "owner",    // The current user's role is "owner"
        }],
      });

      // Optionally, you can update the user's document to add this project to the user's list
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        projects: [docRef.id], // Add the newly created project ID to the user's projects array
      });
      console.log("Project created successfully:", docRef.id);
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  return (
    <div>
      <h1>Hoş Geldiniz, {user ? user.email : 'Bilinmeyen Kullanıcı'}</h1>
      <p>Dashboard'a giriş yaptınız!</p>

      {/* Navigate to User Page Button */}
      {user && (
        <button onClick={goToUserPage}>Go to My Page</button>
      )}

      {/* Show sign-out button if the user is logged in */}
      {user && (
        <button onClick={handleSignOut}>Sign Out</button>
      )}

      {/* Create Project Button */}
      {user && (
        <button onClick={createDummyProject}>Create Dummy Project</button>
      )}
    </div>
  );
};

export default Dashboard;
