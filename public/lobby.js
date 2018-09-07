$(function () {
    var socket = io();
    let username = $("strong#username").text();
    
    socket.emit("newUser" , {username : username});

    $("#btn-find").click(function(event){
        let dropdown = $("#finding-dropdown");
        let language = dropdown[0][3 - dropdown[0].value].text;
        socket.emit("send lobbies list" , {language : language});
    });

    socket.on("sending lobbies" , function(data){
        $(".ui.cards").text("");
        var i ;
        for( i = 0 ; i < data.lobbies.length ; i++){
            if(data.lobbies[i].ifInGame === false){
                $(".ui.cards").append("<div class='card'><div class='content'><div class='header'>" + data.lobbies[i].name + "</div><div class='meta'>Owner : " + data.lobbies[i].owner + "</div><div class='description'>Language permited : " + data.lobbies[i].language + "</div></div><div class='extra content'><div class='ui basic blue button' id='btn-room' data-type-room='" + data.lobbies[i].roomNo + "'>Join room</div></div></div>");
            };

        };
        if(i === data.lobbies.length){
            $("div#btn-room.ui.basic.blue.button").click(function(event){
                    let room = $(this).attr("data-type-room");
                    socket.emit("join specific room" , {room : room} );
                    $("#choosing-section").fadeOut(500 , function(){
                        $("#lobby-list").fadeOut(500 , function(){
                            $('#chat-aria').transition('jiggle');
                        });

                    });

            });
            $("#lobby-list").fadeIn(500);
        };  
    });

    socket.on("sending lobby data" , function(data){
        $("#room-name").text(data.lobby.name);
        $("#player-list").text("");
        data.lobby.sockets.forEach(function(socket){
            if(socket.username === username){
                findIfReady(username , data.lobby.pressedReady , function(ifReady){
                    if(ifReady){
                        appendText("#player-list" , "<div class='card' id='player'><div class='card-header'>" + socket.username + "</div><div class='card-body'><p class='card-text'>Native Language : " + socket.nativeLanguage + "</p><p>Status : <button class='ui green button' id='ready-btn' usernameData='" + socket.username + "'><i class='play icon'></i>Ready</button></p></div></div>")
                    }
                    else{
                        appendText("#player-list" , "<div class='card' id='player'><div class='card-header'>" + socket.username + "</div><div class='card-body'><p class='card-text'>Native Language : " + socket.nativeLanguage + "</p><p>Status : <button class='ui red button' id='ready-btn' usernameData='" + socket.username + "'><i class='play icon'></i>Not ready</button></p></div></div>")
                    };
                });
                
            }
            else{
                findIfReady(username , data.lobby.pressedReady , function(ifReady){
                    if(ifReady){
                        appendText("#player-list" , "<div class='card' id='player'><div class='card-header'>" + socket.username + "</div><div class='card-body'><p class='card-text'>Native Language : " + socket.nativeLanguage + "</p><p>Status : <button class='ui green button disabled' id='ready-btn' usernameData='" + socket.username + "'><i class='play icon'></i>Not ready</button></p><a href='#' class='btn btn-primary' id='muted-btn'>Mute</a></div></div>");
                    }
                    else{
                        appendText("#player-list" , "<div class='card' id='player'><div class='card-header'>" + socket.username + "</div><div class='card-body'><p class='card-text'>Native Language : " + socket.nativeLanguage + "</p><p>Status : <button class='ui red button disabled' id='ready-btn' usernameData='" + socket.username + "'><i class='play icon'></i>Not ready</button></p><a href='#' class='btn btn-primary' id='muted-btn'>Mute</a></div></div>");
                    };
                });
                
            };    
        });
        $("button#ready-btn.ui.button").click(function(){
            if($(this).hasClass("red")){
                $(this).removeClass("red");
                $(this).addClass("green");
                $(this)[0].textContent = "Ready";
                socket.emit("is ready");
            }
            else{
                $(this).addClass("red");
                $(this).removeClass("green");
                $(this)[0].textContent = "Not ready";
                socket.emit("is not ready");
            };
        });
    });

    socket.on("is ready" , function(data){
        $("button#ready-btn.ui.button").each(function(){
            if($(this).attr("usernameData") === data.username){
                $(this).removeClass("red");
                $(this).addClass("green");
                $(this)[0].textContent = "Ready";
            };

        });
    });

    socket.on("is not ready" , function(data){
        $("button#ready-btn.ui.button").each(function(){
                if($(this).attr("usernameData") === data.username){
                    $(this).addClass("red");
                    $(this).removeClass("green");
                    $(this)[0].textContent = "Not ready";
                    $(this).attr("usernameData")
                };
            });
    });

    socket.on("all ready but not enough players" , function(data){
        $("#timer-message").text("Wait for more players");
        $('body').dimmer('show');
    });

    socket.on("joined empty room" , function(data){
        appendText("#message-aria" , "<div class='ui vertical segment'><div class='message-bubble'><p class='message-text'>" + data.message + "</p></div></div>");
    });

    socket.on("new user joined" , function(data){
        $('body').dimmer('hide');
        appendText("#message-aria" , "<div class='ui vertical segment'><div class='message-bubble'><p class='message-text'>" + data.message + "</p></div></div>");
    });



    $("#btn-create").click(function(event){
        let name = $("#lobby-name").val();
        $("#lobby-name").val("");
        let dropdown = $("#creation-dropdown");
        let language = dropdown[0][3 - dropdown[0].value].text;
        socket.emit("create specific room" , {username : username , name : name , language : language});
        $("#choosing-section").fadeOut(500 , function(){
            $("#lobby-list").fadeOut(500 , function(){
                $('#chat-aria').transition('jiggle');
            });
        });
    });

    $("#send-message").click(function(event){
        let message = $("#message").val()
        $("#message").val("");
        socket.emit("new message" , {from : username , message : message});
    });

    socket.on("new message" , function(data){
        if(data.location === "right"){
            appendText("#message-aria" , "<div class='ui vertical segment'><div class='message-bubble right'><p class='message-text'>" + data.message + "</p></div></div>");
        }
        else{
            appendText("#message-aria" , "<div class='ui vertical segment'><div class='message-bubble'><p class='message-text'>" + data.message + "</p></div></div>");
        }
    });

    socket.on("new message from someone else" , function(data){
        socket.emit("request translation" , { message : data.message , from : data.from , to : username});
    });

    socket.on("game can begin" , function(data){
        socket.emit("request games" , {username : data.username});
        socket.emit("begin timer", {timer : data.timer});
        socket.emit("send lobby data");
    });

    socket.on("sending games list" , function(data){
        if(data.games.length){
            socket.emit("send first game" , {games : data.games});
        };
    });

    socket.on("first game" , function(data){
        appendGame(data.game , function(){
                if(data.game.type === "image recognition"){
                    $(".btn-secondary#variant").click(function(){
                        if($(this).text() === data.game.response){
                            $(this).removeClass("btn-secondary");
                            $(this).removeClass("btn-danger");
                            $(this).addClass("btn-success");
                            socket.emit("correct response");
                        }
                        else{
                            $(this).removeClass("btn-secondary");
                            $(this).removeClass("btn-success");
                            $(this).addClass("btn-danger");
                            socket.emit("wrong response");
                        };
                        $(".btn#variant").each(function(){
                            $(this).unbind("click");
                        });
                        socket.emit("send lobby data");
                    });
                };
                if(data.game.type === "correct word"){
                    $("button.btn.btn-light#send").click(function(){
                        if($("#word").val() === data.game.response){
                            socket.emit("correct response");
                        }
                        else{
                            socket.emit("wrong response");
                        };
                        $(this).unbind("click");
                        socket.emit("send lobby data");
                    });
                };

        });
    });

    socket.on("wait for the other players" , function(data){
        $("#timer-message").text("Waiting for the other players to respond");
        $('body').dimmer('show');
    });

    socket.on("send next game" , function(data){
        if(data.username === username){
            socket.emit("send next game");
        };
    });

    socket.on("sending next game" , function(data){
        $('body').dimmer('hide');
        console.log("vine joc" , data.game);
        appendGame(data.game , function(){
            if(data.game.type === "image recognition"){
                $(".btn-secondary#variant").click(function(){
                    if($(this).text() === data.game.response){
                        $(this).removeClass("btn-secondary");
                        $(this).removeClass("btn-danger");
                        $(this).addClass("btn-success");
                        socket.emit("correct response");
                    }
                    else{
                        $(this).removeClass("btn-secondary");
                        $(this).removeClass("btn-success");
                        $(this).addClass("btn-danger");
                        socket.emit("wrong response");
                    };
                    $(".btn#variant").each(function(){
                        $(this).unbind("click");
                    });
                    socket.emit("send lobby data");
                });
            };
            if(data.game.type === "correct word"){
                $("button.btn.btn-light#send").click(function(){
                    if($("#word").val() === data.game.response){
                        socket.emit("correct response");
                    }
                    else{
                        socket.emit("wrong response");
                    };
                    $(this).unbind("click");
                    socket.emit("send lobby data");
                });
            };

    });
    });

    socket.on("game ended" , function(data){
        socket.emit("update data");
        $('body').dimmer('hide');
        appendLeaderboard(data.lobby , function(){
            $("#game-aria").transition('zoom');
            $("#leaderboard-area").transition('zoom');
        });
        
    }); 

    socket.on("sending players" , function(data){
        $("#player-game-list").text("");
        data.lobby.sockets.forEach(function(socket){
                appendText("#player-game-list" , "<div class='card' id='player'><div class='card-header'>" + socket.username + "</div><div class='card-body'><p class='card-text'>Score : " + socket.score + "</p></div></div>");            
        });
    });

    socket.on("sending timer" , function(data){
        if(data.timer === 0){
            $('#chat-aria').transition('horizontal flip' , function(){
                $(".ui.grid#game-aria").css("display"  , "flex");
            });

        }
        else{
            $("#timer-message").text(data.timer);
            $('body').dimmer('show');
            setTimeout(function(){
                $('body').dimmer('hide');
                let timer = data.timer - 1;
                socket.emit("send timer" , { timer : timer , username : username})
            } , 1000)
        };
    });


    $("#leave-room").click(function(event){
        socket.emit("user pressed leave");
    }); 

    socket.on("user left lobby" , function(data){
        appendText("#message-aria" , "<div class='ui vertical segment'><div class='message-bubble'><p class=message-text>" + data.message + "</p></div></div>");       
    });

    socket.on("redirect" , function(data){
        window.location = "http://localhost:3000" + data.url;
    });

    socket.on("reset page" , function(data){
        $("#chat-aria").fadeOut(1000 , function(){
            $("#message-aria").text("");
            $("#choosing-section").fadeIn(1000);
        });

    });
});

