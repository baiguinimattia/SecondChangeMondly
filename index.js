let express = require("express");
let app     = express();

let bodyParser    = require("body-parser");
let mongoose      = require("mongoose");
let passport      = require("passport");
let localStrategy = require("passport-local");
let flash         = require("connect-flash");

let http = require("http").Server(app);
let io = require("socket.io")(http);

app.use(express.static("public"));
app.set("view engine" , "ejs");

let middleware = require("./middleware/index");
let userRoutes = require("./routes/index");

let Country = require("./models/country");
let User = require("./models/user");
let Socket = require("./models/socket");
let Lobby = require("./models/lobby");

mongoose.connect("mongodb://localhost:27017/challengeMondly" , {useNewUrlParser : true});

app.use(bodyParser.urlencoded({ extended : true}));
app.use(bodyParser.json());

app.use(flash());

app.use(require("express-session")({
    secret: "This is ok",
    resave : false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req , res , next){
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});

let Translate = require("@google-cloud/translate");
let projectId = "formidable-bank-214408";

let translate = new Translate({
    projectId : projectId
});

app.get("/" , function(req , res){
    res.render("main");
});

app.get("/main" , function(req , res){
    res.render("main");
});

app.get("/register" , function(req , res){
    res.render("register")
});

app.get("/login" , function(req , res){
    res.render("login")
});

app.get("/lobby" , middleware.isLoggedIn ,function(req , res){
    res.render("lobby")
});

app.get("/countries" , function(req , res){
    getCountries(function(arrayCountries){
        res.send(arrayCountries);
    });

});

function getCountries(callback){
    let arrayCountries = new Array();
    Country.find({} , function(err , foundCountries){
        if(err){
            console.log(err);
        }
        else{
            for(let i=0 ; i < foundCountries.length ; i++){
                    arrayCountries.push({title : foundCountries[i].name , code : foundCountries[i].tag});
            };
            callback(arrayCountries);
        };
    });
};
clearDatabase();
io.on("connection" , function(socket){

    socket.on("newUser" , function(data){
        removeEmptyRooms();
        newSocket(socket , data);
    });

    socket.on("create specific room" , function(data){
        findSocketById(socket.id,  function(foundSocket){
            createLobby(foundSocket , data , function(createdLobby){
                socket.join("room-"+ createdLobby.roomNo);
                getLobbyByRoom(createdLobby.roomNo , function(foundLobby){
                    io.to(foundSocket.socketId).emit("sending lobby data" , {lobby : foundLobby});                
                    io.to(foundSocket.socketId).emit("joined empty room" , { message : "You joined room " + foundLobby.roomNo + ", which is empty!"});
                });

            });
        });
    });


    socket.on("join specific room" , function(data){
        findSocketById(socket.id , function(foundSocket){
            getLobbyByRoom(data.room , function(foundLobby){
                foundSocket.roomNo = data.room;
                updateSocket(foundSocket);
                foundLobby.sockets.push(foundSocket);
                updateLobby(foundLobby);
                socket.join("room-"+ foundLobby.roomNo);
                socket.to('room-' + foundLobby.roomNo).emit('new user joined', {message : "User " + foundSocket.username + " joined this room" });
                io.in('room-' + foundLobby.roomNo).emit("sending lobby data" , {lobby : foundLobby});
                io.to(foundSocket.socketId).emit("new message" , {message : "You joined room " + foundLobby.name});
            });
        });
    });

    socket.on("send lobbies list" , function(data){
        getLobbiesByLang(data.language , function(foundLobbies){
            io.to(socket.id).emit("sending lobbies" , {lobbies : foundLobbies});
        });
    });

    socket.on("new message" , function(data){
        findSocketById(socket.id , function(foundSocket){
            getLobbyByRoom(foundSocket.roomNo , function(foundLobby){
                io.to(foundSocket.socketId).emit("new message" , {message : data.from + ": " + data.message , location : "right" });
                socket.to('room-' + foundLobby.roomNo).emit('new message from someone else', {message :  data.message , from : foundSocket.username, location : "left" });
            });
        });
    });

    socket.on("request translation" , function(data){
        findSocketById(socket.id , function(foundSocket){
            let language = foundSocket.nativeLanguage;
            getCountryTag(language , function(foundCountry){
                translateText(data.message , foundCountry , function(translatedText){
                    io.to(socket.id).emit("new message" , {message : data.from + ": " + translatedText , location : "left"});
                });
            });
        });
    });

    socket.on("user pressed leave" , function(data){
        findSocketById(socket.id , function(foundSocket){
            getLobbyByRoom(foundSocket.roomNo , function(foundLobby){
                let url = "/";
                foundSocket.roomNo = 0;
                updateSocket(foundSocket);
                removeSocketFromRoom(foundSocket , foundLobby);
                socket.to('room-' + foundLobby.roomNo).emit('user left lobby', {message :  "User " + foundSocket.username + " left this lobby"});
                socket.to('room-' + foundLobby.roomNo).emit("sending lobby data" , {lobby : foundLobby});                
                socket.leave("room-" + foundLobby.roomNo);
                removeEmptyRooms();
                io.to(socket.id).emit("reset page");
            });
        });
    });

    socket.on("is ready" , function(data){
        findSocketById(socket.id , function(foundSocket){
            getLobbyByRoom(foundSocket.roomNo , function(foundLobby){
                foundLobby.pressedReady.push({ username :foundSocket.username});
                updateLobby(foundLobby);
                socket.to('room-' + foundLobby.roomNo).emit('is ready', {username : foundSocket.username , lobby : foundLobby});
                if(foundLobby.pressedReady.length === foundLobby.sockets.length){
                    io.in('room-' + foundLobby.roomNo).emit('game can begin' , {timer : 5});
                }
            });
        });
    });

    socket.on("is not ready" , function(data){
        findSocketById(socket.id , function(foundSocket){
            getLobbyByRoom(foundSocket.roomNo , function(foundLobby){
                pressedUnready(foundSocket , foundLobby);
                socket.to('room-' + foundLobby.roomNo).emit('is not ready', {username : foundSocket.username , lobby : foundLobby});
            });
        });
    });

    socket.on("send timer" , function(data){
        findSocketById(socket.id , function(foundSocket){
            io.to(foundSocket.socketId).emit('sending timer', {timer : data.timer});
        });

    });

    socket.on("disconnect" , function(){
        findSocketById(socket.id , function(foundSocket){
            if(foundSocket.roomNo != undefined){
                getLobbyByRoom(foundSocket.roomNo , function(foundLobby){
                    if(foundLobby != undefined){
                        removeSocketFromRoom(foundSocket , foundLobby);
                        socket.to('room-' + foundLobby.roomNo).emit('user left lobby', {message :  "User " + foundSocket.username + " left this lobby"});
                        socket.to('room-' + foundLobby.roomNo).emit("sending lobby data" , {lobby : foundLobby});   
                    }

                });
            };
            removeSocket(foundSocket);
            removeEmptyRooms();
        });        
    }); 
});

function removeEmptyRooms(){
    getLobbies(function(foundRooms){
        foundRooms.forEach(function(room){
            if(!room.sockets.length){
                removeRoom(room);
            };
        });
    });

};

function pressedUnready(socket , lobby){
    for(let i = 0 ; i < lobby.pressedReady.length ; i++){
        if(lobby.pressedReady[i].username === socket.username){
            lobby.pressedReady.splice(i , 1);
            updateLobby(lobby);
        };
    };
};

function ifSocketReady(socket , lobby , callback){
    if(lobby.length > 0 ){
        var i;
        for(i = 0 ; i < lobby.pressedReady.length ; i++){
            if(lobby.pressedReady[i] === socket.username){
                callback(true);
            };
        };
        if(i === lobby.pressedReady.length){
            callback(false);
        }
    }
    else{
        callback(false);
    }

}

function removeRoom(room){
    Lobby.findByIdAndRemove(room._id , function(err){
        if(err){
            console.log(err);
        }
        else{
            console.log("Lobby succesfully removed");
        }
    });
};

function removeSocket(socket){
    Socket.findByIdAndRemove(socket._id , function(err){
        if(err){
            console.log(err);
        }
        else{
            console.log("Socket succesfully removed");
        }
    });
};

function removeSocketFromRoom(socket , room){
    if(room != undefined){
        for(let i = 0 ; i < room.sockets.length ; i++){
            if(room.sockets[i].socketId === socket.socketId){
                room.sockets.splice(i , 1);
                Lobby.findByIdAndUpdate(room._id , room , function(err , updatedRoom){
                    if(err){
                        console.log(err);
                    }
                    else{
                        console.log("socket removed from room");
                    };
                });
            };
        };
    };

};

function getCountryTag(country , callback){
    Country.find({name : country} , function(err , foundCountry){
        if(err){
            console.log(err);
        }
        else{
            console.log(foundCountry[0]);
            callback(foundCountry[0].tag);
        }
    });
}

function newSocket(socket , data){
    let newSocket = {};
    newSocket.socketId = socket.id;
    newSocket.username = data.username;
    newSocket.language = data.language;
    findUserByUsername(data.username , function(foundUser){
        newSocket.nativeLanguage = foundUser.nativeLanguage;
        Socket.create(newSocket , function(err , newSocket){
            if(err){
                console.log(err);
            }
            else{
                console.log("Socket created");
            };
        });
    });
};

function findUserByUsername(username , callback){
    User.find({username : username} , function(err , foundUser){
        if(err){
            console.log(err);
        }
        else{
            callback(foundUser[0]);
        };
    });
};

function createLobby(socket , data , callback){
    let newLobby = {};
    newLobby.name = data.name;
    newLobby.owner = data.username;
    newLobby.language = data.language
    getLobbies(function(foundLobbies){
        newLobby.roomNo = foundLobbies.length + 1;
        socket.roomNo = newLobby.roomNo;
        updateSocket(socket);
        newLobby.sockets = [];
        newLobby.sockets.push(socket);
        Lobby.create(newLobby , function(err , createdLobby){
            if(err){
                console.log(err);
            }
            else{
                callback(createdLobby);
            }
        });

    });
};

function getLobbies(callback){
    Lobby.find({} , function(err , foundLobbies){
        if(err){
            console.log(err);
        }
        else{
            callback(foundLobbies);
        };
    });
};

function getLobbiesByLang(language , callback){
    Lobby.find({language : language} , function(err , foundLobbies){
        if(err){
            console.log(err);
        }
        else{
            callback(foundLobbies);
        };
    });
};

function getLobbyByRoom(roomNo , callback){
    Lobby.find({roomNo : roomNo} , function(err , foundLobby){
        if(err){
            console.log(err);
        }
        else{
            callback(foundLobby[0]);
        };
    });
}

function updateSocket(socket){
    Socket.findByIdAndUpdate(socket._id , socket ,  function(err , foundSocket){
        if(err){
            console.log(err);
        }
        else{
            console.log("socket updated");
        };
    });
};

function updateLobby(lobby){
    Lobby.findByIdAndUpdate(lobby._id , lobby ,  function(err , foundLobby){
        if(err){
            console.log(err);
        }
        else{
            console.log("lobby updated" , foundLobby);
        };
    });
};

function findSocketById(id , callback){
    Socket.find({ socketId : id} , function(err , foundSocket){
        if(err){
            console.log(err);
        }
        else{
            callback(foundSocket[0]);
        };
    });
};

function clearDatabase(){
    Socket.deleteMany({} , function(err){
        if(err) console.log(err);
    });
    Lobby.deleteMany({} , function(err){
        if(err) console.log(err);
    });
};

app.use(userRoutes);
app.get("/*" , function(req , res){
    res.send("<h1>Error 404! Page not found!</h1>");
});

function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
};
function translateText(text , target , callback){
    translate
    .translate(text , target)
    .then(results=>{
        const translation = results[0];
        console.log(translation);
        callback(translation); 
    })
    .catch(err => {
        // console.log("Error:" , err);
        console.log("we have an error " + err.message);
    });
};

http.listen(3000 , function(){
    console.log("Connection to server established");
});