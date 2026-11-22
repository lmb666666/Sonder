import { loadYoulinLinks } from './youlin';
import type { FriendLinkGroup } from './friend-data';
import type { ResolvedYoulinConfig, YoulinLinkSource } from '../config/youlin';

/** 友链 source 链解析：youlin -> local。朋友圈全部在客户端请求。 */

export interface FriendSourceDeps {
  fetchImpl?: typeof fetch;
  localGroups: FriendLinkGroup[];
}

export interface ResolvedLinks {
  groups: FriendLinkGroup[];
  source: YoulinLinkSource | null;
  youlinTried: boolean;
  errors: string[];
}

interface ResolveOptions {
  skipYoulin?: boolean;
}

export async function resolveFriendLinkGroups(
  config: ResolvedYoulinConfig,
  deps: FriendSourceDeps,
  options: ResolveOptions = {},
): Promise<ResolvedLinks> {
  const errors: string[] = [];
  let youlinTried = false;

  for (const source of config.links.sources) {
    if (source === 'youlin') {
      if (options.skipYoulin || !config.baseUrl) continue;
      youlinTried = true;

      const result = await loadYoulinLinks(config.baseUrl, {
        group: config.links.group,
        timeoutMs: config.timeoutMs,
        fetchImpl: deps.fetchImpl,
      });
      if (result.ok) {
        return { groups: result.data, source, youlinTried, errors };
      }
      errors.push(`youlin: ${result.error}`);
      continue;
    }

    if (source === 'local') {
      return { groups: deps.localGroups, source, youlinTried, errors };
    }
  }

  return { groups: [], source: null, youlinTried, errors };
}
