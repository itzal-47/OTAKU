import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { Quote, Share2, Heart, RefreshCw, Bookmark, Send } from 'lucide-react';

interface AnimeQuote {
  id: string;
  character: string;
  anime: string;
  quote: string;
  likes: number;
  is_favorite?: boolean;
}

const DEFAULT_QUOTES: Omit<AnimeQuote, 'id' | 'likes' | 'is_favorite'>[] = [
  { character: 'Itachi Uchiha', anime: 'Naruto', quote: 'As pessoas vivem conectadas pelas escolhas que fazem...' },
  { character: 'Goku', anime: 'Dragon Ball Z', quote: 'Eu sou o guerreiro mais forte do universo!' },
  { character: 'Madara Uchiha', anime: 'Naruto', quote: 'O mundo é cruel. Mas também muito lindo.' },
  { character: 'Monkey D. Luffy', anime: 'One Piece', quote: 'Eu vou ser o Rei dos Piratas!' },
  { character: 'Naruto Uzumaki', anime: 'Naruto', quote: 'Eu nunca vou desistir! Essa é a minha ninja way!' },
  { character: 'Levi Ackerman', anime: 'Attack on Titan', quote: 'A única maneira de vencer é lutar.' },
  { character: 'Edward Elric', anime: 'Fullmetal Alchemist', quote: 'Um corpo sem alma é igual a alma sem corpo.' },
  { character: 'Gon Freecss', anime: 'Hunter x Hunter', quote: 'Eu não vou desistir do que eu quero!' },
  { character: 'Ichigo Kurosaki', anime: 'Bleach', quote: 'Eu vou proteger todos!' },
  { character: 'Eren Yeager', anime: 'Attack on Titan', quote: 'Se você não luta, não pode ganhar.' },
  { character: 'Saitama', anime: 'One Punch Man', quote: 'Eu sou apenas um herói por diversão.' },
  { character: 'Lelouch Lamperouge', anime: 'Code Geass', quote: 'A única maneira de escapar do destino é criar um maior.' },
  { character: 'Spike Spiegel', anime: 'Cowboy Bebop', quote: 'Vou só ver com os meus olhos.' },
  { character: 'Guts', anime: 'Berserk', quote: 'Eu vou sobreviver, não importa o que aconteça.' },
  { character: 'All Might', anime: 'My Hero Academia', quote: 'Eu estou aqui!' }
];

