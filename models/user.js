var mongoose = require("mongoose")
var passportLocalMongoose = require("passport-local-mongoose");

var UserSchema  = new mongoose.Schema({
    username : String,
    password : String,
    nativeLanguage : String,
    firstName : String,
    lastName : String,
    totalPoints : {type : Number , default : 0},
    previousGames : { type : Array , default : []},
    correctAnswers : {type : Number , default : 0},
    wrongAnswers : {type : Number , default : 0}
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User" , UserSchema);