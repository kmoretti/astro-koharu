import type { FcircleConfig, FriendLink, FriendsConfig, FriendsIntro } from '@lib/config/types';
import yamlConfig from '../../config/site.yaml';

// Re-export type for backwards compatibility
export type { FriendLink };

export const friendsConfig: FriendsConfig = {
  dataSource: yamlConfig.friends?.dataSource ?? 'local',
  remoteUrl: yamlConfig.friends?.remoteUrl,
  latencyUrl: yamlConfig.friends?.latencyUrl,
  apiUrl: yamlConfig.friends?.apiUrl,
  intro: yamlConfig.friends?.intro ?? {
    title: 'Friends',
    subtitle: '',
    applyTitle: 'Apply for friend link',
    applyDesc: 'Leave a comment with the following format',
  },
  data: yamlConfig.friends?.data ?? [],
};

/** @deprecated Use friendsConfig.data instead */
export const friendsData: FriendLink[] = friendsConfig.data;

/** @deprecated Use friendsConfig.intro instead */
export const friendsIntro: FriendsIntro = friendsConfig.intro;

export const fcircleConfig: FcircleConfig = {
  allJsonUrl: yamlConfig.fcircle?.allJsonUrl ?? 'https://fc.081531.xyz/all.json',
};
