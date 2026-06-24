import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="text-sm text-text3 hover:text-text mb-6 inline-block">
          ← Voltar
        </Link>

        <div className="bg-bg2 border border-border rounded-2xl p-8 md:p-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-purple/15 flex items-center justify-center">
              <Shield className="text-purple" size={24} />
            </div>
            <div>
              <h1 className="font-bebas text-3xl text-text">Política de Privacidade</h1>
              <p className="text-xs text-text3">Última atualização: Junho 2026</p>
            </div>
          </div>

          <div className="prose prose-invert max-w-none space-y-6">
            <section>
              <h2 className="font-rajdhani font-bold text-lg text-text mb-3">1. Informações que Recolhemos</h2>
              <p className="text-text2 text-sm leading-relaxed">
                O OtakuKamba recolhe apenas as informações necessárias para o funcionamento da plataforma:
              </p>
              <ul className="text-text2 text-sm leading-relaxed mt-2 list-disc pl-5 space-y-1">
                <li>Dados de registo: email, username, província</li>
                <li>Dados do personagem: nome, classe, estatísticas de jogo</li>
                <li>Atividade: duelos, mensagens no chat, participações em eventos</li>
                <li>Dados técnicos: endereço IP (para fins de localização)</li>
              </ul>
            </section>

            <section>
              <h2 className="font-rajdhani font-bold text-lg text-text mb-3">2. Como Usamos os Dados</h2>
              <p className="text-text2 text-sm leading-relaxed">
                Os seus dados são utilizados exclusivamente para:
              </p>
              <ul className="text-text2 text-sm leading-relaxed mt-2 list-disc pl-5 space-y-1">
                <li>Funcionamento do sistema de duelos e rankings</li>
                <li>Comunicação sobre eventos e atualizações</li>
                <li>Exibição do seu perfil e estatísticas públicas</li>
                <li>Melhoria da experiência do utilizador</li>
              </ul>
            </section>

            <section>
              <h2 className="font-rajdhani font-bold text-lg text-text mb-3">3. Partilha de Dados</h2>
              <p className="text-text2 text-sm leading-relaxed">
                O OtakuKamba <strong className="text-text">não partilha</strong> os seus dados com terceiros.
                Os seus dados de jogo (ranking, duelos, nome de personagem) são públicos dentro da plataforma.
                O seu email e informações de contacto são mantidos privados.
              </p>
            </section>

            <section>
              <h2 className="font-rajdhani font-bold text-lg text-text mb-3">4. Segurança</h2>
              <p className="text-text2 text-sm leading-relaxed">
                Implementamos medidas de segurança para proteger os seus dados, incluindo:
                encriptação de dados em trânsito, autenticação segura via Supabase,
                e políticas de Row Level Security na base de dados.
              </p>
            </section>

            <section>
              <h2 className="font-rajdhani font-bold text-lg text-text mb-3">5. Os Seus Direitos</h2>
              <p className="text-text2 text-sm leading-relaxed">
                Tem o direito de:
              </p>
              <ul className="text-text2 text-sm leading-relaxed mt-2 list-disc pl-5 space-y-1">
                <li>Aceder aos seus dados pessoais</li>
                <li>Corrigir dados incorretos</li>
                <li>Eliminar a sua conta e todos os dados associados</li>
                <li>Exportar os seus dados</li>
              </ul>
            </section>

            <section>
              <h2 className="font-rajdhani font-bold text-lg text-text mb-3">6. Cookies</h2>
              <p className="text-text2 text-sm leading-relaxed">
                O OtakuKamba utiliza cookies técnicos essenciais para manter a sua sessão ativa.
                Não utilizamos cookies de rastreamento ou publicidade.
              </p>
            </section>

            <section>
              <h2 className="font-rajdhani font-bold text-lg text-text mb-3">7. Menores de Idade</h2>
              <p className="text-text2 text-sm leading-relaxed">
                O OtakuKamba é destinado a utilizadores com 13 anos ou mais.
                Não recolhemos intencionalmente dados de menores de 13 anos.
              </p>
            </section>

            <section>
              <h2 className="font-rajdhani font-bold text-lg text-text mb-3">8. Contacto</h2>
              <p className="text-text2 text-sm leading-relaxed">
                Para questões sobre privacidade ou para exercer os seus direitos, contacte-nos:
              </p>
              <div className="mt-3 bg-bg3 rounded-xl p-4 border border-border">
                <p className="text-sm text-text2">
                  <strong className="text-text">Email:</strong>{' '}
                  <a href="mailto:Edivaldotc16@gmail.com" className="text-teal hover:underline">
                    Edivaldotc16@gmail.com
                  </a>
                </p>
                <p className="text-sm text-text2 mt-1">
                  <strong className="text-text">Telefone:</strong>{' '}
                  <a href="tel:+244973900858" className="text-teal hover:underline">
                    +244 973900858
                  </a>
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
