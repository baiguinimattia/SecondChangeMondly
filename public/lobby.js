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
            $(".ui.cards").append("<div class='card'><div class='content'><div class='header'>" + data.lobbies[i].name + "</div><div class='meta'>Owner : " + data.lobbies[i].owner + "</div><div class='description'>Language permited : " + data.lobbies[i].language + "</div></div><div class='extra content'><div class='ui basic blue button' id='btn-room' data-type-room='" + data.lobbies[i].roomNo + "'>Join room</div></div></div>");
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
        console.log(data.lobby);
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

    socket.on("joined empty room" , function(data){
        appendText("#message-aria" , "<div class='ui vertical segment'><p>" + data.message + "</div>");
    });

    socket.on("new user joined" , function(data){
        appendText("#message-aria" , "<div class='ui vertical segment'><p>" + data.message + "</div>");
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
            appendText("#message-aria" , "<div class='ui vertical segment '><p class='right'>" + data.message + "</div>");
        }
        else{
            appendText("#message-aria" , "<div class='ui vertical segment '><p>" + data.message + "</div>");            
        }
    });

    socket.on("new message from someone else" , function(data){
        socket.emit("request translation" , { message : data.message , from : data.from , to : username});
    });

    socket.on("game can begin" , function(data){
        socket.emit("request games");
        socket.emit("send timer", {timer : data.timer});
    });

    socket.on("sending timer" , function(data){
        if(data.timer === 0){
            $('#chat-aria').transition('horizontal flip');
            $('#game-aria').transition('slide down');
        }
        else{
            $("#timer-message").text(data.timer);
            $('body').dimmer('show');
            setTimeout(function(){
                $('body').dimmer('hide');
                let timer = data.timer - 1;
                socket.emit("send timer" , { timer : timer})
            } , 1000)
        };

        
    });

    $("#leave-room").click(function(event){
        socket.emit("user pressed leave");
    }); 

    socket.on("user left lobby" , function(data){
        appendText("#message-aria" , "<div class='ui vertical segment '><p>" + data.message + "</div>");            
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

function appendReadyButtons(lobby , username , socket){

};