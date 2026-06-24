import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { supabase } from '../lib/supabase';
import { Send, Hash, Users, Plus, X, Crown, Shield, MessageCircle, Smile, Lock, UserPlus } from 'lucide-react';
import type { ChatRoom, ChatMessage, ChatRoomMember } from '../types/index';
import { EMOJI_LIST } from '../types/index';

const USER_COLORS = ['purple2', 'red2', 'teal', 'amber', 'purple'];

async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, is_event_publisher')
    .eq('id', userId)
    .single();
  return profile?.is_admin || profile?.is_event_publisher || false;
}

export default function ChatPage() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  const [roomMembers, setRoomMembers] = useState<ChatRoomMember[]>([]);
  const [userMembership, setUserMembership] = useState<ChatRoomMember | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [allUsers, setAllUsers] = useState<{id: string; username: string}[]>([]);
  const [joinRequests, setJoinRequests] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadRooms();
    if (user) {
      checkIsAdmin(user.id).then(setIsAdminUser);
    }

    const channel = supabase.channel('chat_messages');
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
      const newMsg = payload.new as ChatMessage;
      if (selectedRoom && newMsg.room_id === selectedRoom.id) {
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          // Look up username from allUsers for real-time messages
          const sender = allUsers.find(u => u.id === newMsg.user_id);
          return [...prev, { ...newMsg, username: sender?.username || 'Unknown' }];
        });
      }
    });
    channel.subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, selectedRoom?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load all users for mentions
  useEffect(() => {
    async function loadUsers() {
      const { data } = await supabase.from('profiles').select('id, username').limit(100);
      if (data) setAllUsers(data);
    }
    loadUsers();
  }, []);

  async function loadRooms() {
    setLoading(true);
    try {
      const { data: roomsData } = await supabase
        .from('chat_rooms')
        .select('*')
        .order('created_at', { ascending: true });

      if (roomsData) {
        const roomsWithCounts = await Promise.all(roomsData.map(async (room) => {
          const { count } = await supabase
            .from('chat_room_members')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id);
          return { ...room, member_count: count || 0 };
        }));
        setRooms(roomsWithCounts);
        if (roomsWithCounts.length > 0 && !selectedRoom) {
          setSelectedRoom(roomsWithCounts[0]);
        }
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedRoom) {
      loadMessages();
      loadRoomMembers();
      loadJoinRequests();
    }
  }, [selectedRoom?.id, user?.id]);

  async function loadMessages() {
    if (!selectedRoom) return;
    const { data } = await supabase
      .from('chat_messages')
      .select('id, room_id, user_id, content, created_at, profiles(username)')
      .eq('room_id', selectedRoom.id)
      .order('created_at', { ascending: true })
      .limit(100);

    if (data) {
      const formattedMessages: ChatMessage[] = data.map(m => ({
        ...m,
        username: (m.profiles as unknown as { username: string })?.username || 'Unknown'
      }));
      setMessages(formattedMessages);
    }
  }

  async function loadRoomMembers() {
    if (!selectedRoom) return;

    const { data: members } = await supabase
      .from('chat_room_members')
      .select('*')
      .eq('room_id', selectedRoom.id);

    setRoomMembers(members || []);

    if (user) {
      const myMembership = members?.find(m => m.user_id === user.id);
      setUserMembership(myMembership || null);

      // Auto-join only public rooms
      if (!myMembership && selectedRoom.type !== 'private') {
        await supabase.from('chat_room_members').insert({
          room_id: selectedRoom.id,
          user_id: user.id,
          role: 'member'
        });
        loadRoomMembers();
      }
    }
  }

  async function loadJoinRequests() {
    if (!user || !selectedRoom) return;
    const { data } = await supabase
      .from('chat_room_join_requests')
      .select('room_id')
      .eq('user_id', user.id)
      .eq('status', 'pending');
    setJoinRequests((data || []).map(r => r.room_id));
  }

  async function handleRequestJoin(roomId: string) {
    if (!user) {
      showToast('Entra para pedir entrada', 'info');
      return;
    }
    try {
      const { error } = await supabase.from('chat_room_join_requests').insert({
        room_id: roomId,
        user_id: user.id
      });
      if (error) throw error;
      setJoinRequests(prev => [...prev, roomId]);
      showToast('Pedido enviado! Aguarda aprovação.', 'success');
    } catch {
      showToast('Erro ao enviar pedido', 'error');
    }
  }

  async function handleApproveJoin(requestId: string, requesterId: string, roomId: string) {
    try {
      await supabase.from('chat_room_members').insert({
        room_id: roomId,
        user_id: requesterId,
        role: 'member'
      });
      await supabase.from('chat_room_join_requests').update({ status: 'approved' }).eq('id', requestId);
      showToast('Membro aceite!', 'success');
      loadRoomMembers();
    } catch {
      showToast('Erro ao aceitar', 'error');
    }
  }

  async function handleRejectJoin(requestId: string) {
    try {
      await supabase.from('chat_room_join_requests').update({ status: 'rejected' }).eq('id', requestId);
      showToast('Pedido rejeitado', 'info');
    } catch {
      showToast('Erro ao rejeitar', 'error');
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1 && lastAtIndex === value.length - 1) {
      setShowMentions(true);
      setMentionQuery('');
    } else if (lastAtIndex !== -1) {
      const afterAt = value.slice(lastAtIndex + 1);
      if (!afterAt.includes(' ')) {
        setShowMentions(true);
        setMentionQuery(afterAt.toLowerCase());
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (username: string) => {
    const lastAtIndex = newMessage.lastIndexOf('@');
    const newValue = newMessage.slice(0, lastAtIndex) + `@${username} `;
    setNewMessage(newValue);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const insertEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const filteredMentionUsers = allUsers
    .filter(u => u.username.toLowerCase().includes(mentionQuery))
    .slice(0, 5);

  async function handleSend() {
    if (!newMessage.trim() || !user || !selectedRoom) return;

    setSending(true);

    try {
      const { error } = await supabase.from('chat_messages').insert({
        room_id: selectedRoom.id,
        user_id: user.id,
        content: newMessage.trim()
      });

      if (error) throw error;
      setNewMessage('');
    } catch {
      showToast('Erro ao enviar mensagem', 'error');
    } finally {
      setSending(false);
    }
  }

  const getUserColor = (username: string) => {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });
  };

  const isAdmin = userMembership?.role === 'admin' || userMembership?.role === 'owner';
  const canCreateRoom = isAdminUser || profile?.is_admin || false;
  const isMember = !!userMembership;
  const hasPendingRequest = joinRequests.includes(selectedRoom?.id || '');

  return (
    <div className="min-h-screen pt-16 flex">
      {/* Sidebar */}
      <div className="w-72 bg-bg2 border-r border-border flex-shrink-0 hidden md:flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-rajdhani font-bold text-lg text-text mb-1">Canais</h2>
            <p className="text-xs text-text3">{rooms.length} salas</p>
          </div>
          {user && (
            <button
              onClick={() => setShowCreateRequest(true)}
              className="w-8 h-8 rounded-lg bg-purple/15 border border-purple/30 flex items-center justify-center text-purple hover:bg-purple/25 transition-colors"
              title="Solicitar nova sala"
            >
              <Plus size={16} />
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-border2 border-t-purple rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {rooms.map(room => (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  selectedRoom?.id === room.id
                    ? 'bg-purple/15 text-text border border-purple/30'
                    : 'text-text2 hover:text-text hover:bg-bg3'
                }`}
              >
                {room.type === 'private' ? <Lock size={16} className="flex-shrink-0 text-amber" /> : <Hash size={16} className="flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{room.name}</div>
                  {room.description && (
                    <div className="text-xs text-text3 truncate">{room.description}</div>
                  )}
                </div>
                <span className="text-xs text-text3 flex items-center gap-1">
                  <Users size={12} />
                  {room.member_count || 0}
                </span>
              </button>
            ))}

            {rooms.length === 0 && (
              <div className="text-center py-8">
                <MessageCircle className="mx-auto mb-3 text-text3" size={32} />
                <p className="text-sm text-text3">Sem salas ainda</p>
                {user && (
                  <button
                    onClick={() => setShowCreateRequest(true)}
                    className="btn btn-ghost text-xs mt-4"
                  >
                    Solicitar primeira sala
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <>
            {/* Header */}
            <div className="h-14 bg-bg2 border-b border-border flex items-center px-4 gap-3">
              {selectedRoom.type === 'private' ? <Lock size={18} className="text-amber" /> : <Hash size={18} className="text-text3" />}
              <div className="flex-1">
                <span className="font-rajdhani font-semibold text-text">{selectedRoom.name}</span>
                {selectedRoom.type === 'private' && (
                  <span className="text-xs text-amber ml-2">· Privada</span>
                )}
                {selectedRoom.description && (
                  <span className="text-xs text-text3 ml-2">· {selectedRoom.description}</span>
                )}
              </div>
              <span className="text-xs text-text3 flex items-center gap-1">
                <Users size={12} />
                {roomMembers.length} membros
              </span>
            </div>

            {/* Private Room - Not Member */}
            {selectedRoom.type === 'private' && !isMember && user && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Lock size={48} className="mx-auto mb-4 text-amber" />
                  <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Sala Privada</h3>
                  <p className="text-sm text-text3 mb-4">Precisas de ser membro para ver as mensagens</p>
                  {hasPendingRequest ? (
                    <span className="text-sm text-amber">Pedido pendente...</span>
                  ) : (
                    <button
                      onClick={() => handleRequestJoin(selectedRoom.id)}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <UserPlus size={16} /> Pedir Entrada
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Private Room - Not Logged In */}
            {selectedRoom.type === 'private' && !user && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Lock size={48} className="mx-auto mb-4 text-amber" />
                  <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Sala Privada</h3>
                  <p className="text-sm text-text3 mb-4">Entra para pedir acesso</p>
                  <a href="/login" className="btn btn-primary">Entrar</a>
                </div>
              </div>
            )}

            {/* Messages - only show if member or public */}
            {(!selectedRoom.type || selectedRoom.type !== 'private' || isMember) && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-bg">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-text3 text-sm">
                      Sem mensagens ainda. Sê o primeiro a falar!
                    </div>
                  ) : (
                    messages.map(msg => {
                      const color = getUserColor(msg.username);
                      const member = roomMembers.find(m => m.user_id === msg.user_id);
                      return (
                        <div key={msg.id} className="flex gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold font-rajdhani flex-shrink-0 relative"
                            style={{
                              background: `rgba(var(--color-${color}-rgb), 0.2)`,
                              color: `var(--color-${color})`
                            }}
                          >
                            {msg.username.charAt(0).toUpperCase()}
                            {member?.role === 'owner' && (
                              <Crown size={10} className="absolute -top-1 -right-1 text-amber" />
                            )}
                            {member?.role === 'admin' && (
                              <Shield size={10} className="absolute -top-1 -right-1 text-purple2" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="text-sm font-semibold" style={{ color: `var(--color-${color})` }}>
                                {msg.username}
                              </span>
                              <span className="text-xs text-text3">{formatTime(msg.created_at)}</span>
                            </div>
                            <p className="text-sm text-text2 leading-relaxed">{msg.content}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-bg2 border-t border-border relative">
                  {user && isMember ? (
                    <div className="flex gap-3 relative">
                      {/* Emoji Picker */}
                      <div className="relative">
                        <button
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="w-10 h-10 rounded-lg bg-bg3 hover:bg-bg4 flex items-center justify-center transition-colors"
                        >
                          <Smile size={18} className="text-text2" />
                        </button>
                        {showEmojiPicker && (
                          <div className="absolute bottom-12 left-0 bg-bg3 border border-border rounded-xl p-2 grid grid-cols-10 gap-1 w-80 z-10">
                            {EMOJI_LIST.map((emoji, i) => (
                              <button
                                key={i}
                                onClick={() => insertEmoji(emoji)}
                                className="w-7 h-7 flex items-center justify-center hover:bg-bg4 rounded text-lg"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 relative">
                        <input
                          ref={inputRef}
                          type="text"
                          value={newMessage}
                          onChange={handleInputChange}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !showMentions) handleSend();
                          }}
                          placeholder="Escreve uma mensagem... (use @ para mencionar)"
                          className="input w-full pr-12"
                          disabled={sending}
                        />

                        {/* Mentions dropdown */}
                        {showMentions && filteredMentionUsers.length > 0 && (
                          <div className="absolute bottom-full left-0 right-0 mb-1 bg-bg3 border border-border rounded-xl overflow-hidden z-10">
                            {filteredMentionUsers.map(u => (
                              <button
                                key={u.id}
                                onClick={() => insertMention(u.username)}
                                className="w-full px-3 py-2 text-left hover:bg-bg4 text-sm text-text"
                              >
                                @{u.username}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || sending}
                        className="btn btn-primary py-3 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-3">
                      <p className="text-sm text-text3 mb-2">
                        {!user ? 'Precisas de estar logado para enviar mensagens' : 'Precisas de ser membro desta sala'}
                      </p>
                      {!user && (
                        <a href="/login" className="text-purple2 text-sm font-semibold hover:underline">
                          Entrar agora
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-text3">
            Seleciona uma sala para começar
          </div>
        )}
      </div>

      {/* Mobile Room Selector */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-bg2 border-t border-border p-3">
        <select
          value={selectedRoom?.id || ''}
          onChange={e => {
            const room = rooms.find(r => r.id === e.target.value);
            if (room) setSelectedRoom(room);
          }}
          className="w-full bg-bg3 border border-border2 rounded-lg px-3 py-2 text-sm text-text"
        >
          {rooms.map(room => (
            <option key={room.id} value={room.id}>
              {room.type === 'private' ? '🔒' : '#'} {room.name} ({room.member_count || 0})
            </option>
          ))}
        </select>
      </div>

      {/* Create Room Request Modal */}
      {showCreateRequest && (
        <CreateRoomRequestModal
          canCreateDirect={canCreateRoom}
          onClose={() => setShowCreateRequest(false)}
          onSuccess={room => {
            if (room && canCreateRoom) {
              setRooms(prev => [...prev, room]);
              setSelectedRoom(room);
            }
            setShowCreateRequest(false);
            showToast(
              canCreateRoom
                ? 'Sala criada com sucesso!'
                : 'Pedido enviado! Aguarda aprovação do admin.',
              'success'
            );
          }}
        />
      )}
    </div>
  );
}

function CreateRoomRequestModal({
  canCreateDirect,
  onClose,
  onSuccess
}: {
  canCreateDirect: boolean;
  onClose: () => void;
  onSuccess: (room: ChatRoom | null) => void;
}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [roomType, setRoomType] = useState<'public' | 'private'>('public');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user || name.length < 3) return;

    setLoading(true);
    try {
      if (canCreateDirect) {
        const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        const { data: room, error } = await supabase
          .from('chat_rooms')
          .insert({
            name,
            slug: slug + '-' + Date.now(),
            description,
            type: roomType,
            created_by: user.id
          })
          .select()
          .single();

        if (error) throw error;

        await supabase.from('chat_room_members').insert({
          room_id: room.id,
          user_id: user.id,
          role: 'owner'
        });

        onSuccess({ ...room, member_count: 1 });
      } else {
        const { error } = await supabase.from('chat_room_requests').insert({
          requester_id: user.id,
          room_name: name,
          room_description: description
        });

        if (error) throw error;

        onSuccess(null);
      }
      onClose();
    } catch {
      showToast('Erro', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg2 border border-border rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-rajdhani font-bold text-xl text-text">
            {canCreateDirect ? 'Criar Nova Sala' : 'Solicitar Nova Sala'}
          </h2>
          <button onClick={onClose} className="text-text3 hover:text-text">
            <X size={20} />
          </button>
        </div>

        {!canCreateDirect && (
          <div className="bg-amber/10 border border-amber/30 rounded-xl px-4 py-3 text-sm text-amber mb-4">
            O teu pedido será enviado para aprovação do admin.
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold tracking-wide uppercase text-text3 mb-2">
              Nome da Sala
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ex: Fãs de Demon Slayer"
              className="input"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wide uppercase text-text3 mb-2">
              Descrição (opcional)
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Breve descrição da sala"
              className="input"
              maxLength={100}
            />
          </div>

          {canCreateDirect && (
            <div>
              <label className="block text-xs font-semibold tracking-wide uppercase text-text3 mb-2">
                Tipo
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRoomType('public')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                    roomType === 'public'
                      ? 'bg-purple/15 text-purple border border-purple/30'
                      : 'bg-bg3 text-text2 hover:text-text'
                  }`}
                >
                  Pública
                </button>
                <button
                  type="button"
                  onClick={() => setRoomType('private')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                    roomType === 'private'
                      ? 'bg-amber/15 text-amber border border-amber/30'
                      : 'bg-bg3 text-text2 hover:text-text'
                  }`}
                >
                  Privada
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn btn-ghost flex-1 justify-center">
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={name.length < 3 || loading}
              className="btn btn-primary flex-1 justify-center disabled:opacity-50"
            >
              {loading ? 'Enviando...' : canCreateDirect ? 'Criar Sala' : 'Enviar Pedido'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
