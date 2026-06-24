import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { MapPin, Users, Video, ArrowLeft, Share2 } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description: string;
  type: 'online' | 'presencial';
  location: string | null;
  event_date: string;
  image_url: string | null;
  max_participants: number | null;
  current_participants: number;
  created_by: string;
  created_at: string;
}

export default function EventDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEvent();
  }, [id]);

  async function loadEvent() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      setEvent(data);

      if (data && user) {
        const { data: registration } = await supabase
          .from('event_registrations')
          .select('*')
          .eq('event_id', data.id)
          .eq('user_id', user.id)
          .single();
        setRegistered(!!registration);
      }
    } catch (error) {
      console.error('Error loading event:', error);
      setError('Evento não encontrado');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!user || !event) {
      setError('Precisas de estar logado para participar');
      return;
    }

    setJoining(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('event_registrations')
        .insert({
          event_id: event.id,
          user_id: user.id,
        });

      if (insertError) throw insertError;

      setRegistered(true);
      setEvent(prev => prev ? { ...prev, current_participants: prev.current_participants + 1 } : null);
    } catch (error) {
      console.error('Error registering:', error);
      setError('Erro ao registar. Tenta novamente.');
    } finally {
      setJoining(false);
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-AO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="w-12 h-12 border-2 border-border2 border-t-purple rounded-full animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16 px-4">
        <div className="text-center">
          <h1 className="font-bebas text-4xl text-text mb-4">Evento não encontrado</h1>
          <Link to="/eventos" className="btn btn-ghost">← Voltar aos Eventos</Link>
        </div>
      </div>
    );
  }

  const isOnline = event.type === 'online';
  const isFull = event.max_participants !== null && event.current_participants >= event.max_participants;
  const eventDate = new Date(event.event_date);
  const isPast = eventDate < new Date();

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back button */}
        <Link
          to="/eventos"
          className="inline-flex items-center gap-2 text-sm text-text3 hover:text-text mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar aos Eventos
        </Link>

        {/* Hero */}
        <div className="relative h-64 bg-gradient-to-br from-purple/20 via-bg3 to-red/10 rounded-3xl overflow-hidden mb-8 flex items-center justify-center">
          <div className="absolute top-4 right-4 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2"
            style={{
              background: isOnline ? 'rgba(0,212,170,0.15)' : 'rgba(123,92,240,0.15)',
              color: isOnline ? '#00D4AA' : '#9B7EF8',
              border: `1px solid ${isOnline ? 'rgba(0,212,170,0.3)' : 'rgba(123,92,240,0.3)'}`
            }}>
            {isOnline ? <Video size={16} /> : <MapPin size={16} />}
            {isOnline ? 'Online' : 'Presencial'}
          </div>

          <div className="text-6xl">
            {event.title.includes('Watch') || event.title.includes('Anime') ? '🎬' :
             event.title.includes('Torne') ? '⚔️' :
             event.title.includes('Cosplay') ? '🎭' :
             event.title.includes('Meetup') ? '🤝' : '📅'}
          </div>
        </div>

        {/* Content */}
        <div className="bg-bg2 border border-border rounded-3xl p-8">
          {/* Date Badge */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="bg-amber/15 border border-amber/30 rounded-xl px-4 py-3 text-center">
              <div className="font-bebas text-2xl leading-none text-amber">
                {eventDate.getDate()}
              </div>
              <div className="text-xs uppercase text-text3">
                {eventDate.toLocaleDateString('pt-AO', { month: 'short' })}
              </div>
            </div>

            <div>
              <h1 className="font-bebas text-4xl tracking-wide text-text leading-tight mb-2">
                {event.title}
              </h1>
              <p className="text-sm text-text3">
                {formatDate(event.event_date)}
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="text-text2 leading-relaxed mb-8">
            {event.description}
          </p>

          {/* Details */}
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <div className="flex items-center gap-3 p-4 bg-bg3 rounded-xl">
              <MapPin className="text-purple" size={20} />
              <div>
                <div className="text-xs text-text3">Local</div>
                <div className="text-sm text-text">
                  {event.location || (isOnline ? 'Online via Discord' : 'A definir')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-bg3 rounded-xl">
              <Users className="text-teal" size={20} />
              <div>
                <div className="text-xs text-text3">Participantes</div>
                <div className={`text-sm ${isFull ? 'text-red' : 'text-text'}`}>
                  {event.current_participants}
                  {event.max_participants && ` / ${event.max_participants}`}
                  {isFull && ' (Esgotado)'}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red/10 border border-red/30 rounded-xl px-4 py-3 text-sm text-red-400 mb-6">
              {error}
            </div>
          )}

          {/* CTA */}
          {!isPast && (
            <div className="flex flex-col sm:flex-row gap-3">
              {registered ? (
                <div className="btn bg-teal/15 border border-teal/30 text-teal flex-1 justify-center py-3">
                  ✓ Já registado
                </div>
              ) : (
                <button
                  onClick={handleRegister}
                  disabled={isFull || joining || !user}
                  className={`btn flex-1 justify-center py-3 ${
                    isFull || !user
                      ? 'bg-text3/20 text-text3 cursor-not-allowed'
                      : 'bg-teal/15 text-teal border border-teal/30 hover:bg-teal/25'
                  }`}
                >
                  {joining ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-teal/30 border-t-teal rounded-full animate-spin" />
                      A registar...
                    </span>
                  ) : !user ? (
                    '🔒 Entra para participar'
                  ) : isFull ? (
                    '🚫 Esgotado'
                  ) : (
                    '✓ Participar'
                  )}
                </button>
              )}

              <button className="btn btn-ghost py-3 px-4">
                <Share2 size={18} />
                Partilhar
              </button>
            </div>
          )}

          {isPast && (
            <div className="text-center py-4 text-text3">
              Este evento já aconteceu
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
