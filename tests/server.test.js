import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createBackend } from '../server/backend.js';
import { freshState, parseSave } from '../src/game.js';
const ADMIN = { username:'testadmin', password:'test-admin-only-123' };
const setup = options => createBackend({ databasePath:':memory:', bootstrapFile:false, initialAdmin:ADMIN, ...options });
async function request(app, path, method='GET', body, session, extra={}) {
  const req=Readable.from(body===undefined ? [] : [JSON.stringify(body)]);
  Object.assign(req,{url:path,method,socket:{remoteAddress:'test'},headers:{host:'localhost',origin:'http://localhost','content-type':'application/json',...(session?{cookie:session.cookie,'x-csrf-token':session.csrf}:{}),...extra}});
  const headers={};let result;
  const res={setHeader(k,v){headers[k.toLowerCase()]=v;},statusCode:200,end(text){result={status:this.statusCode,body:JSON.parse(text),headers}}};
  await app.handle(req,res);return result;
}
async function login(app, credentials=ADMIN) { const result=await request(app,'/api/auth/login','POST',credentials);assert.equal(result.status,200);return {cookie:result.headers['set-cookie'].split(';')[0],csrf:result.body.csrf,...result.body}; }
async function register(app, username) { const result=await request(app,'/api/auth/register','POST',{username,password:'player-pass-123',name:username,role:'admin'});assert.equal(result.status,200);return {cookie:result.headers['set-cookie'].split(';')[0],csrf:result.body.csrf,...result.body}; }

test('registration cannot grant admin and server enforces authentication, roles, CSRF and origin',async()=>{
 const app=setup();try{
  const guest=await request(app,'/api/admin/dashboard');assert.equal(guest.status,401);
  const player=await register(app,'playerone');assert.equal(player.user.role,'player');
  assert.equal((await request(app,'/api/admin/dashboard','GET',undefined,player)).status,403);
  const admin=await login(app);const target=`/api/admin/players/${player.user.id}`;
  assert.equal((await request(app,target,'PATCH',{revision:0,resources:{gold:9999}},admin,{'x-csrf-token':'wrong'})).status,403);
  assert.equal((await request(app,target,'PATCH',{revision:0,resources:{gold:9999}},admin,{origin:'https://other.example'})).status,403);
  const result=await request(app,target,'PATCH',{revision:0,role:'admin'},admin);assert.equal(result.status,400);
  assert.equal((await request(app,target,'GET',undefined,admin)).body.state.gold,1500);
  assert.match(admin.cookie,/nexus_session=/);
 }finally{app.close();}
});

test('admin edits create backups, stale player saves cannot overwrite them, and restore is audited',async()=>{
 const app=setup();try{
  const player=await register(app,'playeredit'),admin=await login(app),target=`/api/admin/players/${player.user.id}`;
  const edited=await request(app,target,'PATCH',{revision:0,resources:{gold:9000,gems:888,potions:8,shards:20}},admin);assert.equal(edited.status,200);assert.equal(edited.body.revision,1);
  const stale=await request(app,'/api/save','PUT',{revision:0,state:player.state},player);assert.equal(stale.status,409);
  const loaded=await request(app,'/api/save','GET',undefined,player);assert.equal(loaded.body.state.gold,9000);
  const backups=await request(app,target+'/backups','GET',undefined,admin);assert.equal(backups.body.backups.length,1);
  const restored=await request(app,target+'/restore','POST',{revision:1,backupId:backups.body.backups[0].id},admin);assert.equal(restored.body.state.gold,1500);assert.equal(restored.body.revision,2);
  const logs=await request(app,'/api/admin/dashboard','GET',undefined,admin);assert.equal(logs.body.audit.length,2);assert.equal(logs.body.audit[0].action,'Khôi phục tiến trình');
 }finally{app.close();}
});

test('banning and resetting a password revoke sessions and do not expose password data in audit or player details',async()=>{
 const app=setup();try{
  const player=await register(app,'playerban'),admin=await login(app),target=`/api/admin/players/${player.user.id}`;
  await request(app,target+'/status','POST',{status:'banned'},admin);
  assert.equal((await request(app,'/api/save','GET',undefined,player)).status,401);
  assert.equal((await request(app,'/api/auth/login','POST',{username:'playerban',password:'player-pass-123'})).status,401);
  await request(app,target+'/status','POST',{status:'active'},admin);
  const session=await login(app,{username:'playerban',password:'player-pass-123'});
  await request(app,target+'/password','POST',{password:'replacement-pass-123'},admin);
  assert.equal((await request(app,'/api/save','GET',undefined,session)).status,401);
  await login(app,{username:'playerban',password:'replacement-pass-123'});
  const dashboard=await request(app,'/api/admin/dashboard','GET',undefined,admin);
  assert(!JSON.stringify(dashboard.body).includes('replacement-pass-123'));
  assert(!JSON.stringify((await request(app,target,'GET',undefined,admin)).body).includes('password_hash'));
  assert.equal((await request(app,`/api/admin/players/${admin.user.id}/status`,'POST',{status:'banned'},admin)).status,400);
 }finally{app.close();}
});

