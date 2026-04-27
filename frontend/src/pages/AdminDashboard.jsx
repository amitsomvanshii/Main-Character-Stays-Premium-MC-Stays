import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, CheckCircle, Trash2, Users, Home, AlertOctagon, 
  TrendingUp, RefreshCcw, Send, Calendar, Phone, Activity, 
  MapPin, ExternalLink, Mail, User, ShieldCheck, Filter, PieChart as PieIcon,
  BarChart as BarIcon, LineChart as LineIcon
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import './AdminDashboard.css';

const COLORS = ['#FF385C', '#4F46E5', '#10B981', '#F59E0B'];

const AdminDashboard = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); 
  const [timeRange, setTimeRange] = useState('30d');
  
  const [analytics, setAnalytics] = useState(null);
  const [flaggedPgs, setFlaggedPgs] = useState([]);
  const [leads, setLeads] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalPgs: 0, pendingPgs: 0, totalLeads: 0 });
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchGlobalData();
  }, [timeRange]);

  const fetchGlobalData = async () => {
    setLoading(true);
    try {
      const [pgsRes, statsRes, leadsRes, usersRes, analyticsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/flagged`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/admin/stats`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/admin/leads`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/admin/analytics?range=${timeRange}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      setFlaggedPgs(await pgsRes.json());
      setStats(await statsRes.json());
      setLeads(await leadsRes.json());
      setAllUsers(await usersRes.json());
      setAnalytics(await analyticsRes.json());
    } catch (err) {
      console.error('Admin Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPg = async (pgId) => {
    setActionLoading(pgId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/verify/${pgId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setFlaggedPgs(prev => prev.filter(pg => pg.id !== pgId));
        setStats(s => ({ ...s, pendingPgs: s.pendingPgs - 1 }));
      }
    } catch (err) { console.error(err); }
    finally { setActionLoading(null); }
  };

  const handleDeleteLead = async (leadId) => {
    if (!window.confirm("Archive this lead record?")) return;
    setActionLoading(leadId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/lead/${leadId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setLeads(prev => prev.filter(l => l.id !== leadId));
      }
    } catch (err) { console.error(err); }
    finally { setActionLoading(null); }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Permanently delete this user? ALL THEIR PGs AND BOOKINGS WILL BE WIPED IRREVERSIBLY.")) return;
    setActionLoading(userId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/user/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setAllUsers(prev => prev.filter(u => u.id !== userId));
        setStats(s => ({ ...s, totalUsers: s.totalUsers - 1 }));
      }
    } catch (err) { console.error(err); }
    finally { setActionLoading(null); }
  };

  if (loading && !analytics) return (
    <div className="admin-loading">
      <RefreshCcw className="spinning" size={48} />
      <h3>Synchronizing Platform Intelligence...</h3>
    </div>
  );

  const pieData = analytics ? [
    { name: 'Tours', value: analytics.summary.leadBreakdown.tours },
    { name: 'Callbacks', value: analytics.summary.leadBreakdown.callbacks }
  ] : [];

  return (
    <div className="admin-dashboard fade-in">
      <div className="admin-header">
        <div className="header-ident">
          <div className="security-icon"><ShieldAlert size={32} /></div>
          <div>
            <h1>Command Center</h1>
            <p className="status-indicator"><span className="live-dot"></span> amitsomvanshi63@gmail.com (Root)</p>
          </div>
        </div>
        
        <div className="time-slicers glass">
          {[
            { label: '30D', val: '30d' },
            { label: '60D', val: '60d' },
            { label: '90D', val: '90d' },
            { label: '4M', val: '120d' },
            { label: '6M', val: '180d' },
            { label: '1Y', val: '365d' }
          ].map(opt => (
            <button 
              key={opt.val} 
              className={`slice-btn ${timeRange === opt.val ? 'active' : ''}`}
              onClick={() => setTimeRange(opt.val)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-tabs glass">
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          <Activity size={18} /> Global Analytics
        </button>
        <button className={`tab-btn ${activeTab === 'leads' ? 'active' : ''}`} onClick={() => setActiveTab('leads')}>
          <Send size={18} /> Leads Hub {leads.length > 0 && <span className="tab-badge">{leads.length}</span>}
        </button>
        <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          <Users size={18} /> User Hub
        </button>
        <button className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>
          <AlertOctagon size={18} /> Security {flaggedPgs.length > 0 && <span className="tab-badge danger">{flaggedPgs.length}</span>}
        </button>
      </div>

      <div className="admin-content-wrap">
        {activeTab === 'overview' && analytics && (
          <div className="analytics-view fade-in">
            <div className="stats-grid-horizontal">
              <div className="stat-card-mega glass" style={{ background: 'linear-gradient(135deg, #6366f1, #c0337c)', border: 'none', color: 'white' }}>
                <TrendingUp className="mega-icon" style={{color: 'white', background: 'rgba(255,255,255,0.2)'}} />
                <div>
                  <p className="text-muted" style={{ color: 'rgba(255,255,255,0.7)' }}>Est. Platform Revenue</p>
                  <h2 style={{ color: 'white' }}>₹{analytics.summary.totalRevenue?.toLocaleString()}</h2>
                  <small className="trend-up" style={{ color: 'rgba(255,255,255,0.8)' }}>Live aggregated data</small>
                </div>
              </div>
              <div className="stat-card-mega glass" style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)', border: 'none', color: 'white' }}>
                <Activity className="mega-icon" style={{color: 'white', background: 'rgba(255,255,255,0.2)'}} />
                <div>
                  <p className="text-muted" style={{ color: 'rgba(255,255,255,0.7)' }}>Avg. Platform Occupancy</p>
                  <h2 style={{ color: 'white' }}>{analytics.summary.currentOccupancy}%</h2>
                  <small className="trend-up" style={{ color: 'rgba(255,255,255,0.8)' }}>Stable Performance</small>
                </div>
              </div>
              <div className="stat-card-mega glass" style={{ background: 'linear-gradient(135deg, #4f46e5, #3b82f6)', border: 'none', color: 'white' }}>
                <Send className="mega-icon" style={{color: 'white', background: 'rgba(255,255,255,0.2)'}} />
                <div>
                  <p className="text-muted" style={{ color: 'rgba(255,255,255,0.7)' }}>Total National Interest</p>
                  <h2 style={{ color: 'white' }}>{analytics.summary.totalLeads} Leads</h2>
                  <small className="trend-up" style={{ color: 'rgba(255,255,255,0.8)' }}>New enquiries capturing live</small>
                </div>
              </div>
            </div>

            <div className="chart-row mt-4">
              <div className="chart-container glass large-chart">
                <div className="chart-header">
                  <h3><LineIcon size={18} /> Financial & Demand Trends</h3>
                  <p className="text-muted">Visualizing revenue and booking interest over the selected range.</p>
                </div>
                <div style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.timeSeries}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF385C" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#FF385C" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'rgba(30, 30, 30, 0.95)', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          borderRadius: '12px',
                          backdropFilter: 'blur(10px)',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                        }}
                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                        labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase' }}
                        formatter={(value, name) => [
                          name === 'revenue' ? `₹${value.toLocaleString()}` : `${value} Leads`, 
                          name.charAt(0).toUpperCase() + name.slice(1)
                        ]}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#FF385C" 
                        fillOpacity={1} 
                        fill="url(#colorRev)" 
                        strokeWidth={4}
                        activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="leads" 
                        stroke="#4F46E5" 
                        fill="none" 
                        strokeWidth={2} 
                        strokeDasharray="6 4" 
                        activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="chart-grid-two mt-4">
              <div className="chart-container glass">
                <div className="chart-header">
                  <h3><BarIcon size={18} /> Property Performance</h3>
                  <p className="text-muted">Occupancy rate comparison across PGs.</p>
                </div>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.pgBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ background: '#1e1e1e', border: 'none', borderRadius: '12px', color: '#fff', boxShadow: '0 8px 16px rgba(0,0,0,0.4)' }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}
                      />
                      <Bar dataKey="occupancy" radius={[6, 6, 0, 0]} barSize={24}>
                        {analytics.pgBreakdown?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={(entry.occupancy || 0) > 80 ? '#10B981' : (entry.occupancy || 0) > 50 ? '#F59E0B' : '#c0337c'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-container glass">
                <div className="chart-header">
                  <h3><PieIcon size={18} /> Lead Conversion</h3>
                  <p className="text-muted">Interest breakdown by intention.</p>
                </div>
                <div style={{ height: 300, display: 'flex', alignItems: 'center' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ background: '#1e1e1e', border: 'none', borderRadius: '12px', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            <div className="chart-row mt-4">
               <div className="chart-container glass">
                 <div className="chart-header">
                   <h3><BarIcon size={18} /> Revenue by Region</h3>
                   <p className="text-muted">Direct financial performance breakdown by city.</p>
                 </div>
                 <div style={{ height: 300 }}>
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={analytics.cityBreakdown} layout="vertical">
                       <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                       <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={10} hide />
                       <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.4)" fontSize={11} width={80} />
                       <Tooltip 
                         contentStyle={{ background: '#1e1e1e', border: 'none', borderRadius: '12px' }}
                         itemStyle={{ color: '#fff' }}
                         formatter={(value) => `₹${value.toLocaleString()}`}
                       />
                       <Bar dataKey="value" fill="#4F46E5" radius={[0, 6, 6, 0]} barSize={20} />
                     </BarChart>
                   </ResponsiveContainer>
                 </div>
               </div>
            </div>

             <div className="pg-drilldown mt-4 glass">
                <div className="section-title">
                  <h2>Property ROI Matrix</h2>
                  <p className="text-muted">Detailed financial breakdown per property.</p>
                </div>
                <div className="pg-stats-scroll">
                  {analytics.pgBreakdown?.map(p => (
                    <div key={p.id} className="pg-stat-row glass" style={{ marginBottom: '12px', padding: '16px', borderRadius: '12px' }}>
                      <div className="pg-main">
                        <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>{p.name}</strong>
                        <span style={{ fontSize: '0.8rem' }}><MapPin size={10} /> {p.city}</span>
                      </div>
                      <div className="pg-metric">
                        <label>Target Occupancy</label>
                        <div className="progress-mini" style={{ height: '8px', background: 'rgba(0,0,0,0.05)' }}>
                          <div className="progress-fill" style={{ height: '100%', borderRadius: '4px', width: `${(p.occupancy || 0)}%`, background: (p.occupancy || 0) > 70 ? 'linear-gradient(90deg, #10B981, #34D399)' : 'linear-gradient(90deg, #c0337c, #FF385C)' }}></div>
                        </div>
                        <span style={{ fontWeight: '700' }}>{p.occupancy || 0}%</span>
                      </div>
                      <div className="pg-metric">
                        <label>Direct ROI (Monthly)</label>
                        <strong style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>₹{(p.revenue || 0).toLocaleString()}</strong>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'leads' && (
          <div className="leads-hub-view fade-in">
            <div className="section-title">
              <h2>National Leads Hub</h2>
              <span className="count-badge">{leads.length} Active Leads</span>
            </div>
            <div className="admin-table-container glass">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Location</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(l => (
                    <tr key={l.id}>
                      <td><span className={`lead-type-tag ${l.type.toLowerCase()}`}>{l.type}</span></td>
                      <td><strong>{l.name}</strong></td>
                      <td>{l.phone}</td>
                      <td>{l.city}, {l.state}</td>
                      <td>{new Date(l.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button className="delete-mini-btn" onClick={() => handleDeleteLead(l.id)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {leads.length === 0 && <div className="p-5 text-center text-muted">No leads captured yet.</div>}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="users-hub-view fade-in">
             <div className="section-title">
               <h2>Global User Directory</h2>
               <p className="text-muted">Tracking platform growth and user engagement history.</p>
             </div>
             <div className="users-grid">
               {allUsers.map(u => (
                 <div key={u.id} className="user-profile-card glass">
                    <div className="user-card-header">
                       <div className="user-avatar-small"><User size={20} /></div>
                       <div className="user-header-actions">
                         <span className={`role-pill ${u.role.toLowerCase()}`}>{u.role}</span>
                         <button 
                           className="user-delete-btn" 
                           onClick={() => handleDeleteUser(u.id)}
                           disabled={actionLoading === u.id}
                         >
                           {actionLoading === u.id ? <RefreshCcw size={14} className="spinning" /> : <Trash2 size={14} />}
                         </button>
                       </div>
                    </div>
                    <div className="user-core-info">
                      <h4>{u.name}</h4>
                      <p className="text-muted" style={{ fontSize: '0.8rem' }}>{u.email}</p>
                    </div>
                    
                    <div className="user-history-compact">
                       <label>Latest Activity</label>
                       {u.payments?.length > 0 ? (
                         <div className="history-item">
                            <TrendingUp size={12} color="#10B981" /> 
                            <span>Paid ₹{u.payments[0].amount} ({new Date(u.payments[0].confirmedAt).toLocaleDateString()})</span>
                         </div>
                       ) : u.bookings?.length > 0 ? (
                         <div className="history-item">
                            <Calendar size={12} color="#4F46E5" /> 
                            <span>Booked - {u.bookings[0].status} ({new Date(u.bookings[0].startDate).toLocaleDateString()})</span>
                         </div>
                       ) : (
                         <div className="history-item text-muted">No recent activity detected.</div>
                       )}
                    </div>

                    <div className="user-stats-mini">
                       <div className="stat-box">
                         <label>{u.role === 'OWNER' ? 'PGs' : 'Bookings'}</label>
                         <strong>{u.role === 'OWNER' ? u._count?.pgs : u._count?.bookings}</strong>
                       </div>
                       <div className="stat-box">
                         <label>Since</label>
                         <strong>{new Date(u.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</strong>
                       </div>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="security-hub-view fade-in">
            <div className="section-title">
              <h2>Safety Enforcement</h2>
            </div>
            <div className="flagged-list">
              {flaggedPgs.length === 0 ? (
                <div className="empty-security-state glass">
                  <CheckCircle size={64} color="#10B981" />
                  <h3>Platform Secure</h3>
                  <p>All property listings have been verified.</p>
                </div>
              ) : (
                flaggedPgs.map(pg => (
                  <div key={pg.id} className="flagged-item glass">
                    <div className="pg-security-info">
                       <div className="pg-main">
                          <h4>{pg.name}</h4>
                          <p><MapPin size={12} /> {pg.address}, {pg.city}</p>
                          <small>Owner: {pg.owner.name} ({pg.owner.email})</small>
                       </div>
                    </div>
                    <div className="security-actions">
                       <button className="btn-admin-verify" onClick={() => handleVerifyPg(pg.id)}>
                         <ShieldCheck size={16} /> Vouch & Approve
                       </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
