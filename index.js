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

let Game = require("./models/game");
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

app.get("/add" , function(req , res){
    res.render("adding");
});

app.post("/game/add" , function(req , res){
    addGame(req.body.game);
});

app.get("/leaderboards" , function(req , res){
    res.render("leaderboard");
});

app.get("/leaderboard/data" , function(req , res){
    getLeaderboards(function(users){
        res.send({users : users});
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
// getCountriesList();
// function getCountriesList(){
//     let countries = "Afrikaans|af,Albanian|sq,Amharic|am,Arabic|ar,Armenian|hy,Azeerbaijani|az,Basque|eu,Belarusian|be,Bengali|bn,Bosnian|bs,Bulgarian|bg,Catalan|ca,Cebuano|ceb,Chinese(Simplified)|zh-C,Chinese(Traditional)|zh-T,Corsican|co,Croatian|hr,Czech|cs,Danish|da,Dutch|nl,English|en,Esperanto|eo,Estonian|et,Finnish|fi,French|fr,Frisian|fy,Galician|gl,Georgian|ka,German|de,Greek|el,Gujarati|gu,Haitian|Creole|ht,Hausa|ha,Hawaiian|haw,Hebrew|he,Hindi|hi,Hmong|hmn,Hungarian|hu,Icelandic|is,Igbo|ig,Indonesian|id,Irish|ga,Italian|it,Japanese|ja,Javanese|jw,Kannada|kn,Kazakh|kk,Khmer|km,Korean|ko,Kurdish|ku,Kyrgyz|ky,Lao|lo,Latin|la,Latvian|lv,Lithuanian|lt,Luxembourgish|lb,Macedonian|mk,Malagasy|mg,Malay|ms,Malayalam|ml,Maltese|mt,Maori|mi,Marathi|mr,Mongolian|mn,Myanmar (Burmese)|my,Nepali|ne,Norwegian|no,Nyanja (Chichewa)|ny,Pashto|ps,Persian|fa,Polish|pl,Portuguese (Portugal,Brazil)|pt,Punjabi|pa,Romanian|ro,Russian|ru,Samoan|sm,Scots Gaelic|gd,Serbian|sr,Sesotho|st,Shona|sn,Sindhi|sd,Sinhala (Sinhalese)|si,Slovak|sk,Slovenian|sl,Somali|so,Spanish|es,Sundanese|su,Swahili|sw,Swedish|sv,Tagalog (Filipino)|tl,Tajik|tg,Tamil|ta,Telugu|te,Thai|th,Turkish|tr,Ukrainian|uk,Urdu|ur,Uzbek|uz,Vietnamese|vi,Welsh|cy,Xhosa|xh,Yiddish|yi,Yoruba|yo,Zulu|zu}";
//     let helper = countries.split(",");
//     let arrayCountries = new Array();
//     var i;
//     for( i = 0 ; i < helper.length ; i++){
//         let aux = helper[i].split("|");
//         let newCountry = {};
//         newCountry.name = aux[0];
//         newCountry.tag = aux[1];
//         Country.create(newCountry , function(err , newCountry){
//             if(err){
//                 console.log(err);
//             }
//             else{
//                 console.log(newCountry);
//             };
//         });
//     };

    
// };  

clearDatabase();

let minimumNumberOfPlayers = 2;
let numberOfGames = 5;
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
                    io.to(foundSocket.socketId).emit("sending lobby data" , {lobby : foundLobby , message : "from specific room room"});                
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
                foundLobby.pressedReady = [];
                updateLobby(foundLobby);
                socket.join("room-"+ foundLobby.roomNo);
                socket.to('room-' + foundLobby.roomNo).emit('new user joined', {message : "User " + foundSocket.username + " joined this room" });
                io.in('room-' + foundLobby.roomNo).emit("sending lobby data" , {lobby : foundLobby , message : "from join specific room"});
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
                foundLobby.pressedReady = [];
                updateSocket(foundSocket);
                removeSocketFromRoom(foundSocket , foundLobby , function(updatedLobby){
                    updateLobby(updatedLobby);
                    socket.to('room-' + updatedLobby.roomNo).emit("sending lobby data" , {lobby : updatedLobby , message : "from pressed leave"});                
                    removeEmptyRooms();
                });
                socket.to('room-' + foundLobby.roomNo).emit('user left lobby', {message :  "User " + foundSocket.username + " left this lobby"});
                socket.leave("room-" + foundLobby.roomNo);
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
                if(foundLobby.pressedReady.length === foundLobby.sockets.length && foundLobby.sockets.length >= minimumNumberOfPlayers){
                    foundLobby.ifInGame = true;
                    updateLobby(foundLobby);
                    io.to(foundSocket.socketId).emit('game can begin' , {timer : 5 , username : foundSocket.username});
                }
                else{
                    if(foundLobby.pressedReady.length === foundLobby.sockets.length && foundLobby.sockets.length < minimumNumberOfPlayers ){
                        io.to(foundSocket.socketId).emit('all ready but not enough players');
                    };
                };
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
    socket.on("begin timer" , function(data){
        findSocketById(socket.id , function(foundSocket){
            getLobbyByRoom(foundSocket.roomNo , function(foundLobby){
                io.in('room-' + foundLobby.roomNo).emit('sending timer', {timer : data.timer});
            })

        });

    });

    socket.on("send timer" , function(data){
        findSocketByUsername(data.username , function(foundSocket){
            io.to(foundSocket.socketId).emit('sending timer', {timer : data.timer});
            foundSocket.correctResponses = 0;
            foundSocket.wrongResponses = 0;
            updateSocket(foundSocket);
            getLobbyByRoom(foundSocket.roomNo , function(foundLobby){
                updateSocketInLobby(foundSocket , foundLobby);
            });
        });

    });

    socket.on("send lobby data" , function(data){
        findSocketById(socket.id , function(foundSocket){
            getLobbyByRoom(foundSocket.roomNo , function(foundLobby){
                io.in('room-' + foundLobby.roomNo).emit('sending players', {lobby : foundLobby});
            });
        });
    });

    socket.on("request games" , function(data){
        findSocketByUsername(data.username , function(foundSocket){
            getLobbyByRoom(foundSocket.roomNo , function(foundLobby){
                getGamesByLanguage(foundLobby.language , function(foundGames){
                    pickGames(foundGames , numberOfGames , function(pickedGames){
                        if(foundGames.length){
                            foundLobby.pickedGames = pickedGames;
                            updateLobby(foundLobby);
                            io.to(foundSocket.socketId).emit('sending games list', {games : pickedGames});
                        };
                    });
                });
            });
        });
    });

    socket.on("send first game" , function(data){
        findSocketById(socket.id , function(foundSocket){
            getLobbyByRoom(foundSocket.roomNo , function(foundLobby){
                io.in('room-' + foundLobby.roomNo).emit('first game', { game : data.games[foundLobby.currentGame]});
                foundLobby.currentGame += 1;
                updateLobby(foundLobby);
            });
        });
    });

    socket.on("correct response" , function(data){
        findSocketById(socket.id , function(foundSocket){
            getLobbyByRoom(foundSocket.roomNo , function(foundLobby){
                if(foundSocket.bonus === true){
                    foundSocket.score += 11;
                }
                else{
                    foundSocket.score +=9;
                };
                foundSocket.bonus = true;
                foundSocket.correctResponses += 1;
                foundLobby.waiting.push(foundSocket.username);
                if(foundLobby.waiting.length === foundLobby.sockets.length){
                    foundLobby.waiting = [];
                    io.to(foundSocket.socketId).emit('send next game' , {username : foundSocket.username});
                }
                else{
                    io.to(foundSocket.socketId).emit('wait for the other players');
                };
                updateSocket(foundSocket);
                updateSocketInLobby(foundSocket , foundLobby);
            });
        });
    });

    socket.on("wrong response" , function(data){
        findSocketById(socket.id , function(foundSocket){
            getLobbyByRoom(foundSocket.roomNo , function(foundLobby){
                foundSocket.bonus = false;
                foundSocket.wrongResponses += 1;
                foundLobby.waiting.push(foundSocket.username);
                if(foundLobby.waiting.length === foundLobby.sockets.length){
                    foundLobby.waiting = [];
                    io.to(foundSocket.socketId).emit('send next game' , {username : foundSocket.username});
                }
                else{
                    io.to(foundSocket.socketId).emit('wait for the other players');
                };
                updateSocket(foundSocket);
                updateSocketInLobby(foundSocket , foundLobby);
            });
        });
    });

    socket.on("send next game" , function(data){
        findSocketById(socket.id , function(foundSocket){
            getLobbyByRoom(foundSocket.roomNo , function(foundLobby){
                if(isEmpty(foundLobby.pickedGames[foundLobby.currentGame])){
                    io.in('room-' + foundLobby.roomNo).emit('game ended' , { lobby : foundLobby});
                }
                else{
                    if(foundLobby.currentGame === foundLobby.pickedGames.length){
                        io.in('room-' + foundLobby.roomNo).emit('sending next game', { game : foundLobby.pickedGames[foundLobby.currentGame] , last : true});
                    }
                    else{
                        io.in('room-' + foundLobby.roomNo).emit('sending next game', { game : foundLobby.pickedGames[foundLobby.currentGame] , last : false});
                    };
                    foundLobby.currentGame += 1;
                    updateLobby(foundLobby);
                };

            });
        });
    });

    socket.on("update data" , function(data){
        findSocketById(socket.id , function(foundSocket){
            getLobbyByRoom(foundSocket.roomNo , function(foundLobby){
                findUserByUsername(foundSocket.username , function(foundUser){
                    foundUser.totalPoints += foundSocket.score;
                    foundUser.correctAnswers += foundSocket.correctResponses;
                    foundUser.wrongAnswers += foundSocket.wrongResponses;
                    let game = {};
                    game.players = foundLobby.sockets;
                    foundUser.previousGames.push(game);
                    updateUser(foundUser);
                });
                socket.leave("room-" + foundLobby.roomNo);
            });
        });
    });



    socket.on("disconnect" , function(){
        findSocketById(socket.id , function(foundSocket){
            if(foundSocket.roomNo != undefined){
                getLobbyByRoom(foundSocket.roomNo , function(foundLobby){
                    if(foundLobby != undefined){
                        foundLobby.pressedReady = [];
                        updateLobby(foundLobby);
                        removeSocketFromRoom(foundSocket , foundLobby , function(updatedLobby){
                            updateLobby(updatedLobby , function(update){
                                socket.to('room-' + update.roomNo).emit("sending lobby data" , {lobby : update , message : "from disconnect"});  
                            });
                        });

                        socket.to('room-' + foundLobby.roomNo).emit('user left lobby', {message :  "User " + foundSocket.username + " left this lobby"});
                        removeSocket(foundSocket);
                        removeEmptyRooms();
                    };
                });
            };

        });        
    }); 
});

function getLeaderboards(callback){
    User.find({} , function(err , foundUsers){
        if(err){
            console.log(err);
        }
        else{
            if(foundUsers){
                orderArray(foundUsers , function(orderedUsers){
                    if(orderedUsers.length < 10){
                        console.log(orderedUsers);
                        callback(orderedUsers);
                    }
                    else{
                        orderedUsers = orderedUsers.splice(0 , orderedUsers.length - 10);
                        callback(orderedUsers);
                    };

                });
            };
        };
    });
};

function orderArray(array , callback){
    var i , j;
    for(i = 0 ; i < array.length - 1 ; i++){
        for(j = i + 1 ; j < array.length ; j++){
            if(array[i].totalPoints < array[j].totalPoints){
                let aux = array[i];
                array[i] = array[j];
                array[j] = aux;
            }
        };
    };
    if(i === array.length - 1 && j === array.length){
        callback(array);
    };
};

function updateUser(user){
    User.findByIdAndUpdate(user._id , user , function(err , updatedUser){
        if(err){
            console.log(err);
        }
        else{
            console.log("user updated");
        }
    });
;}

function getGamesByLanguage(language , callback){
    Game.find({language : language} , function( err , foundGames){
        if(err){
            console.log(err);
        }
        else{
            if(foundGames.length){
                callback(foundGames);
            }
            else{
                console.log("no game");
            };
        };
    });
};

function updateSocketInLobby(socket , lobby){
    for(let i =0 ; i < lobby.sockets.length ; i++){
        if(lobby.sockets[i].username === socket.username){
            lobby.sockets[i] = socket;
            updateLobby(lobby);
        };
    };
};

function pickGames(games , numberOfRequiredGames , callback){
    if( games.length < numberOfRequiredGames ){
        callback(games);
    }
    else{
        let gameList = [];
        let gameIds = new Array(games.length).fill(0);
        let i = 0;
        console.log("vin games" , games);
        while( i < numberOfRequiredGames ){
            getRandomInt(games.length , function(number){
                if(gameIds[number] === 0){
                    console.log("vine number " ,number , games[number]);
                    gameList.push(games[number]);
                    gameIds[number] = 1;
                    i++;
                };
            });
        };
        if(i === numberOfRequiredGames){
            callback(gameList);
        };
    };
};

function getRandomInt(max , callback) {
    callback(Math.floor(Math.random() * Math.floor(max)));
}


function findSocketByUsername(username , callback){
    Socket.find({username : username} , function(err , foundSocket){
        if(err){
            console.log(erer);
        }
        else{
            callback(foundSocket[0]);
        };
    });
};


function resetReadyStatus(lobby , callback){
    lobby.pressedReady = [];
    Lobby.findByIdAndUpdate(lobby._id , lobby , function(err , updatedLobby){
        if(err){
            console.log(err);
        }
        else{
            callback(updatedLobby);
        };
    });
};

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

function removeSocketFromRoom(socket , room , callback){
    if(room != undefined){
        for(let i = 0 ; i < room.sockets.length ; i++){
            if(room.sockets[i].socketId === socket.socketId){
                room.sockets.splice(i , 1);
                callback(room);
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
            var i ;
            let lobbiesList = [];
            for(i = 0 ; i < foundLobbies.length ; i++){
                if(foundLobbies[i].ifInGame === false){
                    lobbiesList.push(foundLobbies[i]);
                };
            };
            if(i === foundLobbies.length ){
                callback(lobbiesList);
            };

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

function updateLobby(lobby , callback){
    if(callback === undefined){
        callback = function(){

        };
    };
    Lobby.findByIdAndUpdate(lobby._id , lobby ,  function(err , foundLobby){
        if(err){
            console.log(err);
        }
        else{
            callback(foundLobby);
        };
    });
};

function findSocketById(id , callback){
    Socket.find({ socketId : id} , function(err , foundSocket){
        if(err){
            console.log(err);
        }
        else{
            if(foundSocket === undefined){
                console.log("e undefined");
            }
            else{
                callback(foundSocket[0]);
            };
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


function addGame(data){
    let newGame = {};
    newGame.statement = data.statement;
    newGame.response = data.response;

    newGame.variants = [];
    if(data.variantOne){
        newGame.variants.push(data.variantOne);
    };
    if(data.variantTwo){
        newGame.variants.push(data.variantTwo);
    };
    if(data.variantThree){
        newGame.variants.push(data.variantThree);
    };
    if(data.variantFor){
        newGame.variants.push(data.variantFor);
    };
    if(data.index){
        newGame.index = data.index;
    };
    if(data.instruction){
        newGame.instruction = data.instruction;
    };
    if(data.image){
        newGame.image = data.image;
    };
    if(data.type){
        newGame.type = data.type;
    };
    if(data.language){
        newGame.language = data.language;
    };
    Game.create(newGame,function( error, newGame){
        if(error){
                console.log(error);
        }
        else{
                console.log("Game created");
        };
    });
};

function translateText(text , target , callback){
    translate
    .translate(text , target)
    .then(results=>{
        const translation = results[0];
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