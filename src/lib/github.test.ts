import { describe, expect, test } from 'bun:test';

import { parseGitHubRepository } from './github';

describe('parseGitHubRepository', () => {
  test('接受 github.com 的仓库地址与 owner/repo 写法', () => {
    expect(parseGitHubRepository('https://github.com/lmb666666/Sonder')).toBe('lmb666666/Sonder');
    expect(parseGitHubRepository('https://github.com/lmb666666/Sonder.git')).toBe(
      'lmb666666/Sonder',
    );
    expect(parseGitHubRepository('https://www.github.com/owner/repo/tree/main')).toBe('owner/repo');
    expect(parseGitHubRepository('owner/repo')).toBe('owner/repo');
    expect(parseGitHubRepository('git@github.com:owner/repo.git')).toBe('owner/repo');
    expect(parseGitHubRepository('https://github.com/owner/repo.git/')).toBe('owner/repo');
  });

  test('拒绝非 GitHub 与空值', () => {
    expect(parseGitHubRepository('https://gitlab.com/owner/repo')).toBe(null);
    expect(parseGitHubRepository('https://github.com/owner')).toBe(null);
    expect(parseGitHubRepository('')).toBe(null);
    expect(parseGitHubRepository(undefined)).toBe(null);
  });
});
