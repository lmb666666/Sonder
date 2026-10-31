/** 友链申请表单：校验、JSON 预览、复制与 Issue 链接生成。 */

type ApplicationField = 'name' | 'url' | 'bio' | 'avatar' | 'backgroundImage' | 'rss';
type ApplicationData = Record<ApplicationField, string> & { sticky: false };
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

const validateApplicationUrl = (input: HTMLInputElement) => {
  input.setCustomValidity('');
  if (!input.value.trim()) return;
  try {
    const url = new URL(input.value);
    if (!['http:', 'https:'].includes(url.protocol)) {
      input.setCustomValidity('仅支持 http:// 或 https:// 地址。');
    }
  } catch {
    input.setCustomValidity('请输入完整、有效的网址。');
  }
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
    let copyResetTimer = 0;
    let currentPreview = '';

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
      form.querySelectorAll<HTMLInputElement>('[data-url-field]').forEach(validateApplicationUrl);
      const data = readApplicationData(form);
      const json = JSON.stringify(data, null, 2);
      const previewText = formatApplicationPreview(json);
      const isValid = form.checkValidity();
      currentPreview = previewText;
      preview.textContent = previewText;
      copyButton.setAttribute('aria-disabled', String(!isValid));
      applyLink.setAttribute('aria-disabled', String(!isValid));
      if (isValid) {
        applyLink.href = createIssueUrl(config, data);
        status.textContent = '资料已就绪，可复制数据或前往 GitHub 确认提交。';
      } else {
        applyLink.href = config.issueBase;
        status.textContent = '完成必填项后，将生成 GitHub Issue 申请链接。';
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
        status.textContent = '复制失败，请手动选中当前数据。';
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
