import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import {
  Book, ChevronRight, ChevronDown, Swords, Users, Trophy,
  Shield, Star, Zap, Gift, MessageCircle, Calendar, Target,
  ShoppingBag, Award, Crown, Lock, HelpCircle, ExternalLink,
  Flame, Heart, Sparkles, MapPin, TrendingUp, Coins
} from 'lucide-react';

interface GuideSection {
  id: string;
  title: string;
  icon: any;
  description: string;
  content: {
    question: string;
    answer: string;
    tips?: string[];
  }[];
}

const guideSections: GuideSection[] = [
  {
    id: 'getting-started',
    title: 'Primeiros Passos',
    icon: Target,
    description: 'Começa a tua aventura no OtakuKamba',
    content: [
      {
        question: 'Como criar uma conta?',
        answer: 'Visita a página de Login, clica em "Criar Conta", preenche o teu email, username, província e classe desejada. Confirmarás o link no teu email e depois já podes criar o teu personagem!',
        tips: [
          'Escolhe um username único que te represente',
          'A provínciaServe para mostrar de onde és no ranking local',
          'Podes usar login social com Google ou Discord'
        ]
      },
      {
        question: 'Como criar o meu personagem?',
        answer: 'Após criar a conta, vais automaticamente para a página "Criar Personagem". Escolhe a tua classe, o nome do personagem e personaliza os atributos. Cada classe tem stats diferentes!',
        tips: [
          'Ninjas: rápidos e esquivos',
          'Piratas: equilibrados e resistentes',
          'Espadachins: força bruta e ataque alto',
          'Magos: especiais poderosos',
          'Demónios: devastadores mas frágeis',
          'Saiyans: transformações e poder explosivo'
        ]
      },
      {
        question: 'O que é o XP e como ganho?',
        answer: 'XP (Experiência) serve para subir de nível o teu personagem. Ganhas XP ao participar em duelos, completar missões, fazer contribuições no clã e outras atividades.',
        tips: [
          'Vitórias em duelos dão 50-100 XP',
          'Missões diárias dão 10-50 XP',
          'Contribuições no clã dão XP extra',
          'Primeiro login do dia dá bónus!'
        ]
      }
    ]
  },
  {
    id: 'arena',
    title: 'Arena de Duelos',
    icon: Swords,
    description: 'Luta e sobe no ranking',
    content: [
      {
        question: 'Como funciona a arena?',
        answer: 'A Arena é onde desafias outros jogadores para duelos 1v1. O sistema calcula o resultado baseado nos teus atributos, nível e uma pitada de sorte. Ganhar dá XP e melhora o teu ranking.',
        tips: [
          'Desafia jogadores do teu nível para chances justas',
          'Verifica os stats do oponente antes de desafiar',
          'Derrotas também ensinam - não desistas!'
        ]
      },
      {
        question: 'O que são as classes de personagem?',
        answer: 'Cada classe tem atributos únicos baseados em animes famosos. Ninjas (Naruto), Piratas (One Piece), Espadachins (Bleach), Magos (Fairy Tail), Demónios (Kimetsu), Saiyans (Dragon Ball).',
        tips: [
          'Escolhe a que mais te identifica',
          'Podes ter múltiplos personagens no futuro',
          'Cada classe tem habilidades especiais desbloqueáveis'
        ]
      },
      {
        question: 'Como funcionam os rankings?',
        answer: 'O ranking é dividido por nacional, provincial e global. Quanto mais duelos ganhares, mais sobes. Os top jogadores recebem Badges especiais e XP bónus.',
        tips: [
          'Rankings são actualizados em tempo real',
          'Sessões de ranque dão XP extra',
          'Os top 10 de cada província aparecem em destaque'
        ]
      }
    ]
  },
  {
    id: 'clans',
    title: 'Clãs (Guildas)',
    icon: Shield,
    description: 'Une-te a outros guerreiros',
    content: [
      {
        question: 'O que são clãs?',
        answer: 'Clãs são grupos de jogadores que se unem para colaborar, competir juntos e subir no ranking de clãs. Cada clã tem um líder, officers e membros.',
        tips: [
          'Membros contribuem com XP para o clã',
          'Clãs aparecem na "Lista de Clãs Lendários" semanal',
          'Sê activo para subir de nível no clã'
        ]
      },
      {
        question: 'Como entrar num clã?',
        answer: 'Navega para a página de Clãs, encontra um clã que aceite novos membros e clica em "Pedir Entrada". O líder ou officer vai analisar e aceitar/rejeitar.',
        tips: [
          'Alguns clãs têm nível mínimo',
          'Escreve uma mensagem de entrada convincente',
          'Só podes pertencer a um clã de cada vez'
        ]
      },
      {
        question: 'O que são contribuições?',
        answer: 'Contribuições são XP que doas ao teu clã ao completar actividades. Duelos, missões e eventos dão contribuições automáticas. O clã com mais contribuições semanais lidera o ranking!',
        tips: [
          'Contribuições ajudam o clã a subir de nível',
          'O nível do clã dá bónus a todos os membros',
          'Novos membros trazem 50 XP iniciais'
        ]
      }
    ]
  },
  {
    id: 'shop',
    title: 'Loja do Kamba',
    icon: ShoppingBag,
    description: 'Gasta o teu XP em itens especiais',
    content: [
      {
        question: 'O que posso comprar na loja?',
        answer: 'Na Loja do Kamba podes comprar consumíveis (poções), cosméticos (bordas, títulos, auras) e boosts (XP dobrado temporário). Cada item custa XP do teu personagem.',
        tips: [
          'Poções de HP: recuperam vida instantaneamente',
          'Títulos: mostram ao público o teu status',
          'Boosts: temporários mas poderosos',
          'Guarda XP para items lendários!'
        ]
      },
      {
        question: 'Como funciona o inventário?',
        answer: 'Após comprar, os itens ficam no teu inventário. Cosméticos podem ser equipados para mostrar no perfil. Consumíveis ficam guardados até usares.',
        tips: [
          'Cosméticos podem ser equipados/desequipados',
          'Algumas raridades são limitadas',
          'Items consumíveis usam-se em duelos'
        ]
      },
      {
        question: 'Quais são as raridades?',
        answer: 'Itens têm raridades: Comum (cinza), Raro (azul), Épico (roxo) e Lendário (dourado). Lendários são mais caros mas têm efeitos únicos.',
        tips: [
          'Lendários são raros e caros',
          'Épicos têm excelente custo-benefício',
          'Raros são bons para iniciantes'
        ]
      }
    ]
  },
  {
    id: 'social',
    title: 'Social e Comunidade',
    icon: Users,
    description: 'Conecta com outros otakus',
    content: [
      {
        question: 'Como funciona o chat?',
        answer: 'O chat tem salas por anime e um chat geral. Podes falar em tempo real com outros otakus, partilhar opiniões e conhecer novos amigos.',
        tips: [
          'Sê respeitoso com todos',
          'Salas específicas têm discussões focadas',
          'Podes criar salas privadas com amigos'
        ]
      },
      {
        question: 'O que são Stories e Posts?',
        answer: 'Stories são fotos/vídeos que expiram em 24h. Posts ficam permanentemente no teu perfil. Ambos podem receber likes e comentários.',
        tips: [
          'Stories aparecem na barra superior',
          'Posts demonstram a tua criatividade',
          'Partilha memes, fanart e pensamentos'
        ]
      },
      {
        question: 'Como seguir outras pessoas?',
        answer: 'Visita o perfil de alguém e clica em "Seguir". Passas a ver os posts dela no teu feed. Quem te segue aparece no teu perfil.',
        tips: [
          'Seguir de volta mostra cortesia',
          'O número de seguidores conta para rankings',
          'Podes bloquear utilizadores problemáticos'
        ]
      }
    ]
  },
  {
    id: 'events',
    title: 'Eventos e Torneios',
    icon: Calendar,
    description: 'Competições épicas',
    content: [
      {
        question: 'O que são eventos?',
        answer: 'Eventos são actividades especiais organizadas pela equipa ou por publishers. Incluem torneios, festas temáticas e competições com prémios.',
        tips: [
          'Alguns eventos dão XP bónus',
          'Torneios têm brackets eliminatorios',
          'Participar dá badges exclusivos'
        ]
      },
      {
        question: 'Como participar de um torneio?',
        answer: 'Navega para Torneios, encontra um aberto para inscrição e clica em "Inscrever". Torneios têm níveis mínimos e vagas limitadas.',
        tips: [
          'Lê as regras antes de entrar',
          'Prepara teu personagem para competir',
          'Prémios incluem XP, títulos e itens'
        ]
      }
    ]
  },
  {
    id: 'badges',
    title: 'Badges e Conquistas',
    icon: Award,
    description: 'Colecciona títulos e prémios',
    content: [
      {
        question: 'O que são Badges?',
        answer: 'Badges são conquistas visíveis no teu perfil. Demonstram feitos como "Primeiro Duelo", "Top Provincial", "Membro Ativo".',
        tips: [
          'Primeiro Duelo: ganha o teu primeiro duelo',
          'Veterano: 100 dias activo',
          'Lenda Provincial: top da tua província',
          'Clã Lendário: membro de clã top 5'
        ]
      },
      {
        question: 'Como desbloquear badges?',
        answer: 'Cada badge tem requisitos específicos. Badges automáticos são dados ao completar o feito, outros requerem nomeação da equipa.',
        tips: [
          'Participa activamente para ganhar',
          'Badges raras são guardadas',
          'Podes escolher quais mostrar no perfil'
        ]
      }
    ]
  },
  {
    id: 'quests',
    title: 'Missões (Quests)',
    icon: Target,
    description: 'Objectivos diários e semanais',
    content: [
      {
        question: 'O que são missões?',
        answer: 'Missões são objectivos que dão XP ao completar. Há missões diárias, semanais e especiais de eventos.',
        tips: [
          'Missões diárias: 10-30 XP cada',
          'Missões semanais: 50-100 XP cada',
          'Completa todas para XP máximo!',
          'Exemplos: "Ganha 3 duelos", "Faz 5 posts"'
        ]
      },
      {
        question: 'Como completar missões?',
        answer: 'Visita a página de Missões para ver as disponíveis. Ao completar uma tarefa, o sistema detecta automaticamente e dá o XP.',
        tips: [
          'Verifica missões antes de jogar',
          'Algumas missões são progressivas',
          'Eventos trazem missões especiais'
        ]
      }
    ]
  },
  {
    id: 'tips',
    title: 'Dicas Avançadas',
    icon: Sparkles,
    description: 'Torna-te um mestre',
    content: [
      {
        question: 'Como subir de nível rápido?',
        answer: 'Combina duelos, missões diárias e contribuições no clã. Faz login todos os dias para o bónus. Usa boosts da loja sabiamente.',
        tips: [
          'Prioriza missões diárias primeiro',
          'Duelos contra jogadores do teu nível',
          'Events dão multiplicadores de XP',
          'Contribui para o clã regularmente'
        ]
      },
      {
        question: 'Estratégias de combate?',
        answer: 'Conhece tua classe! Ninjas usam velocidade, Saiyans força bruta, Magos especiais. Estuda teus oponentes antes de desafiar.',
        tips: [
          'Não negligencies defesa',
          'Equilibra os teus atributos',
          'Usa consumíveis estrategicamente',
          'Observa os stats do oponente'
        ]
      },
      {
        question: 'Economia de XP',
        answer: 'Não gastes todo o XP na loja. Guarda para items que realmente precises. Poções são úteis apenas em sequências de duelos.',
        tips: [
          'Guarda XP para items épicos/lendários',
          'Só compra poções se duelares muito',
          'Cosméticos são vaidade - compra por diversão'
        ]
      }
    ]
  }
];

