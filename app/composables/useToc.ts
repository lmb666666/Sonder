import type { Toc, TocLink } from '@nuxt/content'
import type { MaybeComputedElementRef } from '@vueuse/core'

interface TocList {
	id: string
	documentTop: number | undefined
}

interface UseTocOptions {
	scrollableEl?: MaybeComputedElementRef
	activeHeadingId?: MaybeRefOrGetter<string | undefined>
}

export function useToc(
	toc: MaybeRefOrGetter<Toc | undefined>,
	options: UseTocOptions = {},
) {
	const { scrollableEl, activeHeadingId: sharedActiveHeadingId } = options
	const { y: scrollY } = useWindowScroll()

	function flattenToc(tocTree: TocLink[], tocList: TocList[] = []) {
		tocTree.forEach(({ id, children }) => {
			const heading = import.meta.client ? document.getElementById(id) : undefined
			const documentTop = heading
				? heading.getBoundingClientRect().top + scrollY.value
				: undefined
			tocList.push({ id, documentTop })
			children && flattenToc(children, tocList)
		})
		return tocList
	}

	const tocOffsets = shallowRef<TocList[]>([])
	let measureFrame = 0
	function measureToc() {
		if (!import.meta.client || sharedActiveHeadingId)
			return
		cancelAnimationFrame(measureFrame)
		measureFrame = requestAnimationFrame(() => {
			tocOffsets.value = flattenToc(toValue(toc)?.links || []).reverse()
		})
	}

	function getActiveHeading() {
		const readingPosition = scrollY.value + window.innerHeight * 0.3
		// 为兼容性不使用 findLast，而是使用倒序的 tocOffsets
		return tocOffsets.value.find(item => item.documentTop !== undefined && item.documentTop <= readingPosition)?.id
	}

	const activeHeadingId = sharedActiveHeadingId
		? computed(() => toValue(sharedActiveHeadingId))
		: computed(() => import.meta.client ? getActiveHeading() : undefined)

	function scrollToActiveTocItem() {
		if (!import.meta.client || !scrollableEl)
			return

		const el = unrefElement(scrollableEl)
		const active = el?.querySelector<HTMLLinkElement>(`a[href="#${activeHeadingId.value}"]`)
		if (!el || !active)
			return

		const panelRect = el.getBoundingClientRect()
		const activeRect = active.getBoundingClientRect()
		const targetTop = panelRect.top + Math.min(panelRect.height * 0.3, Math.max(0, panelRect.height - activeRect.height - 16))
		const target = Math.max(0, el.scrollTop + activeRect.top - targetTop)
		el.scrollTo({ top: target, behavior: 'auto' })
	}

	let stopTocResize: { stop: () => void } | undefined
	onMounted(() => {
		measureToc()
		stopTocResize = useResizeObserver(document.body, measureToc)
	})
	watch(() => toValue(toc), measureToc, { flush: 'post' })

	onBeforeUnmount(() => {
		stopTocResize?.stop()
		cancelAnimationFrame(measureFrame)
	})

	return {
		tocOffsets,
		activeHeadingId,
		scrollToActiveTocItem,
	}
}
