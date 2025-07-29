import "../Auth.css";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
// import shopifyLogo from '../shopify-logo.png'; // Keeping commented out
// import LanguageGlobe from './LanguageGlobe'; // Keeping commented out

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

function Login() {
  const navigate = useNavigate();

  // Identifier will now always be treated as username for admin login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      // For admin login, always send username and password
      const payload = {
        username: username,
        password: password,
      };

      const res = await axios.post(`${API_BASE_URL}/auth/login`, payload);

      const { token, user } = res.data;

      // Save to localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Always navigate to /usertable for admin login
      if (user.role === 'admin') {
        navigate('/usertable');
      } else {
        // If a non-admin somehow logs in here (e.g., via direct API call),
        // redirect them or show an error.
        setError('Access denied. This login is for administrators only.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Login failed. Please check your username and password.'); // More specific error message
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* LanguageGlobe removed as it's not needed for a dedicated admin login */}
        {/* <div className="top-right"><LanguageGlobe /></div> */}

        {/* shopifyLogo removed as it's not needed for a dedicated admin login */}
        {/* <img src={shopifyLogo} alt="Logo" className="logo" /> */}
        <h2 className="brand-name">Admin Login</h2> {/* Specific title for admin login */}
        <p className="tagline">Manage your Shopify platform</p> {/* Specific tagline */}

        {error && <p className="error-message">{error}</p>}

        {/* Input for Username */}
        <input
          type="text"
          placeholder="Username" // Hardcoded placeholder for username
          className="auth-input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        {/* Input for Password */}
        <input
          type="password"
          placeholder="Password" // Hardcoded placeholder for password
          className="auth-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="auth-button" onClick={handleLogin} disabled={loading}>
          {loading ? 'Logging in...' : 'LOG IN'}
        </button>

        {/* Removed "Create an account" link as it's not applicable for admin login */}
        {/* <Link to="/register" className="auth-link">Create an account</Link> */}
        <p className="footer-text">Powered by Shopify Admin</p> {/* Specific footer text */}
      </div>
    </div>
  );
}

export default Login;
