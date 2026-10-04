export type LayoutState = 'none' | 'sidebar' | 'search' | 'lightbox'

export const useLayoutStore = defineStore('layout', () => {
	const router = useRouter()

	const state = ref<LayoutState>('none')
	const asideWidgets = ref<WidgetName[]>([])
	const avoidTargets = ref<AvoidTarget[]>([])

	const close = () => state.value = 'none'

	const toggle = (key: LayoutState) => {
		if (state.value === key)
			return close()
		state.value = key
	}

	const setAside = (widgets?: WidgetName[]) => {
		asideWidgets.value = widgets ?? []
	}

	useEventListener('keydown', (e) => {
		if (state.value !== 'none' && e.key === 'Escape') {
			e.preventDefault()
			close()
		}
	})

	router.beforeEach(() => {
		close()
	})

	// 弹层（面板/搜索/灯箱）打开时锁定背景滚动，关闭或路由跳转时恢复
	if (import.meta.client) {
		watch(state, (s) => {
			const locked = s !== 'none'
			document.documentElement.style.overflow = locked ? 'hidden' : ''
		})
	}

	return {
		state,
		asideWidgets,
		avoidTargets,
		close,
		toggle,
		setAside,
	}
})