export default function QuotesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [quotes, setQuotes] = useState<AnimeQuote[]>([]);
  const [currentQuote, setCurrentQuote] = useState<AnimeQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadQuotes();
  }, [user]);

  async function loadQuotes() {
    setLoading(true);
    try {
      // Check if quotes exist in DB
      const { data: existing } = await supabase.from('anime_quotes').select('*');
      
      if (!existing || existing.length === 0) {
        // Seed default quotes
        const { data: inserted } = await supabase.from('anime_quotes').insert(
          DEFAULT_QUOTES.map(q => ({ ...q, likes: 0 }))
        ).select();
        setQuotes(inserted || []);
      } else {
        setQuotes(existing);
      }

      if (user) {
        const { data: favs } = await supabase
          .from('favorite_quotes')
          .select('quote_id')
          .eq('user_id', user.id);
        setFavorites(new Set((favs || []).map(f => f.quote_id)));
      }
    } catch (error) {
      console.error('Error loading quotes:', error);
      setQuotes(DEFAULT_QUOTES.map((q, i) => ({ ...q, id: String(i), likes: 0 })));
    } finally {
      setLoading(false);
    }
  }

  function getRandomQuote() {
    const available = quotes.filter(q => q.id !== currentQuote?.id);
    if (available.length === 0) {
      setCurrentQuote(quotes[Math.floor(Math.random() * quotes.length)] || null);
      return;
    }
    setCurrentQuote(available[Math.floor(Math.random() * available.length)]);
  }

  useEffect(() => {
    if (quotes.length > 0 && !currentQuote) {
      getRandomQuote();
    }
  }, [quotes]);

  async function toggleFavorite(quoteId: string) {
    if (!user) {
      showToast('Entra para guardar favoritos', 'info');
      return;
    }
    try {
      if (favorites.has(quoteId)) {
        await supabase.from('favorite_quotes').delete().eq('user_id', user.id).eq('quote_id', quoteId);
        setFavorites(prev => {
          const next = new Set(prev);
          next.delete(quoteId);
          return next;
        });
      } else {
        await supabase.from('favorite_quotes').insert({ user_id: user.id, quote_id: quoteId });
        setFavorites(prev => new Set(prev).add(quoteId));
      }
    } catch {
      showToast('Erro ao atualizar favoritos', 'error');
    }
  }

  async function shareToFeed() {
    if (!currentQuote || !user) {
      showToast('Entra para partilhar', 'info');
      return;
    }
    try {
      await supabase.from('posts').insert({
        user_id: user.id,
        content: `"${currentQuote.quote}" — ${currentQuote.character} (${currentQuote.anime})`
      });
      showToast('Partilhado no feed!', 'success');
    } catch {
      showToast('Erro ao partilhar', 'error');
    }
  }

  async function copyQuote() {
    if (!currentQuote) return;
    try {
      await navigator.clipboard.writeText(`"${currentQuote.quote}" — ${currentQuote.character}`);
      showToast('Copiado!', 'success');
    } catch {
      showToast('Erro ao copiar', 'error');
    }
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="font-bebas text-4xl md:text-5xl text-text mb-3">
            Citações <span className="text-purple2">Anime</span>
          </h1>
          <p className="text-text2 max-w-lg mx-auto">
            Frases icónicas de animes que inspiram guerreiros. Descobre, partilha e guarda as tuas favoritas.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-2 border-border2 border-t-purple rounded-full animate-spin" />
          </div>
        ) : currentQuote ? (
          <div className="bg-bg2 border border-border rounded-2xl p-8 md:p-10 text-center relative overflow-hidden">
            {/* Decorative background */}
            <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
              <div className="text-[200px] absolute -top-10 -left-10">❝</div>
              <div className="text-[200px] absolute -bottom-10 -right-10">❞</div>
            </div>

            <div className="relative z-10">
              <div className="text-6xl mb-6">🎌</div>
              <blockquote className="text-xl md:text-2xl text-text font-medium leading-relaxed mb-8 italic">
                "{currentQuote.quote}"
              </blockquote>
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="font-rajdhani font-bold text-purple2">{currentQuote.character}</span>
                <span className="text-text3">·</span>
                <span className="text-sm text-text3">{currentQuote.anime}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-center gap-3 mt-8">
                <button
                  onClick={() => toggleFavorite(currentQuote.id)}
                  className={`btn btn-ghost ${favorites.has(currentQuote.id) ? 'text-red' : ''}`}
                >
                  <Heart size={18} fill={favorites.has(currentQuote.id) ? 'currentColor' : 'none'} />
                  {favorites.has(currentQuote.id) ? 'Favorito' : 'Favoritar'}
                </button>
                <button onClick={copyQuote} className="btn btn-ghost">
                  <Bookmark size={18} /> Copiar
                </button>
                <button onClick={shareToFeed} className="btn btn-ghost">
                  <Send size={18} /> Partilhar
                </button>
                <button onClick={getRandomQuote} className="btn btn-primary">
                  <RefreshCw size={18} /> Nova
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-bg2 border border-border rounded-2xl">
            <Quote size={48} className="mx-auto mb-4 text-text3" />
            <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Sem citações</h3>
          </div>
        )}

        {/* All quotes list */}
        {quotes.length > 0 && (
          <div className="mt-8">
            <h2 className="font-rajdhani font-bold text-lg text-text mb-4">Todas as Citações</h2>
            <div className="space-y-3">
              {quotes.map(q => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuote(q)}
                  className="w-full text-left bg-bg2 border border-border rounded-xl p-4 hover:border-purple/30 transition-all"
                >
                  <p className="text-sm text-text2 mb-2 line-clamp-2">"{q.quote}"</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-purple2 font-semibold">{q.character}</span>
                    <span className="text-xs text-text3">{q.anime}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
