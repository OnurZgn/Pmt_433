import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import Dashboard from './Dashboard';
import UserPage from './UserPage';
import CreateProject from './CreateProject';  // Import CreateProject component

const App = () => (
  <Routes>
    <Route path="/" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/user/:uid" element={<UserPage />} />
    <Route path="/create-project" element={<CreateProject />} /> {/* Route for CreateProject */}
  </Routes>
);

export default App;
