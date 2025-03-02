import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import './AssignRole.css';

const AssignRole = () => {
  const [targetUid, setTargetUid] = useState(''); // Target user's UID for role assignment
  const [newRole, setNewRole] = useState('viewer'); // New role to be assigned
  const [error, setError] = useState(''); // Error message
  const [message, setMessage] = useState(''); // Success message
  const [isAdmin, setIsAdmin] = useState(false); // State to check if the user is an admin

  useEffect(() => {
    const checkAdminStatus = async () => {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) return;

      // Fetch user data from Firestore using the UID to check role
      try {
        const response = await fetch(`http://localhost:5001/projectmanagmenttool433/us-central1/getUserRole`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ uid: user.uid }), // Sending UID in the request body
        });

        const data = await response.json();

        // Check if the role is 'admin'
        if (response.ok && data && data.role === "admin") {
          setIsAdmin(true); // Set admin status to true if user is an admin
        }
      } catch (error) {
        console.error('Error while checking admin status:', error);
      }
    };

    checkAdminStatus(); // Call function to check if the user is an admin
  }, []);

  const handleAssignRole = async (e) => {
    e.preventDefault();
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      setError('You must be logged in to assign roles.'); // Display error if the user is not logged in
      return;
    }

    try {
      // Make a POST request to assign the role
      const response = await fetch("http://localhost:5001/projectmanagmenttool433/us-central1/assignRole", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminUid: user.uid, // Current user's UID (admin)
          targetUid: targetUid, // Target user's UID to update role
          newRole: newRole, // The new role to assign
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage(`Successfully updated role of user ${targetUid} to ${newRole}.`); // Success message on role update
      } else {
        setError(data.error || 'Failed to assign role.'); // Display error message if role assignment fails
      }
    } catch (err) {
      setError('Error assigning role. Please try again.'); // General error message for failed role assignment
    }
  };

  return (
    <div className="assign-role-container">
      <h2>Assign Role</h2>

      {/* Only show the form if the user is an admin */}
      {isAdmin ? (
        <form onSubmit={handleAssignRole}>
          <input
            type="text"
            placeholder="Target User UID"
            value={targetUid}
            onChange={(e) => setTargetUid(e.target.value)} // Update target UID state
            required
          />
          <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>  
            <option value="viewer">Viewer</option>
            <option value="developer">Developer</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit">Assign Role</button>
        </form>
      ) : (
        <p className="no-permission-message">You do not have permission to assign roles.</p> 
      )}

      {error && <p className="error-message">{error}</p>} 
      {message && <p className="success-message">{message}</p>} 
    </div>
  );
};

export default AssignRole;
