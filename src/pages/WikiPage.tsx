import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { Book, Search, Plus, X, ChevronRight, Tag, User, Globe, Star, Edit3 } from 'lucide-react';

interface WikiEntry {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  tags: string[];
  created_by: string;
  created_at: string;
  profiles?: { username: string };
}

const DEFAULT_ENTRIES = [
  {
    title: 'Naruto Uzumaki',
    slug: 'naruto-uzumaki',
    content: 'Naruto Uzumaki é o protagonista da série Naruto. É um ninja de Konoha que sonha em se tornar Hokage. Ele carrega a Raposa de Nove Caudas (Kurama) dentro de si.',
    category: 'character',
    tags: ['naruto', 'ninja', 'konoha']
  },
  {
    title: 'Goku',
    slug: 'goku',
    content: 'Son Goku é o protagonista de Dragon Ball. É um Saiyajin criado na Terra que defende o planeta de ameaças extraterrestres. Conhecido por sua força incrível e personalidade alegre.',
    category: 'character',
    tags: ['dragon-ball', 'saiyan', 'guerreiro']
  },
  {
    title: 'Chakra',
    slug: 'chakra',
    content: 'Chakra é a energia essencial utilizada por ninjas em Naruto. É composto por energia física e energia espiritual. Existem vários tipos de chakra e transformações de natureza.',
    category: 'concept',
    tags: ['naruto', 'poder', 'ninja']
  },
  {
    title: 'Devil Fruits',
    slug: 'devil-fruits',
    content: 'Devil Fruits são frutas místicas em One Piece que dão poderes especiais ao consumidor. Existem três tipos: Paramecia, Zoan e Logia. O consumidor perde a habilidade de nadar.',
    category: 'concept',
    tags: ['one-piece', 'poder', 'fruta']
  },
  {
    title: 'Titan Shifters',
    slug: 'titan-shifters',
    content: 'Titan Shifters são humanos em Attack on Titan que podem transformar-se em titãs. Os nove titãs principais são: Founding, Attack, Colossal, Armored, Female, Beast, Jaw, Cart e War Hammer.',
    category: 'concept',
    tags: ['attack-on-titan', 'titan', 'poder']
  },
  {
    title: 'Anime em Angola',
    slug: 'anime-em-angola',
    content: 'A cultura anime está a crescer em Angola! Com eventos, grupos de fãs e comunidades online, os otakus angolanos estão cada vez mais unidos. OtakuKamba é a primeira plataforma dedicada a esta comunidade.',
    category: 'community',
    tags: ['angola', 'comunidade', 'eventos']
  }
];

