(function(root){
  'use strict';
  const DAY=86400000;
  function iso(d){return new Date(d).toISOString().slice(0,10);}
  function timestamp(s){return Date.parse(s+'T00:00:00Z');}
  function validDate(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(timestamp(s))&&iso(timestamp(s))===s;}
  function daysBetween(a,b){return Math.round((timestamp(b)-timestamp(a))/DAY);}
  function addDays(date,count){return iso(timestamp(date)+count*DAY);}
  function addMonths(date,count,anchorDay){const d=new Date(timestamp(date));const day=anchorDay||d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+count);const max=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,max));return iso(d);}
  function nextPayday(today,day){const d=new Date(timestamp(today));const first=iso(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1));let result=addMonths(first,0,day);if(result<=today)result=addMonths(first,1,day);return result;}
  function occurrences(subscriptions,today,end){const out=[];for(const s of subscriptions){if(!s.active)continue;let date=s.nextDate;for(let i=0;i<120&&date<=end;i++){out.push({id:s.id,name:s.name,kind:s.kind,amount:s.amount,date,effectiveDate:date<today?today:date,overdue:date<today,account:s.account});date=addMonths(date,s.cycle==='yearly'?12:1,s.anchorDay);}}return out.sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name));}
  function monthlyCost(subscriptions){return subscriptions.filter(s=>s.active).reduce((sum,s)=>sum+s.amount/(s.cycle==='yearly'?12:1),0);}
  function dailyEstimate(transactions,subscriptions,today){const recurring=new Set(subscriptions.map(s=>s.name.toLowerCase().trim()));const eligible=transactions.filter(t=>t.date<=today&&t.date>=addDays(today,-89));if(!eligible.length)return 0;const oldest=eligible.reduce((v,t)=>t.date<v?t.date:v,today);const days=Math.max(1,daysBetween(oldest,today)+1);return eligible.filter(t=>t.type==='expense'&&!t.subscriptionId&&!recurring.has(t.merchant.toLowerCase().trim())).reduce((sum,t)=>sum+t.amount,0)/days;}
  function forecast({today,paydayDay,balance,reserve=0,daily,subscriptions}){
    const payday=nextPayday(today,paydayDay),end=addDays(payday,-1),scheduled=occurrences(subscriptions,today,end),days=daysBetween(today,payday),available=balance-reserve;
    let running=available;const points=[];for(let i=0;i<days;i++){const date=addDays(today,i),bills=scheduled.filter(s=>s.effectiveDate===date).reduce((sum,s)=>sum+s.amount,0);running=Math.round((running-daily-bills)*100)/100;points.push({date,balance:running,bills,daily});}
    const bills=scheduled.reduce((sum,s)=>sum+s.amount,0);return {payday,days,available,bills,daily,points,endBalance:running,shortfall:points.find(p=>p.balance<0)?.date||null,safeDaily:Math.max(0,(available-bills)/days)};
  }
  function goalProjection(goal,today){if(goal.saved>=goal.target)return {months:0,date:today};if(!Number.isFinite(goal.monthly)||goal.monthly<=0)return {months:null,date:null};const months=Math.ceil((goal.target-goal.saved)/goal.monthly);return {months,date:months>1200?null:addMonths(today,months)};}
  function allocation(amount,needsPct,savingsPct){const needs=Math.round(amount*needsPct)/100,savings=Math.round(amount*savingsPct)/100;return {needs,savings,wants:Math.round((amount-needs-savings)*100)/100};}
  function achievements({goals,transactions,month}){
    const saved=goals.reduce((sum,g)=>sum+g.saved,0),tx=transactions.filter(t=>t.date.startsWith(month));const income=tx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0),expense=tx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0),surplus=income-expense;
    const badges=[{id:'first',title:'Первый запас',threshold:10000,xp:50,tier:'bronze',symbol:'✦'},{id:'steady',title:'Уверенный старт',threshold:50000,xp:100,tier:'bronze',symbol:'◈'},{id:'keeper',title:'Хранитель сотни',threshold:100000,xp:150,tier:'silver',symbol:'⬡'},{id:'half',title:'Полмиллиона спокойствия',threshold:500000,xp:250,tier:'silver',symbol:'♜'},{id:'million',title:'Миллион в запасе',threshold:1000000,xp:400,tier:'gold',symbol:'♛'},{id:'five',title:'Крепость капитала',threshold:5000000,xp:700,tier:'legendary',symbol:'✹'}].map(b=>({...b,earned:saved>=b.threshold,progress:Math.min(1,saved/b.threshold),current:saved,description:'Накопить по целям '+b.threshold.toLocaleString('ru')+' ₸'}));
    badges.push({id:'literacy',title:'Финансовая грамотность',xp:200,tier:'gold',symbol:'✧',earned:income>0&&surplus>expense,progress:income>0?Math.min(1,Math.max(0,surplus)/Math.max(1,expense+1)):0,description:'Остаток доходов за текущий месяц больше расходов: доходы − расходы > расходы'});
    badges.push({id:'goal',title:'Мечта стала планом',xp:150,tier:'silver',symbol:'◎',earned:goals.some(g=>g.saved>=g.target),progress:goals.length?Math.min(1,Math.max(...goals.map(g=>g.saved/g.target))):0,description:'Достичь хотя бы одной финансовой цели'});
    const xp=badges.filter(b=>b.earned).reduce((sum,b)=>sum+b.xp,0),levels=[{min:0,name:'Новичок'},{min:150,name:'Исследователь'},{min:400,name:'Стратег'},{min:800,name:'Хранитель капитала'},{min:1400,name:'Мастер привычек'},{min:2000,name:'Легенда Cashual'}];const level=levels.filter(l=>xp>=l.min).at(-1),nextLevel=levels.find(l=>xp<l.min);
    return {saved,income,expense,surplus,badges,xp,level,nextLevel};
  }
  function validateExtension(s){
    const num=(v,min=0,max=1e12)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
    if(s.subscriptions!==undefined){if(!Array.isArray(s.subscriptions)||s.subscriptions.length>1000||!s.subscriptions.every(x=>typeof x.id==='string'&&x.id.length>0&&typeof x.name==='string'&&x.name.length>0&&x.name.length<=100&&num(x.amount,.01)&&validDate(x.nextDate)&&['monthly','yearly'].includes(x.cycle)&&['Связь','ТВ и кино','ИИ','Музыка','Другое'].includes(x.kind)&&typeof x.active==='boolean'&&['kaspi','halyk','freedom','cash'].includes(x.account)&&Number.isInteger(x.anchorDay)&&x.anchorDay>=1&&x.anchorDay<=31)||new Set(s.subscriptions.map(x=>x.id)).size!==s.subscriptions.length)throw Error('Некорректные подписки.');}
    if(s.plan!==undefined){const p=s.plan;if(!p||!Number.isInteger(p.paydayDay)||p.paydayDay<1||p.paydayDay>31||!num(p.salary)||!num(p.reserve)||!(p.available===null||num(p.available, -1e12))||!(p.daily===null||num(p.daily))||!num(p.incoming)||!num(p.needsPct,0,100)||!num(p.savingsPct,0,100)||p.needsPct+p.savingsPct>100||!num(p.horizon,1,600)||!['low','medium','high'].includes(p.risk))throw Error('Некорректный финансовый план.');}
    if(!s.goals.every(g=>(g.monthly===undefined||num(g.monthly))&&(g.deadline===undefined||g.deadline===''||validDate(g.deadline))))throw Error('Некорректный план цели.');
  }
  const api={validDate,daysBetween,addDays,addMonths,nextPayday,occurrences,monthlyCost,dailyEstimate,forecast,goalProjection,allocation,achievements,validateExtension};root.Planning=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
