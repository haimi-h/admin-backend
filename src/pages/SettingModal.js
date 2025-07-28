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
        walletAmount: user.wallet_balance || '', // Initialize from user.wallet_balance
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
            walletAmount: user.wallet_balance || '', // Use user.wallet_balance to reset
            new_withdrawal_password: '',
            confirm_withdrawal_password: '',
        });
        setMessage('');
        setError('');
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value
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
        if (formData.new_withdrawal_password && formData.new_withdrawal_password !== formData.confirm_withdrawal_password) {
            setError('New withdrawal password and confirm withdrawal password do not match.');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            };

            // 1. Prepare payload for profile update (excluding defaultTaskProfit)
            const profilePayload = {
                username: formData.username,
                phone: formData.phone,
                walletAddress: formData.walletAddress,
            };
            if (formData.new_password) {
                profilePayload.new_password = formData.new_password;
            }
            if (formData.new_withdrawal_password) {
                profilePayload.new_withdrawal_password = formData.new_withdrawal_password;
            }

            // Call API to update user profile (for non-wallet fields)
            const profileUpdateResponse = await axios.put(
                `${API_BASE_URL}/admin/users/${user.id}/profile`,
                profilePayload,
                config
            );
            setMessage(profileUpdateResponse.data.message);

            // 2. Handle Wallet Balance Update Separately
            const currentWalletBalance = parseFloat(user.wallet_balance || 0);
            const newWalletAmount = parseFloat(formData.walletAmount);

            if (!isNaN(newWalletAmount) && newWalletAmount !== currentWalletBalance) {
                const amountToAdjust = newWalletAmount - currentWalletBalance;

                if (amountToAdjust !== 0) {
                    const adjustPayload = { amount: amountToAdjust };
                    try {
                        // Call the dedicated adjust-balance endpoint
                        const adjustResponse = await axios.post(
                            `${API_BASE_URL}/admin/users/adjust-balance/${user.id}`,
                            adjustPayload,
                            config
                        );
                        setMessage(prev => prev + ' ' + adjustResponse.data.message);
                    } catch (adjustError) {
                        console.error('Error adjusting wallet balance:', adjustError.response?.data || adjustError.message);
                        setError(prev => (prev ? prev + ' and ' : '') + 'Failed to update wallet balance: ' + (adjustError.response?.data?.message || adjustError.message));
                    }
                }
            }
            // --- End Wallet Balance Update Handling ---

            onSave(); // Callback to re-fetch user data in UserTable
        } catch (err) {
            console.error('Error updating user profile:', err.response?.data || err.message);
            setError(err.response?.data?.message || 'Failed to update profile.');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Edit User Settings</h2>
                {message && <p className="success-message">{message}</p>}
                {error && <p className="error-message">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Username:</label>
                        <input type="text" name="username" value={formData.username} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>Phone:</label>
                        <input type="text" name="phone" value={formData.phone} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>Wallet Address (Recharge):</label>
                        <input type="text" name="walletAddress" value={formData.walletAddress} onChange={handleChange} />
                    </div>
                    {/* Only the Wallet Balance field, no defaultTaskProfit */}
                    <div className="form-group">
                        <label>Wallet Balance (editable for admin):</label>
                        <input type="number" name="walletAmount" value={formData.walletAmount} onChange={handleChange} step="0.01" />
                    </div>
                    <div className="form-group">
                        <label>New Password (optional):</label>
                        <input type="password" name="new_password" value={formData.new_password} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>Confirm Password:</label>
                        <input type="password" name="confirm_password" value={formData.confirm_password} onChange={handleChange} />
                    </div>
                    {/* Withdrawal Password Fields */}
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