import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../Modal.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const SettingModal = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    username: user.username || '',
    phone: user.phone || '',
    new_password: '',
    // Renamed for clarity:
    rechargeWalletAddress: user.walletAddress || '', // This is for the recharge wallet
    withdrawalWalletAddress: user.withdrawal_wallet_address || '', // This is for the withdrawal wallet
    walletBalance: parseFloat(user.wallet_balance || 0).toFixed(2),
    // Added back for completeness if you still need these for other password changes
    confirm_password: '',
    new_withdrawal_password: '',
    confirm_withdrawal_password: '',
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setFormData({
      username: user.username || '',
      phone: user.phone || '',
      new_password: '',
      rechargeWalletAddress: user.walletAddress || '',
      withdrawalWalletAddress: user.withdrawal_wallet_address || '',
      walletBalance: parseFloat(user.wallet_balance || 0).toFixed(2),
      confirm_password: '',
      new_withdrawal_password: '',
      confirm_withdrawal_password: '',
    });
    setError(null);
    setSuccess(false);
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
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication required.");
        return;
      }

      const payload = {
        username: formData.username,
        phone: formData.phone,
        wallet_balance: parseFloat(formData.walletBalance), // Wallet balance to update
        walletAddress: formData.rechargeWalletAddress, // New: Recharge wallet address
        withdrawal_wallet_address: formData.withdrawalWalletAddress, // New: Withdrawal wallet address
      };

      if (formData.new_password) {
        // You'll need to handle confirm_password validation here if you keep it
        if (formData.new_password !== formData.confirm_password) {
          setError("New password and confirm password do not match.");
          return;
        }
        payload.new_password = formData.new_password;
      }

      if (formData.new_withdrawal_password) {
        // You'll need to handle confirm_withdrawal_password validation here
        if (formData.new_withdrawal_password !== formData.confirm_withdrawal_password) {
          setError("New withdrawal password and confirm withdrawal password do not match.");
          return;
        }
        payload.new_withdrawal_password = formData.new_withdrawal_password;
      }

      const response = await axios.put(
        `${API_BASE_URL}/admin/users/${user.id}/profile`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSuccess(true);
      onSave(); // Trigger re-fetch in UserTable
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Error updating user settings:", err);
      setError(
        err.response?.data?.message || "Failed to update user settings."
      );
    }
  };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Edit User Settings</h2>
                {success && <p className="success-message">Settings updated successfully!</p>}
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

                    {/* NEW: Recharge Wallet Address */}
                    <div className="form-group">
                        <label>Recharge Wallet Address:</label>
                        <input
                            type="text"
                            name="rechargeWalletAddress"
                            value={formData.rechargeWalletAddress}
                            onChange={handleChange}
                            placeholder="Enter recharge wallet address"
                        />
                    </div>

                    {/* Existing: Withdrawal Wallet Address (using new state name) */}
                    <div className="form-group">
                        <label>Withdrawal Wallet Address:</label>
                        <input
                            type="text"
                            name="withdrawalWalletAddress"
                            value={formData.withdrawalWalletAddress}
                            onChange={handleChange}
                            placeholder="Enter withdrawal wallet address"
                        />
                    </div>

                    {/* Wallet Balance field (now editable) */}
                    <div className="form-group">
                        <label>Wallet Amount:</label>
                        <input
                            type="number"
                            name="walletBalance"
                            value={formData.walletBalance}
                            onChange={handleChange}
                            step="0.01"
                        />
                    </div>

                    {/* Password Fields - Ensure these are correctly handled with new_password and confirm_password in state */}
                    <div className="form-group">
                        <label>New Login Password (optional):</label>
                        <input type="password" name="new_password" value={formData.new_password} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>Confirm Login Password:</label>
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
};

export default SettingModal;