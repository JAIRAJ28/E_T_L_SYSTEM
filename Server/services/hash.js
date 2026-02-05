const crypto = require("crypto");
function sha1(input){
    return crypto.createHash("sha1").update(String(input)).digest("hex")
}
module.exports={sha1}
