const {resumeDeletions}=require('../components/CatalogService');
function startCleanup(){resumeDeletions().catch(console.error);return setInterval(()=>resumeDeletions().catch(console.error),60000).unref()}
module.exports=startCleanup;
