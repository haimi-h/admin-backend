import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../Modal.css';

// Assuming your CSS for the modal is in a file like 'Auth.css' or a shared component CSS
// import '../Auth.css'; 

// It's best practice to define your API_BASE_URL in a central place (e.g., a config file)
// and import it, rather than redefining it in multiple components.
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

function HistoryModal({ user, onClose }) {
    const navigate = useNavigate();
    const [rechargeData, setRechargeData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Centralized function for handling API errors
    const handleApiError = useCallback((err, action) => {
        console.error(`Error ${action}:`, err);
        let message = "An unexpected error occurred."; // Default error message

        if (err.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            message = err.response.data.message || `Request failed with status ${err.response.status}`;
            if (err.response.status === 401 || err.response.status === 403) {
                // Handle unauthorized access by clearing user data and redirecting
                message = "Your session has expired. Please log in again.";
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/login');
            } else if (err.response.status === 404) {
                message = "Could not find the requested resource. Please check the API endpoint.";
            }
        } else if (err.request) {
            // The request was made but no response was received
            message = "Network error: Could not connect to the server.";
        } else {
            // Something happened in setting up the request that triggered an Error
            message = err.message;
        }
        setError(message);
    }, [navigate]);

    // Function to fetch the user's recharge history
    const fetchRechargeHistory = useCallback(async () => {
        if (!user?.id) {
            setError("User information is missing.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError("Authentication token not found. Please log in.");
                setLoading(false);
                navigate('/login');
                return;
            }

            const response = await axios.get(`${API_BASE_URL}/recharge/history/${user.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            setRechargeData(response.data);

        } catch (err) {
            handleApiError(err, "fetching recharge history");
        } finally {
            setLoading(false);
        }
    }, [user, handleApiError, navigate]);

    useEffect(() => {
        fetchRechargeHistory();
    }, [fetchRechargeHistory]);

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{color: 'black'}}>
                <h3>Recharge History for {user.username} (ID: {user.id})</h3>

                {loading && <p>Loading recharge history...</p>}
                {error && <p className="error-message" style={{color: 'red'}}>{error}</p>}

                {!loading && !error && (
                    rechargeData.length > 0 ? (
                        <table className="modal-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rechargeData.map((record) => (
                                    <tr key={record.id}>
                                        <td>{record.id}</td>
                                        <td>{new Date(record.created_at).toLocaleString()}</td>
                                        
                                        {/* FIX APPLIED HERE: Convert amount to a number before formatting */}
                                        <td>
                                            {!isNaN(parseFloat(record.amount))
                                              ? parseFloat(record.amount).toFixed(2)
                                              : 'N/A'}
                                        </td>

                                        <td>{record.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>No recharge history found.</p>
                    )
                )}

                <button onClick={onClose} className="close-modal-button">Close</button>
            </div>
        </div>
    );
}

export default HistoryModal;
