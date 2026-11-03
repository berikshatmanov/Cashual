const {test}=require('node:test');const assert=require('node:assert/strict');const P=require('../dist/planning.js');
const sub=(extra={})=>({id:'phone',name:'Связь',kind:'Связь',amount:5000,nextDate:'2026-11-05',anchorDay:5,cycle:'monthly',active:true,account:'kaspi',...extra});
test('payday rolls into next month, including clamped month-end and leap years',()=>{
  assert.equal(P.nextPayday('2026-11-03',10),'2026-11-10');
  assert.equal(P.nextPayday('2026-11-10',10),'2026-12-10');
  assert.equal(P.nextPayday('2026-02-27',31),'2026-02-28');
  assert.equal(P.nextPayday('2026-12-31',31),'2027-01-31');
  assert.equal(P.addMonths('2028-01-31',1,31),'2028-02-29');
  assert.equal(P.addMonths('2028-02-29',1,31),'2028-03-31');
});
test('forecast excludes payday salary, deducts bills once and identifies first shortfall',()=>{
  const f=P.forecast({today:'2026-11-03',paydayDay:7,balance:10000,reserve:1000,daily:1500,subscriptions:[sub()]});
  assert.equal(f.days,4);assert.equal(f.available,9000);assert.equal(f.bills,5000);assert.equal(f.endBalance,-2000);assert.equal(f.shortfall,'2026-11-05');assert.equal(f.safeDaily,1000);assert.equal(f.points.at(-1).date,'2026-11-06');
});
test('paused subscriptions are excluded; overdue bills apply today; yearly dates stay annual',()=>{
  const rows=P.occurrences([sub({nextDate:'2026-11-01',anchorDay:1}),sub({id:'paused',active:false}),sub({id:'year',cycle:'yearly',nextDate:'2026-11-05'})],'2026-11-03','2027-01-10');
  assert.equal(rows.filter(x=>x.id==='paused').length,0);assert.equal(rows[0].effectiveDate,'2026-11-03');assert.equal(rows.filter(x=>x.id==='year').length,1);
  assert.equal(P.monthlyCost([sub(),sub({id:'annual',amount:12000,cycle:'yearly'}),sub({active:false})]),6000);
});
test('daily estimate excludes posted subscription payments and uses a bounded history',()=>{
  const tx=[{date:'2026-11-01',type:'expense',merchant:'Food',amount:3000},{date:'2026-11-02',type:'expense',merchant:'Связь',amount:5000,subscriptionId:'phone'},{date:'2026-11-04',type:'expense',merchant:'Future',amount:99999},{date:'2025-01-01',type:'expense',merchant:'Old',amount:99999}];
  assert.equal(P.dailyEstimate(tx,[sub()],'2026-11-03'),1000);assert.equal(P.dailyEstimate([],[],'2026-11-03'),0);
});
test('goal dates use ceiling of monthly contributions; completed and zero-contribution goals are explicit',()=>{
  assert.deepEqual(P.goalProjection({saved:20000,target:100000,monthly:30000},'2026-11-03'),{months:3,date:'2027-02-03'});
  assert.deepEqual(P.goalProjection({saved:100000,target:100000,monthly:0},'2026-11-03'),{months:0,date:'2026-11-03'});
  assert.deepEqual(P.goalProjection({saved:0,target:100000,monthly:0},'2026-11-03'),{months:null,date:null});
  const result=P.allocation(123456.78,50,20);assert.ok(Math.abs(result.needs+result.savings+result.wants-123456.78)<1e-8);
});
test('achievements have exact thresholds and no XP duplication; transfers do not count',()=>{
  const input={goals:[{saved:500000,target:1000000}],transactions:[{date:'2026-11-01',type:'income',amount:50000},{date:'2026-11-01',type:'expense',amount:10000},{date:'2026-11-01',type:'transfer',amount:999999}],month:'2026-11'};
  const a=P.achievements(input);assert.equal(a.badges.find(x=>x.id==='half').earned,true);assert.equal(a.badges.find(x=>x.id==='million').earned,false);assert.equal(a.badges.find(x=>x.id==='literacy').earned,true);assert.equal(a.xp,P.achievements(input).xp);
  assert.equal(P.achievements({...input,transactions:[{date:'2026-11-01',type:'income',amount:20000},{date:'2026-11-01',type:'expense',amount:10000}]}).badges.find(x=>x.id==='literacy').earned,false);
  assert.equal(P.achievements({...input,month:'2026-12'}).badges.find(x=>x.id==='literacy').earned,false);
});
test('backups reject invalid planning data instead of importing unsafe financial values',()=>{
  const base={goals:[],subscriptions:[sub()]};assert.doesNotThrow(()=>P.validateExtension(base));
  for(const bad of [{amount:-1},{nextDate:'2026-02-30'},{cycle:'daily'},{anchorDay:0},{account:'unknown'}])assert.throws(()=>P.validateExtension({...base,subscriptions:[sub(bad)]}));
  assert.throws(()=>P.validateExtension({goals:[{monthly:-1}]}));
});
test('catalog contains exactly 50 unique achievements with explicit conditions and bounded progress',()=>{
  const a=P.achievements({goals:[],transactions:[],month:'2026-11',today:'2026-11-03'});
  assert.equal(a.badges.length,50);assert.equal(new Set(a.badges.map(b=>b.id)).size,50);assert.equal(a.badges.filter(b=>b.earned).length,0);
  assert.equal(new Set(a.badges.map(b=>b.group)).size,7);assert.ok(a.badges.every(b=>b.description&&b.title&&b.xp>0&&b.progress>=0&&b.progress<=1));
});
test('daily streak has one-day grace and daily XP cannot be duplicated by repeated claims',()=>{
  assert.deepEqual(P.streakInfo(['2026-11-01','2026-11-02','2026-11-02'],'2026-11-03'),{current:2,longest:2,total:2});
  assert.equal(P.streakInfo(['2026-11-01'],'2026-11-03').current,0);
  const input={goals:[],transactions:[],month:'2026-11',today:'2026-11-03',play:{checkins:['2026-11-03'],claims:[{date:'2026-11-03',id:'forecast'}],visits:[{date:'2026-11-03',page:'forecast'}],goalEvents:[]}};
  const a=P.achievements(input);assert.equal(a.habitXP,35);assert.equal(a.missions[0].claimed,true);assert.equal(a.missions[0].ready,true);
  input.play.claims.push({date:'2026-11-03',id:'forecast'});assert.equal(P.achievements(input).habitXP,35);
  assert.throws(()=>P.validateExtension({...input,goals:[]}));
});
test('quest rewards require today actions and earned list follows actual progress',()=>{
  const a=P.achievements({goals:[{saved:10000,target:20000,monthly:500}],transactions:[],month:'2026-11',today:'2026-11-03',play:{checkins:[],claims:[],visits:[{date:'2026-11-02',page:'forecast'}],goalEvents:[{date:'2026-11-03',goalId:'g',amount:100}]}});
  assert.equal(a.missions.find(m=>m.id==='save').ready,true);assert.equal(a.missions.find(m=>m.id==='forecast').ready,false);assert.equal(a.badges.find(b=>b.id==='first').earned,true);assert.equal(a.badges.find(b=>b.id==='steady').earned,false);
});
