import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { aiAPI, contactsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { SkeletonTable } from '../components/Skeleton';
import { ShieldQuestion, Plus, Sparkles, Trash2, AlertCircle } from 'lucide-react';

interface Predicted {
  id: string;
  contactId: string;
  contactName: string;
  industry: string;
  role: string;
  predictedObjections: { objection: string; likelihood: number; counter: string }[];
  topRiskAreas: string[];
  preparationTips: string[];
  confidence: number;
  createdAt: string;
}

const AIObjectionPredictor: React.FC = () => {
  const { team } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState<Predicted[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [contactId, setContactId] = useState('');

  useEffect(() => {
    if (team?.id) load();
  }, [team?.id]);

  const load = async () => {
    setLoading(true);
    try {
      const [r, c] = await Promise.all([
        aiAPI.getPredictedObjections(team!.id),
        contactsAPI.getAll({ teamId: team!.id })
      ]);
      setItems(r.data || []);
      setContacts(c.data?.contacts || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = async () => {
    if (!contactId) return showToast('Select a contact', 'error');
    setPredicting(true);
    try {
      await aiAPI.predictObjections({ teamId: team!.id, contactId });
      showToast('Objections predicted', 'success');
      setShowModal(false);
      setContactId('');
      load();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed', 'error');
    } finally {
      setPredicting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete?')) return;
    try {
      await aiAPI.deletePredictedObjection(id);
      load();
    } catch {
      showToast('Failed', 'error');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1><ShieldQuestion size={24} /> Objection Predictor</h1>
          <p>Pre-generate likely objections based on prospect industry and role with counter-arguments.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Predict Objections
        </button>
      </div>

      {loading ? <SkeletonTable rows={5} /> : (
        <div className="card-grid">
          {items.length === 0 ? (
            <div className="empty-state"><AlertCircle size={48} /><h3>No predictions yet</h3></div>
          ) : items.map(p => (
            <div key={p.id} className="card">
              <div className="card-header">
                <div>
                  <h3>{p.contactName}</h3>
                  <span className="badge">{p.role} | {p.industry}</span>
                  <span className="badge badge-info">Confidence {p.confidence}%</span>
                </div>
                <button className="icon-btn" onClick={() => handleDelete(p.id)}><Trash2 size={16} /></button>
              </div>
              <div className="card-body">
                {p.predictedObjections?.map((o, i) => (
                  <div key={i} className="objection-block">
                    <div className="objection-header">
                      <strong>{o.objection}</strong>
                      <span className="badge">{o.likelihood}% likely</span>
                    </div>
                    <div className="counter"><Sparkles size={12} /> Counter: {o.counter}</div>
                  </div>
                ))}
                {p.preparationTips?.length > 0 && (
                  <div className="info-section">
                    <strong>Prep Tips:</strong>
                    <ul>{p.preparationTips.map((t, i) => <li key={i}>{t}</li>)}</ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2><Sparkles size={20} /> Predict Objections</h2></div>
            <div className="modal-body">
              <div className="form-group">
                <label>Contact *</label>
                <select value={contactId} onChange={e => setContactId(e.target.value)}>
                  <option value="">Select contact...</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.company})</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handlePredict} disabled={predicting}>
                {predicting ? 'Predicting...' : 'Predict'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIObjectionPredictor;
