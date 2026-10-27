import { describe, expect, it, vi } from 'vitest';
import { newState } from '../src/model';
import { askLiveAssistant, checkAssistantConfig } from '../src/assistantAI';

describe('owner opt-in AI assistant client', () => {
  it('checks public server config without a paid request', async () => {
    const fetcher = vi.fn(async (_url: unknown, init: RequestInit) => {
      expect(init.method).toBeUndefined();
      expect(init.cache).toBe('no-store');
      return new Response(JSON.stringify({
        assistantEnabled: true,
        googleClientId: 'test.apps.googleusercontent.com',
      }));
    }) as unknown as typeof fetch;
    expect(await checkAssistantConfig(fetcher)).toMatchObject({
      available: true, clientId: 'test.apps.googleusercontent.com',
    });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('does not expose a paid mode when the server has disabled it', async () => {
    const fetcher = async () => new Response(JSON.stringify({
      assistantEnabled: false, googleClientId: 'test.apps.googleusercontent.com',
    }));
    expect((await checkAssistantConfig(fetcher)).available).toBe(false);
  });

  it('sends the question only by default and requires an explicit token', async () => {
    const state = newState();
    state.settings.goal = '비공개 목표';
    const fetcher = vi.fn(async (_url: unknown, init: RequestInit) => {
      const data = JSON.parse(String(init.body));
      expect(data).toEqual({ question: '오늘 뭐부터 할까?' });
      expect(String(JSON.stringify(data))).not.toContain('비공개 목표');
      expect(init.headers).toMatchObject({ Authorization: 'Bearer approved-token' });
      return new Response(JSON.stringify({
        mode: 'live', answer: '등록된 과제부터 하나씩 확인해 보자.',
      }));
    }) as unknown as typeof fetch;
    expect(await askLiveAssistant('오늘 뭐부터 할까?', 'approved-token', state, false, fetcher))
      .toContain('과제부터');
    expect(fetcher).toHaveBeenCalledOnce();
    await expect(askLiveAssistant('test', '', state, false, fetcher)).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('only includes the bounded context when the user opts in', async () => {
    const state = newState();
    state.settings.goal = '시험 준비';
    const fetcher = vi.fn(async (_url: unknown, init: RequestInit) => {
      const sent = JSON.parse(String(init.body));
      expect(sent.context.goal).toBe('시험 준비');
      expect(sent.context.tasks).toEqual([]);
      return new Response(JSON.stringify({ mode: 'live', answer: '5분부터 시작하자.' }));
    }) as unknown as typeof fetch;
    await askLiveAssistant('공부 계획', 'approved-token', state, true, fetcher);
  });

  it('does not accept demo output or a spoofed/malformed model answer', async () => {
    const state = newState();
    for (const bad of [
      { mode: 'demo', answer: 'fallback' },
      { mode: 'live', answer: '' },
      { mode: 'live', answer: 123 },
    ]) {
      await expect(askLiveAssistant('test', 'approved-token', state, false,
        async () => new Response(JSON.stringify(bad))))
        .rejects.toThrow('AI 응답이 검증되지 않았어요');
    }
  });

  it('handles expired authorization and provider outages without treating them as success', async () => {
    const state = newState();
    await expect(askLiveAssistant('test', 'approved-token', state, false,
      async () => new Response('{"error":"expired"}', { status: 401 })))
      .rejects.toThrow('Google 연결이 만료됐어요');
    await expect(askLiveAssistant('test', 'approved-token', state, false,
      async () => { throw new Error('private network details'); }))
      .rejects.not.toThrow('private network details');
  });
});
