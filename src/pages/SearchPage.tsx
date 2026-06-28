import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Search, UserPlus, UserCheck, Loader2, MapPin } from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  province: string | null;
  title: string | null;
}

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const { user } = useAuth();

  // Carrega perfis iniciais (sugestões) ou filtra por termo
  useEffect(() => {
    async function fetchProfiles() {
      setLoading(true);
      try {
        let query = supabase
          .from('profiles')
          .select('id, username, avatar_url, province, title');

        if (searchTerm.trim()) {
          // Busca parcial e insensível a maiúsculas/minúsculas
          query = query.ilike('username', `%${searchTerm}%`);
        } else {
          // Se vazio, traz os últimos 15 usuários ativos/criados
          query = query.order('created_at', { ascending: false }).limit(15);
        }

        // Evita mostrar o próprio usuário logado na busca
        if (user) {
          query = query.neq('id', user.id);
        }

        const { data, error } = await query;
        if (error) throw error;
        setProfiles(data || []);
      } catch (err) {
        console.error('Erro ao buscar perfis:', err);
      } finally {
        setLoading(false);
      }
    }

    // Debounce simples para não sobrecarregar o banco a cada letra digitada
    const delayDebounce = setTimeout(() => {
      fetchProfiles();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm, user]);

  // Carrega a lista de quem o usuário já segue
  useEffect(() => {
    if (!user) return;
    async function fetchFollowing() {
      const { data } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);
      
      if (data) {
        setFollowingIds(data.map(f => f.following_id));
      }
    }
    fetchFollowing();
  }, [user]);

  async function toggleFollow(targetId: string) {
    if (!user) return;
    const isFollowing = followingIds.includes(targetId);

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetId);
        setFollowingIds(prev => prev.filter(id => id !== targetId));
      } else {
        await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: targetId });
        setFollowingIds(prev => [...prev, targetId]);
      }
    } catch (err) {
      console.error('Erro ao processar follow:', err);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Descobrir Kambas</h1>
        <p className="text-gray-400">Encontre novos otakus em Angola e faça conexões.</p>
      </div>

      {/* Barra de Busca */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Pesquisar por nome de usuário..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-800 text-white pl-12 pr-4 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 transition-colors"
        />
      </div>

      {/* Resultados / Sugestões */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
        </div>
      ) : (
        <>
          <h2 className="text-xl font-semibold text-gray-300 mb-4">
            {searchTerm.trim() ? 'Resultados da Pesquisa' : 'Recomendados para Você'}
          </h2>
          
          {profiles.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhum Kamba encontrado.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="bg-slate-800/50 border border-slate-700/60 p-4 rounded-xl flex items-center justify-between hover:border-slate-600 transition-colors"
                >
                  <Link to={`/profile/${profile.id}`} className="flex items-center space-x-4 flex-1">
                    <img
                      src={profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.username}`}
                      alt={profile.username}
                      className="w-12 h-12 rounded-full border border-amber-500/20 bg-slate-900"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-white hover:text-amber-400 transition-colors">
                          {profile.username}
                        </span>
                        {profile.title && (
                          <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
                            {profile.title}
                          </span>
                        )}
                      </div>
                      {profile.province && (
                        <div className="flex items-center text-xs text-gray-400 mt-1">
                          <MapPin className="w-3 h-3 mr-1 text-red-400" />
                          {profile.province}
                        </div>
                      )}
                    </div>
                  </Link>

                  {user && (
                    <button
                      onClick={() => toggleFollow(profile.id)}
                      className={`btn btn-sm ${
                        followingIds.includes(profile.id)
                          ? 'bg-slate-700 text-gray-300 border-none hover:bg-red-500/20 hover:text-red-400'
                          : 'bg-amber-500 text-slate-950 border-none hover:bg-amber-400'
                      }`}
                    >
                      {followingIds.includes(profile.id) ? (
                        <>
                          <UserCheck className="w-4 h-4 mr-1" /> Segor
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-1" /> Seguir
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
