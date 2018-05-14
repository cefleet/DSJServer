const WebSocketServer = require('ws').Server;
const uuidv4 = require('uuid/v4');

const AppData = require("./AppData.js");

const Auth = require('./Auth.js');

const SetupAPI = require('./SetupAPI.js');
const BattleAPI = require('./BattleAPI.js');

class socket {

  constructor(options){
    this.wss = new WebSocketServer({ port:options.port });
  };

  parseJSON(msg){
    try {
      return JSON.parse(msg);
    } catch(ex){
      return null;
    }
  };

//ws and returnFunc comes from the binding
  respond(ws,returnFunc,returnData){

    if(!ws){
      return {"error":"The Websocket was lost"};
    }
    //if there is no broadcast it assumes single
    if(returnData.broadcast === "single" || !returnData.broadcast){

      if(typeof returnData.responseData === "object"){
        //redis
        var user = AppData.Users[ws.userId];
        returnData.responseData.connectedUser = user;
      }
      if(ws.readyState === 1){
        ws.send(JSON.stringify({"responseData":returnData.responseData, "response":returnData.response, "returnFunc":returnFunc}));
      }else{
        ws.terminate();
        console.log('They sent a request then disconected... how rude.. KILL IT');
      }
    } else if(returnData.broadcast === "all"){
      var removeList = [];
      var battle = AppData.battles[returnData.responseData.battle.id];
      if(!battle){
        return false;
      }
      battle.connections.forEach(function(con, idx){

        console.log('sending via broadcast ',returnData.response);
        //redis
        if(AppData.connections[con]){
          var user = AppData.Users[AppData.connections[con].userId];
          returnData.responseData.connectedUser = user;
          if(AppData.connections[con].readyState === 1){
            AppData.connections[con].send(JSON.stringify({"responseData":returnData.responseData, "response":returnData.response, "returnFunc":returnFunc}));
          } else {
            removeList.push(con);
          }
        }
        });
      var i = removeList.length-1;
      while(i > 0){
        if(AppData.connections[removeList[i]]){
          AppData.connections[removeList[i]].terminate();
          battle.connections.splice(battle.connections.indexOf(removeList[i]),1);
          delete AppData.connections[removeList[i]];
        }
        i--;
      }
    } else if(returnData.broadcast === "universe") {

      for (var con in AppData.connections){
        //redis
        var user = AppData.Users[AppData.connections[con].userId];
        returnData.responseData.connectedUser = user;
        if(AppData.connections[con].readyState === 1){
          AppData.connections[con].send(JSON.stringify({"responseData":returnData.responseData, "response":returnData.response, "returnFunc":returnFunc}));
        } else {
          console.log("There is a socket that needs to be kilt");
          if(AppData.connections[con]){
            AppData.connections[con].terminate();
            delete AppData.connections[con];
          }
        }
      }
    }
  };

  connectionCreated(ws){
    //gives the ws an id and saves the connection

    ws.id = uuidv4();
    AppData.connections[ws.id] = ws;

    //Handle All of the Messages
    ws.on('message', function incoming(message){
      var msg = this.parseJSON(message);
      //If it is requesting to login allow it to do so.
      if(!msg){
        console.log('The JSON was bad');
        return null;
      }

      if(msg.hasOwnProperty("request") && msg.request === "login"){
        var results = Auth.checkCredentials(msg);
        console.log(results);
        if(results && ws){
          ws.userId = results.userId;
          this.respond(ws,msg.returnFunc, results.send);
          return;
        } else {
          console.log('Some major error where there is no results')
        }
         // go no futher until login is complete
      //if it is not asking to login, check the token.
      }

      if(msg.hasOwnProperty("request") && msg.request === "logout"){
        for(var b in AppData.battles){
          var battle = AppData.battles[b];
          for(var c in battle.commanders){
            if(c === AppData.connections[ws.id].userId){
              console.log("An active user has disconnected");
              battle.connections.splice(battle.connections.indexOf(c),1);
            }
          }
        }
        this.respond(ws,msg.returnFunc, {
          "response":"logedOut"
        });
        return;
      }
      var authData;
      var isSpectator;
      if(msg.hasOwnProperty("isSpectator") && msg.isSpectator){
        isSpectator = true;
        authData = {
          userId:"spectator_"+uuidv4()
        }
      } else {
        authData = Auth.isTokenValid(msg);
      }
      if(!authData){
        this.respond(ws,msg.returnFunc,{"responseData":{"error":"Needs To Login"}, "response":"needsToLogin"});
        return;//stops from going futher gotta get that token checked out
      } else if(msg.hasOwnProperty("request") && msg.request === "checkToken" && !isSpectator){
        this.respond(ws,msg.returnFunc,{"response":"tokenIsGood"});
      } else {
        //TODO NEEDS SOME KIND OF SECURITY CHWECK HERE
        ws.userId = authData.userId;
      }

      if(msg){
        msg.wsId = ws.id;
        if(msg.hasOwnProperty("system")){
          switch (msg.system){

            case "battle":
              if(BattleAPI.hasOwnProperty(msg.request)){
                BattleAPI[msg.request](msg,this.respond.bind(this,ws,msg.returnFunc));
              }
              return;
            case "manage":
              return;
            case "setup":
              if(SetupAPI.hasOwnProperty(msg.request)){
                SetupAPI[msg.request](msg,this.respond.bind(this,ws,msg.returnFunc));
              }
              return;
            default:
              this.respond(ws,null,{
                "broadcast":"single", "data":{"error":"System Not Found"}
              });
              return;
          }
        } else {
          console.log('There is no Action. Therefore I can do nothing.');
        }
      } else {
        console.log('The JSON was bad');
      }
    }.bind(this));

    ws.on('close', function close(){
      for(var b in AppData.battles){
        var battle = AppData.battles[b];
        for(var c in battle.commanders){
          if(c === AppData.connections[ws.id].userId){
            console.log("An active user has disconnected");
            battle.connections.splice(battle.connections.indexOf(c),1);
          }
        }
      }
    }.bind(this));
  };

  startListening(){
    this.wss.on("connection", this.connectionCreated.bind(this));
  }
}
module.exports = socket;
