import "../Auth.css";
import { Link, useNavigate } from "react-router-dom";
import { useState, useContext } from "react";
import axios from "axios";
// import shopifyLogo from '../shopify-logo.png';
import { LanguageContext } from '../pages/LanguageProvider';
import LanguageSelector from '../pages/LanguageProvider'; // LanguageSelector is the default export from that file

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

function Login() {
  const navigate = useNavigate();
  const { t } = useContext(LanguageContext);

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
      setError(err.response?.data?.message || t('loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="top-right"><LanguageSelector /></div>

        {/* <img src={shopifyLogo} alt="Logo" className="logo" /> */}
        <h2 className="brand-name">{t('brandName')}</h2>
        <p className="tagline">{t('tagline')}</p>

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
            {t('userLogin')}
          </button>
          <button
            className={`login-toggle-button ${isAdminLogin ? 'active' : ''}`}
            onClick={() => {
              setIsAdminLogin(true);
              setIdentifier(''); // Clear identifier when switching
            }}
          >
            {t('adminLogin')}
          </button>
        </div>

        <input
          type="text"
          placeholder={isAdminLogin ? t('usernamePlaceholder') : t('phoneNumberPlaceholder')}
          className="auth-input"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
        <input
          type="password"
          placeholder={t('passwordPlaceholder')}
          className="auth-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="auth-button" onClick={handleLogin} disabled={loading}>
          {loading ? t('loggingInButton') : t('logInButton')}
        </button>

        <Link to="/register" className="auth-link">{t('createAccountLink')}</Link>
        <p className="footer-text">{t('poweredBy')}</p>
      </div>
    </div>
  );
}

export default Login;
