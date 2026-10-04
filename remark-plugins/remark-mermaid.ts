import type { Parent, Root } from 'mdast'
import { visit } from 'unist-util-visit'

interface MermaidCodeBlock extends Parent {
	type: 'mermaidCodeBlock'
}

declare module 'mdast' {
	interface RootContentMap {
		mermaidCodeBlock: MermaidCodeBlock
	}
}

export default function remarkMermaid() {
	return (tree: Root) => {
		visit(tree, 'code', (node, index, parent) => {
			if (node.lang !== 'mermaid' || !parent || index === undefined)
				return

			parent.children.splice(index, 1, {
				type: 'mermaidCodeBlock',
				children: [],
				data: {
					hName: 'mermaid',
					hProperties: { code: node.value },
				},
			})
		})
	}
}
