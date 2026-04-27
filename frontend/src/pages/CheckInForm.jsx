import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, Phone, MapPin, Briefcase, Camera, Calendar, CheckCircle, Download, Loader, ClipboardCheck } from 'lucide-react';
import { API_BASE_URL } from '../config';
import './CheckInForm.css';

const CheckInForm = () => {
  const { bookingId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    profession: '',
    permanentAddress: '',
    phoneNumber: '',
    checkInDate: new Date().toISOString().split('T')[0],
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        // We use the regular booking fetch but filtered for check-in
        const res = await fetch(`${API_BASE_URL}/api/pgs/my-bookings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        const current = data.find(b => b.id === bookingId);
        
        if (!current) throw new Error('Booking not found or unauthorized');
        if (current.checkInFormStatus === 'SUBMITTED') {
          setSubmitted(true);
        }
        setBooking(current);
        setFormData(prev => ({
            ...prev,
            phoneNumber: current.user.phone || ''
        }));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchBooking();
  }, [bookingId, token]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const body = new FormData();
    body.append('profession', formData.profession);
    body.append('permanentAddress', formData.permanentAddress);
    body.append('phoneNumber', formData.phoneNumber);
    body.append('checkInDate', formData.checkInDate);
    if (photo) body.append('photo', photo);

    try {
      const res = await fetch(`${API_BASE_URL}/api/resident/checkin/${bookingId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body
      });

      if (!res.ok) throw new Error('Failed to submit check-in form');
      
      setSubmitted(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = () => {
    window.open(`${API_BASE_URL}/api/resident/checkin/${bookingId}/download?token=${token}`, '_blank');
  };

  if (loading) return <div className="loading-container"><Loader className="spinner" /></div>;
  if (error) return <div className="error-view"><h2>Oops!</h2><p>{error}</p><button onClick={() => navigate('/')}>Go Home</button></div>;

  return (
    <div className="checkin-page fade-in">
      <div className="checkin-container glass">
        <div className="checkin-header">
          <ClipboardCheck size={40} className="header-icon" />
          <h1>Resident Registration</h1>
          <p className="text-muted">Digital Check-in for {booking.bed.floor.pg.name}</p>
        </div>

        {submitted ? (
          <div className="success-view slide-up">
            <CheckCircle size={64} color="#10B981" />
            <h2>Registration Complete!</h2>
            <p>Your check-in details have been verified and sent to the owner.</p>
            <div className="success-actions">
              <button className="btn-primary download-btn" onClick={handleDownload}>
                <Download size={18} /> Download Registration Form
              </button>
              <button className="btn-secondary" onClick={() => navigate('/profile')}>
                Back to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <form className="checkin-form" onSubmit={handleSubmit}>
            <div className="form-section">
              <h3><User size={18} /> Personal Details</h3>
              <div className="input-row">
                <div className="input-group">
                  <label>Full Name</label>
                  <input type="text" value={booking.occupantName || booking.user.name} disabled />
                </div>
                <div className="input-group">
                  <label>Profession</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Student, Software Engineer" 
                    value={formData.profession}
                    onChange={e => setFormData({...formData, profession: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="input-row">
                <div className="input-group">
                    <label>Aadhar Number</label>
                    <input type="text" value={booking.aadharNumber || 'N/A'} disabled />
                </div>
                <div className="input-group">
                  <label>Phone Number</label>
                  <input 
                    type="tel" 
                    value={formData.phoneNumber}
                    onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3><MapPin size={18} /> Address & Stay</h3>
              <div className="input-group full-width">
                <label>Permanent Address</label>
                <textarea 
                  placeholder="Enter your full permanent address as per ID proof"
                  value={formData.permanentAddress}
                  onChange={e => setFormData({...formData, permanentAddress: e.target.value})}
                  required
                />
              </div>
              <div className="input-group">
                <label>Actual Check-in Date</label>
                <input 
                  type="date" 
                  value={formData.checkInDate}
                  onChange={e => setFormData({...formData, checkInDate: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="form-section">
              <h3><Camera size={18} /> Photo Verification</h3>
              <div className="photo-upload-area">
                {photoPreview ? (
                  <div className="photo-preview-wrap">
                    <img src={photoPreview} alt="Preview" />
                    <button type="button" className="remove-photo" onClick={() => {setPhoto(null); setPhotoPreview(null);}}>X</button>
                  </div>
                ) : (
                  <label className="photo-label">
                    <Camera size={32} />
                    <span>Upload a clear face photo</span>
                    <input type="file" accept="image/*" capture="user" onChange={handlePhotoChange} required />
                  </label>
                )}
              </div>
            </div>

            <button type="submit" className="btn-primary submit-checkin-btn" disabled={submitting}>
              {submitting ? 'Verifying Details...' : 'Complete Check-in'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default CheckInForm;
