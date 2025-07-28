import React, { useState, useEffect, useCallback } from 'react'; // Removed useContext
import axios from 'axios'; // Import axios
import '../Auth.css'; // Assuming modal-overlay and modal-content styles are here
import { useNavigate } from 'react-router-dom'; // Import useNavigate for redirection

// Define your API base URL (ensure this matches your backend's URL)
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

function HistoryModal({ user, onClose }) {
    const navigate = useNavigate(); // Initialize navigate for redirection

    const [rechargeData, setRechargeData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Helper for API Error Handling, similar to InjectionPlan
    const handleApiError = useCallback((err, action) => {
        console.error(`Error ${action}:`, err);
        let message = "Failed to fetch recharge history."; // Hardcoded English error message
        if (err.response) {
            message = err.response.data.message || message;
            if (err.response.status === 401 || err.response.status === 403) {
                // If unauthorized, clear token and redirect to login
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/login');
            }
        }
        setError(message);
    }, [navigate]); // navigate is the only dependency here

    const fetchRechargeHistory = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token'); // Get authentication token
            if (!token) {
                setError("Authentication token not found. Please log in."); // Hardcoded English
                setLoading(false);
                // Redirect to login if no token is found
                navigate('/login');
                return;
            }

            // Assuming your backend has an endpoint like /api/recharge/history/:userId
            // and it requires authentication. This aligns with the 'recharge_transactions' table.
            const response = await axios.get(`${API_BASE_URL}/recharge/history/${user.id}`, {
                headers: {
                    Authorization: `Bearer ${token}` // Send token for authentication
                }
            });
            // Assuming response.data is an array of transactions matching recharge_transactions table structure
            setRechargeData(response.data);
        } catch (err) {
            handleApiError(err, "fetching recharge history"); // Use the centralized error handler
        } finally {
            setLoading(false);
        }
    }, [user, user.id, API_BASE_URL, handleApiError, navigate]); // All necessary dependencies

    useEffect(() => {
        if (user && user.id) { // Ensure user object and ID are available before fetching
            fetchRechargeHistory();
        }
    }, [user, user.id, fetchRechargeHistory]); // Re-fetch if user, user.id, or fetchRechargeHistory changes

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>Recharge History for {user.username} (ID: {user.id})</h3> {/* Hardcoded English */}

                {loading && <p>Loading recharge history...</p>} {/* Hardcoded English */}
                {error && <p className="error-message">{error}</p>}

                {!loading && !error && rechargeData.length > 0 ? (
                    <table className="modal-table">
                        <thead>
                            <tr>
                                <th>ID</th> {/* Hardcoded English */}
                                <th>Date</th> {/* Hardcoded English */}
                                <th>Amount</th> {/* Hardcoded English */}
                                <th>Status</th> {/* Hardcoded English */}
                            </tr>
                        </thead>
                        <tbody>
                            {rechargeData.map((record) => (
                                <tr key={record.id}>
                                    <td>{record.id}</td>
                                    {/* Assuming 'created_at' is the timestamp field from your 'recharge_transactions' table */}
                                    <td>{new Date(record.created_at).toLocaleString()}</td>
                                    <td>{record.amount ? record.amount.toFixed(2) : 'N/A'}</td>
                                    <td>{record.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (!loading && !error && <p>No recharge history found.</p>)} {/* Hardcoded English */}

                <button onClick={onClose} className="close-modal-button">Close</button> {/* Hardcoded English */}
            </div>
        </div>
    );
}

export default HistoryModal;
