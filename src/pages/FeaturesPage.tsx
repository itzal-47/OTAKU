import { Link } from 'react-router-dom';
import { Zap, Swords, MessageCircle, Users, Trophy, Gamepad2, Heart, Image, Video, Globe } from 'lucide-react';

const FEATURES = [
  {
    icon: Swords,
    title: 'Arena de Duelos',
    description: 'Desafia outros otakus em batalhas automáticas baseadas nos atributos do teu personagem. Sistema de XP, níveis e rankings.',
    path: '/arena',
    color: 'from-red to-amber'
  },
  {
    icon: MessageCircle,
    title: 'Chat ao Vivo',
    description: 'Salas de chat públicas e privadas. Menciona outros utilizadores com @, usa emojis, e pede entrada em salas privadas.',
    path: '/chat',
    color: 'from-teal to-purple'
  },
  {
    icon: Image,
    title: 'Feed da Comunidade',
    description: 'Publica textos, imagens e vídeos. Curte, comenta e partilha posts. Perfis clicáveis com links diretos.',
    path: '/feed',
    color: 'from-purple to-red'
  },
  {
    icon: Video,
    title: 'Stories',
    description: 'Partilha momentos com stories de imagem e vídeo que expiram em 24h. Upload direto para o Supabase Storage.',
    path: '/stories',
    color: 'from-amber to-red'
  },
  {
    icon: Users,
    title: 'Clãs',
    description: 'Cria ou junta-te a clãs. Cada clã tem um líder, membros e estatísticas. Apenas admins podem criar clãs.',
    path: '/clas',
    color: 'from-teal to-amber'
  },
  {
    icon: Trophy,
    title: 'Torneios',
    description: 'Compete em torneios oficiais. Apenas admins podem criar e anunciar torneios. Inscrição e bracketing automático.',
    path: '/torneios',
    color: 'from-amber to-purple'
  },
  {
    icon: Gamepad2,
    title: 'Personagens RPG',
    description: 'Cria o teu personagem com classes únicas (Ninja, Guerreiro, Mago, etc.). Cada classe tem atributos e emojis especiais.',
    path: '/criar-personagem',
    color: 'from-purple to-teal'
  },
  {
    icon: Heart,
    title: 'Sistema de Seguidores',
    description: 'Segue outros jogadores, vê a atividade deles no feed e acompanha o crescimento da comunidade.',
    path: '/search',
    color: 'from-red to-purple'
  },
  {
    icon: Globe,
    title: '100% Gratuito',
    description: 'O OtakuKamba é totalmente gratuito. Feito por angolanos, para angolanos. Sem pagamentos, sem anúncios intrusivos.',
    path: '/',
    color: 'from-teal to-red'
  }
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-sm text-text3 hover:text-text mb-6 inline-block">
          ← Voltar
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple to-red flex items-center justify-center text-4xl mx-auto mb-6">
            <Zap className="text-white" size={40} />
          </div>
          <h1 className="font-bebas text-4xl md:text-5xl tracking-wide text-text mb-2">
            Funcionalidades do <span className="text-purple2">OtakuKamba</span>
          </h1>
          <p className="text-text2 max-w-xl mx-auto">
            Uma plataforma completa para a comunidade otaku angolana. Duelos, chat, comunidade e muito mais.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature, i) => (
            <Link
              key={i}
              to={feature.path}
              className="bg-bg2 border border-border rounded-2xl p-6 hover:border-purple/40 transition-all group"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
                <feature.icon className="text-white" size={28} />
              </div>
              <h3 className="font-rajdhani font-bold text-lg text-text mb-2">{feature.title}</h3>
              <p className="text-sm text-text2 leading-relaxed">{feature.description}</p>
            </Link>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mt-12 bg-gradient-to-br from-purple/10 to-red/10 rounded-2xl p-8 border border-purple/20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { label: 'Duelos Realizados', value: 'Automáticos' },
              { label: 'Salas de Chat', value: 'Públicas + Privadas' },
              { label: 'Classes', value: '5+ Únicas' },
              { label: 'Preço', value: '100% Gratuito' },
            ].map((stat, i) => (
              <div key={i}>
                <div className="font-rajdhani font-bold text-2xl text-purple2">{stat.value}</div>
                <div className="text-xs text-text3 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <h3 className="font-rajdhani font-bold text-xl text-text mb-4">Pronto para começar?</h3>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/login" className="btn btn-primary">
              Criar Conta
            </Link>
            <Link to="/arena" className="btn btn-ghost">
              Explorar Arena
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
