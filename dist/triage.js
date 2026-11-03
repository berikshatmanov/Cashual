(function(root){
  'use strict';
  function needsReview(t){return !t.categoryConfirmed&&((t.type==='expense'&&(!t.category||t.category==='Другое'))||(t.type==='income'&&(!t.category||t.category==='Доходы')));}
  function scan(log,transactions){const current=transactions.map(t=>t.id);if(!log)return {log:{knownIds:current},newUnknown:[]};const known=new Set(log.knownIds);return {log:{knownIds:current},newUnknown:transactions.filter(t=>!known.has(t.id)&&needsReview(t))};}
  function validate(log){if(log===undefined)return;if(!log||!Array.isArray(log.knownIds)||log.knownIds.length>100000||!log.knownIds.every(id=>typeof id==='string'&&id.length>0&&id.length<=200)||new Set(log.knownIds).size!==log.knownIds.length)throw Error('Некорректная история уведомлений.');}
  const api={needsReview,scan,validate};root.Triage=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
