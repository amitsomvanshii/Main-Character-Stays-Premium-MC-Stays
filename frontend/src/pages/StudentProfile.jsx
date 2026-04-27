import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { QrCode, Download, XCircle, Home, Calendar, User, ShieldCheck, X, MapPin, CreditCard, HelpCircle, AlertCircle, CheckCircle, Bell, ClipboardCheck, Copy, Check, Sparkles, Cigarette, Moon, Wind, Users, Coffee, Music, Camera } from 'lucide-react';
import AgreementSigner from '../components/AgreementSigner';
import SupportModal from '../components/SupportModal';
import PaymentModal from '../components/PaymentModal';
import { generateAgreementPDF } from '../utils/agreementGenerator';
import { API_BASE_URL } from '../config';
import { getImageUrl } from '../utils/imageHelper';
import './StudentProfile.css';

const StudentProfile = () => {
  const { user, token, setUser, login } = useAuth();
  const navigate = useNavigate();
  const [imageUploading, setImageUploading] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cancellation Modal
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Phase 10: Resident Lifecycle
  const [signerBooking, setSignerBooking] = useState(null);
  const [supportBooking, setSupportBooking] = useState(null);
  const [payBooking, setPayBooking] = useState(null);
  const [payLoading, setPayLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [rentHistory, setRentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Resident Hub & Expenses
  const [hubData, setHubData] = useState({ active: false, roommates: [], expenses: [] });
  const [hubLoading, setHubLoading] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', involvedIds: [] });
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  // Lifestyle Matching
  const [lifestyle, setLifestyle] = useState(null);
  const [isLifestyleModalOpen, setIsLifestyleModalOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await fetch('${API_BASE_URL}/api/pgs/my-bookings', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Could not fetch bookings');
        const data = await res.json();
        setBookings(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (user?.role === 'STUDENT' && token) {
      fetchBookings();
      fetchHistory();
      fetchLifestyle();
      fetchHubData();
    } else {
      setLoading(false);
    }
  }, [user, token]);

  const fetchHubData = async () => {
    setHubLoading(true);
    try {
      const res = await fetch('${API_BASE_URL}/api/advanced/resident-hub', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setHubData(await res.json());
    } catch (err) { console.error(err); }
    finally { setHubLoading(false); }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (expenseForm.involvedIds.length === 0) return alert('Select at least one roommate');
    
    setIsAddingExpense(true);
    try {
      const res = await fetch('${API_BASE_URL}/api/advanced/expenses', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          description: expenseForm.description,
          totalAmount: parseFloat(expenseForm.amount),
          involvedUserIds: expenseForm.involvedIds
        })
      });
      if (res.ok) {
        setExpenseForm({ description: '', amount: '', involvedIds: [] });
        fetchHubData();
      }
    } catch (err) { alert(err.message); }
    finally { setIsAddingExpense(false); }
  };

  const handleSettleSplit = async (expenseId, userId) => {
    try {
      const res = await fetch('${API_BASE_URL}/api/advanced/expenses/settle', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ expenseId, userId })
      });
      if (res.ok) fetchHubData();
    } catch (err) { alert(err.message); }
  };

  const toggleRoommateSelection = (id) => {
    setExpenseForm(prev => ({
      ...prev,
      involvedIds: prev.involvedIds.includes(id) 
        ? prev.involvedIds.filter(x => x !== id)
        : [...prev.involvedIds, id]
    }));
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('${API_BASE_URL}/api/resident/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRentHistory(data);
      }
    } catch (err) {
      console.error('History Error:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const confirmCancel = async (bookingId) => {
    setCancelLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/pgs/booking/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to cancel');
      }
      
      // Update local state
      setBookings(prev => 
        prev.map(b => b.id === bookingId ? { ...b, status: 'CANCELLED', endDate: new Date().toISOString() } : b)
      );
      setCancelModal(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setCancelLoading(false);
    }
  };

  const handleDownloadAgreement = (booking) => {
    generateAgreementPDF(booking);
  };

  const handlePayRent = async (bookingId) => {
    setPayLoading(true);
    try {
      const res = await fetch('${API_BASE_URL}/api/resident/pay', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ bookingId })
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, rentStatus: 'PENDING_CONFIRMATION' } : b));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPayLoading(false);
    }
  };
  

  const fetchLifestyle = async () => {
    try {
      const res = await fetch('${API_BASE_URL}/api/advanced/lifestyle', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setLifestyle(await res.json());
    } catch (err) { console.error(err); }
  };

  const handleSaveLifestyle = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const res = await fetch('${API_BASE_URL}/api/advanced/lifestyle', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(lifestyle)
      });
      if (res.ok) {
        setIsLifestyleModalOpen(false);
        alert('Lifestyle profile updated! Your compatibility scores will now be visible on PG listing pages.');
      }
    } catch (err) { alert(err.message); }
    finally { setSaveLoading(false); }
  };

  const updateFactor = (key, val) => {
    setLifestyle(prev => ({ 
      ...(prev || { sleep: 3, clean: 3, social: 3, diet: 3, music: 3, smoker: false }), 
      [key]: val 
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profileImage', file);

    setImageUploading(true);
    try {
      const res = await fetch('${API_BASE_URL}/api/user/profile-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.message || 'Upload failed');
      
      // Update AuthContext with new token and user data to ensure persistence
      login(data.token, data.user);
      alert('Profile picture updated!');
    } catch (err) {
      alert(err.message.startsWith('Error:') ? err.message : `Error: ${err.message}`);
    } finally {
      setImageUploading(false);
    }
  };

  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'STUDENT') return <Navigate to="/" />;

  if (loading) return <div className="profile-container text-muted">Loading your profile...</div>;
  if (error) return <div className="profile-container error">{error}</div>;

  const activeBookings = bookings.filter(b => b.status === 'ACTIVE');
  const pastBookings = bookings.filter(b => b.status === 'CANCELLED');

  return (
    <div className="profile-container fade-in">
      <div className="profile-header">
        <div className="profile-avatar-container">
          <div className="profile-avatar">
            {user.profileImage ? (
              <img 
                src={getImageUrl(user.profileImage)} 
                alt={user.name} 
                className="user-dp-img"
              />
            ) : (
              <User size={40} color="#fff" />
            )}
            <label className="avatar-upload-overlay" title="Update Profile Picture">
               <Camera size={20} color="#fff" />
               <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
            </label>
            {imageUploading && <div className="avatar-loading-spinner"></div>}
          </div>
        </div>
          <div className="profile-info">
            <h1>{user.name}</h1>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <p className="text-muted">Student Account</p>
              <button 
                className="btn-secondary mini-btn"
                style={{ fontSize: '0.65rem', padding: '2px 8px' }}
                onClick={async () => {
                  await fetch('${API_BASE_URL}/api/resident/simulate-reminder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: user.email })
                  });
                  alert('Reminder Email Simulated!');
                }}
              >
                <Bell size={10} /> Test Bill Reminder
              </button>
            </div>
          </div>
          <div className="lifestyle-status-badge glass" onClick={() => setIsLifestyleModalOpen(true)}>
             <Sparkles size={16} color="var(--primary)" />
             <span>{lifestyle ? 'AI Matching: Active' : 'Complete AI Quiz'}</span>
          </div>
      </div>

      <div className="profile-content">
        <section className="booking-section">
          <h2>Active Stays</h2>
          {activeBookings.length === 0 ? (
            <div className="empty-state">
              <Home size={48} />
              <p>You don't have any active PG bookings.</p>
              <a href="/search" className="btn-primary">Find a PG</a>
            </div>
          ) : (
            <div className="booking-grid">
              {activeBookings.map(b => (
                <div key={b.id} className="booking-card active-pass-card">
                  <div className="pass-header">
                    <div className="pass-status active">RESIDENCY PASS</div>
                    <div className="pass-header-actions">
                      <Download 
                        size={16} 
                        className="pass-action-icon" 
                        onClick={(e) => { e.stopPropagation(); handleDownloadAgreement(b); }} 
                        title="Download Agreement"
                      />
                      <QrCode 
                        size={16} 
                        className="pass-action-icon" 
                        title="Digital Key / Entry QR"
                      />
                      <div className="pass-id">ID: #{b.id.slice(-6).toUpperCase()}</div>
                    </div>
                  </div>
                  
                  <div className="pass-body">
                    <div className="pass-main-info">
                      <h3>{b.bed.floor.pg.name}</h3>
                      <p className="address-line"><MapPin size={12} /> {b.bed.floor.pg.address}, {b.bed.floor.pg.city}</p>
                    </div>

                    {!b.isSigned ? (
                      <div className="residency-alert glass">
                        <AlertCircle className="pulse-icon" />
                        <div className="alert-content">
                          <h4>Signature Required</h4>
                          <p>Sign your agreement to activate full residency benefits.</p>
                        </div>
                        <button className="btn-primary small-btn" onClick={() => setSignerBooking(b)}>Sign Now</button>
                      </div>
                    ) : (
                      <div className="resident-lifestyle-grid">
                        <div className="lifestyle-card rent-status glass">
                          <label><CreditCard size={14} /> Rent Status</label>
                          <div className="rent-meter">
                            <span className={`status-pill {(b.rentStatus || 'PAID').toLowerCase()}`}>
                              {(b.rentStatus || 'PAID').replace('_', ' ')}
                            </span>
                            {b.nextRentDate && (
                              <p className="due-date">
                                {b.rentStatus === 'PAID' ? 'Next Due: ' : 'Was Due: '}
                                {new Date(b.nextRentDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                             <div className="rent-amount-row">
                               <span className="rent-due-amount">₹{Math.round(b.bed.floor.pg.rentMonthly * b.bed.priceMultiplier).toLocaleString('en-IN')}<small>/mo</small></span>
                               {b.rentStatus === 'PENDING_CONFIRMATION' ? (
                                 <div className="pending-status-stack">
                                   <span className="pending-badge">⏳ Awaiting Confirmation</span>
                                   <p className="pending-month-label">{b.pendingRentMonth}</p>
                                 </div>
                               ) : (() => {
                                 // Calculate target month and advance limit
                                 const nextDate = b.nextRentDate ? new Date(b.nextRentDate) : new Date();
                                 const targetMonthName = nextDate.toLocaleString('default', { month: 'long', year: 'numeric' });
                                 
                                 // Simple 4-month limit check
                                 const today = new Date();
                                 const monthsDiff = (nextDate.getFullYear() - today.getFullYear()) * 12 + (nextDate.getMonth() - today.getMonth());
                                 const isLimitReached = monthsDiff >= 4;

                                 if (isLimitReached) {
                                   return <span className="limit-badge">Max Advance Reached</span>;
                                 }

                                 return (
                                   <button
                                     className="btn-primary pay-rent-btn"
                                     onClick={() => setPayBooking({ ...b, targetMonth: targetMonthName })}
                                   >
                                     Pay for {targetMonthName.split(' ')[0]}
                                   </button>
                                 );
                               })()}
                             </div>
                        </div>
                        <div className="lifestyle-card support-hub glass" onClick={() => setSupportBooking(b)}>
                          <label><HelpCircle size={14} /> Resident Help</label>
                          <p>Raise a maintenance ticket</p>
                          <button className="hub-link-btn">Open Support Desk</button>
                        </div>
                      </div>
                    )}

                    {b.isSigned && b.checkInFormStatus !== 'SUBMITTED' && (
                        <div className="residency-alert checkin-alert glass mt-3">
                            <ClipboardCheck className="pulse-icon text-primary" />
                            <div className="alert-content">
                                <h4>Check-in Form Pending</h4>
                                <p>Complete your digital registration to confirm your stay.</p>
                            </div>
                            <button 
                                className="btn-primary small-btn" 
                                onClick={() => navigate(`/checkin/${b.id}`)}
                            >
                                Register Now
                            </button>
                        </div>
                    )}


                    {b.checkInFormStatus === 'SUBMITTED' && (
                        <div className="residency-alert checkin-success-alert glass mt-3">
                            <CheckCircle size={20} color="#10B981" />
                            <div className="alert-content">
                                <h4>Check-in Verified</h4>
                                <p>Your registration form is securely stored.</p>
                            </div>
                            <button 
                                className="btn-secondary small-btn" 
                                onClick={() => window.open(`${API_BASE_URL}/api/resident/checkin/${b.id}/download?token=${token}`, '_blank')}
                            >
                                <Download size={14} /> Form
                            </button>
                        </div>
                    )}

                    <div className="pass-grid">
                      <div className="pass-item">
                        <label>BED UNIT</label>
                        <strong>{b.bed.identifier} (F{b.bed.floor.floorNumber})</strong>
                      </div>
                      <div className="pass-item">
                        <label>MONTHLY</label>
                        <strong>₹{Math.round(b.bed.floor.pg.rentMonthly * b.bed.priceMultiplier)}</strong>
                      </div>
                      <div className="pass-item">
                        <label>MOVE IN</label>
                        <strong>{new Date(b.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                      </div>
                      <div className="pass-item">
                        <label>SECURITY</label>
                        <span className="kyc-success"><ShieldCheck size={12} /> SECURE</span>
                      </div>
                    </div>
                  </div>

                  <div className="pass-actions">
                    <button 
                      className="pass-btn-secondary"
                      onClick={() => setSupportBooking(b)}
                    >
                      <HelpCircle size={16} /> Support Hub
                    </button>
                    <button 
                      className="pass-btn-danger"
                      onClick={() => setCancelModal(b)}
                    >
                      <XCircle size={16} /> End Stay
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        {/* ─── Payment & Documents Hub ─── */}
        <section className="booking-section mt-5">
          <div className="section-header-row">
            <h2>Payment & Documents</h2>
            {activeBookings.length > 0 && (
              <div className="agreement-quick-link" onClick={() => handleDownloadAgreement(activeBookings[0])}>
                <Download size={16} /> Get Agreement
              </div>
            )}
          </div>
          
          <div className="payment-history-container glass">
            {historyLoading ? (
              <div className="history-loading">Fetching receipts...</div>
            ) : rentHistory.length === 0 ? (
              <div className="history-empty">No rent receipts generated yet.</div>
            ) : (
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>For Month</th>
                    <th>Property</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rentHistory.map(ph => (
                    <tr key={ph.id}>
                      <td>{ph.confirmedAt ? new Date(ph.confirmedAt).toLocaleDateString() : 'N/A'}</td>
                      <td>{ph.month}</td>
                      <td>{ph.booking?.bed?.floor?.pg?.name || 'Unknown PG'}</td>
                      <td>₹{ph.amount?.toLocaleString()}</td>
                      <td><span className="receipt-badge paid">PAID</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {pastBookings.length > 0 && (
          <section className="booking-section mt-5">
            <h2>Past Bookings</h2>
            <div className="booking-grid">
              {pastBookings.map(b => (
                <div key={b.id} className="booking-card inactive-card">
                  <div className="booking-status-tag inactive">CANCELLED</div>
                  <div className="booking-card-header">
                    <h3>{b.bed.floor.pg.name}</h3>
                    <p className="text-muted">Bed: {b.bed.identifier} (Floor {b.bed.floor.floorNumber})</p>
                  </div>
                  <div className="booking-details">
                    <div className="detail-row">
                      <Calendar size={14} /> 
                      <span>{new Date(b.startDate).toLocaleDateString()} — {b.endDate ? new Date(b.endDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── Resident Hub & Expense Tracker ─── */}
        {hubData.active && (
          <section className="resident-hub-section fade-in">
            <div className="hub-header">
              <h2><Users size={24} color="var(--primary)" /> Resident Hub: Floor {hubData.floorNumber}</h2>
              <div className="text-muted" style={{ fontSize: '0.9rem' }}>Chat and split bills with your floor-mates</div>
            </div>

            <div className="roommate-scroll">
              {hubData.roommates.length === 0 ? (
                <p className="text-muted">No other residents detected on your floor yet.</p>
              ) : (
                hubData.roommates.map(rm => (
                  <div key={rm.id} className="roommate-pill">
                    <div className="mini-avatar">{rm.name ? rm.name[0] : '?'}</div>
                    <div className="roommate-name">{rm.name}</div>
                    {rm.lifestyle && <Sparkles size={14} color="#FFB300" title="Lifestyle Profile Ready" />}
                  </div>
                ))
              )}
            </div>

            <div className="expense-tracker-grid">
              <div className="expense-tracker-main">
                <h3 className="mb-4">Recent Shared Expenses</h3>
                <div className="expense-list">
                  {hubData.expenses.length === 0 ? (
                    <div className="empty-state" style={{ padding: '30px' }}>
                      <CreditCard size={32} />
                      <p>No community expenses yet.</p>
                    </div>
                  ) : (
                    hubData.expenses.map(exp => (
                      <div key={exp.id} className="expense-card glass">
                        <div className="exp-header">
                          <span className="exp-desc">{exp.description}</span>
                          <span className="exp-amount">₹{exp.amount}</span>
                        </div>
                        <div className="exp-payer">Paid by {exp.payerId === user.id ? 'You' : exp.payerName}</div>
                        
                        <div className="split-list">
                          {exp.splits.map((s, idx) => (
                            <div key={idx} className="split-item">
                              <span className="split-user">
                                {s.userId === user.id ? 'You owe' : `${s.userName} owes`}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span className="split-user">₹{Math.round(s.amount)}</span>
                                <span className={`split-status ${s.status.toLowerCase()}`}>
                                  {s.status}
                                </span>
                                {exp.payerId === user.id && s.status === 'PENDING' && (
                                  <button 
                                    className="settle-btn"
                                    onClick={() => handleSettleSplit(exp.id, s.userId)}
                                  >
                                    Mark Paid
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="add-expense-sidebar">
                <div className="add-expense-card">
                  <h3>Add Shared Expense</h3>
                  <form onSubmit={handleAddExpense}>
                    <div className="form-group">
                      <label>Description</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Pizza, Internet, Cleaning" 
                        required
                        value={expenseForm.description}
                        onChange={e => setExpenseForm({...expenseForm, description: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Total Amount (₹)</label>
                      <input 
                        type="number" 
                        placeholder="0.00" 
                        required
                        value={expenseForm.amount}
                        onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Select Roommates to split with</label>
                      <div className="roommate-selector">
                        {hubData.roommates.map(rm => (
                          <div 
                            key={rm.id} 
                            className={`roommate-check ${expenseForm.involvedIds.includes(rm.id) ? 'selected' : ''}`}
                            onClick={() => toggleRoommateSelection(rm.id)}
                          >
                            <User size={14} />
                            {rm.name}
                          </div>
                        ))}
                      </div>
                      <p className="text-muted mt-2" style={{ fontSize: '0.7rem' }}>
                        * The total will be split equally between you and the selected roommates.
                      </p>
                    </div>
                    <button type="submit" className="btn-primary w-full" disabled={isAddingExpense}>
                      {isAddingExpense ? 'Splitting...' : 'Add Expense'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Cancellation Modal */}
      {cancelModal && (
        <div className="modal-overlay" onClick={() => setCancelModal(null)}>
          <div className="modal-content fade-in" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setCancelModal(null)}><X size={20} /></button>
            <h2 className="danger-text">Leave PG?</h2>
            <p className="text-muted">Are you sure you want to cancel your stay at <strong>{cancelModal.bed.floor.pg.name}</strong>?</p>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>This will immediately release bed {cancelModal.bed.identifier} and your access will be revoked.</p>

            <div className="modal-actions" style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
              <button 
                className="btn-secondary" 
                style={{ flex: 1 }} 
                onClick={() => setCancelModal(null)}
              >
                No, Keep it
              </button>
              <button 
                className="btn-primary danger-btn" 
                style={{ flex: 1, background: '#F44336', borderColor: '#F44336' }}
                onClick={() => confirmCancel(cancelModal.id)}
                disabled={cancelLoading}
              >
                {cancelLoading ? 'Cancelling...' : 'Yes, Cancel Stay'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 10: Resident Lifecycle Modals */}
      {signerBooking && (
        <AgreementSigner 
          booking={signerBooking} 
          onComplete={() => {
            setSignerBooking(null);
            // Refresh bookings
            window.location.reload();
          }} 
        />
      )}

      {supportBooking && (
        <SupportModal 
          isOpen={true} 
          onClose={() => setSupportBooking(null)} 
          bookingId={supportBooking.id} 
        />
      )}

      {payBooking && (
        <PaymentModal
          booking={payBooking}
          onClose={() => setPayBooking(null)}
          onSuccess={() => {
            setBookings(prev =>
              prev.map(b => b.id === payBooking.id
                ? { ...b, rentStatus: 'PENDING_CONFIRMATION' }
                : b
              )
            );
            setPayBooking(null);
          }}
        />
      )}

      {/* AI Lifestyle Quiz Modal */}
      {isLifestyleModalOpen && (
        <div className="modal-overlay" onClick={() => setIsLifestyleModalOpen(false)}>
          <div className="modal-content lifestyle-modal fade-in" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsLifestyleModalOpen(false)}><X size={20} /></button>
            <div className="quiz-header">
              <Sparkles className="sparkle-gold" size={32} />
              <h2>Roommate Compatibility Quiz</h2>
              <p className="text-muted">Help our AI find you the perfect roommate match.</p>
            </div>

            <form onSubmit={handleSaveLifestyle} className="lifestyle-quiz-form">
              <div className="quiz-grid">
                <div className="quiz-item">
                  <div className="quiz-label"><Moon size={18} /> Sleep Schedule</div>
                  <div className="slider-wrap">
                    <span>Early Bird</span>
                    <input type="range" min="1" max="5" value={lifestyle?.sleep || 3} onChange={e => updateFactor('sleep', parseInt(e.target.value))} />
                    <span>Night Owl</span>
                  </div>
                </div>

                <div className="quiz-item">
                  <div className="quiz-label"><Wind size={18} /> Cleanliness</div>
                  <div className="slider-wrap">
                    <span>Relaxed</span>
                    <input type="range" min="1" max="5" value={lifestyle?.clean || 3} onChange={e => updateFactor('clean', parseInt(e.target.value))} />
                    <span>Neat-freak</span>
                  </div>
                </div>

                <div className="quiz-item">
                  <div className="quiz-label"><Users size={18} /> Social Level</div>
                  <div className="slider-wrap">
                    <span>Introvert</span>
                    <input type="range" min="1" max="5" value={lifestyle?.social || 3} onChange={e => updateFactor('social', parseInt(e.target.value))} />
                    <span>Extrovert</span>
                  </div>
                </div>

                <div className="quiz-item">
                  <div className="quiz-label"><Coffee size={18} /> Diet</div>
                  <div className="slider-wrap">
                    <span>Veg Only</span>
                    <input type="range" min="1" max="5" value={lifestyle?.diet || 3} onChange={e => updateFactor('diet', parseInt(e.target.value))} />
                    <span>Anything</span>
                  </div>
                </div>

                <div className="quiz-item">
                  <div className="quiz-label"><Music size={18} /> Music/Noise</div>
                  <div className="slider-wrap">
                    <span>Silent</span>
                    <input type="range" min="1" max="5" value={lifestyle?.music || 3} onChange={e => updateFactor('music', parseInt(e.target.value))} />
                    <span>Loud</span>
                  </div>
                </div>

                <div className="quiz-item smoker-toggle">
                  <label className="toggle-label">
                    <div className="quiz-label"><Cigarette size={18} /> Do you smoke?</div>
                    <input type="checkbox" checked={lifestyle?.smoker || false} onChange={e => updateFactor('smoker', e.target.checked)} />
                  </label>
                </div>
              </div>

              <button type="submit" className="btn-primary auth-submit w-full mt-4" disabled={saveLoading}>
                {saveLoading ? 'Optimizing AI...' : 'Save Profile & Active Matches'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentProfile;
