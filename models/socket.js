var mongoose = require("mongoose")

var SocketSchema  = new mongoose.Schema({
    username : String,
    socketId : String,
    roomNo : {type : Number , default : 0},
    nativeLanguage : {type : String , default : "English"},
    language : String,
    score : {type : Number , default : 0},
    wrongResponses : {type : Number , default : 0},
    correctResponses : {type : Number , default : 0},
    bonus : {type : Boolean , default : false}
});

module.exports = mongoose.model("Socket" , SocketSchema);