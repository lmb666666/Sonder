<script setup lang="ts">
defineProps<{ songUrl: string }>()
</script>

<template>
<AudioEmbed :song-url="songUrl" />
</template>
