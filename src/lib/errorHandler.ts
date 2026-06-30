/**
 * Tratamento de erros centralizado.
 *
 * Substitui padrões como `catch { /* ignora *\/ }` ou `catch { showToast('Erro', 'error') }`
 * por um único helper que:
 *  1. Sempre regista o erro real na consola (para conseguires depurar)
 *  2. Mostra uma mensagem amigável ao utilizador
 *  3. Permite tratamento especial por código de erro do Supabase/Postgres
 *
 * Uso típico:
 *
 *   import { handleError } from '../lib/errorHandler';
 *   ...
 *   try {
 *     await supabase.from('posts').insert({...});
 *   } catch (err) {
 *     handleError(err, showToast, { context: 'criar publicação' });
 *   }
 */

export type ToastFn = (message: string, type: 'success' | 'error' | 'info') => void;

interface HandleErrorOptions {
  /** Curto descritivo do que estava a acontecer, usado na consola e em mensagens genéricas. Ex: "criar grupo" */
  context?: string;
  /** Mapeamento de códigos de erro Postgres/Supabase para mensagens amigáveis específicas */
  codeMessages?: Record<string, string>;
  /** Se true, não mostra toast — só regista na consola (para erros não-críticos / esperados) */
  silent?: boolean;
}

// Mensagens amigáveis para os códigos de erro mais comuns no Postgres/Supabase
const DEFAULT_CODE_MESSAGES: Record<string, string> = {
  '23505': 'Esse registo já existe.',
  '23503': 'Operação inválida — referência em falta.',
  '42501': 'Não tens permissão para esta acção.',
  '42P17': 'Erro de configuração no servidor. Contacta o suporte.',
  'PGRST116': 'Nenhum resultado encontrado.',
  '23502': 'Faltam dados obrigatórios.',
};

export function handleError(err: unknown, showToast: ToastFn, options: HandleErrorOptions = {}): void {
  const { context = '', codeMessages = {}, silent = false } = options;

  const error = err as { code?: string; message?: string; details?: string } | null;
  const code = error?.code;
  const rawMessage = error?.message;

  // Sempre regista o erro real — isto é o que faltava nos catches vazios
  console.error(`[Erro${context ? ` — ${context}` : ''}]`, err);

  if (silent) return;

  const friendlyMessage =
    (code && codeMessages[code]) ||
    (code && DEFAULT_CODE_MESSAGES[code]) ||
    (rawMessage && rawMessage.length < 100 ? rawMessage : null) ||
    (context ? `Erro ao ${context}. Tenta novamente.` : 'Algo correu mal. Tenta novamente.');

  showToast(friendlyMessage, 'error');
}

/**
 * Versão para usar dentro de blocos async sem try/catch explícito —
 * envolve a promise e trata o erro automaticamente.
 *
 *   const result = await tryAsync(
 *     () => supabase.from('posts').insert({...}),
 *     showToast,
 *     { context: 'publicar' }
 *   );
 *   if (!result) return; // já mostrou o erro
 */
export async function tryAsync<T>(
  fn: () => Promise<T>,
  showToast: ToastFn,
  options: HandleErrorOptions = {}
): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    handleError(err, showToast, options);
    return null;
  }
}
