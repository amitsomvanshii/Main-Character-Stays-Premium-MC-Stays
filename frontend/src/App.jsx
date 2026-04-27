import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import PgSearch from './pages/PgSearch';
import PgDetail from './pages/PgDetail';
import OwnerDashboard from './pages/OwnerDashboard';
import StudentProfile from './pages/StudentProfile';
import CheckInForm from './pages/CheckInForm';
import AdminDashboard from './pages/AdminDashboard';
import Messages from './pages/Messages';
import Legal from './pages/Legal';
import Company from './pages/Company';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import { AuthProvider } from './contexts/AuthContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <div className="app-layout">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/search" element={<PgSearch />} />
              <Route path="/pg/:id" element={<PgDetail />} />
              <Route path="/manage" element={<OwnerDashboard />} />
              <Route path="/profile" element={<StudentProfile />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/checkin/:bookingId" element={<CheckInForm />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/legal/:section" element={<Legal />} />
              <Route path="/company/:section" element={<Company />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
