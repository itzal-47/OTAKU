import { Link } from 'react-router-dom';
import { Instagram, Youtube, MessageCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative z-10 bg-bg2 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 md:px-10 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="font-bebas text-2xl tracking-wide text-text mb-3">
              Otaku<span className="text-purple2">Kamba</span>
            </div>
            <p className="text-sm text-text3 leading-relaxed mb-5 max-w-xs">
              A plataforma otaku feita por angolano, para angolanos. Duelos, comunidade, anime e muito mais.
            </p>
            <div className="flex gap-2">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-bg3 border border-border2 flex items-center justify-center text-text3 hover:border-purple hover:text-purple-400 transition-colors"
              >
                <Instagram size={18} />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-bg3 border border-border2 flex items-center justify-center text-text3 hover:border-red hover:text-red-400 transition-colors"
              >
                <Youtube size={18} />
              </a>
              <a
                href="https://wa.me/244973900858"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-bg3 border border-border2 flex items-center justify-center text-text3 hover:border-teal hover:text-teal-400 transition-colors"
              >
                <MessageCircle size={18} />
              </a>
            </div>
          </div>

          {/* Plataforma */}
          <div>
            <h4 className="font-rajdhani font-semibold text-sm uppercase tracking-wide text-text mb-4">
              Plataforma
            </h4>
            <ul className="flex flex-col gap-3">
              {[
                { path: '/arena', label: 'Arena de Duelo' },
                { path: '/rankings', label: 'Rankings' },
                { path: '/chat', label: 'Chat ao Vivo' },
                { path: '/eventos', label: 'Eventos' },
              ].map(({ path, label }) => (
                <li key={path}>
                  <Link
                    to={path}
                    className="text-sm text-text3 hover:text-text2 transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Comunidade */}
          <div>
            <h4 className="font-rajdhani font-semibold text-sm uppercase tracking-wide text-text mb-4">
              Comunidade
            </h4>
            <ul className="flex flex-col gap-3">
              {[
                { label: 'Fórum', path: '#' },
                { label: 'Cosplayers', path: '#' },
                { label: 'Watch Parties', path: '#' },
                { label: 'Grupos de Anime', path: '#' },
              ].map(({ path, label }) => (
                <li key={label}>
                  <Link
                    to={path}
                    className="text-sm text-text3 hover:text-text2 transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Sobre */}
          <div>
            <h4 className="font-rajdhani font-semibold text-sm uppercase tracking-wide text-text mb-4">
              Sobre
            </h4>
            <ul className="flex flex-col gap-3">
              <li>
                <Link to="/sobre" className="text-sm text-text3 hover:text-text2 transition-colors">
                  Sobre nós
                </Link>
              </li>
              <li>
                <a href="mailto:Edivaldotc16@gmail.com?subject=Contacto OtakuKamba" className="text-sm text-text3 hover:text-text2 transition-colors">
                  Edivaldotc16@gmail.com
                </a>
              </li>
              <li>
                <a href="tel:+244973900858" className="text-sm text-text3 hover:text-text2 transition-colors">
                  +244 973900858
                </a>
              </li>
              <li>
                <Link to="/privacidade" className="text-sm text-text3 hover:text-text2 transition-colors">
                  Privacidade
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text3">
            © 2026 OtakuKamba · Feito com <span className="text-red">♥</span> no Huambo, Angola
          </p>
          <div className="flex gap-2 flex-wrap justify-center">
            <span className="text-[10px] px-3 py-1 rounded-full bg-bg3 border border-border text-text3">
              🇦🇴 Angola
            </span>
            <span className="text-[10px] px-3 py-1 rounded-full bg-bg3 border border-border text-text3">
              ⚔️ RPG
            </span>
            <span className="text-[10px] px-3 py-1 rounded-full bg-bg3 border border-border text-text3">
              🎌 Anime
            </span>
            <span className="text-[10px] px-3 py-1 rounded-full bg-bg3 border border-border text-text3">
              🆓 100% Gratuito
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
