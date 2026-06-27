import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { MessageSquare, Bug, Lightbulb, Send, CheckCircle, Clock, Shield } from 'lucide-react';

interface Feedback {
  id: string;
  user_id: string;
  type: 'suggestion' | 'bug' | 'feature';
  title: string;
  description: string;
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
}

export default function FeedbackPage() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<'suggestion' | 'bug' | 'feature'>('suggestion');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const isAdmin = profile?.is_admin || profile?.is_super_admin || profile?.role === 'supreme_admin' || profile?.role === 'secondary_admin';

  useEffect(() => {
    loadFeedback();
  }, [user]);

  async function loadFeedback() {
    setLoading(true);
    try {
      if (!user) {
        setFeedbackList([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) {
        // If admin, show all; otherwise show only own
        if (isAdmin) {
          setFeedbackList(data as Feedback[]);
        } else {
          setFeedbackList(data.filter((f: Feedback) => f.user_id === user.id) as Feedback[]);
        }
      }
    } catch {
      console.error('Error loading feedback');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !title.trim() || !description.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase.from('feedback').insert({
        user_id: user.id,
        type,
        title: title.trim(),
        description: description.trim()
      });
      if (error) throw error;

      setTitle('');
      setDescription('');
      setType('suggestion');
      setShowForm(false);
      showToast('Feedback enviado com sucesso!', 'success');
      loadFeedback();
    } catch {
      showToast('Erro ao enviar feedback', 'error');
    } finally {
      setSending(false);
    }
  }

  async function handleUpdateStatus(id: string, status: 'pending' | 'reviewed' | 'resolved') {
    if (!isAdmin) return;
    try {
      const { error } = await supabase.from('feedback').update({ status }).eq('id', id);
      if (error) throw error;
      showToast('Status atualizado!', 'success');
      loadFeedback();
    } catch {
      showToast('Erro ao atualizar', 'error');
    }
  }

  const typeConfig = {
    suggestion: { label: 'Sugestão', icon: Lightbulb, color: 'text-amber', bg: 'bg-amber/15', border: 'border-amber/30' },
    bug: { label: 'Bug', icon: Bug, color: 'text-red', bg: 'bg-red/15', border: 'border-red/30' },
    feature: { label: 'Feature', icon: MessageSquare, color: 'text-purple2', bg: 'bg-purple/15', border: 'border-purple/30' }
  };

  const statusConfig = {
    pending: { label: 'Pendente', color: 'text-amber', bg: 'bg-amber/15', border: 'border-amber/30' },
    reviewed: { label: 'Revisado', color: 'text-purple2', bg: 'bg-purple/15', border: 'border-purple/30' },
    resolved: { label: 'Resolvido', color: 'text-teal', bg: 'bg-teal/15', border: 'border-teal/30' }
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-bebas text-5xl md:text-6xl tracking-wide text-text mb-4">
            Feedback <span className="text-purple2">OtakuKamba</span>
          </h1>
          <p className="text-text2 max-w-xl mx-auto">
            Envia sugestões, reporta bugs, ou sugere novas funcionalidades. A tua opinião conta!
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-8">
          {user && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Send size={16} />
              {showForm ? 'Cancelar' : 'Enviar Feedback'}
            </button>
          )}
          {!user && (
            <Link to="/login" className="btn btn-primary flex items-center gap-2">
              <Send size={16} /> Entrar para Enviar Feedback
            </Link>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-bg2 border border-border rounded-2xl p-6 mb-8">
            <h2 className="font-rajdhani font-bold text-xl text-text mb-6">Enviar Feedback</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                {(['suggestion', 'bug', 'feature'] as const).map(t => {
                  const config = typeConfig[t];
                  const Icon = config.icon;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                        type === t
                          ? `${config.bg} ${config.color} ${config.border}`
                          : 'bg-bg3 text-text2 hover:text-text'
                      }`}
                    >
                      <Icon size={16} />
                      {config.label}
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-wide uppercase text-text3 mb-2">
                  Título
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Resumo breve..."
                  className="input"
                  required
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-wide uppercase text-text3 mb-2">
                  Descrição
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Descreve detalhadamente..."
                  className="input min-h-[120px] py-3"
                  required
                  maxLength={1000}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn btn-ghost flex-1 justify-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sending || !title.trim() || !description.trim()}
                  className="btn btn-primary flex-1 justify-center disabled:opacity-50"
                >
                  {sending ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-2 border-border2 border-t-purple rounded-full animate-spin" />
          </div>
        ) : feedbackList.length === 0 ? (
          <div className="text-center py-12 bg-bg2 border border-border rounded-2xl">
            <MessageSquare className="mx-auto mb-4 text-text3" size={48} />
            <h3 className="font-rajdhani font-bold text-xl text-text mb-2">
              {user ? 'Sem feedback enviado' : 'Entra para ver o teu feedback'}
            </h3>
            <p className="text-text3 text-sm">
              {user ? 'Envia a tua primeira sugestão, bug report ou feature request!' : 'Cria uma conta e envia feedback.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {feedbackList.map(item => {
              const tConfig = typeConfig[item.type];
              const sConfig = statusConfig[item.status];
              const TIcon = tConfig.icon;
              return (
                <div key={item.id} className="bg-bg2 border border-border rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl ${tConfig.bg} border ${tConfig.border} flex items-center justify-center flex-shrink-0`}>
                      <TIcon size={20} className={tConfig.color} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${tConfig.bg} ${tConfig.color} ${tConfig.border}`}>
                          {tConfig.label}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${sConfig.bg} ${sConfig.color} ${sConfig.border}`}>
                          {sConfig.label}
                        </span>
                      </div>
                      <h3 className="font-rajdhani font-bold text-lg text-text mb-2">{item.title}</h3>
                      <p className="text-sm text-text2 mb-3">{item.description}</p>
                      <div className="flex items-center gap-2 text-xs text-text3">
                        <Clock size={12} />
                        {new Date(item.created_at).toLocaleDateString('pt-AO')}
                      </div>
                    </div>
                  </div>

                  {/* Admin actions */}
                  {isAdmin && (
                    <div className="mt-4 pt-4 border-t border-border flex gap-2">
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'pending')}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${item.status === 'pending' ? 'bg-amber/15 text-amber border border-amber/30' : 'bg-bg3 text-text2 hover:text-text'}`}
                      >
                        Pendente
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'reviewed')}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${item.status === 'reviewed' ? 'bg-purple/15 text-purple2 border border-purple/30' : 'bg-bg3 text-text2 hover:text-text'}`}
                      >
                        Revisado
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'resolved')}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${item.status === 'resolved' ? 'bg-teal/15 text-teal border border-teal/30' : 'bg-bg3 text-text2 hover:text-text'}`}
                      >
                        Resolvido
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
