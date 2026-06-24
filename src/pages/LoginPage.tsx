import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { Eye, EyeOff } from 'lucide-react';
import { CLASS_INFO, ANGOLAN_PROVINCES, type CharacterClass } from '../types/index';
import { supabase } from '../lib/supabase';

export default function LoginPage() {
  const { user, signIn, signUp } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [checkingGeo, setCheckingGeo] = useState(true);
  const [geoBlocked, setGeoBlocked] = useState(false);
  const [countryName, setCountryName] = useState('');
  const [countryFlag, setCountryFlag] = useState('');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [selectedClass, setSelectedClass] = useState<CharacterClass>('ninja');
  const [selectedProvince, setSelectedProvince] = useState('Luanda');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waitlistEmail, setWaitlistEmail] = useState('');

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    async function checkGeo() {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        const code = (data.country_code || '').toUpperCase();

        await new Promise(r => setTimeout(r, 800));

        // No bloqueio - apenas aviso se não for Angola
        setGeoBlocked(false);

        if (code !== 'AO') {
          const names: Record<string, string> = {
            BR: 'Brasil', PT: 'Portugal', MZ: 'Moçambique',
            CV: 'Cabo Verde', US: 'Estados Unidos', GB: 'Reino Unido',
            ZA: 'África do Sul'
          };
          const flags: Record<string, string> = {
            BR: '🇧🇷', PT: '🇵🇹', MZ: '🇲🇿', CV: '🇨🇻',
            US: '🇺🇸', GB: '🇬🇧', ZA: '🇿🇦'
          };
          setCountryName(names[code] || data.country_name || code);
          setCountryFlag(flags[code] || '🌐');
        }
      } catch {
        // Em caso de erro, permite acesso
        setGeoBlocked(false);
      } finally {
        setCheckingGeo(false);
      }
    }

    checkGeo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) throw error;
        showToast('Bem-vindo de volta!', 'success');
        navigate('/dashboard');
      } else {
        if (username.length < 3) {
          throw new Error('Username deve ter pelo menos 3 caracteres');
        }
        if (password.length < 8) {
          throw new Error('Palavra-passe deve ter pelo menos 8 caracteres');
        }

        // Update profile with province after signup
        const { error } = await signUp(email, password, username, selectedClass);
        if (error) throw error;

        // Wait for profile creation then update province
        setTimeout(async () => {
          const currentUser = await supabase.auth.getUser();
          if (currentUser.data.user) {
            await supabase
              .from('profiles')
              .update({ province: selectedProvince, city: selectedProvince })
              .eq('id', currentUser.data.user.id);
          }
        }, 2000);

        showToast('Conta criada! Agora cria o teu personagem.', 'success');
        navigate('/criar-personagem');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ocorreu um erro';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('waitlist').insert({
        email: waitlistEmail,
        country: countryName || 'Unknown'
      });

      if (error && !error.message.includes('unique')) throw error;

      showToast('Adicionado à lista de espera!', 'success');
      setWaitlistEmail('');
    } catch {
      showToast('Erro ao adicionar à lista', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (checkingGeo) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-16">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 rounded-full border-2 border-border2 border-t-purple mx-auto mb-6 animate-spin" />
          <div className="font-rajdhani font-bold text-lg text-text mb-2">A verificar localização</div>
          <div className="text-sm text-text3">OtakuKamba - Angola 🇦🇴</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-16 pb-10">
      {/* Kanji BG */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.025] text-[110px] font-light leading-tight break-all p-5 select-none overflow-hidden text-purple/50">
        戦闘忍者海賊死神魔法剣士悪魔竜王英雄勝利力夢希望
      </div>

      {/* Orbs */}
      <div className="fixed w-[500px] h-[500px] -top-24 -left-24 bg-purple/20 rounded-full blur-[90px] animate-float pointer-events-none" />
      <div className="fixed w-[400px] h-[400px] -bottom-24 -right-24 bg-red/18 rounded-full blur-[90px] animate-float pointer-events-none" style={{ animationDelay: '-3s' }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Geo Notice (not blocking) */}
        {countryName && !geoBlocked && (
          <div className="mb-4 bg-amber/10 border border-amber/30 rounded-xl px-4 py-3 text-sm text-amber">
            <div className="flex items-center gap-2">
              <span>{countryFlag}</span>
              <span>Localização: <strong>{countryName}</strong></span>
            </div>
            <p className="text-xs mt-1 text-amber/80">
              OtakuKamba está disponível em Angola, mas podes registar-te de qualquer lugar!
            </p>
          </div>
        )}

        <div className="bg-bg2 border border-border2 rounded-3xl p-10 md:p-12">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-teal/8 border border-teal/20 px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase text-teal mb-5">
              <span className="w-1.5 h-1.5 bg-teal rounded-full animate-blink" />
              🇦🇴 Disponível em Angola
            </div>
            <h1 className="font-bebas text-4xl tracking-wide leading-tight text-text mb-2">
              {mode === 'login' ? (
                <>Bem-vindo de<br /><span className="text-purple2">volta, Guerreiro</span></>
              ) : (
                <>Cria o teu<br /><span className="text-red">Guerreiro</span></>
              )}
            </h1>
            <p className="text-sm text-text3">
              {mode === 'login'
                ? 'Entra na tua conta e vai para a arena.'
                : 'Cria o teu guerreiro e começa do zero.'}
            </p>
          </div>

          {/* Tab Bar */}
          <div className="flex bg-bg3 rounded-xl p-1 mb-6">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === 'login'
                  ? 'bg-bg4 text-text shadow border border-border2'
                  : 'text-text3'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === 'register'
                  ? 'bg-bg4 text-text shadow border border-border2'
                  : 'text-text3'
              }`}
            >
              Criar Conta
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red/10 border border-red/30 rounded-xl px-4 py-3 text-sm text-red-400 mb-4">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Register fields */}
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold tracking-wide uppercase text-text3 mb-2">
                    Nome de Guerreiro (username)
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="ex: LuandaKing99"
                    maxLength={20}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold tracking-wide uppercase text-text3 mb-2">
                    Província
                  </label>
                  <select
                    value={selectedProvince}
                    onChange={e => setSelectedProvince(e.target.value)}
                    className="input"
                  >
                    {ANGOLAN_PROVINCES.map(prov => (
                      <option key={prov} value={prov}>{prov}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold tracking-wide uppercase text-text3 mb-2">
                    Escolhe a tua classe inicial
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(CLASS_INFO) as [CharacterClass, typeof CLASS_INFO.ninja][]).map(([key, info]) => (
                      <div
                        key={key}
                        onClick={() => setSelectedClass(key)}
                        className={`p-3 rounded-xl text-center cursor-pointer transition-all ${
                          selectedClass === key
                            ? 'bg-purple/15 border-2 border-purple shadow-lg'
                            : 'bg-bg3 border border-border2 hover:border-purple/50'
                        }`}
                      >
                        <span className="text-xl block">{info.emoji}</span>
                        <span className="text-[11px] font-medium text-text2">{info.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold tracking-wide uppercase text-text3 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="o_teu@email.com"
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-wide uppercase text-text3 mb-2">
                Palavra-passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text3 hover:text-text2 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {mode === 'register' && (
                <p className="text-[10px] text-text3 mt-1">Mínimo 8 caracteres</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`btn ${mode === 'login' ? 'btn-primary' : 'btn-danger'} btn-lg justify-center mt-4 ${loading ? 'opacity-70 cursor-wait' : ''}`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === 'login' ? 'A entrar...' : 'A criar...'}
                </span>
              ) : mode === 'login' ? (
                '⚔️ Entrar na Arena'
              ) : (
                '🔥 Criar Conta'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6 text-xs text-text3">
            <div className="flex-1 h-px bg-border" />
            ou continua com
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Social Logins */}
          <div className="flex gap-3">
            <button
              onClick={async () => {
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: { redirectTo: `${window.location.origin}/dashboard` }
                });
                if (error) showToast('Erro ao conectar com Google', 'error');
              }}
              className="btn btn-ghost flex-1 justify-center"
            >
              🔵 Google
            </button>
            <button
              onClick={async () => {
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: 'discord',
                  options: { redirectTo: `${window.location.origin}/dashboard` }
                });
                if (error) showToast('Erro ao conectar com Discord', 'error');
              }}
              className="btn btn-ghost flex-1 justify-center"
            >
              🟣 Discord
            </button>
          </div>

          {/* Switch prompt */}
          <p className="text-center text-sm text-text3 mt-6">
            {mode === 'login' ? (
              <>
                Não tens conta?{' '}
                <button onClick={() => setMode('register')} className="text-purple2 font-semibold hover:underline">
                  Cria uma agora
                </button>
              </>
            ) : (
              <>
                Já tens conta?{' '}
                <button onClick={() => setMode('login')} className="text-purple2 font-semibold hover:underline">
                  Entra aqui
                </button>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-text3">
          🇦🇴 Disponível em Angola (brevemente para o mundo)
        </div>
      </div>
    </div>
  );
}
