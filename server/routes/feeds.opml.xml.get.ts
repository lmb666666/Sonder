import { getOpml } from '../utils/opml'

// .xml 扩展名保证在任意静态托管上都被浏览器直接打开而非下载
// The .xml extension ensures browsers render the OPML inline on any static host
export default defineEventHandler(() => getOpml())
