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
      console.log('sending ', returnData.response);

      if(typeof returnData.responseData === "object"){
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
      var battle = AppData.battles[returnData.responseData.battle.id];
      battle.connections.forEach(function(con){
        console.log('sending via broadcast ',returnData.response);
        var user = AppData.Users[AppData.connections[con].userId];
        returnData.responseData.connectedUser = user;
        if(AppData.connections[con].readyState === 1){
          AppData.connections[con].send(JSON.stringify({"responseData":returnData.responseData, "response":returnData.response, "returnFunc":returnFunc}));
        } else {
          console.log("There is a socket that needs to be kilt in this battle");
          battle.connections.splice(battle.connections.indexOf(con),1);
          AppData.connections[con].terminate();
          delete AppData.connections[con];
        }
      });
    } else if(returnData.broadcast === "universe") {
      console.log(AppData.connections);
      for (var con in AppData.connections){
        console.log('Sending to every connection');
        var user = AppData.Users[AppData.connections[con].userId];
        returnData.responseData.connectedUser = user;
        if(AppData.connections[con].readyState === 1){
          AppData.connections[con].send(JSON.stringify({"responseData":returnData.responseData, "response":returnData.response, "returnFunc":returnFunc}));
        } else {
          console.log("There is a socket that needs to be kilt");
          AppData.connections[con].terminate();
          delete AppData.connections[con];
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
      if(msg.hasOwnProperty("request") && msg.request === "login"){
        var results = Auth.checkCredentials(msg);
        console.log(results);
        ws.userId = results.userId;
        this.respond(ws,msg.returnFunc, results.send);
        return; // go no futher until login is complete
      //if it is not asking to login, check the token.
      }

      if(msg.hasOwnProperty("request") && msg.request === "logout"){
        for(var b in AppData.battles){
          var battle = AppData.battles[b];
          for(var c in battle.commanders){
            if(c === AppData.connections[ws.id].userId){
              console.log("An active user has disconnected");
              battle.connections.splice(battle.connections.indexOf(c),1);
              console.log(battle.connections);
            }
          }
        }
        this.respond(ws,msg.returnFunc, {
          "response":"logedOut"
        });
        return;
      }

      var authData = Auth.isTokenValid(msg);
      if(!authData){
        this.respond(ws,msg.returnFunc,{"responseData":{"error":"Needs To Login"}, "response":"needsToLogin"});
        return;//stops from going futher gotta get that token checked out
      } else if(msg.hasOwnProperty("request") && msg.request === "checkToken"){
        this.respond(ws,msg.returnFunc,{"response":"tokenIsGood"});
      } else {
        //TODO NEEDS SOME KIND OF SECURITY CHWECK HERE
        console.log(authData);
        ws.userId = authData.userId;
      }

      if(msg){
        msg.wsId = ws.id;
        if(msg.hasOwnProperty("system")){
          //action could be setup or any other things. I need to modifiy the client to handle all of this correctly
          switch (msg.system){

            case "battle":
              console.log(msg.request);
              if(BattleAPI.hasOwnProperty(msg.request)){
                BattleAPI[msg.request](msg,this.respond.bind(this,ws,msg.returnFunc));
              }
              return;
            case "manage":
              console.log('None Yet');

            case "setup":
              console.log('Setting Up something;')
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
            console.log(battle.connections);
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
