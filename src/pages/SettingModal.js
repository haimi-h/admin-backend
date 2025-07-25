import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../Modal.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

function SettingModal({ user, onClose, onSave }) {
    const [formData, setFormData] = useState({
        username: user.username || '',
        phone: user.phone || '',
        walletAddress: user.walletAddress || '',
        new_password: '',
        confirm_password: '',
        defaultTaskProfit: user.defaultTaskProfit || '',
        // NEW: Add withdrawal password fields to formData
        new_withdrawal_password: '',
        confirm_withdrawal_password: '',
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        setFormData({
            username: user.username || '',
            phone: user.phone || '',
            walletAddress: user.walletAddress || '',
            new_password: '',
            confirm_password: '',
            defaultTaskProfit: user.defaultTaskProfit || '',
            // NEW: Reset withdrawal password fields on user change
            new_withdrawal_password: '',
            confirm_withdrawal_password: '',
        });
        setMessage('');
        setError('');
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (formData.new_password && formData.new_password !== formData.confirm_password) {
            setError('New password and confirm password do not match.');
            return;
        }

        // NEW: Validate new withdrawal password
        if (formData.new_withdrawal_password && formData.new_withdrawal_password !== formData.confirm_withdrawal_password) {
            setError('New withdrawal password and confirm withdrawal password do not match.');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication token not found. Please log in.');
                return;
            }

            const payload = {
                username: formData.username,
                phone: formData.phone,
                walletAddress: formData.walletAddress,
                defaultTaskProfit: formData.defaultTaskProfit,
            };

            if (formData.new_password) {
                payload.new_password = formData.new_password; 
            }

            // NEW: Add new_withdrawal_password to the payload if provided
            if (formData.new_withdrawal_password) {
                payload.new_withdrawal_password = formData.new_withdrawal_password;
            }

            const response = await axios.put(`${API_BASE_URL}/admin/users/${user.id}/profile`, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            setMessage(response.data.message || 'User profile updated successfully!');
            onSave(); 
            onClose();
        } catch (err) {
            console.error('Error updating user profile:', err);
            setError(err.response?.data?.message || 'Failed to update user profile.');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Edit User Settings</h2>
                {message && <p className="modal-message success">{message}</p>}
                {error && <p className="modal-message error">{error}</p>}
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
                        <label>Default Task Profit:</label>
                        <input
                            type="number"
                            name="defaultTaskProfit"
                            value={formData.defaultTaskProfit}
                            onChange={handleChange}
                            step="0.01"
                        />
                    </div>
                    <div className="form-group">
                        <label>New Password (optional):</label>
                        <input type="password" name="new_password" value={formData.new_password} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>Confirm Password:</label>
                        <input type="password" name="confirm_password" value={formData.confirm_password} onChange={handleChange} />
                    </div>
                    {/* NEW: Withdrawal Password Fields */}
                    <div className="form-group">
                        <label>New Withdrawal Password (optional):</label>
                        <input type="password" name="new_withdrawal_password" value={formData.new_withdrawal_password} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>Confirm Withdrawal Password:</label>
                        <input type="password" name="confirm_withdrawal_password" value={formData.confirm_withdrawal_password} onChange={handleChange} />
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
