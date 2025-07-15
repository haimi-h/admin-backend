import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../Modal.css'; // Common CSS for modals

// Ensure this API_BASE_URL is exactly 'http://localhost:5000/api/admin/users'
// This base URL will be combined with '/:userId/profile' to form the complete endpoint.
// const API_BASE_URL = 'http://localhost:5000/api/admin/users'; 
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

function SettingModal({ user, onClose, onSave }) {
    const [formData, setFormData] = useState({
        username: user.username || '',
        phone: user.phone || '',
        walletAddress: user.walletAddress || '', // Ensure this matches the database column name
        new_password: '', // For changing password
        confirm_password: '' // For confirming new password
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        // Update form data if the user prop changes (e.g., when opening for a different user)
        setFormData({
            username: user.username || '',
            phone: user.phone || '',
            walletAddress: user.walletAddress || '',
            new_password: '',
            confirm_password: ''
        });
        setMessage('');
        setError('');
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (formData.new_password && formData.new_password !== formData.confirm_password) {
            setError('New password and confirm password do not match.');
            return;
        }

        try {
            const dataToSend = {
                username: formData.username,
                phone: formData.phone,
                walletAddress: formData.walletAddress, // Ensure this is named walletAddress
            };
            if (formData.new_password) {
                dataToSend.new_password = formData.new_password;
            }

            const token = localStorage.getItem('token');
            // CRITICAL CHANGE: Construct the URL to match the backend route:
            // API_BASE_URL + /:userId + /profile
            const response = await axios.put(`${API_BASE_URL}/admin/users/${user.id}/profile`, dataToSend, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setMessage(response.data.message || 'User updated successfully!');
            onSave(); // Trigger re-fetch of users in UserTable
            onClose(); // Close modal after successful save
        } catch (err) {
            console.error('Error updating user settings:', err); // More specific error message
            setError(err.response?.data?.message || 'Failed to update settings.'); // Generic message for user
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>Edit User Settings</h3>
                {message && <p style={{ color: 'green' }}>{message}</p>}
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Username:</label>
                        <input type="text" name="username" value={formData.username} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Phone Number:</label>
                        <input type="text" name="phone" value={formData.phone} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Wallet Address:</label>
                        <input type="text" name="walletAddress" value={formData.walletAddress} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>New Password (optional):</label>
                        <input type="password" name="new_password" value={formData.new_password} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>Confirm Password:</label>
                        <input type="password" name="confirm_password" value={formData.confirm_password} onChange={handleChange} />
                    </div>
                    <div className="modal-actions">
                        <button type="submit" className="modal-button confirm-button">Save Changes</button>
                        <button type="button" onClick={onClose} className="modal-button cancel-button">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default SettingModal;
