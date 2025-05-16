import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Pages & Components
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ResetPassword from './components/auth/ResetPassword';
import CreateProject from './components/projects/CreateProject';
import ProjectDetails from './components/projects/ProjectDetails';
import EditProject from './components/projects/EditProject';
import EditTask from './components/projects/EditTask';
import ViewTask from './components/projects/ViewTask';
import CreateTask from './components/projects/CreateTask';
import UserPage from './components/users/UserPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ProjectProvider>
          <Routes>
            {/* Public routes wrapped in Layout */}
            <Route path="/" element={<Layout><Home /></Layout>} />
            <Route path="/login" element={<Layout><Login /></Layout>} />
            <Route path="/register" element={<Layout><Register /></Layout>} />
            <Route path="/reset-password" element={<Layout><ResetPassword /></Layout>} />

            {/* Protected routes with Layout */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Layout><Dashboard /></Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/projects/create" 
              element={
                <ProtectedRoute>
                  <Layout><CreateProject /></Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/projects/:projectId" 
              element={
                <ProtectedRoute>
                  <Layout><ProjectDetails /></Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/projects/:projectId/edit" 
              element={
                <ProtectedRoute>
                  <Layout><EditProject /></Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/projects/:projectId/tasks/:taskId" 
              element={
                <ProtectedRoute>
                  <Layout><ViewTask /></Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/projects/:projectId/tasks/:taskId/edit" 
              element={
                <ProtectedRoute>
                  <Layout><EditTask /></Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/projects/:projectId/tasks/create" 
              element={
                <ProtectedRoute>
                  <Layout><CreateTask /></Layout>
                </ProtectedRoute>
              } 
            />

            {/* User Page */}
            <Route 
              path="/user/:userId" 
              element={
                <ProtectedRoute>
                  <Layout><UserPage /></Layout>
                </ProtectedRoute>
              } 
            />

            {/* Redirect unknown routes */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </ProjectProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;