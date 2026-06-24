import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ChevronDown, MessageCircle, Swords, User, Crown, Gamepad2, Shield } from 'lucide-react';

const FAQS = [
  {
    question: 'Como crio um personagem?',
    answer: 'Vai a "Dashboard" e clica em "Criar Personagem". Escolhe uma classe (Ninja, Guerreiro, Mago, etc.) e personaliza o nome. Cada classe tem atributos diferentes!'
  },
  {
    question: 'Como funcionam os duelos?',
    answer: 'Na Arena, cria um duelo ou entra num desafio existente. Os duelos são automáticos com base nos atributos do personagem. Ataque, defesa, velocidade e especial influenciam o resultado.'
  },
  {
    question: 'Como ganho XP?',
    answer: 'Ganhas XP ao ganhar duelos (+50), empatar (+30), ou perder (+20). Ao acumular XP suficientes, sobes de nível e os atributos do teu personagem aumentam automaticamente.'
  },
  {
    question: 'O que são os clãs?',
    answer: 'Clãs são grupos de jogadores. Podes criar um clã (se fores admin) ou pedir para entrar num existente. Cada clã tem um líder, membros e estatísticas coletivas.'
  },
  {
    question: 'Como funciona o Chat?',
    answer: 'O chat tem salas públicas (todos podem entrar) e privadas (requer pedido de entrada). Usa @ para mencionar alguém e o emoji picker para expressões.'
  },
  {
    question: 'Como funciona o Feed?',
    answer: 'O feed é a timeline da comunidade. Podes publicar textos, imagens e vídeos. Curte, comenta e partilha posts de outros jogadores. Tudo é persistente na base de dados.'
  },
  {
    question: 'Posso apagar a minha conta?',
    answer: 'Sim. Vai a Configurações → Funcionalidades → "Apagar Conta Permanentemente". Esta ação é irreversível e apaga todos os teus dados.'
  },
  {
    question: 'Quem pode criar eventos e torneios?',
    answer: 'Apenas administradores podem criar e anunciar eventos e torneios. Se quiseres ajudar, podes pedir para ser admin nas configurações.'
  },
  {
    question: 'Como funciona o sistema de rankings?',
    answer: 'Os rankings são baseados em vitórias, nível e XP. Os melhores jogadores aparecem nos tops. Os rankings atualizam em tempo real.'
  },
  {
    question: 'A plataforma é grátis?',
    answer: 'Sim, o OtakuKamba é 100% gratuito. Feito por angolanos, para angolanos.'
  }
];

export default function HelpPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="text-sm text-text3 hover:text-text mb-6 inline-block">
          ← Voltar
        </Link>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal to-purple flex items-center justify-center text-4xl mx-auto mb-6">
            <HelpCircle className="text-white" size={40} />
          </div>
          <h1 className="font-bebas text-4xl tracking-wide text-text mb-2">
            Ajuda & <span className="text-teal">FAQ</span>
          </h1>
          <p className="text-text2">Tudo o que precisas saber sobre o OtakuKamba</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: User, label: 'Perfil', path: '/settings', color: 'text-purple' },
            { icon: Swords, label: 'Arena', path: '/arena', color: 'text-red' },
            { icon: MessageCircle, label: 'Chat', path: '/chat', color: 'text-teal' },
            { icon: Shield, label: 'Termos', path: '/termos', color: 'text-amber' },
          ].map(item => (
            <Link
              key={item.path}
              to={item.path}
              className="bg-bg2 border border-border rounded-xl p-4 text-center hover:border-purple transition-colors"
            >
              <item.icon className={`mx-auto mb-2 ${item.color}`} size={24} />
              <span className="text-sm font-medium text-text">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* FAQ */}
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className="bg-bg2 border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-bg3 transition-colors"
              >
                <span className="font-rajdhani font-bold text-text">{faq.question}</span>
                <ChevronDown
                  size={20}
                  className={`text-text3 transition-transform ${openIndex === i ? 'rotate-180' : ''}`}
                />
              </button>
              {openIndex === i && (
                <div className="px-4 pb-4 text-text2 text-sm leading-relaxed">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-10 bg-gradient-to-br from-purple/10 to-teal/10 rounded-2xl p-6 border border-purple/20 text-center">
          <h3 className="font-rajdhani font-bold text-lg text-text mb-2">Ainda tens dúvidas?</h3>
          <p className="text-sm text-text2 mb-4">
            Contacta-nos diretamente. Respondemos o mais rápido possível.
          </p>
          <a
            href="mailto:Edivaldotc16@gmail.com?subject=Ajuda OtakuKamba"
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <MessageCircle size={16} /> Enviar Email
          </a>
        </div>
      </div>
    </div>
  );
}
