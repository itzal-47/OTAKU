/**
 * OTAKU KAMBA - TIPOS GLOBAIS
 * 
 * ⚠️ SUBSTITUIR: src/types/index.ts com este arquivo
 * 
 * Benefícios:
 * ✅ Type safety em 100% do projeto
 * ✅ Autocomplete perfeito no IDE
 * ✅ Erros capturados em tempo de compilação
 * ✅ Documentação embutida (JSDoc)
 * ✅ Reutilizável em services, hooks, componentes
 */

// ============================================================================
// 🔐 AUTHENTICATION & USERS
// ============================================================================

/** Usuário autenticado no sistema */
export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
  is_admin: boolean;
  role: UserRole;
  status: UserStatus;
  last_login?: string;
}

/** Tipos de role de usuário */
export type UserRole = 'user' | 'secondary_admin' | 'supreme_admin' | 'moderator';

/** Estados possíveis do usuário */
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'banned';

/** Perfil público do usuário */
export interface UserProfile {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  total_followers: number;
  total_following: number;
  total_posts: number;
  badges: Badge[];
  is_following: boolean;
}

// ============================================================================
// 👾 CHARACTER (Personagem do usuário)
// ============================================================================

/** Personagem criado pelo usuário */
export interface Character {
  id: string;
  user_id: string;
  name: string;
  anime_reference?: string;
  description?: string;
  level: number;
  xp: number;
  total_xp: number;
  health: number;
  max_health: number;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  stats: CharacterStats;
  inventory: InventoryItem[];
}

/** Stats de combate do personagem */
export interface CharacterStats {
  attack: number;
  defense: number;
  speed: number;
  special: number;
}

/** Item no inventário */
export interface InventoryItem {
  id: string;
  character_id: string;
  item_id: string;
  quantity: number;
  rarity: ItemRarity;
  acquired_at: string;
}

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

// ============================================================================
// 🏰 CLANS - O CORE DO SOCIAL
// ============================================================================

/** Clã - grupo de jogadores */
export interface Clan {
  id: string;
  name: string;
  tag: string;
  description?: string;
  leader_id: string;
  leader_name?: string;
  logo_url?: string;
  
  // Estatísticas
  total_members: number;
  total_wins: number;
  total_losses: number;
  clan_level: number;
  weekly_contribution: number; // XP acumulado na semana
  total_xp: number;
  
  // Requisitos
  min_level: number;
  is_private: boolean;
  
  // Metadata
  created_at: string;
  updated_at: string;
  last_activity?: string;
  
  // Ranking
  legendary_rank?: number; // Se estiver no top 5 semanal
}

/** Membro de um clã */
export interface ClanMember {
  id: string;
  clan_id: string;
  user_id: string;
  
  // Dados do membro
  username?: string;
  avatar_url?: string;
  character_level?: number;
  
  // Papel no clã
  role: ClanMemberRole;
  
  // Contribuição
  contribution: number; // XP contribuído
  weekly_contribution: number; // XP desta semana
  total_wins: number;
  total_losses: number;
  
  // Timeline
  joined_at: string;
  updated_at: string;
  last_activity?: string;
}

export type ClanMemberRole = 'member' | 'officer' | 'leader';

/** Pedido para entrar num clã */
export interface ClanRequest {
  id: string;
  clan_id: string;
  user_id: string;
  
  // Dados do solicitante
  username?: string;
  character_level?: number;
  
  // Status
  status: RequestStatus;
  
  // Quem revisor
  reviewed_by?: string;
  reviewed_at?: string;
  
  // Timeline
  created_at: string;
  message?: string;
}

export type RequestStatus = 'pending' | 'approved' | 'rejected';

/** Relação de membro com clã (estado do usuário) */
export interface ClanMembership {
  clan_id: string;
  clan?: Clan;
  role: ClanMemberRole;
  joined_at: string;
  contribution: number;
}

// ============================================================================
// 🎮 GAMIFICATION
// ============================================================================

/** Badge/Troféu ganho pelo usuário */
export interface Badge {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  icon_url?: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  earned_at: string;
  progress?: number; // 0-100 para badges em progresso
}

export type BadgeCategory = 'combat' | 'social' | 'collection' | 'achievement' | 'seasonal';
export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/** Achievement desbloqueado */
export interface Achievement {
  id: string;
  user_id: string;
  achievement_id: string;
  name: string;
  description?: string;
  icon_url?: string;
  progress: number; // 0-100
  completed: boolean;
  completed_at?: string;
}

/** Streak de atividade */
export interface ActivityStreak {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  current_streak: number;
  longest_streak: number;
  last_activity_at: string;
}

export type ActivityType = 'login' | 'battle' | 'post' | 'chat' | 'quest';

/** Shop item disponível */
export interface ShopItem {
  id: string;
  name: string;
  description?: string;
  icon_url?: string;
  price: number;
  price_type: PriceType;
  rarity: ItemRarity;
  available: boolean;
  available_from?: string;
  available_until?: string;
}

export type PriceType = 'gold' | 'gems' | 'limited';

