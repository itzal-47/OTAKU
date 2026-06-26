import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import {
  Crown, Star, MapPin, Mail, Phone, ExternalLink, Heart,
  Shield, Zap, Award, ChevronRight, Lock, Terminal
} from 'lucide-react';

export default function FounderPage() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);

  const founderInfo = {
    name: 'José Eduardo Numa Canjo',
    alias: 'itzal',
    location: 'Huambo, Angola',
    email: 'edivaldotc16@gmail.com',
    phones: ['973900858', '956498238'],
    facebook: 'https://web.facebook.com/edivaldo.dajielexprofunda?locale=pt_BR',
    instagram: 'https://www.instagram.com/joseeduardonuma/',
  };

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== '@fofolindo16') {
      showToast('Senha incorreta!', 'error');
      setShowPasswordModal(false);
      setPassword('');
      return;
    }

    setLoading(true);

    try {
      // Update profile to super_admin with title and verified
      const { error } = await supabase
        .from('profiles')
        .update({
          role: 'super_admin',
          is_super_admin: true,
          is_admin: true,
          is_verified: true,
          title: 'FUNDADOR',
          title_color: 'gold'
        })
        .eq('id', user!.id);

      if (error) throw error;

      showToast('Bem-vindo, FUNDADOR! Acesso total concedido.', 'success');
      setShowPasswordModal(false);
      setShowTerminal(true);

      // Refresh profile
      window.location.reload();
    } catch (error: any) {
      showToast('Erro ao autenticar: ' + error.message, 'error');
    } finally {
      setLoading(false);
      setPassword('');
    }
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Hero Card */}
        <div className="relative bg-gradient-to-br from-amber/10 via-bg2 to-purple/10 border border-amber/30 rounded-3xl overflow-hidden mb-8">
          {/* Animated background glow */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute w-[400px] h-[400px] -top-24 -left-24 bg-amber/20 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute w-[300px] h-[300px] -bottom-12 -right-12 bg-purple/15 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          <div className="relative z-10 p-8 text-center">
            {/* Crown */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber via-yellow to-amber mb-4 shadow-[0_0_40px_rgba(245,166,35,0.4)]">
              <Crown className="text-bg" size={40} />
            </div>

            {/* Title with flame aura effect */}
            <div className="relative inline-block mb-3">
              <h1 className="font-bebas text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-amber via-yellow to-amber animate-shimmer">
                FUNDADOR
              </h1>
              <div className="absolute inset-0 font-bebas text-5xl md:text-6xl text-amber/30 blur-sm animate-pulse">
                FUNDADOR
              </div>
            </div>

            {/* Name */}
            <h2 className="font-rajdhani font-bold text-2xl text-text mb-1">
              {founderInfo.alias} <span className="text-amber">●</span> {founderInfo.name}
            </h2>

            {/* Location */}
            <div className="flex items-center justify-center gap-2 text-text3 mb-6">
              <MapPin size={16} />
              <span>{founderInfo.location}</span>
            </div>

            {/* Verified Badge */}
            <div className="inline-flex items-center gap-2 bg-teal/10 border border-teal/30 px-4 py-2 rounded-full mb-6">
              <Shield className="text-teal" size={18} />
              <span className="text-teal font-semibold">Verificado</span>
              <Star className="text-teal animate-pulse" size={16} />
            </div>

            {/* Quote */}
            <p className="text-text2 italic mb-6 max-w-lg mx-auto">
              "A paixão pelos animes une-nos. Angola tem talento, Angola tem otakus. Este projeto é para todos nós."
            </p>
          </div>
        </div>

        {/* Contact Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="bg-bg2 border border-border rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple/10 flex items-center justify-center">
                <Mail className="text-purple" size={24} />
              </div>
              <div>
                <div className="text-xs text-text3 uppercase tracking-wider">Email</div>
                <a href={`mailto:${founderInfo.email}`} className="text-text hover:text-purple transition-colors">
                  {founderInfo.email}
                </a>
              </div>
            </div>
          </div>

          <div className="bg-bg2 border border-border rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-teal/10 flex items-center justify-center">
                <Phone className="text-teal" size={24} />
              </div>
              <div>
                <div className="text-xs text-text3 uppercase tracking-wider">Telefone</div>
                <div className="text-text">{founderInfo.phones.join(' / ')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-bg2 border border-border rounded-2xl p-6 mb-8">
          <h3 className="font-rajdhani font-bold text-lg text-text mb-4 flex items-center gap-2">
            <ExternalLink size={18} className="text-amber" />
            Redes Sociais
          </h3>
          <div className="flex flex-wrap gap-3">
            <a
              href={founderInfo.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-5 py-3 bg-blue-600/10 border border-blue-600/30 rounded-xl hover:bg-blue-600/20 transition-colors"
            >
              <span className="text-2xl">📘</span>
              <span className="text-text">Facebook</span>
              <ExternalLink size={14} className="text-text3" />
            </a>
            <a
              href={founderInfo.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-5 py-3 bg-pink-600/10 border border-pink-600/30 rounded-xl hover:bg-pink-600/20 transition-colors"
            >
              <span className="text-2xl">📸</span>
              <span className="text-text">Instagram</span>
              <ExternalLink size={14} className="text-text3" />
            </a>
          </div>
        </div>

        {/* Terminal Access */}
        {user && (
          <div className="bg-gradient-to-br from-amber/5 via-bg2 to-red/5 border border-amber/20 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-amber/10 flex items-center justify-center">
                  <Terminal className="text-amber" size={28} />
                </div>
                <div>
                  <h3 className="font-rajdhani font-bold text-lg text-text">Terminal do Fundador</h3>
                  <p className="text-sm text-text3">Acesso administrativo restrito</p>
                </div>
              </div>

              {profile?.role === 'super_admin' ? (
                <button
                  onClick={() => setShowTerminal(true)}
                  className="btn btn-ghost flex items-center gap-2 border-amber/30 text-amber hover:bg-amber/10"
                >
                  <Lock size={16} />
                  Abrir Terminal
                </button>
              ) : (
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="btn btn-ghost flex items-center gap-2 border-amber/30 text-amber hover:bg-amber/10"
                >
                  <Lock size={16} />
                  Autenticar
                </button>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Zap, label: 'Visão', value: 'Inovação' },
            { icon: Heart, label: 'Missão', value: 'Unir Otakus' },
            { icon: Award, label: 'Status', value: 'Fundador' },
            { icon: Star, label: 'Desde', value: '2026' },
          ].map((stat, i) => (
            <div key={i} className="bg-bg2 border border-border rounded-xl p-4 text-center">
              <stat.icon className="mx-auto text-amber mb-2" size={20} />
              <div className="text-xs text-text3">{stat.label}</div>
              <div className="font-rajdhani font-bold text-text">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-bg2 border border-amber/30 rounded-2xl p-6 w-full max-w-md shadow-[0_0_60px_rgba(245,166,35,0.2)]">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Lock className="text-amber" size={24} />
                  <h2 className="font-rajdhani font-bold text-xl text-text">Autenticação</h2>
                </div>
                <button onClick={() => setShowPasswordModal(false)} className="text-text3 hover:text-text">
                  ×
                </button>
              </div>

              <form onSubmit={handlePasswordSubmit}>
                <label className="block text-sm text-text2 mb-2">Digite a senha de acesso:</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input mb-4"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading || !password}
                  className="btn w-full bg-amber text-bg hover:bg-amber/90 disabled:opacity-50"
                >
                  {loading ? 'Verificando...' : 'Autenticar'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Terminal Component */}
        {showTerminal && (
          <div className="fixed inset-0 z-[400]">
            <TerminalComponent
              isOpen={showTerminal}
              onClose={() => setShowTerminal(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Import the terminal component
import TerminalComponent from '../components/TerminalFundador';
