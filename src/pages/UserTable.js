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
  const [totalUsers, setTotalUsers] = useState(0); // Total number of users from backend

  // Function to generate and assign a wallet address
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
      return { userId, walletAddress: response.data.walletAddress }; // Return generated address
    } catch (err) {
      console.error(
        `Error generating and assigning wallet for user ${userId}:`,
        err.response?.data?.message || err.message
      );
      return { userId, error: true }; // Indicate an error occurred for this user
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
      
       console.log("Fetching users for page:", currentPage, "with limit:", usersPerPage);

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

      let fetchedUsers = [];
      let totalUsersCount = 0;

      if (Array.isArray(response.data)) {
        fetchedUsers = response.data;
        totalUsersCount = response.data.length;
      } else if (response.data && typeof response.data === 'object' && response.data.users) {
        fetchedUsers = response.data.users;
        totalUsersCount = response.data.totalCount || 0;
      } else {
        console.warn("Unexpected data format from backend:", response.data);
        setError("Received unexpected data from the server.");
        setLoading(false);
        return;
      }
      
      setTotalUsers(totalUsersCount);


      // Identify users who need a wallet address generated
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

      const sortedUsers = fetchedUsers.sort((a, b) => {
        if (a.created_at && b.created_at) {
            return new Date(b.created_at) - new Date(a.created_at);
        }
        return b.id - a.id;
      });

      setUsers(sortedUsers);
    } catch (err) {
      console.error("Error fetching users:", err);
      if (err.response) {
        setError(`Failed to fetch users: ${err.response.status} - ${err.response.data?.message || 'Server error'}`);
        if (err.response.status === 401 || err.response.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
        }
      } else if (err.request) {
        setError("Network error: No response from server. Please check your connection.");
      } else {
        setError("Error setting up request to fetch users.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filters, currentPage]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
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
            `${API_BASE_URL}/admin/users/${userId}/daily-orders`,
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
      fetchUsers();
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

  const handleInjectClick = (userId) => {
    navigate(`/admin/injection`, { state: { userIdToInject: userId } });
  };

  const handleCreate = (userId) => {
    console.log(`Create action for user ID: ${userId}`);
  };

  const totalPages = Math.ceil(totalUsers / usersPerPage);

  const renderPageNumbers = () => {
    const maxPageButtons = 5;
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
          <button
            className="btn btn-chat"
            onClick={() => navigate("/admin/recharge")}
            title="recharge"
          >
            Recharge Requests
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
              <th>Amount (TRX)</th>
              <th>Invitation Code</th>
              <th>Invited By</th>
              <th>Daily Orders</th>
              <th>Completed</th>
              <th>Uncompleted</th>
              <th>Withdrawal Wallet Address</th>
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
                  <td>
                    {!isNaN(parseFloat(user.wallet_balance))
                      ? parseFloat(user.wallet_balance).toFixed(2)
                      : 'N/A'}
                  </td>
                  <td>{user.invitation_code}</td>
                  <td>{user.invited_by || "N/A"}</td>
                  <td>{user.daily_orders}</td>
                  <td>{user.completed_orders}</td>
                  <td>{user.uncompleted_orders}</td>
                  <td>{user.withdrawal_wallet_address || "N/A"}</td>
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