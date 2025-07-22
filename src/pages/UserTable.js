import React, { useState, useEffect } from "react";
import "../UserTable.css"; // Your existing CSS file
import { useNavigate } from "react-router-dom";
import axios from "axios"; // Import axios for API calls

// Import new modal components
import HistoryModal from "./HistoryModal";
import SettingModal from "./SettingModal";

// const API_BASE_URL = 'http://localhost:5000/api'; // Your backend API base URL
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

      const response = await axios.get(`${API_BASE_URL}/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: filters, // Pass filters as query parameters
      });
      let fetchedUsers = response.data; // Use 'let' to allow reassigning

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

        // Update the fetchedUsers array with newly generated addresses
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

      // 💡 NEW: Sort users by creation date in descending order
      // Assuming each user object has a 'createdAt' property (or similar timestamp)
      // If your backend doesn't provide a 'createdAt' field, you'll need to
      // adjust this sorting logic based on an available field that indicates creation order,
      // or modify your backend to include a creation timestamp.
      const sortedUsers = fetchedUsers.sort((a, b) => {
        // Convert to Date objects for comparison
        const dateA = new Date(a.createdAt); // Replace 'createdAt' with your actual timestamp field
        const dateB = new Date(b.createdAt); // Replace 'createdAt' with your actual timestamp field
        return dateB - dateA; // For descending order (newest first)
      });

      setUsers(sortedUsers); // Set the sorted users
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
    fetchUsers();
  }, [filters]); // Re-fetch when filters change

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
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
      setTasksToApply(""); // Clear input
      setSelectedUserIds([]); // Clear selection
      fetchUsers(); // Re-fetch users to update table
    } catch (err) {
      console.error("Error applying tasks:", err);
      alert("Failed to apply tasks.");
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
    fetchUsers(); // Re-fetch users after settings are saved
  };

  const handleCreate = (userId) => {
    navigate(`/injection-plan`, { state: { userIdToInject: userId } });
  };

  const handleInjectClick = (userId) => {
    navigate(`/admin/injection`, { state: { userIdToInject: userId } });
  };

  // ADDED: Handler for deleting selected users
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
      return; // User cancelled
    }

    try {
      const token = localStorage.getItem("token");
      // Send DELETE requests for each selected user
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
      setSelectedUserIds([]); // Clear selection
      fetchUsers(); // Re-fetch users to update the table
    } catch (err) {
      console.error("Error deleting users:", err);
      alert(err.response?.data?.message || "Failed to delete user(s).");
    }
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
          {/* ADDED: Delete Selected Users Button */}
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
              {/* REMOVED: Wallet Balance column */}
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
                  {/* Display wallet address or empty string/N/A */}
                  <td>{user.walletAddress || "N/A"}</td>
                  {/* REMOVED: Wallet Balance display */}
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
                {/* Adjusted colspan after removing Wallet Balance column */}
                <td colSpan="11" style={{ textAlign: "center" }}>
                  No users found or matching filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button>1</button>
        <button>2</button>
        <button>3</button>
        <button>+</button>
        <button>5</button>
      </div>

      {/* History Modal */}
      {showHistoryModal && selectedUserForModal && (
        <HistoryModal
          user={selectedUserForModal}
          onClose={() => setShowHistoryModal(false)}
        />
      )}

      {/* Setting Modal */}
      {showSettingModal && selectedUserForModal && (
        <SettingModal
          user={selectedUserForModal}
          onClose={() => setShowSettingModal(false)}
          onSave={handleSettingsSaved} // Callback to re-fetch users after save
        />
      )}
    </div>
  );
};

export default UserTable;