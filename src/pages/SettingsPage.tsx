import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { supabase } from '../lib/supabase';
import { User, Bell, Lock, Globe, Save, Eye, EyeOff, Trash2, Zap, HelpCircle, FileText } from 'lucide-react';
import { ANGOLAN_PROVINCES } from '../types/index';

export default function SettingsPage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'privacy' | 'notifications' | 'security' | 'features'>('profile');

  // Profile settings
  const [username, setUsername] = useState('');
  const [province, setProvince] = useState('');
  const [email, setEmail] = useState('');

  // Privacy settings
  const [showProvince, setShowProvince] = useState(true);
  const [showCharacter, setShowCharacter] = useState(true);

  // Notification settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  // Security
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setProvince(profile.province || 'Luanda');
      setEmail(profile.email || '');
      loadSettings();
    }
  }, [profile]);

  async function loadSettings() {
    try {
      const { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (settings) {
        setShowProvince(settings.show_province);
        setShowCharacter(settings.show_character);
        setNotificationsEnabled(settings.notifications_enabled);
        setEmailNotifications(settings.email_notifications);
      }
    } catch {
      // No settings yet
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile() {
    if (!user || !username.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          province
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      showToast('Perfil atualizado!', 'success');
    } catch {
      showToast('Erro ao salvar', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSettings() {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          show_province: showProvince,
          show_character: showCharacter,
          notifications_enabled: notificationsEnabled,
          email_notifications: emailNotifications
        });

      if (error) throw error;

      showToast('Configurações salvas!', 'success');
    } catch {
      showToast('Erro ao salvar', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!user) return;

    if (newPassword.length < 8) {
      showToast('Nova palavra-passe deve ter pelo menos 8 caracteres', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Palavras-passe não coincidem', 'error');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Palavra-passe atualizada!', 'success');
    } catch {
      showToast('Erro ao atualizar palavra-passe', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (!user) return;
    if (!confirm('Isso vai apagar TUA CONTA, todos os teus dados, personagem e histórico. Esta ação é IRREVERSÍVEL. Tens certeza?')) return;
    if (!confirm('Última confirmação: apagar conta permanentemente?')) return;

    try {
      // Delete related data first
      await supabase.from('characters').delete().eq('user_id', user.id);
      await supabase.from('posts').delete().eq('user_id', user.id);
      await supabase.from('comments').delete().eq('user_id', user.id);
      await supabase.from('likes').delete().eq('user_id', user.id);
      await supabase.from('follows').delete().eq('follower_id', user.id);
      await supabase.from('follows').delete().eq('following_id', user.id);
      await supabase.from('duels').delete().or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`);
      await supabase.from('chat_messages').delete().eq('user_id', user.id);
      await supabase.from('clan_members').delete().eq('user_id', user.id);
      await supabase.from('tournament_participants').delete().eq('user_id', user.id);
      await supabase.from('profiles').delete().eq('id', user.id);

      // Sign out
      await signOut();
      showToast('Conta apagada com sucesso', 'info');
      navigate('/');
    } catch {
      showToast('Erro ao apagar conta. Contacta o suporte.', 'error');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="w-14 h-14 rounded-full border-2 border-border2 border-t-purple animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-bebas text-4xl text-text mb-8">Configurações</h1>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
          {[
            { id: 'profile', label: 'Perfil', icon: User },
            { id: 'privacy', label: 'Privacidade', icon: Eye },
            { id: 'notifications', label: 'Notificações', icon: Bell },
            { id: 'security', label: 'Segurança', icon: Lock },
            { id: 'features', label: 'Funcionalidades', icon: Zap },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-purple/20 text-purple2 border border-purple/30'
                  : 'text-text3 hover:text-text hover:bg-bg3'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {/* Profile Settings */}
          {activeTab === 'profile' && (
            <div className="bg-bg2 border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple/15 flex items-center justify-center">
                  <User className="text-purple" size={20} />
                </div>
                <h2 className="font-rajdhani font-bold text-lg text-text">Perfil</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold tracking-wide uppercase text-text3 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="input"
                    maxLength={20}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold tracking-wide uppercase text-text3 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="input opacity-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-text3 mt-1">O email não pode ser alterado</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold tracking-wide uppercase text-text3 mb-2">
                    Província
                  </label>
                  <select
                    value={province}
                    onChange={e => setProvince(e.target.value)}
                    className="input"
                  >
                    {ANGOLAN_PROVINCES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="btn btn-primary justify-center"
                >
                  <Save size={16} />
                  {saving ? 'Salvando...' : 'Salvar Perfil'}
                </button>
              </div>
            </div>
          )}

          {/* Privacy Settings */}
          {activeTab === 'privacy' && (
            <div className="bg-bg2 border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-teal/15 flex items-center justify-center">
                  <Eye className="text-teal" size={20} />
                </div>
                <h2 className="font-rajdhani font-bold text-lg text-text">Privacidade</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-text font-medium">Mostrar província no perfil</div>
                    <div className="text-xs text-text3">Outros verão a tua localização</div>
                  </div>
                  <button
                    onClick={() => setShowProvince(!showProvince)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      showProvince ? 'bg-purple' : 'bg-bg3'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      showProvince ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-text font-medium">Mostrar personagem</div>
                    <div className="text-xs text-text3">Exibir teu personagem no perfil público</div>
                  </div>
                  <button
                    onClick={() => setShowCharacter(!showCharacter)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      showCharacter ? 'bg-purple' : 'bg-bg3'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      showCharacter ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="btn btn-primary justify-center"
                >
                  <Save size={16} />
                  Salvar Privacidade
                </button>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="bg-bg2 border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber/15 flex items-center justify-center">
                  <Bell className="text-amber" size={20} />
                </div>
                <h2 className="font-rajdhani font-bold text-lg text-text">Notificações</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-text font-medium">Notificações in-app</div>
                    <div className="text-xs text-text3">Receber notificações no site</div>
                  </div>
                  <button
                    onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      notificationsEnabled ? 'bg-amber' : 'bg-bg3'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      notificationsEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-text font-medium">Notificações por email</div>
                    <div className="text-xs text-text3">Receber atualizações no email</div>
                  </div>
                  <button
                    onClick={() => setEmailNotifications(!emailNotifications)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      emailNotifications ? 'bg-amber' : 'bg-bg3'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      emailNotifications ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="btn btn-primary justify-center"
                >
                  <Save size={16} />
                  Salvar Notificações
                </button>
              </div>
            </div>
          )}

          {/* Security */}
          {activeTab === 'security' && (
            <div className="bg-bg2 border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-red/15 flex items-center justify-center">
                  <Lock className="text-red" size={20} />
                </div>
                <h2 className="font-rajdhani font-bold text-lg text-text">Segurança</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold tracking-wide uppercase text-text3 mb-2">
                    Nova Palavra-passe
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="input"
                    minLength={8}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold tracking-wide uppercase text-text3 mb-2">
                    Confirmar Palavra-passe
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repita a palavra-passe"
                    className="input"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="flex items-center gap-2 text-sm text-text3 hover:text-text"
                >
                  {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                  {showPasswords ? 'Ocultar' : 'Mostrar'} palavras-passe
                </button>

                <button
                  onClick={handleChangePassword}
                  disabled={saving || newPassword.length < 8}
                  className="btn btn-danger justify-center"
                >
                  <Lock size={16} />
                  {saving ? 'Atualizando...' : 'Atualizar Palavra-passe'}
                </button>
              </div>
            </div>
          )}

          {/* Features / Danger Zone */}
          {activeTab === 'features' && (
            <div className="space-y-6">
              {/* Danger Zone */}
              <div className="bg-bg2 border border-red/30 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-red/15 flex items-center justify-center">
                    <Trash2 className="text-red" size={20} />
                  </div>
                  <div>
                    <h2 className="font-rajdhani font-bold text-lg text-red">Zona de Perigo</h2>
                    <p className="text-xs text-text3">Ações irreversíveis</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <button
                      onClick={async () => {
                        if (confirm('Isso vai apagar o teu personagem. Continuar?')) {
                          if (user) {
                            await supabase.from('characters').delete().eq('user_id', user.id);
                            showToast('Personagem apagado', 'info');
                            window.location.href = '/dashboard';
                          }
                        }
                      }}
                      className="btn btn-ghost text-red w-full justify-start"
                    >
                      <Trash2 size={16} className="mr-2" /> Apagar Personagem
                    </button>
                  </div>
                  <div>
                    <button
                      onClick={handleDeleteAccount}
                      className="btn btn-danger w-full justify-center"
                    >
                      <Trash2 size={16} className="mr-2" /> Apagar Conta Permanentemente
                    </button>
                    <p className="text-xs text-text3 mt-2 text-center">
                      Isto apagará todos os teus dados, personagem, posts, e histórico. Irreversível.
                    </p>
                  </div>
                </div>
              </div>

              {/* Links */}
              <div className="bg-bg2 border border-border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-teal/15 flex items-center justify-center">
                    <Globe className="text-teal" size={20} />
                  </div>
                  <h2 className="font-rajdhani font-bold text-lg text-text">Links Úteis</h2>
                </div>
                <div className="space-y-2">
                  <a href="/termos" className="flex items-center gap-2 p-3 bg-bg3 rounded-xl hover:bg-bg4 transition-colors text-text">
                    <FileText size={16} /> Termos de Uso
                  </a>
                  <a href="/ajuda" className="flex items-center gap-2 p-3 bg-bg3 rounded-xl hover:bg-bg4 transition-colors text-text">
                    <HelpCircle size={16} /> Ajuda & FAQ
                  </a>
                  <a href="/funcionalidades" className="flex items-center gap-2 p-3 bg-bg3 rounded-xl hover:bg-bg4 transition-colors text-text">
                    <Zap size={16} /> Funcionalidades
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
