const {test}=require('node:test');
const assert=require('node:assert/strict');
const F=require('../dist/finance.js');
test('saved rules override defaults; transfers never become spending',()=>{
  assert.equal(F.categorize('Magnum','expense'),'Продукты');
  assert.equal(F.categorize('Yandex Go','expense'),'Транспорт');
  assert.equal(F.categorize('Magnum','expense',[{match:'magnum',category:'Покупки'}]),'Покупки');
  assert.equal(F.categorize('Magnum','transfer'),'Переводы');
  assert.equal(F.categorize('Unknown store','expense'),'Другое');
});
test('income and expense totals exclude transfers',()=>{
  assert.deepEqual(F.totals([{type:'income',amount:1000},{type:'expense',amount:350},{type:'transfer',amount:500}]),{income:1000,expense:350});
});
test('CSV supports BOM, quoted commas, multiline fields and escaped quotes',()=>{
  const rows=F.parseCSV('\uFEFFdate,merchant,amount,type\r\n2026-11-03,"Shop, \"\"One\"\"",2500,expense\r\n2026-11-02,"Line\nTwo",500,transfer');
  assert.equal(rows.length,2);assert.equal(rows[0].merchant,'Shop, "One"');assert.equal(rows[1].category,'Переводы');assert.equal(rows[1].merchant,'Line\nTwo');
});
test('semicolon CSV supports decimal comma and learned categorization',()=>{
  const [row]=F.parseCSV('date;merchant;amount;type;account\n2026-11-03;Magnum;123,45;expense;kaspi');
  assert.equal(row.amount,123.45);assert.equal(row.category,'Продукты');assert.equal(row.account,'kaspi');
});
test('invalid CSV is rejected before importing any operations',()=>{
  for(const text of ['date,merchant,amount\n2026-11-03,X,10','date,merchant,amount,type\n2026-02-30,X,100,expense','date,merchant,amount,type\n2026-11-03,X,-10,expense','date,merchant,amount,type\n2026-11-03,X,10,unknown','date,merchant,amount,type\n2026-11-03,"X,10,expense'])assert.throws(()=>F.parseCSV(text));
});
