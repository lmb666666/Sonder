import { validateApplicationUrlValue } from './friend-application';

type ApplicationField = 'name' | 'url' | 'bio' | 'avatar' | 'backgroundImage' | 'rss';
type ApplicationData = Record<ApplicationField, string> & { sticky: false };

export type ApplicationMessages = {
  previewName: string;
  previewBio: string;
  statusReady: string;
  statusIncomplete: string;
  copyFailed: string;
  invalidUrl: string;
  invalidUrlProtocol: string;
  previewAriaPrefix: string;
};

type ApplicationConfig = {
  issueBase: string;
  labels: string[];
  issueTemplate: string;
  issueTitle: string;
  issueBody: string;
  issueFieldMap: Record<ApplicationField, string | false>;
  assignees: string[];
  milestone: string;
  projects: string[];
  copyHint: string;
  copySuccessText: string;
  messages?: Partial<ApplicationMessages>;
};

const DEFAULT_MESSAGES: ApplicationMessages = {
  previewName: '你的站点',
  previewBio: '站点简介会显示在这里',
  statusReady: '资料已就绪，可复制数据或前往 GitHub 确认提交。',
  statusIncomplete: '完成必填项后，将生成 GitHub Issue 申请链接。',
  copyFailed: '复制失败，请手动选中当前数据。',
  invalidUrl: '请输入完整、有效的网址。',
  invalidUrlProtocol: '仅支持 http:// 或 https:// 地址。',
  previewAriaPrefix: '友链卡片实时预览：',
};

const applicationFields: ApplicationField[] = [
  'name',
  'url',
  'bio',
  'avatar',
  'backgroundImage',
  'rss',
];

const readApplicationData = (form: HTMLFormElement): ApplicationData => {
  const formData = new FormData(form);
  const data = Object.fromEntries(
    applicationFields.map((field) => [field, String(formData.get(field) ?? '').trim()]),
  ) as Record<ApplicationField, string>;
  return { ...data, sticky: false };
};

const interpolateApplication = (template: string, data: ApplicationData) =>
  template.replace(
    /\{(name|url|bio|avatar|backgroundImage|rss|json)\}/g,
    (_, token: ApplicationField | 'json') =>
      token === 'json' ? JSON.stringify(data, null, 2) : data[token],
  );

const createIssueUrl = (config: ApplicationConfig, data: ApplicationData) => {
  const url = new URL(config.issueBase);
  const params = url.searchParams;
  params.set('title', interpolateApplication(config.issueTitle, data));
  if (config.labels.length) params.set('labels', config.labels.join(','));
  if (config.assignees.length) params.set('assignees', config.assignees.join(','));
  if (config.milestone) params.set('milestone', config.milestone);
  if (config.projects.length) params.set('projects', config.projects.join(','));

  if (config.issueTemplate) {
    params.set('template', config.issueTemplate);
    applicationFields.forEach((field) => {
      const fieldId = config.issueFieldMap[field];
      if (fieldId && data[field]) params.set(fieldId, data[field]);
    });
  } else {
    params.set('body', interpolateApplication(config.issueBody, data));
  }
  return url.toString();
};

const validateApplicationUrl = (input: HTMLInputElement, messages: ApplicationMessages) => {
  input.setCustomValidity('');
  const result = validateApplicationUrlValue(input.value);
  if (result === 'protocol') input.setCustomValidity(messages.invalidUrlProtocol);
  if (result === 'invalid') input.setCustomValidity(messages.invalidUrl);
};

const copyApplicationText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const temporary = document.createElement('textarea');
  temporary.value = value;
  temporary.setAttribute('readonly', '');
  temporary.style.position = 'fixed';
  temporary.style.opacity = '0';
  document.body.append(temporary);
  temporary.select();
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- Clipboard API 不可用时的兜底（旧浏览器 / 非 https）
  const copied = document.execCommand('copy');
  temporary.remove();
  if (!copied) throw new Error('Clipboard copy failed.');
};

const formatApplicationPreview = (json: string) =>
  json
    .split('\n')
    .slice(1, -1)
    .map((line) => (line.startsWith('  ') ? line.slice(2) : line))
    .join('\n');

