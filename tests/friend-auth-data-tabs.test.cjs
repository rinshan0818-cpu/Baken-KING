'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('friend management uses app-owned cookies and server-authorized proxy',()=>{
 const html=fs.readFileSync('friends.html','utf8');
 assert.match(html,/fetch\('\/api\/auth'\+path/);
 assert.match(html,/fetch\('\/api\/auth\/friends\/'\+route/);
 assert.match(html,/credentials:'same-origin'/);
 assert.doesNotMatch(html,/const API='https:\/\/baken-king-sharing-api/);
 assert.doesNotMatch(html,/getToken\(\)/);
});
test('PWA login and friend account share first-party auth cookies',()=>{
 const html=fs.readFileSync('auth.html','utf8');
 const api=fs.readFileSync('api/auth/index.js','utf8');
 assert.match(html,/\?'\/api\/auth'/);
 assert.match(api,/sign-up\/email/);
 assert.match(api,/email-otp\/verify-email/);
 assert.match(api,/SameSite=Lax; Secure; HttpOnly/);
});
test('data sections are comfortable to tap with 3 plus 2 mobile grid',()=>{
 const html=fs.readFileSync('index.html','utf8');
 assert.match(html,/\.bk-section-nav button:nth-child\(n\+4\)\{grid-column:span 3\}/);
 assert.match(html,/\.bk-section-nav button\{grid-column:span 2;min-height:52px/);
 assert.match(html,/repeat\(6,minmax\(0,1fr\)\)/);
});
