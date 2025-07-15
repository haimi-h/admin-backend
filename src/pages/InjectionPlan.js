import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../InjectionPlan.css'; // Ensure your CSS file is correctly linked

// const API_BASE_URL = 'http://localhost:5000/api'; // Your backend API base URL
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

function InjectionPlan() {
    const location = useLocation();
    const navigate = useNavigate();

    const { userIdToInject } = location.state || {};

    // --- State Management ---
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [rowsPerPage, setRowsPerPage] = useState(20);

    // --- State for "Add" Modal ---
    const [showAddModal, setShowAddModal] = useState(false);
    const [newInjection, setNewInjection] = useState({
        injection_order: '',
        commission_rate: 50.0,
        injections_amount: ''
    });

    // --- State for "Edit" Modal ---
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingInjection, setEditingInjection] = useState(null); // To hold the item being edited

    // --- Data Fetching ---
    const fetchInjectionPlans = async () => {
        if (!userIdToInject) {
            setLoading(false);
            setError("No user selected. Please go back to User List and click 'INJECT' for a user.");
            return;
        }
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }
            const response = await axios.get(`${API_BASE_URL}/injection-plans/${userIdToInject}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setData(response.data.map(item => ({
                id: item.id,
                uid: item.user_id,
                order: parseInt(item.injection_order, 10),
                commission: parseFloat(item.commission_rate), 
                amount: parseFloat(item.injections_amount),
                completed: false,
                taskNumber: '',
                completionTime: '',
                creationTime: item.created_at ? new Date(item.created_at).toLocaleString() : '-',
            })));

        } catch (err) {
            handleApiError(err, "load injection plans");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInjectionPlans();
    }, [userIdToInject, navigate]);

    // --- Helper for API Error Handling ---
    const handleApiError = (err, action) => {
        console.error(`Error ${action}:`, err);
        let message = `Failed to ${action}.`;
        if (err.response) {
            message = err.response.data.message || message;
            if (err.response.status === 401 || err.response.status === 403) {
                navigate('/login');
            }
        }
        setError(message);
    };

    // --- "Delete" Functionality ---
    const handleDelete = async (injectionId) => {
        if (window.confirm('Are you sure you want to delete this injection plan? This action cannot be undone.')) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`${API_BASE_URL}/injection-plans/${injectionId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSuccessMessage('Injection plan deleted successfully!');
                setData(data.filter(item => item.id !== injectionId));
                setTimeout(() => setSuccessMessage(null), 3000);
            } catch (err) {
                handleApiError(err, "delete injection plan");
            }
        }
    };

    // --- "Edit" Functionality ---
    const handleEditClick = (injection) => {
        setEditingInjection(injection);
        setShowEditModal(true);
        setError(null);
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditingInjection(prev => ({ ...prev, [name]: value }));
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!editingInjection) return;

        try {
            const token = localStorage.getItem('token');
            const { id, order, commission, amount } = editingInjection;
            
            const requestBody = {
                injection_order: parseInt(order, 10),
                commission_rate: parseFloat(commission),
                injections_amount: parseFloat(amount)
            };

            await axios.put(`${API_BASE_URL}/injection-plans/${id}`, requestBody, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSuccessMessage('Injection plan updated successfully!');
            setShowEditModal(false);
            fetchInjectionPlans(); 
            setTimeout(() => setSuccessMessage(null), 3000);

        } catch (err) {
            handleApiError(err, "update injection plan");
        }
    };

    // --- "Add" Functionality ---
    const handleAddClick = () => {
        setShowAddModal(true);
        setError(null);
    };
    
    const handleNewInjectionChange = (e) => {
        const { name, value } = e.target;
        setNewInjection(prev => ({ ...prev, [name]: value }));
    };
    
    const handleNewInjectionSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const requestBody = {
                injection_order: parseInt(newInjection.injection_order, 10),
                commission_rate: parseFloat(newInjection.commission_rate),
                injections_amount: parseFloat(newInjection.injections_amount)
            };
            await axios.post(`${API_BASE_URL}/injection-plans/${userIdToInject}`, requestBody, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccessMessage('Injection plan added successfully!');
            setShowAddModal(false);
            fetchInjectionPlans();
            setNewInjection({ injection_order: '', commission_rate: 50.0, injections_amount: '' });
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            handleApiError(err, "add injection plan");
        }
    };

    // --- Render Logic ---
    return (
        <div className="container">
            <div className="header">
                <h2>UID: {userIdToInject || 'N/A'} Injection Plan</h2>
                <button className="add-button" onClick={handleAddClick} disabled={!userIdToInject}>Add Injection</button>
            </div>
            
            {successMessage && <p className="success-message" style={{color: 'green', textAlign: 'center'}}>{successMessage}</p>}
            {error && !showAddModal && !showEditModal && <p className="error-message">{error}</p>}

            {loading ? <p>Loading...</p> : (
                <div className="table-container">
                    <table className="injection-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Order</th>
                                <th>Profit</th> {/* Changed from Commission Rate */}
                                <th>Recharge Amount</th> {/* Changed from Amount */}
                                <th>Created</th>
                                <th colSpan="2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.length === 0 ? (
                                <tr><td colSpan="7">No injection plans found.</td></tr>
                            ) : (
                                data.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.id}</td>
                                        <td>{item.order}</td>
                                        <td>{item.commission}</td> {/* Removed % symbol */}
                                        <td>${item.amount.toFixed(2)}</td>
                                        <td>{item.creationTime}</td>
                                        <td><button className="edit-button" onClick={() => handleEditClick(item)}>Edit</button></td>
                                        <td><button className="delete-button" onClick={() => handleDelete(item.id)}>Delete</button></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            
            <div className="footer">
                <span>Total {data.length} records</span>
            </div>

            {/* --- Add Modal --- */}
            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Add New Injection Plan</h3>
                        {error && <p className="error-message">{error}</p>}
                        <form onSubmit={handleNewInjectionSubmit}>
                            <div className="form-group">
                                <label>Injection Order:</label>
                                <input type="number" name="injection_order" value={newInjection.injection_order} onChange={handleNewInjectionChange} required min="1" />
                            </div>
                            <div className="form-group">
                                <label>Profit:</label>
                                <input type="number" name="commission_rate" value={newInjection.commission_rate} onChange={handleNewInjectionChange} required step="0.01" min="0" />
                            </div>
                            <div className="form-group">
                                <label>Recharge Amount (USD):</label>
                                <input type="number" name="injections_amount" value={newInjection.injections_amount} onChange={handleNewInjectionChange} required step="0.01" min="0" />
                            </div>
                            <div className="modal-actions">
                                <button type="submit" className="add-button">Create Injection</button>
                                <button type="button" className="delete-button" onClick={() => setShowAddModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- Edit Modal --- */}
            {showEditModal && editingInjection && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Edit Injection Plan (ID: {editingInjection.id})</h3>
                        {error && <p className="error-message">{error}</p>}
                        <form onSubmit={handleEditSubmit}>
                            <div className="form-group">
                                <label>Injection Order:</label>
                                <input type="number" name="order" value={editingInjection.order} onChange={handleEditChange} required min="1" />
                            </div>
                            <div className="form-group">
                                <label>Profit:</label>
                                <input type="number" name="commission" value={editingInjection.commission} onChange={handleEditChange} required step="0.01" min="0"/>
                            </div>
                            <div className="form-group">
                                <label>Recharge Amount (USD):</label>
                                <input type="number" name="amount" value={editingInjection.amount} onChange={handleEditChange} required step="0.01" min="0"/>
                            </div>
                            <div className="modal-actions">
                                <button type="submit" className="add-button">Save Changes</button>
                                <button type="button" className="delete-button" onClick={() => setShowEditModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default InjectionPlan;