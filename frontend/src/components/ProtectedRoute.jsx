import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../api/auth.js';

export default function ProtectedRoute({ element }) {
  return isAuthenticated() ? element : <Navigate to="/login" replace />;
}
