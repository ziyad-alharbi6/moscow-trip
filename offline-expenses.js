"use strict";
/* Offline expense draft queue. Stored per browser, not accessible across devices until synced. */
(()=>{
 const KEY='moscow_pending_expenses_v1';
 const form=document.getElementById('expenseForm');
 const marker=document.createElement('div');marker.id='offlineExpenseQueue';marker.className='conversion-box';marker.setAttribute('aria-live','polite');
 form.parentNode.insertBefore(marker,form);
 const btn=document.createElement('button');btn.type='button';btn.className='secondary';btn.textContent='🔄 مزامنة المصاريف المعلقة';marker.append(btn);
 const msg=document.createElement('p');msg.style.margin='6px 0 0';marker.append(msg);
 let syncing=false;
 function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open('moscow_offline_expenses',1);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains('pending'))db.createObjectStore('pending',{keyPath:'client_id'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});}
 async function tx(mode,fn){const db=await openDB();return new Promise((resolve,reject)=>{const t=db.transaction('pending',mode);const store=t.objectStore('pending');const req=fn(store);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);t.oncomplete=()=>db.close();t.onerror=()=>reject(t.error)})}
 const all=()=>tx('readonly',s=>s.getAll());const put=x=>tx('readwrite',s=>s.put(x));const del=id=>tx('readwrite',s=>s.delete(id));
 async function render(){try{const entries=await all();msg.textContent=`${entries.length} مصروف بانتظار المزامنة${!navigator.onLine?' · الجوال بدون إنترنت':''}`;marker.style.display=entries.length?'block':'block';}catch(e){msg.textContent='تعذر حفظ المصاريف محليًا في هذا المتصفح: '+e.message}}
 async function sync(){if(syncing||!navigator.onLine||!sessionToken||!memberToken)return;syncing=true;try{for(const item of await all()){
   // Never send a pending private expense using another member's account.
   if(item.owner_id!==memberId)continue;
   try{await call('expense_add',item.data);await del(item.client_id)}catch(e){msg.textContent='تعذرت المزامنة: '+e.message;break}
  }await render();try{await load(true)}catch{}}
  finally{syncing=false;}
 }
 btn.onclick=sync;
 window.addEventListener('online',()=>sync());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
 setInterval(()=>{if(!document.hidden)sync()},20000);
 form.addEventListener('submit',async e=>{
  if(document.getElementById('expenseEditId').value)return; // Normal online edit route
  e.preventDefault();e.stopImmediatePropagation();
  if(!memberToken||!memberId){expenseMessage('سجل دخول حساب مصاريفك أولًا وأنت متصل بالإنترنت',true);return}
  const title=document.getElementById('expenseTitle').value.trim(),amount=Number(document.getElementById('expenseAmount').value),currency=document.getElementById('expenseCurrency').value,date=document.getElementById('expenseDate').value;
  if(!title||!(amount>0)){expenseMessage('اكتب وصفًا ومبلغًا صحيحًا',true);return}
  if(currency==='SAR'&&!(fxRate>0)){expenseMessage('حدد سعر صرف محفوظًا أولًا لاستخدام الريال بدون إنترنت',true);return}
  const rubAmount=currency==='SAR'?Math.round(amount/fxRate*100)/100:amount;
  const client_id=crypto.randomUUID();
  const data={date,title,amount:rubAmount,paid_by:memberName,split_count:6,client_id};
  try{await put({client_id,owner_id:memberId,data,created_at:new Date().toISOString()});resetExpense();expenseMessage('✅ حُفظ المصروف على هذا الجهاز. ستتم المزامنة عند توفر الإنترنت.');await render();if(navigator.onLine)await sync();}catch(err){expenseMessage('لم يتم حفظ المصروف محليًا: '+err.message,true)}
 },true);
 render();
})();
