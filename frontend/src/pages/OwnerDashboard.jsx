import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PlusCircle, ChevronDown, ChevronUp, BedDouble, Layers, Home, Camera, X, Upload, AlertTriangle, Trash2, IndianRupee, Users, CreditCard, HelpCircle, CheckCircle2, FileText, Download, User, TrendingUp } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { getImageUrl } from '../utils/imageHelper';
import PgDetailsEditor from '../components/PgDetailsEditor';
import './OwnerDashboard.css';

const DashboardSkeleton = () => (
  <div className="dashboard-container">
    <div className="dashboard-header">
      <div className="skeleton" style={{ width: '300px', height: '40px' }} />
      <div className="skeleton" style={{ width: '150px', height: '45px', borderRadius: '30px' }} />
    </div>
    <div className="dashboard-tabs">
      <div className="skeleton" style={{ width: '160px', height: '40px', borderRadius: '10px' }} />
      <div className="skeleton" style={{ width: '160px', height: '40px', borderRadius: '10px' }} />
    </div>
    <div className="performance-grid" style={{ marginTop: '24px' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="metric-card glass skeleton" style={{ height: '120px' }} />
      ))}
    </div>
    <div className="my-pgs" style={{ marginTop: '32px' }}>
      <div className="skeleton" style={{ width: '200px', height: '30px', marginBottom: '20px' }} />
      {[1, 2].map(i => (
        <div key={i} className="pg-manage-card skeleton" style={{ height: '100px', marginBottom: '16px' }} />
      ))}
    </div>
  </div>
);

const COMMON_FACILITIES = ['WiFi', 'AC', 'Laundry', 'Hot Water', 'Parking', 'CCTV', 'Gym', 'Mess/Food', 'Power Backup', 'Security Guard'];

const OwnerDashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [myPgs, setMyPgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPg, setExpandedPg] = useState(null);

  // Form states
  const [pgForm, setPgForm] = useState({ name: '', state: '', city: '', address: '', rentMonthly: '', facilities: [] });
  const [pgFormOpen, setPgFormOpen] = useState(false);
  const [pgError, setPgError] = useState(null);

  const [floorForm, setFloorForm] = useState({ pgId: '', floorNumber: '' });
  const [floorAddingFor, setFloorAddingFor] = useState(null);
  const [floorError, setFloorError] = useState(null);

  const [bedForm, setBedForm] = useState({ floorId: '', identifier: '', priceMultiplier: '1.0' });
  const [bedAddingFor, setBedAddingFor] = useState(null);
  const [bedPhotoAddingFor, setBedPhotoAddingFor] = useState(null);
  const [bedError, setBedError] = useState(null);
  const bedFileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'residents'
  const [pendingPayments, setPendingPayments] = useState([]);
  const [activeIssues, setActiveIssues] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [residentLoading, setResidentLoading] = useState(false);
  const [editDetailsPg, setEditDetailsPg] = useState(null); // PG details editor
  const [rentHistory, setRentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [residentBookings, setResidentBookings] = useState([]);
  const [vacancyInsights, setVacancyInsights] = useState({}); // { pgId: insight }
  const [insightsLoading, setInsightsLoading] = useState(false);


  // Photo upload states
  const [photoUploadFor, setPhotoUploadFor] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!user || user.role !== 'OWNER') { navigate('/'); return; }
    fetchMyPgs();
    fetchResidentData(); // Fetch issues for the metric card
  }, [user]);

  const fetchMyPgs = async () => {
    setLoading(true);
    try {
      const res = await fetch('${API_BASE_URL}/api/pgs/mine', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch your PGs');
      setMyPgs(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchVacancyInsights = async (pgId) => {
    if (vacancyInsights[pgId]) return; // Cache
    setInsightsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/advanced/pgs/${pgId}/vacancy-forecast`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVacancyInsights(prev => ({ ...prev, [pgId]: data }));
      }
    } catch (e) {
      console.warn('Vacancy insights failed', e);
    } finally {
      setInsightsLoading(false);
    }
  };

  const fetchResidentData = async () => {
    setResidentLoading(true);
    try {
      const res = await fetch('${API_BASE_URL}/api/pgs/mine', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch resident data');
      const data = await res.json();
      
      // Safely extract all bookings from the nested structure
      const allBookings = (data || []).flatMap(pg =>
        (pg.floors || []).flatMap(f =>
          (f.beds || []).flatMap(b => (b.bookings || []).map(bk => ({
            ...bk,
            bed: { ...b, floor: { ...f, pg } } // re-attach pg context
          })))
        )
      );

      setPendingPayments(allBookings.filter(b => b.rentStatus === 'PENDING_CONFIRMATION' && b.status === 'ACTIVE'));
      
      const allIssues = allBookings.flatMap(b => (b.issues || []).filter(i => i.status === 'OPEN').map(i => ({ ...i, booking: b })));
      setActiveIssues(allIssues);
      setResidentBookings(allBookings.filter(b => b.status === 'ACTIVE'));
    } catch (e) { 
      console.error('Resident hub error:', e); 
    } finally {
      setResidentLoading(false);
    }
  };

  const fetchRentHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('${API_BASE_URL}/api/resident/owner-history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRentHistory(data);
      }
    } catch (e) {
      console.error('Rent history error:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'residents') {
      fetchResidentData();
      fetchRentHistory();
    }
  }, [activeTab]);

  const handleConfirmRent = async (bookingId) => {
    setActionLoading(true);
    try {
      const res = await fetch('${API_BASE_URL}/api/resident/confirm-rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ bookingId })
      });
      if (res.ok) {
        setPendingPayments(prev => prev.filter(b => b.id !== bookingId));
      }
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const handleCloseIssue = async (issueId) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/resident/issue/${issueId}/close`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setActiveIssues(prev => prev.filter(i => i.id !== issueId));
      }
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };


  const handleToggleFacility = (fac) => {
    setPgForm(prev => ({
      ...prev,
      facilities: prev.facilities.includes(fac)
        ? prev.facilities.filter(f => f !== fac)
        : [...prev.facilities, fac]
    }));
  };

  const handleCreatePg = async (e) => {
    e.preventDefault();
    setPgError(null);
    try {
      const res = await fetch('${API_BASE_URL}/api/pgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...pgForm, rentMonthly: Number(pgForm.rentMonthly) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPgForm({ name: '', state: '', city: '', address: '', rentMonthly: '', facilities: [] });
      setPgFormOpen(false);
      fetchMyPgs();
    } catch (err) { setPgError(err.message); }
  };

  const handleAddFloor = async (e, pgId) => {
    e.preventDefault();
    setFloorError(null);
    try {
      const res = await fetch('${API_BASE_URL}/api/pgs/floor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ pgId, floorNumber: Number(floorForm.floorNumber) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setFloorForm({ pgId: '', floorNumber: '' });
      setFloorAddingFor(null);
      fetchMyPgs();
    } catch (err) { setFloorError(err.message); }
  };

  const handleAddBed = async (e, floorId) => {
    e.preventDefault();
    setBedError(null);
    try {
      const res = await fetch('${API_BASE_URL}/api/pgs/bed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ floorId, identifier: bedForm.identifier, priceMultiplier: Number(bedForm.priceMultiplier) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setBedForm({ floorId: '', identifier: '', priceMultiplier: '1.0' });
      setBedAddingFor(null);
      fetchMyPgs();
    } catch (err) { setBedError(err.message); }
  };

  const handleDeletePg = async (id) => {
    if (!window.confirm('Are you sure you want to delete this PG? All floors and beds will be permanently removed.')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/pgs/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      fetchMyPgs();
    } catch (err) { alert(err.message); }
  };

  const handleDeleteFloor = async (id) => {
    if (!window.confirm('Delete this floor and all its beds?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/pgs/floor/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      fetchMyPgs();
    } catch (err) { alert(err.message); }
  };

  const handleDeleteBed = async (id) => {
    if (!window.confirm('Delete this bed?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/pgs/bed/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      fetchMyPgs();
    } catch (err) { alert(err.message); }
  };

  // ─── Photo helpers ───────────────────────────────────────────────────────────
  const handleFilesSelected = (files) => {
    const valid = Array.from(files).filter(f => f.type.startsWith('image/'));
    setSelectedFiles(valid);
    setPreviews(valid.map(f => URL.createObjectURL(f)));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFilesSelected(e.dataTransfer.files);
  };

  const removePreview = (idx) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUploadPhotos = async (pgId) => {
    if (selectedFiles.length === 0) return;
    setPhotoUploading(true);
    setPhotoError(null);
    try {
      const formData = new FormData();
      selectedFiles.forEach(f => formData.append('photos', f));
      const res = await fetch(`${API_BASE_URL}/api/pgs/${pgId}/photos`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message);
      }
      setSelectedFiles([]);
      setPreviews([]);
      setPhotoUploadFor(null);
      fetchMyPgs();
    } catch (err) { setPhotoError(err.message); }
    finally { setPhotoUploading(false); }
  };

  const handleUploadBedPhotos = async (bedId) => {
    if (selectedFiles.length === 0) return;
    setPhotoUploading(true);
    setPhotoError(null);
    try {
      const formData = new FormData();
      selectedFiles.forEach(f => formData.append('photos', f));
      const res = await fetch(`${API_BASE_URL}/api/pgs/bed/${bedId}/photos`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message);
      }
      setSelectedFiles([]);
      setPreviews([]);
      setBedPhotoAddingFor(null);
      fetchMyPgs();
    } catch (err) { setPhotoError(err.message); }
    finally { setPhotoUploading(false); }
  };

  if (loading) return <DashboardSkeleton />;

  // Calculate Global Metrics
  const totalBedsArr = myPgs.flatMap(pg => pg.floors.flatMap(f => f.beds));
  const totalBeds = totalBedsArr.length;
  const totalOccupied = totalBedsArr.filter(b => b.status === "OCCUPIED").length;
  const occupancyRate = totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 100) : 0;
  
  // Real-time Revenue calculation matching active resident bookings
  const monthlyRevenue = residentBookings.reduce((acc, b) => {
    const baseRent = b.bed?.floor?.pg?.rentMonthly || 0;
    const multiplier = b.bed?.priceMultiplier || 1.0;
    return acc + (baseRent * multiplier);
  }, 0);

  const totalResidentsCount = residentBookings.length;

  return (
    <div className="dashboard-container fade-in">
      <div className="dashboard-header">
        <div>
          <h1>Operations Center</h1>
          <p className="text-muted">Manage your portfolio and track performance insights.</p>
        </div>
        <button className="btn-primary" onClick={() => setPgFormOpen(true)}>
          <PlusCircle size={20} /> Add New PG
        </button>
      </div>

      {/* ─── Tab Switcher ─── */}
      <div className="dashboard-tabs">
        <button 
          className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <Layers size={18} /> PG Inventory
        </button>
        <button 
          className={`tab-btn ${activeTab === 'residents' ? 'active' : ''}`}
          onClick={() => setActiveTab('residents')}
        >
          <Users size={18} /> Residents Hub
          {(pendingPayments.length + activeIssues.length) > 0 && (
            <span className="notification-dot">{(pendingPayments.length + activeIssues.length)}</span>
          )}
        </button>
      </div>

      {/* ─── Performance Insights (Visible Globally) ─── */}
      <div className="performance-grid">
        <div className="metric-card glass" onClick={() => setActiveTab('inventory')} style={{ cursor: 'pointer', background: 'linear-gradient(135deg, #4f46e5, #3b82f6)', color: 'white', border: 'none' }}>
          <div className="metric-icon" style={{ background: 'rgba(255, 255, 255, 0.2)', color: 'white' }}>
            <Layers size={24} />
          </div>
          <div className="metric-info">
            <span className="metric-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Total Portfolio</span>
            <h2 className="metric-value" style={{ color: 'white' }}>{myPgs.length} <small style={{ color: 'rgba(255,255,255,0.6)' }}>PGs</small></h2>
            <p className="metric-sub" style={{ color: 'rgba(255,255,255,0.7)' }}>{totalBeds} total beds managed</p>
          </div>
        </div>

        <div className="metric-card glass" onClick={() => setActiveTab('inventory')} style={{ cursor: 'pointer', background: 'linear-gradient(135deg, #10b981, #06b6d4)', color: 'white', border: 'none' }}>
          <div className="metric-icon" style={{ background: 'rgba(255, 255, 255, 0.2)', color: 'white' }}>
            <BedDouble size={24} />
          </div>
          <div className="metric-info">
            <span className="metric-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Live Occupancy</span>
            <h2 className="metric-value" style={{ color: 'white' }}>{occupancyRate}%</h2>
            <div className="mini-progress" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <div className="mini-progress-fill" style={{ width: `${occupancyRate}%`, background: 'white' }}></div>
            </div>
            <p className="metric-sub" style={{ color: 'rgba(255,255,255,0.7)' }}>{totalOccupied} beds filled</p>
          </div>
        </div>

        <div className="metric-card glass" onClick={() => setActiveTab('residents')} style={{ cursor: 'pointer', background: activeIssues.length > 0 ? 'linear-gradient(135deg, #ef4444, #f59e0b)' : 'linear-gradient(135deg, #64748b, #94a3b8)', color: 'white', border: 'none' }}>
          <div className="metric-icon" style={{ background: 'rgba(255, 255, 255, 0.2)', color: 'white' }}>
            <HelpCircle size={24} />
          </div>
          <div className="metric-info">
            <span className="metric-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Open Tickets</span>
            <h2 className="metric-value" style={{ color: 'white' }}>{activeIssues.length}</h2>
            <p className="metric-sub" style={{ color: 'rgba(255,255,255,0.7)' }}>Maintenance queries pending</p>
          </div>
        </div>

        <div className="metric-card glass" onClick={() => setActiveTab('residents')} style={{ cursor: 'pointer', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none' }}>
          <div className="metric-icon" style={{ background: 'rgba(255, 255, 255, 0.2)', color: 'white' }}>
            <Users size={24} />
          </div>
          <div className="metric-info">
            <span className="metric-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Resident Hub</span>
            <h2 className="metric-value" style={{ color: 'white' }}>{totalResidentsCount}</h2>
            <p className="metric-sub" style={{ color: 'rgba(255,255,255,0.7)' }}>Active residents directory</p>
          </div>
        </div>

        <div className="metric-card glass" style={{ background: 'linear-gradient(135deg, #6366f1, #c0337c)', color: 'white' }}>
          <div className="metric-icon" style={{ background: 'rgba(255, 255, 255, 0.2)', color: 'white' }}>
            <IndianRupee size={24} />
          </div>
          <div className="metric-info">
            <span className="metric-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Monthly Revenue</span>
            <h2 className="metric-value" style={{ color: 'white' }}>₹{Math.round(monthlyRevenue).toLocaleString('en-IN')}</h2>
            <p className="metric-sub" style={{ color: 'rgba(255,255,255,0.7)' }}>Based on active bookings</p>
          </div>
        </div>
      </div>

      {activeTab === 'inventory' ? (
        <>

      {/* ─── Create PG Form ─── */}
      {pgFormOpen && (
        <div className="card-form fade-in">
          <h2><Home size={20} /> Create a New PG Listing</h2>
          {pgError && <div className="form-error">{pgError}</div>}
          <form onSubmit={handleCreatePg} className="pg-form">
            <div className="form-row">
              <div className="input-group">
                <label>PG Name</label>
                <input required value={pgForm.name} onChange={e => setPgForm({ ...pgForm, name: e.target.value })} placeholder="Sunshine Boys PG" />
              </div>
              <div className="input-group">
                <label>Base Rent (₹/month)</label>
                <input required type="number" value={pgForm.rentMonthly} onChange={e => setPgForm({ ...pgForm, rentMonthly: e.target.value })} placeholder="7000" />
              </div>
            </div>
            <div className="form-row">
              <div className="input-group">
                <label>City</label>
                <input required value={pgForm.city} onChange={e => setPgForm({ ...pgForm, city: e.target.value })} placeholder="Bangalore" />
              </div>
              <div className="input-group">
                <label>State</label>
                <input required value={pgForm.state} onChange={e => setPgForm({ ...pgForm, state: e.target.value })} placeholder="Karnataka" />
              </div>
            </div>
            <div className="input-group">
              <label>Full Address</label>
              <input required value={pgForm.address} onChange={e => setPgForm({ ...pgForm, address: e.target.value })} placeholder="123, MG Road, Indiranagar" />
            </div>
            <div className="input-group">
              <label>Facilities Offered</label>
              <div className="facility-chips">
                {COMMON_FACILITIES.map(fac => (
                  <button key={fac} type="button"
                    className={`chip ${pgForm.facilities.includes(fac) ? 'chip-active' : ''}`}
                    onClick={() => handleToggleFacility(fac)}>
                    {fac}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" className="btn-primary">Create PG Listing</button>
          </form>
        </div>
      )}

      {/* ─── My PGs List ─── */}
      <div className="my-pgs">
        <h2>Your Listings ({myPgs.length})</h2>
        {loading ? (
          <p className="text-muted">Loading your PGs...</p>
        ) : myPgs.length === 0 ? (
          <div className="empty-dash">
            <p>You haven't listed any PGs yet. Click <strong>"Add New PG"</strong> to get started!</p>
          </div>
        ) : (
          myPgs.map(pg => {
            const totalBeds = pg.floors.flatMap(f => f.beds).length;
            const occupiedBeds = pg.floors.flatMap(f => f.beds).filter(b => b.status === 'OCCUPIED').length;
            const isExpanded = expandedPg === pg.id;
            const isPhotoOpen = photoUploadFor === pg.id;

            return (
              <div key={pg.id} className="pg-manage-card">
                {/* PG Header */}
                <div className="pg-manage-header" onClick={() => {
                  const becomingExpanded = !isExpanded;
                  setExpandedPg(becomingExpanded ? pg.id : null);
                  if (becomingExpanded) fetchVacancyInsights(pg.id);
                }}>
                  <div className="pg-manage-info">

                    <div className="pg-title-status">
                      <h3>{pg.name}</h3>
                      {!pg.isVerified && (
                        <span className="suspicious-badge">
                          <AlertTriangle size={14} /> Suspicious Listing
                        </span>
                      )}
                    </div>
                    <p className="text-muted">{pg.city}, {pg.state}</p>
                  </div>
                  <div className="pg-manage-stats">
                    <span className="stat-badge">₹{pg.rentMonthly}/mo</span>
                    <span className="stat-badge">{pg.floors.length} floor{pg.floors.length !== 1 ? 's' : ''}</span>
                    <span className="stat-badge">{occupiedBeds}/{totalBeds} occupied</span>
                    <span className="stat-badge"><Camera size={14} /> {(pg.photos || []).length} photo{(pg.photos || []).length !== 1 ? 's' : ''}</span>
                    <button className="delete-icon-btn" title="Delete PG" onClick={(e) => { e.stopPropagation(); handleDeletePg(pg.id); }}>
                    <Trash2 size={16} />
                  </button>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {/* ─── Existing Photos ─── */}
                {(pg.photos || []).length > 0 && (
                  <div className="pg-photos-strip">
                    {pg.photos.map((url, i) => (
                      <img key={i} src={`${API_BASE_URL}${url}`} alt={`PG Photo ${i + 1}`} className="pg-thumb" />
                    ))}
                  </div>
                )}

                {/* Expandable Body */}
                {isExpanded && (
                  <div className="pg-manage-body fade-in">
                    
                    {!pg.isVerified && (
                      <div className="fraud-alert-box">
                        <AlertTriangle size={20} />
                        <div>
                          <strong>Flagged by AI:</strong>
                          <p>{pg.fraudReason || "Our ML models detected suspicious activity in this listing. It will be hidden from search until reviewed."}</p>
                        </div>
                      </div>
                    )}

                    {/* ─── AI Vacancy Predictor Card ─── */}
                    {vacancyInsights[pg.id] && (
                      <div className={`yield-card glass fade-in risk-${vacancyInsights[pg.id].risk_level.toLowerCase()}`}>
                        <div className="yield-header">
                           <TrendingUp size={20} />
                           <span>Smart Yield Analytics</span>
                           <span className="risk-tag">{vacancyInsights[pg.id].risk_level} Vacancy Risk</span>
                        </div>
                        <div className="yield-body">
                           <div className="yield-stat">
                              <span className="stat-value">{vacancyInsights[pg.id].predicted_vacancies_next_month}</span>
                              <span className="stat-label">Empty Beds Next Month</span>
                           </div>
                           <div className="yield-advice">
                              <p><strong>AI Suggestion:</strong> {vacancyInsights[pg.id].suggestion}</p>
                              {vacancyInsights[pg.id].recommended_discount > 0 && (
                                <div className="discount-badge">
                                   Recommend -{vacancyInsights[pg.id].recommended_discount}% Discount
                                </div>
                              )}
                           </div>
                        </div>
                      </div>
                    )}

                    {/* ── Photo Upload + Details Edit Section ── */}

                    <div className="section-action photo-action">
                      <button className="btn-secondary small-btn" onClick={() => {
                        setPhotoUploadFor(isPhotoOpen ? null : pg.id);
                        setSelectedFiles([]); setPreviews([]); setPhotoError(null);
                      }}>
                        <Camera size={16} /> {isPhotoOpen ? 'Cancel Upload' : 'Add Photos'}
                      </button>
                      <button className="btn-secondary small-btn" style={{marginLeft: 8}} onClick={() => setEditDetailsPg(pg)}>
                        <FileText size={16} /> Edit Description & Rules
                      </button>
                    </div>

                    {isPhotoOpen && (
                      <div className="photo-uploader fade-in">
                        {/* Drop Zone */}
                        <div
                          className={`drop-zone ${dragOver ? 'drag-active' : ''}`}
                          onClick={() => fileInputRef.current?.click()}
                          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={handleDrop}
                        >
                          <Upload size={32} />
                          <p><strong>Click to browse</strong> or drag & drop photos here</p>
                          <p className="text-muted">JPEG, PNG, WebP — max 5 MB each, up to 8 photos</p>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            style={{ display: 'none' }}
                            onChange={e => handleFilesSelected(e.target.files)}
                          />
                        </div>

                        {/* Previews */}
                        {previews.length > 0 && (
                          <div className="photo-previews">
                            {previews.map((src, i) => (
                              <div key={i} className="preview-wrap">
                                <img src={src} alt="" className="preview-img" />
                                <button className="remove-preview" onClick={() => removePreview(i)}>
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {photoError && <div className="form-error">{photoError}</div>}

                        {selectedFiles.length > 0 && (
                          <button
                            className="btn-primary small-btn upload-confirm-btn"
                            onClick={() => handleUploadPhotos(pg.id)}
                            disabled={photoUploading}
                          >
                            {photoUploading ? 'Uploading...' : `Upload ${selectedFiles.length} Photo${selectedFiles.length > 1 ? 's' : ''}`}
                          </button>
                        )}
                      </div>
                    )}

                    {/* ── Add Floor ── */}
                    <div className="section-action">
                      <button className="btn-secondary small-btn" onClick={() => setFloorAddingFor(floorAddingFor === pg.id ? null : pg.id)}>
                        <Layers size={16} /> {floorAddingFor === pg.id ? 'Cancel' : 'Add Floor'}
                      </button>
                    </div>

                    {floorAddingFor === pg.id && (
                      <form onSubmit={e => handleAddFloor(e, pg.id)} className="inline-form fade-in">
                        {floorError && <div className="form-error">{floorError}</div>}
                        <input type="number" placeholder="Floor Number (e.g. 1)"
                          value={floorForm.floorNumber} onChange={e => setFloorForm({ ...floorForm, floorNumber: e.target.value })} required />
                        <button type="submit" className="btn-primary small-btn">Add Floor</button>
                      </form>
                    )}

                    {/* ── Floors ── */}
                    {pg.floors.length === 0 ? (
                      <p className="text-muted hint-text">No floors yet. Add a floor to start assigning beds.</p>
                    ) : (
                      pg.floors.map(floor => (
                        <div key={floor.id} className="floor-manage">
                          <div className="floor-manage-header">
                            <span><Layers size={16} /> Floor {floor.floorNumber}</span>
                            <div className="header-actions">
                              <button className="btn-secondary small-btn"
                                onClick={() => setBedAddingFor(bedAddingFor === floor.id ? null : floor.id)}>
                                <BedDouble size={16} /> {bedAddingFor === floor.id ? 'Cancel' : 'Add Bed'}
                              </button>
                              <button className="delete-icon-btn" title="Delete Floor" onClick={() => handleDeleteFloor(floor.id)}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          {bedAddingFor === floor.id && (
                            <form onSubmit={e => handleAddBed(e, floor.id)} className="inline-form fade-in">
                              {bedError && <div className="form-error">{bedError}</div>}
                              <input placeholder="Bed ID (e.g. A1, Room 101)" value={bedForm.identifier}
                                onChange={e => setBedForm({ ...bedForm, identifier: e.target.value })} required />
                              <input type="number" step="0.1" min="0.5" max="3"
                                placeholder="Price multiplier (e.g. 1.2)"
                                value={bedForm.priceMultiplier}
                                onChange={e => setBedForm({ ...bedForm, priceMultiplier: e.target.value })} />
                              <button type="submit" className="btn-primary small-btn">Add Bed</button>
                            </form>
                          )}
                          <div className="beds-pills">
                            {floor.beds.length === 0 ? (
                              <span className="text-muted">No beds on this floor.</span>
                            ) : floor.beds.map(bed => {
                              const activeBooking = bed.bookings?.find(b => b.status === 'ACTIVE');
                              const pastBookings = bed.bookings?.filter(b => b.status === 'CANCELLED') || [];
                              const isUploadingPhoto = bedPhotoAddingFor === bed.id;
                              
                              return (
                                  <div key={bed.id} className={`bed-pill-wrap ${bed.status === 'OCCUPIED' ? 'bed-pill-occupied' : 'bed-pill-empty'}`}>
                                    <div className="bed-pill-header">
                                      <span>🛏 {bed.identifier} {bed.status === 'OCCUPIED' ? '(Booked)' : '(Free)'}</span>
                                      {bed.status !== 'OCCUPIED' && (
                                        <button className="delete-mini-btn" onClick={() => handleDeleteBed(bed.id)} title="Delete Bed">
                                          <Trash2 size={12} />
                                        </button>
                                      )}
                                    </div>
                                  
                                  {bed.photos && bed.photos.length > 0 && (
                                    <div className="bed-photos-mini">
                                      {bed.photos.map((src, i) => <img key={i} src={`${API_BASE_URL}${src}`} alt="bed snapshot" />)}
                                    </div>
                                  )}

                                  {bed.status === 'OCCUPIED' && activeBooking && (
                                    <div className="bed-occupant-details">
                                      {activeBooking.passportUrl ? (
                                        <img src={`${API_BASE_URL}${activeBooking.passportUrl}`} alt="Passport" className="occupant-thumb" />
                                      ) : (
                                        <div className="occupant-thumb-placeholder">👤</div>
                                      )}
                                      <div className="occupant-info">
                                        <strong>{activeBooking.user?.name}</strong>
                                        <span className="aadhar-badge">Aadhar: {activeBooking.aadharNumber || 'N/A'}</span>
                                      </div>
                                    </div>
                                  )}

                                  {pastBookings.length > 0 && (
                                    <div className="bed-history-details">
                                      <div className="history-title">History</div>
                                      {pastBookings.slice(0, 3).map(pb => (
                                        <div key={pb.id} className="history-item">
                                          <span>{pb.user?.name}</span>
                                          <small>{new Date(pb.endDate || pb.startDate).toLocaleDateString()}</small>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  <div className="bed-pill-footer">
                                    {isUploadingPhoto ? (
                                      <div className="mini-photo-uploader">
                                        <input 
                                          type="file" 
                                          accept="image/*" 
                                          multiple
                                          onChange={e => handleFilesSelected(e.target.files)} 
                                        />
                                        <div className="mini-actions">
                                          <button 
                                            className="btn-primary small-btn" 
                                            onClick={() => handleUploadBedPhotos(bed.id)}
                                            disabled={photoUploading}
                                          >
                                            {photoUploading ? '...' : 'Upload'}
                                          </button>
                                          <button 
                                            className="btn-secondary small-btn"
                                            onClick={() => { setBedPhotoAddingFor(null); setSelectedFiles([]); }}
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button className="btn-secondary text-btn" onClick={() => { setBedPhotoAddingFor(bed.id); setSelectedFiles([]); }}>
                                        <Camera size={12} /> Add Photos
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        </div>
        </>
      ) : (
        /* ─── Resident Management Tab ─── */
        <div className="resident-management-view fade-in">
          {residentLoading ? (
            <div className="mgmt-grid">
              <div className="mgmt-section glass skeleton" style={{ height: '300px' }} />
              <div className="mgmt-section glass skeleton" style={{ height: '300px' }} />
            </div>
          ) : (
            <>
              <div className="mgmt-grid">
                {/* Rent Approvals */}
                <section className="mgmt-section glass">
                  <div className="section-header">
                    <CreditCard size={20} className="text-primary" />
                    <h3>Pending Rent Approvals</h3>
                  </div>
                  {pendingPayments.length === 0 ? (
                    <div className="empty-state">
                      <CheckCircle2 size={32} className="text-muted" />
                      <p>All rent receipts are up to date.</p>
                    </div>
                  ) : (
                    <div className="mgmt-list">
                      {pendingPayments.map(b => (
                        <div key={b.id} className="mgmt-card glass">
                          <div className="mgmt-info">
                            <strong>{b.user?.name || 'Resident'}</strong>
                            <p>{b.bed?.floor?.pg?.name || 'PG'} — Bed {b.bed?.identifier || 'N/A'}</p>
                            <div className="mgmt-target-month">
                              <span className="month-badge">{b.pendingRentMonth || 'Current Month'}</span>
                              <span className="mgmt-amount">₹{Math.round((b.bed?.floor?.pg?.rentMonthly || 0) * (b.bed?.priceMultiplier || 1)).toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                          <button 
                            className="btn-primary small-btn"
                            onClick={() => handleConfirmRent(b.id)}
                            disabled={actionLoading}
                          >
                            Confirm Receipt
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Support Tickets */}
                <section className="mgmt-section glass">
                  <div className="section-header">
                    <HelpCircle size={20} className="text-primary" />
                    <h3>Active Support Tickets</h3>
                  </div>
                  {activeIssues.length === 0 ? (
                    <div className="empty-state">
                      <CheckCircle2 size={32} className="text-muted" />
                      <p>No open maintenance issues.</p>
                    </div>
                  ) : (
                    <div className="mgmt-list">
                      {activeIssues.map(i => (
                        <div key={i.id} className="mgmt-card glass ticket-card">
                          <div className="ticket-header">
                            <span className="category-tag">{i.category}</span>
                            <span className="ticket-date">{new Date(i.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="ticket-body">
                            <p className="ticket-desc">{i.description}</p>
                            <p className="ticket-origin">From: {i.booking?.user?.name || 'Resident'}</p>
                          </div>
                          <button 
                            className="btn-secondary small-btn resolve-btn"
                            onClick={() => handleCloseIssue(i.id)}
                            disabled={actionLoading}
                          >
                            Mark as Resolved
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              {/* Rent Collection History */}
              <section className="mgmt-history-section glass mt-4">
                <div className="section-header">
                  <FileText size={20} className="text-primary" />
                  <h3>Rent Collection History</h3>
                </div>
                {historyLoading ? (
                  <div className="skeleton" style={{ height: '200px', borderRadius: '16px' }} />
                ) : rentHistory.length === 0 ? (
                  <div className="empty-state">
                    <CheckCircle2 size={32} className="text-muted" />
                    <p>No historical receipts found.</p>
                  </div>
                ) : (
                  <div className="history-table-wrapper">
                    <table className="mgmt-table">
                      <thead>
                        <tr>
                          <th>Resident</th>
                          <th>PG Property</th>
                          <th>Month</th>
                          <th>Amount</th>
                          <th>Confirmed On</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rentHistory.map(ph => (
                          <tr key={ph.id}>
                            <td>
                              <strong>{ph.user?.name || 'Unknown User'}</strong>
                              <p className="text-xs">{ph.user?.email || 'No Email'}</p>
                            </td>
                            <td>{ph.booking?.bed?.floor?.pg?.name}</td>
                            <td>{ph.month}</td>
                            <td>₹{ph.amount.toLocaleString()}</td>
                            <td>{new Date(ph.confirmedAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Resident Directory */}
              <section className="mgmt-history-section glass mt-4">
                <div className="section-header">
                  <Users size={20} className="text-primary" />
                  <h3>Registered Residents Directory</h3>
                </div>
                {residentLoading ? (
                  <div className="skeleton" style={{ height: '200px', borderRadius: '16px' }} />
                ) : residentBookings.length === 0 ? (
                  <div className="empty-state">
                    <CheckCircle2 size={32} className="text-muted" />
                    <p>No active residents found.</p>
                  </div>
                ) : (
                  <div className="history-table-wrapper">
                    <table className="mgmt-table">
                      <thead>
                        <tr>
                          <th>Resident</th>
                          <th>Stay Info</th>
                          <th>Check-in Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {residentBookings.map(b => (
                          <tr key={b.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {b.checkInPhotoUrl ? (
                                  <img 
                                    src={getImageUrl(b.checkInPhotoUrl)} 
                                    alt="Resident" 
                                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/40'; }}
                                  />
                                ) : (
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={20} /></div>
                                )}
                                <div>
                                  <strong>{b.occupantName || b.user?.name}</strong>
                                  <p className="text-xs">{b.profession || 'Profession not set'}</p>
                                </div>
                              </div>
                            </td>
                            <td>
                              <p><strong>{b.bed?.floor?.pg?.name}</strong></p>
                              <p className="text-xs">Bed {b.bed?.identifier} | Floor {b.bed?.floor?.floorNumber}</p>
                            </td>
                            <td>
                              <span className={`receipt-badge ${b.checkInFormStatus === 'SUBMITTED' ? 'paid' : ''}`} style={{ 
                                  background: b.checkInFormStatus === 'SUBMITTED' ? '#E8F5E9' : '#FFF3E0', 
                                  color: b.checkInFormStatus === 'SUBMITTED' ? '#2E7D32' : '#E65100',
                                  padding: '4px 10px',
                                  borderRadius: '40px',
                                  fontSize: '0.7rem',
                                  fontWeight: '800'
                              }}>
                                {b.checkInFormStatus === 'SUBMITTED' ? 'REGISTERED' : 'PENDING'}
                              </span>
                            </td>
                            <td>
                              {b.checkInFormStatus === 'SUBMITTED' && (
                                <button 
                                  className="btn-secondary small-btn"
                                  onClick={() => window.open(`${API_BASE_URL}/api/resident/checkin/${b.id}/download?token=${token}`, '_blank')}
                                >
                                  <Download size={14} /> View Form
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}
      {/* PG Details Editor Modal */}
      {editDetailsPg && (
        <PgDetailsEditor
          pg={editDetailsPg}
          token={token}
          onClose={() => setEditDetailsPg(null)}
          onSaved={(updated) => {
            setMyPgs(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
            setEditDetailsPg(null);
          }}
        />
      )}
    </div>
  );
};

export default OwnerDashboard;
