import React, { useState } from 'react';
import { X, Send, AlertCircle, Wrench, Zap, Wifi, HelpCircle } from 'lucide-react';
import { API_BASE_URL } from '../config';
import './SupportModal.css';

const SupportModal = ({ isOpen, onClose, bookingId }) => {
  const [category, setCategory] = useState('Plumbing');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('${API_BASE_URL}/api/resident/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookingId, category, description })
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setDescription('');
        }, 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    { id: 'Plumbing', icon: <Wrench size={18} />, label: 'Plumbing' },
    { id: 'Electrical', icon: <Zap size={18} />, label: 'Electrical' },
    { id: 'WiFi', icon: <Wifi size={18} />, label: 'Internet/Wi-Fi' },
    { id: 'Other', icon: <HelpCircle size={18} />, label: 'Other/General' },
  ];

  return (
    <div className="modal-overlay fade-in">
      <div className="support-modal glass">
        <button className="close-btn" onClick={onClose}><X size={20} /></button>
        
        {success ? (
          <div className="success-state fade-in">
            <div className="success-icon">✓</div>
            <h3>Ticket Raised!</h3>
            <p>The owner has been notified via email. Help is on the way!</p>
          </div>
        ) : (
          <>
            <div className="modal-header">
              <AlertCircle className="header-icon" />
              <h2>Resident Support Desk</h2>
              <p>Need help? Let the owner know immediately.</p>
            </div>

            <form onSubmit={handleSubmit} className="support-form">
              <div className="category-grid">
                {categories.map((cat) => (
                  <div 
                    key={cat.id}
                    className={`category-item ${category === cat.id ? 'active' : ''}`}
                    onClick={() => setCategory(cat.id)}
                  >
                    {cat.icon}
                    <span>{cat.label}</span>
                  </div>
                ))}
              </div>

              <div className="input-group">
                <label>Issue Details</label>
                <textarea 
                  placeholder="Tell us more about the problem (e.g., Leaking tap in Room 4...)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary submit-btn" disabled={submitting}>
                <Send size={18} />
                <span>{submitting ? 'Sending Alert...' : 'Notify Owner Now'}</span>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default SupportModal;