// ============================================================================
// ⚔️ BATTLES / ARENA
// ============================================================================

/** Duelo na arena */
export interface Battle {
  id: string;
  challenger_id: string;
  defender_id: string;
  
  // Resultado
  winner_id?: string;
  status: BattleStatus;
  
  // XP e recompensas
  xp_awarded?: number;
  gold_awarded?: number;
  
  // Timeline
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export type BattleStatus = 'pending' | 'in_progress' | 'completed' | 'expired';

/** Match ranking */
export interface BattleRanking {
  user_id: string;
  username: string;
  avatar_url?: string;
  ranking: number;
  elo: number;
  total_wins: number;
  total_losses: number;
  win_rate: number;
}

// ============================================================================
// 📅 EVENTS & TOURNAMENTS
// ============================================================================

/** Evento no sistema */
export interface Event {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  category: EventCategory;
  
  // Timing
  starts_at: string;
  ends_at: string;
  
  // Participação
  registration_required: boolean;
  max_participants?: number;
  current_participants: number;
  
  // Recompensas
  reward_xp?: number;
  reward_gold?: number;
  reward_badge_id?: string;
  
  created_at: string;
  updated_at: string;
}

export type EventCategory = 'seasonal' | 'special' | 'anime_related' | 'community' | 'tournament';

/** Torneio - formato estruturado */
export interface Tournament {
  id: string;
  name: string;
  description?: string;
  icon_url?: string;
  
  // Formato
  format: TournamentFormat;
  max_participants: number;
  current_participants: number;
  
  // Timing
  registration_opens_at: string;
  starts_at: string;
  ends_at: string;
  
  // Status
  status: TournamentStatus;
  
  // Recompensas
  first_prize_xp: number;
  second_prize_xp: number;
  third_prize_xp: number;
  
  created_at: string;
}

export type TournamentFormat = 'single_elimination' | 'double_elimination' | 'round_robin' | 'swiss';
export type TournamentStatus = 'registration' | 'active' | 'completed' | 'cancelled';

/** Participação em torneio */
export interface TournamentEntry {
  id: string;
  tournament_id: string;
  user_id: string;
  username?: string;
  character_level?: number;
  position?: number; // Colocação final
  status: EntryStatus;
  created_at: string;
}

export type EntryStatus = 'registered' | 'active' | 'eliminated' | 'completed' | 'withdrawn';

// ============================================================================
// 💬 SOCIAL (Chat, Follow, etc)
// ============================================================================

/** Mensagem privada */
export interface Message {
  id: string;
  from_user_id: string;
  to_user_id: string;
  
  content: string;
  
  read: boolean;
  read_at?: string;
  
  created_at: string;
  updated_at?: string;
}

/** Chat - Conversa em grupo/clã */
export interface Chat {
  id: string;
  name?: string;
  type: ChatType;
  related_id?: string; // clan_id, tournament_id, etc
  
  participants: string[]; // user_ids
  
  created_at: string;
  updated_at: string;
}

export type ChatType = 'group' | 'clan' | 'tournament' | 'event';

/** Mensagem em chat */
export interface ChatMessage {
  id: string;
  chat_id: string;
  user_id: string;
  username?: string;
  avatar_url?: string;
  
  content: string;
  
  created_at: string;
  updated_at?: string;
  edited_at?: string;
}

/** Notificação para usuário */
export interface Notification {
  id: string;
  user_id: string;
  
  type: NotificationType;
  title: string;
  message: string;
  icon_url?: string;
  
  related_user_id?: string;
  related_clan_id?: string;
  related_event_id?: string;
  
  read: boolean;
  read_at?: string;
  
  action_url?: string;
  
  created_at: string;
}

export type NotificationType =
  | 'follow'
  | 'message'
  | 'clan_invite'
  | 'clan_request'
  | 'battle_challenge'
  | 'battle_result'
  | 'achievement'
  | 'event'
  | 'tournament'
  | 'badge'
  | 'comment'
  | 'system';

/** Follow/Seguidores */
export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

// ============================================================================
// 📺 ANIME CONTENT
// ============================================================================

/** Anime no Wiki */
export interface Anime {
  id: string;
  mal_id?: number; // MyAnimeList ID
  title: string;
  title_english?: string;
  description?: string;
  image_url?: string;
  
  episodes: number;
  status: AnimeStatus;
  aired_from?: string;
  aired_to?: string;
  
  genres: string[];
  studios: string[];
  rating?: number; // 0-10
  
  created_at: string;
  updated_at: string;
}

export type AnimeStatus = 'airing' | 'finished' | 'upcoming';

/** Episódio em programação */
export interface AnimeSchedule {
  id: string;
  anime_id: string;
  anime_title: string;
  
  episode_number: number;
  episode_title?: string;
  
  airs_at: string;
  aired: boolean;
  
  created_at: string;
}

/** Watchlist do usuário */
export interface Watchlist {
  id: string;
  user_id: string;
  anime_id: string;
  anime_title?: string;
  anime_image_url?: string;
  
  status: WatchlistStatus;
  episodes_watched: number;
  rating?: number;
  
