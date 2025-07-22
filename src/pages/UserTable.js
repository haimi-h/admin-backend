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
    wallet: "",
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
  const [usersPerPage] = useState(10); // Number of users per page
  const [totalUsers, setTotalUsers] = useState(0); // Total number of users from API

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }
      // Added pagination parameters to the request
      const response = await axios.get(`${API_BASE_URL}/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          page: currentPage,
          limit: usersPerPage,
          ...filters,
        },
      });
      setUsers(response.data.users);
      setTotalUsers(response.data.totalUsers); // Assuming API returns totalUsers
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users. Please try again.");
      if (err.response && err.response.status === 401) {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, filters]); // Re-fetch when page or filters change

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1); // Reset to first page on filter change
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
      setSelectedUserIds(users.map((user) => user.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const applyTasks = async () => {
    if (!tasksToApply || selectedUserIds.length === 0) {
      alert("Please enter tasks and select users.");
      return;
    }
    const token = localStorage.getItem("token");
    try {
      await Promise.all(
        selectedUserIds.map((userId) =>
          axios.put(
            `${API_BASE_URL}/admin/users/${userId}`,
            { daily_orders: parseInt(tasksToApply) },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      );
      alert("Daily tasks updated successfully!");
      fetchUsers(); // Refresh the user list
      setTasksToApply("");
      setSelectedUserIds([]);
    } catch (error) {
      console.error("Error applying tasks:", error);
      alert("Failed to update daily tasks.");
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedUserIds.length === 0) {
      alert("Please select users to delete.");
      return;
    }
    if (window.confirm(`Are you sure you want to delete ${selectedUserIds.length} selected users?`)) {
      const token = localStorage.getItem("token");
      try {
        await Promise.all(selectedUserIds.map(userId =>
          axios.delete(`${API_BASE_URL}/admin/users/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ));
        alert("Selected users deleted successfully!");
        fetchUsers(); // Refresh the user list
        setSelectedUserIds([]);
      } catch (error) {
        console.error("Error deleting users:", error);
        alert("Failed to delete selected users. Check console for details.");
      }
    }
  };

  const handleHistory = (user) => {
    setSelectedUserForModal(user);
    setShowHistoryModal(true);
  };

  const handleSetting = (user) => {
    setSelectedUserForModal(user);
    setShowSettingModal(true);
  };

  const handleCreate = (userId) => {
    // Implement create action for a user
    console.log(`Create action for user ID: ${userId}`);
    // This could navigate to a user creation/management page or open another modal
  };

  const handleSettingsSaved = () => {
    setShowSettingModal(false);
    fetchUsers(); // Re-fetch users to show updated data
  };

  const totalPages = Math.ceil(totalUsers / usersPerPage);

  const renderPageNumbers = () => {
    const pageNumbers = [];
    // Display logic for pagination, e.g., 1 2 3 ... 7 8 9
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (startPage === 1) {
      endPage = Math.min(totalPages, 5);
    }
    if (endPage === totalPages) {
      startPage = Math.max(1, totalPages - 4);
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

    if (startPage > 1) {
      if (startPage > 2) pageNumbers.unshift(<span>...</span>);
      pageNumbers.unshift(
        <button key={1} onClick={() => setCurrentPage(1)} className={currentPage === 1 ? "active" : ""}>
          1
        </button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pageNumbers.push(<span>...</span>);
      pageNumbers.push(
        <button key={totalPages} onClick={() => setCurrentPage(totalPages)} className={currentPage === totalPages ? "active" : ""}>
          {totalPages}
        </button>
      );
    }

    return pageNumbers;
  };

  return (
    <div className="user-table-container">
      <h1 className="table-title">User Management</h1>

      <div className="controls-section">
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
            placeholder="Filter by Code"
            value={filters.code}
            onChange={handleFilterChange}
          />
          <input
            type="text"
            name="wallet"
            placeholder="Filter by Wallet Address"
            value={filters.wallet}
            onChange={handleFilterChange}
          />
        </div>

        <div className="actions">
          <input
            type="number"
            placeholder="Set daily tasks"
            value={tasksToApply}
            onChange={(e) => setTasksToApply(e.target.value)}
          />
          <button className="apply-button" onClick={applyTasks}>
            APPLY TASKS
          </button>
          <button className="delete-selected-button" onClick={handleDeleteSelected}>
            DELETE SELECTED
          </button>
        </div>
      </div>

      {loading && <div className="loading-message">Loading users...</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="table-responsive">
        <table className="user-table">
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
              <th>Amount (TRX)</th> {/* ADDED: Amount Column */}
              <th>Invited By</th>
              <th>Code</th>
              <th>Wallet Address</th>
              <th>Daily Orders</th>
              <th>Completed Orders</th>
              <th>Uncompleted Orders</th>
              <th>Role</th>
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
                  <td>{user.wallet_balance ? user.wallet_balance.toFixed(2) : 'N/A'}</td> {/* ADDED: Amount Display */}
                  <td>{user.invited_by || "N/A"}</td>
                  <td>{user.invitation_code}</td>
                  <td>{user.walletAddress || "N/A"}</td>
                  <td>{user.daily_orders}</td>
                  <td>{user.completed_orders}</td>
                  <td>{user.uncompleted_orders}</td>
                  <td>{user.role}</td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="btn btn-blue"
                      onClick={() => handleSetting(user)}
                    >
                      SETTING
                    </button>
                    <button
                      className="btn btn-purple"
                      onClick={() => handleHistory(user)}
                    >
                      HISTORY
                    </button>
                    <button
                      className="btn btn-green"
                      onClick={() => handleCreate(user.id)}
                    >
                      CREATE
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                {/* Adjusted colspan after adding Wallet Balance column */}
                <td colSpan="14" style={{ textAlign: "center" }}>
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