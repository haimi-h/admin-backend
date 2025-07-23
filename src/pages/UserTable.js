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
  const [usersPerPage] = useState(10); // Number of users to display per page (matches backend limit)
  const [totalUsers, setTotalUsers] = useState(0); // Total number of users from the backend API

  // --- FETCH USERS FUNCTION ---
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      // Build query parameters for filters and pagination
      const queryParams = new URLSearchParams({
        page: currentPage, // Pass current page
        limit: usersPerPage, // Pass users per page (limit)
      });

      if (filters.username) queryParams.append("username", filters.username);
      if (filters.phone) queryParams.append("phone", filters.phone);
      if (filters.code) queryParams.append("code", filters.code);
      if (filters.wallet) queryParams.append("wallet", filters.wallet);

      const res = await axios.get(`${API_BASE_URL}/admin/users?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUsers(res.data.users);
      setTotalUsers(res.data.totalCount); // Set total count from the backend response
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to fetch users. Please try again.");
      setUsers([]); // Clear users on error
    } finally {
      setLoading(false);
    }
  };

  // --- useEffect to fetch users when currentPage or filters change ---
  useEffect(() => {
    fetchUsers();
  }, [currentPage, filters]); // Re-fetch when page or filters change

  // --- Handlers for filter inputs ---
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prevFilters) => ({
      ...prevFilters,
      [name]: value,
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  // --- Apply Filters button handler (now just triggers fetch via useEffect) ---
  const handleApplyFilters = () => {
    // No explicit fetchUsers call here. useEffect will handle it when filters state updates.
    // If you want to explicitly trigger, you can do so, but useEffect is cleaner.
  };

  const handleResetFilters = () => {
    setFilters({
      username: "",
      phone: "",
      code: "",
      wallet: "",
    });
    setCurrentPage(1); // Reset to first page
  };

  // --- Modal Handlers ---
  const handleViewHistory = (user) => {
    setSelectedUserForModal(user);
    setShowHistoryModal(true);
  };

  const handleUserSettings = (user) => {
    setSelectedUserForModal(user);
    setShowSettingModal(true);
  };

  const handleSettingsSaved = () => {
    fetchUsers(); // Re-fetch users to update displayed data after saving settings
    setShowSettingModal(false); // Close the modal
  };

  // --- Pagination Logic ---
  const totalPages = Math.ceil(totalUsers / usersPerPage);

  const renderPageNumbers = () => {
    const pageNumbers = [];
    // Only show page numbers if there's more than one page
    if (totalPages <= 1) return null;

    // Show a limited number of page buttons around the current page
    const maxPageButtons = 5; // Max number of page buttons to display
    let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

    if (endPage - startPage + 1 < maxPageButtons) {
        startPage = Math.max(1, endPage - maxPageButtons + 1);
    }


    if (startPage > 1) {
        pageNumbers.push(<button key="1" onClick={() => setCurrentPage(1)} className={currentPage === 1 ? 'active' : ''}>1</button>);
        if (startPage > 2) {
            pageNumbers.push(<span key="dots-start">...</span>);
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

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pageNumbers.push(<span key="dots-end">...</span>);
        }
        pageNumbers.push(<button key={totalPages} onClick={() => setCurrentPage(totalPages)} className={currentPage === totalPages ? 'active' : ''}>{totalPages}</button>);
    }

    return pageNumbers;
};


  // --- Checkbox selection ---
  const handleCheckboxChange = (userId) => {
    setSelectedUserIds((prevSelected) =>
      prevSelected.includes(userId)
        ? prevSelected.filter((id) => id !== userId)
        : [...prevSelected, userId]
    );
  };

  const handleSelectAllChange = (e) => {
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

    if (!window.confirm(`Are you sure you want to delete ${selectedUserIds.length} selected user(s)?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      for (const userId of selectedUserIds) {
        await axios.delete(`${API_BASE_URL}/admin/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
      alert("Selected users deleted successfully!");
      setSelectedUserIds([]); // Clear selection
      fetchUsers(); // Re-fetch user list
    } catch (err) {
      console.error("Error deleting users:", err);
      setError("Failed to delete selected users.");
    } finally {
      setLoading(false);
    }
  };

  // --- Apply Tasks Logic ---
  const handleApplyTasks = async () => {
    if (selectedUserIds.length === 0 || !tasksToApply) {
      alert("Please select users and enter a number of tasks to apply.");
      return;
    }

    const tasksNum = parseInt(tasksToApply, 10);
    if (isNaN(tasksNum) || tasksNum < 0) {
      alert("Please enter a valid positive number for tasks.");
      return;
    }

    if (!window.confirm(`Are you sure you want to set ${tasksNum} daily tasks for ${selectedUserIds.length} user(s)?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      for (const userId of selectedUserIds) {
        await axios.put(`${API_BASE_URL}/admin/users/${userId}/daily-orders`, { daily_orders: tasksNum }, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
      alert("Daily tasks applied successfully!");
      setTasksToApply(""); // Clear input
      setSelectedUserIds([]); // Clear selection
      fetchUsers(); // Re-fetch user list
    } catch (err) {
      console.error("Error applying tasks:", err);
      setError("Failed to apply tasks to selected users.");
    } finally {
      setLoading(false);
    }
  };

  // --- Render Component ---
  return (
    <div className="admin-dashboard">
      <h1>Admin User Management</h1>

      {/* Filter Section */}
      <div className="filter-section">
        <input type="text" name="username" placeholder="Filter by Username" value={filters.username} onChange={handleFilterChange} />
        <input type="text" name="phone" placeholder="Filter by Phone" value={filters.phone} onChange={handleFilterChange} />
        <input type="text" name="code" placeholder="Filter by Invitation Code" value={filters.code} onChange={handleFilterChange} />
        <input type="text" name="wallet" placeholder="Filter by Wallet Address" value={filters.wallet} onChange={handleFilterChange} />
        {/* Removed explicit Apply Filters button, as useEffect handles it */}
        <button onClick={handleResetFilters}>Reset Filters</button>
      </div>

      {/* Bulk Actions */}
      <div className="bulk-actions">
        <input
          type="number"
          placeholder="Tasks to apply"
          value={tasksToApply}
          onChange={(e) => setTasksToApply(e.target.value)}
          min="0"
        />
        <button onClick={handleApplyTasks} disabled={selectedUserIds.length === 0}>
          Apply Daily Tasks to Selected ({selectedUserIds.length})
        </button>
        <button onClick={handleDeleteSelected} disabled={selectedUserIds.length === 0} className="delete-button">
          Delete Selected ({selectedUserIds.length})
        </button>
      </div>

      {loading && <p>Loading users...</p>}
      {error && <p className="error-message">{error}</p>}

      {/* User Table */}
      <div className="table-responsive">
        <table className="user-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  onChange={handleSelectAllChange}
                  checked={users.length > 0 && selectedUserIds.length === users.length}
                />
              </th>
              <th>ID</th>
              <th>Username</th>
              <th>Phone</th>
              <th>Wallet Address</th>
              <th>Balance (TRX)</th>
              <th>Referral Code</th>
              <th>Daily Orders</th>
              <th>Completed</th>
              <th>Uncompleted</th>
              <th>Default Profit</th> {/* Added for clarity and completeness */}
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
                  <td>{user.walletAddress || "N/A"}</td>
                  <td>{parseFloat(user.wallet_balance || 0).toFixed(2)}</td>
                  <td>{user.invitation_code}</td>
                  <td>{user.daily_orders}</td>
                  <td>{user.completed_orders}</td>
                  <td>{user.uncompleted_orders}</td>
                  <td>{parseFloat(user.default_task_profit || 0).toFixed(2)}</td> {/* Display default_task_profit */}
                  <td>
                    <button
                      className="action-button view-history"
                      onClick={() => handleViewHistory(user)}
                    >
                      History
                    </button>
                    <button
                      className="action-button edit-settings"
                      onClick={() => handleUserSettings(user)}
                    >
                      Settings
                    </button>
                    {/* Assuming this button is for generating a new wallet */}
                    <button
                      className="action-button create-wallet"
                      onClick={() => {
                        // Implement wallet generation logic here
                        // For example: await axios.post(`${API_BASE_URL}/admin/users/${user.id}/generate-wallet`);
                        alert(`Generate wallet for ${user.username}`);
                      }}
                    >
                      CREATE
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                {/* UPDATED COLSPAN: Adjusted for the new 'Default Profit' column (now 11 columns) */}
                <td colSpan="11" style={{ textAlign: "center" }}>
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
        {renderPageNumbers()} {/* Render the page number buttons */}
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