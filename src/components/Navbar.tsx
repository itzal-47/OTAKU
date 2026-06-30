import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { Menu, X, Search, Zap, MessageSquare, Inbox, Quote, Image, Music, Eye, BookOpen, Trophy, Crown, Heart } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import NotificationCenter from './NotificationCenter';

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hamburgerOpen, setHamburgerOpen] = useState(false);
  const hamburgerRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => location.pathname === path;
  const isAuth = location.pathname === '/login';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (hamburgerRef.current && !hamburgerRef.current.contains(event.target as Node)) {
        setHamburgerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      <ul className="hidden lg:flex items-center gap-1 list-none">
        {[
          { path: '/feed', label: 'Feed' },
          { path: '/stories', label: 'Stories' },
          { path: '/groups', label: 'Grupos' },
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
      <div className="hidden lg:flex items-center gap-2">
        <Link to="/search" className="w-8 h-8 rounded-lg hover:bg-bg3 flex items-center justify-center transition-colors">
          <Search size={18} className="text-text2 hover:text-text" />
        </Link>

        {/* Hamburger Menu Button */}
        <div className="relative" ref={hamburgerRef}>
          <button
            onClick={() => setHamburgerOpen(!hamburgerOpen)}
            className={`w-8 h-8 rounded-lg hover:bg-bg3 flex items-center justify-center transition-colors ${hamburgerOpen ? 'bg-bg3' : ''}`}
            title="Mais secções"
          >
            <div className="flex flex-col gap-1">
              <span className={`block h-0.5 w-4 bg-text2 transition-all ${hamburgerOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
              <span className={`block h-0.5 w-4 bg-text2 transition-all ${hamburgerOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 w-4 bg-text2 transition-all ${hamburgerOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
            </div>
          </button>
          {hamburgerOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-bg2 border border-border rounded-2xl shadow-lg overflow-hidden z-50 py-2">
              <div className="px-4 py-2 text-xs text-text3 uppercase tracking-wider font-bold border-b border-border mb-2">
                Mais Secções
              </div>
              <Link
                to="/quotes"
                onClick={() => setHamburgerOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-bg3 ${isActive('/quotes') ? 'text-purple2' : 'text-text2'}`}
              >
                <Quote size={16} /> Citações Anime
              </Link>
              <Link
                to="/fanart"
                onClick={() => setHamburgerOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-bg3 ${isActive('/fanart') ? 'text-purple2' : 'text-text2'}`}
              >
                <Image size={16} /> Fan Art Gallery
              </Link>
              <Link
                to="/ost"
                onClick={() => setHamburgerOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-bg3 ${isActive('/ost') ? 'text-purple2' : 'text-text2'}`}
              >
                <Music size={16} /> Música / OST
              </Link>
              <Link
                to="/watchlist"
                onClick={() => setHamburgerOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-bg3 ${isActive('/watchlist') ? 'text-purple2' : 'text-text2'}`}
              >
                <Eye size={16} /> Anime Watchlist
              </Link>
              <Link
                to="/wiki"
                onClick={() => setHamburgerOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-bg3 ${isActive('/wiki') ? 'text-purple2' : 'text-text2'}`}
              >
                <BookOpen size={16} /> Wiki / Base
              </Link>
              <div className="border-t border-border mt-2 pt-2">
                <Link
                  to="/loja"
                  onClick={() => setHamburgerOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-bg3 ${isActive('/loja') ? 'text-purple2' : 'text-text2'}`}
                >
                  <Zap size={16} /> Loja do Kamba
                </Link>
                <Link
                  to="/guia"
                  onClick={() => setHamburgerOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-bg3 ${isActive('/guia') ? 'text-purple2' : 'text-text2'}`}
                >
                  <BookOpen size={16} /> Guia dos Kambas
                </Link>
                <Link
                  to="/fundador"
                  onClick={() => setHamburgerOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-bg3 ${isActive('/fundador') ? 'text-amber' : 'text-text2'}`}
                >
                  <Crown size={16} className="text-amber" /> FUNDADOR
                </Link>
                <Link
                  to="/conquistas"
                  onClick={() => setHamburgerOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-bg3 ${isActive('/conquistas') ? 'text-purple2' : 'text-text2'}`}
                >
                  <Trophy size={16} /> Conquistas
                </Link>
                <Link
                  to="/quests"
                  onClick={() => setHamburgerOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-bg3 ${isActive('/quests') ? 'text-purple2' : 'text-text2'}`}
                >
                  <Zap size={16} /> Missões
                </Link>
                <Link
                  to="/badges"
                  onClick={() => setHamburgerOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-bg3 ${isActive('/badges') ? 'text-purple2' : 'text-text2'}`}
                >
                  <Zap size={16} /> Badges
                </Link>
              </div>
            </div>
          )}
        </div>

        {user ? (
          <>
            <Link to="/messages" className="w-8 h-8 rounded-lg hover:bg-bg3 flex items-center justify-center transition-colors text-text2 hover:text-text" title="Mensagens">
              <MessageSquare size={18} />
            </Link>
            <NotificationCenter />
            {(profile?.is_super_admin || profile?.role === 'supreme_admin') && (
              <Link to="/inbox" className="w-8 h-8 rounded-lg hover:bg-bg3 flex items-center justify-center transition-colors text-amber" title="Inbox Admin">
                <Inbox size={18} />
              </Link>
            )}
            {(profile?.is_admin || profile?.role === 'secondary_admin' || profile?.role === 'supreme_admin') && (
              <Link to="/admin" className="btn btn-ghost text-xs py-2 px-3 text-amber">
                Admin
              </Link>
            )}
            <Link to="/settings" className="w-8 h-8 rounded-lg hover:bg-bg3 flex items-center justify-center transition-colors text-text2">
              <Zap size={18} />
            </Link>
            <Link to="/dashboard" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg3 hover:bg-bg4 transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple to-red flex items-center justify-center text-sm font-bold">
                {profile?.username ? profile.username.charAt(0).toUpperCase() : '?'}
              </div>
              <span className="text-sm font-medium text-text">{profile?.username || 'User'}</span>
            </Link>
            <button onClick={signOut} className="btn btn-ghost text-xs py-2 px-3">
              Sair
            </button>
          </>
        ) : isAuth ? null : (
          <>
            <Link to="/feedback" className="text-sm text-text3 hover:text-text px-3 py-2 hidden xl:block">
              Feedback
            </Link>
            <Link to="/termos" className="text-sm text-text3 hover:text-text px-3 py-2 hidden xl:block">
              Termos
            </Link>
            <Link to="/ajuda" className="text-sm text-text3 hover:text-text px-3 py-2 hidden xl:block">
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
        className="lg:hidden p-2 text-text2 hover:text-text"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="absolute top-16 left-0 right-0 bg-bg2 border-b border-border lg:hidden">
          <div className="flex flex-col p-4 gap-2">
            {[
              { path: '/feed', label: '📰 Feed' },
              { path: '/stories', label: '📱 Stories' },
              { path: '/groups', label: '👥 Grupos' },
              { path: '/arena', label: '⚔️ Arena' },
              { path: '/rankings', label: '🏆 Rankings' },
              { path: '/clas', label: '🛡️ Clãs' },
              { path: '/torneios', label: '🏅 Torneios' },
              { path: '/eventos', label: '📅 Eventos' },
              { path: '/chat', label: '💬 Chat' },
              { path: '/search', label: '🔍 Busca' },
              { path: '/feedback', label: '📝 Feedback' },
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
            {/* Hamburger sections on mobile */}
            <div className="px-4 py-2 text-xs text-text3 uppercase tracking-wider font-bold">
              Mais Secções
            </div>
            {[
              { path: '/quotes', label: '💬 Citações' },
              { path: '/fanart', label: '🎨 Fan Art' },
              { path: '/ost', label: '🎵 Música / OST' },
              { path: '/watchlist', label: '📺 Watchlist' },
              { path: '/wiki', label: '📚 Wiki' },
              { path: '/loja', label: '🛒 Loja do Kamba' },
              { path: '/bazar', label: '🛍️ Bazar' },
              { path: '/calendario-anime', label: '📅 Calendário Anime' },
              { path: '/guia', label: '📖 Guia dos Kambas' },
              { path: '/fundador', label: '👑 FUNDADOR' },
              { path: '/conquistas', label: '🏆 Conquistas' },
              { path: '/quests', label: '⚡ Missões' },
              { path: '/match', label: '💕 Kamba Match' },
              { path: '/badges', label: '🏅 Badges' },
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
            {user ? (
              <>
                <Link
                  to="/messages"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-lg text-sm font-medium text-text2"
                >
                  💬 Mensagens
                </Link>
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
                {(profile?.is_super_admin || profile?.role === 'supreme_admin') && (
                  <Link
                    to="/inbox"
                    onClick={() => setMobileOpen(false)}
                    className="px-4 py-3 rounded-lg text-sm font-medium text-amber"
                  >
                    📥 Inbox Admin
                  </Link>
                )}
                {(profile?.is_admin || profile?.role === 'secondary_admin' || profile?.role === 'supreme_admin') && (
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
