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
      // Firebase Authentication ile kullanıcı kaydı yap
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Firestore Emulator kullanıyorsan LOCALHOST'u kullan
      const url = "http://localhost:5001/projectmanagmenttool433/us-central1/addmessage"; // Firestore Emulator için

      const userData = {
        email: user.email,
        name: name,
        surname: surname,
      };

      // Cloud Function'a GET isteği yap
      const response = await fetch(`${url}?name=${encodeURIComponent(userData.name)}&surname=${encodeURIComponent(userData.surname)}&email=${encodeURIComponent(userData.email)}`, {
        method: 'GET',
      });

      const data = await response.json();
      console.log("Response from Cloud Function:", data);

      if (response.ok) {
        setMessage('Kayıt başarılı! Kullanıcı Firestore\'a eklendi.');
        navigate('/login');  // Kayıt başarılıysa giriş sayfasına yönlendir
      } else {
        setError('Kullanıcı verisi Firestore\'a kaydedilemedi. Lütfen tekrar deneyin.');
      }

    } catch (err) {
      setError('Kayıt başarısız. Lütfen tekrar deneyin.');
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