export default function GuidePage() {
  const { user } = useAuth();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSections = guideSections.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.content.some(c =>
      c.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-teal/10 border border-teal/30 px-4 py-2 rounded-full text-xs font-semibold text-teal mb-4">
            <Book size={14} />
            Tutorial Completo
          </div>
          <h1 className="font-bebas text-5xl text-text mb-3">Guia dos Kambas</h1>
          <p className="text-text3 max-w-lg mx-auto">
            Aprende tudo sobre o OtakuKamba: como jogar, subir de nível, criar clãs, duelos e muito mais.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <HelpCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-text3" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Pesquisar no guia..."
            className="input pl-12 w-full"
          />
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { label: 'Primeiros Passos', icon: Target, id: 'getting-started' },
            { label: 'Arena', icon: Swords, id: 'arena' },
            { label: 'Clãs', icon: Shield, id: 'clans' },
            { label: 'Loja', icon: ShoppingBag, id: 'shop' },
          ].map(link => (
            <button
              key={link.id}
              onClick={() => setExpandedSection(link.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bg2 border border-border text-sm text-text2 hover:text-text hover:border-purple/50 transition-all"
            >
              <link.icon size={14} />
              {link.label}
            </button>
          ))}
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {filteredSections.map(section => (
            <div
              key={section.id}
              className="bg-bg2 border border-border rounded-2xl overflow-hidden"
            >
              {/* Section Header */}
              <button
                onClick={() => setExpandedSection(
                  expandedSection === section.id ? null : section.id
                )}
                className="w-full flex items-center justify-between p-5 hover:bg-bg3/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple/10 flex items-center justify-center">
                    <section.icon className="text-purple" size={24} />
                  </div>
                  <div className="text-left">
                    <h2 className="font-rajdhani font-bold text-lg text-text">{section.title}</h2>
                    <p className="text-xs text-text3">{section.description}</p>
                  </div>
                </div>
                <ChevronRight
                  className={`text-text3 transition-transform ${
                    expandedSection === section.id ? 'rotate-90' : ''
                  }`}
                  size={20}
                />
              </button>

              {/* Section Content */}
              {expandedSection === section.id && (
                <div className="px-5 pb-5 space-y-3">
                  {section.content.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-bg3 rounded-xl overflow-hidden"
                    >
                      {/* Question Header */}
                      <button
                        onClick={() => setExpandedQuestion(
                          expandedQuestion === `${section.id}-${idx}` ? null : `${section.id}-${idx}`
                        )}
                        className="w-full flex items-center justify-between p-4 hover:bg-bg/50 transition-colors"
                      >
                        <span className="font-semibold text-text text-sm text-left">{item.question}</span>
                        <ChevronDown
                          className={`text-text3 transition-transform ${
                            expandedQuestion === `${section.id}-${idx}` ? 'rotate-180' : ''
                          }`}
                          size={16}
                        />
                      </button>

                      {/* Answer */}
                      {expandedQuestion === `${section.id}-${idx}` && (
                        <div className="px-4 pb-4">
                          <p className="text-text2 text-sm leading-relaxed mb-3">{item.answer}</p>

                          {/* Tips */}
                          {item.tips && (
                            <div className="bg-teal/10 border border-teal/20 rounded-xl p-3">
                              <div className="flex items-center gap-2 text-teal text-xs font-semibold mb-2">
                                <Sparkles size={12} />
                                Dicas
                              </div>
                              <ul className="space-y-1">
                                {item.tips.map((tip, tipIdx) => (
                                  <li key={tipIdx} className="text-xs text-text2 flex items-start gap-2">
                                    <span className="text-teal mt-0.5">*</span>
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Need More Help */}
        <div className="mt-8 bg-bg2 border border-border rounded-2xl p-6 text-center">
          <HelpCircle className="mx-auto text-purple mb-3" size={32} />
          <h3 className="font-rajdhani font-bold text-lg text-text mb-2">Precisas de mais ajuda?</h3>
          <p className="text-text3 text-sm mb-4">
            Se tiveres dúvidas ou sugestões, contacta a equipa ou visita a página de Feedback.
          </p>
          <div className="flex justify-center gap-3">
            <Link to="/feedback" className="btn btn-ghost flex items-center gap-2">
              <MessageCircle size={16} />
              Enviar Feedback
            </Link>
            <Link to="/ajuda" className="btn btn-ghost flex items-center gap-2">
              <HelpCircle size={16} />
              Central de Ajuda
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Swords, label: '6 Classes', value: 'Ninja a Saiyan' },
            { icon: MapPin, label: '18 Províncias', value: 'Todas de Angola' },
            { icon: Shield, label: 'Clãs', value: 'Colabora em grupo' },
            { icon: Gift, label: 'Loja', value: 'Itens com XP' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-bg2 border border-border rounded-xl p-4 text-center">
              <stat.icon className="mx-auto text-purple mb-2" size={20} />
              <div className="font-rajdhani font-bold text-text text-sm">{stat.label}</div>
              <div className="text-xs text-text3">{stat.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