function forTimer(message , callback){

    setTimeout(function(){
        $("#timer-message").text = message;
        $('body').dimmer('show');
    } , 1000)
    $('body').dimmer('hide');
};

function appendText(element , text){
    $(element).append(text);
};

function findIfReady(username , array , callback){
    var i;
    let bool = false;
    for( i =0 ; i< array.length ; i++){
        if(username === array[i].username){
            bool = true;
            callback(bool);
        };
    };
    if(i === array.length){
        callback(bool);
    };
};

function appendGame(game , callback){
    if(game.type === "image recognition"){
        let buttons = "<button type='button' class='btn btn-secondary' id='variant'>" + game.variants[0] + "</button><button type='button' class='btn btn-secondary' id='variant'>" + game.variants[1] + "</button><button type='button' class='btn btn-secondary' id='variant'>" + game.variants[2] + "</button><button type='button' class='btn btn-secondary' id='variant'>" + game.variants[3] + "</button>";
        $("#question-section").text("");
        $("#response-section").text("");
        appendText("#question-section" , "<img src='/img/" + game.image + ".jpg' class='img-fluid'><p id='statement'>" + game.statement + "</p>");
        appendText("#response-section" , "<div class='btn-group' role='group' aria-label='Basic example'>" + buttons + "</div>");
        callback();
    };
    if(game.type === "correct word"){
        $("#question-section").text("");
        $("#response-section").text("");
        appendText("#question-section" , "<img src='/img/" + game.image + ".jpg' class='img-fluid'><p id='statement'>" + game.statement + "</p>");
        appendText("#response-section" , "<input type='text' name='word' id='word' placeholder='word'><button type='button' class='btn btn-light' id='send'>Confirm</button>");
        callback();
    }

};

function appendLeaderboard(lobby , callback){
    lobby.sockets.forEach(function(socket){
        console.log(socket);
        let ratio = (socket.correctResponses/(socket.correctResponses + socket.wrongResponses)) * 100;
        appendText("#results" , "<div class='ui cards' id='leaderboards'><div class='card' id='end-result'><div class='content' id='player-content'><div class='header'>" + socket.username + "</div><div class='meta'>Ratio : " + ratio + "%</div><div class='description'>Score : " + socket.score + "</div></div></div></div>");
    })
    callback()
};