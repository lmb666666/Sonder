<script setup lang="ts">
import { Icon, UtilDate } from '#components'

const appConfig = useAppConfig()
const { public: { buildTime, ci } } = useRuntimeConfig()
const blogInfoConfig = appConfig.ui.sidebar.blogInfo

const ciPlatform = computed(() => {
	const iconName = ciIcons[ci]
	if (!iconName)
		return ''

	const iconNode = iconName.startsWith('http')
		? h('img', { src: iconName, alt: '' })
		: h(Icon, { name: iconName })

	return h('span', {}, [iconNode, ` ${ci.split(' ')[0]}`])
})

const blogInfo = computed(() => ([
	...(blogInfoConfig.uptime ? [{ label: '运营时长', value: timeElapse(appConfig.timeEstablished), tip: `博客于${appConfig.timeEstablished}上线` }] : []),
	...(blogInfoConfig.lastUpdated
		? [{
				label: '上次更新',
				value: () => h(UtilDate, {
					date: buildTime,
					relative: true,
					tipPrefix: '构建于',
				}),
			}]
		: []),
	...(blogInfoConfig.imageBed.enabled ? [{ label: '图片存储', value: () => [h('img', { src: blogInfoConfig.imageBed.icon, alt: '' }), ` ${blogInfoConfig.imageBed.name}`] }] : []),
	...(blogInfoConfig.buildPlatform && ciPlatform.value ? [{ label: '构建平台', value: ciPlatform }] : []),
]))
</script>

<template>
<BlogWidget card :title="blogInfoConfig.title">
	<ZDlGroup size="small" :items="blogInfo" />
</BlogWidget>
</template>

<style lang="scss" scoped>
.dl-group :deep(img) {
	height: 1.2em;
	vertical-align: sub;
}
</style>
