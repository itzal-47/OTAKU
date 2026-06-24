import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { Calendar, MapPin, Users, Video, Filter, Plus, X } from 'lucide-react';
import type { Event } from '../types/index';

export default function EventsPage() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'online' | 'presencial'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const canPublish = profile?.is_event_publisher || profile?.is_admin;

  useEffect(() => {
    loadEvents();
  }, [filterType]);

  async function loadEvents() {
    setLoading(true);
    try {
      let query = supabase
        .from('events')
        .select('*')
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true });

      if (filterType !== 'all') {
        query = query.eq('type', filterType);
      }

      const { data } = await query;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleDateString('pt-AO', { month: 'short' });
    const year = date.getFullYear();
    const hours = date.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });
    return { day, month, year, hours };
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-bebas text-5xl md:text-6xl tracking-wide text-text mb-4">
            Eventos <span className="text-amber">OtakuKamba</span>
          </h1>
          <p className="text-text2 max-w-xl mx-auto">
            Desde watch parties online até meetups presenciais em Angola – junta-te à nossa comunidade!
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {[
            { id: 'all', label: '🌟 Todos', icon: Filter },
            { id: 'online', label: '🔵 Online', icon: Video },
            { id: 'presencial', label: '📍 Presencial', icon: MapPin },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as typeof filterType)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                filterType === tab.id
                  ? 'bg-amber/15 text-amber border border-amber/30'
                  : 'text-text3 hover:text-text hover:bg-bg3'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}

          {canPublish && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-purple/15 text-purple2 border border-purple/30 hover:bg-purple/25 transition-all"
            >
              <Plus size={16} />
              Publicar Evento
            </button>
          )}
        </div>

        {/* Publisher Request Notice */}
        {user && !canPublish && (
          <div className="mb-8 bg-bg2 border border-border rounded-xl p-4 text-center">
            <p className="text-sm text-text2">
              Quer publicar eventos?{' '}
              <span className="text-purple2">Contacta-nos em </span>
              <a href="mailto:Edivaldotc16@gmail.com" className="text-teal font-semibold hover:underline">
                Edivaldotc16@gmail.com
              </a>
              <span className="text-text3"> ou </span>
              <a href="tel:+244973900858" className="text-teal font-semibold hover:underline">
                973900858
              </a>
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-2 border-border2 border-t-amber rounded-full animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 bg-bg2 border border-border rounded-2xl">
            <Calendar className="mx-auto mb-4 text-text3" size={48} />
            <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Sem eventos próximos</h3>
            <p className="text-text3 text-sm mb-6">
              Ainda não há eventos agendados. Volta em breve!
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(event => {
              const dateInfo = formatDate(event.event_date);
              const isOnline = event.type === 'online';
              const isFull = event.max_participants != null && event.current_participants >= event.max_participants;

              return (
                <Link
                  key={event.id}
                  to={`/eventos/${event.id}`}
                  className="group bg-bg2 border border-border rounded-2xl overflow-hidden hover:border-purple/40 transition-all"
                >
                  {/* Image or gradient */}
                  <div className="relative h-48 bg-gradient-to-br from-purple/20 via-bg3 to-red/10 flex items-center justify-center">
                    {event.image_url ? (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-bg rounded-xl flex items-center justify-center text-3xl">
                        {event.title.includes('Watch') || event.title.includes('Anime') ? '🎬' :
                         event.title.includes('Torne') ? '⚔️' :
                         event.title.includes('Cosplay') ? '🎭' :
                         event.title.includes('Meetup') ? '🤝' : '📅'}
                      </div>
                    )}

                    <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5"
                      style={{
                        background: isOnline ? 'rgba(0,212,170,0.15)' : 'rgba(123,92,240,0.15)',
                        color: isOnline ? '#00D4AA' : '#9B7EF8',
                        border: `1px solid ${isOnline ? 'rgba(0,212,170,0.3)' : 'rgba(123,92,240,0.3)'}`
                      }}>
                      {isOnline ? <Video size={12} /> : <MapPin size={12} />}
                      {isOnline ? 'Online' : 'Presencial'}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-amber/15 border border-amber/30 rounded-lg px-2.5 py-1.5 text-center">
                        <div className="font-bebas text-base leading-none text-amber">{dateInfo.day}</div>
                        <div className="text-[10px] uppercase text-text3">{dateInfo.month}</div>
                      </div>
                      <div>
                        <h3 className="font-rajdhani font-bold text-lg text-text leading-tight group-hover:text-purple2 transition-colors">
                          {event.title}
                        </h3>
                        <p className="text-xs text-text3">{dateInfo.year} · {dateInfo.hours}</p>
                      </div>
                    </div>

                    <p className="text-sm text-text3 line-clamp-2 mb-4">{event.description}</p>

                    <div className="flex items-center justify-between text-xs text-text2">
                      <span className="flex items-center gap-1.5">
                        <MapPin size={12} />
                        {event.location || (isOnline ? 'Online' : 'A definir')}
                      </span>
                      <span className={`flex items-center gap-1.5 ${isFull ? 'text-red' : ''}`}>
                        <Users size={12} />
                        {event.current_participants}
                        {event.max_participants && ` / ${event.max_participants}`}
                      </span>
                    </div>

                    <div className="mt-4">
                      <span className={`btn w-full justify-center text-sm py-2 ${
                        isFull
                          ? 'bg-text3/20 text-text3 cursor-not-allowed'
                          : 'bg-teal/15 text-teal border border-teal/30 hover:bg-teal/25'
                      }`}>
                        {isFull ? '🚫 Esgotado' : '✓ Participar'}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 bg-bg2 border border-border rounded-2xl p-8">
          <h2 className="font-rajdhani font-bold text-xl text-text mb-4">Sobre os Eventos OtakuKamba</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-text flex items-center gap-2 mb-2">
                <Video size={18} className="text-teal" />
                Eventos Online
              </h3>
              <p className="text-sm text-text3 leading-relaxed">
                Watch parties de animes populares, torneios online de duelos e quizzes interativos.
                Podes participar de qualquer lugar de Angola!
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-text flex items-center gap-2 mb-2">
                <MapPin size={18} className="text-purple2" />
                Eventos Presenciais
              </h3>
              <p className="text-sm text-text3 leading-relaxed">
                Meetups em Angola, cosplay contests, e muito mais.
                Conhece outros otakus angolanos pessoalmente e faz novos amigos!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <CreateEventModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadEvents();
            showToast('Evento publicado com sucesso!', 'success');
          }}
        />
      )}
    </div>
  );
}

function CreateEventModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'online' | 'presencial'>('online');
  const [location, setLocation] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !description || !eventDate) return;

    setLoading(true);
    try {
      const eventDateTime = new Date(`${eventDate}T${eventTime || '12:00'}`);

      const { error } = await supabase.from('events').insert({
        title,
        description,
        type,
        location: location || null,
        event_date: eventDateTime.toISOString(),
        image_url: imageUrl || null,
        max_participants: maxParticipants ? parseInt(maxParticipants) : null,
        created_by: user.id
      });

      if (error) throw error;
      onSuccess();
    } catch {
      console.error('Error creating event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-bg2 border border-border rounded-2xl p-6 w-full max-w-lg my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-rajdhani font-bold text-xl text-text">Publicar Evento</h2>
          <button onClick={onClose} className="text-text3 hover:text-text">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold tracking-wide uppercase text-text3 mb-2">
              Título do Evento *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="ex: Watch Party: Jujutsu Kaisen S2"
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wide uppercase text-text3 mb-2">
              Descrição *
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descreve o evento..."
              className="input min-h-[100px] py-3"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold tracking-wide uppercase text-text3 mb-2">
                Tipo
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as 'online' | 'presencial')}
                className="input"
              >
                <option value="online">🔵 Online</option>
                <option value="presencial">📍 Presencial</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-wide uppercase text-text3 mb-2">
                Local
              </label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder={type === 'online' ? 'Discord' : 'Luanda'}
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold tracking-wide uppercase text-text3 mb-2">
                Data *
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                className="input"
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-wide uppercase text-text3 mb-2">
                Hora
              </label>
              <input
                type="time"
                value={eventTime}
                onChange={e => setEventTime(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wide uppercase text-text3 mb-2">
              Máximo de Participantes (opcional)
            </label>
            <input
              type="number"
              value={maxParticipants}
              onChange={e => setMaxParticipants(e.target.value)}
              placeholder="Deixar vazio = sem limite"
              className="input"
              min="1"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wide uppercase text-text3 mb-2">
              URL da Imagem (opcional)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="input"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1 justify-center">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !title || !description || !eventDate}
              className="btn btn-primary flex-1 justify-center disabled:opacity-50"
            >
              {loading ? 'Publicando...' : 'Publicar Evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
