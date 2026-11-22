import { describe, expect, test } from 'bun:test';

import {
  aggregateClaudeRecords,
  aggregateCodexRecords,
  aggregateUsage,
  aggregateZcodeRows,
  parseCsv,
} from './sync-token-usage';

describe('sync-token-usage', () => {
  test('按 Magpie 主面板口径汇总全部 Token，跳过本地 session 行', () => {
    const rows = parseCsv(
      [
        'time,input_tokens,output_tokens,reasoning_tokens,cache_read_tokens,cache_write_tokens,source',
        '2026-11-04T10:00:00+08:00,100,20,5,999,0,',
        '2026-11-04T11:00:00+08:00,1,2,0,0,0,log',
        '2026-11-05T09:00:00+08:00,0,0,0,0,0,',
      ].join('\n'),
    );

    const { days, parsedRows } = aggregateUsage(rows);

    expect(parsedRows).toBe(1);
    expect([...days.entries()]).toEqual([['2026-11-04', 1124]]);
  });

  test('CSV 支持带引号字段', () => {
    expect(parseCsv('a,b\n"x,y","z""q"')).toEqual([
      ['a', 'b'],
      ['x,y', 'z"q'],
    ]);
  });

  test('ZCode computed_total_tokens 按天聚合', () => {
    const days = aggregateZcodeRows([
      { day: '2026-11-04', tokens: 100 },
      { day: '2026-11-04', tokens: '23' },
      { day: '2026-11-05', tokens: 0 },
      { day: 'bad', tokens: 99 },
    ]);

    expect([...days.entries()]).toEqual([['2026-11-04', 123]]);
  });

  test('Claude Code 按 message.id 去重，并计入缓存', () => {
    const line = {
      type: 'assistant',
      timestamp: '2026-11-04T10:00:00.000Z',
      message: {
        id: 'msg_1',
        usage: {
          input_tokens: 100,
          output_tokens: 20,
          cache_creation_input_tokens: 5,
          cache_read_input_tokens: 50,
        },
      },
    };

    const days = aggregateClaudeRecords([line, line, { type: 'user' }]);
    expect([...days.values()]).toEqual([175]);
  });

  test('Codex 按 response_id 去重，使用 total_tokens', () => {
    const line = (responseId: string, total: number) => ({
      type: 'token_usage_record',
      timestamp: '2026-11-04T10:00:00.000Z',
      payload: {
        response_id: responseId,
        usage: { input_tokens: total - 10, output_tokens: 10, total_tokens: total },
      },
    });

    const days = aggregateCodexRecords([line('r1', 1000), line('r1', 1000), line('r2', 200)]);
    expect([...days.values()]).toEqual([1200]);
  });
});
