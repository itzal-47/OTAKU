import { Link } from 'react-router-dom';
import { Home, Swords, Trophy } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center pt-16 px-4">
      <div className="text-center max-w-md">
        {/* 404 Visual */}
        <div className="relative mb-8">
          <div className="text-[150px] font-bebas leading-none text-bg3 select-none">404</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl animate-bounce">⚔️</div>
          </div>
        </div>

        <h1 className="font-bebas text-4xl tracking-wide text-text mb-4">
          Página <span className="text-red">Perdida</span>
        </h1>
        <p className="text-text2 mb-8">
          A página que procuras não foi encontrada. Talvez tenha sido derrotada na arena!
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="btn btn-primary btn-lg">
            <Home size={18} />
            Voltar ao Início
          </Link>
          <Link to="/arena" className="btn btn-danger btn-lg">
            <Swords size={18} />
            Ir para a Arena
          </Link>
        </div>

        <div className="mt-8 flex justify-center gap-4">
          <Link to="/rankings" className="text-sm text-text3 hover:text-purple2 transition-colors flex items-center gap-1">
            <Trophy size={14} />
            Rankings
          </Link>
          <Link to="/chat" className="text-sm text-text3 hover:text-teal transition-colors">
            Chat
          </Link>
          <Link to="/eventos" className="text-sm text-text3 hover:text-amber transition-colors">
            Eventos
          </Link>
        </div>
      </div>
    </div>
  );
}
