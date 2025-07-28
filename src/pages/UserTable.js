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
  const [usersPerPage] = useState(10); // Number of users to display per page
  const [totalUsers, setTotalUsers] = useState(0); // Total count of users for pagination

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
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: currentPage,
          limit: usersPerPage,
          ...filters,
        },
      });
      setUsers(response.data.users);
      setTotalUsers(response.data.totalCount);
      setError(null);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err.response?.data?.message || "Failed to fetch users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, usersPerPage, filters]); // Re-fetch when pagination or filters change

  // Function to handle opening the settings modal
  const handleOpenSettingModal = (user) => {
    setSelectedUserForModal(user);
    setShowSettingModal(true);
  };

  // Function to handle opening the history modal
  const handleOpenHistoryModal = (user) => {
    setSelectedUserForModal(user);
    setShowHistoryModal(true);
  };

  const handleSettingsSaved = () => {
    // This function is called when settings are saved in the SettingModal
    // It should trigger a re-fetch of the users to update the table
    fetchUsers(); // Assuming fetchUsers is a function that fetches the user list
  };

  // Function to handle applying daily orders to selected users
  const handleApplyDailyOrders = async () => {
    if (selectedUserIds.length === 0 || tasksToApply === "") {
      setError("Please select users and enter the number of tasks.");
      return;
    }
    setError(null);
    try {
      const token = localStorage.getItem("token");
      await Promise.all(
        selectedUserIds.map((userId) =>
          axios.put(
            `${API_BASE_URL}/admin/users/${userId}/daily-orders`,
            { dailyOrders: parseInt(tasksToApply) },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      );
      setMessage("Daily orders updated successfully!");
      setTasksToApply("");
      setSelectedUserIds([]);
      fetchUsers(); // Re-fetch users to show updated daily orders
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update daily orders.");
      console.error("Error applying daily orders:", err);
    }
  };

  // Function to handle deleting selected users
  const handleDeleteSelected = async () => {
    if (selectedUserIds.length === 0) {
      setError("Please select users to delete.");
      return;
    }
    setError(null);
    if (!window.confirm(`Are you sure you want to delete ${selectedUserIds.length} selected user(s)?`)) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await Promise.all(
        selectedUserIds.map((userId) =>
          axios.delete(`${API_BASE_URL}/admin/users/${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      setMessage("Selected users deleted successfully!");
      setSelectedUserIds([]);
      fetchUsers(); // Re-fetch users to update the table
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete users.");
      console.error("Error deleting users:", err);
    }
  };

  // Function to handle injecting funds
  const handleInjectFunds = async (userId) => {
    const amount = prompt("Enter amount to inject:");
    if (amount === null || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError("Invalid amount. Please enter a positive number.");
      return;
    }
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_BASE_URL}/admin/users/inject/${userId}`,
        { amount: parseFloat(amount) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(response.data.message);
      fetchUsers(); // Re-fetch users to show updated balance
    } catch (err) {
      setError(err.response?.data?.message || "Failed to inject funds.");
      console.error("Error injecting funds:", err);
    }
  };

  // Function to handle generating and assigning a wallet address
  const handleGenerateWallet = async (userId) => {
    if (!window.confirm("Are you sure you want to generate and assign a new wallet address for this user? This will overwrite any existing wallet address if not empty.")) {
      return;
    }
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_BASE_URL}/admin/users/${userId}/generate-wallet`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(response.data.message);
      fetchUsers(); // Re-fetch users to show the new wallet address
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate wallet.");
      console.error("Error generating wallet:", err);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prevFilters) => ({
      ...prevFilters,
      [name]: value,
    }));
    setCurrentPage(1); // Reset to first page on filter change
  };

  // Handle master checkbox change
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allUserIds = users.map((user) => user.id);
      setSelectedUserIds(allUserIds);
    } else {
      setSelectedUserIds([]);
    }
  };

  // Handle individual checkbox change
  const handleSelectUser = (e, userId) => {
    if (e.target.checked) {
      setSelectedUserIds((prev) => [...prev, userId]);
    } else {
      setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
    }
  };

  // Pagination: Calculate total pages
  const totalPages = Math.ceil(totalUsers / usersPerPage);

  // Pagination: Render page numbers
  const renderPageNumbers = () => {
    const pageNumbers = [];
    // Only show relevant page numbers around current page, e.g., current, prev, next
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, currentPage + Math.floor(maxPagesToShow / 2));

    if (endPage - startPage + 1 < maxPagesToShow) {
        if (startPage === 1) {
            endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
        } else if (endPage === totalPages) {
            startPage = Math.max(1, totalPages - maxPagesToShow + 1);
        }
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
        pageNumbers.unshift(<button onClick={() => setCurrentPage(1)}>1</button>);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) pageNumbers.push(<span>...</span>);
        pageNumbers.push(<button onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>);
    }


    return pageNumbers;
  };

  return (
    <div className="user-table-container">
      <h1>Admin Dashboard - Users</h1>

      {/* --- FILTER SECTION --- */}
      <div className="filters-section">
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
          placeholder="Filter by Wallet Address"
          value={filters.wallet}
          onChange={handleFilterChange}
        />
      </div>

      {/* --- MESSAGE DISPLAY --- */}
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}

      {/* --- BULK ACTIONS --- */}
      <div className="bulk-actions-section">
        <input
          type="number"
          placeholder="Tasks to apply"
          value={tasksToApply}
          onChange={(e) => setTasksToApply(e.target.value)}
          min="0"
        />
        <button
          onClick={handleApplyDailyOrders}
          disabled={selectedUserIds.length === 0}
        >
          Apply Tasks to Selected ({selectedUserIds.length})
        </button>
        <button onClick={handleDeleteSelected} disabled={selectedUserIds.length === 0} className="delete-button">
          Delete Selected ({selectedUserIds.length})
        </button>
      </div>

      {/* --- USER TABLE --- */}
      <div className="table-responsive">
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
              <th>Completed Orders</th>
              <th>Uncompleted Orders</th>
              <th>Amount</th>
              <th>Wallet Address</th>
              <th>Withdrawal Address</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="13" style={{ textAlign: "center" }}>Loading users...</td>
              </tr>
            ) : users.length > 0 ? (
              users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={(e) => handleSelectUser(e, user.id)}
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
                  {/* MODIFIED: Ensure wallet_balance is displayed here */}
                  <td>${user.wallet_balance ? user.wallet_balance.toFixed(2) : '0.00'}</td>
                  <td>{user.walletAddress || "N/A"}</td>
                  <td>{user.withdrawal_wallet_address || "N/A"}</td>
                  <td>{user.role}</td>
                  <td>
                    <button
                      className="action-button view-history-button"
                      onClick={() => handleOpenHistoryModal(user)}
                    >
                      History
                    </button>
                    <button
                      className="action-button edit-button"
                      onClick={() => handleOpenSettingModal(user)}
                    >
                      Edit
                    </button>
                    <button
                      className="action-button inject-button"
                      onClick={() => handleInjectFunds(user.id)}
                    >
                      Inject
                    </button>
                    <button
                      className="action-button create-wallet-button"
                      onClick={() => handleGenerateWallet(user.id)}
                    >
                      CREATE
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="13" style={{ textAlign: "center" }}>
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