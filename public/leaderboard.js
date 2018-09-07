
getLeaderboards();
function getLeaderboards(){
    let url = "/leaderboard/data";
    $.get(url)
    .done(function(data){
        console.log(data);
        if(data.users.length){
            for(let i = 0 ; i < data.users.length; i++){
                let ratio = (data.users[i].correctAnswers/(data.users[i].correctAnswers + data.users[i].wrongAnswers)) * 100; 
                appendText("#leaderboard" , "<div class='ui cards' id='leaderboards'><div class='card' id='end-result'><div class='content' id='player-content'><div class='header'>" + data.users[i].username + "</div><div class='meta'>Ratio : " + ratio + "%</div><div class='description'>Score : " + data.users[i].totalPoints + "</br><p>" + data.users[i].firstName + " " + data.users[i].lastName + "</p></div></div></div></div>");
            };
        };
    });
};

function appendText(element , text){
    $(element).append(text);
};