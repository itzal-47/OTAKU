import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';

interface StoryGroup {
  user_id: string;
  username: string;
  avatar: string;
  has_unviewed: boolean;
}

export default function StoriesBar() {
  const { user } = useAuth();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadStories();
  }, [user]);

  async function loadStories() {
    try {
      const { data: storiesData } = await supabase
        .from('stories')
        .select('user_id')
        .gt('expires_at', new Date().toISOString());

      if (!storiesData || storiesData.length === 0) {
        setStoryGroups([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(storiesData.map(s => s.user_id))];

      const [profilesData, viewsData] = await Promise.all([
        supabase.from('profiles').select('id, username').in('id', userIds),
        user
          ? supabase.from('story_views').select('story_id').eq('viewer_id', user.id)
          : { data: [] }
      ]);

      const viewedStoryIds = new Set(viewsData.data?.map(v => v.story_id) || []);

      // We need to check which stories are viewed
      const { data: allUserStories } = await supabase
        .from('stories')
        .select('id, user_id')
        .gt('expires_at', new Date().toISOString());

      const groups: StoryGroup[] = userIds.map(userId => {
        const userProfile = profilesData.data?.find(p => p.id === userId);
        const userStories = allUserStories?.filter(s => s.user_id === userId) || [];
        const hasUnviewed = userStories.some(s => !viewedStoryIds.has(s.id));

        return {
          user_id: userId,
          username: userProfile?.username || 'Unknown',
          avatar: userProfile?.username?.charAt(0).toUpperCase() || '?',
          has_unviewed: hasUnviewed
        };
      });

      // Put current user first if they have stories
      if (user) {
        const myIdx = groups.findIndex(g => g.user_id === user.id);
        if (myIdx > 0) {
          const myGroup = groups.splice(myIdx, 1)[0];
          groups.unshift(myGroup);
        }
      }

      setStoryGroups(groups);
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setLoading(false);
    }
  }

  function updateScrollButtons() {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }

  function scroll(direction: 'left' | 'right') {
    if (!containerRef.current) return;
    const scrollAmount = direction === 'left' ? -200 : 200;
    containerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    setTimeout(updateScrollButtons, 300);
  }

  useEffect(() => {
    updateScrollButtons();
  }, [storyGroups]);

  if (loading || storyGroups.length === 0) {
    return null;
  }

  return (
    <div className="relative py-4 border-b border-border">
      {/* Scroll buttons */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-bg/80 backdrop-blur-sm border border-border flex items-center justify-center text-text hover:text-purple transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-bg/80 backdrop-blur-sm border border-border flex items-center justify-center text-text hover:text-purple transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      )}

      <div
        ref={containerRef}
        onScroll={updateScrollButtons}
        className="flex gap-4 overflow-x-auto px-6 no-scrollbar scroll-smooth"
      >
        {/* Add Story (if user logged in) */}
        {user && (
          <Link
            to="/stories"
            className="flex flex-col items-center gap-2 flex-shrink-0"
          >
            <div className="w-16 h-16 rounded-full bg-bg3 border-2 border-dashed border-purple flex items-center justify-center">
              <Plus className="text-purple" size={24} />
            </div>
            <span className="text-xs text-text3 whitespace-nowrap">Adicionar</span>
          </Link>
        )}

        {/* Story avatars */}
        {storyGroups.slice(0, 10).map(group => (
          <Link
            key={group.user_id}
            to="/stories"
            className="flex flex-col items-center gap-2 flex-shrink-0"
          >
            <div
              className={`w-16 h-16 rounded-full p-0.5 ${
                group.has_unviewed
                  ? 'bg-gradient-to-tr from-purple via-red to-amber'
                  : 'bg-bg3'
              }`}
            >
              <div className="w-full h-full rounded-full bg-gradient-to-br from-purple to-red flex items-center justify-center text-xl font-bold">
                {group.avatar}
              </div>
            </div>
            <span className="text-xs text-text3 whitespace-nowrap max-w-[70px] truncate">
              {user?.id === group.user_id ? 'Tu' : group.username}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}