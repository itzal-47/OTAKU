import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireCharacter?: boolean;
}

export default function ProtectedRoute({ children, requireCharacter = false }: ProtectedRouteProps) {
  const { user, character, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full border-2 border-border2 border-t-purple mx-auto mb-4 animate-spin" />
          <p className="text-sm text-text3">A carregar...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireCharacter && !character) {
    return <Navigate to="/criar-personagem" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
