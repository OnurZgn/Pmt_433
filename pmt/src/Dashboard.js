import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase-config';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate('/');  // Redirect to home if no user
      } else {
        setUser(currentUser);  // Set the user when logged in
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        navigate('/');  // Redirect to home after sign out
      })
      .catch((error) => {
        console.error("Sign out error:", error.message);
      });
  };

  return (
    <div className="dashboard-container">
      <h1>Welcome, {user ? user.email : 'Unknown User'}</h1>
      <p>You've successfully logged into the dashboard.</p>

      {/* Link to create project page */}
      <button onClick={() => navigate('/create-project')}>Create New Project</button>
      
      {user && (
        <button onClick={handleSignOut}>Sign Out</button>
      )}
    </div>
  );
};

export default Dashboard;
