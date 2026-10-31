import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";

for(const path of ["index.html","public/index.html","NcheNne_Interactive_Demo.html"]){
 test("browser inline modules parse as JavaScript: "+path,()=>{
  const html=readFileSync(new URL("../"+path,import.meta.url),"utf8");
  const scripts=[...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length>=1,"Missing runnable browser simulation");
  for(const [,source] of scripts){
   const check=spawnSync(process.execPath,["--input-type=module","--check"],{
    input:source,encoding:"utf8",timeout:5000
   });
   assert.equal(check.status,0,check.stderr||"Invalid inline script");
  }
 });
}
test("self-contained demo has no external scripts, styles or worker dependency",()=>{
 const html=readFileSync(new URL("../NcheNne_Interactive_Demo.html",import.meta.url),"utf8");
 assert.equal((html.match(/<script type="module">/g)||[]).length,1);
 assert.doesNotMatch(html,/<script[^>]+src=|<link[^>]+href="https?:|from\s+['"]\.\//i);
 assert.match(html,/if\('serviceWorker' in navigator && location\.protocol==='https:'\)/);
});
