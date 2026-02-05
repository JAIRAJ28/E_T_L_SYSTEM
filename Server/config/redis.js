const IORedis = require("ioredis");
const config=require("./index");
let redis=null;

function getRedis(){
    if (redis) return redis
    redis=new IORedis(config.redis.url,{
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        lazyConnect: false,
    })
    redis.on("connect",()=>console.log("[Redis] connected"));
    redis.on("ready", () => console.log("[Redis] ready"));
    redis.on("error", (err) => console.error("[Redis] error:", err?.message || err));
    redis.on("close", () => console.log("[Redis] closed"));
    redis.on("reconnecting", () => console.log("[Redis] reconnecting..."));
    return redis
}

module.exports={getRedis}