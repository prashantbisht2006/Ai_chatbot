import cors from "cors";
import "dotenv/config";
import { apikey } from "./serverClient";
import express from "express";


const app = express();
app.use(express.json());
app.use(cors({origin:"*"}));

app.get("/",(req,res)=>{
    res.json({
        message:"ai chatbot server is running",
        apiKey:apikey,
    })
})


const port = process.env.PORT || 300;

app.listen(port,()=>{
    console.log('server is running')
})