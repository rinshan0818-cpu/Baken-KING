const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const start=html.indexOf('function bkFriendCloudSnapshot(){'),end=html.indexOf('function bkScoreValid(m)',start);
assert(start!==-1&&end>start);
const snippet=html.slice(start,end);
assert(snippet.includes('bkRaceStats('));
for(const field of ['stakeYen','returnedYen','settledTicketCount','purchasedRaceCount','hitRaceCount','settledRaceCount','maxPayoutYen'])assert(snippet.includes(field+':'));
for(const forbidden of ['raceId','realRaceId','wallet','balance','history','horseName','betIds'])assert(!snippet.includes(forbidden));
assert(!html.includes('BakenFriendSync.create('),'Do not activate cloud sync without authenticated transport');
console.log('PASS: exact cloud score projection uses real settled race denominator and does not activate unsecured syncing');