export default function WikiPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [entries, setEntries] = useState<WikiEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedEntry, setSelectedEntry] = useState<WikiEntry | null>(null);
  const [newEntry, setNewEntry] = useState({ title: '', content: '', category: 'character', tags: '' });

  useEffect(() => {
    loadEntries();
  }, []);

  async function loadEntries() {
    setLoading(true);
    try {
      const { data: existing } = await supabase.from('wiki_entries').select('*');

      if (!existing || existing.length === 0) {
        const { data: inserted } = await supabase.from('wiki_entries').insert(
          DEFAULT_ENTRIES.map(e => ({ ...e, created_by: user?.id || null }))
        ).select();
        setEntries(inserted || []);
      } else {
        setEntries(existing);
      }
    } catch (error) {
      console.error('Error loading wiki:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addEntry() {
    if (!user || !newEntry.title.trim() || !newEntry.content.trim()) {
      showToast('Preenche todos os campos', 'error');
      return;
    }
    try {
      const slug = newEntry.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      await supabase.from('wiki_entries').insert({
        title: newEntry.title.trim(),
        slug: slug + '-' + Date.now(),
        content: newEntry.content.trim(),
        category: newEntry.category,
        tags: newEntry.tags.split(',').map(t => t.trim()).filter(Boolean),
        created_by: user.id
      });
      showToast('Entrada adicionada!', 'success');
      setNewEntry({ title: '', content: '', category: 'character', tags: '' });
      setShowAdd(false);
      loadEntries();
    } catch {
      showToast('Erro ao adicionar', 'error');
    }
  }

  const filtered = entries.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.content.toLowerCase().includes(search.toLowerCase()) ||
      e.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = activeCategory === 'all' || e.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: 'all', label: 'Todas', icon: Book },
    { id: 'character', label: 'Personagens', icon: User },
    { id: 'concept', label: 'Conceitos', icon: Star },
    { id: 'community', label: 'Comunidade', icon: Globe }
  ];

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-bebas text-3xl md:text-4xl text-text mb-1">
              Wiki <span className="text-purple2">Anime</span>
            </h1>
            <p className="text-text2 text-sm">Conhecimento, lore e guias da comunidade.</p>
          </div>
          {user && (
            <button onClick={() => setShowAdd(true)} className="btn btn-primary text-sm">
              <Plus size={16} /> Adicionar
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text3" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Procurar na wiki..."
            className="input w-full pl-11"
          />
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-purple/20 text-purple2 border border-purple/30'
                  : 'text-text3 hover:text-text hover:bg-bg3'
              }`}
            >
              <cat.icon size={14} />
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-2 border-border2 border-t-purple rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-bg2 border border-border rounded-2xl">
            <Book size={48} className="mx-auto mb-4 text-text3" />
            <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Sem resultados</h3>
            <p className="text-text3 text-sm">Tenta outra pesquisa ou adiciona uma entrada.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(entry => (
              <button
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className="w-full text-left bg-bg2 border border-border rounded-2xl p-4 hover:border-purple/30 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-rajdhani font-bold text-text">{entry.title}</h3>
                    <p className="text-sm text-text3 line-clamp-2 mt-1">{entry.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {entry.tags.map(tag => (
                        <span key={tag} className="text-xs text-purple2 bg-purple/10 px-2 py-0.5 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-text3 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {selectedEntry && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-bg2 border border-border rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bebas text-3xl text-text">{selectedEntry.title}</h2>
                <button onClick={() => setSelectedEntry(null)} className="text-text3 hover:text-text">
                  <X size={24} />
                </button>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-purple2 bg-purple/10 px-2 py-1 rounded-full capitalize">
                  {selectedEntry.category}
                </span>
                {selectedEntry.tags.map(tag => (
                  <span key={tag} className="text-xs text-teal bg-teal/10 px-2 py-1 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
              <p className="text-text2 leading-relaxed whitespace-pre-wrap">{selectedEntry.content}</p>
            </div>
          </div>
        )}

        {/* Add Modal */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-bg2 border border-border rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-rajdhani font-bold text-lg text-text">Adicionar Entrada</h2>
                <button onClick={() => setShowAdd(false)}><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div><label className="block text-xs text-text3 mb-1">Título</label>
                  <input value={newEntry.title} onChange={e => setNewEntry({ ...newEntry, title: e.target.value })} className="input w-full" placeholder="Título" />
                </div>
                <div><label className="block text-xs text-text3 mb-1">Categoria</label>
                  <select value={newEntry.category} onChange={e => setNewEntry({ ...newEntry, category: e.target.value })} className="input w-full">
                    <option value="character">Personagem</option>
                    <option value="concept">Conceito</option>
                    <option value="community">Comunidade</option>
                    <option value="guide">Guia</option>
                  </select>
                </div>
                <div><label className="block text-xs text-text3 mb-1">Conteúdo</label>
                  <textarea value={newEntry.content} onChange={e => setNewEntry({ ...newEntry, content: e.target.value })} className="input w-full min-h-[120px]" placeholder="Conteúdo da entrada..." />
                </div>
                <div><label className="block text-xs text-text3 mb-1">Tags (separadas por vírgula)</label>
                  <input value={newEntry.tags} onChange={e => setNewEntry({ ...newEntry, tags: e.target.value })} className="input w-full" placeholder="naruto, ninja, konoha" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowAdd(false)} className="btn btn-ghost flex-1">Cancelar</button>
                  <button onClick={addEntry} className="btn btn-primary flex-1">Adicionar</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
