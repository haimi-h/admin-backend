import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import UserTable from './pages/UserTable';
import InjectionPlan from './pages/InjectionPlan';
import AdminChatPanel from './pages/AdminChatPanel'; // Import AdminChatPanel

// This component protects routes, redirecting to login if no token is found.
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user')); // Get user data from localStorage

  // Debugging logs for PrivateRoute
  console.log('--- PrivateRoute Debug ---');
  console.log('Current Path:', window.location.pathname);
  console.log('Token:', token ? 'Exists' : 'Does NOT exist');
  console.log('User object from localStorage:', user);
  console.log('User Role:', user ? user.role : 'N/A');

  // If no token, always redirect to login
  if (!token) {
    console.log('Redirecting to /login: No token found.');
    return <Navigate to="/login" />;
  }

  // Check if the route is an admin-specific route
  // We'll assume any route under /admin/ is an admin route for this check
  const isAdminRoute = window.location.pathname.startsWith('/admin/');
  console.log('Is Admin Route:', isAdminRoute);

  // If it's an admin route, check if the user has the 'admin' role
  if (isAdminRoute && (!user || user.role !== 'admin')) {
    // If not an admin, redirect to login or a forbidden page
    console.warn('Access denied: Non-admin user attempted to access admin route. Redirecting to /login.');
    return <Navigate to="/login" />;
  }

  console.log('Access granted.');
  // If authenticated and authorized (or not an admin route), render children
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/usertable"
          element={<PrivateRoute><UserTable /></PrivateRoute>}
        />
        <Route
          path="/admin/injection"
          element={<PrivateRoute><InjectionPlan /></PrivateRoute>}
        />
        {/* Route for Admin Chat Panel */}
        <Route
          path="/admin/chat"
          element={<PrivateRoute><AdminChatPanel /></PrivateRoute>}
        />
        {/* Default route redirects to the user table */}
        <Route path="/" element={<Navigate to="/usertable" />} />
      </Routes>
    </Router>
  );
}

export default App;
