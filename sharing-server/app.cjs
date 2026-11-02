'use strict';
// Composition root for a future authenticated Vercel Node function.
// Fail closed until all secrets and a restricted Postgres connection exist.
// Do not bundle this into the public GitHub Pages application.
const {createJwtAuthenticator}=require('./jwt-auth.cjs');
const {createSharingStore}=require('./neon-store.cjs');
const {createSharingService}=require('./service.cjs');
const {createSharingHttpHandler}=require('./http.cjs');
function createSharingApi({env,db}){
 if(!env||!db)throw Error('Private server configuration required');
 const {SHARING_JWT_ISSUER:issuer,SHARING_JWT_AUDIENCE:audience,SHARING_JWT_PUBLIC_KEY:publicKey}=env;
 if(!issuer||!audience||!publicKey)throw Error('Verified authentication not configured');
 const authenticate=createJwtAuthenticator({issuer,audience,publicKey});
 const store=createSharingStore(db);
 const service=createSharingService({authenticate,store});
 return createSharingHttpHandler(service);
}
module.exports={createSharingApi};
