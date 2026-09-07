export const OUTCOMES = ['MISS', ...Array.from({length:20},(_,i)=>String(i+1)), ...Array.from({length:20},(_,i)=>`D${i+1}`), ...Array.from({length:20},(_,i)=>`T${i+1}`), '25', 'BULL'];
export const COMBINATIONS = 63 ** 3;
export const TEAMS = [
 ['ARS','Arsenal',90],['COV','Coventry City',64],['HUL','Hull City',62],['MUN','Manchester United',82],
 ['EVE','Everton',74],['CRY','Crystal Palace',75],['IPS','Ipswich Town',65],['SUN','Sunderland',70],
 ['NFO','Nottingham Forest',74],['LEE','Leeds United',71],['BRE','Brentford',76],['TOT','Tottenham Hotspur',78],
 ['BHA','Brighton & Hove Albion',78],['AVL','Aston Villa',83],['MCI','Manchester City',89],['BOU','AFC Bournemouth',77],
 ['NEW','Newcastle United',83],['LIV','Liverpool',87],['FUL','Fulham',75],['CHE','Chelsea',85],
];
export const FIXTURES = Array.from({length:10},(_,i)=>({id:`mw1-${i+1}`,home:TEAMS[i*2][0],away:TEAMS[i*2+1][0],date:['Fri 21 Aug, 20:00','Sat 22 Aug, 12:30','Sat 22 Aug, 15:00','Sat 22 Aug, 15:00','Sat 22 Aug, 15:00','Sat 22 Aug, 17:30','Sun 23 Aug, 14:00','Sun 23 Aug, 14:00','Sun 23 Aug, 16:30','Mon 24 Aug, 20:00'][i]}));
export const DEFAULT_CONFIG = {baseGoals:1.25,homeAdvantage:1.22,strengthScale:35,slotBoost:0.12,ratings:Object.fromEntries(TEAMS.map(([id,,rating])=>[id,rating]))};
export const emptyEntry = () => ({home:['','',''],away:['','','']});
export const name = id => TEAMS.find(t=>t[0]===id)?.[1] ?? id;
export function normalizeThrow(value){
 if(typeof value !== 'string') throw new Error('Enter a dart outcome.');
 let s = value.trim().toUpperCase();
 if(s==='0'||s==='M') s='MISS';
 if(s==='50'||s==='DB'||s==='D25') s='BULL';
 if(s==='SB'||s==='S25') s='25';
 if(/^S(?:[1-9]|1\d|20)$/.test(s)) s=s.slice(1);
 if(!OUTCOMES.includes(s)) throw new Error('Use 1-20, D1-D20, T1-T20, 25, BULL or MISS.');
 return s;
}
export function combinationRank(index){
 if(!Number.isInteger(index)||index<0||index>=COMBINATIONS) throw new Error('Invalid combination index.');
 let x=index;
 do { let l=x>>>9, r=x&511;
  for(let round=0; round<6; round++){ let z=Math.imul(r^(0x9e3779b9+round*0x10101),0x85ebca6b); z^=z>>>13; [l,r]=[r,(l^z)&511]; }
  x=(l<<9)|r;
 } while(x>=COMBINATIONS);
 return x;
}
export function combination(throws){
 if(!Array.isArray(throws)||throws.length!==3) throw new Error('Enter exactly three darts.');
 const normalized = throws.map(normalizeThrow);
 const index = normalized.reduce((acc,s)=>acc*63+OUTCOMES.indexOf(s),0);
 const rank = combinationRank(index);
 return {id:index+1,rank,percentile:(rank+0.5)/COMBINATIONS,throws:normalized};
}
export function teamSlot(team, fixtures=FIXTURES){
 const index = fixtures.flatMap(f=>[f.home,f.away]).indexOf(team);
 if(index<0) throw new Error('Unknown team.');
 return index+1;
}
export function slotHitCount(throws, slot){
 if(!Number.isInteger(slot)||slot<1||slot>20) throw new Error('Team slot must be 1-20.');
 return throws.map(normalizeThrow).filter(s=>s===String(slot)||s===`D${slot}`||s===`T${slot}`).length;
}
export function validateConfig(c){
 if(!c||!Number.isFinite(c.baseGoals)||c.baseGoals<0.3||c.baseGoals>3||!Number.isFinite(c.homeAdvantage)||c.homeAdvantage<1||c.homeAdvantage>2||!Number.isFinite(c.strengthScale)||c.strengthScale<10||c.strengthScale>100||!Number.isFinite(c.slotBoost)||c.slotBoost<0||c.slotBoost>0.5||!c.ratings||TEAMS.some(([id])=>!Number.isFinite(c.ratings[id])||c.ratings[id]<1||c.ratings[id]>100)) throw new Error('Check model values.');
}
export function expectedGoals(team, opponent, home, c=DEFAULT_CONFIG, boostHits=0){
 validateConfig(c);
 if(c.ratings[team]===undefined||c.ratings[opponent]===undefined) throw new Error('Unknown team.');
 return Math.max(0.15, Math.min(4.5, c.baseGoals*Math.exp((c.ratings[team]-c.ratings[opponent])/c.strengthScale)*(home?c.homeAdvantage:1)*(1+c.slotBoost*boostHits)));
}
export function probabilities(lambda){
 const p=[Math.exp(-lambda)];
 for(let k=1;k<6;k++) p.push(p[k-1]*lambda/k);
 p.push(Math.max(0,1-p.reduce((a,b)=>a+b,0)));
 return p;
}
export function goalsAt(p, lambda){
 if(!Number.isFinite(p)||p<0||p>=1) throw new Error('Percentile must be in [0, 1).');
 let total=0;
 const weights=probabilities(lambda);
 for(let goals=0; goals<6; goals++){ total += weights[goals]; if(p<total) return goals; }
 return 6;
}
export function score(throws, team, opponent, home, c=DEFAULT_CONFIG){
 const slot = teamSlot(team);
 const result = combination(throws);
 const boostHits = slotHitCount(result.throws, slot);
 const lambda = expectedGoals(team, opponent, home, c, boostHits);
 return {...result,slot,boostHits,lambda,goals:goalsAt(result.percentile,lambda)};
}
export function matchResult(f, e, c=DEFAULT_CONFIG){
 return {home:score(e.home,f.home,f.away,true,c), away:score(e.away,f.away,f.home,false,c)};
}
export function standings(entries, c=DEFAULT_CONFIG){
 const rows = TEAMS.map(([id,club])=>({id,club,p:0,w:0,d:0,l:0,gf:0,ga:0,gd:0,pts:0}));
 for(const f of FIXTURES){
  if(!entries[f.id]) continue;
  const r=matchResult(f,entries[f.id],c), h=rows.find(x=>x.id===f.home), a=rows.find(x=>x.id===f.away);
  const hg=r.home.goals, ag=r.away.goals; h.p++; a.p++; h.gf+=hg; h.ga+=ag; a.gf+=ag; a.ga+=hg;
  if(hg===ag){ h.d++; a.d++; h.pts++; a.pts++; } else { const w=hg>ag?h:a, l=hg>ag?a:h; w.w++; w.pts+=3; l.l++; }
 }
 for(const r of rows) r.gd=r.gf-r.ga;
 return rows.sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf||a.club.localeCompare(b.club));
}
export function decodeSave(raw){
 const data=JSON.parse(raw);
 const config={...DEFAULT_CONFIG,...data.config,ratings:{...DEFAULT_CONFIG.ratings,...data.config?.ratings}};
 validateConfig(config);
 const entries={}, drafts={};
 for(const f of FIXTURES){
  if(data.entries?.[f.id]) entries[f.id]={home:combination(data.entries[f.id].home).throws,away:combination(data.entries[f.id].away).throws};
  const d=data.drafts?.[f.id];
  if(d&&['home','away'].every(s=>Array.isArray(d[s])&&d[s].length===3&&d[s].every(v=>typeof v==='string'&&v.length<=16))) drafts[f.id]=d;
 }
 return {entries,config,drafts};
}
