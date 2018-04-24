const uuidv4 = require('uuid/v4');
const AppData = require("./AppData.js");


const SetupAPI = {
  getDatabaseStatus(msg, next){
    //TODO it will not always be behind... dur
    next({"response":"databaseStatus", "responseData":"behind"});
  },
  getAllDatabase(msg,next){
    next({"response":"updatedDatabase", "responseData":AppData.DB});
  },

  getCommanderData(msg,next){
    //TODO if a password is added do not send the password.
    console.log(msg.wsId);
    console.log(AppData.connections);
    console.log(AppData.Users);
    
    var user = AppData.Users[AppData.connections[msg.wsId].userId];
    console.log(user);
    console.log("Here we need to see if there is an active battle");
    //TODO in the future looping through all the active battles is a really
    //really really bad idea
    var activeBattle = null;
    //AppData.battles.forEach(function(battle){
    for(var b in AppData.battles){
      var battle = AppData.battles[b];
      if(!battle.battleOver && battle.isActive){
        for(c in battle.commanders){
          if(c === AppData.connections[msg.wsId].userId){
            activeBattle = b;
          }
        }
      }
    }
  //  });
    next({"response":"userData", "responseData":{user:user,activeBattle:activeBattle}})
  },

  connected : function(msg, next){
    console.log('connected');
    var id;
    if(!msg.clientId || msg.clientId == "undefined"){
      id = uuidv4();
      //clientId is sent and kept
    }  else {
      id = msg.clientId;
    }
    //assign the client id to the websocket.
    if(msg.hasOwnProperty('wsId')){
      if(AppData.connections.hasOwnProperty(msg.wsId)){
        AppData.connections[msg.wsId].clientId = id;
      }
    }
      next({"response":"connectionConfirmed", "responseData":id});
  }
}

module.exports = SetupAPI;
