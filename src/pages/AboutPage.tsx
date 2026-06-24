import { Link } from 'react-router-dom';
import { Heart, Mail, Phone, MapPin, Swords } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="text-sm text-text3 hover:text-text mb-6 inline-block">
          ← Voltar
        </Link>

        <div className="bg-bg2 border border-border rounded-2xl p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple to-red flex items-center justify-center text-4xl mx-auto mb-6">
              ⚔️
            </div>
            <h1 className="font-bebas text-4xl tracking-wide text-text mb-2">
              Sobre o <span className="text-purple2">OtakuKamba</span>
            </h1>
            <p className="text-text2">A plataforma otaku de Angola</p>
          </div>

          {/* Story */}
          <div className="prose prose-invert max-w-none mb-10">
            <p className="text-text2 leading-relaxed">
              O <strong className="text-text">OtakuKamba</strong> nasceu da paixão pela cultura anime e pelas comunidades geek de Angola.
              É uma plataforma feita por um angolano, para angolanos — um espaço onde podes duelar, conversar, e conectar com outros otakus.
            </p>
            <p className="text-text2 leading-relaxed mt-4">
              Aqui podes criar o teu personagem baseado em animes populares, desafiar outros jogadores em duelos em tempo real,
              participar em eventos da comunidade, e muito mais. Tudo gratuito, tudo em português, tudo feito com amor.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { icon: Swords, label: 'Duelos RPG', desc: 'Batalhas em tempo real' },
              { icon: '💬', label: 'Chat', desc: 'Comunidade ao vivo' },
              { icon: '🏆', label: 'Rankings', desc: 'Seja o campeão' },
              { icon: '📅', label: 'Eventos', desc: 'Meetups e watch parties' },
            ].map((item, i) => (
              <div key={i} className="bg-bg3 rounded-xl p-4 text-center border border-border">
                <div className="text-2xl mb-2">
                  {typeof item.icon === 'string' ? item.icon : <item.icon className="mx-auto text-purple" size={24} />}
                </div>
                <div className="font-rajdhani font-bold text-text text-sm">{item.label}</div>
                <div className="text-xs text-text3">{item.desc}</div>
              </div>
            ))}
          </div>

          {/* Creator */}
          <div className="bg-bg3 rounded-xl p-6 border border-border mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple to-red flex items-center justify-center text-2xl">
                👨‍💻
              </div>
              <div>
                <h3 className="font-rajdhani font-bold text-lg text-text">Criador</h3>
                <p className="text-sm text-text2">Desenvolvido independentemente</p>
              </div>
            </div>
            <p className="text-text3 text-sm leading-relaxed">
              O OtakuKamba é um projeto independente, desenvolvido com muito carinho para a comunidade otaku angolana.
              Todas as sugestões e feedbacks são bem-vindos!
            </p>
          </div>

          {/* Contact */}
          <div className="bg-gradient-to-br from-purple/10 to-red/10 rounded-xl p-6 border border-purple/20">
            <h3 className="font-rajdhani font-bold text-lg text-text mb-4 flex items-center gap-2">
              <Mail size={20} className="text-purple" />
              Contacto
            </h3>
            <div className="space-y-3">
              <a
                href="mailto:Edivaldotc16@gmail.com?subject=Contacto OtakuKamba"
                className="flex items-center gap-3 p-3 bg-bg/50 rounded-lg hover:bg-bg/80 transition-colors"
              >
                <Mail size={18} className="text-teal" />
                <span className="text-sm text-text">Edivaldotc16@gmail.com</span>
              </a>
              <a
                href="tel:+244973900858"
                className="flex items-center gap-3 p-3 bg-bg/50 rounded-lg hover:bg-bg/80 transition-colors"
              >
                <Phone size={18} className="text-teal" />
                <span className="text-sm text-text">+244 973900858</span>
              </a>
              <div className="flex items-center gap-3 p-3 bg-bg/50 rounded-lg">
                <MapPin size={18} className="text-purple" />
                <span className="text-sm text-text">Huambo, Angola</span>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-text3">
              Feito com <Heart size={12} className="inline text-red mx-1" /> no Huambo, Angola
            </p>
            <p className="text-xs text-text3 mt-1">
              © 2026 OtakuKamba
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
