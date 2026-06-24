import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { supabase } from '../lib/supabase';
import { CLASS_INFO, type CharacterClass } from '../types/index';

export default function CreateCharacterPage() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'name' | 'class' | 'confirm'>('name');
  const [name, setName] = useState('');
  const [selectedClass, setSelectedClass] = useState<CharacterClass>('ninja');

  const classInfo = CLASS_INFO[selectedClass];

  const handleCreate = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Check if already has a character
    const { data: existingChar } = await supabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingChar) {
      showToast('Já tens um personagem!', 'error');
      navigate('/dashboard');
      return;
    }

    if (name.length < 3) {
      showToast('Nome deve ter pelo menos 3 caracteres', 'error');
      return;
    }

    setLoading(true);

    try {
      const baseStats = {
        ninja: { hp: 800, attack: 75, defense: 50, speed: 90, special: 85 },
        pirata: { hp: 1000, attack: 90, defense: 70, speed: 60, special: 80 },
        shinigami: { hp: 750, attack: 80, defense: 45, speed: 70, special: 95 },
        cavaleiro: { hp: 850, attack: 70, defense: 80, speed: 75, special: 70 },
        cacador: { hp: 700, attack: 85, defense: 55, speed: 95, special: 80 },
        tita: { hp: 1200, attack: 95, defense: 90, speed: 40, special: 60 },
      };

      const stats = baseStats[selectedClass];

      const { error: insertError } = await supabase.from('characters').insert({
        user_id: user.id,
        name,
        class: selectedClass,
        level: 1,
        xp: 0,
        hp: stats.hp,
        max_hp: stats.hp,
        attack: stats.attack,
        defense: stats.defense,
        speed: stats.speed,
        special: stats.special,
        wins: 0,
        losses: 0,
        draws: 0,
      });

      if (insertError) throw insertError;

      showToast('Personagem criado com sucesso!', 'success');
      navigate('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar personagem';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16 px-4">
        <div className="text-center">
          <h1 className="font-bebas text-4xl text-text mb-4">Precisas de uma conta</h1>
          <Link to="/login" className="btn btn-primary btn-lg">Entrar</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center pt-16 px-4">
      {/* Kanji BG */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.025] text-[110px] font-light leading-tight break-all p-5 select-none overflow-hidden text-purple/50">
        戦闘忍者海賊死神魔法剣士悪魔竜王英雄勝利力夢希望
      </div>

      <div className="relative z-10 w-full max-w-xl">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['name', 'class', 'confirm'].map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 max-w-32 rounded-full transition-all ${
                step === s || (step === 'name' ? false : i < ['name', 'class', 'confirm'].indexOf(step))
                  ? 'bg-purple'
                  : 'bg-bg3'
              }`}
            />
          ))}
        </div>

        <div className="bg-bg2 border border-border rounded-3xl p-10">
          {/* Step 1: Name */}
          {step === 'name' && (
            <div className="text-center">
              <div className="text-5xl mb-6">⚔️</div>
              <h1 className="font-bebas text-4xl tracking-wide text-text mb-2">
                Dá um nome ao teu Guerreiro
              </h1>
              <p className="text-text2 mb-8">Este nome será usado na arena e nos rankings.</p>

              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="ex: Mbemba99"
                maxLength={25}
                className="input text-center text-lg py-4 mb-6"
              />

              <button
                onClick={() => name.length >= 3 && setStep('class')}
                disabled={name.length < 3}
                className="btn btn-primary btn-lg w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            </div>
          )}

          {/* Step 2: Class */}
          {step === 'class' && (
            <div>
              <div className="text-center mb-8">
                <h1 className="font-bebas text-4xl tracking-wide text-text mb-2">
                  Escolhe a tua <span className="text-purple2">classe</span>
                </h1>
                <p className="text-text2">Cada classe tem habilidades inspiradas em animes.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {(Object.entries(CLASS_INFO) as [CharacterClass, typeof CLASS_INFO.ninja][]).map(([key, info]) => (
                  <div
                    key={key}
                    onClick={() => setSelectedClass(key)}
                    className={`p-4 rounded-xl text-center cursor-pointer transition-all ${
                      selectedClass === key
                        ? 'bg-purple/15 border-2 border-purple shadow-lg shadow-purple/20'
                        : 'bg-bg3 border border-border hover:border-purple/50'
                    }`}
                  >
                    <span className="text-3xl block mb-2">{info.emoji}</span>
                    <div className="font-rajdhani font-bold text-text">{info.name}</div>
                    <div className="text-[10px] text-text3 mt-1">{info.anime}</div>
                  </div>
                ))}
              </div>

              <div className="bg-bg3 rounded-xl p-4 mb-6 border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{classInfo.emoji}</span>
                  <div>
                    <div className="font-rajdhani font-bold text-text">{classInfo.name}</div>
                    <div className="text-xs text-text3">{classInfo.anime}</div>
                  </div>
                </div>
                <p className="text-sm text-text2">{classInfo.description}</p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('name')} className="btn btn-ghost flex-1 justify-center">
                  Voltar
                </button>
                <button onClick={() => setStep('confirm')} className="btn btn-primary flex-1 justify-center">
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && (
            <div className="text-center">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple to-red flex items-center justify-center text-5xl mx-auto mb-6">
                {classInfo.emoji}
              </div>

              <h1 className="font-bebas text-4xl tracking-wide text-text mb-2">
                {name}
              </h1>
              <p className="text-text2 mb-8">
                {classInfo.name} · Nível 1 · {classInfo.anime}
              </p>

              <div className="bg-bg3 rounded-xl p-4 mb-6 border border-border text-left">
                <div className="text-xs uppercase tracking-wider text-text3 mb-2">Atributos Base</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {(() => {
                    const baseStats = {
                      ninja: { hp: 800, attack: 75, defense: 50, speed: 90, special: 85 },
                      pirata: { hp: 1000, attack: 90, defense: 70, speed: 60, special: 80 },
                      shinigami: { hp: 750, attack: 80, defense: 45, speed: 70, special: 95 },
                      cavaleiro: { hp: 850, attack: 70, defense: 80, speed: 75, special: 70 },
                      cacador: { hp: 700, attack: 85, defense: 55, speed: 95, special: 80 },
                      tita: { hp: 1200, attack: 95, defense: 90, speed: 40, special: 60 },
                    };
                    const stats = baseStats[selectedClass];
                    return (
                      <>
                        <div><span className="text-text3">HP:</span> <span className="text-teal font-bold">{stats.hp}</span></div>
                        <div><span className="text-text3">ATK:</span> <span className="text-red font-bold">{stats.attack}</span></div>
                        <div><span className="text-text3">DEF:</span> <span className="text-purple font-bold">{stats.defense}</span></div>
                        <div><span className="text-text3">SPD:</span> <span className="text-amber font-bold">{stats.speed}</span></div>
                        <div><span className="text-text3">SPC:</span> <span className="text-purple2 font-bold">{stats.special}</span></div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('class')} className="btn btn-ghost flex-1 justify-center">
                  Voltar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="btn btn-danger flex-1 justify-center disabled:opacity-70"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      A criar...
                    </span>
                  ) : (
                    'Criar Personagem'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
