const HexAPI = require("./HexAPI");
const AbilityCalculator = require("./AbilityCalculator");
const BattleStarter = require("./BattleStarter");
const UnitStarter = require("./UnitStarter");
const TurnHandler = require("./TurnHandler");
const AIHandler = require("./AIHandler");
const UserHandler = require("./UserHandler");
const CommanderStarter = require("./CommanderStarter");
const fs = require("fs");

const AppData = require("./AppData.js");

/*

CONSIDER MAKING THE BATTLE API NOT MUTATE ANY DATA.
 INSTEAD PASS ALL OF THAT OFF TO THE HANDLERS.
*/

const BattleAPI = {

  createBattle(msg, next){
    //create battle
    var battle = BattleStarter(msg);
    //add this active connection to the battle
    battle.connections.push(msg.wsId);
    //add battle to AppData. TODO Future this will be a save action to the DB
    AppData.battles[battle.id] = battle;

    UserHandler.giveBattleToUser(AppData.connections[msg.wsId].userId, battle.id);

    var gridKeys = AppData.DB.map[battle.map].keyMap;
    for(g in gridKeys){
      var nighs = HexAPI.getNeighbors(HexAPI.hex(g));
      gridKeys[g].neighbors = [];
      nighs.forEach(function(n){
        gridKeys[g].neighbors.push(n.q+'.'+n.r+'.'+n.s)
      });
    }

    //if it is pvp then we need to brodcast it to the world
    if(battle.waitingOnPlayer){
      next({"response":"battleCreated","responseData":{"battle":battle, "gridKeys":gridKeys}});
      if(!battle.private){
        next({"broadcast":"universe","response":"PVPBattleCreated","responseData":{}});
      }
    } else {
      next({"response":"battleCreated","responseData":{"battle":battle, "gridKeys":gridKeys}});
      if(!battle.private){
        next({"broadcast":"universe","response":"PVEBattleCreated","responseData":{}});
      }
    }
  },

  changePlayerStatus(msg,next){
    console.log(msg);
    var battle = AppData.battles[msg.requestData.battleId];
    if(!battle){
      next({"broadcast":"all","response":"battleErr","responseData":{"err":"Battle Not found"}})
      return;
    }
    var com = battle.commanders[msg.requestData.commander];
    if(AppData.connections[msg.wsId].userId === com.id){
      if(com.ready){
        com.ready = false;
      } else {
        com.ready = true;
      }
      var ready = true;
      for(var c in battle.commanders){
        if(!battle.commanders[c].ready){
          ready = false;
        }
      }
      if(ready){
        battle.isReady = true;
      } else {
        battle.isReady = false;
      }
      next({"broadcast":"all","response":"playerStatusChanged","responseData":{"battle":battle}})
    } else {
      console.log("somebody is trying to cheat");
    }
  },

  joinBattle(msg,next){
    var battle = AppData.battles[msg.requestData.battleId];

    if(!battle){

      console.log('No battle')
      next({"response":"BattleNotAvalible","responseData":{}});
      return false;
    }

    //this is joined as a spectator
    if(msg.requestData.joinAsSpectator && !battle.private){
      console.log('Im joing as spectatr');
      console.log(msg.wsId);
      battle.connections.push(msg.wsId);

      var gridKeys = AppData.DB.map[battle.map].keyMap;
      for(g in gridKeys){
        var nighs = HexAPI.getNeighbors(HexAPI.hex(g));
        gridKeys[g].neighbors = [];
        nighs.forEach(function(n){
          gridKeys[g].neighbors.push(n.q+'.'+n.r+'.'+n.s)
        });
      }

      next({"broadcast":"all","response":"spectatorJoined","responseData":{"battle":battle, "gridKeys":gridKeys}});
      return;
    }

    if(battle.waitingOnPlayer){
      battle.waitingOnPlayer = false;

      var user = AppData.Users[AppData.connections[msg.wsId].userId];

      //connect to the battle
      battle.connections.push(msg.wsId);

      var map = AppData.DB.map[battle.map];

      //TODO make this pickable in te future
      var newColor = "G";
      for(var com in battle.commanders){
        if(battle.commanders[com].shardColor=== "G"){
          newColor = "Y";
        }
      }

      var player = CommanderStarter(user);
      battle.commanders[player.id] = player;
      battle.commanders[player.id].playerIdent = "player2";
      battle.commanders[player.id].shardColor = newColor;
      battle.commanders[player.id].ready = false;
      //if there are units already.
      user.units.forEach(function(unitData,idx){
        var modUnit = Object.assign({},unitData);
        var oldShard = AppData.DB.shard[modUnit.shard];
        if(oldShard.color != newColor){
          for(var sId in AppData.DB.shard){
            var usable = false;
            if(AppData.DB.shard[sId].color === newColor){
              usable = true;
              for(var u in battle.units){
                if(battle.units[u].parts.shard === sId){
                  usable = false;
                }
              }
            }
            if(usable){
              modUnit.shard = sId;
              break;
            }
          }
        }
        var unit = UnitStarter(modUnit);

      //if there is enough players
        if(map.player2StartLocations.length > idx){
          unit.onHex = map.player2StartLocations[idx];
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

      var gridKeys = AppData.DB.map[battle.map].keyMap;
      for(g in gridKeys){
        var nighs = HexAPI.getNeighbors(HexAPI.hex(g));
        gridKeys[g].neighbors = [];
        nighs.forEach(function(n){
          gridKeys[g].neighbors.push(n.q+'.'+n.r+'.'+n.s)
        });
      }

      UserHandler.giveBattleToUser(AppData.connections[msg.wsId].userId, battle.id);
      next({"broadcast":"all","response":"playerJoinedBattle","responseData":{"battle":battle, "gridKeys":gridKeys}});
      next({"broadcast":"universe","response":"PVPBattleTaken","responseData":{}});

    } else {
      console.log('Somebody already grabbed this one');
    }
  },

  getMapPoints(msg, next){
    var battle = AppData.battles[msg.requestData.battleId];
    //redis
    if(!battle){
      return {"error":"no Battle defined"};
    }
    var map = AppData.DB.map[battle.map];
    var points = {};
    for(h in map.keyMap){
      points[h] = {
        name:map.keyMap[h].name,
        id:h,
        center:HexAPI.getCenterOfHex("POINTY",msg.requestData.size,msg.requestData.origin, HexAPI.hex(h)),
        points:HexAPI.getCornersOfHex("POINTY",msg.requestData.size,msg.requestData.origin, HexAPI.hex(h))
      };
    }
    next({"response":"mapPointsCreated", "responseData":{"mapPoints":points}})
  },

  loadBattle(msg, next){
    var battle = AppData.battles[msg.requestData.battleId]
    //add this active connection to the battle
    battle.connections.push(msg.wsId);
    //redis
    var gridKeys = AppData.DB.map[battle.map].keyMap;
    for(g in gridKeys){
      var nighs = HexAPI.getNeighbors(HexAPI.hex(g));
      gridKeys[g].neighbors = [];
      nighs.forEach(function(n){
        gridKeys[g].neighbors.push(n.q+'.'+n.r+'.'+n.s)
      });
    }
    next({"response":"battleLoaded","responseData":{"battle":battle, "gridKeys":gridKeys}});
    //add battle to AppData. TODO Future this will be a save action to the DB

  },

  endBattle(msg, next){
    var battle = AppData.battles[msg.requestData.battleId];
    if(!battle){
      next({"response":"battleNotFound","responseData":{"err":"That battle cannot be found"}})
      return;
    }
    battle.isActive=false;
    //battle.connections = [];

    var saveBattle = Object.assign({},battle);
    fs.writeFile("Battles/"+saveBattle.id+'.db', JSON.stringify(battle),function(err){
      if(err){
        console.log(err);
      } else {
        console.log("Battle Saved");
        delete AppData.battles[battle.id];
      }
    });
    next({"broadcast":"all","response":"battleClosed", "responseData":{"battle":battle}});
    next({"broadcast":"universe","response":"battleClosedUniverse", "responseData":{"battleId":battle.id}});

  },

  startBattle(msg, next){
    var battle = AppData.battles[msg.requestData.battleId];

    var startingData = Object.assign({},battle);
    battle.startingData = startingData;

    var logItems = [{
      "action":"BattleStarted",
      "timestamp":Date.now()
    },{
      "action":"TurnStarted",
      "timestamp":Date.now(),
      "actionData":{
        "unit":battle.activeUnit
      }
    }];

    battle.units[battle.activeUnit].onTurn = true;
    var changes = {
      battleStarted:true,
      battleLog:logItems,
      units:{
        [battle.units[battle.activeUnit]]:{
          onTurn:true
        }
      }
    };

    //TODO This battle is being mutable, but I'm ok with it as the log does tell the history
    //Maybe have a logger in the future
    battle.battleLog.push(logItems[0]);
    battle.battleLog.push(logItems[1]);
    battle.battleStarted = true;

    next({"broadcast":"all","response":"battleStarted", "responseData":{"battle":battle,"changes":changes}});
    next({"broadcast":"universe","response":"battleStartedUniverse", "responseData":{"battleId":battle.id}});

  },

  makeUnit(msg, next){
    var battle = AppData.battles[msg.requestData.battleId];

    //prevents from monkeying with unit after battle started
    if(battle.battleStarted){
      next({"response":"cannotCreateUnit","responseData":{"err":"Battle Started"}});
      return;
    }
    console.log('I will need to do a lot of checks here but for now its just going to go through');

    //TODO check for avilible spot on the map
    //TODO check for avalible parts for unit

    var unit = UnitStarter(msg.requestData.unitData);
    var comm = battle.commanders[AppData.connections[msg.wsId].userId];

    unit.commander = comm.id;
    //if it already existed then it will just overwrite the old one.
    battle.units[unit.id] = unit;

    if(comm.unitOrder.indexOf(unit.id) < 0){
      comm.unitOrder.push(unit.id)
    }

    //TODO save to the user

    //does't matter which one because the battle is going to be updated
    next({"broadcast":"all","response":"unitCreated", "responseData":{"battle":battle}});
  },

  breakApartUnit(msg, next){
    var battle = AppData.battles[msg.requestData.battleId];

    //prevents from monkeying with unit after battle started
    if(battle.battleStarted){
      next({"response":"cannotBreakApartUnit","responseData":{"err":"Battle Started"}});
      return;
    }
    //removes from commander
    var comm = battle.commanders[AppData.connections[msg.wsId].userId];
    //removes from battle
    //TODO save the user

    //does't matter which one because the
    var idx = comm.unitOrder.indexOf(msg.requestData.unitId);
    if(idx >= 0){
      comm.unitOrder.splice(comm.unitOrder.indexOf(msg.requestData.unitId),1)
      //if it already existed then it will just overwrite the old one.
      delete battle.units[msg.requestData.unitId];
      next({"broadcast":"all","response":"unitBrokeApart", "responseData":{"battle":battle}});
    }  else {
      next({"response":"cannotBreakApartUnit","responseData":{"err":"Unit Does Not Exist"}});
    }
  },


  endTurn(msg, next){

    var battle = AppData.battles[msg.requestData.battleId];
    var unit = battle.units[msg.requestData.unitId];
    var commander = battle.commanders[unit.commander];
    var logItems = [];
    if(unit.commander !== AppData.connections[msg.wsId].userId){
      console.log("Not Your Unit");
      next({"response":"notYourUnit","responseData":{}});
      return;
    }

    if(!unit.onTurn || unit.id !== battle.activeUnit){
      console.log("Not Units Turn");
      next({"response":"notUnitsTurn","responseData":{}});
      return;
    }

    var changes = {
      units:{},
      commanders:{},
    }

    var endTurnUnitChanges = TurnHandler.endTurn(unit.id,battle.id);

    logItems.push({
      "action":"TurnEnded",
      "timestamp":Date.now(),
      "actionData":{
        "unit":unit.id
      }});

    changes.units[unit.id] = endTurnUnitChanges;

    if(endTurnUnitChanges.hasFallen){
      battle.battleOver = true;
      battleOver = {
        "action":"BattleOver",
        "timestamp":Date.now()
      }

      for(comId in battle.commanders){
        if(battle.commanders[comId].unitOrder.length > 0){
          console.log('winner');
          if(battle.commanders[comId].controlType === "Player"){
            console.log("winner is a user!");
            UserHandler.giveUserMapRewards(comId, battle.map);
            console.log("send user request");
          }
        }
      }
      logItems.push(battleOver);
      battle.battleLog.push(battleOver);
      changes.battleLog = logItems;
      next({"broadcast":"all","response":"nextTurn","responseData":{"battle":battle,"changes":changes}});
      var saveBattle = Object.assign({},battle);
      fs.writeFile("Battles/"+saveBattle.id+'.db', JSON.stringify(saveBattle),function(err){
        if(err){
          console.log(err);
        } else {
          console.log("Battle Saved");
          delete AppData.battles[battle.id];
        }
      });
      return;
    }


    commander.curUnit += 1;
    if(commander.curUnit >= commander.unitOrder.length){
      commander.curUnit = 0;
    }

    if(!changes.commanders.hasOwnProperty(commander.id)){
      changes.commanders[commander.id] = {};
    }

    changes.commanders[commander.id].curUnit = commander.curUnit;

    //This only works for 2. When there are more commanders, there needs to be a "next commander",
    //button
    //commander is the current commander so it just selects the next unit of the next  commander
    for(c in battle.commanders){
      if(c != commander.id){
        battle.activeUnit = battle.commanders[c].unitOrder[battle.commanders[c].curUnit];
      }
    }

    var startTurnUnitChanges = TurnHandler.startTurn(battle.activeUnit,battle.id);

    logItems.push({
      "action":"TurnStarted",
      "timestamp":Date.now(),
      "actionData":{
        "unit":battle.activeUnit
      }
    });

    changes.units[battle.activeUnit] = startTurnUnitChanges;

    var startUnitCommander;
    if(battle.units[battle.activeUnit]){
      startUnitCommander = battle.commanders[battle.units[battle.activeUnit].commander];
    } else {
      return {"error":"The Active Unit does not exist"}
    }
    if(startUnitCommander.controlType === "AI"){

      //this is an odd place for this
      function afterAI(results){
        console.log('AI Done.');
        console.log(results);
        results.forEach(function(res){
          res.battleLog.forEach(function(bl){
            logItems.push(bl);
          });
          for(var u in res.units){
            if(!changes.units.hasOwnProperty(u)){
              changes.units[u] = {}
            }
            for(p in res.units[u]){
              changes.units[u][p] = res.units[u][p]
              }
          }
        });

        var AIEndTurnChanges = TurnHandler.endTurn(battle.activeUnit,battle.id);
        logItems.push({
          "action":"TurnEnded",
          "timestamp":Date.now(),
          "actionData":{
            "unit":battle.activeUnit
          }});

        //this one needs to be a bit different.
        if(!changes.units.hasOwnProperty(battle.activeUnit)){
          changes.units[battle.activeUnit] = {};
        }
        for(ch in AIEndTurnChanges){
          changes.units[battle.activeUnit][ch] = AIEndTurnChanges[ch];
        }

        startUnitCommander.curUnit += 1;
        if(startUnitCommander.curUnit >= startUnitCommander.unitOrder.length){
          startUnitCommander.curUnit = 0;
        }

        //test it here
        if(!battle.units.hasOwnProperty(startUnitCommander.unitOrder[startUnitCommander.curUnit])){
          console.log('JUst setting it back to zero because something went wrong.')
          startUnitCommander.curUnit = 0;
        }

        if(!changes.commanders.hasOwnProperty(startUnitCommander.id)){
          changes.commanders[startUnitCommander.id] = {};
        }
        changes.commanders[startUnitCommander.id].curUnit = startUnitCommander.curUnit;


        //this is a repeat of above. refractor
        for(c in battle.commanders){
          if(c !== startUnitCommander.id){
            if(!battle.commanders[c].curUnit >= battle.commanders[c].unitOrder.length){
              battle.commanders[c].curUnit = 0;
              console.log('Something has become messed up. Just trtying to fix it');
            }
            battle.activeUnit = battle.commanders[c].unitOrder[battle.commanders[c].curUnit];
            if(!battle.activeUnit){
              console.log("Still some issue, but setting the unit to 0 should wokr")
              battle.commanders[c].curUnit = 0;
              battle.activeUnit =battle.commanders[c].unitOrder[0];
            }
          }
        }

      if(!battle.battleOver){
        console.log("Attempting to start Turn");
        console.log(battle.activeUnit);

        var afterAIstartTurnUnitChanges = TurnHandler.startTurn(battle.activeUnit,battle.id);
        if(!changes.units.hasOwnProperty(battle.activeUnit)){
          changes.units[battle.activeUnit]= {};
        }
        for(ch in afterAIstartTurnUnitChanges){
          changes.units[battle.activeUnit][ch] = afterAIstartTurnUnitChanges[ch];
        }

        logItems.push({
          "action":"TurnStarted",
          "timestamp":Date.now(),
          "actionData":{
            "unit":battle.activeUnit
          }});

          for(var i = 0; i < logItems.length; i++){
            battle.battleLog.push(logItems[i])
          }

          changes.activeUnit = battle.activeUnit;
          changes.battleLog = logItems;
          next({"broadcast":"all","response":"nextTurn","responseData":{"battle":battle,"changes":changes}})
        } else {
          changes.battleLog = logItems;
          next({"broadcast":"all","response":"nextTurn","responseData":{"battle":battle,"changes":changes}});
          var saveBattle = Object.assign({},battle);
          fs.writeFile("Battles/"+saveBattle.id+'.db', JSON.stringify(saveBattle),function(err){
            if(err){
              console.log(err);
            } else {
              console.log("Battle Saved");
              delete AppData.battles[battle.id];

            }
          });
        }


      }//afterAI

      var ai = new AIHandler(battle,afterAI);
      ai.runAI();
    } else {//notAI

      for(var i = 0; i < logItems.length; i++){
        battle.battleLog.push(logItems[i])
      }

      changes.activeUnit = battle.activeUnit;
      changes.battleLog = logItems;

      next({"broadcast":"all","response":"nextTurn","responseData":{"battle":battle,"changes":changes}})
    }
  },
  getTargetableList(msg,next){
    var battle = AppData.battles[msg.requestData.battleId];

    //redis
    var ability = AppData.DB.ability[msg.requestData.ability];
    var unit = battle.units[msg.requestData.unit];

    var targets = [];
    //it either pulses out or it can only affect this unit
    if(ability.style == "aoe" || (ability.target === "ally" && ability.range === 0)){
      targets.push(unit.id);
    } else {
      var targets = AbilityCalculator.getTargetableUnits(unit,ability,battle.units);
    }
    //battle doesnt matter here
    //and this one doesn't "DO anything"
    next({"response":"targets","responseData":{"targets":targets,abilityId:ability.id}});
    next({"broadcast":"all","response":"abilitySelected","responseData":{"battle":battle,"targets":targets,abilityId:ability.id}})
  },

  getAffectedList(msg,next){
    var battle = AppData.battles[msg.requestData.battleId];
    var units = battle.units;
    //redis
    var ability = AppData.DB.ability[msg.requestData.ability];
    var sender = battle.units[msg.requestData.unit];
    var receiver = battle.units[msg.requestData.target];
    var hexList = AbilityCalculator.getAffectedHexes(sender, receiver, ability);
    var affectedUnits = AbilityCalculator.getAffectedUnits(hexList,sender,ability,units);
    next({"response":"affectedUnits","responseData":{"affectedUnits":affectedUnits}});
    next({"broadcast":"all","response":"targetSelected","responseData":{"target":msg.requestData.target,"battle":battle,abilityId:ability.id, "affectedUnits":affectedUnits}})

  },

  doAbility(msg, next){

    var battle = AppData.battles[msg.requestData.battleId];

    //redis
    var ability = AppData.DB.ability[msg.requestData.ability];
    var sender = battle.units[msg.requestData.sender];
    var receiver = battle.units[msg.requestData.receiver];
    var units = battle.units;

    var results = AbilityCalculator.doAbility(sender,receiver,ability,units);

    if(results.hasOwnProperty("success")){
      var changes = TurnHandler.doAbility(results,battle,ability,sender,receiver);

      next({
        "broadcast":"all",
        "response":"abilityDone",
        "responseData":{
          "battle":battle,
           "changes":changes
        }
      });

      if(battle.battleOver){
        var saveBattle = Object.assign({},battle);
        fs.writeFile("Battles/"+saveBattle.id+'.db', JSON.stringify(battle),function(err){
          if(err){
            console.log(err);
          } else {
            console.log("Battle Saved");
            delete AppData.battles[battle.id];
            console.log("Delete the Battle");
          }
        });

      }
    } else {
      next({
        "response":"abilityNotDone",
        "responseData":{
           "error":results
        }
      });
    }
  },

  viewingPath(msg, next){
    var battle = AppData.battles[msg.requestData.battleId];
    var path = msg.requestData.path;

    next({"broadcast":"all","response":"potentialPath", "responseData":{battle:battle, path:path}})

  },

  moveUnit(msg, next){

    var battle = AppData.battles[msg.requestData.battleId];
    var unit = battle.units[msg.requestData.unit];
    var path = msg.requestData.path;

    if(unit.doneMove){
      console.log('Unit Has Already Moved');
      next({"response":"unitHasAlreadyMoved"});
      return;
    }
    if(unit.commander !== AppData.connections[msg.wsId].userId){
      next({"response":"notYourTurn","responseData":{}})
      return;
    }

    if((Number(unit.speed)+Number(unit.speedMod)) < path.length){
      next({"response":"notEnoughSpeed","responseData":{}});
      return;
    }

    for(var i = 0; i < path.length; i++){
      if(!AppData.DB.map[battle.map].keyMap.hasOwnProperty(path[i])){
        console.log("Path goes off the map");
        next({"response":"pathGoesOffMap","responseData":{}});
        return;
      }
    }

    for(var u in battle.units){
      for(var i = 0; i < path.length; i++){
        if(battle.units[u].onHex === path[i] && !battle.units[u].hasFallen){
          console.log('There is something on the path');
          next({"response":"somethingOnPath","responseData":{}});
          return;
        }
      }
    }
    console.log(path);
    var hex = path[path.length-1];
    var changes = TurnHandler.moveUnit(unit, battle, hex);

    next({"broadcast":"all","response":"unitMoved", "responseData":{"battle":battle,"changes":changes}})
  }
}

module.exports = BattleAPI;
