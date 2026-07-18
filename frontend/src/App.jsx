import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import CitizenPortal from './pages/CitizenPortal';
import MunicipalityPortal from './pages/MunicipalityPortal';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/citizen" element={<CitizenPortal />} />
          <Route path="/municipality" element={<MunicipalityPortal />} />
          {/* Wildcard redirect back to landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
