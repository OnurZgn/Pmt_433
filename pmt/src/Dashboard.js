import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase-config';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const [user, setUser] = useState(null); // State to store the user data
  const [loading, setLoading] = useState(true); // State to handle loading status
  const navigate = useNavigate(); // Hook for navigation

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate('/');  // Redirect to the homepage if the user is not logged in
      } else {
        setUser(currentUser); // Set the user state with the current user
        setLoading(false); // Set loading to false once the user data is loaded
      }
    });

    return () => unsubscribe();  // Cleanup the subscription when the component is unmounted
  }, [navigate]);

  const handleSignOut = () => {
    signOut(auth).then(() => {
      navigate('/');  // Redirect to the homepage when the user logs out
    }).catch((error) => {
      console.error("Sign out error:", error.message); // Log any errors that occur during sign out
    });
  };

  const goToUserPage = () => {
    if (user) {
      navigate(`/user/${user.uid}`);  // Navigate to the user's profile page
    }
  };

  const goToAssignRolePage = () => {
    navigate('/assign-role');  // Navigate to the assign role page for admins
  };

  if (loading) return <p>Loading...</p>;  // Show loading message until the user data is loaded

  return (
    <div className="dashboard-container">
      <h1>Welcome, {user ? user.email : 'Unknown User'}</h1>
      <p>You've successfully logged into the dashboard.</p>
      <button onClick={() => navigate('/create-project')}>Create New Project</button>
      <button onClick={handleSignOut}>Sign Out</button>
      
      {/* Show the "Go to My Page" button if the user is logged in */}
      {user && <button onClick={goToUserPage}>Go to My Page</button>}
      {user && user.email && <button onClick={goToAssignRolePage}>Assign Role</button>}
    </div>
  );
};

export default Dashboard;
