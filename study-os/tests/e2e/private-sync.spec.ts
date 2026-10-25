import { test, expect } from './local-fixture';

test('owner consent connects an empty first device without touching public study sessions', async ({page}) => {
  await page.addInitScript(() => {
    (window as any).google = {accounts:{oauth2:{initTokenClient(options:{
      scope:string;
      callback:(response:{access_token:string;scope:string})=>void;
    }){
      return {requestAccessToken(){
        options.callback({access_token:'synthetic-owner-token',scope:options.scope});
      }};
    }}}};
    (window as any).__bkSyncWrites = 0;
    const originalFetch = window.fetch.bind(window);
    // Stub only the private API on the page; native CORS and Redis are tested separately
    // in the backend integration tests. WebKit cannot reliably fulfill preflight mocks.
    (window as any).fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url === 'https://bkit-api.vercel.app/api/config')
        return Promise.resolve(new Response(JSON.stringify({
          googleClientId: 'test.apps.googleusercontent.com', briefingEnabled: true,
        }), {status:200,headers:{'Content-Type':'application/json'}}));
      if (url === 'https://bkit-api.vercel.app/api/sync') {
        const auth = new Headers(init?.headers).get('Authorization');
        if (auth !== 'Bearer synthetic-owner-token')
          return Promise.resolve(new Response('{}',{status:401}));
        const method = init?.method ?? 'GET';
        if (method === 'GET')
          return Promise.resolve(new Response(JSON.stringify({version:0,state:null}),{
            status:200,headers:{'Content-Type':'application/json'},
          }));
        if (method === 'PUT') {
          const data = JSON.parse(String(init?.body));
          if (data.expectedVersion !== 0 || data.state.active !== null ||
              data.state.tasks.length || data.state.plan.length)
            return Promise.resolve(new Response('{}',{status:400}));
          (window as any).__bkSyncWrites++;
          return Promise.resolve(new Response(JSON.stringify({version:1}),{
            status:200,headers:{'Content-Type':'application/json'},
          }));
        }
      }
      return originalFetch(input,init);
    };
  });
  await page.goto('./');

  await page.getByRole('button',{name:'설정 열기'}).click();await page.getByText('기기 간 연동',{exact:true}).click();
  const panel=page.getByRole('region',{name:'BKIT 개인 클라우드'});
  await expect(panel).toBeVisible();
  await panel.getByRole('button',{name:'Google로 개인 클라우드 연결'}).click();
  await expect(panel).toContainText('연결됨');
  await expect(panel).toContainText('첫 개인 클라우드가 준비됐어요.');
  expect(await page.evaluate(()=>(window as any).__bkSyncWrites)).toBe(1);
});
