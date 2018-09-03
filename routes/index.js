let express = require("express");
let  router = express.Router();
let  passport = require("passport");
let  User = require("../models/user");
let  middleware = require("../middleware/index.js");


router.get("/main" , function(req , res){
    res.render("main" , { currentUser : req.user});
});

//authentication routes
//register

router.post("/register" , function( req , res){
        let newUser = new User({username: req.body.username , nativeLanguage : req.body.language , firstName : req.body.firstname , lastName : req.body.lastname});
        User.register(newUser , req.body.password , function( error , user){
            if(error){
                req.flash("error" , error.message);
                res.redirect("back");
            }
            passport.authenticate("local")( req , res , function(){
                req.flash("success" , "You have registered succesfully!");
                res.redirect("/main");
            })
        });
});

router.post("/login" , passport.authenticate("local" , {successRedirect : "/main" , failureRedirect : "/login" , failureFlash: true , successFlash: 'Welcome!'  }), function(req , res ){
    
});

router.get("/logout" , middleware.isLoggedIn , function(req , res){
    req.logout();
    req.flash("error" , "Logged you out!");
    res.redirect("/main");
});

module.exports = router;
