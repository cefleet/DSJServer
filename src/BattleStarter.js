const AppData = require("./AppData");
const CommanderStarter = require("./CommanderStarter");
const UnitStarter = require("./UnitStarter")
const uuidv4 = require('uuid/v4');

function BattleStarter(msg){
  var map;
  if(msg.hasOwnProperty("requestData")){
    map = AppData.DB.map[msg.requestData.mapId];
  };
  var user = AppData.Users[AppData.connections[msg.wsId].userId];

  var battle = {
    id:uuidv4(),
    commanders:{},
    units:{},
    activeUnit:null,
    battleLog:[],
    battleStarted:false,
    battleOver:false,
    isActive:true,
    map:map.id,
    isReady:false,
    connections:[]
  }

  //setup The User's Commander who started the battle
  var player = CommanderStarter(user);
  battle.commanders[player.id] = player;
  battle.commanders[player.id].playerIdent = "player1";

  //if there are units already.
  user.units.forEach(function(unitData,idx){

    var unit = UnitStarter(unitData);

    //if there is enough players
    if(map.player1StartLocations.length > idx){
      unit.onHex = map.player1StartLocations[idx];
      battle.units[unit.id] = unit;
      player.unitOrder.push(unit.id);
      unit.commander = player.id;


      battle.battleLog.push({
        "action":"UnitPlacedOnHex",
        "timestamp":Date.now(),
        "actionData":{
          "unit":unit.id,
          "hex":unit.onHex
        }
      })
    } 
  });

  //make the players unit the active unit
  battle.activeUnit = player.unitOrder[0];

  if(map.type === "pve"){
    var monsters = CommanderStarter(map.monsterCommander);
    battle.commanders[monsters.id] = monsters;

    map.monsterCommander.units.forEach(function(unitData){
      var unit = UnitStarter(unitData);
      battle.units[unit.id] = unit;
      monsters.unitOrder.push(unit.id);
      unit.commander = monsters.id;
      battle.battleLog.push({
        "action":"UnitPlacedOnHex",
        "timestamp":Date.now(),
        "actionData":{
          "unit":unit.id,
          "hex":unit.onHex
        }
      })
    });

    //It is now ready
    battle.isReady = true;
  } else {
    battle.commanders[player.id].ready = false;
    battle.waitingOnPlayer = true;
  }

  return battle;
}

module.exports = BattleStarter;