export function initFriendLinkApplications() {
  document.querySelectorAll<HTMLElement>('[data-friend-link-application]').forEach((root) => {
    if (root.dataset.initialized) return;
    root.dataset.initialized = 'true';

    const form = root.querySelector<HTMLFormElement>('[data-application-form]');
    const formPage = root.querySelector<HTMLElement>('[data-application-form-page]');
    const previewPage = root.querySelector<HTMLElement>('[data-application-preview-page]');
    const preview = root.querySelector<HTMLElement>('[data-application-preview]');
    const copyButton = root.querySelector<HTMLButtonElement>('[data-copy-application]');
    const applyLink = root.querySelector<HTMLAnchorElement>('[data-apply-application]');
    const showPreviewButton = root.querySelector<HTMLButtonElement>(
      '[data-show-application-preview]',
    );
    const showFormButton = root.querySelector<HTMLButtonElement>('[data-show-application-form]');
    const status = root.querySelector<HTMLElement>('[data-application-status]');
    const cardPreview = root.querySelector<HTMLElement>('[data-application-card-preview]');
    const configElement = root.querySelector<HTMLScriptElement>(
      '[data-friend-link-application-config]',
    );
    if (
      !form ||
      !formPage ||
      !previewPage ||
      !preview ||
      !copyButton ||
      !applyLink ||
      !showPreviewButton ||
      !showFormButton ||
      !status ||
      !configElement?.textContent
    )
      return;

    const config = JSON.parse(configElement.textContent) as ApplicationConfig;
    const messages = { ...DEFAULT_MESSAGES, ...config.messages };
    let copyResetTimer = 0;
    let imageUpdateTimer = 0;
    let currentPreview = '';

    const updatePreviewImage = (
      image: HTMLImageElement | null,
      candidates: string[],
      onVisible: (visible: boolean) => void,
    ) => {
      if (!image) return;

      const requestId = String(Number(image.dataset.previewRequest ?? '0') + 1);
      image.dataset.previewRequest = requestId;
      const sources = [...new Set(candidates.map((value) => value.trim()).filter(Boolean))];

      const trySource = (index: number) => {
        if (image.dataset.previewRequest !== requestId) return;
        const source = sources[index];
        if (!source) {
          image.removeAttribute('src');
          image.hidden = true;
          onVisible(false);
          return;
        }

        image.hidden = true;
        image.loading = 'eager';
        image.onload = () => {
          if (image.dataset.previewRequest !== requestId) return;
          image.hidden = false;
          onVisible(true);
        };
        image.onerror = () => trySource(index + 1);
        image.src = source;
      };

      trySource(0);
    };

    const updateCardPreview = (data: ApplicationData) => {
      if (!cardPreview) return;

      const card = cardPreview.querySelector<HTMLElement>('[data-friend-link-card-preview]');
      const name = cardPreview.querySelector<HTMLElement>('[data-friend-link-card-name]');
      const bio = cardPreview.querySelector<HTMLElement>('[data-friend-link-card-bio]');
      const avatar = cardPreview.querySelector<HTMLImageElement>('[data-friend-link-card-avatar]');
      const fallback = cardPreview.querySelector<HTMLElement>('[data-friend-link-card-fallback]');
      const background = cardPreview.querySelector<HTMLImageElement>(
        '[data-friend-link-card-background]',
      );
      if (!card || !name || !bio || !fallback) return;

      const displayName = data.name || messages.previewName;
      name.textContent = displayName;
      bio.textContent = data.bio || messages.previewBio;
      fallback.textContent = (displayName[0] || '?').toUpperCase();
      card.title = displayName;
      card.setAttribute('aria-label', `${messages.previewAriaPrefix}${displayName}`);

      window.clearTimeout(imageUpdateTimer);
      imageUpdateTimer = window.setTimeout(() => {
        updatePreviewImage(avatar, [data.avatar], (visible) => {
          fallback.hidden = visible;
        });
        updatePreviewImage(background, [data.backgroundImage, data.avatar], (visible) => {
          card.classList.toggle('friend-link-card--with-image', visible);
        });
      }, 180);
    };

    const setView = (view: 'form' | 'preview', moveFocus = true) => {
      const isPreview = view === 'preview';
      root.dataset.view = view;
      formPage.toggleAttribute('inert', isPreview);
      formPage.setAttribute('aria-hidden', String(isPreview));
      previewPage.toggleAttribute('inert', !isPreview);
      previewPage.setAttribute('aria-hidden', String(!isPreview));
      if (moveFocus) {
        (isPreview ? showFormButton : showPreviewButton).focus({ preventScroll: true });
      }
    };

    const update = () => {
      form
        .querySelectorAll<HTMLInputElement>('[data-url-field]')
        .forEach((input) => validateApplicationUrl(input, messages));
      const data = readApplicationData(form);
      const json = JSON.stringify(data, null, 2);
      const previewText = formatApplicationPreview(json);
      const isValid = form.checkValidity();
      currentPreview = previewText;
      preview.textContent = previewText;
      updateCardPreview(data);
      copyButton.setAttribute('aria-disabled', String(!isValid));
      applyLink.setAttribute('aria-disabled', String(!isValid));
      if (isValid) {
        applyLink.href = createIssueUrl(config, data);
        status.textContent = messages.statusReady;
      } else {
        applyLink.href = config.issueBase;
        status.textContent = messages.statusIncomplete;
      }
    };

    form.addEventListener('input', update);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      update();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      applyLink.click();
    });
    showPreviewButton.addEventListener('click', () => {
      update();
      setView('preview');
    });

    showFormButton.addEventListener('click', () => {
      setView('form');
    });

    copyButton.addEventListener('click', async () => {
      update();
      if (!form.checkValidity()) {
        setView('form');
        window.requestAnimationFrame(() => form.reportValidity());
        return;
      }
      try {
        await copyApplicationText(currentPreview);
        window.clearTimeout(copyResetTimer);
        copyButton.dataset.copied = 'true';
        copyButton.dataset.tooltip = config.copySuccessText;
        copyButton.setAttribute('aria-label', config.copySuccessText);
        status.textContent = config.copySuccessText;
        copyResetTimer = window.setTimeout(() => {
          delete copyButton.dataset.copied;
          copyButton.dataset.tooltip = config.copyHint;
          copyButton.setAttribute('aria-label', config.copyHint);
        }, 1800);
      } catch {
        status.textContent = messages.copyFailed;
      }
    });

    root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && root.dataset.view === 'preview') {
        setView('form');
      }
    });

    applyLink.addEventListener('click', (event) => {
      update();
      if (!form.checkValidity()) {
        event.preventDefault();
        form.reportValidity();
      }
    });

    update();
    setView('form', false);
  });
}

let bound = false;

/** 组件入口：首次绑定 page-load，ClientRouter 换页后自动重新初始化。 */
export function bindFriendLinkApplications() {
  initFriendLinkApplications();
  if (bound) return;
  bound = true;
  document.addEventListener('astro:page-load', initFriendLinkApplications);
}
