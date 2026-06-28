
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { MessageSquare, Users, Hash } from 'lucide-react';

interface ChatRoom {
  id: string;
  name: string;
  type: 'public' | 'private';
  member_count?: number;
}

interface ActiveChat {
  id: string;
  user_id: string;
  username: string;
  avatar: string;
  last_message: string;
  unread: number;
}

export default function ChatSidebar() {
  const { user, profile } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeChats, setActiveChats] = useState<ActiveChat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadChatSidebar();
  }, [user]);

  async function loadChatSidebar() {
    setLoading(true);
    try {
      // Load public chat rooms
      const { data: roomsData } = await supabase
        .from('chat_rooms')
        .select('id, name, type')
        .eq('type', 'public')
        .order('name', { ascending: true })
        .limit(10);

      if (roomsData) {
        const roomsWithCounts = await Promise.all(roomsData.map(async (room) => {
          const { count } = await supabase
            .from('chat_room_members')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id);
          return { ...room, member_count: count || 0 };
        }));
        setRooms(roomsWithCounts);
      }

      // Load recent private chats
      const { data: chatsData } = await supabase
        .from('private_chats')
        .select('id, user1_id, user2_id, last_message_at')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false })
        .limit(5);

      if (chatsData && chatsData.length > 0) {
        const formattedChats = await Promise.all(chatsData.map(async (chat) => {
          const otherUserId = chat.user1_id === user.id ? chat.user2_id : chat.user1_id;
          const { data: otherProfile } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('id', otherUserId)
            .maybeSingle();

          const { count: unreadCount } = await supabase
            .from('private_messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chat.id)
            .eq('sender_id', otherUserId)
            .is('read_at', null);

          const { data: lastMsg } = await supabase
            .from('private_messages')
            .select('content')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            id: chat.id,
            user_id: otherUserId,
            username: otherProfile?.username || 'Unknown',
            avatar: otherProfile?.avatar_url || '',
            last_message: lastMsg?.content || 'Sem mensagens',
            unread: unreadCount || 0
          };
        }));
        setActiveChats(formattedChats);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="hidden lg:flex flex-col w-72 border-l border-border bg-bg2 h-[calc(100vh-4rem)] sticky top-16 overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="font-rajdhani font-bold text-lg text-text flex items-center gap-2">
          <MessageSquare size={18} className="text-purple2" />
          Chat
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Active Private Chats */}
        {activeChats.length > 0 && (
          <div className="p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text3 mb-2 px-2">
              Conversas
            </h3>
            {activeChats.map(chat => (
              <Link
                key={chat.id}
                to={`/messages?chat=${chat.id}`}
                className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-bg3 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple to-red flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {chat.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text group-hover:text-purple2 truncate">
                    {chat.username}
                  </div>
                  <div className="text-xs text-text3 truncate">
                    {chat.last_message}
                  </div>
                </div>
                {chat.unread > 0 && (
                  <div className="w-5 h-5 rounded-full bg-purple text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {chat.unread}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}

        {/* Public Chat Rooms */}
        <div className="p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text3 mb-2 px-2">
            Salas
          </h3>
          {rooms.map(room => (
            <Link
              key={room.id}
              to={`/chat`}
              className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-bg3 transition-colors group"
              onClick={() => {
                // Set selected room in sessionStorage for the ChatPage to pick up
                sessionStorage.setItem('selected_room_id', room.id);
              }}
            >
              <div className="w-8 h-8 rounded-lg bg-bg3 border border-border flex items-center justify-center flex-shrink-0">
                <Hash size={14} className="text-text3" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-text group-hover:text-purple2 truncate">
                  {room.name}
                </div>
                <div className="text-xs text-text3 flex items-center gap-1">
                  <Users size={10} />
                  {room.member_count || 0}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Link to all messages */}
      <div className="p-3 border-t border-border">
        <Link
          to="/messages"
          className="btn btn-ghost w-full justify-center text-sm text-text3 hover:text-text"
        >
          Ver todas as mensagens
        </Link>
      </div>
    </div>
  );
}
