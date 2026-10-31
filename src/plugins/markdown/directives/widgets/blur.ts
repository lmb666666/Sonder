/** 剧透模糊：悬停显形之外，支持点击/回车切换（移动端没有 hover）。 */

let blurBound = false;

export function bindBlurs() {
  if (blurBound) return;
  blurBound = true;

  const toggle = (el: Element) => {
    const revealed = el.classList.toggle('is-revealed');
    el.setAttribute('data-revealed', String(revealed));
    el.setAttribute('aria-pressed', String(revealed));
  };

  document.addEventListener('click', (event) => {
    const el = event.target instanceof Element ? event.target.closest('.sd-blur') : null;
    if (el) toggle(el);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const el = event.target instanceof Element ? event.target.closest('.sd-blur') : null;
    if (!el) return;
    event.preventDefault();
    toggle(el);
  });
}
