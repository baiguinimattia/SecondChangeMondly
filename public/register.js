getCountries(function(data){
    $('.ui.search')
    .search({
      source: data,
      category : "code"
    });
});

function getCountries(callback){
    let url = "/countries";
    $.get(url)
    .done(function(data){
        callback(data);
    });
    
}

// $("#btn-register").click(function(event){
//     let firstName = $("#name").val();
//     let lastName = $("#last-name").val();
//     let username = $("#username").val();
//     let password = $("#password").val();
//     let nativeLanguage = $("#language").val();

//     let url = "/register";
//     $.post(url , { username : username , password : password , firstName : firstName , lastName : lastName , nativeLanguage : nativeLanguage} , function( data ){
        
//     });
// });
