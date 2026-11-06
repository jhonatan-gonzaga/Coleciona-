try {
  rs.status();
  print('Replica set já configurado');
} catch (error) {
  if (error.codeName !== 'NotYetInitialized') throw error;
  rs.initiate({_id:'rsColeciona',members:[
    {_id:0,host:'127.0.0.1:27017'},
    {_id:1,host:'127.0.0.1:27018'},
    {_id:2,host:'127.0.0.1:27019'}
  ]});
}
for (let i=0;i<60;i++) {
  try {if (rs.status().members.some(member=>member.stateStr==='PRIMARY')) { print('Primário pronto'); quit(0); }} catch (error) {if (error.codeName!=='NotYetInitialized') throw error;}
  sleep(1000);
}
throw new Error('Eleição do primário excedeu 60 s');
