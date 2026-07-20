import { useCallback, useEffect, useRef, useState } from 'react';

interface TalkItem {
  id: string;
  content: string;
  time: number;
  tags: string[];
  like: number;
  liked: boolean;
}

interface TalksResponse {
  status: boolean;
  data: TalkItem[];
  count: number;
}

interface TalkTickerProps {
  apiUrl: string;
}

function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

export default function TalkTicker({ apiUrl }: TalkTickerProps) {
  const [talks, setTalks] = useState<TalkItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [animState, setAnimState] = useState<'active' | 'leaving'>('active');
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const baseUrl = apiUrl.replace(/\/+$/, '');

  // Fetch talks
  useEffect(() => {
    fetch(`${baseUrl}/pub/talks/?page=1&limit=10`, {
      headers: { Accept: 'application/json' },
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((json: TalksResponse) => {
        if (json.status && Array.isArray(json.data) && json.data.length > 0) {
          setTalks(json.data);
          setLoaded(true);
        }
      })
      .catch(() => {
        /* silent */
      });
  }, [baseUrl]);

  // Cycle talks
  useEffect(() => {
    if (talks.length < 2) return;

    const cycle = () => {
      setAnimState('leaving');
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % talks.length);
        setAnimState('active');
      }, 360);
    };

    timerRef.current = setInterval(cycle, 4000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [talks.length]);

  const handleClick = useCallback(() => {
    window.location.href = '/shuoshuo';
  }, []);

  if (!loaded || talks.length === 0) return null;

  const talk = talks[current];
  const text = stripHtml(talk.content);

  return (
    <button type="button" className="talk-ticker" onClick={handleClick} aria-label="查看全部说说">
      <svg
        className="talk-ticker__icon"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <title>说说</title>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
      <ul className="talk-ticker__list">
        <li className={`talk-ticker__item ${animState === 'active' ? 'is-active' : 'is-leaving'}`}>{text}</li>
      </ul>
      <svg
        className="talk-ticker__arrow"
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <title>跳转</title>
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    </button>
  );
}
