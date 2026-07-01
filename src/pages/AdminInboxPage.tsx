import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { handleError } from '../lib/errorHandler';
import { SkeletonAvatarLineList } from '../components/Skeleton';
import { Check, X, Mail, Clock, AlertCircle } from 'lucide-react';

interface AdminInbox {
  id: string; sender_id: string; sender_name: string; message_type: string;
  content: string; is_read: boolean; created_at: string;
}

interface AdminRequest {
  id: string; user_id: string; request_reason: string; status: string; created_at: string;
  profile?: { username: string; avatar_url?: string };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  return `${d}d`;
}

export default function AdminInboxPage() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [inbox, setInbox] = useState<AdminInbox[]>([]);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const inboxChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reqChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  async function loadInbox() {
    try {
      const { data } = await supabase.from('admin_inbox').select('*').order('created_at', { ascending: false });
      setInbox(data || []);
    } catch (err) {
      handleError(err, showToast, { context: 'carregar inbox', silent: true });
    }
  }

  async function loadRequests() {
    try {
      const { data } = await supabase.from('admin_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false });
      if (data && data.length > 0) {
        // Busca usernames de todos os requerentes de uma vez
        const ids = data.map(r => r.user_id);
        const { data: profs } = await supabase.from('profiles').select('id, username, avatar_url').in('id', ids);
        setRequests(data.map(r => ({ ...r, profile: profs?.find(p => p.id === r.user_id) })));
      } else {
        setRequests([]);
      }
    } catch (err) {
      handleError(err, showToast, { context: 'carregar pedidos', silent: true });
    }
  }

  useEffect(() => {
    if (inboxChannelRef.current) { supabase.removeChannel(inboxChannelRef.current); inboxChannelRef.current = null; }
    if (reqChannelRef.current) { supabase.removeChannel(reqChannelRef.current); reqChannelRef.current = null; }

    inboxChannelRef.current = supabase.channel('admin_inbox_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_inbox' }, loadInbox).subscribe();
    reqChannelRef.current = supabase.channel('admin_requests_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_requests' }, loadRequests).subscribe();

    return () => {
      if (inboxChannelRef.current) supabase.removeChannel(inboxChannelRef.current);
      if (reqChannelRef.current) supabase.removeChannel(reqChannelRef.current);
    };
  }, []);

  useEffect(() => {
    if (user && (profile?.is_super_admin || profile?.role === 'supreme_admin')) {
      Promise.all([loadInbox(), loadRequests()]).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user?.id, profile?.role]);

  async function handleRequest(requestId: string, approve: boolean) {
    setProcessingId(requestId);
    try {
      const { error } = await supabase.from('admin_requests').update({
        status: approve ? 'approved' : 'rejected',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      }).eq('id', requestId);
      if (error) throw error;
      showToast(approve ? 'Pedido aprovado!' : 'Pedido rejeitado', approve ? 'success' : 'info');
      loadRequests();
    } catch (err) {
      handleError(err, showToast, { context: approve ? 'aprovar pedido' : 'rejeitar pedido' });
    } finally {
      setProcessingId(null);
    }
  }

  async function handleMarkRead(msgId: string) {
    setMarkingId(msgId);
    try {
      await supabase.from('admin_inbox').update({ is_read: true }).eq('id', msgId);
      setInbox(prev => prev.map(m => m.id === msgId ? { ...m, is_read: true } : m));
    } catch (err) {
      handleError(err, showToast, { context: 'marcar como lida', silent: true });
    } finally {
      setMarkingId(null);
    }
  }

  async function handleMarkAllRead() {
    try {
      await supabase.from('admin_inbox').update({ is_read: true }).eq('is_read', false);
      setInbox(prev => prev.map(m => ({ ...m, is_read: true })));
      showToast('Todas marcadas como lidas', 'success');
    } catch (err) {
      handleError(err, showToast, { context: 'marcar todas como lidas' });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-20 pb-12 px-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="h-8 w-48 bg-bg2 rounded-lg animate-pulse" />
          <SkeletonAvatarLineList count={4} />
        </div>
      </div>
    );
  }

  if (!(profile?.is_super_admin || profile?.role === 'supreme_admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="text-center">
          <AlertCircle size={36} className="mx-auto mb-3 text-red" />
          <h1 className="font-bebas text-3xl text-text mb-2">Acesso Negado</h1>
          <p className="text-text3 text-sm">Precisas de ser Supreme Admin para aceder a esta página.</p>
        </div>
      </div>
    );
  }

  const unreadCount = inbox.filter(m => !m.is_read).length;

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-bebas text-3xl text-text">Inbox Admin</h1>
            <p className="text-text3 text-sm mt-0.5">{unreadCount > 0 ? `${unreadCount} mensagem${unreadCount > 1 ? 's' : ''} não lida${unreadCount > 1 ? 's' : ''}` : 'Tudo em dia'}</p>
          </div>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="btn btn-ghost text-xs py-2">Marcar todas como lidas</button>
          )}
        </div>

        {/* Pending Requests */}
        <div className="mb-8">
          <h2 className="font-rajdhani font-bold text-lg text-text mb-3 flex items-center gap-2">
            Pedidos Pendentes
            {requests.length > 0 && <span className="px-2 py-0.5 rounded-full bg-red/15 text-red text-xs font-bold">{requests.length}</span>}
          </h2>
          {requests.length === 0 ? (
            <div className="text-center py-8 bg-bg2 border border-border rounded-2xl">
              <Check size={28} className="mx-auto mb-2 text-teal" />
              <p className="text-text3 text-sm">Sem pedidos pendentes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(req => (
                <div key={req.id} className="bg-bg2 border border-border rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-bg3 flex items-center justify-center text-sm font-bold text-text2 flex-shrink-0">
                        {req.profile?.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="font-semibold text-text text-sm">{req.profile?.username || req.user_id}</div>
                        <div className="text-xs text-text3 mt-0.5">{req.request_reason}</div>
                        <div className="text-[10px] text-text3 mt-1 flex items-center gap-1"><Clock size={9} /> {timeAgo(req.created_at)}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => handleRequest(req.id, true)} disabled={processingId === req.id} className="btn btn-primary text-xs py-1.5 px-3 disabled:opacity-50">
                        <Check size={12} /> Aprovar
                      </button>
                      <button onClick={() => handleRequest(req.id, false)} disabled={processingId === req.id} className="btn btn-ghost text-xs py-1.5 px-3 text-red disabled:opacity-50">
                        <X size={12} /> Rejeitar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inbox Messages */}
        <div>
          <h2 className="font-rajdhani font-bold text-lg text-text mb-3 flex items-center gap-2">
            <Mail size={17} /> Mensagens
          </h2>
          {inbox.length === 0 ? (
            <div className="text-center py-8 bg-bg2 border border-border rounded-2xl">
              <Mail size={28} className="mx-auto mb-2 text-text3" />
              <p className="text-text3 text-sm">Sem mensagens</p>
            </div>
          ) : (
            <div className="space-y-2">
              {inbox.map(msg => (
                <div key={msg.id} className={`bg-bg2 border rounded-xl p-4 transition-colors ${msg.is_read ? 'border-border' : 'border-purple/30 bg-purple/[0.03]'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-text text-sm">{msg.sender_name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple/10 text-purple2 font-semibold">{msg.message_type}</span>
                        {!msg.is_read && <span className="w-2 h-2 rounded-full bg-purple2 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-text2 leading-relaxed">{msg.content}</p>
                      <p className="text-[10px] text-text3 mt-1.5 flex items-center gap-1"><Clock size={9} /> {timeAgo(msg.created_at)}</p>
                    </div>
                    {!msg.is_read && (
                      <button onClick={() => handleMarkRead(msg.id)} disabled={markingId === msg.id} className="text-[11px] text-text3 hover:text-purple2 flex-shrink-0 disabled:opacity-50">
                        {markingId === msg.id ? '...' : 'Marcar lida'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
