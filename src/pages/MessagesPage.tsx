import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { Link } from 'react-router-dom';

interface PrivateChat {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_at: string;
  created_at: string;
}

interface PrivateMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  username: string;
  avatar_url: string;
  province: string;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [chats, setChats] = useState<PrivateChat[]>([]);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [newChatUserId, setNewChatUserId] = useState('');
  const [creating, setCreating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  async function loadChats() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('private_chats')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });
    const list = (data || []) as PrivateChat[];
    setChats(list);

    const otherIds = list.map((c) => (c.user1_id === user.id ? c.user2_id : c.user1_id));
    if (otherIds.length) {
      const { data: pData } = await supabase.from('profiles').select('*').in('id', otherIds);
      const pMap: Record<string, Profile> = {};
      (pData || []).forEach((p) => {
        pMap[p.id] = p as Profile;
      });
      setProfiles(pMap);
    }

    // Count unread per chat
    const unread: Record<string, number> = {};
    for (const chat of list) {
      const { count } = await supabase
        .from('private_messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', chat.id)
        .neq('sender_id', user.id)
        .is('read_at', null);
      unread[chat.id] = count || 0;
    }
    setUnreadMap(unread);
    setLoading(false);
  }

  async function loadMessages(chatId: string) {
    if (!user) return;
    const { data } = await supabase
      .from('private_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    const list = (data || []) as PrivateMessage[];
    setMessages(list);

    // Mark messages as read
    const unreadIds = list.filter((m) => m.sender_id !== user.id && !m.read_at).map((m) => m.id);
    if (unreadIds.length) {
      await supabase.from('private_messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds);
    }
    setUnreadMap((prev) => ({ ...prev, [chatId]: 0 }));
  }

  useEffect(() => {
    loadChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (activeChat) {
      loadMessages(activeChat);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChat]);

  useEffect(() => {
    if (!user) return;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    const channel = supabase
      .channel('private_messages_global')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'private_messages' },
        (payload) => {
          const msg = payload.new as PrivateMessage;
          if (msg.chat_id === activeChat) {
            setMessages((prev) => [...prev, msg]);
            if (msg.sender_id !== user.id) {
              supabase
                .from('private_messages')
                .update({ read_at: new Date().toISOString() })
                .eq('id', msg.id)
                .then(() => {
                  setUnreadMap((prev) => ({ ...prev, [msg.chat_id]: 0 }));
                });
            }
          } else {
            setUnreadMap((prev) => {
              const current = prev[msg.chat_id] || 0;
              if (msg.sender_id !== user.id) {
                return { ...prev, [msg.chat_id]: current + 1 };
              }
              return prev;
            });
            // Refresh last_message_at in chats
            loadChats();
          }
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
  }, [user, activeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!user || !activeChat || !messageInput.trim()) return;
    setSending(true);
    const { error } = await supabase.from('private_messages').insert({
      chat_id: activeChat,
      sender_id: user.id,
      content: messageInput.trim(),
    });
    if (!error) {
      await supabase
        .from('private_chats')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', activeChat);
      setMessageInput('');
    }
    setSending(false);
  }

  async function handleCreateChat() {
    if (!user || !newChatUserId.trim()) return;
    setCreating(true);
    const otherId = newChatUserId.trim();
    if (otherId === user.id) {
      setCreating(false);
      return;
    }
    const { data: existing } = await supabase
      .from('private_chats')
      .select('*')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${otherId}),and(user1_id.eq.${otherId},user2_id.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      setActiveChat((existing as PrivateChat).id);
      setNewChatUserId('');
      setCreating(false);
      return;
    }

    const { data: newChat } = await supabase
      .from('private_chats')
      .insert({ user1_id: user.id, user2_id: otherId })
      .select()
      .single();

    if (newChat) {
      setActiveChat((newChat as PrivateChat).id);
      setNewChatUserId('');
      await loadChats();
    }
    setCreating(false);
  }

  const activeChatData = useMemo(() => chats.find((c) => c.id === activeChat), [chats, activeChat]);
  const otherUser = useMemo(() => {
    if (!activeChatData || !user) return null;
    const otherId = activeChatData.user1_id === user.id ? activeChatData.user2_id : activeChatData.user1_id;
    return profiles[otherId];
  }, [activeChatData, profiles, user]);

  return (
    <div className="min-h-screen bg-bg text-text p-4 md:p-6">
      <div className="max-w-6xl mx-auto h-[calc(100vh-3rem)] flex flex-col md:flex-row gap-4">
        {/* Sidebar */}
        <div className="w-full md:w-80 bg-bg2 border border-border rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-xl font-bebas text-text">Conversas</h2>
            <button
              onClick={() => setCreating(true)}
              className="text-sm bg-purple text-white px-3 py-1.5 rounded-lg font-rajdhani font-semibold hover:opacity-90 transition"
            >
              Nova
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-text3 font-rajdhani">Carregando...</div>
            ) : chats.length === 0 ? (
              <div className="p-4 text-center text-text3 font-rajdhani">Nenhuma conversa.</div>
            ) : (
              chats.map((chat) => {
                const otherId = chat.user1_id === user?.id ? chat.user2_id : chat.user1_id;
                const p = profiles[otherId];
                const isActive = chat.id === activeChat;
                const unread = unreadMap[chat.id] || 0;
                return (
                  <button
                    key={chat.id}
                    onClick={() => setActiveChat(chat.id)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-border transition ${
                      isActive ? 'bg-bg3' : 'hover:bg-bg3/50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-bg3 flex items-center justify-center text-sm font-bebas text-text2 overflow-hidden flex-shrink-0">
                      {p?.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-10 h-10 object-cover" />
                      ) : (
                        (p?.username || '?').slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-rajdhani font-semibold text-text truncate">
                          {p?.username || 'Usuário'}
                        </span>
                        {unread > 0 && (
                          <span className="ml-2 bg-purple text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {unread}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text3 font-rajdhani truncate">
                        {new Date(chat.last_message_at).toLocaleString()}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 bg-bg2 border border-border rounded-2xl flex flex-col overflow-hidden">
          {activeChat && otherUser ? (
            <>
              <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-bg3 flex items-center justify-center text-sm font-bebas text-text2 overflow-hidden">
                  {otherUser.avatar_url ? (
                    <img src={otherUser.avatar_url} alt="" className="w-9 h-9 object-cover" />
                  ) : (
                    otherUser.username.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <Link
                    to={`/profile/${otherUser.id}`}
                    className="font-rajdhani font-semibold text-text hover:text-purple transition"
                  >
                    {otherUser.username}
                  </Link>
                  <p className="text-xs text-text3 font-rajdhani">{otherUser.province}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
                {messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[70%] px-4 py-2 rounded-xl text-sm font-rajdhani ${
                          isMe ? 'bg-purple text-white rounded-br-none' : 'bg-bg3 text-text rounded-bl-none'
                        }`}
                      >
                        <p>{msg.content}</p>
                        <p className={`text-xs mt-1 ${isMe ? 'text-purple2' : 'text-text3'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="px-4 py-3 border-t border-border flex items-center gap-2">
                <input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Escreva uma mensagem..."
                  className="flex-1 bg-bg3 border border-border rounded-xl px-4 py-2 text-text font-rajdhani focus:outline-none focus:border-purple"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !messageInput.trim()}
                  className="bg-purple text-white px-4 py-2 rounded-xl font-rajdhani font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {sending ? '...' : 'Enviar'}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-text3 font-rajdhani">
              Selecione uma conversa ou inicie uma nova.
            </div>
          )}
        </div>
      </div>

      {creating && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-bg2 border border-border rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bebas text-text">Iniciar conversa</h2>
              <button onClick={() => setCreating(false)} className="text-text3 hover:text-text">
                ✕
              </button>
            </div>
            <p className="text-sm text-text2 font-rajdhani mb-3">
              Insira o ID do usuário para iniciar uma conversa.
            </p>
            <input
              value={newChatUserId}
              onChange={(e) => setNewChatUserId(e.target.value)}
              placeholder="ID do usuário"
              className="w-full bg-bg3 border border-border rounded-xl px-4 py-2 text-text font-rajdhani focus:outline-none focus:border-purple mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCreating(false)}
                className="px-4 py-2 rounded-xl border border-border text-text2 font-rajdhani hover:border-text2 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateChat}
                disabled={creating || !newChatUserId.trim()}
                className="px-4 py-2 rounded-xl bg-purple text-white font-rajdhani font-semibold hover:opacity-90 transition disabled:opacity-50"
              >
                {creating ? '...' : 'Iniciar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