  added_at: string;
  updated_at: string;
}

export type WatchlistStatus = 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';

/** Fan art postado */
export interface FanArt {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  image_url: string;
  
  anime_id?: string;
  tags: string[];
  
  likes_count: number;
  comments_count: number;
  
  created_at: string;
  updated_at: string;
}

/** Quote/Citação favorita */
export interface Quote {
  id: string;
  user_id?: string; // Se null, é quote sistema
  anime_id?: string;
  character_name?: string;
  
  content: string;
  context?: string;
  
  likes_count: number;
  
  created_at: string;
}

/** OST - Trilha sonora */
export interface OST {
  id: string;
  anime_id: string;
  anime_title?: string;
  
  title: string;
  artist?: string;
  duration?: number; // segundos
  url?: string;
  cover_url?: string;
  
  type: OSTType;
  
  likes_count: number;
  
  created_at: string;
}

export type OSTType = 'opening' | 'ending' | 'background' | 'ost';

// ============================================================================
// 📱 STORIES & FEED
// ============================================================================

/** Story (tipo Instagram) */
export interface Story {
  id: string;
  user_id: string;
  username?: string;
  avatar_url?: string;
  
  content: string;
  media_url?: string;
  
  views_count: number;
  viewed_by: string[]; // user_ids
  
  expires_at: string;
  created_at: string;
}

/** Post no feed */
export interface Post {
  id: string;
  user_id: string;
  username?: string;
  avatar_url?: string;
  
  content: string;
  media_urls?: string[];
  
  likes_count: number;
  comments_count: number;
  
  liked_by_user: boolean;
  
  created_at: string;
  updated_at?: string;
}

/** Comentário em post */
export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  username?: string;
  avatar_url?: string;
  
  content: string;
  
  likes_count: number;
  liked_by_user: boolean;
  
  created_at: string;
  updated_at?: string;
}

// ============================================================================
// 📊 FEEDBACK & SYSTEM
// ============================================================================

/** Feedback do usuário sobre o app */
export interface Feedback {
  id: string;
  user_id?: string;
  
  type: FeedbackType;
  title: string;
  message: string;
  
  rating?: number;
  
  read: boolean;
  resolved: boolean;
  
  created_at: string;
}

export type FeedbackType = 'bug' | 'feature_request' | 'improvement' | 'other';

/** Estadísticas de visitante (sem login) */
export interface VisitorStats {
  session_id: string;
  page: string;
  referrer?: string;
  user_agent?: string;
  created_at: string;
}

// ============================================================================
// 🎯 QUESTS & CHALLENGES
// ============================================================================

/** Quest para completar */
export interface Quest {
  id: string;
  title: string;
  description?: string;
  icon_url?: string;
  
  // Objetivo
  objective_type: ObjectiveType;
  objective_target: number; // quanto precisa fazer
  
  // Recompensas
  reward_xp: number;
  reward_gold?: number;
  reward_badge_id?: string;
  
  // Timing
  available_from?: string;
  available_until?: string;
  duration_days?: number;
  
  // Status
  is_active: boolean;
  difficulty: Difficulty;
  
  created_at: string;
}

export type ObjectiveType = 'wins' | 'xp_earned' | 'posts' | 'followers' | 'battles' | 'collection';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'legendary';

/** Progresso do usuário em quest */
export interface QuestProgress {
  id: string;
  user_id: string;
  quest_id: string;
  
  current_progress: number;
  completed: boolean;
  completed_at?: string;
  
  created_at: string;
  updated_at: string;
}

// ============================================================================
// 🔄 API/RESPONSE TYPES
// ============================================================================

/** Resposta genérica de sucesso */
export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
}

/** Resposta genérica de erro */
export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, any>;
}

/** Resposta paginada */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// ============================================================================
// 📝 HELPER TYPES
// ============================================================================

/** Estado de carregamento */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/** Resultado com loading e error */
export interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/** Opções de ordenação */
export type SortOrder = 'asc' | 'desc';

export interface SortOption {
  field: string;
  order: SortOrder;
}

/** Filtros genéricos */
export interface FilterOptions {
  page?: number;
  limit?: number;
  search?: string;
  sort?: SortOption;
  [key: string]: any;
}

// ============================================================================
// 🚨 GUARDS & TYPE CHECKERS
// ============================================================================

/**
 * Type guards (para runtime type checking)
 * Exemplo:
 * if (isClan(data)) {
 *   // TypeScript agora sabe que data é Clan
 * }
 */

export function isClan(obj: any): obj is Clan {
  return obj && typeof obj === 'object' && 'tag' in obj && 'clan_level' in obj;
}

export function isClanMember(obj: any): obj is ClanMember {
  return obj && typeof obj === 'object' && 'clan_id' in obj && 'role' in obj;
}

export function isUser(obj: any): obj is User {
  return obj && typeof obj === 'object' && 'email' in obj && 'username' in obj;
}

export function isCharacter(obj: any): obj is Character {
  return obj && typeof obj === 'object' && 'user_id' in obj && 'level' in obj && 'xp' in obj;
}
