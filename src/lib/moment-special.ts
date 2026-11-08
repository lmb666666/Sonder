import {
  domainOf,
  escapeHtml,
  githubOwner,
  momentVideoEmbed,
  type MomentExtension,
  type MomentItem,
  type MomentVideo,
} from './moments';

export interface MomentSpecialLabels {
  github: string;
  website: string;
  music: string;
  location: string;
  video: string;
  tweet: string;
}

const VIDEO_PROVIDER_LABEL: Record<string, string> = {
  bilibili: '哔哩哔哩',
  youtube: 'YouTube',
  douyin: '抖音',
  tiktok: 'TikTok',
};

const VIDEO_IFRAME_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture';

function renderVideo(video: MomentVideo, labels: MomentSpecialLabels): string {
  const embed = momentVideoEmbed(video);
  if (!embed) return '';

  const provider = VIDEO_PROVIDER_LABEL[embed.provider] ?? embed.provider;
  const title = `${provider} ${labels.video}`;

  if (embed.kind === 'embed') {
    return (
      `<div class="sd-embed" data-sd-provider="${embed.provider}">` +
      `<iframe class="sd-embed-frame" src="${escapeHtml(embed.src)}" title="${escapeHtml(
        title,
      )}" loading="lazy" scrolling="no" frameborder="no" allowfullscreen ` +
      `allow="${VIDEO_IFRAME_ALLOW}"></iframe></div>`
    );
  }

  const zoom = embed.zoom ? ` data-sd-video-zoom="${embed.zoom}"` : '';
  return (
    `<div class="sd-video" data-sd-provider="${embed.provider}" style="aspect-ratio:${
      embed.ratio ?? '16 / 9'
    }"${zoom}>` +
    `<iframe src="${escapeHtml(embed.src)}" title="${escapeHtml(
      title,
    )}" scrolling="no" loading="lazy" allow="${VIDEO_IFRAME_ALLOW}"></iframe></div>`
  );
}

interface LinkCardOptions {
  title: string;
  description?: string;
  url?: string;
  fallback: string;
}

function renderLinkCard({ title, description, url, fallback }: LinkCardOptions): string {
  const label = title || fallback;
  // 没有描述时优先域名/URL；静态位置卡不重复显示类型名。
  const detail = description || domainOf(url ?? '') || url || '';
  const body =
    `<span class="sd-link-card-info">` +
    `<span class="sd-link-card-title">${escapeHtml(label)}</span>` +
    (detail ? `<span class="sd-link-card-description">${escapeHtml(detail)}</span>` : '') +
    `</span>`;

  if (url) {
    return (
      `<a class="sd-link-card" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">` +
      body +
      `</a>`
    );
  }

  return `<div class="sd-link-card sd-link-card--static">${body}</div>`;
}

function renderGithubCard(extension: MomentExtension, labels: MomentSpecialLabels): string {
  const title = extension.title || labels.github;
  const description = extension.description || extension.url || labels.github;
  const owner = githubOwner(extension.url ?? '');
  const avatar = owner
    ? `<img class="sd-github-icon" src="https://github.com/${encodeURIComponent(
        owner,
      )}.png?size=64" alt="" loading="lazy" decoding="async" />`
    : '';
  const body =
    avatar +
    `<span class="sd-github-info">` +
    `<span class="sd-github-title">${escapeHtml(title)}</span>` +
    `<span class="sd-github-description">${escapeHtml(description)}</span>` +
    `</span>`;

  if (extension.url) {
    return (
      `<a class="sd-github-card" href="${escapeHtml(
        extension.url,
      )}" target="_blank" rel="noopener noreferrer">` +
      body +
      `</a>`
    );
  }

  return `<div class="sd-github-card sd-github-card--static">${body}</div>`;
}

function renderMusic(extension: MomentExtension, labels: MomentSpecialLabels): string {
  const title = extension.title || labels.music;
  const fallback = renderLinkCard({
    title,
    description: extension.description || extension.url,
    url: extension.url,
    fallback: labels.music,
  });

  if (!extension.url) return fallback;

  return (
    `<div class="moment-music" data-moment-music data-song-url="${escapeHtml(extension.url)}">` +
    fallback +
    `</div>`
  );
}

function renderExtension(extension: MomentExtension, labels: MomentSpecialLabels): string {
  if (extension.type === 'music') return renderMusic(extension, labels);
  if (extension.type === 'github') return renderGithubCard(extension, labels);

  if (extension.type === 'location') {
    return renderLinkCard({
      title: extension.title,
      description: extension.description,
      url: extension.url,
      fallback: labels.location,
    });
  }

  if (extension.type === 'tweet') {
    return renderLinkCard({
      title: extension.title,
      description: extension.description,
      url: extension.url,
      fallback: labels.tweet,
    });
  }

  return renderLinkCard({
    title: extension.title,
    description: extension.description,
    url: extension.url,
    fallback: labels.website,
  });
}

/** 动态特殊内容：优先复用 v2 指令已经使用的卡片、视频与播放器形态。 */
export function renderMomentSpecial(item: MomentItem, labels: MomentSpecialLabels): string {
  return (
    (item.video ? renderVideo(item.video, labels) : '') +
    (item.extension ? renderExtension(item.extension, labels) : '')
  );
}
