import { mergeHobbyGroups } from '#shared/utils/hobby'
import manualGroups from '../content/data/hobbies'
import generated from '../content/data/hobbies.generated'

// 兴趣页数据：手写条目 + `pnpm sync:hobbies` 生成的自动条目
// Hobby page data: manual entries merged with output from `pnpm sync:hobbies`
const hobbyGroups = mergeHobbyGroups(manualGroups, generated)

export default hobbyGroups
