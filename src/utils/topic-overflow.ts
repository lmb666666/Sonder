export function hasTopicOverflow(scrollHeight: number, clientHeight: number) {
  return scrollHeight > clientHeight;
}
