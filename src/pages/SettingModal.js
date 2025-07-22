import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../Modal.css'; // Common CSS for modals

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

function SettingModal({ user, onClose, onSave }) {
    const [formData, setFormData] = useState({
        username: user.username || '',
        phone: user.phone || '',
        walletAddress: user.walletAddress || '',
        new_password: '',
        confirm_password: '',
        withdrawal_password: '',
        role: user.role || 'user',
        daily_orders: user.daily_orders || 0,
        completed_orders: user.completed_orders || 0,
        uncompleted_orders: user.uncompleted_orders || 0,
        default_task_profit: user.default_task_profit || 0, // ADDED: Default Task Profit
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setFormData({
            username: user.username || '',
            phone: user.phone || '',
            walletAddress: user.walletAddress || '',
            new_password: '',
            confirm_password: '',
            withdrawal_password: '',
            role: user.role || 'user',
            daily_orders: user.daily_orders || 0,
            completed_orders: user.completed_orders || 0,
            uncompleted_orders: user.uncompleted_orders || 0,
            default_task_profit: user.default_task_profit || 0, // ADDED: Default Task Profit
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
        setLoading(true);

        if (formData.new_password && formData.new_password !== formData.confirm_password) {
            setError('New password and confirm password do not match.');
            setLoading(false);
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            setError('Authentication token not found. Please log in again.');
            setLoading(false);
            return;
        }

        try {
            const updates = {
                username: formData.username,
                phone: formData.phone,
                walletAddress: formData.walletAddress,
                role: formData.role,
                daily_orders: parseInt(formData.daily_orders),
                completed_orders: parseInt(formData.completed_orders),
                uncompleted_orders: parseInt(formData.uncompleted_orders),
                default_task_profit: parseFloat(formData.default_task_profit), // ADDED: Default Task Profit
            };

            if (formData.new_password) updates.password = formData.new_password;
            if (formData.withdrawal_password) updates.withdrawal_password = formData.withdrawal_password;

            await axios.put(`${API_BASE_URL}/admin/users/${user.id}/profile`, updates, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setMessage('User updated successfully!');
            onSave();
            onClose();
        } catch (err) {
            console.error('Error updating user:', err);
            setError(err.response?.data?.message || 'Failed to update user.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>Edit User</h3>
                {message && <p className="success-message">{message}</p>}
                {error && <p className="error-message">{error}</p>}
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
                        <label>Role:</label>
                        <select name="role" value={formData.role} onChange={handleChange}>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Wallet Address:</label>
                        <input type="text" name="walletAddress" value={formData.walletAddress} onChange={handleChange} readOnly /> {/* Made readOnly */}
                    </div>
                    <div className="form-group">
                        <label>New Password (optional):</label>
                        <input type="password" name="new_password" value={formData.new_password} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>Confirm New Password:</label>
                        <input type="password" name="confirm_password" value={formData.confirm_password} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>New Withdrawal Password (optional):</label>
                        <input type="password" name="withdrawal_password" value={formData.withdrawal_password} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>Daily Orders:</label>
                        <input type="number" name="daily_orders" value={formData.daily_orders} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>Completed Orders:</label>
                        <input type="number" name="completed_orders" value={formData.completed_orders} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>Uncompleted Orders:</label>
                        <input type="number" name="uncompleted_orders" value={formData.uncompleted_orders} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>Default Task Profit:</label> {/* NEW FIELD */}
                        <input
                            type="number"
                            step="0.01"
                            name="default_task_profit"
                            value={formData.default_task_profit}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="submit" className="modal-button confirm-button" disabled={loading}>Save Changes</button>
                        <button type="button" onClick={onClose} className="modal-button cancel-button" disabled={loading}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default SettingModal;