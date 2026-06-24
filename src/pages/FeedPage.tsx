import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { Heart, MessageCircle, Share2, MoreHorizontal, Image, Video, Send, X, Clock, Trash2, Edit3 } from 'lucide-react';
import { CLASS_INFO, type CharacterClass } from '../types/index';
import StoriesBar from '../components/StoriesBar';

interface Post {
  id: string;
  user_id: string;
  content: string;
  media_type: 'none' | 'image' | 'video' | 'audio' | 'file';
  media_url: string | null;
  media_thumbnail: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  profiles: {
    username: string;
    province?: string;
  };
  characters?: {
    name: string;
    class: CharacterClass;
  };
  liked_by_me?: boolean;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: { username: string };
}

export default function FeedPage() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostMediaType, setNewPostMediaType] = useState<'none' | 'image' | 'video'>('none');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | null>(null);
  const [activeCommentPost, setActiveCommentPost] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showMenuPost, setShowMenuPost] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const feedEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPosts();

    const channel = supabase.channel('posts_feed');
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => {
      loadPosts();
    });
    channel.subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadPosts() {
    try {
      const { data: postsData } = await supabase
        .from('posts')
        .select('id, user_id, content, media_type, media_url, media_thumbnail, likes_count, comments_count, shares_count, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!postsData) return;

      const userIds = [...new Set(postsData.map(p => p.user_id))];

      const [profilesData, charactersData, likesData] = await Promise.all([
        supabase.from('profiles').select('id, username, province').in('id', userIds),
        supabase.from('characters').select('user_id, name, class').in('user_id', userIds),
        user ? supabase.from('post_likes').select('post_id').eq('user_id', user.id) : { data: [] }
      ]);

      const likedPostIds = new Set(likesData.data?.map(l => l.post_id) || []);

      const formattedPosts: Post[] = postsData.map(post => {
        const userProfile = profilesData.data?.find(p => p.id === post.user_id);
        const userChar = charactersData.data?.find(c => c.user_id === post.user_id);
        return {
          ...post,
          profiles: userProfile || { username: 'Unknown' },
          characters: userChar,
          liked_by_me: likedPostIds.has(post.id)
        };
      });

      setPosts(formattedPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 50 * 1024 * 1024) {
      showToast('Ficheiro muito grande (máx 50MB)', 'error');
      return;
    }

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;

    setUploadingFile(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('posts-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('posts-media')
        .getPublicUrl(filePath);

      setUploadedMediaUrl(publicUrl);
      showToast('Upload completo!', 'success');
    } catch {
      showToast('Erro ao fazer upload', 'error');
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newPostContent.trim()) return;

    setPosting(true);
    try {
      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: newPostContent.trim(),
        media_type: uploadedMediaUrl ? newPostMediaType : 'none',
        media_url: uploadedMediaUrl
      });

      if (error) throw error;

      setNewPostContent('');
      setUploadedMediaUrl(null);
      setNewPostMediaType('none');
      setShowCreatePost(false);
      showToast('Publicação criada!', 'success');
      loadPosts();
    } catch {
      showToast('Erro ao criar publicação', 'error');
    } finally {
      setPosting(false);
    }
  }

  async function handleLike(postId: string, isLiked: boolean) {
    if (!user) {
      showToast('Entra para curtir', 'info');
      return;
    }

    try {
      if (isLiked) {
        await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, likes_count: p.likes_count - 1, liked_by_me: false } : p
        ));
      } else {
        await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, likes_count: p.likes_count + 1, liked_by_me: true } : p
        ));
      }
    } catch {
      showToast('Erro', 'error');
    }
  }

  async function handleShare(post: Post) {
    const shareData = {
      title: `Publicação de ${post.profiles.username}`,
      text: post.content,
      url: `${window.location.origin}/feed`
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        // Increment shares count
        await supabase.from('posts').update({ shares_count: post.shares_count + 1 }).eq('id', post.id);
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, shares_count: p.shares_count + 1 } : p));
        showToast('Partilhado!', 'success');
      } catch {
        // User cancelled
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(`${shareData.text} - ${shareData.url}`);
        showToast('Link copiado para a clipboard!', 'success');
      } catch {
        showToast('Erro ao copiar', 'error');
      }
    }
  }

  async function handleDeletePost(postId: string) {
    if (!user) return;
    if (!confirm('Tens certeza que queres apagar esta publicação?')) return;

    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId).eq('user_id', user.id);
      if (error) throw error;
      setPosts(prev => prev.filter(p => p.id !== postId));
      showToast('Publicação apagada', 'success');
    } catch {
      showToast('Erro ao apagar', 'error');
    }
    setShowMenuPost(null);
  }

  async function handleEditPost(postId: string) {
    if (!user || !editContent.trim()) return;

    try {
      const { error } = await supabase.from('posts')
        .update({ content: editContent.trim() })
        .eq('id', postId)
        .eq('user_id', user.id);

      if (error) throw error;
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, content: editContent.trim() } : p));
      setEditingPost(null);
      setEditContent('');
      showToast('Publicação atualizada!', 'success');
    } catch {
      showToast('Erro ao editar', 'error');
    }
    setShowMenuPost(null);
  }

  async function loadComments(postId: string) {
    const { data } = await supabase
      .from('post_comments')
      .select('id, content, created_at, user_id, profiles(username)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    setComments((data || []) as unknown as Comment[]);
  }

  async function handleAddComment(postId: string) {
    if (!user || !newComment.trim()) return;

    try {
      await supabase.from('post_comments').insert({
        post_id: postId,
        user_id: user.id,
        content: newComment.trim()
      });

      setNewComment('');
      loadComments(postId);
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
      ));
    } catch {
      showToast('Erro ao comentar', 'error');
    }
  }

  function formatTime(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-bebas text-3xl text-text">Feed</h1>
          {user && (
            <button onClick={() => setShowCreatePost(true)} className="btn btn-primary text-sm">
              + Publicar
            </button>
          )}
        </div>

        {/* Stories */}
        <StoriesBar />

        {/* Create Post Modal */}
        {showCreatePost && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-bg2 border border-border rounded-2xl p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-rajdhani font-bold text-lg text-text">Nova Publicação</h2>
                <button onClick={() => setShowCreatePost(false)} className="text-text3 hover:text-text">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreatePost} className="space-y-4">
                <textarea
                  value={newPostContent}
                  onChange={e => setNewPostContent(e.target.value)}
                  placeholder="O que estás a pensar?"
                  className="input min-h-[120px] py-3 resize-none"
                  required
                />

                <div className="flex gap-2">
                  <button type="button" onClick={() => { setNewPostMediaType('image'); fileInputRef.current?.click(); }} className={`btn btn-ghost text-sm ${newPostMediaType === 'image' && uploadedMediaUrl ? 'border-purple' : ''}`}>
                    <Image size={16} /> {uploadingFile ? 'A carregar...' : 'Imagem'}
                  </button>
                  <button type="button" onClick={() => { setNewPostMediaType('video'); fileInputRef.current?.click(); }} className={`btn btn-ghost text-sm ${newPostMediaType === 'video' && uploadedMediaUrl ? 'border-purple' : ''}`}>
                    <Video size={16} /> {uploadingFile ? 'A carregar...' : 'Vídeo'}
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {uploadedMediaUrl && (
                  <div className="relative">
                    {newPostMediaType === 'image' ? (
                      <img src={uploadedMediaUrl} alt="" className="w-full max-h-[200px] object-cover rounded-xl" />
                    ) : (
                      <video src={uploadedMediaUrl} className="w-full max-h-[200px] rounded-xl" />
                    )}
                    <button
                      type="button"
                      onClick={() => setUploadedMediaUrl(null)}
                      className="absolute top-2 right-2 bg-red text-white rounded-full p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowCreatePost(false)} className="btn btn-ghost flex-1">
                    Cancelar
                  </button>
                  <button type="submit" disabled={posting || !newPostContent.trim()} className="btn btn-primary flex-1 disabled:opacity-50">
                    {posting ? 'Publicando...' : 'Publicar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Posts */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-2 border-border2 border-t-purple rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 bg-bg2 border border-border rounded-2xl">
            <div className="text-6xl mb-4">📰</div>
            <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Feed vazio</h3>
            <p className="text-text3 text-sm">Sê o primeiro a publicar!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <div key={post.id} className="bg-bg2 border border-border rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 p-4">
                  <Link to={`/perfil/${post.profiles.username}`}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple to-red flex items-center justify-center text-sm font-bold">
                      {post.profiles.username.charAt(0).toUpperCase()}
                    </div>
                  </Link>
                  <div className="flex-1">
                    <Link to={`/perfil/${post.profiles.username}`} className="font-rajdhani font-bold text-text hover:text-purple2">
                      {post.profiles.username}
                    </Link>
                    <div className="text-xs text-text3 flex items-center gap-2">
                      {post.characters && (
                        <>
                          <span>{CLASS_INFO[post.characters.class as CharacterClass]?.emoji}</span>
                          <span>{post.characters.name}</span>
                          <span>·</span>
                        </>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {formatTime(post.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setShowMenuPost(showMenuPost === post.id ? null : post.id)}
                      className="text-text3 hover:text-text"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    {showMenuPost === post.id && (
                      <div className="absolute right-0 top-8 bg-bg3 border border-border rounded-xl shadow-lg z-10 w-40 py-1">
                        {user?.id === post.user_id && (
                          <>
                            <button
                              onClick={() => {
                                setEditingPost(post.id);
                                setEditContent(post.content);
                                setShowMenuPost(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-text hover:bg-bg4 flex items-center gap-2"
                            >
                              <Edit3 size={14} /> Editar
                            </button>
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="w-full px-4 py-2 text-left text-sm text-red hover:bg-bg4 flex items-center gap-2"
                            >
                              <Trash2 size={14} /> Apagar
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/feed`);
                            showToast('Link copiado!', 'success');
                            setShowMenuPost(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-text hover:bg-bg4 flex items-center gap-2"
                        >
                          <Share2 size={14} /> Copiar Link
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="px-4 pb-3">
                  {editingPost === post.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        className="input w-full min-h-[80px] py-2"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditPost(post.id)}
                          className="btn btn-primary text-sm py-1"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => { setEditingPost(null); setEditContent(''); }}
                          className="btn btn-ghost text-sm py-1"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-text2 whitespace-pre-wrap">{post.content}</p>
                  )}
                </div>

                {/* Media */}
                {post.media_url && post.media_type === 'image' && (
                  <img src={post.media_url} alt="" className="w-full max-h-[500px] object-cover" />
                )}
                {post.media_url && post.media_type === 'video' && (
                  <video src={post.media_url} controls className="w-full max-h-[500px]" />
                )}

                {/* Actions */}
                <div className="flex items-center gap-6 px-4 py-3 border-t border-border">
                  <button
                    onClick={() => handleLike(post.id, post.liked_by_me || false)}
                    className={`flex items-center gap-1.5 text-sm ${
                      post.liked_by_me ? 'text-red' : 'text-text3 hover:text-red'
                    }`}
                  >
                    <Heart size={18} fill={post.liked_by_me ? 'currentColor' : 'none'} />
                    {post.likes_count > 0 && post.likes_count}
                  </button>

                  <button
                    onClick={() => {
                      setActiveCommentPost(activeCommentPost === post.id ? null : post.id);
                      if (activeCommentPost !== post.id) loadComments(post.id);
                    }}
                    className="flex items-center gap-1.5 text-sm text-text3 hover:text-teal"
                  >
                    <MessageCircle size={18} />
                    {post.comments_count > 0 && post.comments_count}
                  </button>

                  <button
                    onClick={() => handleShare(post)}
                    className="flex items-center gap-1.5 text-sm text-text3 hover:text-purple"
                  >
                    <Share2 size={18} />
                    {post.shares_count > 0 && post.shares_count}
                  </button>
                </div>

                {/* Comments Section */}
                {activeCommentPost === post.id && (
                  <div className="border-t border-border p-4">
                    {comments.length > 0 && (
                      <div className="space-y-3 mb-4">
                        {comments.map(comment => (
                          <div key={comment.id} className="flex gap-2">
                            <div className="w-8 h-8 rounded-full bg-bg4 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {comment.profiles?.username?.charAt(0) || '?'}
                            </div>
                            <div className="flex-1 bg-bg3 rounded-xl px-3 py-2">
                              <div className="font-semibold text-sm text-text">{comment.profiles?.username || 'Unknown'}</div>
                              <p className="text-sm text-text2">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {user && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newComment}
                          onChange={e => setNewComment(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddComment(post.id)}
                          placeholder="Escreve um comentário..."
                          className="input flex-1 text-sm"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          disabled={!newComment.trim()}
                          className="btn btn-primary py-2 px-3 disabled:opacity-50"
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={feedEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
