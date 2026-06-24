import { Link } from 'react-router-dom';
import { FileText, Shield, AlertTriangle, Heart, Users, Swords } from 'lucide-react';

export default function TermsPage() {
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
              <FileText className="text-white" size={40} />
            </div>
            <h1 className="font-bebas text-4xl tracking-wide text-text mb-2">
              Termos de <span className="text-purple2">Uso</span>
            </h1>
            <p className="text-text2">Última atualização: 2026</p>
          </div>

          {/* Terms */}
          <div className="space-y-8 text-text2 leading-relaxed">
            <section>
              <h2 className="font-rajdhani font-bold text-xl text-text mb-3 flex items-center gap-2">
                <Shield size={20} className="text-purple" /> 1. Aceitação dos Termos
              </h2>
              <p>
                Ao usar o OtakuKamba, concordas com estes termos. Se não concordares, não uses a plataforma.
                Reservamo-nos o direito de alterar estes termos a qualquer momento.
              </p>
            </section>

            <section>
              <h2 className="font-rajdhani font-bold text-xl text-text mb-3 flex items-center gap-2">
                <Users size={20} className="text-teal" /> 2. Idade e Conta
              </h2>
              <p>
                Deves ter pelo menos 13 anos para usar o OtakuKamba. És responsável por manter a segurança
da tua conta e palavra-passe. Não partilhes credenciais com ninguém.
              </p>
            </section>

            <section>
              <h2 className="font-rajdhani font-bold text-xl text-text mb-3 flex items-center gap-2">
                <AlertTriangle size={20} className="text-amber" /> 3. Conduta
              </h2>
              <p>
                Não toleramos:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Assédio, bullying ou discriminação</li>
                <li>Conteúdo sexual ou explícito</li>
                <li>Spam ou conteúdo promocional não autorizado</li>
                <li>Impersonação de outros usuários</li>
                <li>Atividades ilegais</li>
              </ul>
            </section>

            <section>
              <h2 className="font-rajdhani font-bold text-xl text-text mb-3 flex items-center gap-2">
                <Swords size={20} className="text-red" /> 4. Duelos e Arena
              </h2>
              <p>
                O sistema de duelos é para diversão. Não uses exploits ou cheats. Penalizações podem ser aplicadas
                a jogadores que tentam manipular o sistema.
              </p>
            </section>

            <section>
              <h2 className="font-rajdhani font-bold text-xl text-text mb-3 flex items-center gap-2">
                <Heart size={20} className="text-red" /> 5. Conteúdo do Utilizador
              </h2>
              <p>
                Retens os direitos sobre o conteúdo que publicas. Concedes-nos uma licença para exibir
                esse conteúdo na plataforma. Reservamo-nos o direito de remover conteúdo que viole os termos.
              </p>
            </section>

            <section>
              <h2 className="font-rajdhani font-bold text-xl text-text mb-3">6. Rescisão</h2>
              <p>
                Podemos suspender ou terminar a tua conta se violares estes termos.
                Também podes apagar a tua conta a qualquer momento nas Configurações.
              </p>
            </section>
          </div>

          {/* Footer */}
          <div className="mt-10 pt-6 border-t border-border text-center">
            <p className="text-xs text-text3">
              Dúvidas? Contacta-nos em <a href="mailto:Edivaldotc16@gmail.com" className="text-purple2 hover:underline">Edivaldotc16@gmail.com</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
