export type CharacterClass = 'ninja' | 'pirata' | 'shinigami' | 'cavaleiro' | 'cacador' | 'tita';

export interface CLASS_INFO_TYPE {
  name: string;
  emoji: string;
  description: string;
  anime: string;
  color: string;
}

export const CLASS_INFO: Record<CharacterClass, CLASS_INFO_TYPE> = {
  ninja: {
    name: 'Ninja',
    emoji: '🥷',
    description: 'Mestre das sombras e técnicas furtivas. Ágil e letal.',
    anime: 'Naruto',
    color: 'purple',
  },
  pirata: {
    name: 'Pirata',
    emoji: '🏴‍☠️',
    description: 'Aventureiro dos mares com força bruta e determinação.',
    anime: 'One Piece',
    color: 'red',
  },
  shinigami: {
    name: 'Shinigami',
    emoji: '💀',
    description: 'Ceifador de almas com poderes espirituais devastadores.',
    anime: 'Bleach',
    color: 'purple2',
  },
  cavaleiro: {
    name: 'Cavaleiro',
    emoji: '⚔️',
    description: 'Guerreiro honrado com armadura e técnicas sagradas.',
    anime: 'Saint Seiya',
    color: 'amber',
  },
  cacador: {
    name: 'Caçador',
    emoji: '🏹',
    description: 'Especialista em Nen, com habilidades versáteis e letais.',
    anime: 'Hunter x Hunter',
    color: 'teal',
  },
  tita: {
    name: 'Tita',
    emoji: '👹',
    description: 'Gigante com força descomunal e resistência imbatível.',
    anime: 'Attack on Titan',
    color: 'red',
  },
};

export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  avatar_url?: string;
  city?: string;
  province?: string;
  country?: string;
  is_admin: boolean;
  is_super_admin: boolean;
  is_event_publisher: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Character {
  id: string;
  user_id: string;
  name: string;
  class: CharacterClass;
  level: number;
  xp: number;
  hp: number;
  max_hp: number;
  attack: number;
  defense: number;
  speed: number;
  special: number;
  wins: number;
  losses: number;
  draws: number;
  title?: string;
  avatar_url?: string;
  banner_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface Duel {
  id: string;
  challenger_id: string;
  opponent_id?: string;
  challenger_character_id?: string;
  opponent_character_id?: string;
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  result?: 'win' | 'loss' | 'draw';
  winner_id?: string;
  xp_reward: number;
  created_at: string;
  completed_at?: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  anime_slug?: string;
  type: 'anime' | 'general' | 'duelo' | 'private';
  description?: string;
  member_count?: number;
  created_at: string;
}

export interface ChatRoomMember {
  id: string;
  room_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  username: string;
  content: string;
  created_at: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  type: 'online' | 'presencial';
  location?: string;
  event_date: string;
  image_url?: string;
  max_participants?: number;
  current_participants: number;
  created_by: string;
  created_at: string;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'follow' | 'duel' | 'event' | 'achievement' | 'system' | 'message' | 'room_request' | 'clan' | 'tournament';
  title: string;
  message?: string;
  data?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

// Post types
export interface Post {
  id: string;
  user_id: string;
  content: string;
  media_type: 'none' | 'image' | 'video' | 'audio' | 'file';
  media_url: string | null;
  media_thumbnail: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  updated_at: string;
}

// Story types
export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail_url: string | null;
  caption?: string;
  views_count: number;
  expires_at: string;
  created_at: string;
}

// Chat room request
export interface ChatRoomRequest {
  id: string;
  requester_id: string;
  name: string;
  description?: string;
  anime_slug?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

// ============================================
// BADGES / ACHIEVEMENTS
// ============================================
export type BadgeCategory = 'general' | 'combat' | 'social' | 'special';
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Badge {
  id: string;
  name: string;
  description?: string;
  icon: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  xp_reward: number;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  badge?: Badge;
  earned_at: string;
  is_displayed: boolean;
}

// ============================================
// QUESTS / DAILY MISSIONS
// ============================================
export type QuestType = 'daily' | 'weekly' | 'special';
export type ObjectiveType = 'duels' | 'wins' | 'posts' | 'comments' | 'follows' | 'story_views' | 'messages';

export interface Quest {
  id: string;
  title: string;
  description?: string;
  type: QuestType;
  objective_type: ObjectiveType;
  objective_count: number;
  xp_reward: number;
  is_active: boolean;
  created_at: string;
}

export interface UserQuest {
  id: string;
  user_id: string;
  quest_id: string;
  quest?: Quest;
  progress: number;
  completed: boolean;
  completed_at?: string;
  expires_at?: string;
  created_at: string;
}

// ============================================
// CLANS / GUILDS
// ============================================
export interface Clan {
  id: string;
  name: string;
  tag: string;
  description?: string;
  logo_url?: string;
  leader_id: string;
  leader?: UserProfile;
  total_wins: number;
  total_members: number;
  is_recruiting: boolean;
  min_level: number;
  created_at: string;
}

export interface ClanMember {
  id: string;
  clan_id: string;
  user_id: string;
  user?: UserProfile;
  character?: Character;
  clan?: Clan;
  role: 'leader' | 'officer' | 'member';
  joined_at: string;
}

export interface ClanRequest {
  id: string;
  clan_id: string;
  clan?: Clan;
  user_id: string;
  user?: UserProfile;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  reviewed_by?: string;
  created_at: string;
}

// ============================================
// TOURNAMENTS
// ============================================
export type TournamentStatus = 'upcoming' | 'registration' | 'active' | 'completed' | 'cancelled';

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  banner_url?: string;
  start_date: string;
  end_date: string;
  registration_deadline: string;
  max_participants: 8 | 16 | 32 | 64;
  min_level: number;
  prize_pool?: string;
  status: TournamentStatus;
  created_by?: string;
  created_at: string;
  participants_count?: number;
}

export interface TournamentParticipant {
  id: string;
  tournament_id: string;
  user_id: string;
  character_id: string;
  user?: UserProfile;
  character?: Character;
  seed?: number;
  eliminated: boolean;
  eliminated_at?: string;
  final_position?: number;
  created_at: string;
}

export type MatchStatus = 'pending' | 'ready' | 'in_progress' | 'completed' | 'bye';

export interface TournamentMatch {
  id: string;
  tournament_id: string;
  round: number;
  match_number: number;
  player1_id?: string;
  player2_id?: string;
  player1_char_id?: string;
  player2_char_id?: string;
  player1?: UserProfile;
  player2?: UserProfile;
  player1_char?: Character;
  player2_char?: Character;
  winner_id?: string;
  duel_id?: string;
  scheduled_at?: string;
  completed_at?: string;
  status: MatchStatus;
}

// ============================================
// REPORTS
// ============================================
export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'fake' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  reporter_id: string;
  reporter?: UserProfile;
  reported_user_id?: string;
  reported_user?: UserProfile;
  reported_post_id?: string;
  reported_post?: Post;
  reported_story_id?: string;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  reviewed_by?: string;
  reviewer?: UserProfile;
  reviewed_at?: string;
  created_at: string;
}

