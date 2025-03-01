import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import './Register.css';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); 
  const [surname, setSurname] = useState(''); 
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    const auth = getAuth();

    try {
      // Register the user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Send user data (name, surname, email) to Cloud Function
      const url = "http://localhost:5001/projectmanagmenttool433/us-central1/addmessage"; // Cloud Function URL
      const userData = {
        email: user.email,
        name: name,
        surname: surname,
      };

       // Make a GET request to the Cloud Function, passing the user data
    const response = await fetch(`${url}?name=${encodeURIComponent(userData.name)}&surname=${encodeURIComponent(userData.surname)}&email=${encodeURIComponent(userData.email)}`, {
      method: 'GET',
    });

    // Handle the response from the Cloud Function
    const data = await response.json();
    console.log("Response from Cloud Function:", data);

    if (response.ok) {
      // Provide feedback to the user (successful registration)
      setMessage('Registration successful! User profile has been created.');

      // Optionally navigate to the login page or home page after successful registration
      navigate('/login');  // or navigate('/home');
    } else {
      // If Cloud Function failed, show an error
      setError('Failed to save user data. Please try again.');
    }

      // Optionally navigate to the home page or login page
      navigate('/');

    } catch (err) {
      setError('Registration failed. Please try again.');
    }
  };

  return (
    <div className="register-container">
      <h2>Register</h2>
      <form onSubmit={handleRegister}>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Surname"
          value={surname}
          onChange={(e) => setSurname(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Register</button>
      </form>
      
      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}
    </div>
  );
};

export default Register;
