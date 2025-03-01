import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth'; // Import sendEmailVerification
import './Register.css';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    const auth = getAuth();
    try {
      // Create the user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Send verification email after successful registration
      await sendEmailVerification(user);

      // Provide feedback to the user
      setMessage('Kayıt başarılı! Lütfen e-posta adresinizi doğrulamak için gelen kutunuzu kontrol edin.');

      // Optionally, navigate to the login page or home page
      navigate('/');

    } catch (err) {
      setError('Kayıt başarısız. Lütfen tekrar deneyin.');
    }
  };

  return (
    <div className="register-container">
      <h2>Kayıt Ol</h2>
      <form onSubmit={handleRegister}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Kayıt Ol</button>
      </form>
      
      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>} {/* Success message */}
    </div>
  );
};

export default Register;
