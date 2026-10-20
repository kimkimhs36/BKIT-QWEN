import {test,expect} from './local-fixture';

test('top search opens BKIT feature without losing unsaved study data',async({page})=>{
  await page.goto('./');
  const search=page.getByRole('searchbox',{name:'BKIT 기능 및 학습 사이트 검색'});
  await expect(search).toBeVisible();
  await search.fill('수행평가');
  await expect(page.locator('#bkit-search-results')).toBeVisible();
  await page.getByRole('button',{name:/과제 · 수행평가/}).first().click();
  await expect(page.locator('.app-shell')).toHaveClass(/page-tasks/);
  await expect(search).toHaveValue('');
  await page.getByRole('button',{name:'이전 화면으로 돌아가기'}).click();
  await expect(page.locator('.app-shell')).toHaveClass(/page-today/);
});

test('search identifies the study encyclopedia and safe external site links',async({page})=>{
  await page.goto('./');
  const search=page.getByRole('searchbox',{name:'BKIT 기능 및 학습 사이트 검색'});
  await search.fill('EBS');
  await expect(page.locator('.bkit-search-results')).toContainText('EBSi');
  await page.getByRole('button',{name:/공부 사이트 전체 보기/}).click();
  await expect(page.getByRole('region',{name:'공부 사이트 백과사전'})).toBeVisible();
  await expect(page.getByRole('link',{name:'EBSi 새 탭에서 열기'})).toHaveAttribute('rel','noopener noreferrer');
  await expect(page.getByRole('link',{name:'EBSi 새 탭에서 열기'})).toHaveAttribute('target','_blank');
});

test('site encyclopedia filters sites, favorites survive reload, no study record touched',async({page})=>{
  await page.goto('./');
  const baseline=await page.evaluate(()=>localStorage.getItem('bkit.study-os.v1'));
  await page.getByRole('searchbox',{name:'BKIT 기능 및 학습 사이트 검색'}).fill('공부 사이트 백과사전');
  await page.getByRole('button',{name:/공부 사이트 백과사전/}).first().click();
  const directory=page.getByRole('region',{name:'공부 사이트 백과사전'});
  await expect(directory).toBeVisible();
  await expect(directory).toContainText('47개');
  await directory.getByRole('button',{name:'EBSi 즐겨찾기 추가'}).click();
  await expect(directory.getByRole('button',{name:'EBSi 즐겨찾기 해제'})).toBeVisible();
  await directory.getByRole('button',{name:/즐겨찾기만/}).click();
  await expect(directory.getByRole('link',{name:'EBSi 새 탭에서 열기'})).toBeVisible();
  await expect(directory.getByRole('link',{name:'메가스터디 새 탭에서 열기'})).toHaveCount(0);
  await page.reload();
  await page.getByRole('searchbox',{name:'BKIT 기능 및 학습 사이트 검색'}).fill('공부 사이트 백과사전');
  await page.getByRole('button',{name:/공부 사이트 백과사전/}).first().click();
  await expect(directory.getByRole('button',{name:'EBSi 즐겨찾기 해제'})).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('bkit.study-site-favorites.v1')||'[]'))).toContain('ebsi');
  expect(await page.evaluate(()=>localStorage.getItem('bkit.study-os.v1'))).toEqual(baseline);
});

test('top search closes with Escape and still keeps the input usable',async({page})=>{
  await page.goto('./');
  const search=page.getByRole('searchbox',{name:'BKIT 기능 및 학습 사이트 검색'});
  await search.fill('물리');
  await expect(page.locator('#bkit-search-results')).toBeVisible();
  await search.press('Escape');
  await expect(page.locator('#bkit-search-results')).toHaveCount(0);
  await search.fill('수학');
  await search.focus();
  await expect(page.locator('#bkit-search-results')).toBeVisible();
});
