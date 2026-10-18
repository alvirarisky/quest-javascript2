import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {
const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto((process.env.BASE_URL||'http://127.0.0.1:5173')+'/?qa=1');await page.waitForFunction(()=>window.__deadSignal?.arena.player);await page.locator('#name').fill('Noah QA');await page.locator('#student').fill('NOAH-TEST');await page.locator('#chooseNoah').click();await page.locator('#start').click();await page.getByRole('button',{name:'Langsung ke cerita',exact:true}).click();await page.locator('#storySkip').click();
await page.waitForFunction(()=>document.querySelector('#playerName').textContent==='NOAH');assert.equal(await page.evaluate(()=>window.__deadSignal.arena.character),'noah');assert.match(await page.locator('#buddyState').innerText(),/ALLIE/);
const before=await page.evaluate(()=>window.__deadSignal.arena.player.x);await page.keyboard.down('d');await page.waitForTimeout(250);await page.keyboard.up('d');assert.ok(await page.evaluate(()=>window.__deadSignal.arena.player.x)>before);
await page.evaluate(()=>{const s=window.__deadSignal.arena;s.spawnTimer=999;s.buddyShot=999;s.addEnemy(0,{x:500,y:580});});await page.waitForTimeout(1100);
const aim=await page.evaluate(()=>{const s=window.__deadSignal.arena,r=s.game.canvas.getBoundingClientRect();return {x:r.x+(500-s.cameras.main.scrollX)*r.width/1200,y:r.y+(568-s.cameras.main.scrollY)*r.height/720};});await page.mouse.move(aim.x,aim.y);await page.mouse.down();await page.waitForFunction(()=>window.__deadSignal.arena.kills>=1,null,{timeout:5000});await page.mouse.up();
await page.screenshot({path:'artifacts/qa/10-noah-laptop.png'});assert.deepEqual(errors,[]);console.log('Noah smoke PASS: correct player/companion, keyboard movement, aiming and projectile collision at 1280x720.');
} finally {await browser.close();}
