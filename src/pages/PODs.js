import React, { useState, useEffect } from 'react';
import './PODs.css';
import api, { API_ORIGIN } from '../services/api';

const PODs = () => {
  console.log("PODs component rendered");
  const [pods, setPods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPod, setSelectedPod] = useState(null);

  useEffect(() => {
    fetchPods();
  }, []);

 const fetchPods = async () => {
  try {
    setLoading(true);

    const res = await api.get('/trips/pods/pending');

    console.log("POD DATA:", res.data);

    setPods(res.data);

  } catch (err) {
console.error('Failed to fetch PODs:', err.response?.data || err.message);
  } finally {
    setLoading(false);
  }
};
  const handleApprovePod = async (podId) => {
  if (!window.confirm('Approve this POD?')) return;

  try {
    await api.put(`/trips/${podId}/approve-pod`);

    alert('POD approved successfully');

    fetchPods(); // refresh list

  } catch (err) {
    console.error('Approve error:', err);
    alert('Failed to approve POD');
  }
};

 const handleRejectPod = async (podId) => {
  const reason = prompt('Reason for rejection:');
  if (!reason) return;

  try {
    await api.put(`/trips/${podId}/reject-pod`, { reason });

    alert('POD rejected successfully');

    fetchPods(); // refresh list

  } catch (err) {
    console.error('Reject error:', err);
    alert('Failed to reject POD');
  }
};

  if (loading) {
    return <div className="pods-loading">Loading PODs...</div>;
  }

  return (
    <div className="pods-page">
      <div className="pods-grid">
        {Array.isArray(pods) && pods.map((pod) => (
          <div key={pod.id} className="pod-card">
            <div className="pod-header">
              <div className="pod-id">{pod.id}</div>
              <div className="pod-status-badge">Pending Review</div>
            </div>

            <div className="pod-images">
              {pod.images.map((img, idx) => (
                <img 
                  key={idx} 
                  src={`${API_ORIGIN}/${img}`} 
                  alt={`POD ${idx + 1}`} 
                  className="pod-image"
                  onClick={() => setSelectedPod({ ...pod, selectedImage: img })}
                />
              ))}
            </div>

            <div className="pod-details">
              <div className="detail-row">
                <span className="detail-label">Load ID:</span>
                <span className="detail-value">{pod.loadId}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Driver:</span>
                <span className="detail-value">{pod.driver}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Route:</span>
                <span className="detail-value">
                  {pod.fromLocation} → {pod.toLocation}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Upload Date:</span>
                <span className="detail-value">{pod.uploadDate}</span>
              </div>
            </div>

            <div className="pod-actions">
              <button 
                className="approve-btn"
                onClick={() => handleApprovePod(pod.id)}
              >
                ✓ Approve POD
              </button>
              <button 
                className="reject-btn"
                onClick={() => handleRejectPod(pod.id)}
              >
                ✗ Reject POD
              </button>
            </div>
          </div>
        ))}
      </div>

      {pods.length === 0 && (
        <div className="no-data">No pending PODs to review</div>
      )}

      {/* Image Modal */}
      {selectedPod && (
        <div className="image-modal" onClick={() => setSelectedPod(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedPod(null)}>✕</button>
            <img src={selectedPod.selectedImage} alt="POD Full View" className="modal-image" />
            <div className="modal-info">
              <h3>{selectedPod.id}</h3>
              <p>Load: {selectedPod.loadId} | Driver: {selectedPod.driver}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PODs;
