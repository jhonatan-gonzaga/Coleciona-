const router=require('express').Router();
const CatalogRepository=require('../components/Repositories/CatalogRepository');
const {asyncRoute}=require('../middleware/errorHandler');
router.get('/live',(req,res)=>res.json({data:{status:'ok'}}));
router.get('/ready',asyncRoute(async(req,res)=>{try{const ok=await new CatalogRepository().ready();res.status(ok?200:503).json({data:{status:ok?'ok':'indisponivel'}})}catch{res.status(503).json({error:{code:'SERVICO_INDISPONIVEL',message:'Banco indisponível.',details:{}}})}}));
module.exports=router;
