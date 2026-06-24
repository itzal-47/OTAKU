import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { Menu, X, Search, Zap } from 'lucide-react';
import { useState } from 'react';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;
  const isAuth = location.pathname === '/login';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-10 h-16 bg-bg/85 backdrop-blur-xl border-b border-border">
      <Link to="/" className="flex items-center gap-2.5 no-underline group">
        <div className="w-9 h-9 bg-gradient-to-br from-purple to-red rounded-xl flex items-center justify-center text-lg group-hover:scale-105 transition-transform">
          ⚔️
        </div>
        <span className="font-bebas text-xl tracking-wide text-text">
          Otaku<span className="text-purple2">Kamba</span>
        </span>
      </Link>

      {/* Desktop nav */}
      <ul className="hidden md:flex items-center gap-1 list-none">
        {[
          { path: '/feed', label: 'Feed' },
          { path: '/stories', label: 'Stories' },
          { path: '/arena', label: 'Arena' },
          { path: '/rankings', label: 'Rankings' },
          { path: '/clas', label: 'Clãs' },
          { path: '/torneios', label: 'Torneios' },
          { path: '/chat', label: 'Chat' },
        ].map(({ path, label }) => (
          <li key={path}>
            <Link
              to={path}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive(path)
                  ? 'text-purple2 bg-bg3'
                  : 'text-text2 hover:text-text hover:bg-bg3'
              }`}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>

      {/* Auth buttons */}
      <div className="hidden md:flex items-center gap-2">
        <Link to="/search" className="w-8 h-8 rounded-lg hover:bg-bg3 flex items-center justify-center transition-colors">
          <Search size={18} className="text-text2 hover:text-text" />
        </Link>

        {user && profile ? (
          <>
            <NotificationBell />
            {profile.is_admin && (
              <Link to="/admin" className="btn btn-ghost text-xs py-2 px-3 text-amber">
                Admin
              </Link>
            )}
            <Link to="/settings" className="w-8 h-8 rounded-lg hover:bg-bg3 flex items-center justify-center transition-colors text-text2">
              <Zap size={18} />
            </Link>
            <Link to="/dashboard" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg3 hover:bg-bg4 transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple to-red flex items-center justify-center text-sm font-bold">
                {profile.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-text">{profile.username}</span>
            </Link>
            <button onClick={signOut} className="btn btn-ghost text-xs py-2 px-3">
              Sair
            </button>
          </>
        ) : isAuth ? null : (
          <>
            <Link to="/termos" className="text-sm text-text3 hover:text-text px-3 py-2 hidden lg:block">
              Termos
            </Link>
            <Link to="/ajuda" className="text-sm text-text3 hover:text-text px-3 py-2 hidden lg:block">
              Ajuda
            </Link>
            <Link to="/login" className="btn btn-ghost text-sm">
              Entrar
            </Link>
            <Link to="/login" className="btn btn-primary text-sm">
              Registar
            </Link>
          </>
        )}
      </div>

      {/* Mobile toggle */}
      <button
        className="md:hidden p-2 text-text2 hover:text-text"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="absolute top-16 left-0 right-0 bg-bg2 border-b border-border md:hidden">
          <div className="flex flex-col p-4 gap-2">
            {[
              { path: '/feed', label: '📰 Feed' },
              { path: '/stories', label: '📱 Stories' },
              { path: '/arena', label: '⚔️ Arena' },
              { path: '/rankings', label: '🏆 Rankings' },
              { path: '/clas', label: '🛡️ Clãs' },
              { path: '/torneios', label: '🏅 Torneios' },
              { path: '/chat', label: '💬 Chat' },
              { path: '/search', label: '🔍 Busca' },
              { path: '/termos', label: '📄 Termos' },
              { path: '/ajuda', label: '❓ Ajuda' },
              { path: '/funcionalidades', label: '✨ Funcionalidades' },
            ].map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                className={`px-4 py-3 rounded-lg text-sm font-medium ${
                  isActive(path) ? 'text-purple2 bg-bg3' : 'text-text2'
                }`}
              >
                {label}
              </Link>
            ))}
            <div className="h-px bg-border my-2" />
            {user && profile ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-lg text-sm font-medium text-text2"
                >
                  📊 Dashboard
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-lg text-sm font-medium text-text2"
                >
                  ⚙️ Configurações
                </Link>
                {profile.is_admin && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="px-4 py-3 rounded-lg text-sm font-medium text-amber"
                  >
                    🛡️ Admin
                  </Link>
                )}
                <button
                  onClick={() => {
                    signOut();
                    setMobileOpen(false);
                  }}
                  className="px-4 py-3 rounded-lg text-sm font-medium text-red text-left"
                >
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="btn btn-ghost justify-center"
                >
                  Entrar
                </Link>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="btn btn-primary justify-center"
                >
                  Registar
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}