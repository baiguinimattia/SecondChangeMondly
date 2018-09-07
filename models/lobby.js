var mongoose = require("mongoose")

var LobbySchema  = new mongoose.Schema({
    name : String,
    roomNo : Number,
    language : String,
    owner : String,
    ifInGame : {type : Boolean , default : false},
    sockets : {type : Array , default : []},
    currentGame : {type : Number , default : 0}, 
    pressedReady : { type : Array , default : []},
    waiting : {type : Array , default : []},
    pickedGames : {type : Array , default : []}
});

module.exports = mongoose.model("Lobby" , LobbySchema);