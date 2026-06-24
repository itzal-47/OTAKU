import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Search, Users, Hash, Swords, MessageCircle } from 'lucide-react';
import { CLASS_INFO, type CharacterClass } from '../types/index';

type SearchType = 'all' | 'users' | 'rooms' | 'posts';

interface UserResult {
  id: string;
  username: string;
  province?: string;
  character?: {
    name: string;
    class: CharacterClass;
    level: number;
  };
}

interface RoomResult {
  id: string;
  name: string;
  description?: string;
  member_count: number;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('all');
  const [users, setUsers] = useState<UserResult[]>([]);
  const [rooms, setRooms] = useState<RoomResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const delay = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch();
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [query, searchType]);

  async function performSearch() {
    if (query.trim().length < 2) return;

    setLoading(true);
    setSearched(true);

    try {
      const searchTerm = query.trim().toLowerCase();

      // Search users
      if (searchType === 'all' || searchType === 'users') {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, province')
          .ilike('username', `%${searchTerm}%`)
          .limit(10);

        if (profilesData && profilesData.length > 0) {
          const userIds = profilesData.map(p => p.id);
          const { data: charsData } = await supabase
            .from('characters')
            .select('user_id, name, class, level')
            .in('user_id', userIds);

          const usersWithChars: UserResult[] = profilesData.map(p => ({
            id: p.id,
            username: p.username,
            province: p.province,
            character: charsData?.find(c => c.user_id === p.id)
          }));

          setUsers(usersWithChars);
        } else {
          setUsers([]);
        }
      }

      // Search rooms
      if (searchType === 'all' || searchType === 'rooms') {
        const { data: roomsData } = await supabase
          .from('chat_rooms')
          .select('id, name, description, created_by')
          .ilike('name', `%${searchTerm}%`)
          .limit(10);

        if (roomsData) {
          const roomsWithCounts = await Promise.all(
            roomsData.map(async room => {
              const { count } = await supabase
                .from('chat_room_members')
                .select('*', { count: 'exact', head: true })
                .eq('room_id', room.id);
              return { ...room, member_count: count || 0 };
            })
          );
          setRooms(roomsWithCounts);
        } else {
          setRooms([]);
        }
      }

    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }

  const hasResults = users.length > 0 || rooms.length > 0;

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text3" size={20} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar usuários, salas..."
            className="input pl-12 py-4 text-lg"
            autoFocus
          />
        </div>

        {/* Type Filter */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'all', label: 'Todos', icon: Search },
            { id: 'users', label: 'Usuários', icon: Users },
            { id: 'rooms', label: 'Salas', icon: Hash },
          ].map(type => (
            <button
              key={type.id}
              onClick={() => setSearchType(type.id as SearchType)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                searchType === type.id
                  ? 'bg-purple/20 text-purple2 border border-purple/30'
                  : 'text-text3 hover:text-text hover:bg-bg3 border border-transparent'
              }`}
            >
              <type.icon size={16} />
              {type.label}
            </button>
          ))}
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-10 h-10 border-2 border-border2 border-t-purple rounded-full animate-spin" />
          </div>
        ) : !searched ? (
          <div className="text-center py-16 text-text3">
            <Search className="mx-auto mb-4 opacity-30" size={48} />
            <p>Digita pelo menos 2 caracteres para buscar</p>
          </div>
        ) : !hasResults ? (
          <div className="text-center py-16 text-text3">
            <Search className="mx-auto mb-4 opacity-30" size={48} />
            <p className="font-rajdhani font-bold text-xl text-text mb-2">Nenhum resultado</p>
            <p className="text-sm">Tenta outros termos de busca</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Users */}
            {(searchType === 'all' || searchType === 'users') && users.length > 0 && (
              <div>
                <h2 className="font-rajdhani font-bold text-lg text-text mb-3 flex items-center gap-2">
                  <Users size={18} /> Usuários
                </h2>
                <div className="space-y-2">
                  {users.map(user => (
                    <Link
                      key={user.id}
                      to={`/perfil/${user.username}`}
                      className="flex items-center gap-3 bg-bg2 border border-border rounded-xl p-4 hover:border-purple/40 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple to-red flex items-center justify-center text-lg font-bold">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-rajdhani font-bold text-text">@{user.username}</div>
                        {user.character ? (
                          <div className="text-xs text-text3 flex items-center gap-2">
                            <span>{CLASS_INFO[user.character.class as CharacterClass]?.emoji}</span>
                            <span>{user.character.name}</span>
                            <span>·</span>
                            <span>Nv. {user.character.level}</span>
                          </div>
                        ) : user.province ? (
                          <div className="text-xs text-text3">📍 {user.province}</div>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Rooms */}
            {(searchType === 'all' || searchType === 'rooms') && rooms.length > 0 && (
              <div>
                <h2 className="font-rajdhani font-bold text-lg text-text mb-3 flex items-center gap-2">
                  <Hash size={18} /> Salas de Chat
                </h2>
                <div className="space-y-2">
                  {rooms.map(room => (
                    <Link
                      key={room.id}
                      to="/chat"
                      className="flex items-center gap-3 bg-bg2 border border-border rounded-xl p-4 hover:border-purple/40 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-xl bg-teal/15 flex items-center justify-center">
                        <MessageCircle className="text-teal" size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="font-rajdhani font-bold text-text">{room.name}</div>
                        {room.description && (
                          <div className="text-xs text-text3 truncate">{room.description}</div>
                        )}
                      </div>
                      <div className="text-xs text-text3 flex items-center gap-1">
                        <Users size={12} />
                        {room.member_count}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}