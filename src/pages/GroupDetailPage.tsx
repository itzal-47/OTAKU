import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';

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

interface Profile {
  id: string;
  username: string;
  avatar_url: string;
  province: string;
  is_admin: boolean;
  is_super_admin: boolean;
}

interface GroupPost {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  media_type: string | null;
  media_url: string | null;
  likes_count: number;
  comments_count: number;
  is_pinned: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  profile?: Profile;
  liked_by_me?: boolean;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: Profile;
}

const TABS = ['Feed', 'Membros', 'Sobre', 'Regras'] as const;
type Tab = (typeof TABS)[number];

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [memberships, setMemberships] = useState<Record<string, GroupMember>>({});
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('Feed');
  const [postContent, setPostContent] = useState('');
  const [postFile, setPostFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [commentMap, setCommentMap] = useState<Record<string, string>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Group>>({});
  const [editRules, setEditRules] = useState(false);
  const [rulesForm, setRulesForm] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  async function loadData() {
    if (!id) return;
    setLoading(true);
    const { data: gData } = await supabase.from('groups').select('*').eq('id', id).single();
    if (!gData) {
      setLoading(false);
      return;
    }
    setGroup(gData as Group);
    setEditForm({
      name: gData.name,
      description: gData.description,
      category: gData.category,
      privacy_type: gData.privacy_type,
    });
    setRulesForm(gData.rules || '');

    const { data: mData } = await supabase.from('group_members').select('*').eq('group_id', id);
    const mList = (mData || []) as GroupMember[];
    setMembers(mList);

    const userIds = [...new Set(mList.map((m) => m.user_id))];
    if (userIds.length) {
      const { data: pData } = await supabase.from('profiles').select('*').in('id', userIds);
      const pMap: Record<string, Profile> = {};
      (pData || []).forEach((p) => {
        pMap[p.id] = p as Profile;
      });
      setProfiles(pMap);
    }

    if (user) {
      const { data: myM } = await supabase.from('group_members').select('*').eq('group_id', id).eq('user_id', user.id);
      const myMap: Record<string, GroupMember> = {};
      (myM || []).forEach((m) => {
        myMap[m.group_id] = m as GroupMember;
      });
      setMemberships(myMap);
    }

    const { data: pData } = await supabase
      .from('group_posts')
      .select('*')
      .eq('group_id', id)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });
    const pList = (pData || []) as GroupPost[];

    const postUserIds = [...new Set(pList.map((p) => p.user_id))];
    if (postUserIds.length) {
      const { data: postProfiles } = await supabase.from('profiles').select('*').in('id', postUserIds);
      const ppMap: Record<string, Profile> = {};
      (postProfiles || []).forEach((p) => {
        ppMap[p.id] = p as Profile;
      });
      pList.forEach((p) => {
        p.profile = ppMap[p.user_id];
      });
    }

    if (user) {
      const { data: likes } = await supabase.from('group_post_likes').select('post_id').eq('user_id', user.id);
      const likedSet = new Set((likes || []).map((l) => l.post_id));
      pList.forEach((p) => {
        p.liked_by_me = likedSet.has(p.id);
      });
    }

    setPosts(pList);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  useEffect(() => {
    if (!id) return;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    const channel = supabase
      .channel(`group_posts_${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_posts', filter: `group_id=eq.${id}` },
        () => {
          loadData();
        }
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const myRole = memberships[id || '']?.role || '';
  const isAdminOrMod = myRole === 'admin' || myRole === 'moderator';
  const isCreator = group?.created_by === user?.id;
  const isMember = !!memberships[id || ''];

  async function handleJoin() {
    if (!user || !id || !group) return;
    if (group.privacy_type === 'public') {
      const { error } = await supabase.from('group_members').insert({
        group_id: id,
        user_id: user.id,
        role: 'member',
      });
      if (!error) {
        await supabase
          .from('groups')
          .update({ member_count: (group.member_count || 0) + 1 })
          .eq('id', id);
        loadData();
      }
    }
  }

  async function handleLeave() {
    if (!user || !id || !group) return;
    const member = memberships[id];
    if (!member || member.role === 'admin') return;
    const { error } = await supabase.from('group_members').delete().eq('id', member.id);
    if (!error) {
      await supabase
        .from('groups')
        .update({ member_count: Math.max(0, (group.member_count || 1) - 1) })
        .eq('id', id);
      loadData();
    }
  }

  async function handleCreatePost() {
    if (!user || !id || !postContent.trim()) return;
    setPosting(true);
    let mediaUrl: string | null = null;
    let mediaType: string | null = null;
    if (postFile) {
      mediaType = postFile.type.startsWith('video') ? 'video' : 'image';
      const ext = postFile.name.split('.').pop();
      const path = `groups/${id}/${user.id}_${Date.now()}.${ext}`;
      const { data: up } = await supabase.storage.from('uploads').upload(path, postFile);
      if (up) {
        const { data } = supabase.storage.from('uploads').getPublicUrl(path);
        mediaUrl = data?.publicUrl || null;
      }
    }
    const { error } = await supabase.from('group_posts').insert({
      group_id: id,
      user_id: user.id,
      content: postContent.trim(),
      media_type: mediaType,
      media_url: mediaUrl,
      is_approved: group?.privacy_type === 'public',
      is_pinned: false,
    });
    if (!error) {
      setPostContent('');
      setPostFile(null);
      if (fileRef.current) fileRef.current.value = '';
      await supabase.from('groups').update({ post_count: (group?.post_count || 0) + 1 }).eq('id', id);
      loadData();
    }
    setPosting(false);
  }

  async function handleLike(postId: string) {
    if (!user) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    if (post.liked_by_me) {
      await supabase.from('group_post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
      await supabase
        .from('group_posts')
        .update({ likes_count: Math.max(0, (post.likes_count || 1) - 1) })
        .eq('id', postId);
    } else {
      await supabase.from('group_post_likes').insert({ post_id: postId, user_id: user.id });
      await supabase
        .from('group_posts')
        .update({ likes_count: (post.likes_count || 0) + 1 })
        .eq('id', postId);
    }
    loadData();
  }

  async function loadComments(postId: string) {
    const { data } = await supabase
      .from('group_post_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    const cList = (data || []) as Comment[];
    const cUserIds = [...new Set(cList.map((c) => c.user_id))];
    if (cUserIds.length) {
      const { data: cProfiles } = await supabase.from('profiles').select('*').in('id', cUserIds);
      const cpMap: Record<string, Profile> = {};
      (cProfiles || []).forEach((p) => {
        cpMap[p.id] = p as Profile;
      });
      cList.forEach((c) => {
        c.profile = cpMap[c.user_id];
      });
    }
    setComments((prev) => ({ ...prev, [postId]: cList }));
    setShowComments((prev) => ({ ...prev, [postId]: true }));
  }

  async function handleComment(postId: string) {
    if (!user) return;
    const text = commentMap[postId]?.trim();
    if (!text) return;
    const { error } = await supabase.from('group_post_comments').insert({
      post_id: postId,
      user_id: user.id,
      content: text,
    });
    if (!error) {
      const post = posts.find((p) => p.id === postId);
      if (post) {
        await supabase
          .from('group_posts')
          .update({ comments_count: (post.comments_count || 0) + 1 })
          .eq('id', postId);
      }
      setCommentMap((prev) => ({ ...prev, [postId]: '' }));
      loadComments(postId);
      loadData();
    }
  }

  async function handleDeletePost(postId: string) {
    if (!user) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const canDelete = post.user_id === user.id || isAdminOrMod;
    if (!canDelete) return;
    await supabase.from('group_posts').delete().eq('id', postId);
    if (group) {
      await supabase
        .from('groups')
        .update({ post_count: Math.max(0, (group.post_count || 1) - 1) })
        .eq('id', group.id);
    }
    loadData();
  }

  async function handlePinPost(postId: string, pinned: boolean) {
    if (!isAdminOrMod) return;
    await supabase.from('group_posts').update({ is_pinned: pinned }).eq('id', postId);
    loadData();
  }

  async function handleApprovePost(postId: string) {
    if (!isAdminOrMod) return;
    await supabase.from('group_posts').update({ is_approved: true }).eq('id', postId);
    loadData();
  }

  async function handleChangeRole(memberId: string, newRole: string) {
    if (!isAdminOrMod) return;
    await supabase.from('group_members').update({ role: newRole }).eq('id', memberId);
    loadData();
  }

  async function handleRemoveMember(memberId: string) {
    if (!isAdminOrMod) return;
    await supabase.from('group_members').delete().eq('id', memberId);
    if (group) {
      await supabase
        .from('groups')
        .update({ member_count: Math.max(0, (group.member_count || 1) - 1) })
        .eq('id', group.id);
    }
    loadData();
  }

  async function handleSaveEdit() {
    if (!group || !isAdminOrMod) return;
    await supabase
      .from('groups')
      .update({
        name: editForm.name,
        description: editForm.description,
        category: editForm.category,
        privacy_type: editForm.privacy_type,
      })
      .eq('id', group.id);
    setEditing(false);
    loadData();
  }

  async function handleSaveRules() {
    if (!group || !isAdminOrMod) return;
    await supabase.from('groups').update({ rules: rulesForm }).eq('id', group.id);
    setEditRules(false);
    loadData();
  }

  const visiblePosts = useMemo(() => {
    if (isAdminOrMod) return posts;
    return posts.filter((p) => p.is_approved);
  }, [posts, isAdminOrMod]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-text p-6 flex items-center justify-center font-rajdhani">
        Carregando...
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-bg text-text p-6 text-center font-rajdhani">
        Grupo não encontrado.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="relative">
        <div className="h-48 md:h-64 bg-bg3 w-full">
          {group.banner_url && (
            <img src={group.banner_url} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="flex items-end gap-4 -mt-12 mb-4">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-bg2 border-4 border-bg flex items-center justify-center text-3xl font-bebas text-text2 overflow-hidden">
              {group.avatar_url ? (
                <img src={group.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                group.name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="pb-2 flex-1">
              <h1 className="text-2xl md:text-3xl font-bebas text-text">{group.name}</h1>
              <div className="flex items-center gap-2 text-sm font-rajdhani text-text2">
                <span className="px-2 py-0.5 rounded-md bg-bg3 text-text2">{group.category}</span>
                <span
                  className={`px-2 py-0.5 rounded-md ${
                    group.privacy_type === 'public'
                      ? 'bg-green-900/30 text-teal'
                      : group.privacy_type === 'private'
                      ? 'bg-yellow-900/30 text-amber'
                      : 'bg-red-900/30 text-red'
                  }`}
                >
                  {group.privacy_type}
                </span>
                <span>{group.member_count} membros</span>
              </div>
            </div>
            <div className="pb-2">
              {isMember ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-teal font-rajdhani">{myRole}</span>
                  {!isCreator && (
                    <button
                      onClick={handleLeave}
                      className="text-sm text-red font-rajdhani border border-red px-3 py-1.5 rounded-lg hover:bg-red/10 transition"
                    >
                      Sair
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleJoin}
                  className="bg-purple text-white px-4 py-2 rounded-xl font-rajdhani font-semibold hover:opacity-90 transition"
                >
                  {group.privacy_type === 'private' ? 'Solicitar entrada' : 'Entrar'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 pb-10">
        <div className="flex gap-2 border-b border-border mb-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-rajdhani font-semibold text-sm border-b-2 transition ${
                activeTab === tab
                  ? 'border-purple text-purple'
                  : 'border-transparent text-text2 hover:text-text'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Feed' && (
          <div className="flex flex-col gap-4">
            {isMember && (
              <div className="bg-bg2 border border-border rounded-2xl p-4">
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Escreva algo para a comunidade..."
                  rows={3}
                  className="w-full bg-bg3 border border-border rounded-xl px-4 py-2 text-text font-rajdhani focus:outline-none focus:border-purple"
                />
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) => setPostFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="text-sm text-text2 font-rajdhani border border-border px-3 py-1.5 rounded-lg hover:border-purple transition"
                    >
                      {postFile ? postFile.name : 'Anexar foto/vídeo'}
                    </button>
                    {postFile && (
                      <button onClick={() => { setPostFile(null); if (fileRef.current) fileRef.current.value = ''; }} className="text-xs text-red font-rajdhani">
                        Remover
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handleCreatePost}
                    disabled={posting || !postContent.trim()}
                    className="bg-purple text-white px-4 py-2 rounded-xl font-rajdhani font-semibold hover:opacity-90 transition disabled:opacity-50"
                  >
                    {posting ? 'Publicando...' : 'Publicar'}
                  </button>
                </div>
              </div>
            )}

            {visiblePosts.length === 0 && (
              <div className="text-center text-text3 font-rajdhani py-8">Nenhuma publicação ainda.</div>
            )}

            {visiblePosts.map((post) => (
              <div key={post.id} className="bg-bg2 border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-bg3 flex items-center justify-center text-sm font-bebas text-text2 overflow-hidden">
                      {post.profile?.avatar_url ? (
                        <img src={post.profile.avatar_url} alt="" className="w-10 h-10 object-cover" />
                      ) : (
                        (post.profile?.username || '?').slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <Link
                        to={`/profile/${post.user_id}`}
                        className="font-rajdhani font-semibold text-text hover:text-purple transition"
                      >
                        {post.profile?.username || 'Usuário'}
                      </Link>
                      <p className="text-xs text-text3 font-rajdhani">
                        {new Date(post.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {post.is_pinned && <span className="text-xs text-amber font-rajdhani">📌 Fixado</span>}
                    {!post.is_approved && isAdminOrMod && (
                      <span className="text-xs text-red font-rajdhani">Pendente</span>
                    )}
                    {isAdminOrMod && (
                      <div className="flex items-center gap-1">
                        {!post.is_approved && (
                          <button
                            onClick={() => handleApprovePost(post.id)}
                            className="text-xs text-teal font-rajdhani hover:underline"
                          >
                            Aprovar
                          </button>
                        )}
                        <button
                          onClick={() => handlePinPost(post.id, !post.is_pinned)}
                          className="text-xs text-amber font-rajdhani hover:underline"
                        >
                          {post.is_pinned ? 'Desfixar' : 'Fixar'}
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="text-xs text-red font-rajdhani hover:underline"
                        >
                          Excluir
                        </button>
                      </div>
                    )}
                    {post.user_id === user?.id && !isAdminOrMod && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="text-xs text-red font-rajdhani hover:underline"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-text font-rajdhani whitespace-pre-wrap mb-3">{post.content}</p>
                {post.media_url && (
                  <div className="mb-3">
                    {post.media_type === 'video' ? (
                      <video controls className="w-full rounded-xl max-h-96">
                        <source src={post.media_url} />
                      </video>
                    ) : (
                      <img src={post.media_url} alt="" className="w-full rounded-xl max-h-96 object-cover" />
                    )}
                  </div>
                )}
                <div className="flex items-center gap-4 border-t border-border pt-3">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-1 text-sm font-rajdhani transition ${
                      post.liked_by_me ? 'text-purple' : 'text-text2 hover:text-purple'
                    }`}
                  >
                    {post.liked_by_me ? '❤️' : '🤍'} {post.likes_count || 0}
                  </button>
                  <button
                    onClick={() => {
                      if (showComments[post.id]) {
                        setShowComments((prev) => ({ ...prev, [post.id]: false }));
                      } else {
                        loadComments(post.id);
                      }
                    }}
                    className="flex items-center gap-1 text-sm text-text2 font-rajdhani hover:text-purple transition"
                  >
                    💬 {post.comments_count || 0}
                  </button>
                </div>
                {showComments[post.id] && (
                  <div className="mt-3 flex flex-col gap-3">
                    {(comments[post.id] || []).map((c) => (
                      <div key={c.id} className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-lg bg-bg3 flex items-center justify-center text-xs font-bebas text-text2 overflow-hidden">
                          {c.profile?.avatar_url ? (
                            <img src={c.profile.avatar_url} alt="" className="w-7 h-7 object-cover" />
                          ) : (
                            (c.profile?.username || '?').slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="bg-bg3 rounded-xl px-3 py-2 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-rajdhani font-semibold text-text">
                              {c.profile?.username || 'Usuário'}
                            </span>
                            <span className="text-xs text-text3 font-rajdhani">
                              {new Date(c.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-text2 font-rajdhani">{c.content}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <input
                        value={commentMap[post.id] || ''}
                        onChange={(e) =>
                          setCommentMap((prev) => ({ ...prev, [post.id]: e.target.value }))
                        }
                        placeholder="Escreva um comentário..."
                        className="flex-1 bg-bg3 border border-border rounded-xl px-4 py-2 text-sm text-text font-rajdhani focus:outline-none focus:border-purple"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleComment(post.id);
                        }}
                      />
                      <button
                        onClick={() => handleComment(post.id)}
                        className="bg-purple text-white px-3 py-2 rounded-xl text-sm font-rajdhani font-semibold hover:opacity-90 transition"
                      >
                        Enviar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Membros' && (
          <div className="bg-bg2 border border-border rounded-2xl p-4">
            <div className="flex flex-col gap-3">
              {members.map((m) => {
                const p = profiles[m.user_id];
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between bg-bg3 rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-bg flex items-center justify-center text-sm font-bebas text-text2 overflow-hidden">
                        {p?.avatar_url ? (
                          <img src={p.avatar_url} alt="" className="w-10 h-10 object-cover" />
                        ) : (
                          (p?.username || '?').slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <Link
                          to={`/profile/${m.user_id}`}
                          className="font-rajdhani font-semibold text-text hover:text-purple transition"
                        >
                          {p?.username || 'Usuário'}
                        </Link>
                        <p className="text-xs text-text2 font-rajdhani capitalize">{m.role}</p>
                      </div>
                    </div>
                    {isAdminOrMod && m.user_id !== user?.id && m.user_id !== group.created_by && (
                      <div className="flex items-center gap-2">
                        <select
                          value={m.role}
                          onChange={(e) => handleChangeRole(m.id, e.target.value)}
                          className="bg-bg border border-border rounded-lg px-2 py-1 text-xs text-text font-rajdhani focus:outline-none focus:border-purple"
                        >
                          <option value="member">Membro</option>
                          <option value="moderator">Moderador</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          className="text-xs text-red font-rajdhani border border-red px-2 py-1 rounded-lg hover:bg-red/10 transition"
                        >
                          Remover
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'Sobre' && (
          <div className="bg-bg2 border border-border rounded-2xl p-6">
            {editing && isAdminOrMod ? (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-sm text-text2 font-rajdhani">Nome</label>
                  <input
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-bg3 border border-border rounded-xl px-4 py-2 text-text font-rajdhani focus:outline-none focus:border-purple"
                  />
                </div>
                <div>
                  <label className="text-sm text-text2 font-rajdhani">Descrição</label>
                  <textarea
                    value={editForm.description || ''}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={4}
                    className="w-full bg-bg3 border border-border rounded-xl px-4 py-2 text-text font-rajdhani focus:outline-none focus:border-purple"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-sm text-text2 font-rajdhani">Categoria</label>
                    <input
                      value={editForm.category || ''}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="w-full bg-bg3 border border-border rounded-xl px-4 py-2 text-text font-rajdhani focus:outline-none focus:border-purple"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm text-text2 font-rajdhani">Privacidade</label>
                    <select
                      value={editForm.privacy_type || 'public'}
                      onChange={(e) =>
                        setEditForm({ ...editForm, privacy_type: e.target.value as 'public' | 'private' | 'secret' })
                      }
                      className="w-full bg-bg3 border border-border rounded-xl px-4 py-2 text-text font-rajdhani focus:outline-none focus:border-purple"
                    >
                      <option value="public">Público</option>
                      <option value="private">Privado</option>
                      <option value="secret">Secreto</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 rounded-xl border border-border text-text2 font-rajdhani hover:border-text2 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 rounded-xl bg-purple text-white font-rajdhani font-semibold hover:opacity-90 transition"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bebas text-text">{group.name}</h2>
                    <p className="text-sm text-text2 font-rajdhani mt-1">{group.description}</p>
                  </div>
                  {isAdminOrMod && (
                    <button
                      onClick={() => setEditing(true)}
                      className="text-sm text-purple font-rajdhani border border-purple px-3 py-1.5 rounded-lg hover:bg-purple/10 transition"
                    >
                      Editar
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                  <div className="bg-bg3 rounded-xl p-3">
                    <p className="text-xs text-text3 font-rajdhani">Membros</p>
                    <p className="text-lg font-rajdhani font-semibold text-text">{group.member_count}</p>
                  </div>
                  <div className="bg-bg3 rounded-xl p-3">
                    <p className="text-xs text-text3 font-rajdhani">Publicações</p>
                    <p className="text-lg font-rajdhani font-semibold text-text">{group.post_count}</p>
                  </div>
                  <div className="bg-bg3 rounded-xl p-3">
                    <p className="text-xs text-text3 font-rajdhani">Criado em</p>
                    <p className="text-lg font-rajdhani font-semibold text-text">
                      {new Date(group.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="bg-bg3 rounded-xl p-3">
                    <p className="text-xs text-text3 font-rajdhani">Privacidade</p>
                    <p className="text-lg font-rajdhani font-semibold text-text capitalize">{group.privacy_type}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Regras' && (
          <div className="bg-bg2 border border-border rounded-2xl p-6">
            {editRules && isAdminOrMod ? (
              <div className="flex flex-col gap-4">
                <textarea
                  value={rulesForm}
                  onChange={(e) => setRulesForm(e.target.value)}
                  rows={8}
                  className="w-full bg-bg3 border border-border rounded-xl px-4 py-2 text-text font-rajdhani focus:outline-none focus:border-purple"
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setEditRules(false)}
                    className="px-4 py-2 rounded-xl border border-border text-text2 font-rajdhani hover:border-text2 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveRules}
                    className="px-4 py-2 rounded-xl bg-purple text-white font-rajdhani font-semibold hover:opacity-90 transition"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bebas text-text">Regras da Comunidade</h2>
                  {isAdminOrMod && (
                    <button
                      onClick={() => setEditRules(true)}
                      className="text-sm text-purple font-rajdhani border border-purple px-3 py-1.5 rounded-lg hover:bg-purple/10 transition"
                    >
                      Editar
                    </button>
                  )}
                </div>
                <div className="bg-bg3 rounded-xl p-4">
                  <p className="text-sm text-text2 font-rajdhani whitespace-pre-wrap">
                    {group.rules || 'Nenhuma regra definida.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
