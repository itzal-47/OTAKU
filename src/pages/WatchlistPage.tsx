import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { Plus, Trash2, Check, Clock, Star, Play, Eye, Search } from 'lucide-react';

interface WatchlistItem {
  id: string;
  anime_title: string;
  status: 'watching' | 'completed' | 'planned' | 'dropped';
  rating: number | null;
  episodes_watched: number;
  total_episodes: number | null;
  notes: string | null;
  created_at: string;
}

export default function WatchlistPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newAnime, setNewAnime] = useState({
    title: '',
    total_episodes: '',
    status: 'watching' as const
  });
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    if (user) loadItems();
    else setLoading(false);
  }, [user]);

  async function loadItems() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  }

  async function addItem() {
    if (!user || !newAnime.title.trim()) return;
    try {
      await supabase.from('watchlist').insert({
        user_id: user.id,
        anime_title: newAnime.title.trim(),
        status: newAnime.status,
        total_episodes: newAnime.total_episodes ? parseInt(newAnime.total_episodes) : null,
        episodes_watched: 0
      });
      showToast('Anime adicionado!', 'success');
      setNewAnime({ title: '', total_episodes: '', status: 'watching' });
      setShowAdd(false);
      loadItems();
    } catch {
      showToast('Erro ao adicionar', 'error');
    }
  }

  async function updateStatus(id: string, status: WatchlistItem['status']) {
    await supabase.from('watchlist').update({ status }).eq('id', id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
  }

  async function updateRating(id: string, rating: number) {
    await supabase.from('watchlist').update({ rating }).eq('id', id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, rating } : i));
  }

  async function updateEpisodes(id: string, episodes: number) {
    await supabase.from('watchlist').update({ episodes_watched: episodes }).eq('id', id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, episodes_watched: episodes } : i));
  }

  async function deleteItem(id: string) {
    if (!confirm('Tens certeza?')) return;
    await supabase.from('watchlist').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
    showToast('Removido', 'info');
  }

  const filtered = activeFilter === 'all'
    ? items
    : items.filter(i => i.status === activeFilter);

  const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
    watching: { label: 'A Ver', color: 'text-teal', icon: Play },
    completed: { label: 'Completo', color: 'text-purple', icon: Check },
    planned: { label: 'Planeado', color: 'text-amber', icon: Clock },
    dropped: { label: 'Abandonado', color: 'text-red', icon: Trash2 }
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-bebas text-3xl md:text-4xl text-text mb-1">
              Watchlist <span className="text-purple2">Anime</span>
            </h1>
            <p className="text-text2 text-sm">Organiza os animes que estás a ver.</p>
          </div>
          {user && (
            <button onClick={() => setShowAdd(true)} className="btn btn-primary text-sm">
              <Plus size={16} /> Adicionar
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'watching', 'completed', 'planned', 'dropped'].map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeFilter === filter
                  ? 'bg-purple/20 text-purple2 border border-purple/30'
                  : 'text-text3 hover:text-text hover:bg-bg3'
              }`}
            >
              {filter === 'all' ? 'Todos' : statusLabels[filter]?.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-2 border-border2 border-t-purple rounded-full animate-spin" />
          </div>
        ) : !user ? (
          <div className="text-center py-12 bg-bg2 border border-border rounded-2xl">
            <Eye size={48} className="mx-auto mb-4 text-text3" />
            <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Entra para ver a watchlist</h3>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-bg2 border border-border rounded-2xl">
            <Search size={48} className="mx-auto mb-4 text-text3" />
            <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Lista vazia</h3>
            <p className="text-text3 text-sm mb-4">Adiciona o teu primeiro anime!</p>
            <button onClick={() => setShowAdd(true)} className="btn btn-primary">
              <Plus size={16} /> Adicionar Anime
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => {
              const status = statusLabels[item.status];
              return (
                <div key={item.id} className="bg-bg2 border border-border rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-rajdhani font-bold text-text">{item.anime_title}</h3>
                        <span className={`text-xs font-semibold ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-text3 mb-2">
                        <span>{item.episodes_watched} / {item.total_episodes || '?'} eps</span>
                        {item.rating && (
                          <span className="flex items-center gap-1 text-amber">
                            <Star size={12} fill="currentColor" /> {item.rating}/10
                          </span>
                        )}
                      </div>
                      {/* Progress bar */}
                      <div className="h-1.5 bg-bg3 rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full bg-purple rounded-full"
                          style={{
                            width: item.total_episodes
                              ? `${Math.min((item.episodes_watched / item.total_episodes) * 100, 100)}%`
                              : '0%'
                          }}
                        />
                      </div>
                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        <select
                          value={item.status}
                          onChange={e => updateStatus(item.id, e.target.value as WatchlistItem['status'])}
                          className="bg-bg3 border border-border rounded-lg px-2 py-1 text-xs text-text"
                        >
                          <option value="watching">A Ver</option>
                          <option value="completed">Completo</option>
                          <option value="planned">Planeado</option>
                          <option value="dropped">Abandonado</option>
                        </select>
                        <input
                          type="number"
                          value={item.episodes_watched}
                          onChange={e => updateEpisodes(item.id, parseInt(e.target.value) || 0)}
                          className="w-16 bg-bg3 border border-border rounded-lg px-2 py-1 text-xs text-text"
                          min={0}
                        />
                        <select
                          value={item.rating || ''}
                          onChange={e => updateRating(item.id, parseInt(e.target.value) || 0)}
                          className="bg-bg3 border border-border rounded-lg px-2 py-1 text-xs text-text"
                        >
                          <option value="">Nota</option>
                          {[1,2,3,4,5,6,7,8,9,10].map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="text-red hover:opacity-80 ml-auto"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add modal */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-bg2 border border-border rounded-2xl p-6 w-full max-w-md">
              <h2 className="font-rajdhani font-bold text-lg text-text mb-4">Adicionar Anime</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-text3 mb-1">Título do Anime</label>
                  <input
                    value={newAnime.title}
                    onChange={e => setNewAnime({ ...newAnime, title: e.target.value })}
                    placeholder="ex: Attack on Titan"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text3 mb-1">Total de Episódios</label>
                  <input
                    type="number"
                    value={newAnime.total_episodes}
                    onChange={e => setNewAnime({ ...newAnime, total_episodes: e.target.value })}
                    placeholder="ex: 24"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text3 mb-1">Status</label>
                  <select
                    value={newAnime.status}
                    onChange={e => setNewAnime({ ...newAnime, status: e.target.value as any })}
                    className="input w-full"
                  >
                    <option value="watching">A Ver</option>
                    <option value="planned">Planeado</option>
                    <option value="completed">Completo</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowAdd(false)} className="btn btn-ghost flex-1">Cancelar</button>
                  <button onClick={addItem} className="btn btn-primary flex-1">Adicionar</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
