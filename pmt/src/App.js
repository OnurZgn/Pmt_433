import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import Dashboard from './Dashboard';
import UserPage from './UserPage';
import CreateProject from './CreateProject';  
import AssignRole from './AssignRole'; // Import AssignRole component

const App = () => (
  <Routes>
    <Route path="/" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/user/:uid" element={<UserPage />} />
    <Route path="/create-project" element={<CreateProject />} />
    <Route path="/assign-role" element={<AssignRole />} /> {/* Route for AssignRole */}
  </Routes>
);

export default App;
