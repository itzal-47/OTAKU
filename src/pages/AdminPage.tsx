import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { Shield, Users, Check, X, Plus, Trash2, MessageCircle, Calendar, AlertTriangle, Flag, Crown } from 'lucide-react';
import type { CharacterClass } from '../types/index';

interface ChatRoomRequest {
  id: string;
  requester_id: string;
  room_name: string;
  room_description: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
  profiles: {
    username: string;
  };
  characters?: {
    name: string;
    class: CharacterClass;
  };
}

interface AdminUser {
  id: string;
  user_id: string;
  permissions: {
    can_publish_events?: boolean;
    can_create_rooms?: boolean;
    can_add_members?: boolean;
  };
  added_at: string;
  profiles: {
    username: string;
  };
}

interface AdminRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  request_reason: string | null;
  created_at: string;
  profiles: {
    username: string;
  };
  characters?: {
    name: string;
    class: CharacterClass;
  };
}

interface PendingPublisher {
  id: string;
  email: string;
  country: string | null;
  created_at: string;
}

interface ReportItem {
  id: string;
  reporter_id: string;
  reported_user_id?: string;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
  reporter?: { id: string; username: string };
  reported_user?: { id: string; username: string };
}

export default function AdminPage() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'requests' | 'admins' | 'publishers' | 'reports' | 'admin_requests'>('requests');
  const [roomRequests, setRoomRequests] = useState<ChatRoomRequest[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminRequests, setAdminRequests] = useState<AdminRequest[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);

  const isAdmin = profile?.is_admin;
  const isSuperAdmin = profile?.is_super_admin;

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  async function loadData() {
    setLoading(true);
    try {
      // Load room requests
      const { data: requests } = await supabase
        .from('chat_room_requests')
        .select('id, requester_id, room_name, room_description, status, rejection_reason, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (requests && requests.length > 0) {
        const requesterIds = requests.map(r => r.requester_id);
        const [profilesData, charsData] = await Promise.all([
          supabase.from('profiles').select('id, username').in('id', requesterIds),
          supabase.from('characters').select('user_id, name, class').in('user_id', requesterIds)
        ]);

        const formatted: ChatRoomRequest[] = requests.map(r => ({
          ...r,
          profiles: profilesData.data?.find(p => p.id === r.requester_id) || { username: 'Unknown' },
          characters: charsData.data?.find(c => c.user_id === r.requester_id)
        }));
        setRoomRequests(formatted);
      } else {
        setRoomRequests([]);
      }

      // Load admin users
      const { data: admins } = await supabase
        .from('admin_list')
        .select('id, user_id, permissions, added_at');

      if (admins && admins.length > 0) {
        const userIds = admins.map(a => a.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);

        const formatted: AdminUser[] = admins.map(a => ({
          ...a,
          profiles: profilesData?.find(p => p.id === a.user_id) || { username: 'Unknown' }
        }));
        setAdminUsers(formatted);
      } else {
        setAdminUsers([]);
      }

      // Load admin requests
      const { data: adminReqs } = await supabase
        .from('admin_requests')
        .select('id, user_id, status, request_reason, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (adminReqs && adminReqs.length > 0) {
        const userIds = adminReqs.map(a => a.user_id);
        const [profilesData, charsData] = await Promise.all([
          supabase.from('profiles').select('id, username').in('id', userIds),
          supabase.from('characters').select('user_id, name, class').in('user_id', userIds)
        ]);

        const formatted: AdminRequest[] = adminReqs.map(a => ({
          ...a,
          profiles: profilesData.data?.find(p => p.id === a.user_id) || { username: 'Unknown' },
          characters: charsData.data?.find(c => c.user_id === a.user_id)
        }));
        setAdminRequests(formatted);
      } else {
        setAdminRequests([]);
      }

      // Load reports
      const { data: reportsData } = await supabase
        .from('reports')
        .select('id, reporter_id, reported_user_id, reason, description, status, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50);

      if (reportsData && reportsData.length > 0) {
        const allUserIds = [...new Set([
          ...reportsData.map(r => r.reporter_id).filter(Boolean),
          ...reportsData.map(r => r.reported_user_id).filter(Boolean)
        ])];

        const { data: reporterProfiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', allUserIds);

        const formattedReports: ReportItem[] = reportsData.map(r => ({
          ...r,
          reporter: reporterProfiles?.find(p => p.id === r.reporter_id),
          reported_user: reporterProfiles?.find(p => p.id === r.reported_user_id)
        }));

        setReports(formattedReports);
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApproveRequest(requestId: string, requesterId: string, roomName: string, roomDescription: string | null) {
    try {
      const slug = roomName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      // Create the room
      const { error: roomError } = await supabase.from('chat_rooms').insert({
        name: roomName,
        slug: slug + '-' + Date.now(),
        description: roomDescription,
        type: 'public',
        created_by: requesterId
      });

      if (roomError) throw roomError;

      // Update request status
      await supabase
        .from('chat_room_requests')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      // Add requester as owner of the room
      const { data: newRoom } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('created_by', requesterId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (newRoom) {
        await supabase.from('chat_room_members').insert({
          room_id: newRoom.id,
          user_id: requesterId,
          role: 'owner'
        });
      }

      showToast('Sala aprovada!', 'success');
      loadData();
    } catch {
      showToast('Erro ao aprovar', 'error');
    }
  }

  async function handleRejectRequest(requestId: string, reason: string) {
    try {
      await supabase
        .from('chat_room_requests')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      showToast('Pedido recusado', 'info');
      loadData();
    } catch {
      showToast('Erro ao recusar', 'error');
    }
  }

  async function handleApproveAdminRequest(requestId: string, userId: string) {
    try {
      await supabase.from('admin_list').insert({
        user_id: userId,
        added_by: user?.id
      });
      await supabase.from('admin_requests').update({
        status: 'approved',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString()
      }).eq('id', requestId);
      await supabase.from('profiles').update({ is_admin: true, is_event_publisher: true }).eq('id', userId);
      showToast('Pedido de admin aprovado!', 'success');
      loadData();
    } catch {
      showToast('Erro ao aprovar pedido', 'error');
    }
  }

  async function handleRejectAdminRequest(requestId: string) {
    try {
      await supabase.from('admin_requests').update({
        status: 'rejected',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString()
      }).eq('id', requestId);
      showToast('Pedido de admin rejeitado', 'info');
      loadData();
    } catch {
      showToast('Erro ao rejeitar', 'error');
    }
  }

  async function handleAddAdmin() {
    if (!newAdminUsername.trim()) return;

    setAddingAdmin(true);
    try {
      // Find user by username
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', newAdminUsername.trim())
        .single();

      if (!targetProfile) {
        showToast('Usuário não encontrado', 'error');
        return;
      }

      const { error } = await supabase.from('admin_list').insert({
        user_id: targetProfile.id,
        added_by: user?.id
      });

      if (error) throw error;

      // Also update their profile to be event publisher
      await supabase
        .from('profiles')
        .update({ is_admin: true, is_event_publisher: true })
        .eq('id', targetProfile.id);

      showToast('Admin adicionado!', 'success');
      setNewAdminUsername('');
      loadData();
    } catch {
      showToast('Erro ao adicionar admin', 'error');
    } finally {
      setAddingAdmin(false);
    }
  }

  async function handleRemoveAdmin(adminUserId: string) {
    try {
      await supabase.from('admin_list').delete().eq('user_id', adminUserId);
      await supabase.from('profiles').update({ is_admin: false, is_event_publisher: false }).eq('id', adminUserId);
      showToast('Admin removido', 'info');
      loadData();
    } catch {
      showToast('Erro ao remover', 'error');
    }
  }

  async function handleReportAction(reportId: string, action: 'resolved' | 'dismissed') {
    try {
      await supabase
        .from('reports')
        .update({
          status: action,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      showToast(`Relatório ${action === 'resolved' ? 'resolvido' : 'ignorado'}`, 'success');
      loadData();
    } catch {
      showToast('Erro ao processar', 'error');
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16 px-4">
        <div className="text-center">
          <Shield className="mx-auto mb-4 text-red" size={64} />
          <h1 className="font-bebas text-4xl text-text mb-4">Acesso Negado</h1>
          <p className="text-text2">Apenas o administrador pode acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber to-red flex items-center justify-center text-2xl">
            <Shield className="text-white" size={28} />
          </div>
          <div>
            <h1 className="font-bebas text-3xl text-text">Painel de Admin</h1>
            <p className="text-text3 text-sm">Gerir pedidos, admins e publicadores</p>
          </div>
          {isSuperAdmin && (
            <div className="ml-auto flex items-center gap-1 px-3 py-1 rounded-full bg-amber/15 border border-amber/30 text-amber text-xs font-bold">
              <Crown size={12} />
              Super Admin
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
          {[
            { id: 'requests', label: 'Pedidos de Sala', icon: MessageCircle, count: roomRequests.length },
            { id: 'reports', label: 'Denúncias', icon: AlertTriangle, count: reports.length },
            { id: 'admin_requests', label: 'Pedidos Admin', icon: Shield, count: adminRequests.length },
            { id: 'admins', label: 'Admins', icon: Users, count: adminUsers.length },
            { id: 'publishers', label: 'Publicadores', icon: Calendar },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-purple/20 text-purple2 border border-purple/30'
                  : 'text-text3 hover:text-text hover:bg-bg3'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red text-white text-xs">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-2 border-border2 border-t-purple rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Admin Requests */}
            {activeTab === 'admin_requests' && (
              <div className="space-y-4">
                {adminRequests.length === 0 ? (
                  <div className="text-center py-12 bg-bg2 border border-border rounded-2xl">
                    <Shield className="mx-auto mb-4 text-text3" size={48} />
                    <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Sem pedidos de admin</h3>
                    <p className="text-text3 text-sm">Nenhum pedido pendente.</p>
                  </div>
                ) : (
                  adminRequests.map(request => (
                    <div key={request.id} className="bg-bg2 border border-border rounded-2xl p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple to-red flex items-center justify-center text-lg font-bold">
                          {request.profiles.username.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="font-rajdhani font-bold text-text">{request.profiles.username}</div>
                          <div className="text-xs text-text3 mb-2">
                            {request.characters?.name} · Pedido em {new Date(request.created_at).toLocaleDateString('pt-AO')}
                          </div>
                          {request.request_reason && (
                            <div className="bg-bg3 rounded-xl p-4 border border-border">
                              <p className="text-sm text-text2">{request.request_reason}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={() => handleApproveAdminRequest(request.id, request.user_id)}
                          className="btn btn-teal flex-1 justify-center"
                        >
                          <Check size={16} /> Aprovar
                        </button>
                        <button
                          onClick={() => handleRejectAdminRequest(request.id)}
                          className="btn btn-danger flex-1 justify-center"
                        >
                          <X size={16} /> Recusar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Reports */}
            {activeTab === 'reports' && (
              <div className="space-y-4">
                {reports.length === 0 ? (
                  <div className="text-center py-12 bg-bg2 border border-border rounded-2xl">
                    <AlertTriangle className="mx-auto mb-4 text-text3" size={48} />
                    <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Sem denúncias</h3>
                    <p className="text-text3 text-sm">Nenhuma denúncia pendente.</p>
                  </div>
                ) : (
                  reports.map(report => (
                    <div key={report.id} className="bg-bg2 border border-border rounded-2xl p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-red/15 flex items-center justify-center">
                          <Flag className="text-red" size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              report.reason === 'spam' ? 'bg-amber/20 text-amber' :
                              report.reason === 'harassment' ? 'bg-red/20 text-red' :
                              report.reason === 'inappropriate' ? 'bg-purple/20 text-purple' :
                              'bg-text3/20 text-text3'
                            }`}>
                              {report.reason}
                            </span>
                            <span className="text-xs text-text3">
                              {new Date(report.created_at).toLocaleDateString('pt-AO')}
                            </span>
                          </div>
                          {report.description && (
                            <p className="text-sm text-text2 mb-2">{report.description}</p>
                          )}
                          <div className="text-xs text-text3">
                            {report.reported_user && (
                              <span>Denunciado: <Link to={`/perfil/${report.reported_user.username}`} className="text-purple2 hover:underline">@{report.reported_user.username}</Link></span>
                            )}
                            <span className="mx-2">·</span>
                            {report.reporter && (
                              <span>Por: @{report.reporter.username}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={() => handleReportAction(report.id, 'resolved')}
                          className="btn btn-teal flex-1 justify-center text-sm"
                        >
                          <Check size={14} /> Resolvido
                        </button>
                        <button
                          onClick={() => handleReportAction(report.id, 'dismissed')}
                          className="btn btn-ghost flex-1 justify-center text-sm"
                        >
                          <X size={14} /> Ignorar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Room Requests */}
            {activeTab === 'requests' && (
              <div className="space-y-4">
                {roomRequests.length === 0 ? (
                  <div className="text-center py-12 bg-bg2 border border-border rounded-2xl">
                    <MessageCircle className="mx-auto mb-4 text-text3" size={48} />
                    <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Sem pedidos pendentes</h3>
                    <p className="text-text3 text-sm">Todos os pedidos foram processados.</p>
                  </div>
                ) : (
                  roomRequests.map(request => (
                    <div key={request.id} className="bg-bg2 border border-border rounded-2xl p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple to-red flex items-center justify-center text-lg font-bold">
                          {request.profiles.username.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="font-rajdhani font-bold text-text">{request.profiles.username}</div>
                          <div className="text-xs text-text3 mb-2">
                            {request.characters?.name} · Pedido em {new Date(request.created_at).toLocaleDateString('pt-AO')}
                          </div>
                          <div className="bg-bg3 rounded-xl p-4 border border-border">
                            <div className="font-semibold text-text mb-1">
                              <span className="text-purple"># </span>{request.room_name}
                            </div>
                            {request.room_description && (
                              <p className="text-sm text-text2">{request.room_description}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={() => handleApproveRequest(request.id, request.requester_id, request.room_name, request.room_description)}
                          className="btn btn-teal flex-1 justify-center"
                        >
                          <Check size={16} /> Aprovar
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Motivo da recusa (opcional):');
                            if (reason !== null) handleRejectRequest(request.id, reason);
                          }}
                          className="btn btn-danger flex-1 justify-center"
                        >
                          <X size={16} /> Recusar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Admin Users */}
            {activeTab === 'admins' && (
              <div className="space-y-4">
                {/* Add admin */}
                <div className="bg-bg2 border border-border rounded-2xl p-5">
                  <h3 className="font-rajdhani font-bold text-text mb-4">Adicionar Novo Admin</h3>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newAdminUsername}
                      onChange={e => setNewAdminUsername(e.target.value)}
                      placeholder="Username do usuário"
                      className="input flex-1"
                    />
                    <button
                      onClick={handleAddAdmin}
                      disabled={addingAdmin || !newAdminUsername.trim()}
                      className="btn btn-primary disabled:opacity-50"
                    >
                      <Plus size={16} /> Adicionar
                    </button>
                  </div>
                  <p className="text-xs text-text3 mt-2">
                    Permissões: Publicar eventos, Criar salas, Adicionar membros
                  </p>
                </div>

                {/* Admin list */}
                {adminUsers.length === 0 ? (
                  <div className="text-center py-8 bg-bg2 border border-border rounded-2xl">
                    <Users className="mx-auto mb-4 text-text3" size={48} />
                    <p className="text-text3 text-sm">Nenhum admin secundário ainda.</p>
                  </div>
                ) : (
                  adminUsers.map(admin => (
                    <div key={admin.id} className="bg-bg2 border border-border rounded-xl p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-bg3 flex items-center justify-center font-bold">
                        {admin.profiles.username.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-text">@{admin.profiles.username}</div>
                        <div className="text-xs text-text3">
                          Adicionado em {new Date(admin.added_at).toLocaleDateString('pt-AO')}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveAdmin(admin.user_id)}
                        className="btn btn-ghost text-red text-sm py-2"
                      >
                        <Trash2 size={14} /> Remover
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Publishers */}
            {activeTab === 'publishers' && (
              <div className="bg-bg2 border border-border rounded-2xl p-8 text-center">
                <Calendar className="mx-auto mb-4 text-amber" size={48} />
                <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Publicadores de Eventos</h3>
                <p className="text-text2 mb-4">
                  Os admins secundários que adicionares na aba "Admins" terão permissão automaticamente para publicar eventos.
                </p>
                <button
                  onClick={() => setActiveTab('admins')}
                  className="btn btn-ghost"
                >
                  Ver Lista de Admins
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
