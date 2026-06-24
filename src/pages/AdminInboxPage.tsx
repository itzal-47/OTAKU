import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { Link } from 'react-router-dom';

interface AdminInbox {
  id: string;
  sender_id: string;
  sender_name: string;
  message_type: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface AdminRequest {
  id: string;
  user_id: string;
  request_reason: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  username: string;
  avatar_url: string;
  province: string;
  is_admin: boolean;
  is_super_admin: boolean;
}

const TABS = ['Inbox', 'Solicitações'] as const;
type Tab = (typeof TABS)[number];

export default function AdminInboxPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [inbox, setInbox] = useState<AdminInbox[]>([]);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('Inbox');
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function loadProfile() {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) setProfile(data as Profile);
  }

  async function loadInbox() {
    const { data } = await supabase.from('admin_inbox').select('*').order('created_at', { ascending: false });
    setInbox((data || []) as AdminInbox[]);
  }

  async function loadRequests() {
    const { data } = await supabase.from('admin_requests').select('*').order('created_at', { ascending: false });
    const list = (data || []) as AdminRequest[];
    setRequests(list);

    const userIds = [...new Set(list.map((r) => r.user_id))];
    if (userIds.length) {
      const { data: pData } = await supabase.from('profiles').select('*').in('id', userIds);
      const pMap: Record<string, Profile> = {};
      (pData || []).forEach((p) => {
        pMap[p.id] = p as Profile;
      });
      setProfiles((prev) => ({ ...prev, ...pMap }));
    }
  }

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadProfile(), loadInbox(), loadRequests()]);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const inboxChannel = supabase
      .channel('admin_inbox_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_inbox' },
        () => loadInbox()
      )
      .subscribe();
    const reqChannel = supabase
      .channel('admin_requests_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_requests' },
        () => loadRequests()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(inboxChannel);
      supabase.removeChannel(reqChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleMarkRead(inboxId: string) {
    await supabase.from('admin_inbox').update({ is_read: true }).eq('id', inboxId);
    loadInbox();
  }

  async function handleDeleteInbox(inboxId: string) {
    await supabase.from('admin_inbox').delete().eq('id', inboxId);
    loadInbox();
  }

  async function handleApproveRequest(reqId: string, userId: string) {
    if (!user) return;
    setProcessingId(reqId);
    await supabase.from('admin_requests').update({ status: 'approved', reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq('id', reqId);
    await supabase.from('profiles').update({ is_admin: true }).eq('id', userId);
    setProcessingId(null);
    loadRequests();
  }

  async function handleRejectRequest(reqId: string) {
    if (!user) return;
    setProcessingId(reqId);
    await supabase.from('admin_requests').update({ status: 'rejected', reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq('id', reqId);
    setProcessingId(null);
    loadRequests();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-text p-6 flex items-center justify-center font-rajdhani">
        Carregando...
      </div>
    );
  }

  if (!profile?.is_super_admin) {
    return (
      <div className="min-h-screen bg-bg text-text p-6 text-center font-rajdhani">
        Acesso negado. Apenas super administradores podem acessar esta página.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bebas tracking-wide text-text mb-6">Painel Administrativo</h1>

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
              {tab === 'Inbox' && inbox.some((i) => !i.is_read) && (
                <span className="ml-2 bg-purple text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {inbox.filter((i) => !i.is_read).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'Inbox' && (
          <div className="flex flex-col gap-3">
            {inbox.length === 0 ? (
              <div className="text-center text-text3 font-rajdhani py-8">Nenhuma mensagem no inbox.</div>
            ) : (
              inbox.map((msg) => (
                <div
                  key={msg.id}
                  className={`bg-bg2 border rounded-2xl p-4 ${
                    msg.is_read ? 'border-border' : 'border-purple'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-rajdhani font-semibold text-text">
                          {msg.sender_name || 'Usuário'}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-bg3 text-text2 font-rajdhani">
                          {msg.message_type}
                        </span>
                        {!msg.is_read && (
                          <span className="text-xs text-purple font-rajdhani">Não lida</span>
                        )}
                      </div>
                      <p className="text-sm text-text2 font-rajdhani whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-xs text-text3 font-rajdhani mt-2">
                        {new Date(msg.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!msg.is_read && (
                        <button
                          onClick={() => handleMarkRead(msg.id)}
                          className="text-xs text-teal font-rajdhani hover:underline"
                        >
                          Marcar como lida
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteInbox(msg.id)}
                        className="text-xs text-red font-rajdhani hover:underline"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'Solicitações' && (
          <div className="flex flex-col gap-3">
            {requests.length === 0 ? (
              <div className="text-center text-text3 font-rajdhani py-8">Nenhuma solicitação.</div>
            ) : (
              requests.map((req) => {
                const p = profiles[req.user_id];
                const isPending = req.status === 'pending';
                return (
                  <div key={req.id} className="bg-bg2 border border-border rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-bg3 flex items-center justify-center text-sm font-bebas text-text2 overflow-hidden flex-shrink-0">
                          {p?.avatar_url ? (
                            <img src={p.avatar_url} alt="" className="w-10 h-10 object-cover" />
                          ) : (
                            (p?.username || '?').slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Link
                              to={`/profile/${req.user_id}`}
                              className="font-rajdhani font-semibold text-text hover:text-purple transition"
                            >
                              {p?.username || 'Usuário'}
                            </Link>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-md font-rajdhani ${
                                req.status === 'pending'
                                  ? 'bg-yellow-900/30 text-amber'
                                  : req.status === 'approved'
                                  ? 'bg-green-900/30 text-teal'
                                  : 'bg-red-900/30 text-red'
                              }`}
                            >
                              {req.status}
                            </span>
                          </div>
                          <p className="text-sm text-text2 font-rajdhani whitespace-pre-wrap">
                            {req.request_reason}
                          </p>
                          <p className="text-xs text-text3 font-rajdhani mt-2">
                            {new Date(req.created_at).toLocaleString()}
                            {req.reviewed_at && (
                              <span> · Revisado em {new Date(req.reviewed_at).toLocaleString()}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      {isPending && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleApproveRequest(req.id, req.user_id)}
                            disabled={processingId === req.id}
                            className="text-sm bg-teal text-white px-3 py-1.5 rounded-lg font-rajdhani font-semibold hover:opacity-90 transition disabled:opacity-50"
                          >
                            Aprovar
                          </button>
                          <button
                            onClick={() => handleRejectRequest(req.id)}
                            disabled={processingId === req.id}
                            className="text-sm bg-red text-white px-3 py-1.5 rounded-lg font-rajdhani font-semibold hover:opacity-90 transition disabled:opacity-50"
                          >
                            Rejeitar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
