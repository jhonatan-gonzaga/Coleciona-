require('dotenv').config();
const app=require('./app');
const {connect}=require('./components/Repositories/mongoClient');
const startCleanup=require('./jobs/cleanupImages');
connect().then(()=>{startCleanup();app.listen(Number(process.env.PORT||4000),'127.0.0.1',()=>console.log('Coleciona+ API pronta'))}).catch(error=>{console.error(error);process.exitCode=1});
