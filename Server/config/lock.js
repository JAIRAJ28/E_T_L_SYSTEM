const {getRedis}=require("./redis");
const config = require("./index");

async function acquireLock(key,ttlSec=config.import.runLockTtlSec){
    const redis=getRedis()
    const value = `${Date.now()}-${Math.random()}`;
    const ok = await redis.set(key, value, "NX", "EX", ttlSec);
    return ok ? value : null;
}

async function releaseLock(key,value){
    const redis = getRedis();
    const lua = `
    if redis.call("GET", KEYS[1]) == ARGV[1]
        then
        return redis.call("DEL", KEYS[1])
        else
        return 0
        end
    `;
    try 
    {
      await redis.eval(lua, 1, key, value);
    } 
    catch (error)
    {
      console.error("[Lock] release error:", e?.message || e); 
    }
}
module.exports = { acquireLock, releaseLock };
