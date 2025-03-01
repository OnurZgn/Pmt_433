import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase-config'; // Import Firebase config
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

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

  return (
    <div>
      <h1>Hoş Geldiniz, {user ? user.email : 'Bilinmeyen Kullanıcı'}</h1>
      <p>Dashboard'a giriş yaptınız!</p>

      {/* Show sign-out button if the user is logged in */}
      {user && (
        <button onClick={handleSignOut}>Sign Out</button>
      )}
    </div>
  );
};

export default Dashboard;
