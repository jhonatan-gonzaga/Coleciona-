class ApiError extends Error {
  constructor(status,code,message,details={}) { super(message); this.status=status; this.code=code; this.details=details; }
}
const fail=(status,code,message,details)=>{throw new ApiError(status,code,message,details)};
const asyncRoute=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
function errorHandler(err,req,res,next) {
  if (res.headersSent) return next(err);
  if (err instanceof SyntaxError && err.status===400) err=new ApiError(400,'JSON_INVALIDO','JSON inválido.');
  if (err.code==='LIMIT_FILE_SIZE') err=new ApiError(422,'IMAGEM_INVALIDA','Imagem excede 5 MiB.');
  if (err.code==='LIMIT_FILE_COUNT') err=new ApiError(422,'LIMITE_IMAGENS','Máximo de cinco imagens por item.');
  if (err.code===11000) err=new ApiError(409,'DUPLICADO','Registro duplicado.');
  const status=err.status || (err.name==='MongoServerSelectionError' ? 503 : 500);
  if(status>=500) console.error(err);
  res.status(status).json({error:{code:err.code && typeof err.code==='string'?err.code:'ERRO_INTERNO',message:status===500?'Erro interno.':err.message,details:err.details||{}}});
}
module.exports={ApiError,fail,asyncRoute,errorHandler};
