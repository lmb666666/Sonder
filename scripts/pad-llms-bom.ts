// 静态托管一般不为 .txt 声明 charset，中文浏览器会按本地编码解码导致乱码；
// 在文件头补 UTF-8 BOM，任何托管环境下浏览器都能正确按 UTF-8 解码
// Static hosts rarely declare charset for .txt, so CJK-locale browsers may decode it wrongly;
// prepending a UTF-8 BOM guarantees correct decoding on any host
import { readFile, writeFile } from 'node:fs/promises'

const file = '.output/public/llms.txt'
const content = await readFile(file)
const bom = Uint8Array.of(0xEF, 0xBB, 0xBF)
if (!content.subarray(0, bom.length).equals(bom))
	await writeFile(file, new Uint8Array([...bom, ...content]))
