import "../Auth.css";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react"; // Removed useContext
import axios from "axios";
// import shopifyLogo from '../shopify-logo.png'; // Keeping commented out as per your provided code
// import LanguageGlobe from './LanguageGlobe'; // Keeping commented out as per your provided code

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

function Login() {
  const navigate = useNavigate();
  // Removed: const { t } = useContext(LanguageContext);

  const [identifier, setIdentifier] = useState(''); // Can be phone or username
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAdminLogin, setIsAdminLogin] = useState(false); // New state to toggle login type

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const payload = {};
      if (isAdminLogin) {
        payload.username = identifier;
      } else {
        payload.phone = identifier;
      }
      payload.password = password;

      const res = await axios.post(`${API_BASE_URL}/auth/login`, payload);

      const { token, user } = res.data;

      // Save to localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Navigate based on role
      if (user.role === 'admin') {
        navigate('/usertable');
      } else {
        navigate('/dashboard');
      }

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Login failed.'); // Hardcoded error message
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Removed LanguageSelector */}
        {/* <div className="top-right"><LanguageGlobe /></div> */}

        {/* Removed shopifyLogo img tag, keeping commented out as per your provided code */}
        {/* <img src={shopifyLogo} alt="Logo" className="logo" /> */}
        <h2 className="brand-name">Shopify</h2> {/* Hardcoded brand name */}
        <p className="tagline">Talking</p> {/* Hardcoded tagline */}

        {error && <p className="error-message">{error}</p>}

        {/* Toggle between user and admin login */}
        <div className="login-toggle-container">
          <button
            className={`login-toggle-button ${!isAdminLogin ? 'active' : ''}`}
            onClick={() => {
              setIsAdminLogin(false);
              setIdentifier(''); // Clear identifier when switching
            }}
          >
            User Login {/* Hardcoded text */}
          </button>
          <button
            className={`login-toggle-button ${isAdminLogin ? 'active' : ''}`}
            onClick={() => {
              setIsAdminLogin(true);
              setIdentifier(''); // Clear identifier when switching
            }}
          >
            Admin Login {/* Hardcoded text */}
          </button>
        </div>

        <input
          type="text"
          placeholder={isAdminLogin ? "Username" : "Phone Number"} 
          className="auth-input"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password" 
          className="auth-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="auth-button" onClick={handleLogin} disabled={loading}>
          {loading ? 'Logging in...' : 'LOG IN'} {/* Hardcoded button text */}
        </button>

        <Link to="/register" className="auth-link">Create an account</Link> {/* Hardcoded link text */}
        <p className="footer-text">Powered by Shopify</p> {/* Hardcoded footer text */}
      </div>
    </div>
  );
}

export default Login;
