const jwt = require('jsonwebtoken');
const fs = require("fs");
const AppData = require("./AppData.js");
const UserHandler = require("./UserHandler");

const uuidv4 = require('uuid/v4');
const cert = fs.readFileSync('cert');


const Auth = {
  isTokenValid:function(msg){
    var decoded;
    if(!msg.token || msg.token == "undefined"){
      return false;
    } else {
      //  var cert =   fs.readFileSync('cert')// get public key
      try {
        decoded = jwt.verify(msg.token, cert);
      } catch(err){
        return false;
      }
      return decoded;
    }
  },

checkCredentials:function(msg, next){
  //its so bad its painful... =)
  var found = false;
  if(AppData.UserCreds.hasOwnProperty(msg.requestData.email+":"+msg.requestData.username)){
    found = true;
    var u = AppData.UserCreds[msg.requestData.email+":"+msg.requestData.username].id;
    console.log(u);
    if(!AppData.Users.hasOwnProperty(u)){
      console.log('The Users is a real user just not loaded into memery right now. This is why I must use redis ASAP');
      AppData.Users[u] = JSON.parse(fs.readFileSync("Users/"+u+".db"));
    }
    return {
      "status":"success",   
      "userId":u,
      "send":{"response":"applyToken","responseData":jwt.sign({"type":"player", "userId":u}, cert)}
    };
  }

  /*
  for(u in users){
    if(users[u].username === msg.requestData.username && msg.requestData.email === users[u].email) {
      found = true;
      return {
        "status":"success",
        "userId":u,
        "send":{"response":"applyToken","responseData":jwt.sign({"type":"player", "userId":u}, cert)}
      };
    }
  }
  */
  if(!found){
    function validateEmail(email) {
      var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      return re.test(String(email).toLowerCase());
    }

    if(validateEmail(msg.requestData.email)){
      var newUser = true;

      for(var u in AppData.UserCreds){
        if(AppData.UserCreds[u].email === msg.requestData.email ||
          AppData.UserCreds[u].username === msg.requestData.username
        ) {
          newUser = false;
        }
      }

      if(newUser){
        var id = uuidv4();
        console.log("newID ....",id);
        UserHandler.createNewUser(msg.requestData.email,msg.requestData.username,id);

        AppData.UserCreds[msg.requestData.email+":"+msg.requestData.username] = {
          username:msg.requestData.username,
          id:id,
          email:msg.requestData.email
        }

        //save this file
        fs.writeFile("users.db",JSON.stringify(AppData.UserCreds), "utf8", function(err){
          if(err){
            console.log(err);
          } else {
            console.log('New User Creds Added');
          }
        });

        return {
          "status":"success",
          "userId":id,
          "send":{"response":"applyToken","responseData":jwt.sign({"type":"player", "userId":id}, cert)}
        };
      }
    } else {
      return {
          "status":"fail",
          "send":{"response":"needsToLogin", "responseData":{"error":"Incorrect Username or Password"}}
        }
    }
  }
}
}
module.exports = Auth;
