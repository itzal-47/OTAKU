/**
 * Biblioteca de Skeletons reutilizáveis — para usar em todas as páginas
 * em vez de spinners genéricos. Mantém os loading states consistentes
 * em toda a app (Feed, Stories e Wiki já seguem este padrão).
 *
 * Uso:
 *   import { SkeletonCard, SkeletonList, SkeletonAvatarLine, SkeletonGrid } from '../components/Skeleton';
 *
 *   {loading ? <SkeletonList count={3} /> : <PostsList posts={posts} />}
 */

// ─── Primitivos ─────────────────────────────────────────────────────────────

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`bg-bg3 rounded-lg animate-pulse ${className}`} />;
}

export function SkeletonCircle({ size = 10 }: { size?: number }) {
  return <div className={`w-${size} h-${size} rounded-full bg-bg3 animate-pulse flex-shrink-0`} />;
}

// ─── Card genérico (post, item de lista) ────────────────────────────────────

export function SkeletonCard() {
  return (
    <div className="bg-bg2 border border-border rounded-2xl p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-bg3" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-bg3 rounded w-32" />
          <div className="h-2.5 bg-bg3 rounded w-20" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-bg3 rounded w-full" />
        <div className="h-3 bg-bg3 rounded w-4/5" />
        <div className="h-3 bg-bg3 rounded w-3/5" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

// ─── Linha simples (avatar + texto) — usar em wiki, listas de membros, etc ──

export function SkeletonAvatarLine() {
  return (
    <div className="flex items-center gap-3 bg-bg2 border border-border rounded-xl p-3 animate-pulse">
      <div className="w-9 h-9 rounded-full bg-bg3 flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-bg3 rounded w-1/3" />
        <div className="h-2.5 bg-bg3 rounded w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonAvatarLineList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {[...Array(count)].map((_, i) => <SkeletonAvatarLine key={i} />)}
    </div>
  );
}

// ─── Grid de cards (grupos, clãs, eventos, loja) ────────────────────────────

export function SkeletonGridCard() {
  return <div className="h-48 bg-bg2 border border-border rounded-2xl animate-pulse" />;
}

export function SkeletonGrid({ count = 6, columns = 3 }: { count?: number; columns?: 2 | 3 | 4 }) {
  const colClass = columns === 2 ? 'sm:grid-cols-2' : columns === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3';
  return (
    <div className={`grid grid-cols-1 ${colClass} gap-4`}>
      {[...Array(count)].map((_, i) => <SkeletonGridCard key={i} />)}
    </div>
  );
}

// ─── Story/media — quadrado 9:16 ─────────────────────────────────────────────

export function SkeletonStoryCard() {
  return <div className="aspect-[9/16] rounded-2xl bg-bg2 border border-border animate-pulse" />;
}

export function SkeletonStoryGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {[...Array(count)].map((_, i) => <SkeletonStoryCard key={i} />)}
    </div>
  );
}

// ─── Página inteira (header + conteúdo) — usar como fallback geral ──────────

export function SkeletonPage() {
  return (
    <div className="min-h-screen pt-20 px-4">
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="space-y-2">
          <SkeletonBlock className="h-8 w-56" />
          <SkeletonBlock className="h-4 w-72" />
        </div>
        <SkeletonList count={3} />
      </div>
    </div>
  );
}

// ─── Spinner mínimo — só para acções inline (botões, "carregar mais") ───────

export function InlineSpinner({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      className={`border-2 border-border2 border-t-purple rounded-full animate-spin ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
