import { useEffect, useState } from 'react';
import { Monitor, MonitorOff } from 'lucide-react';
// Screen Wake Lock is optional, requires supported secure browser and permission.
export function FocusStayAwake({running}:{running:boolean}) {
  const [wanted,setWanted]=useState(false),[held,setHeld]=useState(false),[error,setError]=useState('');
  const supported=typeof navigator!=='undefined' && 'wakeLock' in navigator;
  const [sleepGuardActive,setSleepGuardActive] = useState(() => document.documentElement.dataset.bkitSleepGuardActive === 'true');
  useEffect(() => {
    const update = () => {
      const active = document.documentElement.dataset.bkitSleepGuardActive === 'true';
      setSleepGuardActive(active);
      if (active) setWanted(false); // Releases the screen wake lock during bedtime protection.
    };
    window.addEventListener('bkit:sleep-guard-state', update);
    update();
    return () => window.removeEventListener('bkit:sleep-guard-state', update);
  }, []);
  useEffect(()=>{
    if(!wanted||!running||!supported||sleepGuardActive){setHeld(false);return;}
    let alive=true,lock:WakeLockSentinel|null=null;
    const request=async()=>{
      if(document.visibilityState!=='visible'||lock)return;
      try{
        const acquired=await navigator.wakeLock.request('screen');
        if(!alive){await acquired.release();return;}
        lock=acquired;setHeld(true);setError('');
        acquired.addEventListener('release',()=>{if(lock===acquired){lock=null;setHeld(false);}});
      }catch{
        if(alive){setHeld(false);setWanted(false);setError('브라우저에서 화면 켜두기를 허용하지 않았어.');}
      }
    };
    const onVisible=()=>{if(document.visibilityState==='visible')void request();};
    document.addEventListener('visibilitychange',onVisible);
    void request();
    return ()=>{alive=false;document.removeEventListener('visibilitychange',onVisible);if(lock)void(lock as WakeLockSentinel).release();};
  },[wanted,running,supported,sleepGuardActive]);
  if(!running||!supported||sleepGuardActive)return null;
  return <div className="wake-control">
    <button type="button" className="text-button wake-toggle" aria-pressed={held} onClick={()=>{setError('');setWanted(x=>!x);}}>
      {held?<Monitor size={16}/>:<MonitorOff size={16}/>} {held?'화면 켜두는 중':'화면 켜두기'}
    </button>
    {!!error&&<small role="status">{error}</small>}
  </div>;
}
