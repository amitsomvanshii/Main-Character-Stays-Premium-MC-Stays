import React, { useState } from 'react';
import { X, FileText, Shield, PlusCircle, Trash2, Save, IndianRupee, Clock, Info } from 'lucide-react';
import { API_BASE_URL } from '../config';
import './PgDetailsEditor.css';

const DEFAULT_RULES = [
  'No smoking inside premises',
  'Visitors allowed before 9:00 PM only',
  'We charge a security deposit equivalent to one month\'s rent',
];

const PgDetailsEditor = ({ pg, token, onClose, onSaved }) => {
  const [description, setDescription] = useState(pg.description || '');
  const [rules, setRules] = useState(pg.rules?.length ? pg.rules : [...DEFAULT_RULES]);
  const [securityDeposit, setSecurityDeposit] = useState(pg.securityDeposit || '');
  const [lockInDays, setLockInDays] = useState(pg.lockInDays || '');
  const [onboardingFee, setOnboardingFee] = useState(pg.onboardingFee || '');
  const [newRule, setNewRule] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const addRule = () => {
    const trimmed = newRule.trim();
    if (!trimmed) return;
    setRules(prev => [...prev, trimmed]);
    setNewRule('');
  };

  const removeRule = (idx) => {
    setRules(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/pgs/${pg.id}/details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          description,
          rules,
          securityDeposit: securityDeposit || null,
          lockInDays: lockInDays || null,
          onboardingFee: onboardingFee || null,
        })
      });
      if (!res.ok) throw new Error('Failed to save');
      const updated = await res.json();
      setSuccess(true);
      setTimeout(() => {
        onSaved(updated);
        onClose();
      }, 1200);
    } catch (e) {
      alert('Error saving: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pde-overlay" onClick={onClose}>
      <div className="pde-modal" onClick={e => e.stopPropagation()}>
        <div className="pde-header">
          <div className="pde-title">
            <FileText size={20} />
            <div>
              <h3>PG Details & Policies</h3>
              <p>{pg.name}</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="pde-body">
          {/* Description */}
          <div className="pde-section">
            <label className="pde-label"><Info size={14} /> About This PG</label>
            <textarea
              className="pde-textarea"
              rows={5}
              placeholder="Describe this PG — room types, ambience, what makes it special. Students will see this before booking."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Financial Policies */}
          <div className="pde-section">
            <label className="pde-label"><IndianRupee size={14} /> Financial Policies</label>
            <div className="pde-fields-row">
              <div className="pde-field">
                <span>Security Deposit (₹)</span>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  value={securityDeposit}
                  onChange={e => setSecurityDeposit(e.target.value)}
                />
              </div>
              <div className="pde-field">
                <span>Onboarding Fee (₹)</span>
                <input
                  type="number"
                  placeholder="e.g. 1000"
                  value={onboardingFee}
                  onChange={e => setOnboardingFee(e.target.value)}
                />
              </div>
              <div className="pde-field">
                <span><Clock size={12} /> Lock-in Period (days)</span>
                <input
                  type="number"
                  placeholder="e.g. 120"
                  value={lockInDays}
                  onChange={e => setLockInDays(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* House Rules */}
          <div className="pde-section">
            <label className="pde-label"><Shield size={14} /> House Rules & Important Info</label>
            <div className="pde-rules-list">
              {rules.map((rule, idx) => (
                <div key={idx} className="pde-rule-item">
                  <span>• {rule}</span>
                  <button className="pde-remove-btn" onClick={() => removeRule(idx)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="pde-add-rule">
              <input
                placeholder="Add a new rule or note..."
                value={newRule}
                onChange={e => setNewRule(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addRule()}
              />
              <button className="btn-secondary" onClick={addRule}>
                <PlusCircle size={15} /> Add
              </button>
            </div>
          </div>
        </div>

        <div className="pde-footer">
          {success && <span className="pde-saved">✅ Saved successfully!</span>}
          <button className="btn-primary pde-save-btn" onClick={handleSave} disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Details'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PgDetailsEditor;
