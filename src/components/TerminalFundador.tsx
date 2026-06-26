import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import {
  Terminal, X, Lock, Crown, Shield, Users, Swords, Gift, Star,
  Settings, Database, Trash2, UserPlus, Award, Zap, Eye, LockKeyhole
} from 'lucide-react';

interface TerminalFundadorProps {
  isOpen: boolean;
  onClose: () => void;
}

type TerminalCommand = {
  cmd: string;
  description: string;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  execute: () => Promise<string>;
};

export default function TerminalFundador({ isOpen, onClose }: TerminalFundadorProps) {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<string[]>(['╔══════════════════════════════════════════════╗', '║   OTAKU KAMBA - TERMINAL DO FUNDADOR         ║', '╚══════════════════════════════════════════════╝', '']);
  const [loading, setLoading] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadProfileData();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  async function loadProfileData() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user!.id)
      .single();
    setProfileData(data);

    if (data?.role === 'super_admin') {
      addOutput(`⚡ Bem-vindo de volta, FUNDADOR ${data.username}!`);
      addOutput('─────────────────────────────────────────────');
    }
  }

  function addOutput(text: string) {
    setOutput(prev => [...prev, text]);
  }

  function clearOutput() {
    setOutput(['╔══════════════════════════════════════════════╗', '║   OTAKU KAMBA - TERMINAL DO FUNDADOR         ║', '╚══════════════════════════════════════════════╝', '']);
  }

  async function handleCommand(cmd: string) {
    const command = cmd.trim().toLowerCase();
    addOutput(`> ${cmd}`);

    setLoading(true);

    try {
      switch (command) {
        case 'lista':
        case 'help':
        case 'ajuda':
          await showCommandList();
          break;

        case 'stats':
        case 'estatisticas':
          await showStats();
          break;

        case 'usuarios':
        case 'users':
          await listUsers();
          break;

        case 'dar_admin':
          addOutput('Uso: dar_admin <user_id>');
          addOutput('Exemplo: dar_admin abc123...');
          break;

        case 'remover_admin':
          addOutput('Uso: remover_admin <user_id>');
          break;

        case 'dar_xp':
          addOutput('Uso: dar_xp <user_id> <quantidade>');
          break;

        case 'dar_badge':
          addOutput('Uso: dar_badge <user_id> <badge_nome>');
          break;

        case 'limpar_logs':
          await clearLogs();
          break;

        case 'ver_perfil':
          await viewOwnProfile();
          break;

        case 'info':
        case 'fundador':
          await showFounderInfo();
          break;

        case 'cls':
        case 'clear':
        case 'limpar':
          clearOutput();
          break;

        case 'duelos':
          await showDuelsStats();
          break;

        case 'cla':
        case 'clans':
          await showClanStats();
          break;

        case 'shop':
        case 'loja':
          await showShopStats();
          break;

        case 'sair':
        case 'exit':
        case 'quit':
          onClose();
          break;

        default:
          // Check for commands with arguments
          if (command.startsWith('dar_admin ')) {
            await grantAdmin(cmd.split(' ')[1]);
          } else if (command.startsWith('remover_admin ')) {
            await revokeAdmin(cmd.split(' ')[1]);
          } else if (command.startsWith('dar_xp ')) {
            const parts = cmd.split(' ');
            if (parts.length >= 3) {
              await grantXP(parts[1], parseInt(parts[2]));
            }
          } else if (command.startsWith('ver_usuario ')) {
            await viewUser(cmd.split(' ')[1]);
          } else {
            addOutput('Comando não reconhecido. Digite "lista" para ver os comandos disponíveis.');
          }
      }
    } catch (error: any) {
      addOutput(`ERRO: ${error.message || 'Ocorreu um erro desconhecido'}`);
    }

    // Log command
    await supabase.from('terminal_logs').insert({
      user_id: user!.id,
      command: cmd,
      result: 'executed'
    });

    setLoading(false);
    setInput('');
  }

  async function showCommandList() {
    const commands = [
      { cmd: 'lista / help', desc: 'Mostra esta lista de comandos' },
      { cmd: 'stats', desc: 'Mostra estatísticas gerais do sistema', admin: true },
      { cmd: 'usuarios', desc: 'Lista todos os utilizadores', admin: true },
      { cmd: 'ver_usuario <id>', desc: 'Ver detalhes de um utilizador', admin: true },
      { cmd: 'dar_admin <id>', desc: 'Promove utilizador a Admin', superAdmin: true },
      { cmd: 'remover_admin <id>', desc: 'Remove privilégios de Admin', superAdmin: true },
      { cmd: 'dar_xp <id> <qtd>', desc: 'Dá XP a um utilizador', superAdmin: true },
      { cmd: 'dar_badge <id> <badge>', desc: 'Dá badge a um utilizador', superAdmin: true },
      { cmd: 'duelos', desc: 'Estatísticas de duelos', admin: true },
      { cmd: 'clans', desc: 'Estatísticas de clãs', admin: true },
      { cmd: 'shop', desc: 'Estatísticas da loja', admin: true },
      { cmd: 'limpar_logs', desc: 'Limpa logs do terminal', superAdmin: true },
      { cmd: 'ver_perfil', desc: 'Ver teu perfil atual' },
      { cmd: 'info', desc: 'Informações do Fundador' },
      { cmd: 'cls / limpar', desc: 'Limpa a tela' },
      { cmd: 'sair', desc: 'Fechar terminal' },
    ];

    addOutput('');
    addOutput('═════════════ COMANDOS DISPONÍVEIS ═════════════');
    addOutput('');

    const role = profileData?.role || 'user';

    commands.forEach(c => {
      if (c.superAdmin && role !== 'super_admin') return;
      if (c.admin && role !== 'admin' && role !== 'super_admin') return;
      addOutput(`  ${c.cmd.padEnd(25)} │ ${c.desc}`);
    });

    addOutput('');
    addOutput('─────────────────────────────────────────────');
  }

  async function showStats() {
    if (!isEligible('admin')) {
      addOutput('PERMISSÃO NEGADA: Apenas Admins podem executar este comando.');
      return;
    }

    const [users, characters, duels, posts, clans, items] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('characters').select('id', { count: 'exact', head: true }),
      supabase.from('duels').select('id', { count: 'exact', head: true }),
      supabase.from('posts').select('id', { count: 'exact', head: true }),
      supabase.from('clans').select('id', { count: 'exact', head: true }),
      supabase.from('shop_items').select('id', { count: 'exact', head: true }),
    ]);

    addOutput('');
    addOutput('═════════════ ESTATÍSTICAS GERAIS ═════════════');
    addOutput('');
    addOutput(`  👤 Utilizadores:     ${users.count || 0}`);
    addOutput(`  ⚔️ Personagens:     ${characters.count || 0}`);
    addOutput(`  🗡️ Duelos:          ${duels.count || 0}`);
    addOutput(`  📝 Posts:           ${posts.count || 0}`);
    addOutput(`  🛡️ Clãs:            ${clans.count || 0}`);
    addOutput(`  🛒 Itens Loja:       ${items.count || 0}`);
    addOutput('');
  }

  async function listUsers() {
    if (!isEligible('admin')) {
      addOutput('PERMISSÃO NEGADA: Apenas Admins podem executar este comando.');
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('id, username, role, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!data?.length) {
      addOutput('Nenhum utilizador encontrado.');
      return;
    }

    addOutput('');
    addOutput('═════════════ UTILIZADORES RECENTES ═════════════');
    addOutput('');

    data.forEach(u => {
      const roleIcon = u.role === 'super_admin' ? '👑' : u.role === 'admin' ? '⭐' : '👤';
      addOutput(`  ${roleIcon} ${u.username.padEnd(20)} │ ${u.role.padEnd(12)} │ ${u.id.substring(0, 8)}...`);
    });

    addOutput('');
  }

  async function viewUser(userId: string) {
    if (!isEligible('admin')) {
      addOutput('PERMISSÃO NEGADA');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profile) {
      addOutput('Utilizador não encontrado.');
      return;
    }

    const { data: character } = await supabase
      .from('characters')
      .select('*')
      .eq('user_id', userId)
      .single();

    addOutput('');
    addOutput(`═════════════ PERFIL: ${profile.username} ═════════════`);
    addOutput('');
    addOutput(`  ID:           ${profile.id}`);
    addOutput(`  Username:     ${profile.username}`);
    addOutput(`  Email:        ${profile.email || 'N/A'}`);
    addOutput(`  Role:         ${profile.role || 'user'}`);
    addOutput(`  Província:    ${profile.province || 'N/A'}`);
    addOutput(`  Verificado:   ${profile.is_verified ? 'Sim' : 'Não'}`);
    addOutput(`  Título:       ${profile.title || 'Nenhum'}`);
    addOutput(`  Criado em:    ${new Date(profile.created_at).toLocaleDateString('pt-AO')}`);

    if (character) {
      addOutput('');
      addOutput('  ─── PERSONAGEM ───');
      addOutput(`  Nome:         ${character.name}`);
      addOutput(`  Classe:       ${character.class}`);
      addOutput(`  Nível:        ${character.level}`);
      addOutput(`  XP:           ${character.xp}`);
      addOutput(`  Vitórias:     ${character.wins}`);
      addOutput(`  Derrotas:     ${character.losses}`);
    }
    addOutput('');
  }

  async function grantAdmin(userId: string) {
    if (!isEligible('super_admin')) {
      addOutput('PERMISSÃO NEGADA: Apenas o FUNDADOR pode executar este comando.');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: 'admin', is_admin: true })
      .eq('id', userId);

    if (error) {
      addOutput(`ERRO: ${error.message}`);
    } else {
      addOutput(`SUCESSO: Utilizador ${userId} promovido a Admin.`);
      showToast('Admin promovido com sucesso!', 'success');
    }
  }

  async function revokeAdmin(userId: string) {
    if (!isEligible('super_admin')) {
      addOutput('PERMISSÃO NEGADA');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: 'user', is_admin: false })
      .eq('id', userId);

    if (error) {
      addOutput(`ERRO: ${error.message}`);
    } else {
      addOutput(`SUCESSO: Privilégios de Admin removidos de ${userId}.`);
    }
  }

  async function grantXP(userId: string, amount: number) {
    if (!isEligible('super_admin')) {
      addOutput('PERMISSÃO NEGADA');
      return;
    }

    const { data: char } = await supabase
      .from('characters')
      .select('xp')
      .eq('user_id', userId)
      .single();

    if (!char) {
      addOutput('ERRO: Utilizador não tem personagem.');
      return;
    }

    const { error } = await supabase
      .from('characters')
      .update({ xp: char.xp + amount })
      .eq('user_id', userId);

    if (error) {
      addOutput(`ERRO: ${error.message}`);
    } else {
      addOutput(`SUCESSO: ${amount} XP adicionados ao utilizador ${userId}.`);
      showToast('XP adicionado!', 'success');
    }
  }

  async function clearLogs() {
    if (!isEligible('super_admin')) {
      addOutput('PERMISSÃO NEGADA');
      return;
    }

    await supabase.from('terminal_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    addOutput('Logs limpos com sucesso.');
  }

  async function viewOwnProfile() {
    if (!profileData) return;
    await viewUser(user!.id);
  }

  async function showFounderInfo() {
    const { data } = await supabase.from('founder_info').select('*').single();

    addOutput('');
    addOutput('═════════════════ FUNDADOR ═════════════════');
    addOutput('');
    addOutput(`  👑 Nome:    José Eduardo Numa Canjo`);
    addOutput(`  🎭 Alias:   itzal`);
    addOutput(`  📍 Local:   Huambo, Angola`);
    addOutput(`  📧 Email:   edivaldotc16@gmail.com`);
    addOutput(`  📱 Contato: 973900858 / 956498238`);
    addOutput('');
    if (data?.social_links) {
      addOutput('  ─── REDES SOCIAIS ───');
      addOutput(`  📘 Facebook: facebook.com/edivaldo.dajielexprofunda`);
      addOutput(`  📸 Instagram: instagram.com/joseeduardonuma`);
    }
    addOutput('');
    addOutput('─────────────────────────────────────────────');
  }

  async function showDuelsStats() {
    if (!isEligible('admin')) {
      addOutput('PERMISSÃO NEGADA');
      return;
    }

    const [waiting, inProgress, completed, cancelled] = await Promise.all([
      supabase.from('duels').select('id', { count: 'exact', head: true }).eq('status', 'waiting'),
      supabase.from('duels').select('id', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('duels').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('duels').select('id', { count: 'exact', head: true }).eq('status', 'cancelled'),
    ]);

    addOutput('');
    addOutput('═════════════ ESTATÍSTICAS DE DUELOS ═════════════');
    addOutput('');
    addOutput(`  ⏳ Aguardando:    ${waiting.count || 0}`);
    addOutput(`  ⚔️ Em progresso:  ${inProgress.count || 0}`);
    addOutput(`  ✅ Completos:     ${completed.count || 0}`);
    addOutput(`  ❌ Cancelados:    ${cancelled.count || 0}`);
    addOutput('');
  }

  async function showClanStats() {
    if (!isEligible('admin')) {
      addOutput('PERMISSÃO NEGADA');
      return;
    }

    const { data: clans } = await supabase
      .from('clans')
      .select('name, tag, total_members, total_wins, weekly_contribution')
      .order('weekly_contribution', { ascending: false })
      .limit(10);

    addOutput('');
    addOutput('═════════════ TOP CLÃS ═════════════');
    addOutput('');

    clans?.forEach((c, i) => {
      addOutput(`  ${String(i + 1).padStart(2)}. [${c.tag}] ${c.name.padEnd(15)} │ ${c.total_members} membros │ ${c.total_wins} vitórias`);
    });
    addOutput('');
  }

  async function showShopStats() {
    if (!isEligible('admin')) {
      addOutput('PERMISSÃO NEGADA');
      return;
    }

    const [items, purchases] = await Promise.all([
      supabase.from('shop_items').select('id', { count: 'exact', head: true }),
      supabase.from('user_inventory').select('id', { count: 'exact', head: true }),
    ]);

    addOutput('');
    addOutput('═════════════ ESTATÍSTICAS DA LOJA ═════════════');
    addOutput('');
    addOutput(`  🛒 Itens disponíveis:  ${items.count || 0}`);
    addOutput(`  📦 Compras totais:     ${purchases.count || 0}`);
    addOutput('');
  }

  function isEligible(requiredRole: 'admin' | 'super_admin'): boolean {
    const currentRole = profileData?.role || 'user';
    if (requiredRole === 'super_admin') {
      return currentRole === 'super_admin';
    }
    return currentRole === 'admin' || currentRole === 'super_admin';
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-[#0a0a0f] border border-amber/30 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(245,166,35,0.15)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber/10 via-bg2 to-amber/10 border-b border-amber/20">
          <div className="flex items-center gap-3">
            <Terminal className="text-amber" size={24} />
            <span className="font-bebas text-xl text-amber tracking-wider">TERMINAL DO FUNDADOR</span>
            {profileData?.role === 'super_admin' && (
              <span className="px-2 py-0.5 bg-amber/20 text-amber text-xs font-bold rounded animate-pulse">
                FUNDADOR
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-text3 hover:text-text transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Output */}
        <div
          ref={outputRef}
          className="h-[400px] overflow-y-auto p-6 font-mono text-sm text-green-400 bg-[#050508]"
        >
          {output.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap">{line}</div>
          ))}
        </div>

        {/* Input */}
        <div className="flex items-center gap-3 px-6 py-4 bg-bg2 border-t border-border">
          <span className="text-amber font-mono">{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && input.trim()) {
                handleCommand(input);
              }
            }}
            placeholder="Digite um comando..."
            className="flex-1 bg-transparent border-none outline-none font-mono text-green-400 placeholder-green-400/30"
            disabled={loading}
          />
          <button
            onClick={() => input.trim() && handleCommand(input)}
            disabled={loading || !input.trim()}
            className="px-4 py-1.5 bg-amber/20 text-amber rounded-lg text-sm font-semibold hover:bg-amber/30 transition-colors disabled:opacity-50"
          >
            Executar
          </button>
        </div>

        {/* Footer hint */}
        <div className="px-6 py-2 bg-bg3 text-xs text-text3 text-center">
          Digite "lista" para ver os comandos disponíveis • "sair" para fechar
        </div>
      </div>
    </div>
  );
}
