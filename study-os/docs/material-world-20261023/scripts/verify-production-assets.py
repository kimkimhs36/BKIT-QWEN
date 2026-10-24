from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import urllib.request,json,hashlib,datetime
source='bb79f409bd536bd9196a2f4e61532af728620c72'
build=Path('/workspace/bkit-production-bb79f40');repo=Path('/workspace/bkit-pages');out=Path('docs/material-world-20261023/verification')
def fetch(path):
 req=urllib.request.Request('https://teambkit.com/'+path,headers={'Cache-Control':'no-cache'})
 with urllib.request.urlopen(req,timeout=60) as response:return response.read()
release=json.loads(fetch('release.json'));assert release['sourceCommit']==source,'Canonical release is still old'
assert json.loads(fetch('build-info.json'))['sourceCommit']==source
paths=[str(p.relative_to(build)) for p in build.rglob('*') if p.is_file()]
def check(path):
 data=fetch(path);expected=hashlib.sha256((build/path).read_bytes()).hexdigest();actual=hashlib.sha256(data).hexdigest();assert actual==expected,path
 return {'path':path,'sha256':actual,'status':200}
with ThreadPoolExecutor(max_workers=6) as pool:result=list(pool.map(check,paths))
preserved=json.loads(Path('/workspace/material-preserve-files.json').read_text())
for path,digest in preserved.items():assert hashlib.sha256((repo/path).read_bytes()).hexdigest()==digest,path
old=json.loads((repo/'releases/20261023-before-material-world.json').read_text())
for asset in old['entryAssets']:assert hashlib.sha256(fetch(asset['path'].lstrip('/'))).hexdigest()==asset['sha256']
for path in ['exam-lab/index.html','mock-rescue/index.html','CNAME','tohesar-juggernaut-20261016.html']:assert hashlib.sha256(fetch(path)).hexdigest()==preserved[path],path
report={'sourceCommit':source,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'htmlMatchesBuild':True,'matchingPublishedFiles':len(result),'asset404s':0,'preservedLocalAssetAndIndependentFiles':len(preserved),'oldEntryAssetsStillAvailable':True,'independentPagesAndCnameMatch':True,'files':result}
(out/'production-assets.json').write_text(json.dumps(report,indent=2)+'\n');print({k:v for k,v in report.items() if k!='files'})
