import React, { useState, useEffect } from "react";
import "../UserTable.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";

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
  const [totalUsers, setTotalUsers] = useState(0); // Total number of users from backend

  // Function to generate and assign a wallet address (unchanged)
  const generateAndAssignWallet = async (userId, token) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/admin/users/${userId}/generate-wallet`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log(
        `Wallet address generated and assigned for user ${userId}:`,
        response.data.walletAddress
      );
      return { userId, walletAddress: response.data.walletAddress };
    } catch (err) {
      console.error(
        `Error generating and assigning wallet for user ${userId}:`,
        err.response?.data?.message || err.message
      );
      return { userId, error: true };
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication required. Please log in as an administrator.");
        setLoading(false);
        navigate("/login");
        return;
      }

      // --- PAGINATION PARAMETERS IN API CALL ---
      const response = await axios.get(`${API_BASE_URL}/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          ...filters,
          page: currentPage, // Send current page
          limit: usersPerPage, // Send users per page limit
        },
      });

      // Assuming backend returns an object like { users: [], totalUsers: N }
      const fetchedUsersData = response.data;
      let fetchedUsers = fetchedUsersData.users; // Extract users array
      setTotalUsers(fetchedUsersData.totalUsers); // Set total users for pagination calculation

      // Identify users who need a wallet address generated (unchanged)
      const usersNeedingWallet = fetchedUsers.filter(
        (user) => !user.walletAddress
      );

      if (usersNeedingWallet.length > 0) {
        console.log(
          `Found ${usersNeedingWallet.length} users needing wallet addresses. Generating...`
        );
        const generationPromises = usersNeedingWallet.map((user) =>
          generateAndAssignWallet(user.id, token)
        );
        const generationResults = await Promise.all(generationPromises);

        fetchedUsers = fetchedUsers.map((user) => {
          const generated = generationResults.find(
            (res) => res.userId === user.id
          );
          if (generated && generated.walletAddress) {
            return { ...user, walletAddress: generated.walletAddress };
          }
          return user;
        });
      }

      // --- SORTING LOGIC ---
      // IMPORTANT: If your backend is already sorting, you might remove this.
      // If not, ensure 'createdAt' exists or use 'id'
      const sortedUsers = fetchedUsers.sort((a, b) => {
        // Option 1: Using createdAt (recommended, if available and accurate)
        // return new Date(b.createdAt) - new Date(a.createdAt);

        // Option 2: Using id (if IDs are sequentially assigned and reliable for order)
        return b.id - a.id;
      });

      setUsers(sortedUsers);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to fetch users. Please try again.");
      if (
        err.response &&
        (err.response.status === 401 || err.response.status === 403)
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Re-fetch when filters or currentPage change
    fetchUsers();
  }, [filters, currentPage]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handleCheckboxChange = (userId) => {
    setSelectedUserIds((prevSelected) =>
      prevSelected.includes(userId)
        ? prevSelected.filter((id) => id !== userId)
        : [...prevSelected, userId]
    );
  };

  const handleApplyTasks = async () => {
    if (selectedUserIds.length === 0 || !tasksToApply) {
      alert("Please select users and enter tasks to apply.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await Promise.all(
        selectedUserIds.map((userId) =>
          axios.put(
            `${API_BASE_URL}/admin/users/${userId}`,
            { daily_orders: parseInt(tasksToApply) },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )
        )
      );
      alert("Tasks applied successfully!");
      setTasksToApply("");
      setSelectedUserIds([]);
      fetchUsers(); // Re-fetch users to update table
    } catch (err) {
      console.error("Error applying tasks:", err);
      alert("Failed to apply tasks.");
    }
  };

  const handleDeleteSelectedUsers = async () => {
    if (selectedUserIds.length === 0) {
      alert("Please select users to delete.");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedUserIds.length} selected user(s)? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await Promise.all(
        selectedUserIds.map((userId) =>
          axios.delete(`${API_BASE_URL}/admin/users/${userId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
        )
      );
      alert("Selected user(s) deleted successfully!");
      setSelectedUserIds([]);
      fetchUsers();
    } catch (err) {
      console.error("Error deleting users:", err);
      alert(err.response?.data?.message || "Failed to delete user(s).");
    }
  };

  const handleSettingsClick = (user) => {
    setSelectedUserForModal(user);
    setShowSettingModal(true);
  };

  const handleHistoryClick = (user) => {
    setSelectedUserForModal(user);
    setShowHistoryModal(true);
  };

  const handleSettingsSaved = () => {
    fetchUsers();
  };

  const handleCreate = (userId) => {
    navigate(`/injection-plan`, { state: { userIdToInject: userId } });
  };

  const handleInjectClick = (userId) => {
    navigate(`/admin/injection`, { state: { userIdToInject: userId } });
  };

  // --- PAGINATION LOGIC ---
  const totalPages = Math.ceil(totalUsers / usersPerPage);
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  const renderPageNumbers = () => {
    // Only render a reasonable number of page buttons to prevent clutter
    const maxPageButtons = 5; // Example: show up to 5 buttons at a time
    let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

    if (endPage - startPage + 1 < maxPageButtons) {
        startPage = Math.max(1, endPage - maxPageButtons + 1);
    }

    const displayedPageNumbers = [];
    if (startPage > 1) {
        displayedPageNumbers.push(1);
        if (startPage > 2) {
            displayedPageNumbers.push('...');
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        displayedPageNumbers.push(i);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            displayedPageNumbers.push('...');
        }
        displayedPageNumbers.push(totalPages);
    }

    return displayedPageNumbers.map((number, index) => (
      <button
        key={number === '...' ? `dots-${index}` : number}
        onClick={() => number !== '...' && setCurrentPage(number)}
        className={number === currentPage ? "active" : ""}
        disabled={number === '...'}
      >
        {number}
      </button>
    ));
  };


  if (loading) {
    return <div className="loading-message">Loading users...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="user-table-container">
      <h1>User Table</h1>

      <div className="filters-and-apply">
        <div className="filters">
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={filters.username}
            onChange={handleFilterChange}
          />
          <input
            type="text"
            name="phone"
            placeholder="Phone No"
            value={filters.phone}
            onChange={handleFilterChange}
          />
          <input
            type="text"
            name="code"
            placeholder="Invitation Code"
            value={filters.code}
            onChange={handleFilterChange}
          />
          <input
            type="text"
            name="wallet"
            placeholder="Wallet Address"
            value={filters.wallet}
            onChange={handleFilterChange}
          />
        </div>
        <div className="apply-tasks">
          <input
            type="number"
            placeholder="Number of orders"
            value={tasksToApply}
            onChange={(e) => setTasksToApply(e.target.value)}
          />
          <button onClick={handleApplyTasks} className="btn btn-green">
            APPLY
          </button>
          <button
            onClick={handleDeleteSelectedUsers}
            className="btn btn-red"
            style={{ marginLeft: "10px" }}
          >
            Delete
          </button>
          <button
            className="btn btn-chat"
            onClick={() => navigate("/admin/chat")}
            title="Chat"
          >
            💬
          </button>
        </div>
      </div>

      <div className="table-responsive-wrapper">
        <table className="user-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  onChange={() => {
                    if (selectedUserIds.length === users.length) {
                      setSelectedUserIds([]);
                    } else {
                      setSelectedUserIds(users.map((user) => user.id));
                    }
                  }}
                  checked={
                    selectedUserIds.length === users.length && users.length > 0
                  }
                />
              </th>
              <th>ID</th>
              <th>Username</th>
              <th>Phone No</th>
              <th>Invitation Code</th>
              <th>Invited By</th>
              <th>Daily Orders</th>
              <th>Completed</th>
              <th>Uncompleted</th>
              <th>Wallet Address</th>
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
                  <td>{user.walletAddress || "N/A"}</td>
                  <td>
                    <button
                      className="btn btn-red"
                      onClick={() => handleInjectClick(user.id)}
                    >
                      INJECT
                    </button>
                    <button
                      className="btn btn-blue"
                      onClick={() => handleSettingsClick(user)}
                    >
                      SETTING
                    </button>
                    <button
                      className="btn btn-yellow"
                      onClick={() => handleHistoryClick(user)}
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