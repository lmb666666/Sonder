import { h } from 'hastscript';
import type { AttributeValue, MdastNode } from './handlers.js';
import { wrapHast } from './handlers.js';
import { icon } from './icons.js';

/**
 * 友链申请表单的指令渲染：构建期输出与 FriendLinkApplication.astro 一致的 DOM，
 * 交互（校验 / JSON 预览 / 复制 / Issue 链接）由 MarkdownWidgets 客户端脚本接管。
 */

type HastLike = ReturnType<typeof h>;

function asString(value: AttributeValue | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

const DEFAULT_FIELDS: Array<{ name: string; label: string; required?: boolean; wide?: boolean }> = [
  { name: 'name', label: '站点名称', required: true },
  { name: 'url', label: '站点地址', required: true },
  { name: 'avatar', label: '头像地址' },
  { name: 'backgroundImage', label: '背景图地址' },
  { name: 'bio', label: '站点描述', wide: true },
  { name: 'rss', label: 'RSS 地址' },
];

const PLACEHOLDERS: Record<string, string> = {
  name: '必填，站点名称。',
  url: '必填，站点主页地址。',
  bio: '可选，站点描述或个人 bio，最多 160 字。',
  avatar: '可选，圆形头像地址。',
  backgroundImage: '可选，卡片背景图地址。',
  rss: '可选，供友链朋友圈同步器读取的 RSS 或 Atom 地址。',
};

/** 与组件一致的 repository 归一化（URL / git@ / owner/repo） */
function resolveRepository(value: string): string | undefined {
  const raw = value.trim();
  if (!raw) return undefined;

  let path = raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      if (!['github.com', 'www.github.com'].includes(parsed.hostname.toLowerCase()))
        return undefined;
      path = parsed.pathname;
    } catch {
      return undefined;
    }
  } else if (/^git@github\.com:/i.test(raw)) {
    path = raw.replace(/^git@github\.com:/i, '');
  }

  const segments = path
    .replace(/^\/+|\/+$/g, '')
    .replace(/\.git$/i, '')
    .split('/')
    .filter(Boolean);
  const repositoryPath = segments.slice(0, 2).join('/');
  if (segments.length !== 2 || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repositoryPath)) {
    return undefined;
  }
  return repositoryPath;
}

const formatPreview = (json: string) =>
  json
    .split('\n')
    .slice(1, -1)
    .map((line) => (line.startsWith('  ') ? line.slice(2) : line))
    .join('\n');

