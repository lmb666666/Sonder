import { LazyPopoverSearch } from '#components'

export const useSearchStore = defineStore('search', () => {
	const searchEnabled = useAppConfig().features.search.enabled
	const word = ref('')
	const debouncedWord = refDebounced(word)

	if (!searchEnabled)
		return { word, debouncedWord }

	// 搜索框应和侧边栏状态联动
	const layoutStore = useLayoutStore()
	const modalStore = useModalStore()

	const {
		open: _open,
		close: _close,
	} = modalStore.use(() => h(LazyPopoverSearch, {
		onClose: () => {
			_close()
			layoutStore.close()
		},
	}), {
		unique: true,
		duration: 200,
	})

	// 从外部调用时应该操作 layoutStore
	watch(() => layoutStore.state, (state) => {
		if (!searchEnabled)
			return _close()
		if (state !== 'search')
			return _close()

		word.value = window.getSelection()?.toString().trim() || word.value
		_open()
	})

	return {
		word,
		debouncedWord,
	}
})
