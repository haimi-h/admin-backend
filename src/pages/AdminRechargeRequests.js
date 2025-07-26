// your-admin-frontend/src/components/AdminRechargeRequests.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client'; 
import '../AdminRechargeRequests.css';
// Define  API base URL and Socket URL using environment variables
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000'; // Your backend Socket.IO URL

const AdminRechargeRequests = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Initialize Socket.IO connection
  const socket = io(SOCKET_URL);

  useEffect(() => {
    // Join the 'admins' room for real-time updates
    const token = localStorage.getItem('token');
    if (token) {
      // You might need to decode the token to get admin ID or role if your backend requires it
      // For simplicity, we'll assume the backend handles admin identification based on the token.
      socket.emit('identifyAdmin', 'admin_user_id_placeholder'); // Replace with actual admin ID if available
    }

    socket.on('newRechargeRequest', (request) => {
      console.log('New recharge request received via socket:', request);
      // Add the new request to the top of the list
      setPendingRequests((prevRequests) => [request, ...prevRequests]);
    });

    // Cleanup on component unmount
    return () => {
      socket.disconnect();
    };
  }, []); // Run once on component mount

  const fetchPendingRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/admin/login'); // Redirect to admin login if not authenticated
        return;
      }
      const response = await axios.get(`${API_BASE_URL}/recharge/admin/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingRequests(response.data);
    } catch (err) {
      console.error('Error fetching pending recharge requests:', err);
      setError(err.response?.data?.message || 'Failed to fetch pending requests.');
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests(); // Fetch requests on component mount
  }, []);

  const handleApprove = async (requestId) => {
    const adminNotes = prompt("Add notes for approval (optional):"); // Use a modal in production
    if (adminNotes === null) return; // User cancelled

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/recharge/admin/approve/${requestId}`, { admin_notes: adminNotes }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Recharge request approved!'); // Use a custom modal in production
      fetchPendingRequests(); // Re-fetch to update the list
    } catch (err) {
      console.error('Error approving request:', err);
      alert(err.response?.data?.message || 'Failed to approve request.'); // Use a custom modal in production
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (requestId) => {
    const adminNotes = prompt("Add notes for rejection (required):"); // Use a modal in production
    if (!adminNotes) {
      alert("Rejection notes are required."); // Use a custom modal in production
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/recharge/admin/reject/${requestId}`, { admin_notes: adminNotes }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Recharge request rejected!'); // Use a custom modal in production
      fetchPendingRequests(); // Re-fetch to update the list
    } catch (err) {
      console.error('Error rejecting request:', err);
      alert(err.response?.data?.message || 'Failed to reject request.'); // Use a custom modal in production
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading-message">Loading pending requests...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="admin-recharge-requests-container">
      <h1>Pending Recharge Requests</h1>
      {pendingRequests.length === 0 ? (
        <p>No pending recharge requests.</p>
      ) : (
        <div className="table-responsive-wrapper">
          <table className="recharge-requests-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User ID</th>
                <th>Username</th>
                <th>Phone</th>
                <th>Amount</th>
                <th>Currency</th>
                <th>Receipt</th>
                <th>WhatsApp</th>
                <th>Requested At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingRequests.map((request) => (
                <tr key={request.id}>
                  <td>{request.id}</td>
                  <td>{request.user_id}</td>
                  <td>{request.username}</td>
                  <td>{request.phone}</td>
                  <td>{parseFloat(request.amount).toFixed(2)}</td>
                  <td>{request.currency}</td>
                  <td>
                    <a href={request.receipt_image_url} target="_blank" rel="noopener noreferrer">View Receipt</a>
                  </td>
                  <td>{request.whatsapp_number}</td>
                  <td>{new Date(request.created_at).toLocaleString()}</td>
                  <td>
                    <button onClick={() => handleApprove(request.id)} className="btn btn-green">Pass</button>
                    <button onClick={() => handleReject(request.id)} className="btn btn-red">Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminRechargeRequests;