export function friendLinkApplicationHandler({
  attributes,
  file,
}: {
  attributes: Record<string, AttributeValue>;
  file: { message(v: string, p: unknown, s: string): void };
}): MdastNode[] {
  const repository = asString(attributes.repository);
  const repositoryPath = repository ? resolveRepository(repository) : undefined;
  if (!repositoryPath) {
    file.message(
      '::friend-link-application 需要 {repository="owner/repo"} 属性（GitHub 仓库），已跳过。',
      undefined,
      'sonder-directives',
    );
    return [];
  }

  const title = asString(attributes.title) ?? '申请友链';
  const description =
    asString(attributes.description) ??
    '填写站点信息，随后查看、复制友链数据，或前往 GitHub 提交申请。';
  const appearance = asString(attributes.appearance) === 'bordered' ? 'bordered' : 'seamless';
  const copyHint = asString(attributes['copy-hint']) ?? '可复制后填入评论申请友链！';
  const copySuccessText = asString(attributes['copy-success-text']) ?? '成功复制！';

  const initialData = {
    name: '',
    url: '',
    bio: '',
    avatar: '',
    backgroundImage: '',
    rss: '',
    sticky: false,
  };
  const config = {
    issueBase: `https://github.com/${repositoryPath}/issues/new`,
    labels: [] as string[],
    issueTemplate: '',
    issueTitle: '[友链申请] {name}',
    issueBody: '## 友链申请\n\n```json\n{json}\n```',
    issueFieldMap: {
      name: 'name',
      url: 'url',
      bio: 'bio',
      avatar: 'avatar',
      backgroundImage: 'backgroundImage',
      rss: 'rss',
    },
    assignees: [] as string[],
    milestone: '',
    projects: [] as string[],
    copyHint,
    copySuccessText,
  };

  const formFields = DEFAULT_FIELDS.map((field) => {
    const control =
      field.name === 'bio'
        ? h(
            'textarea',
            { name: 'bio', rows: '2', placeholder: PLACEHOLDERS.bio, maxlength: '160' },
            [],
          )
        : h('input', {
            name: field.name,
            type: field.required && field.name === 'name' ? 'text' : 'url',
            placeholder: PLACEHOLDERS[field.name],
            maxlength: field.name === 'name' ? '80' : field.name === 'bio' ? '160' : '2048',
            ...(field.required ? { required: true } : {}),
            ...(field.name === 'name'
              ? { autocomplete: 'name' }
              : { autocomplete: 'off', inputmode: 'url' }),
            ...(field.name !== 'name' && field.name !== 'bio' ? { 'data-url-field': '' } : {}),
          });
    return h(
      'label',
      {
        class: [
          'friend-link-application__field',
          ...(field.wide ? ['friend-link-application__field--wide'] : []),
        ],
      },
      [h('span', [field.label, ...(field.required ? [' ', h('em', ['必填'])] : [])]), control],
    );
  });

  const formPage = h(
    'section',
    {
      class: 'friend-link-application__slide friend-link-application__form-page',
      'data-application-form-page': '',
    },
    [
      h('header', { class: 'friend-link-application__header' }, [
        h('div', { class: 'friend-link-application__intro' }, [
          // 组件内部标题用 p，避免污染文章目录
          h('p', { class: 'friend-link-application__title' }, [title]),
          h('p', [description]),
        ]),
        h(
          'button',
          {
            class: 'friend-link-application__switch friend-link-application__switch--next',
            type: 'button',
            'data-show-application-preview': '',
          },
          [h('span', ['查看友链数据']), icon('arrow-right', 17, 1.8)],
        ),
      ]),
      h('form', { class: 'friend-link-application__form', 'data-application-form': '' }, [
        h('div', { class: 'friend-link-application__fields' }, [
          ...formFields,
          h('div', { class: 'friend-link-application__actions' }, [
            h(
              'a',
              {
                class: 'friend-link-application__apply',
                target: '_blank',
                rel: 'noopener noreferrer',
                href: config.issueBase,
                'aria-disabled': 'true',
                'data-tooltip': '去开启一个申请 Issue',
                'data-apply-application': '',
              },
              [h('span', ['一键申请']), icon('external-link', 15, 1.8)],
            ),
            h('p', { 'data-application-status': '', 'aria-live': 'polite' }, [
              '完成必填项后，将生成 GitHub Issue 申请链接。',
            ]),
          ]),
        ]),
      ]),
    ],
  );

  const previewPage = h(
    'aside',
    {
      class: 'friend-link-application__slide friend-link-application__preview',
      'aria-hidden': 'true',
      'aria-label': '友链数据预览',
      'data-application-preview-page': '',
      inert: true,
    },
    [
      h('header', { class: 'friend-link-application__preview-header' }, [
        h(
          'button',
          {
            class: 'friend-link-application__switch friend-link-application__switch--back',
            type: 'button',
            'data-show-application-form': '',
          },
          [icon('arrow-left', 17, 1.8), h('span', ['返回填写'])],
        ),
        h('p', { class: 'friend-link-application__preview-title' }, ['友链数据']),
        h(
          'button',
          {
            class: 'friend-link-application__copy',
            type: 'button',
            'aria-label': copyHint,
            'aria-disabled': 'true',
            'data-tooltip': copyHint,
            'data-copy-application': '',
          },
          [
            {
              ...icon('copy', 17, 1.8),
              properties: {
                ...icon('copy', 17, 1.8).properties,
                class: 'friend-link-application__copy-icon',
              },
            },
            {
              ...icon('check', 17, 2),
              properties: {
                ...icon('check', 17, 2).properties,
                class: 'friend-link-application__check-icon',
              },
            },
          ],
        ),
      ]),
      h('div', { class: 'friend-link-application__code' }, [
        icon('file-json-2', 19, 1.6),
        // 不能再包 <code>：Astro 的 Expressive Code 会把 pre>code 换成代码卡片，
        // data-application-preview 会随之丢失，表单初始化守卫失败 → 整个表单失效
        h('pre', { 'data-application-preview': '' }, [
          formatPreview(JSON.stringify(initialData, null, 2)),
        ]),
      ]),
    ],
  );

  const payload = JSON.stringify(config).replace(/</g, '\\u003c');
  const section = h(
    'section',
    {
      class: 'friend-link-application',
      'data-appearance': appearance,
      'data-friend-link-application': '',
    },
    [
      h('div', { class: 'friend-link-application__viewport' }, [
        h('div', { class: 'friend-link-application__track', 'data-application-track': '' }, [
          formPage,
          previewPage,
        ]),
      ]),
      h('script', { type: 'application/json', 'data-friend-link-application-config': '' }, [
        payload,
      ]),
    ],
  );

  return [wrapHast('section', section as never)];
}
