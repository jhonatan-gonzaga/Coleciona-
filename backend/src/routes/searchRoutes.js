const router=require('express').Router();
const service=require('../components/SearchService');
const {asyncRoute}=require('../middleware/errorHandler');
router.get('/explorar/colecoes',asyncRoute(async(req,res)=>res.json(await service.explorar(req.query))));
router.get('/itens/filtros',asyncRoute(async(req,res)=>res.json(await service.filtros(req.query.escopo,req.actorId))));
router.post('/itens/busca',asyncRoute(async(req,res)=>res.json(await service.busca(req.body,req.actorId))));
module.exports=router;
