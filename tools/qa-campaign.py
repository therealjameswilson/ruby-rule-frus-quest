# Earned campaign replay: fresh opening, then only saves earned by the prior stage.
# FRUS_QA_URL selects the build; FRUS_CAMPAIGN_OUT selects evidence directory.
# Optional integer argument resumes a failed chain stage using its predecessor save.
from pathlib import Path
import os,subprocess,sys
root=Path(__file__).resolve().parents[1]
base=Path(os.environ.get('FRUS_CAMPAIGN_OUT','/tmp/frus-campaign'))
url=os.environ.get('FRUS_QA_URL','http://127.0.0.1:5210/')
playwright=os.environ.get('PLAYWRIGHT_MODULE',str(Path.home()/'.codex/skills/develop-web-game/node_modules/playwright/index.mjs'))
names=['earned-source-note','earned-annotation','file-annotation','earned-network','earned-network-routing','earned-clearance','earned-referral-dispatch','earned-referral-manifest','earned-editor','earned-proof','earned-production','boss-counter-loop','bindery-assembly']
base.mkdir(parents=True,exist_ok=True)
opening=base/'01-guide';opening.mkdir(exist_ok=True)
env=dict(os.environ,FRUS_QA_URL=url,PLAYWRIGHT_MODULE=playwright,FRUS_QA_OUT=str(opening))
if len(sys.argv)<2:
 print('START fresh opening',flush=True)
 with (opening/'run.log').open('w') as log:
  result=subprocess.run(['node',str(root/'tools/qa-guide-counter.mjs')],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=900)
 print((opening/'run.log').read_text()[-2600:],flush=True)
 if result.returncode:sys.exit(result.returncode)
prev=opening/'earned-storage.json'
start=int(sys.argv[1]) if len(sys.argv)>1 else 0
for idx,name in enumerate(names):
 out=base/f'{idx+2:02d}-{name}'
 if idx<start:
  prev=out/('earned-bindery-storage.json' if name=='boss-counter-loop' else 'earned-storage.json');continue
 out.mkdir(parents=True,exist_ok=True)
 source=(root/f'tools/qa-{name}.mjs').read_text()
 source=source.replace("import { completeCompilerCheckpoint } from './qa-compiler-checkpoint-helper.mjs';\n", "")
 source="import { completeCompilerCheckpoint } from '"+str(root/"tools/qa-compiler-checkpoint-helper.mjs")+"';\n"+source
 source=source.replace('await page.waitForTimeout(150);\n};','await page.waitForTimeout(150);await completeCompilerCheckpoint(page);\n};').replace('await page.waitForTimeout(150);};','await page.waitForTimeout(150);await completeCompilerCheckpoint(page);};')
 # Keep full-page screenshots in addition to the game's native WebGL capture.
 source=source.replace('JSON.stringify(await state(),null,2));', 'JSON.stringify(await state(),null,2));await page.screenshot({path:`${out}/${name}-screen.png`});')
 source=source.replace('http://127.0.0.1:5195/', url)
 script=out/'run.mjs';script.write_text(source)
 env=dict(os.environ,FRUS_QA_URL=url,PLAYWRIGHT_MODULE=playwright,FRUS_QA_STORAGE=str(prev),FRUS_QA_OUT=str(out))
 print('START',idx,name,flush=True)
 with (out/'run.log').open('w') as log:
  p=subprocess.run(['node',str(script)],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=900)
 print('RESULT',name,p.returncode,flush=True)
 print((out/'run.log').read_text()[-2600:],flush=True)
 if p.returncode:sys.exit(p.returncode)
 prev=out/('earned-bindery-storage.json' if name=='boss-counter-loop' else 'earned-storage.json')
