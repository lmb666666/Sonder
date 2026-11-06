/** GitHub 仓库地址归一：接受 owner/repo、github.com URL 与 git@github.com: 写法。 */
export function parseGitHubRepository(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (/^[\w.-]+\/[\w.-]+$/.test(trimmed)) {
    return trimmed.replace(/\.git$/, '');
  }

  const scp = /^git@github\.com:(.+)$/i.exec(trimmed);
  let path: string;
  if (scp?.[1]) {
    path = scp[1];
  } else {
    try {
      const url = new URL(trimmed);
      if (
        url.hostname.toLowerCase() !== 'github.com' &&
        url.hostname.toLowerCase() !== 'www.github.com'
      ) {
        return null;
      }
      path = url.pathname;
    } catch {
      return null;
    }
  }

  const [owner, repo] = path
    .replace(/\.git\/?$/i, '')
    .split('/')
    .filter(Boolean);

  return owner && repo ? `${owner}/${repo}` : null;
}
