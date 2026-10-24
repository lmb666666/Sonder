<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom">
  <xsl:output method="html" encoding="UTF-8" />
  <xsl:template match="/">
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="noindex" />
        <title><xsl:value-of select="atom:feed/atom:title" /> · Atom 订阅源</title>
        <style>
          :root { color-scheme: light dark; }
          body {
            margin: 0;
            padding: 48px 24px;
            background: #fdfdf9;
            color: #272d28;
            font-family: system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
          }
          @media (prefers-color-scheme: dark) {
            body { background: #1d211e; color: #e6e8e4; }
            a { color: #8fb8e8; }
            .entry { border-color: rgba(230, 232, 228, 0.14); }
          }
          .shell { max-width: 640px; margin: 0 auto; }
          .kicker { margin: 0 0 10px; color: #90998f; font-size: 0.72rem; letter-spacing: 0.1em; text-transform: uppercase; }
          h1 { margin: 0 0 8px; font-size: 1.9rem; font-weight: 500; }
          .subtitle { margin: 0 0 6px; color: #667066; }
          .hint { margin: 0 0 32px; padding: 10px 14px; border: 1px dashed rgba(31, 35, 40, 0.18); border-radius: 8px; color: #90998f; font-size: 0.82rem; }
          .entry { padding: 14px 2px; border-bottom: 1px solid rgba(31, 35, 40, 0.08); }
          .entry a { color: inherit; text-decoration: none; font-weight: 600; }
          .entry a:hover { text-decoration: underline; }
          .entry time { display: block; margin-top: 4px; color: #90998f; font-size: 0.76rem; font-variant-numeric: tabular-nums; }
          .entry p { margin: 6px 0 0; color: #667066; font-size: 0.88rem; }
        </style>
      </head>
      <body>
        <div class="shell">
          <p class="kicker">Atom Feed</p>
          <h1><xsl:value-of select="atom:feed/atom:title" /></h1>
          <p class="subtitle"><xsl:value-of select="atom:feed/atom:subtitle" /></p>
          <p class="hint">这是 Atom 订阅源，请复制地址栏 URL 到阅读器订阅；页面展示仅为预览。</p>
          <xsl:for-each select="atom:feed/atom:entry">
            <article class="entry">
              <a>
                <xsl:attribute name="href"><xsl:value-of select="atom:link/@href" /></xsl:attribute>
                <xsl:value-of select="atom:title" />
              </a>
              <time><xsl:value-of select="substring(atom:published, 1, 10)" /></time>
              <p><xsl:value-of select="atom:summary" /></p>
            </article>
          </xsl:for-each>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
