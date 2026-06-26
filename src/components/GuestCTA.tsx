import { Link } from 'react-router-dom';
import { LogIn, UserPlus, Users, Swords, Zap } from 'lucide-react';

interface GuestCTAProps {
  title?: string;
  message?: string;
}

export default function GuestCTA({
  title = "Conteúdo Exclusivo",
  message = "Faz login ou cria a tua conta agora para ouvir músicas, interagir com os Kambas e criar o teu personagem."
}: GuestCTAProps) {
  return (
    <div className="bg-gradient-to-br from-purple/10 via-bg2 to-red/10 border border-purple/20 rounded-2xl p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple to-red mx-auto mb-6 flex items-center justify-center">
        <Users className="text-white" size={32} />
      </div>

      <h3 className="font-bebas text-2xl text-text mb-3">{title}</h3>
      <p className="text-text2 text-sm mb-6 max-w-md mx-auto leading-relaxed">
        {message}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/login"
          className="btn btn-primary flex items-center justify-center gap-2 px-8"
        >
          <LogIn size={18} />
          Entrar
        </Link>
        <Link
          to="/login?register=true"
          className="btn btn-ghost border-purple/30 flex items-center justify-center gap-2 px-8"
        >
          <UserPlus size={18} />
          Registar
        </Link>
      </div>

      <div className="mt-8 pt-6 border-t border-border/50">
        <p className="text-text3 text-xs mb-3">Estes kambas já fazem parte:</p>
        <div className="flex justify-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 bg-bg3 px-3 py-1 rounded-full text-xs text-text2">
            <Swords size={12} className="text-purple" /> Guerreiros
          </span>
          <span className="inline-flex items-center gap-1 bg-bg3 px-3 py-1 rounded-full text-xs text-text2">
            <Zap size={12} className="text-amber" /> Duelos
          </span>
          <span className="inline-flex items-center gap-1 bg-bg3 px-3 py-1 rounded-full text-xs text-text2">
            <Users size={12} className="text-teal" /> Comunidade
          </span>
        </div>
      </div>
    </div>
  );
}
