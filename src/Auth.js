const jwt = require('jsonwebtoken');
const fs = require("fs");
const AppData = require("./AppData.js");
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
    //  var cert = fs.readFileSync('cert');  // get private key
      //need user type and time?
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
      console.log('I can create a new user with this');
      console.log("Make sure username and e-mail do not exist");
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
        //this is the default user... needs to be stored elsewhere.
        var user = {
          "username":msg.requestData.username,
          "email":msg.requestData.email,
          "id":uuidv4(),
          "battles":[],
          "color":"G",
          "units":[
            {"name":"Player Healer","shard":"cbe0cae3-96bf-4eb8-90bd-50e09a89ae33","onHex":"4.2.-6","dragon":"a4005bcc-a2fb-477a-b32d-888712886181","rider":"8a4322ac-d2c6-4d36-b82a-ef7e703cf0da","weapon":"b39b05bd-f3ee-41a5-a4a2-8506533b7022"},
            {"name":"Player DPS","shard":"63df7cf6-d95a-479a-a616-323065c95c92","onHex":"3.6.-9","dragon":"08d37765-89a5-4e96-923d-792cedde52b4","rider":"726b1e68-f13a-47b3-aba3-92d2a5fd255f","weapon":"bee9a6cc-c3e5-4cc9-84d3-283726aaaf19"},
            {"name":"Player Support","shard":"3c794269-21bf-4d62-bf3a-37ed5df125b8","onHex":"-1.7.-6","dragon":"ff97bae6-369e-4df7-8953-a57275959319","rider":"4e52cb1c-db3e-4fb0-a8c3-3a1a0ae66ab7","weapon":"6c4abaa6-40ce-489b-8f91-1456e12b1160"}
          ],
          "riders":["8a4322ac-d2c6-4d36-b82a-ef7e703cf0da","726b1e68-f13a-47b3-aba3-92d2a5fd255f","4e52cb1c-db3e-4fb0-a8c3-3a1a0ae66ab7"],
          "dragons":["a4005bcc-a2fb-477a-b32d-888712886181","08d37765-89a5-4e96-923d-792cedde52b4","ff97bae6-369e-4df7-8953-a57275959319"],
          "weapons":["b39b05bd-f3ee-41a5-a4a2-8506533b7022","bee9a6cc-c3e5-4cc9-84d3-283726aaaf19","6c4abaa6-40ce-489b-8f91-1456e12b1160"],
          "maps":["586d621d-5770-408e-8e83-12ba47c39527","ec5ac2e5-54b7-437b-ad09-e94bc0f4334f"]
        } 

        AppData.Users[user.id] = user;
        //write the new user
        fs.writeFile('users.db', JSON.stringify(AppData.Users), 'utf8', function(){
          console.log('written');
        });
        return {
          "status":"success",
          "userId":user.id,
          "send":{"response":"applyToken","responseData":jwt.sign({"type":"player", "userId":user.id}, this.cert)}
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
