const jwt = require('jsonwebtoken');
const fs = require("fs");
const AppData = require("./AppData.js");
const UserHandler = require("./UserHandler");

const uuidv4 = require('uuid/v4');



const Auth = {
  cert : fs.readFileSync('cert'),

  isTokenValid:function(msg){
    var decoded;
    if(!msg.token || msg.token == "undefined"){
      return false;
    } else {
      //  var cert =   fs.readFileSync('cert')// get public key
      try {
        decoded = jwt.verify(msg.token, this.cert);
      } catch(err){
        return false;
      }
      return decoded;
    }
  },

checkCredentials:function(msg, next){
  //its so bad its painful... =)
  var users = AppData.Users;
  var found = false;
  for(u in users){
    if(users[u].username === msg.requestData.username && msg.requestData.email === users[u].email) {
      found = true;

      return {
        "status":"success",
        "userId":u,
        "send":{"response":"applyToken","responseData":jwt.sign({"type":"player", "userId":u}, this.cert)}
      };
    }
  }
  if(!found){
    function validateEmail(email) {
      var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      return re.test(String(email).toLowerCase());
    }

    if(validateEmail(msg.requestData.email)){
      var newUser = true;
      //apaling doing it tis way
      for(var u in AppData.Users){
        if(AppData.Users[u].email === msg.requestData.email ||
          AppData.Users[u].username === msg.requestData.username
        ) {
          newUser = false;
        }
      }
      if(newUser){
        var id = uuidv4();
        console.log("newID ....",id)
        UserHandler.createNewUser(msg.requestData.email,msg.requestData.username,id);
        return {
          "status":"success",
          "userId":id,
          "send":{"response":"applyToken","responseData":jwt.sign({"type":"player", "userId":id}, this.cert)}
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
