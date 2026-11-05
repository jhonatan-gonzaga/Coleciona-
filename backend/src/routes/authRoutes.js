const router=require('express').Router();
const auth=require('../components/AuthService');
const {requireAuth}=require('../middleware/authenticate');
const {asyncRoute}=require('../middleware/errorHandler');
router.post('/cadastro',asyncRoute(async(req,res)=>res.status(201).json({data:await auth.cadastro(req.body)})));
router.post('/login',asyncRoute(async(req,res)=>res.json({data:await auth.login(req.body)})));
router.get('/me',requireAuth,asyncRoute(async(req,res)=>res.json({data:await auth.me(req.actorId)})));
module.exports=router;
