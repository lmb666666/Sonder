export function getUnexpectedCollectionIds(sql: string): string[] {
	const allowedNonArticleIds = new Set(['content/link.md'])
	return [...sql.matchAll(/INSERT INTO _content_content VALUES \('([^']+)'/g)]
		.map(match => match[1])
		.filter((id): id is string => id !== undefined && !id.startsWith('content/posts/') && !allowedNonArticleIds.has(id))
}
