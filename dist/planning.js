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
  function streakInfo(dates,today){
    const unique=[...new Set(dates)].filter(validDate).sort();let longest=0,currentRun=0,previous=null;
    for(const day of unique){currentRun=previous&&daysBetween(previous,day)===1?currentRun+1:1;longest=Math.max(longest,currentRun);previous=day;}
    const set=new Set(unique);let current=0,cursor=set.has(today)?today:addDays(today,-1);while(set.has(cursor)){current++;cursor=addDays(cursor,-1);}
    return {current,longest,total:unique.length};
  }
  function achievements({goals,transactions,month,subscriptions=[],budgets=[],today=month+'-01',play={}}){
    const saved=goals.reduce((sum,g)=>sum+g.saved,0),tx=transactions.filter(t=>t.date.startsWith(month)&&t.date<=today),recorded=transactions.filter(t=>t.date<=today);
    const income=tx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0),expense=tx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0),surplus=income-expense,rate=income>0?Math.max(0,surplus/income*100):0;
    const completed=goals.filter(g=>g.saved>=g.target).length,healthy=budgets.filter(b=>{const spent=tx.filter(t=>t.type==='expense'&&t.category===b.category).reduce((s,t)=>s+t.amount,0);return spent>0&&spent<=b.limit;}).length;
    const streak=streakInfo(play.checkins||[],today),badges=[];
    function add(id,title,group,current,target,xp,tier,description,symbol='✦',unit=''){const value=Math.max(0,current);badges.push({id,title,group,current:value,target,threshold:group==='Накопления'?target:undefined,xp,tier,symbol,earned:value>=target,progress:Math.min(1,value/target),description,unit});}
    const milestones=[['tiny','Первый тенге в запасе',1000,20,'bronze'],['spark','Искра накоплений',5000,30,'bronze'],['first','Первый запас',10000,50,'bronze'],['quarter','Запас на завтра',25000,70,'bronze'],['steady','Уверенный старт',50000,100,'bronze'],['keeper','Хранитель сотни',100000,150,'silver'],['quartermillion','Четверть миллиона',250000,200,'silver'],['half','Полмиллиона спокойствия',500000,250,'silver'],['million','Миллион в запасе',1000000,400,'gold'],['doublemillion','Двойная опора',2000000,500,'gold'],['five','Крепость капитала',5000000,700,'legendary'],['tenmillion','Десять миллионов возможностей',10000000,1000,'legendary']];
    for(const [id,title,target,xp,tier] of milestones)add(id,title,'Накопления',saved,target,xp,tier,'Накопить по целям '+target.toLocaleString('ru')+' ₸','◈','₸');
    for(const [n,title,xp] of [[1,'Первый след',20],[10,'Деньги на виду',40],[50,'Хроникёр расходов',80],[100,'Архивариус финансов',120]])add('records'+n,title,'Учёт',recorded.length,n,xp,n>=50?'silver':'bronze','Записать '+n+' операций с датой не позже сегодня','≋','операций');
    add('manual','Своя первая запись','Учёт',recorded.filter(t=>t.source==='manual').length,1,25,'bronze','Добавить хотя бы одну операцию вручную','＋','операций');
    add('import','Повелитель выписок','Учёт',recorded.filter(t=>t.source==='import').length,1,60,'silver','Импортировать хотя бы одну операцию из CSV','↥','операций');
    add('positive','В плюсе','Баланс',income>0&&surplus>0?1:0,1,50,'bronze','Иметь положительный остаток доходов за текущий месяц: доходы − расходы > 0','↗');
    for(const [n,title,xp,tier] of [[10,'Десятая часть — себе',60,'bronze'],[20,'Правило двадцати',90,'silver'],[30,'Запас прочности',120,'silver'],[50,'Половина в будущее',180,'gold']])add('rate'+n,title,'Баланс',rate,n,xp,tier,'Сохранить не меньше '+n+'% доходов текущего месяца после расходов','◷','%');
    add('literacy','Финансовая грамотность','Баланс',income>0&&surplus>expense?1:0,1,200,'gold','Остаток доходов текущего месяца больше расходов: доходы − расходы > расходы','✧');
    add('goalfirst','Мечта с именем','Цели',goals.length,1,25,'bronze','Создать первую финансовую цель','◎','целей');
    add('goalthree','Карта желаний','Цели',goals.length,3,70,'silver','Создать три финансовые цели с разным назначением','◎','целей');
    for(const [n,id,title,xp,tier] of [[1,'goal','Мечта стала планом',150,'silver'],[3,'goaldone3','Трижды получилось',300,'gold'],[5,'goaldone5','Исполнитель желаний',500,'legendary']])add(id,title,'Цели',completed,n,xp,tier,'Полностью накопить сумму по '+n+' целям','✓','целей');
    add('goalmonthly','Ритм накоплений','Цели',goals.filter(g=>g.monthly>0).length,1,40,'bronze','Указать положительный ежемесячный взнос хотя бы для одной цели','↻','целей');
    add('goaldeadline','У мечты есть дата','Цели',goals.filter(g=>validDate(g.deadline)).length,1,40,'bronze','Указать желаемую дату достижения хотя бы одной цели','◷','целей');
    add('goalambitious','Думаю масштабно','Цели',goals.filter(g=>g.target>=1000000).length,1,80,'silver','Создать цель на 1 000 000 ₸ или больше','♜','целей');
    for(const [n,title,xp] of [[1,'Деньги по местам',25],[3,'Планировщик',60],[5,'Архитектор бюджета',100]])add('budget'+n,title,'Бюджеты',budgets.length,n,xp,n===5?'silver':'bronze','Создать лимиты для '+n+' категорий','▤','бюджетов');
    add('healthy1','Первый лимит под контролем','Бюджеты',healthy,1,40,'bronze','Иметь расходы хотя бы в одной категории, не превышающие её лимит в текущем месяце','✓','категорий');
    add('healthy3','Тройной контроль','Бюджеты',healthy,3,90,'silver','Иметь три категории с расходами в пределах лимитов текущего месяца','✓','категорий');
    add('healthyall','Мастер рамок','Бюджеты',budgets.length>=3&&healthy===budgets.length?1:0,1,180,'gold','Иметь минимум три бюджета: в каждом есть расходы и ни один лимит не превышен','⬡');
    for(const [n,title,xp] of [[1,'Всё по расписанию',20],[3,'Радар списаний',50],[5,'Ничего не забыто',80]])add('sub'+n,title,'Подписки',subscriptions.length,n,xp,n===5?'silver':'bronze','Занести в учёт '+n+' регулярных платежей; покупать новые услуги не нужно','↻','сервисов');
    add('subkinds','Все сервисы на виду','Подписки',new Set(subscriptions.map(s=>s.kind)).size,3,60,'silver','Организовать регулярные платежи минимум трёх разных типов','▦','типов');
    add('subpause','Осознанный выбор','Подписки',subscriptions.filter(s=>!s.active).length,1,40,'bronze','Поставить ненужный платёж на паузу в Cashual; отмена у провайдера выполняется отдельно','Ⅱ','сервисов');
    add('subpaid','Списание учтено','Подписки',recorded.filter(t=>t.subscriptionId).length,1,40,'bronze','Учесть состоявшуюся оплату подписки через календарь','✓','платежей');
    for(const [n,title,xp,tier] of [[1,'На связи с деньгами',10,'bronze'],[3,'Три шага вперёд',30,'bronze'],[7,'Неделя внимания',70,'silver'],[14,'Две недели ясности',120,'silver'],[30,'Финансы — привычка',250,'gold']])add('checkin'+n,title,'Привычки',streak.total,n,xp,tier,'Отметить финансовый день в '+n+' разных календарных днях','✦','дней');
    add('streak7','Семь дней подряд','Привычки',streak.longest,7,150,'gold','Отмечать финансовый день семь календарных дней подряд','♨','дней');
    const todayTx=recorded.filter(t=>t.date===today&&t.type==='expense'&&['manual','import'].includes(t.source));
    const missions=[{id:'forecast',title:'Посмотри на завтра',description:'Открой прогноз до зарплаты сегодня',ready:(play.visits||[]).some(v=>v.date===today&&v.page==='forecast'),page:'forecast',xp:25},{id:'record',title:'Ничего не потерялось',description:'Добавь расход за сегодня вручную или через CSV',ready:todayTx.length>0,page:'transactions',xp:25},{id:'save',title:'Шаг к мечте',description:'Пополни любую цель сегодня на положительную сумму',ready:(play.goalEvents||[]).some(v=>v.date===today&&v.amount>0),page:'goals',xp:25}].map(m=>({...m,claimed:(play.claims||[]).some(c=>c.date===today&&c.id===m.id)}));
    const badgeXP=badges.filter(b=>b.earned).reduce((sum,b)=>sum+b.xp,0),habitXP=streak.total*10+new Set((play.claims||[]).map(c=>c.date+'|'+c.id)).size*25,xp=badgeXP+habitXP;
    const levels=[{min:0,name:'Новичок'},{min:150,name:'Исследователь'},{min:400,name:'Стратег'},{min:800,name:'Хранитель капитала'},{min:1400,name:'Мастер привычек'},{min:2200,name:'Финансовый навигатор'},{min:3400,name:'Мастер капитала'},{min:5000,name:'Легенда Cashual'},{min:7500,name:'Грандмастер'}];
    const level=levels.filter(l=>xp>=l.min).at(-1),nextLevel=levels.find(l=>xp<l.min);
    return {saved,income,expense,surplus,badges,xp,badgeXP,habitXP,level,nextLevel,streak,missions};
  }
  function validateExtension(s){
    const num=(v,min=0,max=1e12)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
    if(s.play!==undefined){
      const p=s.play;if(!p||!['checkins','claims','visits','goalEvents'].every(k=>Array.isArray(p[k])&&p[k].length<=10000))throw Error('Некорректная история достижений.');
      if(!p.checkins.every(validDate)||new Set(p.checkins).size!==p.checkins.length||!p.claims.every(c=>validDate(c.date)&&['forecast','record','save'].includes(c.id))||new Set(p.claims.map(c=>c.date+'|'+c.id)).size!==p.claims.length||!p.visits.every(v=>validDate(v.date)&&['forecast','budgets','goals','advice','subscriptions'].includes(v.page))||!p.goalEvents.every(v=>validDate(v.date)&&typeof v.goalId==='string'&&num(v.amount,.01)))throw Error('Некорректные действия геймификации.');
    }
    if(s.subscriptions!==undefined){if(!Array.isArray(s.subscriptions)||s.subscriptions.length>1000||!s.subscriptions.every(x=>typeof x.id==='string'&&x.id.length>0&&typeof x.name==='string'&&x.name.length>0&&x.name.length<=100&&num(x.amount,.01)&&validDate(x.nextDate)&&['monthly','yearly'].includes(x.cycle)&&['Связь','ТВ и кино','ИИ','Музыка','Другое'].includes(x.kind)&&typeof x.active==='boolean'&&['kaspi','halyk','freedom','cash'].includes(x.account)&&Number.isInteger(x.anchorDay)&&x.anchorDay>=1&&x.anchorDay<=31)||new Set(s.subscriptions.map(x=>x.id)).size!==s.subscriptions.length)throw Error('Некорректные подписки.');}
    if(s.plan!==undefined){const p=s.plan;if(!p||!Number.isInteger(p.paydayDay)||p.paydayDay<1||p.paydayDay>31||!num(p.salary)||!num(p.reserve)||!(p.available===null||num(p.available, -1e12))||!(p.daily===null||num(p.daily))||!num(p.incoming)||!num(p.needsPct,0,100)||!num(p.savingsPct,0,100)||p.needsPct+p.savingsPct>100||!num(p.horizon,1,600)||!['low','medium','high'].includes(p.risk))throw Error('Некорректный финансовый план.');}
    if(!s.goals.every(g=>(g.monthly===undefined||num(g.monthly))&&(g.deadline===undefined||g.deadline===''||validDate(g.deadline))))throw Error('Некорректный план цели.');
  }
  const api={streakInfo,validDate,daysBetween,addDays,addMonths,nextPayday,occurrences,monthlyCost,dailyEstimate,forecast,goalProjection,allocation,achievements,validateExtension};root.Planning=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
