import express from 'express';
import {fileURLToPath} from 'node:url';
import {createApi} from './api.mjs';
const app=express(),dist=fileURLToPath(new URL('../dist',import.meta.url));
app.use('/api',createApi());
app.use(express.static(dist));
app.get('*',(_req,res)=>res.sendFile(dist+'/index.html'));
const port=Number(process.env.PORT)||3000;
app.listen(port,'127.0.0.1',()=>console.log('TropiVoxel Studio: http://127.0.0.1:'+port));