test('independent players have separate saves and database state survives reopening',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'nexus-server-')),path=join(directory,'data.sqlite');let app=setup({databasePath:path});
 try{
  const a=await register(app,'playeralpha'),b=await register(app,'playerbeta');a.state.gold=4567;
  assert.equal((await request(app,'/api/save','PUT',{revision:0,state:a.state},a)).status,200);
  assert.equal((await request(app,'/api/save','GET',undefined,b)).body.state.gold,1500);
  app.close();app=setup({databasePath:path});
  const resumed=await login(app,{username:'playeralpha',password:'player-pass-123'});assert.equal(resumed.state.gold,4567);assert.equal(resumed.revision,1);
 }finally{app.close();rmSync(directory,{recursive:true,force:true});}
});

test('invalid saves and resource updates fail atomically; login throttling limits repeated guesses',async()=>{
 const app=setup();try{
  const player=await register(app,'playervalid'),admin=await login(app);const bad=structuredClone(player.state);bad.activeCharacter='missing';
  assert.equal((await request(app,'/api/save','PUT',{revision:0,state:bad},player)).status,400);
  assert.equal((await request(app,`/api/admin/players/${player.user.id}`,'PATCH',{revision:0,resources:{gold:6000,gems:-1}},admin)).status,400);
  assert.equal((await request(app,'/api/save','GET',undefined,player)).body.state.gold,1500);
  for(let i=0;i<5;i++)assert.equal((await request(app,'/api/auth/login','POST',{username:'unknownuser',password:'wrong-password'})).status,401);
  assert.equal((await request(app,'/api/auth/login','POST',{username:'unknownuser',password:'wrong-password'})).status,429);
 }finally{app.close();}
});

test('server save validation preserves the client daily snapshot instead of resetting it to server timezone',()=>{
 const state=freshState();state.daily.date='2001-01-01';state.daily.wins=3;
 const validated=parseSave(JSON.stringify(state),{refreshDay:false});assert.equal(validated.daily.date,'2001-01-01');assert.equal(validated.daily.wins,3);
});

test('changing a password rotates the current session and ends older sessions without changing saved progress',async()=>{
 const app=setup();try{
  const player=await register(app,'playerpass'),second=await login(app,{username:'playerpass',password:'player-pass-123'});
  const wrong=await request(app,'/api/auth/password','POST',{currentPassword:'incorrect-pass',password:'new-password-123'},player);assert.equal(wrong.status,400);
  assert.equal((await request(app,'/api/save','GET',undefined,second)).status,200);
  const result=await request(app,'/api/auth/password','POST',{currentPassword:'player-pass-123',password:'new-password-123'},player);assert.equal(result.status,200);assert.notEqual(result.body.csrf,player.csrf);
  assert.equal((await request(app,'/api/save','GET',undefined,player)).status,401);assert.equal((await request(app,'/api/save','GET',undefined,second)).status,401);
  const resumed=await login(app,{username:'playerpass',password:'new-password-123'});assert.equal(resumed.state.gold,1500);
 }finally{app.close();}
});

test('admin reset preserves the account identity, backs up progress and rejects backup IDs belonging to other players',async()=>{
 const app=setup();try{
  const player=await register(app,'playerreset'),other=await register(app,'playerother'),admin=await login(app),target=`/api/admin/players/${player.user.id}`;
  player.state.gold=9999;await request(app,'/api/save','PUT',{revision:0,state:player.state},player);
  const result=await request(app,target+'/reset','POST',{revision:1},admin);assert.equal(result.status,200);assert.equal(result.body.state.gold,1500);assert.equal(result.body.user.username,'playerreset');assert.equal(result.body.user.role,'player');
  const backups=await request(app,target+'/backups','GET',undefined,admin);assert.equal(backups.body.backups.length,1);
  assert.equal((await request(app,`/api/admin/players/${other.user.id}/restore`,'POST',{revision:0,backupId:backups.body.backups[0].id},admin)).status,404);
 }finally{app.close();}
});
