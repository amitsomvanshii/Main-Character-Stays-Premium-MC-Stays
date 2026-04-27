import React, { useState } from 'react';
import { ShieldCheck, FileText, CheckCircle, ChevronRight } from 'lucide-react';
import { API_BASE_URL } from '../config';
import './AgreementSigner.css';

const AgreementSigner = ({ booking, onComplete }) => {
  const [step, setStep] = useState(1); // 1: Preview, 2: Sign, 3: Success
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSign = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/resident/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookingId: booking.id })
      });

      if (res.ok) {
        setStep(3);
        setTimeout(onComplete, 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="signer-overlay fade-in">
      <div className="signer-container glass">
        
        {step === 1 && (
          <div className="signer-step fade-in">
            <div className="signer-header">
              <FileText className="h-icon" />
              <h2>Verify Residency Agreement</h2>
              <p>Please review your digital residency pass terms.</p>
            </div>
            <div className="doc-preview">
              <h3>Professional Residency & Licence Agreement</h3>
              <p>This digital agreement is entered between the Owner (Licensor) and the Resident <strong>{booking?.occupantName || booking?.user?.name || 'Resident'}</strong> (Licensee) for the property located at <strong>{booking?.bed?.floor?.pg?.address || 'the property address'}</strong>.</p>
              <ul>
                <li>Total Monthly Licence Fee: <strong>₹{Math.round((booking?.bed?.floor?.pg?.rentMonthly || 0) * (booking?.bed?.priceMultiplier || 1.0))}</strong></li>
                <li>Premises: Bed <strong>{booking?.bed?.identifier}</strong> at <strong>{booking?.bed?.floor?.pg?.name}</strong>.</li>
                <li>Licensee agrees to abide by all Community Rules regarding noise, guests, and property maintenance as detailed in the SmartPG Digital Terms.</li>
                <li>Digital signature constitutes a legally binding agreement under the Information Technology Act.</li>
              </ul>
              <div className="doc-stamp">SMARTPG VERIFIED</div>
            </div>
            <button className="btn-primary full-width" onClick={() => setStep(2)}>
              Proceed to Sign <ChevronRight size={18} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="signer-step fade-in">
            <div className="signer-header">
              <ShieldCheck className="h-icon secure" />
              <h2>Final Certification</h2>
              <p>Your digital signature activates your residency.</p>
            </div>
            <div className="signature-box glass">
              <div className="signature-content">
                <input 
                  type="checkbox" 
                  id="agree" 
                  checked={agreed} 
                  onChange={(e) => setAgreed(e.target.checked)} 
                />
                <label htmlFor="agree">
                  I confirm that I have read the occupancy terms and agree to abide by the rules of this community.
                </label>
              </div>
            </div>
            <button 
              className="btn-primary full-width sign-btn" 
              disabled={!agreed || submitting}
              onClick={handleSign}
            >
              {submitting ? 'Authenticating...' : 'Sign Digital Agreement'}
            </button>
            <button className="btn-secondary link-btn" onClick={() => setStep(1)}>Go Back</button>
          </div>
        )}

        {step === 3 && (
          <div className="signer-step success-step fade-in">
            <CheckCircle className="big-success-icon" />
            <h2>Residency Activated!</h2>
            <p>Welcome home! Your digital agreement is now securely stored.</p>
            <div className="confetti-sim">🎉</div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AgreementSigner;
