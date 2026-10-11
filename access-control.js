'use strict';
const crypto=require('node:crypto');
const wrap=fn=>(q,s,n)=>Promise.resolve(fn(q,s,n)).catch(n);
module.exports=function installAccess(app,{firestore,env=process.env,auth:injectedAuth}){
 let auth=injectedAuth;
 function getAuth(){if(!auth){const {getApps,initializeApp,applicationDefault}=require('firebase-admin/app');const {getAuth}=require('firebase-admin/auth');auth=getAuth(getApps()[0]||initializeApp({credential:applicationDefault(),projectId:env.PROJECT_ID||env.GOOGLE_CLOUD_PROJECT}))}return auth}
 const users=firestore.collection('top_access_users'),verified=new Map();
 const roles=new Set(['pending','reader','writer','admin','disabled']);
 const failure=(s,code,error)=>s.status(code).json({ok:false,error});
 app.get('/api/auth/config',(q,s)=>{s.set('Cache-Control','no-store');if(!env.DF_FIREBASE_WEB_API_KEY)return failure(s,503,'Sign-in setup is not complete. Contact the administrator.');s.json({ok:true,apiKey:env.DF_FIREBASE_WEB_API_KEY,projectId:env.PROJECT_ID||env.GOOGLE_CLOUD_PROJECT})});
 async function identify(q,s,n){
  const token=(q.get('Authorization')||'').match(/^Bearer ([^\s]+)$/)?.[1];if(!token||token.length>10000)return failure(s,401,'Sign in to continue.');
  try{const hash=crypto.createHash('sha256').update(token).digest('hex');let cached=verified.get(hash),claims;if(cached&&cached.until>Date.now())claims=cached.claims;else{claims=await getAuth().verifyIdToken(token,true);if(verified.size>500)verified.clear();verified.set(hash,{claims,until:Math.min(Date.now()+30000,claims.exp*1000)})}
   if(!claims.email_verified)return failure(s,403,'Verify your email address before continuing.');
   const ref=users.doc(claims.uid);let doc=await ref.get();
   if(!doc.exists){const role=env.DF_BOOTSTRAP_ADMIN_EMAIL&&claims.email?.toLowerCase()===env.DF_BOOTSTRAP_ADMIN_EMAIL.toLowerCase()?'admin':'pending';const user={uid:claims.uid,email:claims.email||'',name:String(claims.name||claims.email?.split('@')[0]||'User').slice(0,80),role,createdAt:Date.now()};await firestore.runTransaction(async tx=>{const current=await tx.get(ref);if(!current.exists){tx.set(ref,user);require('./punch-notifications').registrationEvent(tx,firestore,user)}});doc=await ref.get()}
   q.user=doc.data();q.user.uid=claims.uid;if(!roles.has(q.user.role)||q.user.role==='disabled')return failure(s,403,'Account access is disabled.');n();
  }catch(e){if(String(e.code||'').startsWith('auth/'))return failure(s,401,'Session expired. Please sign in again.');return failure(s,503,'Account verification is temporarily unavailable.')}
 }
 app.use((q,s,n)=>{if(q.path==='/health'||q.method==='OPTIONS')return n();if(!q.path.startsWith('/api/')&&q.path!=='/ocr')return n();s.set('Cache-Control','no-store');
  // Only explicitly listed machine imports may use the existing integration key.
  const machine=q.method==='POST'&&['/api/punch/import','/api/cables/import','/api/index/pdf'].includes(q.path);
  if(machine&&env.DF_ACCESS_KEY){const a=Buffer.from(q.get('X-DF-Key')||''),b=Buffer.from(env.DF_ACCESS_KEY);if(a.length===b.length&&crypto.timingSafeEqual(a,b)){q.machine=true;return n()}}
  identify(q,s,()=>{if(q.path==='/api/session')return n();if(!['reader','writer','admin'].includes(q.user.role))return failure(s,403,'Your account is awaiting administrator approval.');
   const personal=q.method==='POST'&&['/api/notifications/read','/api/notifications/seen','/api/punch-follow','/api/profile/preferences'].includes(q.path);const read=personal||q.method==='GET'||q.method==='HEAD'||q.method==='POST'&&['/api/public/search-batch','/api/public/drawing-highlight'].includes(q.path);const comment=q.method==='POST'&&['/api/punch-comments','/api/punch-photos'].includes(q.path);
   if(!read&&!comment&&q.user.role!=='admin')return failure(s,403,'Administrator permission is required.');if(comment&&!['writer','admin'].includes(q.user.role))return failure(s,403,'Write permission is required to add comments.');n()});
 });
 app.get('/api/session',(q,s)=>s.json({ok:true,user:q.user}));
 app.post('/api/profile/preferences',wrap(async(q,s)=>{const preferences=require('./user-preferences').validate(q.body?.preferences);await users.doc(q.user.uid).set({preferences,preferencesUpdatedAt:Date.now()},{merge:true});s.json({ok:true,preferences})}));
 app.get('/api/admin/users',wrap(async(q,s)=>{if(q.user?.role!=='admin')return failure(s,403,'Administrator permission is required.');let query=users.orderBy('__name__').limit(100);if(q.query.after){const cursor=await users.doc(String(q.query.after)).get();if(cursor.exists)query=query.startAfter(cursor)}const page=await query.get();s.json({ok:true,users:page.docs.map(d=>d.data()),next:page.docs.length===100?page.docs.at(-1).id:null})}));
 app.post('/api/admin/users/role',wrap(async(q,s)=>{if(q.user?.role!=='admin')return failure(s,403,'Administrator permission is required.');const {uid,role}=q.body||{};if(typeof uid!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(uid)||!roles.has(role)||uid===q.user.uid)return failure(s,400,'Choose another user and a valid role.');const ref=users.doc(uid);await firestore.runTransaction(async tx=>{const doc=await tx.get(ref);if(!doc.exists){const e=new Error('User not found');e.status=404;throw e}tx.update(ref,{role,updatedAt:Date.now(),updatedBy:q.user.uid});tx.set(firestore.collection('top_access_audit').doc(crypto.randomUUID()),{uid,from:doc.data().role,to:role,actor:q.user.uid,at:Date.now()})});s.json({ok:true})}));
 return {identify};
};
