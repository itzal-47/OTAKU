import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { Link } from 'react-router-dom';

interface Group {
  id: string;
  name: string;
  description: string;
  avatar_url: string;
  banner_url: string;
  privacy_type: 'public' | 'private' | 'secret';
  category: string;
  rules: string;
  member_count: number;
  post_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

const CATEGORIES = ['Todos', 'anime', 'gaming', 'memes', 'music', 'art', 'general', 'tecnologia', 'esportes', 'filmes', 'literatura'];

export default function GroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [memberships, setMemberships] = useState<Record<string, GroupMember>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    privacy_type: 'public' as 'public' | 'private' | 'secret',
    category: 'general',
    rules: '',
  });

  const [requestGroupId, setRequestGroupId] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);

  async function loadGroups() {
    setLoading(true);
    const { data: allGroups } = await supabase
      .from('groups')
      .select('*')
      .order('member_count', { ascending: false });

    let visible: Group[] = allGroups || [];

    if (user) {
      const { data: myMemberships } = await supabase
        .from('group_members')
        .select('group_id, role, id, joined_at')
        .eq('user_id', user.id);

      const membershipMap: Record<string, GroupMember> = {};
      (myMemberships || []).forEach((m) => {
        membershipMap[m.group_id] = m as GroupMember;
      });
      setMemberships(membershipMap);

      const myGroupIds = new Set(Object.keys(membershipMap));
      visible = visible.filter((g) => {
        if (g.privacy_type === 'public') return true;
        if (g.privacy_type === 'private') return true;
        if (g.privacy_type === 'secret') return myGroupIds.has(g.id);
        return true;
      });
    } else {
      visible = visible.filter((g) => g.privacy_type === 'public');
    }

    setGroups(visible);
    setLoading(false);
  }

  useEffect(() => {
    loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filteredGroups = useMemo(() => {
    let result = groups;
    if (selectedCategory !== 'Todos') {
      result = result.filter((g) => g.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((g) => g.name.toLowerCase().includes(q));
    }
    return result;
  }, [groups, search, selectedCategory]);

  async function handleCreate() {
    if (!user) return;
    setCreateError('');
    if (!form.name.trim()) {
      setCreateError('O nome do grupo é obrigatório.');
      return;
    }
    setCreateLoading(true);
    const { data: newGroup, error } = await supabase
      .from('groups')
      .insert({
        name: form.name.trim(),
        description: form.description.trim(),
        privacy_type: form.privacy_type,
        category: form.category,
        rules: form.rules.trim(),
        created_by: user.id,
        member_count: 1,
        post_count: 0,
      })
      .select()
      .single();

    if (error || !newGroup) {
      setCreateError(error?.message || 'Erro ao criar grupo.');
      setCreateLoading(false);
      return;
    }

    await supabase.from('group_members').insert({
      group_id: newGroup.id,
      user_id: user.id,
      role: 'admin',
    });

    setForm({ name: '', description: '', privacy_type: 'public', category: 'general', rules: '' });
    setShowCreate(false);
    setCreateLoading(false);
    loadGroups();
  }

  async function handleJoin(group: Group) {
    if (!user) return;
    if (group.privacy_type === 'public') {
      const { error } = await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: user.id,
        role: 'member',
      });
      if (!error) {
        await supabase
          .from('groups')
          .update({ member_count: (group.member_count || 0) + 1 })
          .eq('id', group.id);
        loadGroups();
      }
    } else if (group.privacy_type === 'private') {
      setRequestGroupId(group.id);
      setRequestMessage('');
    }
  }

  async function handleSendRequest() {
    if (!user || !requestGroupId) return;
    setRequestLoading(true);
    const { error } = await supabase.from('group_join_requests').insert({
      group_id: requestGroupId,
      user_id: user.id,
      message: requestMessage.trim(),
      status: 'pending',
    });
    setRequestLoading(false);
    if (!error) {
      setRequestGroupId(null);
      setRequestMessage('');
    }
  }

  async function handleLeave(groupId: string) {
    if (!user) return;
    const member = memberships[groupId];
    if (member?.role === 'admin') return;
    const { error } = await supabase.from('group_members').delete().eq('id', member.id);
    if (!error) {
      const g = groups.find((x) => x.id === groupId);
      if (g) {
        await supabase
          .from('groups')
          .update({ member_count: Math.max(0, (g.member_count || 1) - 1) })
          .eq('id', groupId);
      }
      loadGroups();
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h1 className="text-3xl md:text-4xl font-bebas tracking-wide text-text">Comunidades</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-purple text-white px-5 py-2.5 rounded-xl font-rajdhani font-semibold hover:opacity-90 transition"
          >
            Criar Grupo
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar comunidades..."
            className="w-full md:w-80 bg-bg2 border border-border rounded-xl px-4 py-2 text-text placeholder:text-text3 focus:outline-none focus:border-purple"
          />
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm font-rajdhani border transition ${
                  selectedCategory === cat
                    ? 'bg-purple text-white border-purple'
                    : 'bg-bg2 text-text2 border-border hover:border-purple2'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center text-text3 py-12 font-rajdhani">Carregando comunidades...</div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center text-text3 py-12 font-rajdhani">Nenhuma comunidade encontrada.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroups.map((group) => {
              const isMember = !!memberships[group.id];
              const isAdmin = memberships[group.id]?.role === 'admin';
              return (
                <div
                  key={group.id}
                  className="bg-bg2 border border-border rounded-2xl p-5 flex flex-col gap-3 hover:border-purple2 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-bg3 flex items-center justify-center text-lg font-bebas text-text2">
                      {group.avatar_url ? (
                        <img src={group.avatar_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                      ) : (
                        group.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/groups/${group.id}`}
                          className="text-lg font-rajdhani font-semibold text-text truncate hover:text-purple transition"
                        >
                          {group.name}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-md bg-bg3 text-text2 font-rajdhani">
                          {group.category}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md font-rajdhani ${
                            group.privacy_type === 'public'
                              ? 'bg-green-900/30 text-teal'
                              : group.privacy_type === 'private'
                              ? 'bg-yellow-900/30 text-amber'
                              : 'bg-red-900/30 text-red'
                          }`}
                        >
                          {group.privacy_type}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-text2 font-rajdhani line-clamp-2">{group.description}</p>
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <span className="text-xs text-text3 font-rajdhani">
                      {group.member_count} membro{group.member_count === 1 ? '' : 's'} · {group.post_count} post
                      {group.post_count === 1 ? '' : 's'}
                    </span>
                    {isMember ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-teal font-rajdhani">{isAdmin ? 'Admin' : 'Membro'}</span>
                        {!isAdmin && (
                          <button
                            onClick={() => handleLeave(group.id)}
                            className="text-xs text-red font-rajdhani hover:underline"
                          >
                            Sair
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleJoin(group)}
                        className="text-sm bg-purple text-white px-3 py-1.5 rounded-lg font-rajdhani font-semibold hover:opacity-90 transition"
                      >
                        {group.privacy_type === 'private' ? 'Solicitar entrada' : 'Entrar'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-bg2 border border-border rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bebas text-text">Criar Comunidade</h2>
              <button onClick={() => setShowCreate(false)} className="text-text3 hover:text-text">
                ✕
              </button>
            </div>
            {createError && <p className="text-red text-sm font-rajdhani mb-3">{createError}</p>}
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-text2 font-rajdhani">Nome</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-bg3 border border-border rounded-xl px-4 py-2 text-text font-rajdhani focus:outline-none focus:border-purple"
                />
              </div>
              <div>
                <label className="text-sm text-text2 font-rajdhani">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full bg-bg3 border border-border rounded-xl px-4 py-2 text-text font-rajdhani focus:outline-none focus:border-purple"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm text-text2 font-rajdhani">Privacidade</label>
                  <select
                    value={form.privacy_type}
                    onChange={(e) =>
                      setForm({ ...form, privacy_type: e.target.value as 'public' | 'private' | 'secret' })
                    }
                    className="w-full bg-bg3 border border-border rounded-xl px-4 py-2 text-text font-rajdhani focus:outline-none focus:border-purple"
                  >
                    <option value="public">Público</option>
                    <option value="private">Privado</option>
                    <option value="secret">Secreto</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-sm text-text2 font-rajdhani">Categoria</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-bg3 border border-border rounded-xl px-4 py-2 text-text font-rajdhani focus:outline-none focus:border-purple"
                  >
                    {CATEGORIES.filter((c) => c !== 'Todos').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-text2 font-rajdhani">Regras (opcional)</label>
                <textarea
                  value={form.rules}
                  onChange={(e) => setForm({ ...form, rules: e.target.value })}
                  rows={3}
                  className="w-full bg-bg3 border border-border rounded-xl px-4 py-2 text-text font-rajdhani focus:outline-none focus:border-purple"
                />
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 rounded-xl border border-border text-text2 font-rajdhani hover:border-text2 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={createLoading}
                  className="px-4 py-2 rounded-xl bg-purple text-white font-rajdhani font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {createLoading ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {requestGroupId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-bg2 border border-border rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bebas text-text">Solicitar entrada</h2>
              <button onClick={() => setRequestGroupId(null)} className="text-text3 hover:text-text">
                ✕
              </button>
            </div>
            <p className="text-sm text-text2 font-rajdhani mb-3">
              Este grupo é privado. Envie uma mensagem ao administrador.
            </p>
            <textarea
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              rows={3}
              placeholder="Escreva uma mensagem..."
              className="w-full bg-bg3 border border-border rounded-xl px-4 py-2 text-text font-rajdhani focus:outline-none focus:border-purple mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRequestGroupId(null)}
                className="px-4 py-2 rounded-xl border border-border text-text2 font-rajdhani hover:border-text2 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendRequest}
                disabled={requestLoading}
                className="px-4 py-2 rounded-xl bg-purple text-white font-rajdhani font-semibold hover:opacity-90 transition disabled:opacity-50"
              >
                {requestLoading ? 'Enviando...' : 'Enviar solicitação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
