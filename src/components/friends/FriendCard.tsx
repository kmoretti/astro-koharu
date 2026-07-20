import { LazyMotionProvider } from '@components/common/LazyMotionProvider';
import { microDampingPreset } from '@constants/anim/spring';
import type { FriendLink } from '@constants/friends-config';
import { useIsMounted } from '@hooks/useIsMounted';
import { useStore } from '@nanostores/react';
import { m, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react';
import { type MouseEvent, useRef } from 'react';
import { cn, normalizeHexColor } from '@/lib/utils';
import { christmasEnabled } from '@/store/christmas';

interface FriendCardProps {
  friend: FriendLink;
  index: number;
}

interface CSSCustomProperties extends React.CSSProperties {
  '--card-color'?: string;
}

const DEFAULT_COLOR = '#ffc0cb';
const DEFAULT_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg width="100%" height="100%" viewBox="0 0 100 100" version="1.1" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" fill="#ffc0cb"/>
  <circle cx="30" cy="45" r="6" fill="#fff"/>
  <circle cx="70" cy="45" r="6" fill="#fff"/>
  <path d="M 35 65 Q 50 75 65 65" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="20" cy="55" r="6" fill="#ff9eb5" opacity="0.5"/>
  <circle cx="80" cy="55" r="6" fill="#ff9eb5" opacity="0.5"/>
</svg>
`)}`;

function formatLatency(latency: number): string {
  if (latency < 0.5) return `${Math.round(latency * 1000)} ms`;
  return `${latency.toFixed(1)} s`;
}

function getLatencyDisplay(latency?: number, reachable?: boolean): { color: string; text: string } | null {
  if (reachable === false) return { color: 'text-red-500', text: '不可达' };
  if (latency === undefined || latency === null) return null;
  if (latency < 0.5) return { color: 'text-green-500', text: formatLatency(latency) };
  if (latency <= 2.0) return { color: 'text-yellow-500', text: formatLatency(latency) };
  return { color: 'text-red-500', text: formatLatency(latency) };
}

export default function FriendCard({ friend, index }: FriendCardProps) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const isMounted = useIsMounted();
  const isChristmasEnabled = useStore(christmasEnabled);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [15, -15]), microDampingPreset);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-15, 15]), microDampingPreset);

  const sheenX = useTransform(x, [-0.5, 0.5], ['0%', '100%']);
  const sheenY = useTransform(y, [-0.5, 0.5], ['0%', '100%']);

  const spotlight = useMotionTemplate`radial-gradient(
    600px circle at ${sheenX} ${sheenY},
    rgba(255,255,255,0.15),
    transparent 40%
  )`;

  const handleMouseMove = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) / rect.width);
    y.set((e.clientY - centerY) / rect.height);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const cardColor = normalizeHexColor(friend.color || DEFAULT_COLOR);
  const avatarImage = friend.image || DEFAULT_AVATAR;
  const latencyDisplay = getLatencyDisplay(friend.latency, friend.reachable);

  return (
    <LazyMotionProvider>
      <m.a
        href={friend.url}
        target="_blank"
        ref={cardRef}
        className={cn(
          'friend-card group !no-underline hover:!no-underline relative block w-full cursor-pointer select-none transition-transform duration-300 ease-easeOut',
          { 'z-5': isMounted && isChristmasEnabled },
        )}
        style={{ perspective: '1000px' }}
        transition={{
          duration: 0.5,
          delay: index * 0.05,
          ...microDampingPreset,
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <m.div
          className="relative w-full rounded-2xl bg-white p-3 shadow-xl ring-1 ring-gray-900/5 dark:bg-gray-800 dark:ring-white/10"
          style={{
            transformStyle: 'preserve-3d',
            rotateX,
            rotateY,
          }}
        >
          {/* Top area: avatar + siteshot side by side */}
          <div className="mb-3 flex gap-3">
            {/* Avatar */}
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-4 border-white bg-white shadow-lg dark:border-gray-800 dark:bg-gray-800">
              <img
                src={avatarImage}
                alt={friend.owner}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
            </div>

            {/* Site screenshot */}
            <div className="relative flex-1 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
              {friend.siteshot ? (
                <img
                  src={friend.siteshot}
                  alt={`${friend.site} screenshot`}
                  className="h-24 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling;
                    if (fallback) fallback.classList.remove('hidden');
                  }}
                />
              ) : null}
              {/* Fallback when no siteshot or load fails */}
              <div
                className={cn('flex h-24 w-full items-center justify-center', friend.siteshot ? 'hidden' : '')}
                style={{ background: `linear-gradient(135deg, ${cardColor}, ${cardColor}80)` }}
              >
                <span className="font-bold text-3xl text-white/80">{friend.site.charAt(0)}</span>
              </div>
            </div>
          </div>

          {/* Text content */}
          <div className="flex flex-col gap-1 px-1">
            <div className="flex items-center gap-2">
              <p
                className="truncate font-bold text-gray-900 text-sm transition-colors group-hover:text-(--card-color) dark:text-white"
                style={{ '--card-color': cardColor } as CSSCustomProperties}
              >
                {friend.site}
              </p>
              {friend.owner !== friend.site && (
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 font-medium text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                  {friend.owner}
                </span>
              )}
            </div>
            <p className="line-clamp-2 text-gray-600 text-xs dark:text-gray-300">{friend.desc}</p>
          </div>

          {/* Footer: latency + feeds + updated */}
          <div className="mt-2 flex items-center gap-3 px-1">
            {latencyDisplay && (
              <span className={`flex items-center gap-1 font-medium text-[11px] ${latencyDisplay.color}`}>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
                {latencyDisplay.text}
              </span>
            )}

            {friend.feeds && (
              <a
                href={friend.feeds}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-medium text-[11px] text-orange-500 transition-colors hover:text-orange-600"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" role="img" aria-label="RSS">
                  <title>RSS</title>
                  <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93v-2.83Z" />
                </svg>
                RSS
              </a>
            )}

            {friend.updated && (
              <span className="ml-auto font-medium text-[10px] text-gray-400 dark:text-gray-500">{friend.updated}</span>
            )}
          </div>

          {/* Spotlight Overlay */}
          <m.div
            className="pointer-events-none absolute inset-0 z-10 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            style={{ background: spotlight }}
          />

          {/* Border Glow */}
          <div
            className="absolute inset-0 -z-10 rounded-2xl opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-60"
            style={{ background: cardColor }}
          />
        </m.div>
      </m.a>
    </LazyMotionProvider>
  );
}
