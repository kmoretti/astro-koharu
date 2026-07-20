import { ErrorBoundary, ErrorFallback } from '@components/common';
import { LazyMotionProvider } from '@components/common/LazyMotionProvider';
import { microDampingPreset } from '@constants/anim/spring';
import type { FriendLink } from '@constants/friends-config';
import { friendsData } from '@constants/friends-config';
import { loadFriends } from '@lib/friends-loader';
import { m } from 'motion/react';
import { useEffect, useState } from 'react';
import FriendCard from './FriendCard';

interface FriendsGridProps {
  friends?: FriendLink[];
  /** Remote data config — when provided and dataSource is "remote",
   *  a client-side fetch with loading animation will be triggered. */
  config?: {
    dataSource?: 'local' | 'remote';
    remoteUrl?: string;
    latencyUrl?: string;
  };
}

function SkeletonCard() {
  return (
    <div className="w-full animate-pulse rounded-2xl bg-white p-3 shadow-xl ring-1 ring-gray-900/5 dark:bg-gray-800 dark:ring-white/10">
      <div className="mb-3 flex gap-3">
        <div className="h-14 w-14 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="h-24 flex-1 rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="flex flex-col gap-2 px-1">
        <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="mt-3 flex items-center gap-3 px-1">
        <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-3 w-10 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

export default function FriendsGrid({ friends: _friends, config }: FriendsGridProps) {
  // Local mode: use build-time data; Remote mode: will be overridden by client fetch
  const [friends, setFriends] = useState<FriendLink[]>(() => {
    if (config?.dataSource === 'remote') {
      // For remote mode, start with empty array (skeleton shows)
      return [];
    }
    // For local mode, use build-time data from config
    return _friends ?? friendsData;
  });
  const [loading, setLoading] = useState(config?.dataSource === 'remote');

  useEffect(() => {
    if (config?.dataSource !== 'remote' || !config.remoteUrl) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    loadFriends({
      dataSource: 'remote',
      remoteUrl: config.remoteUrl,
      latencyUrl: config.latencyUrl,
      intro: { title: '' },
      data: [],
    })
      .then((data) => {
        if (!cancelled) {
          setFriends(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          // Fallback to build-time data
          setFriends(_friends ?? friendsData);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [config?.dataSource, config?.remoteUrl, config?.latencyUrl, _friends]);

  return (
    <LazyMotionProvider>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <div className="w-full">
          {/* Grid Container */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-4 xl:grid-cols-4 xl:gap-6">
            {loading
              ? [0, 1, 2, 3, 4, 5].map((i) => <SkeletonCard key={`skel-${i}`} />)
              : friends.map((friend, index) => <FriendCard key={friend.url} friend={friend} index={index} />)}
          </div>

          {/* Empty State */}
          {!loading && friends.length === 0 && (
            <m.div
              className="flex min-h-[300px] flex-col items-center justify-center text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, ...microDampingPreset }}
            >
              <h3 className="mb-2 font-bold text-3xl text-gray-700 dark:text-gray-300">The Void is Empty</h3>
              <p className="text-gray-500 text-lg dark:text-gray-400">Be the first to connect!</p>
            </m.div>
          )}
        </div>
      </ErrorBoundary>
    </LazyMotionProvider>
  );
}
