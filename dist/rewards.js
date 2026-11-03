(function(root){
  'use strict';
  const levels=[0,150,400,800,1400,2200,3400,5000,7500];
  const rank=xp=>levels.filter(min=>xp>=min).length;
  const avatars=[
    ['sprout','Росток','sprout',1,'#8aa96a','#e6f0c9'],['cat','Котик','cat',1,'#ad9275','#f2e6cb'],
    ['fox','Лис','fox',2,'#c87c49','#f7d4a9'],['owl','Сова','owl',2,'#8c7caa','#e6dcf4'],
    ['bear','Медведь','bear',3,'#9f7d5b','#e9d5b8'],['panda','Панда','panda',3,'#698f88','#dbefe4'],
    ['deer','Олень','deer',4,'#969451','#eee9bc'],['wolf','Волк','wolf',4,'#6d8b9c','#d9e8f0'],
    ['lynx','Рысь','lynx',5,'#b7954c','#f4e6b1'],['tiger','Тигр','tiger',5,'#c18b4e','#f5deb3'],
    ['eagle','Сокол','eagle',6,'#718d99','#dcebf0'],['astro','Космонавт','astro',6,'#7687b5','#e0e6fb'],
    ['lion','Лев','lion',7,'#ba9748','#f8e9ac'],['phoenix','Феникс','phoenix',7,'#c67b57','#f8d6ad'],
    ['dragon','Дракон','dragon',8,'#7d9f77','#dfefd1'],['griffin','Грифон','griffin',8,'#b09b5a','#f0e7c7'],
    ['stellar','Звёздный дракон','stellar',9,'#9182b9','#e7dffa'],['crown','Корона мастера','crown',9,'#bd9b44','#fff0b5']
  ].filter((_,i)=>i%2===0).map(([id,name,kind,level,color,light])=>({id,name,kind,level,color,light}));
  function snapshot(game){return {earned:game.badges.filter(b=>b.earned).map(b=>b.id),level:rank(game.xp)};}
  function reconcile(log,game){const current=snapshot(game);if(!log?.initialized)return {log:{initialized:true,seenBadges:current.earned,maxLevel:current.level,name:'Мой профиль'},events:[]};const seen=new Set(log.seenBadges),events=game.badges.filter(b=>b.earned&&!seen.has(b.id)).map(b=>({type:'badge',badge:b}));const next={...log,seenBadges:[...new Set([...log.seenBadges,...current.earned])],maxLevel:Math.max(log.maxLevel,current.level)};if(current.level>log.maxLevel)events.push({type:'level',level:current.level,levelName:game.level.name,xp:game.xp,unlocked:avatars.filter(a=>a.level>log.maxLevel&&a.level<=current.level)});return {log:next,events};}
  function activeAvatar(log,xp){return avatars.find(a=>a.level===rank(xp))||avatars[0];}
  function escape(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function avatarSVG(a,context='avatar'){
    const gid=escape(context+'-'+a.id),face=a.light,dark='#294536',white='#fffdf3';let art='';
    const eyes='<circle cx="38" cy="49" r="3" fill="'+dark+'"/><circle cx="62" cy="49" r="3" fill="'+dark+'"/><path d="M45 62q5 4 10 0" fill="none" stroke="'+dark+'" stroke-width="2.5" stroke-linecap="round"/>';
    const base='<ellipse cx="50" cy="53" rx="27" ry="25" fill="'+face+'"/>';
    if(a.kind==='sprout')art='<path d="M50 72V41" stroke="'+dark+'" stroke-width="5" stroke-linecap="round"/><path d="M50 49C25 52 23 30 26 27c20-3 28 9 24 22Z" fill="'+face+'"/><path d="M50 42c-3-20 10-25 26-24 1 18-10 28-26 24Z" fill="'+white+'"/><ellipse cx="50" cy="78" rx="20" ry="5" fill="'+dark+'" opacity=".16"/>';
    else if(a.kind==='astro')art='<circle cx="50" cy="49" r="30" fill="'+white+'"/><rect x="22" y="41" width="56" height="23" rx="11" fill="'+dark+'"/><path d="M31 47h13" stroke="'+face+'" stroke-width="4" stroke-linecap="round"/><circle cx="65" cy="52" r="3" fill="'+a.color+'"/><path d="M32 79h36M38 76v-8m24 8v-8" stroke="'+white+'" stroke-width="5"/>';
    else if(a.kind==='crown')art='<path d="m23 38 17 10 10-24 10 24 17-10-7 35H30Z" fill="'+face+'"/><path d="M31 65h38" stroke="'+a.color+'" stroke-width="4"/><path d="m50 46 6 8-6 8-6-8Z" fill="'+white+'"/><circle cx="23" cy="35" r="4" fill="'+white+'"/><circle cx="77" cy="35" r="4" fill="'+white+'"/><circle cx="50" cy="22" r="4" fill="'+white+'"/>';
    else if(['eagle','phoenix','griffin'].includes(a.kind))art='<path d="M25 69 26 36l19-8 27 10 8 24-19 14Z" fill="'+face+'"/>'+(['phoenix','griffin'].includes(a.kind)?'<path d="m33 32 1-14 13 13 8-18 5 20" fill="'+white+'"/>':'')+'<path d="m51 48 19 5-15 13" fill="'+a.color+'"/><path d="M33 43q9-5 16 2" fill="none" stroke="'+dark+'" stroke-width="3"/><circle cx="42" cy="48" r="3" fill="'+dark+'"/>';
    else if(['dragon','stellar'].includes(a.kind))art='<path d="m27 36-2-17 17 15 17-3 17-13-1 24 6 22-17 15-31-4-13-18Z" fill="'+face+'"/><path d="m31 23 9 14m27-13-9 12" stroke="'+white+'" stroke-width="4" stroke-linecap="round"/><path d="m73 50 12 6-12 5" fill="'+a.color+'"/>'+eyes+'<path d="m50 34 4 7-4 6-4-6Z" fill="'+white+'"/>';
    else if(a.kind==='owl')art='<path d="m24 27 14 8q12-5 24 0l14-8-2 35Q50 91 26 62Z" fill="'+face+'"/><circle cx="38" cy="50" r="12" fill="'+white+'"/><circle cx="62" cy="50" r="12" fill="'+white+'"/><circle cx="38" cy="50" r="4" fill="'+dark+'"/><circle cx="62" cy="50" r="4" fill="'+dark+'"/><path d="m45 59 5 8 5-8Z" fill="'+a.color+'"/>';
    else {const round=['bear','panda','lion'].includes(a.kind);art=(a.kind==='lion'?'<circle cx="50" cy="50" r="34" fill="'+a.color+'" stroke="'+face+'" stroke-width="6"/>':'')+(round?'<circle cx="28" cy="30" r="10" fill="'+face+'"/><circle cx="72" cy="30" r="10" fill="'+face+'"/>':'<path d="m24 41 1-22 21 15m8 0 21-15 1 22" fill="'+face+'"/>')+base;
      if(a.kind==='deer')art='<path d="M30 32 24 13m3 9-9-4m8-1 7-6M70 32l6-19m-3 9 9-4m-8-1-7-6" stroke="'+white+'" stroke-width="4" stroke-linecap="round"/>'+art;
      if(a.kind==='fox'||a.kind==='wolf')art+='<path d="m24 46 26 17 26-17-11 27H35Z" fill="'+white+'"/>';
      if(a.kind==='panda')art+='<ellipse cx="37" cy="48" rx="9" ry="11" fill="'+dark+'"/><ellipse cx="63" cy="48" rx="9" ry="11" fill="'+dark+'"/><circle cx="38" cy="47" r="2.5" fill="'+white+'"/><circle cx="62" cy="47" r="2.5" fill="'+white+'"/>';
      else art+=eyes;
      if(a.kind==='tiger'||a.kind==='lynx')art+='<path d="m43 30 3 9m11-9-3 9M25 47l8 3m42-3-8 3M27 61l7-3m39 3-7-3" stroke="'+a.color+'" stroke-width="3" stroke-linecap="round"/>';
      art+='<path d="m46 56 4 4 4-4Z" fill="'+dark+'"/>';
    }
    return '<svg class="avatar-art" viewBox="0 0 100 100" role="img" aria-label="'+escape(a.name)+'"><defs><linearGradient id="'+gid+'" x2="1" y2="1"><stop stop-color="'+a.color+'"/><stop offset="1" stop-color="#284b3b"/></linearGradient></defs><rect x="3" y="3" width="94" height="94" rx="30" fill="url(#'+gid+')"/><circle cx="50" cy="50" r="42" fill="none" stroke="'+white+'" stroke-opacity=".15"/>'+art+(a.level>=7?'<path d="m83 15 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="'+white+'"/>':'')+'</svg>';
  }
  const categoryPaths={'Накопления':'M30 44h40v24H30z M35 37h30v7H35 M50 49v14 M46 51h6a3 3 0 0 1 0 6h-4a3 3 0 0 0 0 6h6','Учёт':'M34 31h32v40H34z M41 42h18 M41 50h18 M41 58h11','Баланс':'M28 62h44 M34 57V45 M44 57V37 M54 57V46 M64 57V29','Цели':'M50 72a22 22 0 1 1 22-22 M50 62a12 12 0 1 1 12-12 M50 50l21-21 M61 29h10v10','Бюджеты':'M29 39h42v31H29z M29 39v-8h33v8 M60 49h13v12H60z','Подписки':'M32 42a20 20 0 0 1 34-6 M66 29v9H57 M68 58a20 20 0 0 1-34 6 M34 71v-9h9','Привычки':'m50 27 7 15 16 3-12 12 3 16-14-8-14 8 3-16-12-12 16-3Z'};
  function medalSVG(b,context='card'){
    const palette={bronze:['#b9794c','#f8e4c5','#815335'],silver:['#7b9696','#eaf1ee','#3e6262'],gold:['#c8a447','#fff2bc','#87651e'],legendary:['#9476b5','#f1e2ff','#64447c']}[b.tier]||['#829c69','#eef4d6','#42613a'],id='award-'+b.id+'-'+context;
    return '<svg class="medal-art" viewBox="0 0 120 130" aria-hidden="true"><defs><linearGradient id="'+id+'" x1="0" x2=".8" y2="1"><stop stop-color="'+palette[1]+'"/><stop offset=".6" stop-color="'+palette[0]+'"/><stop offset="1" stop-color="'+palette[2]+'"/></linearGradient></defs><path d="m34 86-7 34 22-10 11 13 8-33m18-4 7 34-22-10-11 13-8-33" fill="'+palette[0]+'" opacity=".8"/><path d="M60 7 103 30v49l-43 26L17 79V30Z" fill="url(#'+id+')"/><path d="M60 15 96 35v40l-36 22-36-22V35Z" fill="none" stroke="'+palette[1]+'" stroke-width="1.5" opacity=".9"/><circle cx="60" cy="55" r="28" fill="'+palette[1]+'" opacity=".85"/><g transform="translate(10 5)" fill="none" stroke="'+palette[2]+'" stroke-width="3.1" stroke-linecap="round" stroke-linejoin="round"><path d="'+(categoryPaths[b.group]||categoryPaths['Привычки'])+'"/></g><path d="m60 7 3 7-3 4-3-4Z" fill="#fffdf3"/><circle cx="25" cy="50" r="2" fill="'+palette[1]+'"/><circle cx="95" cy="50" r="2" fill="'+palette[1]+'"/>'+(b.tier==='legendary'?'<path d="m13 12 2 5 5 2-5 2-2 5-2-5-5-2 5-2Zm91 79 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="'+palette[0]+'"/>':'')+'</svg>';
  }
  function validate(log){if(log===undefined)return;if(!log||log.initialized!==true||!Array.isArray(log.seenBadges)||log.seenBadges.length>100||!log.seenBadges.every(id=>typeof id==='string'&&/^[a-zA-Z0-9]+$/.test(id))||new Set(log.seenBadges).size!==log.seenBadges.length||!Number.isInteger(log.maxLevel)||log.maxLevel<1||log.maxLevel>9||typeof log.name!=='string'||log.name.trim().length<1||log.name.length>40)throw Error('Некорректный профиль наград.');}
  const api={levels,rank,avatars,snapshot,reconcile,activeAvatar,avatarSVG,medalSVG,validate};root.Rewards=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
