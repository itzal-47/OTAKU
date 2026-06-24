import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { CLASS_INFO, type CharacterClass } from '../types/index';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import StoriesBar from '../components/StoriesBar';

interface Stats {
  warriors: number;
  duels: number;
  online: number;
}

export default function HomePage() {
  const { user, character } = useAuth();
  const [stats, setStats] = useState<Stats>({ warriors: 0, duels: 0, online: 0 });

  useEffect(() => {
    async function loadStats() {
      try {
        const [{ count: warriors }, { count: duels }] = await Promise.all([
          supabase.from('characters').select('*', { count: 'exact', head: true }),
          supabase.from('duels').select('*', { count: 'exact', head: true })
        ]);

        setStats({
          warriors: warriors || 0,
          duels: duels || 0,
          online: 0 // Would need realtime presence for this
        });
      } catch {
        // Ignore errors for stats
      }
    }
    loadStats();
  }, []);

  return (
    <div className="relative overflow-hidden">
      {/* Kanji Background */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.025] font-japanese text-[120px] font-light leading-tight break-all p-5 select-none overflow-hidden text-purple/50">
        戦闘忍者海賊死神魔法剣士悪魔竜王英雄勝利力夢希望戦闘忍者海賊死神魔法剣士悪魔竜王英雄勝利力夢希望
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        {/* Orbs */}
        <div className="absolute w-[500px] h-[500px] -top-24 -left-24 bg-purple/25 rounded-full blur-[80px] animate-float" />
        <div className="absolute w-[400px] h-[400px] top-24 -right-24 bg-red/20 rounded-full blur-[80px] animate-float" style={{ animationDelay: '-3s' }} />
        <div className="absolute w-[350px] h-[350px] -bottom-12 left-[30%] bg-teal/15 rounded-full blur-[80px] animate-float" style={{ animationDelay: '-5s' }} />

        {/* Aura Rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          {[400, 600, 800, 1000].map((size, i) => (
            <div
              key={size}
              className="absolute w-[400px] h-[400px] rounded-full border animate-aura-pulse opacity-0"
              style={{
                width: size,
                height: size,
                borderColor: i === 0 ? 'rgba(123,92,240,0.4)' : i === 1 ? 'rgba(233,69,96,0.25)' : i === 2 ? 'rgba(0,212,170,0.15)' : 'rgba(123,92,240,0.08)',
                animationDelay: `${i}s`
              }}
            />
          ))}
        </div>

        <div className="relative z-10 text-center px-6 max-w-4xl">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 font-rajdhani text-xs font-semibold tracking-wider uppercase text-teal bg-teal/8 border border-teal/20 px-4 py-2 rounded-full mb-7 animate-fade-up">
            <span className="w-1.5 h-1.5 bg-teal rounded-full animate-blink" />
            🇦🇴 A comunidade otaku de Angola
          </div>

          {/* Title */}
          <h1 className="font-bebas text-[80px] md:text-[140px] leading-none tracking-wider mb-2 animate-fade-up animate-delay-100">
            <span className="block text-text">Otaku</span>
            <span className="block text-gradient">Kamba</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-text2 max-w-xl mx-auto mb-10 leading-relaxed animate-fade-up animate-delay-200">
            Duelos RPG em tempo real, chat por anime, rankings nacionais e muito mais.
            <br /><strong className="text-text">Feito por angolano, para angolanos.</strong>
          </p>

          {/* CTA */}
          <div className="flex flex-wrap justify-center gap-3 mb-16 animate-fade-up animate-delay-300">
            {user && character ? (
              <>
                <Link to="/arena" className="btn btn-danger btn-lg">⚔️ Entrar na Arena</Link>
                <Link to="/dashboard" className="btn btn-ghost btn-lg">Ver Meu Perfil</Link>
              </>
            ) : user ? (
              <>
                <Link to="/criar-personagem" className="btn btn-danger btn-lg">🎭 Criar Personagem</Link>
                <Link to="/login" className="btn btn-ghost btn-lg">Continuar</Link>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-danger btn-lg">⚔️ Entrar na Arena</Link>
                <Link to="/login" className="btn btn-ghost btn-lg">Explorar o site</Link>
              </>
            )}
          </div>

          {/* Stats - Real Data */}
          <div className="flex justify-center border border-border rounded-2xl bg-white/2 backdrop-blur-sm overflow-hidden max-w-lg mx-auto animate-fade-up animate-delay-400">
            {[
              { num: stats.warriors || '0', label: 'Guerreiros', live: true },
              { num: stats.duels || '0', label: 'Duelos', live: true },
              { num: '🇦🇴', label: 'Angola', live: false },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`flex-1 py-5 px-6 text-center ${i < 2 ? 'border-r border-border' : ''}`}
              >
                <div className="font-bebas text-3xl tracking-wide text-text">
                  {stat.num}
                </div>
                <div className="text-[11px] text-text3 uppercase tracking-wider mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll Hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-text3 text-[11px] tracking-wider uppercase animate-bounce">
          scroll
          <div className="w-px h-10 bg-gradient-to-b from-text3 to-transparent" />
        </div>
      </section>

      {/* Stories Bar */}
      <div className="relative z-10 bg-bg border-b border-border">
        <StoriesBar />
      </div>

      {/* Features Strip */}
      <div className="relative z-10 py-6 border-t border-b border-border bg-bg2">
        <div className="flex gap-2 justify-center overflow-x-auto px-4 no-scrollbar">
          {[
            { icon: '⚔️', label: 'Duelo RPG ao Vivo', path: '/arena' },
            { icon: '🏆', label: 'Rankings Nacionais', path: '/rankings' },
            { icon: '💬', label: 'Chat em Tempo Real', path: '/chat' },
            { icon: '🎭', label: 'Classes de Personagem', path: '/criar-personagem' },
            { icon: '📅', label: 'Eventos', path: '/eventos' },
          ].map(({ icon, label, path }) => (
            <Link
              key={label}
              to={path}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-border2 bg-bg3 text-sm font-medium text-text2 hover:border-purple hover:text-text hover:bg-purple/10 hover:-translate-y-0.5 transition-all whitespace-nowrap"
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Arena Section */}
      <section id="arena" className="bg-bg2 border-t border-b border-border">
        <div className="section-inner">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Arena Visual */}
            <div className="relative h-[420px] bg-bg3 rounded-2xl border border-border overflow-hidden flex items-center justify-center">
              <div className="absolute w-[300px] h-[300px] bg-red/20 rounded-full blur-[60px] animate-[arena-glow_3s_ease-in-out_infinite]" />

              <div className="relative z-10 flex items-center gap-8 px-4">
                {/* Fighter 1 */}
                <div className="w-[140px] bg-bg4 rounded-2xl border border-border2 p-5 text-center hover:scale-[1.04] transition-transform">
                  <div className="w-16 h-16 rounded-full bg-purple/15 border-2 border-purple flex items-center justify-center text-3xl mx-auto mb-3">🥷</div>
                  <div className="font-rajdhani font-bold text-text">Cria o teu</div>
                  <div className="text-[11px] text-text3 uppercase tracking-wider mb-2">Personagem</div>
                  <div className="text-[11px] text-text3 mb-1">E entra na arena</div>
                  <div className="h-1 bg-bg rounded overflow-hidden">
                    <div className="h-full w-full bg-gradient-to-r from-purple to-red rounded" />
                  </div>
                </div>

                {/* VS */}
                <div className="font-bebas text-5xl text-amber drop-shadow-[0_0_20px_rgba(245,166,35,0.5)]">VS</div>

                {/* Fighter 2 */}
                <div className="w-[140px] bg-bg4 rounded-2xl border border-border2 p-5 text-center hover:scale-[1.04] transition-transform">
                  <div className="w-16 h-16 rounded-full bg-red/15 border-2 border-red flex items-center justify-center text-3xl mx-auto mb-3">🏴‍☠️</div>
                  <div className="font-rajdhani font-bold text-text">Desafia</div>
                  <div className="text-[11px] text-text3 uppercase tracking-wider mb-2">Guerreiros</div>
                  <div className="text-[11px] text-text3 mb-1">Em Angola</div>
                  <div className="h-1 bg-bg rounded overflow-hidden">
                    <div className="h-full w-full bg-gradient-to-r from-red to-purple rounded" />
                  </div>
                </div>
              </div>

              {/* Skill Badges */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                <span className="px-3 py-1 rounded-md text-[11px] font-rajdhani font-semibold bg-purple/20 text-purple2 border border-purple/30">Tempo Real</span>
                <span className="px-3 py-1 rounded-md text-[11px] font-rajdhani font-semibold bg-teal/15 text-teal border border-teal/25">Rankings</span>
                <span className="px-3 py-1 rounded-md text-[11px] font-rajdhani font-semibold bg-red/20 text-red border border-red/30">XP</span>
              </div>
            </div>

            {/* Arena Content */}
            <div>
              <div className="section-label">Arena de Duelo</div>
              <h2 className="section-title mb-4">
                Luta pelo <span className="text-red">título</span>
              </h2>
              <p className="text-text2 leading-relaxed mb-6 max-w-md">
                Escolhe a tua classe, aprende os movimentos e enfrenta outros guerreiros angolanos. Ganha XP, sobe de nível e domina o ranking nacional.
              </p>
              <ul className="flex flex-col gap-2.5 mb-8 list-none">
                {[
                  'Duelos 1v1 em tempo real',
                  '6 classes com habilidades únicas de animes reais',
                  'Sistema de XP, níveis e títulos nacionais',
                  'Ranking por província — quem domina a tua região?',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-text2">
                    <span className="w-1.5 h-1.5 bg-teal rounded-full flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3">
                <Link to="/arena" className="btn btn-danger btn-lg">⚔️ Entrar na Arena</Link>
                <Link to="/rankings" className="btn btn-ghost">Ver Rankings</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Classes Section */}
      <section id="classes">
        <div className="section-inner">
          <div className="flex flex-wrap justify-between items-end gap-5 mb-10">
            <div>
              <div className="section-label">Escolhe o teu destino</div>
              <h2 className="section-title">Classes de Personagem</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {(Object.entries(CLASS_INFO) as [CharacterClass, typeof CLASS_INFO.ninja][]).map(([key, info]) => (
              <div
                key={key}
                className="card card-hover p-6 text-center group"
                style={{
                  ['--card-border' as string]: `rgba(var(--color-${info.color}), 0.5)`,
                }}
              >
                <span className="text-4xl mb-3 block">{info.emoji}</span>
                <div className="font-rajdhani font-bold text-text">{info.name}</div>
                <div className="text-[11px] text-text3 mt-1 mb-2">{info.description}</div>
                <span
                  className="inline-block text-[10px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full mt-2"
                  style={{
                    background: `rgba(var(--color-${info.color}-rgb), 0.15)`,
                    color: `var(--color-${info.color})`
                  }}
                >
                  {info.anime}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section id="comunidade">
        <div className="section-inner">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="section-label">Komunidade</div>
              <h2 className="section-title mb-4">
                Chat em<br />Tempo Real
              </h2>
              <p className="text-text2 leading-relaxed mb-7 max-w-md">
                Salas dedicadas por anime. Fala directamente com outros otakus angolanos, partilha opiniões e cria grupos de amigos para duelos.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/chat" className="btn btn-teal">💬 Entrar no Chat</Link>
                <Link to="/rankings" className="btn btn-ghost">Ver Rankings</Link>
              </div>
            </div>

            {/* Chat Preview */}
            <div className="bg-bg3 border border-border rounded-2xl overflow-hidden max-w-md">
              <div className="px-5 py-4 bg-bg4 border-b border-border flex items-center gap-2.5">
                <span className="w-2 h-2 bg-teal rounded-full animate-blink" />
                <span className="font-rajdhani font-semibold text-sm text-text"># geral</span>
                <span className="ml-auto text-xs text-text3">Chat ao vivo</span>
              </div>
              <div className="p-4 text-center">
                <p className="text-text3 text-sm py-8">
                  Entra no chat e fala com outros otakus!
                </p>
                <Link to="/chat" className="btn btn-primary text-sm">
                  💬 Abrir Chat
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-gradient-to-br from-purple/15 via-bg to-red/10 border-t border-b border-border">
        <div className="section-inner text-center">
          <h2 className="font-bebas text-5xl md:text-7xl tracking-wide leading-none mb-4">
            Pronto para a <span className="text-red">batalha</span>?
          </h2>
          <p className="text-text2 max-w-xl mx-auto mb-8">
            Cria o teu personagem, escolhe a tua classe e entra na arena. Angola tem um novo campeão por descobrir.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to={user ? '/criar-personagem' : '/login'} className="btn btn-primary btn-lg">🎭 Criar Personagem</Link>
            <Link to="/arena" className="btn btn-danger btn-lg">⚔️ Ir para a Arena</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
