// Minimal PeerJS-compatible signalling relay for local testing: node broker.js [port]
const http=require('http'),crypto=require('crypto');
const clients=new Map();
const srv=http.createServer((q,r)=>{r.writeHead(404);r.end();});
function send(sock,obj){const p=Buffer.from(JSON.stringify(obj));let h;
  if(p.length<126)h=Buffer.from([0x81,p.length]);else if(p.length<65536){h=Buffer.alloc(4);h[0]=0x81;h[1]=126;h.writeUInt16BE(p.length,2);}else{h=Buffer.alloc(10);h[0]=0x81;h[1]=127;h.writeBigUInt64BE(BigInt(p.length),2);}
  sock.write(Buffer.concat([h,p]));}
srv.on('upgrade',(req,sock)=>{
  const u=new URL(req.url,'http://x');const id=u.searchParams.get('id');
  const key=req.headers['sec-websocket-key'];const acc=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+acc+'\r\n\r\n');
  if(clients.has(id)){send(sock,{type:'ID-TAKEN'});sock.end();return;}
  clients.set(id,sock);send(sock,{type:'OPEN'});console.log('open',id);
  let buf=Buffer.alloc(0);
  sock.on('data',d=>{buf=Buffer.concat([buf,d]);
    while(buf.length>=2){let len=buf[1]&127,off=2;if(len===126){len=buf.readUInt16BE(2);off=4;}else if(len===127){len=Number(buf.readBigUInt64BE(2));off=10;}
      const masked=buf[1]&128;const need=off+(masked?4:0)+len;if(buf.length<need)return;
      const op=buf[0]&15;let pl=buf.slice(off+(masked?4:0),need);if(masked){const m=buf.slice(off,off+4);pl=Buffer.from(pl.map((b,i)=>b^m[i%4]));}
      buf=buf.slice(need);
      if(op===8){sock.end();return;}
      if(op!==1)continue;
      const msg=JSON.parse(pl.toString());if(msg.type==='HEARTBEAT')continue;
      const dst=clients.get(msg.dst);console.log(msg.type,id,'->',msg.dst,dst?'':'(missing)');
      if(dst)send(dst,{type:msg.type,src:id,dst:msg.dst,payload:msg.payload});else send(sock,{type:'EXPIRE',src:msg.dst});
    }});
  sock.on('close',()=>{if(clients.get(id)===sock)clients.delete(id);});sock.on('error',()=>{});
});
srv.listen(+process.argv[2]||9777,()=>console.log('broker up'));
