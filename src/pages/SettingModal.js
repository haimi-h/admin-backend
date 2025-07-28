import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../Modal.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const SettingModal = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    username: user.username || "",
    phone: user.phone || "",
    new_password: "", // Keep if you allow password changes
    walletAddress: user.withdrawal_wallet_address || "", // This is likely for withdrawal address
    // REMOVED: defaultTaskProfit
    walletBalance: parseFloat(user.wallet_balance || 0).toFixed(2), // Now this will be editable
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setFormData({
      username: user.username || "",
      phone: user.phone || "",
      new_password: "",
      walletAddress: user.withdrawal_wallet_address || "",
      // REMOVED: defaultTaskProfit
      walletBalance: parseFloat(user.wallet_balance || 0).toFixed(2), // Make sure it's up-to-date on open
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
        // The `withdrawal_wallet_address` is usually set via a separate field in admin UI.
        // If walletAddress in formData maps to withdrawal_wallet_address, keep it.
        withdrawal_wallet_address: formData.walletAddress, // Assuming this is for withdrawal address
        // REMOVED: defaultTaskProfit: parseFloat(formData.defaultTaskProfit),
        wallet_balance: parseFloat(formData.walletBalance), // ADDED: Send wallet_balance
      };

      if (formData.new_password) {
        payload.new_password = formData.new_password;
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
            <label>Wallet Amount (TRX):</label>
            <input
              type="number" // Use type="number" for wallet balance
              name="walletBalance"
              value={formData.walletBalance}
              onChange={handleChange}
              step="0.01" // Allow decimal values
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