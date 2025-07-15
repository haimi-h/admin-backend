import React from 'react';
import '../Modal.css'; // Common CSS for modals

function HistoryModal({ user, onClose }) {
    // Hardcoded recharge data for demonstration
    // In a real app, you would fetch this from a backend API
    const hardcodedRechargeData = [
        { id: 1, date: '2024-07-01 10:30', amount: 50.00, status: 'Completed' },
        { id: 2, date: '2024-06-15 14:00', amount: 100.00, status: 'Completed' },
        { id: 3, date: '2024-05-20 09:15', amount: 25.00, status: 'Pending' },
        // Add more dummy data as needed
    ];

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>Recharge History for {user.username} (ID: {user.id})</h3>
                {hardcodedRechargeData.length > 0 ? (
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
                            {hardcodedRechargeData.map(record => (
                                <tr key={record.id}>
                                    <td>{record.id}</td>
                                    <td>{record.date}</td>
                                    <td>${record.amount.toFixed(2)}</td>
                                    <td>{record.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>No recharge history available for this user.</p>
                )}
                <div className="modal-actions">
                    <button onClick={onClose} className="modal-button cancel-button">Close</button>
                </div>
            </div>
        </div>
    );
}

export default HistoryModal;
