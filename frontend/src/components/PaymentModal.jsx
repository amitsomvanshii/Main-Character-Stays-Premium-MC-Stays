import React, { useState } from 'react';
import { X, CheckCircle, Lock, IndianRupee, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '../config';
import './PaymentModal.css';

const PaymentModal = ({ booking, onClose, onSuccess }) => {
  const [step, setStep] = useState('confirm'); // 'confirm' | 'processing' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  const amount = Math.round((booking?.bed?.floor?.pg?.rentMonthly || 0) * (booking?.bed?.priceMultiplier || 1.0));
  const pgName = booking?.bed?.floor?.pg?.name || 'PG Property';
  const bedId = booking?.bed?.identifier || 'N/A';
  const token = localStorage.getItem('token');

  const handleManualPayment = async () => {
    setStep('processing');
    try {
      const res = await fetch('${API_BASE_URL}/api/resident/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bookingId: booking.id,
          targetMonth: booking.targetMonth // Pass the specific month
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Payment submission failed');

      setStep('success');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2500);
    } catch (e) {
      setErrorMsg(e.message);
      setStep('error');
    }
  };

  return (
    <div className="payment-overlay fade-in" onClick={onClose}>
      <div className="payment-modal glass" onClick={(e) => e.stopPropagation()}>

        {/* ─── Header ─── */}
        <div className="payment-header">
          <div className="payment-brand">
            <div className="payment-logo"><IndianRupee size={18} /></div>
            <div>
              <h3>Rent Payment</h3>
              <p>{pgName} · Bed {bedId}</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {/* ─── Amount Banner ─── */}
        <div className="payment-amount-bar">
          <span className="amount-label">Amount due for this cycle</span>
          <span className="amount-value">₹{amount.toLocaleString('en-IN')}</span>
        </div>

        {/* ─── Confirm Step ─── */}
        {step === 'confirm' && (
          <div className="payment-step fade-in">
            <div className="summary-card glass">
              <p className="step-title">Transaction Summary</p>
              <div className="payment-summary-row"><span>Billing Period</span><strong>{booking.targetMonth}</strong></div>
              <div className="payment-summary-row"><span>Property</span><strong>{pgName}</strong></div>
              <div className="payment-summary-row"><span>Accommodation</span><strong>Bed {bedId}</strong></div>
              <div className="payment-summary-row total-row"><span>Total Payable</span><strong>₹{amount.toLocaleString('en-IN')}</strong></div>
            </div>

            <div className="manual-instruction glass">
              <ShieldCheck size={20} className="text-primary" />
              <p>Please ensure you have transferred the amount to the owner via UPI, Bank Transfer or Cash before confirming.</p>
            </div>

            <button className="pay-btn btn-primary" onClick={handleManualPayment}>
              <span>Confirm & Notify Owner</span>
              <ArrowRight size={16} />
            </button>
            <p className="payment-notice">Confirming will notify the owner to verify your receipt.</p>
          </div>
        )}

        {step === 'processing' && (
          <div className="payment-step processing-step fade-in">
            <div className="processing-spinner" />
            <h3>Notifying Property Manager...</h3>
            <p>Please wait while we log your payment request.</p>
          </div>
        )}

        {step === 'success' && (
          <div className="payment-step success-step fade-in">
            <div className="success-ring">
              <CheckCircle size={48} />
            </div>
            <h3>Request Submitted!</h3>
            <p>Your payment signal for ₹{amount.toLocaleString('en-IN')} has been sent.</p>
            <p className="success-sub">Owner has been notified and will confirm the receipt in their dashboard.</p>
          </div>
        )}

        {step === 'error' && (
          <div className="payment-step error-step fade-in">
            <div className="error-ring">
              <AlertCircle size={48} />
            </div>
            <h3>Submission Failed</h3>
            <p>{errorMsg}</p>
            <button className="pay-btn btn-primary" onClick={() => setStep('confirm')}>Try Again</button>
          </div>
        )}

      </div>
    </div>
  );
};

export default PaymentModal;
