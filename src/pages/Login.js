import "../Auth.css";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
// import shopifyLogo from '../shopify-logo.png';
// import LanguageGlobe from './LanguageGlobe';

// const API = 'http://localhost:5000/api/auth';
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

function Login() {
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, {
        phone,
        password,
      });

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
      setError(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* <div className="top-right"><LanguageGlobe /></div> */}

        {/* <img src={shopifyLogo} alt="Logo" className="logo" /> */}
        <h2 className="brand-name">Shopify</h2>
        <p className="tagline">Talking</p>

        {error && <p className="error-message">{error}</p>}

        <input
          type="text"
          placeholder="Phone Number"
          className="auth-input"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="auth-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="auth-button" onClick={handleLogin} disabled={loading}>
          {loading ? 'Logging in...' : 'LOG IN'}
        </button>

        <Link to="/register" className="auth-link">Create an account</Link>
        <p className="footer-text">Powered by Shopify</p>
      </div>
    </div>
  );
}

export default Login;
