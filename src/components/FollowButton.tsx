import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { supabase } from '../lib/supabase';
import { UserPlus, UserCheck, UserX } from 'lucide-react';

interface FollowButtonProps {
  targetUserId: string;
  targetUsername: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function FollowButton({ targetUserId, targetUsername, onFollowChange }: FollowButtonProps) {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    checkFollowStatus();
  }, [user, targetUserId]);

  async function checkFollowStatus() {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .single();

      setIsFollowing(!!data);
    } catch {
      setIsFollowing(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleFollow() {
    if (!user) {
      showToast('Entra para seguir', 'info');
      return;
    }

    if (user.id === targetUserId) {
      showToast('Não podes seguir a ti mesmo', 'info');
      return;
    }

    setProcessing(true);
    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);

        setIsFollowing(false);
        showToast(`Deixaste de seguir @${targetUsername}`, 'info');
      } else {
        await supabase.from('follows').insert({
          follower_id: user.id,
          following_id: targetUserId
        });

        setIsFollowing(true);
        showToast(`Agora segues @${targetUsername}`, 'success');

        // Create notification
        await supabase.from('notifications').insert({
          user_id: targetUserId,
          type: 'follow',
          title: 'Novo seguidor!',
          message: `@${profile?.username} começou a seguir-te`
        });
      }

      onFollowChange?.(!isFollowing);
    } catch {
      showToast('Erro', 'error');
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return <div className="w-20 h-9 rounded-lg bg-bg3 animate-pulse" />;
  }

  if (user?.id === targetUserId) {
    return null;
  }

  return (
    <button
      onClick={handleFollow}
      disabled={processing}
      className={`btn flex items-center gap-2 ${
        isFollowing
          ? 'btn-ghost text-text bg-bg3'
          : 'btn-danger'
      } ${processing ? 'opacity-70 cursor-wait' : ''}`}
    >
      {processing ? (
        <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      ) : isFollowing ? (
        <>
          <UserCheck size={16} />
          Seguindo
        </>
      ) : (
        <>
          <UserPlus size={16} />
          Seguir
        </>
      )}
    </button>
  );
}