import { useEffect, useRef, useState } from 'react';
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
  created_at: string;
}

export default function AdminInboxPage() {
  const { user, profile } = useAuth();
  const [inbox, setInbox] = useState<AdminInbox[]>([]);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const inboxChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reqChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  async function loadInbox() {
    try {
      const { data } = await supabase
        .from('admin_inbox')
        .select('*')
        .order('created_at', { ascending: false });
      setInbox(data || []);
    } catch {
      console.error('Error loading inbox');
    }
  }

  async function loadRequests() {
    try {
      const { data } = await supabase
        .from('admin_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      setRequests(data || []);
    } catch {
      console.error('Error loading requests');
    }
  }

  useEffect(() => {
    if (inboxChannelRef.current) {
      supabase.removeChannel(inboxChannelRef.current);
      inboxChannelRef.current = null;
    }
    if (reqChannelRef.current) {
      supabase.removeChannel(reqChannelRef.current);
      reqChannelRef.current = null;
    }
    const inboxChannel = supabase
      .channel('admin_inbox_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_inbox' },
        () => loadInbox()
      )
      .subscribe();
    inboxChannelRef.current = inboxChannel;
    const reqChannel = supabase
      .channel('admin_requests_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_requests' },
        () => loadRequests()
      )
      .subscribe();
    reqChannelRef.current = reqChannel;
    return () => {
      if (inboxChannelRef.current) {
        supabase.removeChannel(inboxChannelRef.current);
        inboxChannelRef.current = null;
      }
      if (reqChannelRef.current) {
        supabase.removeChannel(reqChannelRef.current);
        reqChannelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user && (profile?.is_super_admin || profile?.role === 'supreme_admin')) {
      loadInbox();
      loadRequests();
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [user, profile]);

  async function handleRequest(requestId: string, approve: boolean) {
    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from('admin_requests')
        .update({ status: approve ? 'approved' : 'rejected' })
        .eq('id', requestId);
      if (error) throw error;
      loadRequests();
    } catch {
      console.error('Error processing request');
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="w-12 h-12 border-2 border-border2 border-t-purple rounded-full animate-spin" />
      </div>
    );
  }

  if (!(profile?.is_super_admin || profile?.role === 'supreme_admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="text-center">
          <h1 className="font-bebas text-3xl text-text mb-2">Acesso Negado</h1>
          <p className="text-text3">Precisas de ser super admin para aceder a esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-bebas text-3xl text-text mb-6">Inbox Admin</h1>

        {/* Pending Requests */}
        <div className="mb-8">
          <h2 className="font-rajdhani font-bold text-xl text-text mb-4">Pedidos Pendentes</h2>
          {requests.length === 0 ? (
            <div className="text-center py-8 bg-bg2 border border-border rounded-2xl">
              <p className="text-text3">Sem pedidos pendentes</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map(request => (
                <div key={request.id} className="bg-bg2 border border-border rounded-2xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-text">User ID: {request.user_id}</div>
                      <div className="text-sm text-text3 mt-1">{request.request_reason}</div>
                      <div className="text-xs text-text3 mt-2">
                        {new Date(request.created_at).toLocaleDateString('pt-AO')}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRequest(request.id, true)}
                        disabled={processingId === request.id}
                        className="btn btn-primary text-sm py-2 px-4 disabled:opacity-50"
                      >
                        Aprovar
                      </button>
                      <button
                        onClick={() => handleRequest(request.id, false)}
                        disabled={processingId === request.id}
                        className="btn btn-ghost text-sm py-2 px-4 text-red disabled:opacity-50"
                      >
                        Rejeitar
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
          <h2 className="font-rajdhani font-bold text-xl text-text mb-4">Mensagens</h2>
          {inbox.length === 0 ? (
            <div className="text-center py-8 bg-bg2 border border-border rounded-2xl">
              <p className="text-text3">Sem mensagens</p>
            </div>
          ) : (
            <div className="space-y-4">
              {inbox.map(msg => (
                <div key={msg.id} className={`bg-bg2 border rounded-2xl p-6 ${msg.is_read ? 'border-border' : 'border-purple/30'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-text">{msg.sender_name}</div>
                    <div className="text-xs text-text3">
                      {new Date(msg.created_at).toLocaleDateString('pt-AO')}
                    </div>
                  </div>
                  <div className="text-sm text-text2 mb-2">
                    <span className="text-xs text-purple2 font-semibold mr-2">{msg.message_type}</span>
                    {msg.content}
                  </div>
                  {!msg.is_read && (
                    <div className="text-xs text-purple2 font-semibold">Não lida</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
