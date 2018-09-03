var mongoose = require("mongoose")

var CountrySchema  = new mongoose.Schema({
    name : String,
    tag : String
});

module.exports = mongoose.model("Country" , CountrySchema);