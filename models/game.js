var mongoose = require("mongoose")
 var GameSchema  = new mongoose.Schema({
    type : {type : String , default : "image recognition"},
    index : {type : Number , default : 0},
    instruction : String,
    statement : String,
    image : String,
    variants : {type : Array , default : []},
    response : String, 
    language : {type : String , default : "English"}
 });
 module.exports = mongoose.model("Game" , GameSchema); 