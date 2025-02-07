const uuidv4 = require('uuid/v4');
const AppData = require("./AppData.js");
const fs = require("fs");
const UserHandler = require("./UserHandler");

const SetupAPI = {
  getDatabaseStatus(msg, next){
    //TODO it will not always be behind... dur
    next({"response":"databaseStatus", "responseData":"behind"});
  },
  getAllDatabase(msg,next){
    next({"response":"updatedDatabase", "responseData":AppData.DB});
  },

  getAllBattles(msg,next){
    var battles = [];

    var hostId;
    for(var b in AppData.battles){
      var hostName = "";
      if(!AppData.battles[b].private){
        var i = 0;
        for(var c in AppData.battles[b].commanders){// should be only one at this time
          var tag = "";
          if(i ===1){
            tag = " VS ";
          } else {
            hostId = c;
          }
          var name;

          hostName += tag+AppData.battles[b].commanders[c].name;
          i++;
        }

        battles.push({
          battle:b,
          map:AppData.battles[b].map,
          hostName:hostName,
          hostId:hostId
        });
        console.log(battles);
      }
    }
    next({"response":"fullBattleList", "responseData":battles})
  },

  getAllPVPBattles(msg,next){
    var battles = [];
    for(var b in AppData.battles){
      var hostName = "";
      if(AppData.battles[b].waitingOnPlayer && !AppData.battles[b].private){//only pvp has waiting on player at this time
        for(var c in AppData.battles[b].commanders){// should be only one at this time
          hostName = AppData.Users[c].username;
        }
        battles.push({
          battle:b,
          map:AppData.battles[b].map,
          hostName:hostName,
          hostId:c
        });
      }
    }
    next({"response":"pvpBattleList", "responseData":battles})
  },

  getCommanderData(msg,next){

    var user = AppData.Users[AppData.connections[msg.wsId].userId];

    if(!user){
      if(fs.existsSync("Users/"+AppData.connections[msg.wsId].userId+".db")){
        user = JSON.parse(fs.readFileSync("Users/"+AppData.connections[msg.wsId].userId+".db"));
        AppData.Users[AppData.connections[msg.wsId].userId] = user;
      } else {
        next({"response":"tokenBad"});
        return;
      }
    }
    var activeBattle = null;

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
  },

  skipTutorials : function(msg, next){
    var maps = ["586d621d-5770-408e-8e83-12ba47c39527","586d621d-5770-409e-8e83-12ba67c4527"];
    console.log(msg);
    var user = AppData.Users[AppData.connections[msg.wsId].userId];
    console.log(user);
    UserHandler.giveUserMapRewards(user.id,maps[0]);
    UserHandler.giveUserMapRewards(user.id,maps[1]);
    next({"response":"userData", "responseData":{user:user}})

  }
}

module.exports = SetupAPI;
