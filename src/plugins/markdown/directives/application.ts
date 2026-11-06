import { h } from './h.js';
import type { AttributeValue, MdastNode } from './handlers.js';
import { wrapHast } from './handlers.js';
import type { FriendApplicationText } from './i18n.js';
import type { ApplyProvider } from '../../../config/youlin';
import { icon } from './icons.js';

/**
 * 友链申请表单的指令渲染：构建期输出与 FriendLinkApplication.astro 一致的 DOM，
 * 交互（校验 / JSON 预览 / 复制 / Issue 链接）由 MarkdownWidgets 客户端脚本接管。
 * 配置 apply.provider=youlin 时改为输出指向 Youlin /apply 的入口卡片。
 */

export interface ApplicationApplyConfig {
  provider: ApplyProvider;
  baseUrl: string;
}

const DEFAULT_APPLY_CONFIG: ApplicationApplyConfig = {
  provider: 'github',
  baseUrl: '',
};

function asString(value: AttributeValue | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

const FIELDS: Array<{
  name: keyof FriendApplicationText['fields'];
  required?: boolean;
  wide?: boolean;
}> = [
  { name: 'name', required: true },
  { name: 'url', required: true },
  { name: 'avatar' },
  { name: 'backgroundImage' },
  { name: 'bio', wide: true },
  { name: 'rss' },
];

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

export function friendLinkApplicationHandler(
  text: FriendApplicationText,
  apply: ApplicationApplyConfig = DEFAULT_APPLY_CONFIG,
) {
  return ({
    attributes,
    file,
  }: {
    attributes: Record<string, AttributeValue>;
    file: { message(v: string, p: unknown, s: string): void };
  }): MdastNode[] => {
    const providerAttr = asString(attributes.provider);
    const provider: ApplyProvider =
      providerAttr === 'youlin' || providerAttr === 'github' || providerAttr === 'none'
        ? providerAttr
        : apply.provider;

    if (provider === 'none') {
      file.message(
        '友链申请已关闭（apply.provider=none），已跳过。',
        undefined,
        'sonder-directives',
      );
      return [];
    }

    if (provider === 'youlin') {
      const baseUrl = apply.baseUrl.trim().replace(/\/+$/, '');
      if (!baseUrl) {
        file.message(
          '::friend-link-application 需要配置 youlin.baseUrl 才能跳转申请页。',
          undefined,
          'sonder-directives',
        );
        return [];
      }

      const card = h('section', { class: 'youlin-apply-card', 'aria-label': text.title }, [
        h('span', { class: 'youlin-apply-card__copy' }, [
          h('strong', [text.title]),
          h('span', [text.youlinDescription]),
        ]),
        h(
          'a',
          {
            class: 'youlin-apply-card__action',
            href: `${baseUrl}/apply`,
            target: '_blank',
            rel: 'noopener noreferrer',
          },
          [text.youlinApplyLabel],
        ),
      ]);
      return [wrapHast('section', card as never)];
    }

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

    const title = asString(attributes.title) ?? text.title;
    const description = asString(attributes.description) ?? text.description;
    const appearance = asString(attributes.appearance) === 'bordered' ? 'bordered' : 'seamless';
    const copyHint = asString(attributes['copy-hint']) ?? text.copyHint;
    const copySuccessText = asString(attributes['copy-success-text']) ?? text.copySuccessText;

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
      issueTitle: text.issueTitle,
      issueBody: text.issueBody,
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
      messages: {
        previewName: text.previewName,
        previewBio: text.previewBio,
        statusReady: text.statusReady,
        statusIncomplete: text.statusIncomplete,
        copyFailed: text.copyFailed,
        invalidUrl: text.invalidUrl,
        invalidUrlProtocol: text.invalidUrlProtocol,
        previewAriaPrefix: text.previewAriaPrefix,
      },
    };

    const formFields = FIELDS.map((field) => {
      const label = text.fields[field.name];
      const placeholder = text.placeholders[field.name];
      const control =
        field.name === 'bio'
          ? h('textarea', { name: 'bio', rows: '2', placeholder, maxlength: '160' }, [])
          : h('input', {
              name: field.name,
              type: field.required && field.name === 'name' ? 'text' : 'url',
              placeholder,
              maxlength: field.name === 'name' ? '80' : '2048',
              ...(field.required ? { required: true } : {}),
              ...(field.name === 'name'
                ? { autocomplete: 'name' }
                : { autocomplete: 'off', inputmode: 'url' }),
              ...(field.name !== 'name' ? { 'data-url-field': '' } : {}),
            });
      return h(
        'label',
        {
          class: [
            'friend-link-application__field',
            ...(field.wide ? ['friend-link-application__field--wide'] : []),
          ],
        },
        [h('span', [label, ...(field.required ? [' ', h('em', [text.required])] : [])]), control],
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
            [h('span', [text.previewCta]), icon('arrow-right', 17, 1.8)],
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
                  'data-tooltip': text.applyHint,
                  'data-apply-application': '',
                },
                [h('span', [text.applyLabel]), icon('external-link', 15, 1.8)],
              ),
              h('p', { 'data-application-status': '', 'aria-live': 'polite' }, [
                text.statusIncomplete,
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
        'aria-label': text.previewAriaLabel,
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
            [icon('arrow-left', 17, 1.8), h('span', [text.backCta])],
          ),
          h('p', { class: 'friend-link-application__preview-title' }, [text.previewTitle]),
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
  };
}