// ============================================
// BLOCKED USERS
// ============================================
export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  blocked_user?: UserProfile;
  created_at: string;
}

// ============================================
// USER SETTINGS
// ============================================
export interface UserSettings {
  id: string;
  user_id: string;
  theme: 'dark' | 'light';
  notifications_enabled: boolean;
  email_notifications: boolean;
  show_province: boolean;
  show_character: boolean;
  language: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// FOLLOWS
// ============================================
export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

// ============================================
// ANGOLAN PROVINCES
// ============================================
export const ANGOLAN_PROVINCES = [
  'Luanda',
  'Benguela',
  'Huambo',
  'Huíla',
  'Cabinda',
  'Cuanza Norte',
  'Cuanza Sul',
  'Cuando Cubango',
  'Cunene',
  'Lunda Norte',
  'Lunda Sul',
  'Malanje',
  'Moxico',
  'Namibe',
  'Uíge',
  'Zaire',
];

// ============================================
// EMOJI LIST FOR CHAT
// ============================================
export const EMOJI_LIST = [
  '😀', '😂', '🥰', '😎', '🤔', '😢', '😡', '🥳', '😴', '🤯',
  '👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '💪', '👋', '🤷',
  '❤️', '💔', '💜', '💙', '💚', '💛', '🧡', '🖤', '💯', '⚡',
  '🔥', '✨', '💥', '🎉', '🏆', '🥇', '👑', '💎', '🌟', '⭐',
  '⚔️', '🛡️', '🏹', '🗡️', '🥷', '🏴‍☠️', '💀', '👹', '🐉', '🦅',
  '📺', '🎬', '🎮', '📺', '🎵', '🎧', '🎸', '🎹', '🎺', '🎻',
  '🇦🇴', '🌍', '🌎', '🌏', '🌐', '📍', '🏠', '🏢', '🏛️', '⛩️',
];

// ============================================
// BADGE DATA (for quick reference)
// ============================================
export const DEFAULT_BADGES = [
  { name: 'Primeiro Duelo', icon: '⚔️', description: 'Completou o teu primeiro duelo', rarity: 'common' as const, xp: 10 },
  { name: 'Viktimador', icon: '🏆', description: 'Ganhou 10 duelos', rarity: 'rare' as const, xp: 50 },
  { name: 'Lenda da Arena', icon: '👑', description: 'Ganhou 100 duelos', rarity: 'legendary' as const, xp: 500 },
  { name: 'Social', icon: '📝', description: 'Fez a primeira publicação', rarity: 'common' as const, xp: 5 },
  { name: 'Popular', icon: '⭐', description: 'Conseguiu 50 seguidores', rarity: 'rare' as const, xp: 100 },
  { name: 'Influencer', icon: '🌟', description: 'Conseguiu 200 seguidores', rarity: 'epic' as const, xp: 300 },
  { name: 'Veterano', icon: '🎖️', description: 'Membro há 1 ano', rarity: 'epic' as const, xp: 200 },
  { name: 'Fundador', icon: '💎', description: 'Um dos primeiros 100 membros', rarity: 'legendary' as const, xp: 1000 },
];
