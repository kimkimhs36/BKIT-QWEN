import {test,expect} from '@playwright/test';

test('owner-only private cloud connects and saves an empty first-device snapshot', async ({page})=>{
  await page.addInitScript(()=>{
    (window as any).google={accounts:{oauth2:{initTokenClient(options:{
      scope:string;
      callback:(response:{access_token:string;scope:string})=>void;
    }){
      return {requestAccessToken(){
        options.callback({access_token:'synthetic-owner-token',scope:options.scope});
      }};
    }}}};
  });
  const cors={
    'Access-Control-Allow-Origin':'*',
    'Access-Control-Allow-Headers':'Authorization,Content-Type',
    'Access-Control-Allow-Methods':'GET,PUT,OPTIONS',
  };
  await page.route('https://bkit-api.vercel.app/api/config',route=>
    route.fulfill({headers:cors,json:{googleClientId:'test.apps.googleusercontent.com',briefingEnabled:true}}));
  let version=0;
  let wrote=false;
  await page.route('https://bkit-api.vercel.app/api/sync',async route=>{
    const req=route.request();
    if(req.method()==='OPTIONS') return route.fulfill({status:204,headers:cors,body:''});
    expect(req.headers()['authorization']).toBe('Bearer synthetic-owner-token');
    if(req.method()==='GET') return route.fulfill({headers:cors,json:{version,state:null}});
    if(req.method()==='PUT'){
      const data=req.postDataJSON();
      expect(data.expectedVersion).toBe(0);
      expect(data.state.active).toBeNull();
      expect(data.state.tasks).toEqual([]);
      expect(data.state.plan).toEqual([]);
      version=1;
      wrote=true;
      return route.fulfill({headers:cors,json:{version}});
    }
    return route.abort();
  });
  await page.goto('./');
  await page.getByRole('button',{name:'더 보기'}).click();
  await page.getByRole('button',{name:'설정 열기'}).click();
  const panel=page.getByRole('region',{name:'BKIT 개인 클라우드'});
  await expect(panel).toBeVisible();
  await panel.getByRole('button',{name:'Google로 개인 클라우드 연결'}).click();
  await expect(panel).toContainText('연결됨');
  expect(wrote).toBe(true);
  await expect(panel).toContainText('첫 개인 클라우드가 준비됐어요.');
});
