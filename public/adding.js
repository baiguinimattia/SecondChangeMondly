$("#add-exercise").click(function(event){
    let url = "/game/add";
    let game = {};
    
    if($("#statement").val() != ""){
        game.statement = $("#statement").val();
    };
    if($("#variant-one").val() != ""){
        game.variantOne = $("#variant-one").val();
    };
    if($("#variant-two").val() != ""){
        game.variantTwo = $("#variant-two").val();
    };
    if($("#variant-three").val() != ""){
        game.variantThree = $("#variant-three").val();
    };
    if($("#variant-for").val() != ""){
        game.variantFor = $("#variant-for").val();
    };   
    if($("#response").val() != ""){
        game.response = $("#response").val();
    }
    if($("#image").val() != ""){
        game.image = $("#image").val();
    };
    if($("#instruction").val() != ""){
        game.instruction = $("#instruction").val();
    };
    if($("#index").val() != ""){
        game.index = $("#index").val();
    };
    if($("#type").val() != ""){
        game.type = $("#type").val();
    };
    if($("#language").val() != ""){
        game.language = $("#language").val();
    };

    $.post(url , { game : game} , function( data ){
        
    });

});