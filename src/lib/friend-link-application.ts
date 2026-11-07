import { copyText } from './clipboard';
import { buildYoulinApplicationPayload, validateApplicationUrlValue } from './friend-application';

type ApplicationField = 'name' | 'url' | 'bio' | 'avatar' | 'backgroundImage' | 'rss';
type ApplicationData = Record<ApplicationField, string> & { sticky: false };
type ApplicationProvider = 'github' | 'youlin';

export type ApplicationMessages = {
  previewName: string;
  previewBio: string;
  statusReady: string;
  statusIncomplete: string;
  submitPending: string;
  submitSuccess: string;
  submitFailed: string;
  turnstileMissing: string;
  copyFailed: string;
  invalidUrl: string;
  invalidUrlProtocol: string;
  previewAriaPrefix: string;
};

type ApplicationConfig = {
  provider?: ApplicationProvider;
  submitUrl?: string;
  turnstileSiteKey?: string;
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
  statusReady: '资料已就绪，可以提交申请。',
  statusIncomplete: '完成必填项后即可提交申请。',
  submitPending: '正在提交申请…',
  submitSuccess: '申请已提交，等待站长审核。',
  submitFailed: '提交失败，请稍后重试。',
  turnstileMissing: '请先完成人机验证。',
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
    const provider: ApplicationProvider = config.provider === 'youlin' ? 'youlin' : 'github';
    const submitUrl = config.submitUrl?.trim() ?? '';
    const turnstileSiteKey = provider === 'youlin' ? (config.turnstileSiteKey?.trim() ?? '') : '';
    let copyResetTimer = 0;
    let imageUpdateTimer = 0;
    let currentPreview = '';

    const getTurnstile = () =>
      (
        window as unknown as {
          turnstile?: {
            render?: (el: HTMLElement, options: { sitekey: string; theme: string }) => unknown;
            reset?: () => void;
          };
        }
      ).turnstile;

    const renderTurnstile = () => {
      const api = getTurnstile();
      if (!api?.render) return;
      root.querySelectorAll<HTMLElement>('.cf-turnstile').forEach((element) => {
        if (element.dataset.rendered === 'true') return;
        element.dataset.rendered = 'true';
        api.render?.(element, { sitekey: turnstileSiteKey, theme: 'auto' });
      });
    };

    const ensureTurnstileScript = () => {
      if (!turnstileSiteKey) return;
      const existing = document.querySelector<HTMLScriptElement>('script[data-sonder-turnstile]');
      if (existing) {
        if (getTurnstile()) renderTurnstile();
        else existing.addEventListener('load', renderTurnstile, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.sonderTurnstile = '';
      script.addEventListener('load', renderTurnstile, { once: true });
      document.head.append(script);
    };

    const readTurnstileToken = () =>
      root.querySelector<HTMLInputElement>('[name="cf-turnstile-response"]')?.value.trim() ?? '';

    const resetTurnstile = () => {
      try {
        getTurnstile()?.reset?.();
      } catch {
        // Turnstile 未加载或已卸载时忽略
      }
    };

    ensureTurnstileScript();

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
      if (applyLink.dataset.pending === 'true') return;
      form
        .querySelectorAll<HTMLInputElement>('[data-url-field]')
        .forEach((input) => validateApplicationUrl(input, messages));
      const data = readApplicationData(form);
      const json = JSON.stringify(data, null, 2);
      const previewText = formatApplicationPreview(json);
      const isValid = form.checkValidity();
      const submitted = applyLink.dataset.submitted === 'true';
      currentPreview = previewText;
      preview.textContent = previewText;
      updateCardPreview(data);
      copyButton.setAttribute('aria-disabled', String(!isValid));
      applyLink.setAttribute('aria-disabled', String(!isValid || submitted));
      if (isValid) {
        if (provider === 'github') applyLink.href = createIssueUrl(config, data);
        else applyLink.href = submitUrl || '#';
        if (!submitted) status.textContent = messages.statusReady;
      } else {
        applyLink.href = provider === 'github' ? config.issueBase : submitUrl || '#';
        status.textContent = messages.statusIncomplete;
      }
    };

    const submitYoulin = async () => {
      if (provider !== 'youlin' || applyLink.dataset.pending === 'true') return;
      if (applyLink.dataset.submitted === 'true') return;
      if (!submitUrl) {
        status.textContent = messages.submitFailed;
        return;
      }

      update();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const data = readApplicationData(form);
      const token = readTurnstileToken();
      if (turnstileSiteKey && !token) {
        status.textContent = messages.turnstileMissing;
        return;
      }

      const payload = buildYoulinApplicationPayload(data, token);
      applyLink.dataset.pending = 'true';
      applyLink.setAttribute('aria-disabled', 'true');
      status.textContent = messages.submitPending;

      try {
        const response = await fetch(submitUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15_000),
        });
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string; details?: Record<string, string> };
          backlink?: { ok?: boolean | null; detail?: string | null };
        } | null;

        if (!response.ok) {
          const error = body?.error;
          status.textContent = error?.message || messages.submitFailed;
          if (error?.details) {
            const fieldMap: Record<string, ApplicationField> = {
              siteName: 'name',
              link: 'url',
              avatar: 'avatar',
              feed: 'rss',
              desc: 'bio',
            };
            for (const [key, message] of Object.entries(error.details)) {
              const field = fieldMap[key];
              if (!field) continue;
              form
                .querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${field}"]`)
                ?.setCustomValidity(String(message));
            }
            form.reportValidity();
          }
          return;
        }

        applyLink.dataset.submitted = 'true';
        applyLink.setAttribute('aria-disabled', 'true');
        const backlink = body?.backlink;
        status.textContent = `${messages.submitSuccess}${
          backlink?.ok === true && backlink.detail ? ` ${backlink.detail}` : ''
        }`;
      } catch {
        status.textContent = messages.submitFailed;
      } finally {
        delete applyLink.dataset.pending;
        resetTurnstile();
        if (applyLink.dataset.submitted !== 'true') {
          applyLink.setAttribute('aria-disabled', String(!form.checkValidity()));
        }
      }
    };

    form.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
      target?.setCustomValidity('');
      delete applyLink.dataset.submitted;
      update();
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      update();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      if (provider === 'youlin') {
        void submitYoulin();
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
        await copyText(currentPreview);
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
        return;
      }
      if (applyLink.dataset.submitted === 'true') {
        event.preventDefault();
        return;
      }
      if (provider === 'youlin') {
        event.preventDefault();
        void submitYoulin();
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
