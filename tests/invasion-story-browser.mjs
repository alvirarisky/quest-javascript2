import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { missions } from '../src/invasion/missions.ts';
import { challenges } from '../shared/challenges.ts';
const browser=await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:1280,height:800}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const base=process.env.BASE_URL||'http://127.0.0.1:5173';
await mkdir('artifacts/story',{recursive:true});
async function ready(){await page.waitForFunction(()=>!document.querySelector('#start').disabled);}
async function leave(wave){
 for(let i=0;i<110;i++){
  if(await page.evaluate(w=>window.__invasion.world.wave!==w||!document.querySelector('#results').hidden,wave))return;
  if(await page.evaluate(()=>!window.__invasion.world.blocked)){
   await page.locator('#stepAction').click();
   await page.keyboard.press('Space');
  }
  await page.waitForTimeout(160);
 }
 throw Error('Could not leave wave '+wave);
}
try {
 await page.goto(base+'/?qa=1'); await ready();
 await page.locator('#name').fill('Story QA');await page.locator('#student').fill('ST-08');
 await page.locator('#start').click();await page.locator('#skipIntro').click();
 for(let wave=0;wave<8;wave++){
  console.log('Story mission',wave+1);
  if(wave>0){await page.locator('#reveal').waitFor();if(wave===4)await page.screenshot({path:'artifacts/story/plot-twist.png'});await page.locator('#skipReveal').click();}
  await page.locator('#stepAction').click(); await page.waitForFunction(()=>window.__invasion.world.progress===1);
  await page.locator('#stepAction').click();
  if(missions[wave].tasks[1].choices){
   await page.locator('#taskPanel').waitFor();
   if(wave===7)await page.getByRole('button',{name:/Balik siaran/}).click();
   else await page.getByRole('button',{name:missions[wave].tasks[1].choices.find(c=>c.correct).label,exact:false}).click();
  }
  await page.waitForFunction(()=>window.__invasion.world.progress===2);
  await page.locator('#stepAction').click();await page.locator('.option').first().waitFor();
  const fail=[0,2,6].includes(wave);
  const options=await page.locator('.option').allTextContents();
  const index=options.findIndex(t=>fail?!t.includes(challenges[wave].solution):t.includes(challenges[wave].solution));
  assert.ok(index>=0);await page.locator('.option').nth(index).click();await page.locator('#confirm').click();
  await page.locator('#activate').waitFor();
  if(fail){assert.equal(await page.locator('.option').count(),0);assert.match(await page.locator('#activate').innerText(),/akibat/);}
  if(wave===2){
   await page.screenshot({path:'artifacts/story/consequence.png'});
   await page.reload();await ready();await page.locator('#resume').click();await page.locator('#activate').waitFor();
   assert.equal(await page.evaluate(()=>window.__invasion.world.failures[2]),true);
  }
  await page.locator('#activate').click();
  assert.equal(await page.evaluate(()=>window.__invasion.world.escaping),![1,3].includes(wave));
  if(wave===0)assert.equal(await page.evaluate(()=>window.__invasion.world.hunters.length),4);
  if(wave===2){
   await page.keyboard.press('Space');await page.waitForTimeout(1500);assert.equal(await page.locator('#pulse').isDisabled(),true);
   await page.locator('#pause').click();const x=await page.evaluate(()=>window.__invasion.world.hunters[0].x);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.__invasion.world.hunters[0].x),x);await page.locator('#closeModal').click();
  }
  if(wave===7){assert.equal(await page.evaluate(()=>window.__invasion.world.bossNodes.length),3);await page.screenshot({path:'artifacts/story/finale.png'});}
  await leave(wave);
 }
 await page.waitForFunction(()=>document.querySelector('#resultScore').textContent==='62,5 / 100');
 assert.equal(await page.locator('#resultTitle').innerText(),'SUARA KETIGA');
 await page.screenshot({path:'artifacts/story/ending-corrupted.png'});
 // Server-issued completed runs exercise both alternate finale paths and resume.
 for(const plan of ['cut','broadcast']){
  await page.evaluate(async ({codes,plan})=>{
   const post=async(action,body)=>(await fetch('/api/run/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})).json();
   let run=await post('start',{mode:'story'});
   for(const code of codes){const q=await post('question',{token:run.token});run=await post('submit',{token:run.token,choice:q.choices.find(c=>c.code===code).id});}
   localStorage.setItem('dead-signal-story-v2',JSON.stringify({token:run.token,room:7,progress:2,repaired:true,finished:false,opening:'noah',identity:{name:'Finale QA',student:'QA'},history:[],finalPlan:plan}));
  },{codes:challenges.map(c=>c.solution),plan});
  await page.reload();await ready();await page.locator('#resume').click();await page.locator('#play').waitFor();
  assert.equal(await page.evaluate(()=>window.__invasion.world.bossNodes.length),plan==='cut'?2:3);
  if(plan==='broadcast')await page.setViewportSize({width:390,height:844});
  await leave(7);
  await page.waitForFunction(()=>document.querySelector('#resultScore').textContent==='100 / 100');
  assert.equal(await page.locator('#resultTitle').innerText(),plan==='cut'?'KOTA TANPA SUARA':'PAGI PERTAMA');
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: eight missions, wrong answers advance, persistent damage, cooldown/pursuit changes, quiet chapters, plot, three endings, mobile boss, signed score.');
}catch(e){await page.screenshot({path:'artifacts/story/failure.png'});console.log(await page.locator('body').innerText());throw e;}finally{await browser.close();}
