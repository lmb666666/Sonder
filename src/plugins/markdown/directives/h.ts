import { h as hastscriptH } from 'hastscript';
import type { Element } from 'hast';

/**
 * hastscript 的宽松包装：指令层大量使用「props + 子节点数组」的动态组合，
 * 这里统一放宽调用签名，返回值仍是标准 hast Element。
 */
export const h = hastscriptH as unknown as (selector: string, ...args: unknown[]) => Element;
