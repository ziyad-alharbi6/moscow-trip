"use strict";
const API='https://jwjskcqyoxlmkwjstxhc.supabase.co/functions/v1/swift-action';
const $=id=>document.getElementById(id);
const days=Array.from({length:12},(_,i)=>{const d=new Date(Date.UTC(2027,0,7+i));return {value:d.toISOString().slice(0,10),label:new Intl.DateTimeFormat('ar-SA-u-ca-gregory',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(d)}});
for(const id of ['day','restaurantDay','expenseDate'])for(const day of days){const o=document.createElement('option');o.value=day.value;o.textContent=day.label;$(id).append(o)}
let activities=[],restaurants=[],expenses=[],votes=[],polls=[],pollBallots=[],expenseVisibility=[],myExpensesVisible=true,fxRate=0,fxUpdated="",sessionToken=localStorage.getItem('moscow_trip_session')||'',busy=false,polling=null;
let memberId=localStorage.getItem('moscow_member_id')||'';let memberToken=localStorage.getItem('moscow_member_token')||'',memberName=localStorage.getItem('moscow_member_name')||'';
let voterId=localStorage.getItem('moscow_trip_voter_id');if(!voterId){voterId=crypto.randomUUID();localStorage.setItem('moscow_trip_voter_id',voterId)}
$('travelerName').value=localStorage.getItem('moscow_trip_name')||'';
$('memberName').value=memberName;
$('expensePaidBy').value=memberName;
$('travelerName').oninput=()=>localStorage.setItem('moscow_trip_name',$('travelerName').value.trim().slice(0,40));
function status(message,error=false,login=false){const e=$(login?'loginStatus':'syncStatus');e.textContent=message;e.classList.toggle('error',error)}
function safeLink(raw){try{const u=new URL(raw);return ['https:','http:'].includes(u.protocol)?u.href:null}catch{return null}}
function mapUrl(a){return safeLink(a.location)||'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(a.name+' Moscow Russia')}
function transitUrl(a){let dest=a.name+' Moscow Russia';try{if(a.location){let u=new URL(a.location);if(u.searchParams.has('query'))dest=u.searchParams.get('query');else if(u.searchParams.has('q'))dest=u.searchParams.get('q');else dest=a.name+' Moscow Russia'}}catch{}return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(dest)+'&travelmode=transit'}
function makeLink(label,url){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=label;return a}
function button(label,cb,cls='secondary'){const b=document.createElement('button');b.type='button';b.textContent=label;b.className=cls;b.onclick=cb;return b}
async function call(action,data={}){const res=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:sessionToken,member_token:memberToken,action,data})});let body;try{body=await res.json()}catch{throw Error('تعذر قراءة رد الخادم')}if(!res.ok||!body.success){if(res.status===401&&action!=='login'){logout(true);throw Error('انتهت الجلسة')}throw Error(body.message||body.error||'تعذر إتمام العملية')}return body}
async function load(quiet=false){if(!sessionToken||busy)return;try{const result=await call('dashboard');activities=result.activities||[];restaurants=result.restaurants||[];expenses=result.expenses||[];votes=result.votes||[];polls=result.polls||[];pollBallots=result.poll_ballots||[];expenseVisibility=result.expense_visibility||[];myExpensesVisible=result.member_expenses_visible??true;render();if(!quiet)status('✅ تم تحديث بيانات المجموعة')}catch(e){if(!quiet)status('تعذر التحديث: '+e.message,true)}}
async function change(action,data){if(busy)return false;busy=true;try{await call(action,data);const result=await call('dashboard');activities=result.activities||[];restaurants=result.restaurants||[];expenses=result.expenses||[];votes=result.votes||[];polls=result.polls||[];pollBallots=result.poll_ballots||[];expenseVisibility=result.expense_visibility||[];myExpensesVisible=result.member_expenses_visible??true;render();status('✅ تم حفظ التغييرات للمجموعة');return true}catch(e){lastRequestError=e.message;status('خطأ: '+e.message,true);return false}finally{busy=false}}
function resetActivity(){$('activityForm').reset();$('editId').value='';$('cancel').classList.add('hidden');$('formTitle').textContent='إضافة فعالية'}
function resetRestaurant(){$('restaurantForm').reset();$('restaurantEditId').value='';$('restaurantCancel').classList.add('hidden');$('restaurantFormTitle').textContent='إضافة مطعم'}
let lastRequestError='';
function expenseMessage(message,error=false){const p=$('expenseStatus');p.textContent=message;p.classList.remove('hidden');p.classList.toggle('error',error);p.scrollIntoView({block:'nearest',behavior:'smooth'})}
function resetExpense(){$('expenseForm').reset();$('expensePaidBy').value=memberName;$('expenseEditId').value='';$('expenseCancel').classList.add('hidden');$('expenseFormTitle').textContent='تسجيل مصروف'}
function render(){renderActivities();renderRestaurants();renderVotes();renderExpenses();const total=activities.length,done=activities.filter(x=>x.done).length,percent=total?Math.round(done/total*100):0;$('totalCount').textContent=total;$('doneCount').textContent=done;$('progressLabel').textContent=percent+'%';$('progressBar').style.width=percent+'%'}
function renderActivities(){const date=$('day').value;$('dayTitle').textContent=days.find(d=>d.value===date)?.label||'';const box=$('items');box.replaceChildren();const today=activities.filter(a=>a.date===date).sort((a,b)=>a.time.localeCompare(b.time));const approved=restaurants.filter(r=>r.date===date&&r.decision==='approved');
$('empty').classList.toggle('hidden',today.length>0||approved.length>0);for(const a of today){const row=document.createElement('div');row.className='group';const head=document.createElement('div');head.className='group-head';const text=document.createElement('div');text.style.flex='1';const title=document.createElement('strong');title.textContent=a.name;title.className=a.done?'done':'';const meta=document.createElement('div');meta.className='small';meta.textContent=(a.time||'').slice(0,5)+(a.notes?' · '+a.notes:'');text.append(title,meta);const chk=document.createElement('input');chk.type='checkbox';chk.style.width='23px';chk.style.height='23px';chk.checked=!!a.done;chk.setAttribute('aria-label','تمت زيارة '+a.name);chk.onchange=async()=>{if(!await change('toggle',{id:a.id,done:chk.checked}))render()};head.append(chk,text);const links=document.createElement('div');links.className='group-actions';links.append(makeLink('📍 الموقع',mapUrl(a)),makeLink('🚇 المترو',transitUrl(a)),makeLink('🍽️ حلال قريب','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent('halal restaurant near '+a.name+' Moscow')));const actions=document.createElement('div');actions.className='actions';actions.append(button('تعديل',()=>{$('day').value=a.date;$('editId').value=a.id;$('name').value=a.name;$('time').value=a.time.slice(0,5);$('location').value=a.location||'';$('notes').value=a.notes||'';$('cancel').classList.remove('hidden');$('formTitle').textContent='تعديل الفعالية';$('name').focus()}),button('حذف',async()=>{if(confirm('حذف الفعالية؟'))await change('delete',{id:a.id})},'danger'));row.append(head,links,actions);box.append(row)} for(const r of approved){const row=document.createElement('div');row.className='row-card';const title=document.createElement('strong');title.textContent='🍽️ مطعم معتمد: '+r.name;const note=document.createElement('p');note.className='small';note.textContent=(r.notes||'')+' · اقترحه: '+(r.proposed_by||'غير معروف');row.append(title,note,makeLink('📍 موقع المطعم',mapUrl(r)));box.append(row)}}
function renderRestaurants(){const box=$('restaurantItems');box.replaceChildren();const filtered=restaurants.filter(x=>x.date===$('restaurantDay').value);if(!filtered.length){const p=document.createElement('p');p.className='small';p.textContent='لا توجد مطاعم محفوظة لهذا اليوم.';box.append(p)}for(const r of filtered){const card=document.createElement('div');card.className='row-card';const title=document.createElement('strong');title.textContent=r.name;const note=document.createElement('p');note.className='small';note.textContent=r.notes||'';const links=document.createElement('div');links.className='group-actions';links.append(makeLink('📍 الموقع',mapUrl(r)));const act=document.createElement('div');act.className='actions';act.append(button('تعديل',()=>{$('restaurantEditId').value=r.id;$('restaurantDay').value=r.date;$('restaurantName').value=r.name;$('restaurantProposer').value=r.proposed_by||'';$('restaurantLocation').value=r.location||'';$('restaurantNotes').value=r.notes||'';$('restaurantCancel').classList.remove('hidden');$('restaurantFormTitle').textContent='تعديل المطعم';$('restaurantName').focus()}),button('حذف',async()=>{if(confirm('حذف المطعم؟'))await change('restaurant_delete',{id:r.id})},'danger'));const st=document.createElement('p');st.className='small';st.textContent='اقترحه: '+(r.proposed_by||'غير معروف')+' · '+(r.decision==='approved'?'✅ معتمد':r.decision==='rejected'?'❌ مستبعد':'⏳ اقتراح');
act.append(button('✅ اعتماد',async()=>await change('restaurant_decision',{id:r.id,decision:'approved'})),button('↩️ اقتراح',async()=>await change('restaurant_decision',{id:r.id,decision:'proposed'})));
card.append(title,st,note,links,act);box.append(card)}}
function renderVotes(){
 const box=$('pollItems');box.replaceChildren();
 const list=[...polls].sort((a,b)=>b.created_at.localeCompare(a.created_at));
 for(const poll of list){
  const ballot=pollBallots.filter(v=>v.poll_id===poll.id);
  const yes=ballot.filter(v=>v.choice==='yes').length;
  const no=ballot.filter(v=>v.choice==='no').length;
  const mine=ballot.find(v=>v.voter_id===voterId)?.choice||null;
  const row=document.createElement('div');row.className='row-card';
  const name=document.createElement('strong');name.textContent=poll.title;
  const desc=document.createElement('p');desc.className='small';desc.textContent=poll.description||'';
  const info=document.createElement('p');info.className='small';info.textContent='👍 موافق: '+yes+' | 👎 غير موافق: '+no+' | الإجمالي: '+ballot.length+' صوت';
  const controls=document.createElement('div');controls.className='actions';
  for(const [choice,label] of [['yes',mine==='yes'?'✓ موافق':'👍 موافق'],['no',mine==='no'?'✓ غير موافق':'👎 غير موافق']]){
   controls.append(button(label,async()=>{await change('poll_vote',{poll_id:poll.id,voter_id:voterId,voter_name:$('travelerName').value.trim().slice(0,40)||'مسافر',choice})},mine===choice?'secondary':''));
  }
  if(mine)controls.append(button('سحب صوتي',async()=>{await change('poll_vote',{poll_id:poll.id,voter_id:voterId,choice:null})},'secondary'));
  const del=button('🗑️ حذف التصويت للجميع',async()=>{if(confirm('هل تريد حذف هذا التصويت وكل أصواته من جميع الأجهزة؟'))await change('poll_delete',{id:poll.id})},'danger');
  row.append(name,desc,info,controls,del);box.append(row);
 }
 if(!list.length)box.textContent='ما فيه تصويتات. أضف أول تصويت من النموذج بالأعلى.';
}
$('pollForm').onsubmit=async(e)=>{
 e.preventDefault();const save=$('pollSave');save.disabled=true;$('pollStatus').textContent='جاري الإضافة…';
 try{const ok=await change('poll_add',{title:$('pollTitle').value.trim(),description:$('pollDescription').value.trim()});
 if(ok){$('pollForm').reset();$('pollStatus').textContent='✅ تم إضافة التصويت للجميع'}else $('pollStatus').textContent='تعذر إضافة التصويت: '+(lastRequestError||'خطأ غير معروف');
 }finally{save.disabled=false}
};

function rubles(value){return Number(value||0).toLocaleString('ar-SA',{maximumFractionDigits:2})+' ₽'}
function sar(n){return Number(n||0).toLocaleString('ar-SA',{maximumFractionDigits:2})+' ر.س'}
function rub(n){return rubles(n)}
function money(n){return rub(n)+' ≈ '+(fxRate?sar(n*fxRate):'— ر.س')}
function personKey(s){return String(s||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('ar')}
function renderExpenses(){
 $('myExpenseVisibility').textContent=myExpensesVisible?'🔒 إخفاء جميع مصاريفي عن الجميع':'🌐 إظهار جميع مصاريفي للجميع';
 const box=$('expenseItems');box.replaceChildren();
 const groups=new Map();for(const e of expenses){const key=personKey(e.paid_by);if(!groups.has(key))groups.set(key,{name:e.paid_by,total:0,items:[]});const g=groups.get(key);g.total+=Number(e.amount);g.items.push(e)}
 const visibleSum=expenses.filter(e=>e.is_public).reduce((n,e)=>n+Number(e.amount),0);
 $('expenseSummary').textContent='إجمالي المصاريف المعلنة للمجموعة: '+money(visibleSum);
 const people=$('expensePeople');people.replaceChildren();const names=$('expenseNames');names.replaceChildren();
 for(const [key,g] of groups){const card=document.createElement('div');card.className='expense-person';const pub=g.items.filter(x=>x.is_public).reduce((n,x)=>n+Number(x.amount),0);const mine=g.items.filter(x=>x.owner_id && x.owner_id===memberIdFromExpenses());
 const title=document.createElement('strong');title.textContent='👤 '+g.name;
 const value=document.createElement('b');value.textContent=money(pub)+(mine.some(x=>!x.is_public)?' · لديك مصاريف خاصة':'');card.append(title,value);
 const note=document.createElement('div');note.className='small';note.textContent='المجموع المعلن فقط؛ المخفي لا يظهر للآخرين';card.append(note);people.append(card);
 const option=document.createElement('option');option.value=g.name;names.append(option)}
 if(!groups.size)people.textContent='لا توجد مصاريف ظاهرة في المجموعة حاليًا.';
 for(const e of [...expenses].sort((a,b)=>b.date.localeCompare(a.date))){const card=document.createElement('div');card.className='row-card';
 const title=document.createElement('strong');title.textContent=e.title+' · '+money(e.amount);const info=document.createElement('p');info.className='small';info.textContent=e.date+' · دفع: '+e.paid_by+(e.is_public?' · 🌐 ظاهر للجميع':' · 🔒 خاص بي');card.append(title,info);
 if(e.owner_id && e.owner_id===memberIdFromExpenses()){
 const actions=document.createElement('div');actions.className='actions';actions.append(button(e.is_public?'🔒 إخفاء مصروفي عن الجميع':'🌐 إظهار مصروفي للجميع',async()=>{const ok=await change('expense_privacy',{id:e.id,is_public:!e.is_public});expenseMessage(ok?'✅ تم تغيير الخصوصية':'خطأ: '+lastRequestError,!ok)}));
 actions.append(button('تعديل',()=>{$('expenseEditId').value=e.id;$('expenseTitle').value=e.title;$('expenseAmount').value=e.amount;$('expenseCurrency').value='RUB';$('expenseDate').value=e.date;$('expenseCancel').classList.remove('hidden');$('expenseFormTitle').textContent='تعديل المصروف';expensePreview()}));
 actions.append(button('حذف',async()=>{if(confirm('حذف المصروف؟'))await change('expense_delete',{id:e.id})},'danger'));card.append(actions)}
 box.append(card)}
 if(!expenses.length)box.textContent='لا توجد مصاريف ظاهرة لك.';
 expensePreview();
}
function memberIdFromExpenses(){return memberId||null}
function expensePreview(){const amount=Number($('expenseAmount').value);let text='اكتب المبلغ لعرض قيمته بالعملتين';if(amount>0&&fxRate){const rubAmount=$('expenseCurrency').value==='SAR'?amount/fxRate:amount;text='قيمة المصروف: '+money(rubAmount)}else if(amount>0)text='سعر الصرف غير متوفر: أدخل سعرًا يدويًا أعلى الصفحة';$('expensePreview').textContent=text}
function applyRate(rate,source){if(!Number.isFinite(rate)||rate<=0)return;fxRate=rate;fxUpdated=source;$('fxInfo').textContent='1 ₽ = '+rate.toFixed(6)+' ر.س · '+source+' · قد يختلف سعر البنك';renderExpenses();convertFromRub()}
async function getRate(){try{const r=await fetch('https://open.er-api.com/v6/latest/RUB',{cache:'no-store'});if(!r.ok)throw Error('http '+r.status);const d=await r.json();if(d.result!=='success'||!(d.rates?.SAR>0))throw Error('missing rate');applyRate(d.rates.SAR,'تحديث '+(d.time_last_update_utc||'حديث'));}catch{const stored=Number(localStorage.getItem('moscow_trip_rate'));if(stored>0)applyRate(stored,'قيمة محفوظة على هذا الجهاز');else $('fxInfo').textContent='تعذر جلب السعر تلقائيًا. ضع سعر 1 روبل بالريال في الخانة اليدوية.'}}
function convertFromRub(){if(fxRate&&$('fxRub').value!=='')$('fxSar').value=(Number($('fxRub').value)*fxRate).toFixed(2)}
$('fxRub').oninput=()=>{$('fxSar').value=fxRate&&$('fxRub').value!==''?(Number($('fxRub').value)*fxRate).toFixed(2):''};
$('fxSar').oninput=()=>{$('fxRub').value=fxRate&&$('fxSar').value!==''?(Number($('fxSar').value)/fxRate).toFixed(2):''};
$('manualRate').onchange=()=>{const v=Number($('manualRate').value);if(v>0&&v<10){localStorage.setItem('moscow_trip_rate',String(v));applyRate(v,'سعر يدوي')}else expenseMessage('اكتب سعر صرف موجبًا وصحيحًا',true)};
$('expenseAmount').oninput=expensePreview;$('expenseCurrency').onchange=expensePreview;
function logout(message=false){sessionToken='';localStorage.removeItem('moscow_trip_session');activities=[];restaurants=[];expenses=[];votes=[];clearInterval(polling);polling=null;$('appPanel').classList.add('hidden');$('loginPanel').classList.remove('hidden');status(message?'انتهت الجلسة. سجّل الدخول مرة ثانية.':'',false,true)}
$('loginForm').onsubmit=async(e)=>{e.preventDefault();$('loginButton').disabled=true;status('جاري التحقق...',false,true);try{const res=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'login',code:$('accessCode').value})});const body=await res.json();if(!res.ok||!body.success||!body.token)throw Error(body.message||body.error||'رمز خاطئ');sessionToken=body.token;localStorage.setItem('moscow_trip_session',sessionToken);$('accessCode').value='';await enter()}catch(e){status('تعذر الدخول: '+e.message,true,true)}finally{$('loginButton').disabled=false}};
async function enter(){const result=await call('dashboard');activities=result.activities||[];restaurants=result.restaurants||[];expenses=result.expenses||[];votes=result.votes||[];polls=result.polls||[];pollBallots=result.poll_ballots||[];expenseVisibility=result.expense_visibility||[];myExpensesVisible=result.member_expenses_visible??true;$('loginPanel').classList.add('hidden');$('appPanel').classList.remove('hidden');render();status('✅ متصل بجدول الرحلة');clearInterval(polling);polling=setInterval(()=>{if(!document.hidden&&!busy)load(true)},15000)}
async function restore(){if(!sessionToken)return;status('استعادة الجلسة...',false,true);try{await enter()}catch(e){if(sessionToken)status('تعذر الاتصال: '+e.message,true,true)}}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('hidden',x.id!=='tab-'+b.dataset.tab))});
$('day').onchange=()=>{resetActivity();renderActivities()};$('restaurantDay').onchange=renderRestaurants;$('cancel').onclick=resetActivity;$('restaurantCancel').onclick=resetRestaurant;$('expenseCancel').onclick=resetExpense;$('refresh').onclick=()=>load();$('logout').onclick=()=>logout();
$('activityForm').onsubmit=async(e)=>{e.preventDefault();const id=$('editId').value;const data={date:$('day').value,name:$('name').value.trim(),time:$('time').value,location:$('location').value.trim(),notes:$('notes').value.trim()};if(await change(id?'update':'add',id?{id,...data}:data))resetActivity()};
$('restaurantForm').onsubmit=async(e)=>{e.preventDefault();const id=$('restaurantEditId').value;const data={date:$('restaurantDay').value,name:$('restaurantName').value.trim(),location:$('restaurantLocation').value.trim(),notes:$('restaurantNotes').value.trim(),proposed_by:$('restaurantProposer').value.trim()||$('travelerName').value.trim()};if(await change(id?'restaurant_update':'restaurant_add',id?{id,...data}:data))resetRestaurant()};
async function memberAuth(action){const name=$('memberName').value.trim(),pin=$('memberPin').value;const status=$('memberStatus');if(name.length<2||pin.length<8){status.textContent='اكتب اسمًا وكلمة مرور من 8 أحرف على الأقل';return}status.textContent='جاري التحقق…';try{const r=await call(action,{name,pin});memberToken=r.member_token;memberName=r.member_name;memberId=r.member_id;localStorage.setItem('moscow_member_token',memberToken);localStorage.setItem('moscow_member_name',memberName);localStorage.setItem('moscow_member_id',memberId);$('expensePaidBy').value=memberName;$('memberPin').value='';status.textContent='✅ حساب المصاريف: '+memberName;await load()}catch(e){status.textContent='خطأ: '+e.message}}
$('myExpenseVisibility').onclick=async()=>{if(!memberToken){expenseMessage('سجل دخول حساب مصاريفك أولاً',true);return}const ok=await change('member_visibility',{visible:!myExpensesVisible});expenseMessage(ok?'✅ تم تغيير خصوصية جميع مصاريفك':'خطأ: '+lastRequestError,!ok)};
$('memberRegister').onclick=()=>memberAuth('member_register');$('memberLogin').onclick=()=>memberAuth('member_login');$('memberLogout').onclick=()=>{memberToken='';memberName='';memberId='';for(const x of ['moscow_member_token','moscow_member_name','moscow_member_id'])localStorage.removeItem(x);$('expensePaidBy').value='';$('memberStatus').textContent='تم تسجيل الخروج من حساب المصاريف';load()};
if(memberName)$('memberStatus').textContent='✅ حساب المصاريف: '+memberName;
$('expenseForm').onsubmit=async(e)=>{e.preventDefault();const buttonSave=$('expenseSave');if(buttonSave.disabled)return;if(!memberToken){expenseMessage('سجّل دخول حساب مصاريفك الشخصي أولًا',true);return}const id=$('expenseEditId').value;const amount=Number($('expenseAmount').value);if($('expenseCurrency').value==='SAR'&&!fxRate){expenseMessage('ما نقدر نحول الريال بدون سعر صرف. انتظر التحديث أو أدخل سعر صرف يدويًا.',true);return}const rubAmount=$('expenseCurrency').value==='SAR'?Math.round(amount/fxRate*100)/100:amount;const data={date:$('expenseDate').value,title:$('expenseTitle').value.trim(),amount:rubAmount,paid_by:$('expensePaidBy').value.trim().replace(/\s+/g,' '),split_count:6};buttonSave.disabled=true;buttonSave.textContent='جاري الحفظ…';expenseMessage('جاري حفظ المصروف…');try{const ok=await change(id?'expense_update':'expense_add',id?{id,...data}:data);if(ok){resetExpense();expenseMessage('✅ تم حفظ المصروف وظهر في إجمالي المجموعة')}else expenseMessage('تعذر حفظ المصروف: '+(lastRequestError||'حاول مرة ثانية'),true)}finally{buttonSave.disabled=false;buttonSave.textContent='حفظ المصروف'}};
getRate();restore();
