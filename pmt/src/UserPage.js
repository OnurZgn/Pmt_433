import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import './UserPage.css';

const UserPage = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        setError("You must be logged in to view your profile.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("http://localhost:5001/projectmanagmenttool433/us-central1/getUserProfile", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ uid: user.uid }), 
        });

        const data = await response.json();

        if (response.ok) {
          setUserProfile(data);
        } else {
          setError("Failed to fetch user profile.");
        }
      } catch (error) {
        setError("Error fetching profile. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  return (
    <div className="user-page-container">
      <h2>User Profile</h2>

      {isLoading ? (
        <p className="loading-message">Loading...</p>
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : (
        userProfile && (
          <div className="user-info">
            <p><strong>Name:</strong> {userProfile.name} {userProfile.surname}</p>
            <p><strong>Role:</strong> {userProfile.role}</p>
            <p><strong>email:</strong> {userProfile.email}</p>
          </div>
        )
      )}
    </div>
  );
};

export default UserPage;
