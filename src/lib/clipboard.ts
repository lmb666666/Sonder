/** 复制文本：优先 Clipboard API，失败或不可用时回退到旧版 execCommand。 */
type LegacyDocument = {
  execCommand(commandId: string): boolean;
};

export async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Fall through to the selection-based fallback.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = (document as unknown as LegacyDocument).execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Clipboard copy failed.');
}
