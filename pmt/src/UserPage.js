import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const UserPage = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { uid } = useParams(); // Get user ID from URL
  const db = getFirestore();
  const auth = getAuth();

  useEffect(() => {
    const fetchProfile = async (userId) => {
      // Fetch the profile data based on the authenticated user's UID
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setProfile(userDoc.data());
        } else {
          setError('No user profile found');
        }
      } catch (error) {
        setError('Error fetching user profile');
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        // If the user is not logged in, navigate to login page
        navigate('/login');
      } else {
        // If the user is logged in, check if they match the `uid` in the URL
        if (currentUser.uid !== uid) {
          // If the user tries to access another user's profile, redirect them
          setError('You do not have permission to view this profile.');
          setLoading(false);
          return;
        }

        // If the user is viewing their own profile, fetch data
        fetchProfile(currentUser.uid);
      }
    });

    // Cleanup subscription on component unmount
    return () => unsubscribe();
  }, [db, navigate, uid, auth]);

  if (loading) return <p>Loading user data...</p>;

  if (error) return <p>{error}</p>;

  return (
    <div className="user-page">
      <h1>Welcome, {profile ? profile.name : 'User'}</h1>
      {profile && (
        <div className="user-info">
          <p><strong>Name:</strong> {profile.name} {profile.surname}</p>
          <p><strong>Email:</strong> {profile.email}</p>
        </div>
      )}
    </div>
  );
};

export default UserPage;
