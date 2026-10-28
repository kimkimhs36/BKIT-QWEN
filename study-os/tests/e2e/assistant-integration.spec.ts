import {test,expect} from './local-fixture';
test.use({serviceWorkers:'block'});

test('assistant stays local by default, shares context only by consent and falls back after expired auth', async({page})=>{
  await page.addInitScript(()=>{
    (window as unknown as {google:unknown}).google={accounts:{oauth2:{initTokenClient:(options:{callback:(result:unknown)=>void})=>({
      requestAccessToken:()=>options.callback({access_token:'synthetic-approved-token'}),
    })}}};
  });
  await page.route('**/api/config',route=>route.fulfill({headers:{'Access-Control-Allow-Origin':'*'},
    json:{assistantEnabled:true,googleClientId:'test.apps.googleusercontent.com'}}));
  const requests:Record<string,unknown>[]=[];
  await page.route('**/api/assistant',async route=>{
    if(route.request().method()==='OPTIONS') return route.fulfill({headers:{'Access-Control-Allow-Origin':'*',
      'Access-Control-Allow-Headers':'Content-Type,Authorization','Access-Control-Allow-Methods':'POST,OPTIONS'}});
    requests.push(route.request().postDataJSON());
    await route.fulfill({status:requests.length===1?200:401,headers:{'Access-Control-Allow-Origin':'*'},
      json:requests.length===1?{mode:'live',answer:'[합성 테스트 응답] 과제 원본을 확인하세요.'}:{error:'expired'}});
  });
  await page.goto('./');
  await page.getByRole('button',{name:'BKIT AI 비서에게 물어보기'}).click();
  const assistant=page.getByRole('region',{name:'BKIT 멀티 비서'});
  await expect(assistant.getByText('현재 모드: 무료 로컬 비서')).toBeVisible();
  const input=assistant.getByLabel('비서에게 질문하기');
  await input.fill('수학을 어떻게 공부할까?');
  await assistant.getByRole('button',{name:'비서에게 보내기'}).click();
  expect(requests).toHaveLength(0);
  await assistant.getByRole('button',{name:'Google 계정으로 AI 연결'}).click();
  await expect(assistant).toContainText('아직 실제 답변 미검증');
  expect(requests).toHaveLength(0);
  await input.fill('분수 계산을 설명해 줘');
  await assistant.getByRole('button',{name:'비서에게 보내기'}).click();
  await expect(assistant).toContainText('[합성 테스트 응답]');
  expect(requests[0]).toEqual({question:'분수 계산을 설명해 줘'});
  await assistant.getByRole('checkbox').check();
  await input.fill('내 공부 방향을 제안해 줘');
  await assistant.getByRole('button',{name:'비서에게 보내기'}).click();
  await expect(assistant).toContainText('Google 연결이 만료됐어요');
  await expect(assistant).toContainText('위 답변은 로컬 안내예요');
  expect(requests[1]).toHaveProperty('context');
  expect(await page.evaluate(()=>Object.values(localStorage).join(' '))).not.toContain('synthetic-approved-token');
});
