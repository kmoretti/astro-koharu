import type { FriendLink, FriendsConfig } from '@lib/config/types';
import { parse as parseYaml } from 'yaml';

/**
 * Generate a stable pastel HSL color from a string name.
 * Used when remote friends data has no color field.
 */
export function generateColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32-bit integer
  }
  const hue = ((hash % 360) + 360) % 360;
  return `hsl(${hue}, 65%, 78%)`;
}

/**
 * Field mapping from remote YAML link_list item to FriendLink.
 */
interface RemoteLinkItem {
  name: string;
  link: string;
  avatar: string;
  descr: string;
  siteshot?: string;
  feeds?: string;
  friendslink?: string;
}

/**
 * Field mapping from latency JSON link_data item.
 */
interface LatencyItem {
  name: string;
  link: string;
  latency: number;
  reachable: boolean;
  updated: string;
}

/**
 * Load friends data based on config.dataSource.
 *
 * - "local": returns friendsConfig.data directly (existing behavior).
 * - "remote": fetches remote YAML + latency JSON, merges, returns.
 */
export async function loadFriends(config: FriendsConfig): Promise<FriendLink[]> {
  if (config.dataSource !== 'remote' || !config.remoteUrl) {
    return config.data;
  }

  try {
    const [remoteItems, latencyItems] = await Promise.all([
      fetchRemoteYaml(config.remoteUrl),
      config.latencyUrl ? fetchLatencyJson(config.latencyUrl) : [],
    ]);

    return remoteItems.map((item) => {
      const latencyMatch = latencyItems.find(
        (l) => l.name === item.name && l.link.replace(/\/+$/, '') === item.link.replace(/\/+$/, ''),
      );
      return {
        site: item.name,
        url: item.link,
        owner: item.name,
        desc: item.descr,
        image: item.avatar,
        color: generateColorFromName(item.name),
        siteshot: item.siteshot,
        feeds: item.feeds,
        latency: latencyMatch?.latency,
        reachable: latencyMatch?.reachable,
        updated: latencyMatch?.updated,
      };
    });
  } catch (err) {
    console.error('[friends-loader] Failed to load remote friends data:', err);
    console.warn('[friends-loader] Falling back to local friends data.');
    return config.data;
  }
}

async function fetchRemoteYaml(url: string): Promise<RemoteLinkItem[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch remote YAML: ${response.status}`);
  }
  const text = await response.text();
  const parsed = parseYaml(text);

  // The remote YAML has structure: [{ class_name, class_desc, link_list: [...] }]
  // Extract link_list from each group and flatten
  const groups = Array.isArray(parsed) ? parsed : [parsed];
  const items: RemoteLinkItem[] = [];
  for (const group of groups) {
    if (group.link_list && Array.isArray(group.link_list)) {
      items.push(...group.link_list);
    }
  }
  return items;
}

async function fetchLatencyJson(url: string): Promise<LatencyItem[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch latency data: ${response.status}`);
  }
  const data = await response.json();
  return data.link_data ?? [];
}
