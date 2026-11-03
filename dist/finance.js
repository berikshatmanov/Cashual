(function(root){
  'use strict';
  const categories=['Продукты','Рестораны','Транспорт','Автомобиль','Здоровье','Покупки','Дети','Развлечения','Коммунальные платежи','Другое'];
  const baseRules=[{match:'magnum',category:'Продукты'},{match:'small',category:'Продукты'},{match:'yandex go',category:'Транспорт'},{match:'яндекс',category:'Транспорт'},{match:'wolt',category:'Рестораны'},{match:'netflix',category:'Развлечения'},{match:'аптека',category:'Здоровье'},{match:'spotify',category:'Развлечения'}];
  function categorize(merchant,type,rules=[]){if(type==='transfer')return 'Переводы';if(type==='income')return 'Доходы';const text=String(merchant).toLowerCase();return [...rules,...baseRules].find(r=>text.includes(r.match.toLowerCase()))?.category||'Другое';}
  function totals(transactions){return transactions.reduce((s,t)=>{if(t.type==='income')s.income+=t.amount;if(t.type==='expense')s.expense+=t.amount;return s;},{income:0,expense:0});}
  function parseCSV(text,rules=[]){
    text=text.replace(/^\uFEFF/,'');const separator=text.split(/\r?\n/)[0].includes(';')?';':',';const rows=[];let row=[],field='',quoted=false;
    for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(c===separator&&!quoted){row.push(field);field='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(Boolean))rows.push(row);row=[];field='';}else field+=c;}
    if(quoted)throw Error('Незакрытая кавычка в CSV.');row.push(field);if(row.some(Boolean))rows.push(row);
    const header=rows.shift()?.map(s=>s.trim().toLowerCase());if(!header)throw Error('Файл пуст.');
    for(const key of ['date','merchant','amount','type'])if(!header.includes(key))throw Error('Нет столбца '+key+'. Используйте шаблон CSV.');
    if(!rows.length)throw Error('В файле нет операций.');if(rows.length>10000)throw Error('Максимум 10 000 операций за один импорт.');
    return rows.map((r,i)=>{const get=k=>String(r[header.indexOf(k)]||'').trim();const date=get('date'),merchant=get('merchant'),type=get('type'),amount=Number(get('amount').replace(/\s/g,'').replace(',','.'));const account=get('account')||'cash';const category=get('category')||categorize(merchant,type,rules);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||!merchant||!Number.isFinite(amount)||amount<=0||!['income','expense','transfer'].includes(type))throw Error('Некорректная операция в строке '+(i+2)+'. Проверьте дату, сумму и тип.');
      if(type==='expense'&&!categories.includes(category))throw Error('Неизвестная категория в строке '+(i+2)+'.');
      return {date,merchant,amount,type,account:['kaspi','halyk','freedom','cash'].includes(account)?account:'cash',category:type==='transfer'?'Переводы':type==='income'?'Доходы':category,source:'import'};
    });
  }
  const api={categories,baseRules,categorize,totals,parseCSV};root.Finance=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
