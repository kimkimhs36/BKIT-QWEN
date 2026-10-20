import { test, expect } from './local-fixture';

test('AI ZONE opens from top universal feature search and shows tool versions', async ({page}) => {
 await page.goto('./');
 const search=page.getByRole('searchbox',{name:'BKIT 기능 및 학습 사이트 검색'});
 await search.fill('AI ZONE');
 await page.locator('#bkit-search-results').getByRole('button',{name:/BKIT AI ZONE/}).first().click();
 const zone=page.getByRole('region',{name:'BKIT AI ZONE'});
 await expect(zone).toBeVisible();
 await expect(zone).toContainText('AI ZONE');
 await expect(zone.getByRole('button',{name:'AI 백과사전'})).toBeVisible();
 await zone.getByRole('searchbox',{name:'AI 도구 검색'}).fill('NotebookLM');
 await expect(zone.getByRole('heading',{name:'NotebookLM'})).toBeVisible();
 await expect(zone).toContainText('모델 / 버전');
 const link=zone.getByRole('link',{name:/도구 열기/}).first();
 await expect(link).toHaveAttribute('href','https://notebooklm.google.com/');
 await expect(link).toHaveAttribute('target','_blank');
 await expect(link).toHaveAttribute('rel','noopener noreferrer');
});

test('AI ZONE favorites are durable and never change local study data',async({page})=>{
 await page.goto('./');
 const before=await page.evaluate(()=>localStorage.getItem('bkit.study-os.v1'));
 const search=page.getByRole('searchbox',{name:'BKIT 기능 및 학습 사이트 검색'});
 await search.fill('AI ZONE');
 await page.locator('#bkit-search-results').getByRole('button',{name:/BKIT AI ZONE/}).first().click();
 const zone=page.getByRole('region',{name:'BKIT AI ZONE'});
 await zone.getByRole('searchbox',{name:'AI 도구 검색'}).fill('Sora');
 await zone.getByRole('button',{name:'Sora 즐겨찾기 추가'}).click();
 await expect(zone.getByRole('button',{name:'Sora 즐겨찾기 해제'})).toBeVisible();
 await page.reload();
 await search.fill('AI ZONE');
 await page.locator('#bkit-search-results').getByRole('button',{name:/BKIT AI ZONE/}).first().click();
 await zone.getByRole('searchbox',{name:'AI 도구 검색'}).fill('Sora');
 await expect(zone.getByRole('button',{name:'Sora 즐겨찾기 해제'})).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('bkit.ai-zone.favorites.v1')||'[]'))).toContain('sora');
 expect(await page.evaluate(()=>localStorage.getItem('bkit.study-os.v1'))).toEqual(before);
});

test('leaderboard has source, date, model/version and no fabricated 100 places',async({page})=>{
 await page.goto('./');
 const search=page.getByRole('searchbox',{name:'BKIT 기능 및 학습 사이트 검색'});
 await search.fill('AI ZONE');
 await page.locator('#bkit-search-results').getByRole('button',{name:/BKIT AI ZONE/}).first().click();
 const zone=page.getByRole('region',{name:'BKIT AI ZONE'});
 await zone.getByRole('button',{name:'세계 순위'}).click();
 await expect(zone).toContainText('Claude Opus 5.5');
 await expect(zone).toContainText('GPT-6 Astra');
 await expect(zone).toContainText('설정 · Max');
 await expect(zone).toContainText('2026-10-20');
 await zone.getByRole('button',{name:'영상 생성'}).click();
 await expect(zone).toContainText('아직 BKIT 내부에 검증된 데이터가 없어서');
 await expect(zone.getByRole('link',{name:/최신 텍스트\/이미지→영상 순위 열기/})).toBeVisible();
});

test('official news links are identified as links, not simulated real-time news',async({page})=>{
 await page.goto('./');
 const search=page.getByRole('searchbox',{name:'BKIT 기능 및 학습 사이트 검색'});
 await search.fill('AI ZONE');
 await page.locator('#bkit-search-results').getByRole('button',{name:/BKIT AI ZONE/}).first().click();
 const zone=page.getByRole('region',{name:'BKIT AI ZONE'});
 await zone.getByRole('button',{name:'AI 최신 소식'}).click();
 await expect(zone).toContainText('아직 BKIT 자체 뉴스 자동 수집이나 즉시 알림은 연결하지 않았어');
 await expect(zone.getByRole('link',{name:/OpenAI 공식 발표/})).toHaveAttribute('href','https://openai.com/news/');
});
