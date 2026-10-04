<script setup lang="ts">
import type { UtilImgProps } from '../util/Img.vue'
import { LazyPopoverLightbox } from '#components'

defineProps<UtilImgProps>()

const attrs = useAttrs()
const imgEl = useTemplateRef<HTMLImageElement>('img')
const modalStore = useModalStore()

const { open } = modalStore.use(
	() => h(LazyPopoverLightbox, {
		el: unrefElement(imgEl) as HTMLImageElement,
	}),
	{ unique: true },
)
</script>

<template>
<span class="prose-img" @click="open()">
	<UtilImg ref="img" :src :alt :width :height :densities :mirror :filter v-bind="attrs" />
</span>
</template>

<style lang="scss" scoped>
.prose-img {
	display: inline-block;
	cursor: zoom-in;
}
</style>
