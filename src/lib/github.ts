/** GitHub 仓库地址归一：只接受 github.com 的 owner/repo（也接受已经是 owner/repo 的写法）。 */
export function parseGitHubRepository(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (/^[\w.-]+\/[\w.-]+$/.test(trimmed)) {
    return trimmed.replace(/\.git$/, '');
  }

  try {
    const url = new URL(trimmed);
    if (
      url.hostname.toLowerCase() !== 'github.com' &&
      url.hostname.toLowerCase() !== 'www.github.com'
    ) {
      return null;
    }

    const [owner, repo] = url.pathname
      .replace(/\.git$/, '')
      .split('/')
      .filter(Boolean);

    return owner && repo ? `${owner}/${repo}` : null;
  } catch {
    return null;
  }
}
