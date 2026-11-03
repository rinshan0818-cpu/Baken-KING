'use strict';
// Composition root for a future authenticated Vercel Node function.
// Fail closed until all secrets and a restricted Postgres connection exist.
// Do not bundle this into the public GitHub Pages application.
const {createJwtAuthenticator}=require('./jwt-auth.cjs');
const {createNeonAuthenticator}=require('./neon-auth.cjs');
const {createSharingStore}=require('./neon-store.cjs');
const {createFriendshipStore}=require('./friendship-store.cjs');
const {createSharingService}=require('./service.cjs');
const {createSharingHttpHandler}=require('./http.cjs');
const {createRestrictedSharingHandler}=require('./restricted-app.cjs');
function createSharingApi({env,db}){
 if(!env||!db)throw Error('Private server configuration required');
 const {SHARING_JWT_ISSUER:issuer,SHARING_JWT_AUDIENCE:audience,SHARING_JWT_PUBLIC_KEY:publicKey}=env;
 // Neon mode must be explicitly selected by private server configuration.
 // Do not infer public browser credentials or silently bypass email verification.
 const neon=env.SHARING_AUTH_PROVIDER==='neon';
 if(!neon&&(!issuer||!audience||!publicKey))throw Error('Verified authentication not configured');
 if(neon&&(!env.NEON_AUTH_BASE_URL||!env.NEON_AUTH_JWKS_URL))throw Error('Verified authentication not configured');
 const authenticate=neon
  ?createNeonAuthenticator({authBaseUrl:env.NEON_AUTH_BASE_URL,jwksUrl:env.NEON_AUTH_JWKS_URL})
  :createJwtAuthenticator({issuer,audience,publicKey});
 if(neon){
  // Neon Auth mode MUST use an actor-bound transaction and restricted pg pool.
  return createRestrictedSharingHandler({authenticate,pool:db,allowedOrigins:['https://rinshan0818-cpu.github.io']});
 }
 const store={...createSharingStore(db),...createFriendshipStore(db)};
 const service=createSharingService({authenticate,store});
 return createSharingHttpHandler(service,{allowedOrigins:['https://rinshan0818-cpu.github.io']});
}
module.exports={createSharingApi};
