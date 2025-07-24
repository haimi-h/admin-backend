import React, { useState, useEffect } from "react";
import "../UserTable.css"; // Your existing CSS file
import { useNavigate } from "react-router-dom";
import axios from "axios"; // Import axios for API calls

// Import new modal components
import HistoryModal from "./HistoryModal";
import SettingModal from "./SettingModal";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

const UserTable = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    username: "",
    phone: "",
    code: "",
    wallet: "", // This is likely for the recharge wallet address filter
    // withdrawalWallet: "", // You could add a filter for withdrawal wallet here if needed
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [tasksToApply, setTasksToApply] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSettingModal, setShowSettingModal] = useState(false);
  const [selectedUserForModal, setSelectedUserForModal] = useState(null);

  // --- PAGINATION STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10); // Number of users to display per page
  const [totalUsers, setTotalUsers] = useState(0); //

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          ...filters,
          page: currentPage,
          limit: usersPerPage,
        },
      });
      setUsers(response.data.users);
      setTotalUsers(response.data.totalCount);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to fetch users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filters, currentPage]); // Re-fetch when filters or page change

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handleApplyTasks = async () => {
    if (selectedUserIds.length === 0 || tasksToApply === "") {
      alert("Please select users and enter the number of tasks to apply.");
      return;
    }

    if (isNaN(tasksToApply) || parseInt(tasksToApply) < 0) {
      alert("Tasks to apply must be a non-negative number.");
      return;
    }

    if (!window.confirm(`Are you sure you want to apply ${tasksToApply} daily orders to ${selectedUserIds.length} selected user(s)?`)) {
        return; // User cancelled
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      for (const userId of selectedUserIds) {
        await axios.put(
          `${API_BASE_URL}/admin/users/${userId}/daily-orders`,
          { daily_orders: parseInt(tasksToApply) },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      alert("Daily orders applied successfully!");
      setTasksToApply("");
      setSelectedUserIds([]); // Clear selection after applying
      fetchUsers(); // Refresh user list
    } catch (err) {
      console.error("Error applying daily orders:", err);
      alert("Failed to apply daily orders.");
    }
  };

  const handleCheckboxChange = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allUserIds = users.map((user) => user.id);
      setSelectedUserIds(allUserIds);
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedUserIds.length === 0) {
        alert("Please select users to delete.");
        return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedUserIds.length} selected user(s)? This action cannot be undone.`)) {
        return; // User cancelled
    }

    try {
        const token = localStorage.getItem("token");
        if (!token) { navigate("/login"); return; }

        for (const userId of selectedUserIds) {
            await axios.delete(`${API_BASE_URL}/admin/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
        }
        alert("Selected users deleted successfully!");
        setSelectedUserIds([]); // Clear selection after deleting
        fetchUsers(); // Refresh user list
    } catch (err) {
        console.error("Error deleting users:", err);
        // Provide more specific error if possible, e.g., from err.response.data.message
        alert(`Failed to delete users: ${err.response?.data?.message || err.message}`);
    }
  };

  const openHistoryModal = (user) => {
    setSelectedUserForModal(user);
    setShowHistoryModal(true);
  };

  const openSettingModal = (user) => {
    setSelectedUserForModal(user);
    setShowSettingModal(true);
  };

  // This function is called when a user is updated in the SettingModal
  const handleSettingsSaved = () => {
    fetchUsers(); // Re-fetch users to reflect changes
  };

  const totalPages = Math.ceil(totalUsers / usersPerPage);

  const renderPageNumbers = () => {
    const pageNumbers = [];
    // Display fewer page numbers for brevity
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (startPage === 1 && endPage < totalPages) {
        endPage = Math.min(totalPages, endPage + (5 - (endPage - startPage + 1)));
    }
    if (endPage === totalPages && startPage > 1) {
        startPage = Math.max(1, startPage - (5 - (endPage - startPage + 1)));
    }


    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={currentPage === i ? "active" : ""}
        >
          {i}
        </button>
      );
    }
    return pageNumbers;
  };


  if (loading) return <div className="loading">Loading users...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="user-table-container">
      <h1>User Management</h1>

      {/* --- FILTERS --- */}
      <div className="filters">
        <input
          type="text"
          name="username"
          placeholder="Filter by Username"
          value={filters.username}
          onChange={handleFilterChange}
        />
        <input
          type="text"
          name="phone"
          placeholder="Filter by Phone"
          value={filters.phone}
          onChange={handleFilterChange}
        />
        <input
          type="text"
          name="code"
          placeholder="Filter by Invitation Code"
          value={filters.code}
          onChange={handleFilterChange}
        />
        <input
          type="text"
          name="wallet"
          placeholder="Filter by Recharge Wallet"
          value={filters.wallet}
          onChange={handleFilterChange}
        />
        {/* You could add a filter for withdrawal_wallet_address here */}
        {/*
        <input
          type="text"
          name="withdrawalWallet"
          placeholder="Filter by Withdrawal Wallet"
          value={filters.withdrawalWallet}
          onChange={handleFilterChange}
        />
        */}
      </div>

      {/* --- BULK ACTIONS --- */}
      <div className="bulk-actions">
        <input
          type="number"
          placeholder="Tasks to Apply"
          value={tasksToApply}
          onChange={(e) => setTasksToApply(e.target.value)}
          min="0"
        />
        <button onClick={handleApplyTasks} disabled={selectedUserIds.length === 0}>
          Apply Tasks to Selected ({selectedUserIds.length})
        </button>
        <button onClick={handleDeleteSelected} disabled={selectedUserIds.length === 0} className="delete-button">
            Delete Selected ({selectedUserIds.length})
        </button>
      </div>

      {/* --- USER TABLE --- */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={selectedUserIds.length === users.length && users.length > 0}
                />
              </th>
              <th>ID</th>
              <th>Username</th>
              <th>Phone</th>
              <th>Invitation Code</th>
              <th>Invited By</th>
              <th>Daily Orders</th>
              <th>Completed</th>
              <th>Uncompleted</th>
              <th>Wallet Balance</th>
              <th>Recharge Wallet</th> {/* Label for walletAddress */}
              <th>Withdrawal Wallet</th> {/* NEW COLUMN HEADER */}
              <th>Role</th>
              <th>Default Profit</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => handleCheckboxChange(user.id)}
                    />
                  </td>
                  <td>{user.id}</td>
                  <td>{user.username}</td>
                  <td>{user.phone}</td>
                  <td>{user.invitation_code}</td>
                  <td>{user.invited_by || "N/A"}</td>
                  <td>{user.daily_orders}</td>
                  <td>{user.completed_orders}</td>
                  <td>{user.uncompleted_orders}</td>
                  {/* <td>${user.wallet_balance ? user.wallet_balance.toFixed(2) : '0.00'}</td> */}
                  {/* <td>{e.wallet_balance !== null && e.wallet_balance !== undefined ? parseFloat(e.wallet_balance).toFixed(2) : '0.00'}</td> */}
                  <td>{user.wallet_balance !== null && user.wallet_balance !== undefined ? parseFloat(user.wallet_balance).toFixed(2) : '0.00'}</td>
                  <td>{user.walletAddress || "N/A"}</td> {/* Display recharge wallet */}
                  <td>{user.withdrawal_wallet_address || "N/A"}</td> {/* Display withdrawal wallet */}
                  <td>{user.role}</td>
                  <td>${user.default_task_profit ? user.default_task_profit.toFixed(2) : '0.00'}</td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="action-button view"
                      onClick={() => openHistoryModal(user)}
                    >
                      VIEW
                    </button>
                    <button
                      className="action-button settings"
                      onClick={() => openSettingModal(user)}
                    >
                      SETTINGS
                    </button>
                    {/* Placeholder for 'CREATE' if you have this functionality */}
                    <button
                      className="action-button create"
                      onClick={() => alert(`Create action for user ${user.username}`)}
                    >
                      CREATE
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                {/* UPDATED COLSPAN: Adjusted for the new 'Withdrawal Wallet' column (now 17 columns) */}
                <td colSpan="17" style={{ textAlign: "center" }}>
                  No users found or matching filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- PAGINATION BUTTONS --- */}
      <div className="pagination">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        {renderPageNumbers()}
        <button
          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>


      {showHistoryModal && selectedUserForModal && (
        <HistoryModal
          user={selectedUserForModal}
          onClose={() => setShowHistoryModal(false)}
        />
      )}

      {showSettingModal && selectedUserForModal && (
        <SettingModal
          user={selectedUserForModal}
          onClose={() => setShowSettingModal(false)}
          onSave={handleSettingsSaved}
        />
      )}
    </div>
  );
};

export default UserTable;