import { describe, expect, test } from 'bun:test';

import { friendLinkApplicationHandler } from './application';
import { getDirectiveI18n } from './i18n';

const text = getDirectiveI18n('zh-CN').friendApplication;

function fileRecorder() {
  const messages: string[] = [];
  return {
    messages,
    file: {
      message(value: string) {
        messages.push(value);
      },
    },
  };
}

describe('friendLinkApplicationHandler', () => {
  test('provider=youlin 输出申请入口卡片，不再要求 repository', () => {
    const { file } = fileRecorder();
    const nodes = friendLinkApplicationHandler(text, {
      provider: 'youlin',
      baseUrl: 'https://youlin.example.com/',
    })({ attributes: {}, file });
    const html = JSON.stringify(nodes);

    expect(html).toContain('youlin-apply-card');
    expect(html).toContain('https://youlin.example.com/apply');
    expect(html).toContain(text.youlinApplyLabel);
    expect(html).toContain(text.youlinDescription);
  });

  test('默认 provider=github 保持原 Issue 表单', () => {
    const { file } = fileRecorder();
    const nodes = friendLinkApplicationHandler(text)({
      attributes: { repository: 'owner/repo' },
      file,
    });
    const html = JSON.stringify(nodes);

    expect(html).toContain('https://github.com/owner/repo/issues/new');
    expect(html).not.toContain('youlin-apply-card');
  });

  test('指令属性可以单点覆盖全局 provider', () => {
    const { file } = fileRecorder();
    const nodes = friendLinkApplicationHandler(text, {
      provider: 'youlin',
      baseUrl: 'https://youlin.example.com',
    })({
      attributes: { provider: 'github', repository: 'owner/repo' },
      file,
    });

    expect(JSON.stringify(nodes)).toContain('https://github.com/owner/repo/issues/new');
  });

  test('provider=none 时不输出内容并给出提示', () => {
    const { messages, file } = fileRecorder();
    const nodes = friendLinkApplicationHandler(text, { provider: 'none', baseUrl: '' })({
      attributes: {},
      file,
    });

    expect(nodes).toEqual([]);
    expect(messages[0]).toContain('apply.provider=none');
  });

  test('provider=youlin 但 baseUrl 为空时降级为提示', () => {
    const { messages, file } = fileRecorder();
    const nodes = friendLinkApplicationHandler(text, { provider: 'youlin', baseUrl: '' })({
      attributes: {},
      file,
    });

    expect(nodes).toEqual([]);
    expect(messages[0]).toContain('youlin.baseUrl');
  });
});
