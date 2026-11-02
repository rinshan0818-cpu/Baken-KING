const assert=require('node:assert/strict');
const fs=require('node:fs');
const sql=fs.readFileSync(require('node:path').join(__dirname,'../docs/sharing-schema-p1.sql'),'utf8');
const tables=['sharing_users','sharing_requests','sharing_friendships','sharing_snapshots'];
for(const name of tables){
 assert(sql.includes('CREATE TABLE IF NOT EXISTS '+name),'Missing '+name);
 assert(sql.includes('ALTER TABLE '+name+' ENABLE ROW LEVEL SECURITY'),'RLS missing for '+name);
 assert(sql.includes('ALTER TABLE '+name+' FORCE ROW LEVEL SECURITY'),'Forced RLS missing for '+name);
}
assert(/CHECK\s*\(sender_id<>recipient_id\)/.test(sql),'Self-invite restriction missing');
assert(sql.includes('sharing_requests_one_pending_pair'),'Duplicate pending requests restriction missing');
assert(sql.includes('PRIMARY KEY(user_low,user_high)'),'Unique undirected friendship restriction missing');
assert(!/GRANT\s+(?:ALL|SELECT|INSERT|UPDATE|DELETE)\s+ON\s+sharing_/i.test(sql),'Direct database access grants must not be added casually');
console.log('PASS: sharing DB schema requires RLS and no direct browser grants');
