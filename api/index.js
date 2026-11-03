'use strict';
// Rewrites to this concrete Vercel Node function may expose either the
// original URL or /api/index?bk_route=... depending on the adapter.
const handle=require('../sharing-server/vercel-entry.cjs');
module.exports=(req,res)=>{
 const url=new URL(req.url,'https://baken.invalid');
 if(url.pathname==='/api/index'){
  const route=url.searchParams.get('bk_route');
  if(typeof route!=='string'||!/^sharing(?:\/[a-z0-9-]+)*(?:\/[0-9a-f-]{36})?(?:\/respond)?$|^account\/backup$|^monitor\/scheduler-union$/i.test(route)){
   res.statusCode=404;res.setHeader('Cache-Control','no-store');
   return res.end(JSON.stringify({error:'Not found'}));
  }
  req.url='/api/'+route;
 }
 return handle(req,res);
};
