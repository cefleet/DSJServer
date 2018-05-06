//directives mutate the data in the same way an API request does when a player does
//their turn.
const AppData = require("./AppData");

const HexAPI = require("./HexAPI");
const TurnHandler = require("./TurnHandler");
const AbilityCalculator = require("./AbilityCalculator");

const AIDirectives = {
  logSelf:function(battle, directiveData){
    return {
      results:"success"
    };
  },

  getEnemy:function(battle,directiveData){
    var unit = battle.units[battle.activeUnit];
    var target = null;
    if(unit.aggroTarget && !battle.units[unit.aggroTarget].hasFallen){
      target = unit.aggroTarget;
      console.log(battle.units[unit.aggroTarget]);
      console.log(unit.aggroCount);
    } else {
      var cDist = 1000;//arbarturarly long number
      for(u in battle.units){
        if(battle.units[u].commander !== unit.commander && !battle.units[u].hasFallen){// just getting enemies
          var dist = HexAPI.getDistanceBetweenHexes(
              HexAPI.hex(unit.onHex),HexAPI.hex(battle.units[u].onHex));
          if (dist < cDist){
            cDist = dist;
            target = u;
          }
        }
      }
    }

    directiveData.target = target;

    if(target){
      return {
        results:"success"
      }
    } else {
      return {
        results:"fail"
      }
    }
  },

  attackWithFirst: function(battle,directiveData){
    var sender = battle.units[battle.activeUnit];
    var receiver = battle.units[directiveData.target];
    var ability = AppData.DB.ability[sender.firstAbility];
    var units = battle.units;

    var results = AbilityCalculator.doAbility(sender,receiver,ability,units);
    if(results.hasOwnProperty("success")){
      var changes = TurnHandler.doAbility(results,battle,ability,sender,receiver);
      return {
        results:"success",
        data:changes
      }
    } else {
      return {
        results:"fail"
      }
    }
  },

  moveToTarget: function(battle,directiveData){
    var unit = battle.units[battle.activeUnit];
    if(unit.canMove == false || unit.doneMove){
      return {
        results:"fail"
      }
    } else {

      var unitHex = HexAPI.hex(unit.onHex);

      var obstacles = [];
      for(u in battle.units){
        obstacles.push(battle.units[u].onHex);
      }
      var AllWithinDistance = HexAPI.getHexesWithinDistance(unitHex,Number(unit.speed)+Number(unit.speedMod))
      var keyMap  = AppData.DB.map[battle.map].keyMap;
      AllWithinDistance.forEach(function(hex){
        if(!keyMap.hasOwnProperty(hex.q+'.'+hex.r+'.'+hex.s)){
          if(obstacles.indexOf(hex) < 0){
            obstacles.push(hex.q+'.'+hex.r+'.'+hex.s);
          }
        }
      });

      var potentialMovements = HexAPI.getHexesReachableWithObstacles(
        unitHex ,Number(unit.speed)+Number(unit.speedMod),obstacles
      );
      targetHex = HexAPI.hex(battle.units[directiveData.target].onHex)
      var dis = 100; //arbarturarly far
      var gotoHex = null;

      potentialMovements.forEach(function(hex){
        var cDist = HexAPI.getDistanceBetweenHexes(hex,targetHex);
        if(cDist < dis){
          gotoHex = hex;
          dis = cDist;
        }
      });
      if(gotoHex && gotoHex.q+'.'+gotoHex.r+'.'+gotoHex.s !==unit.onHex){
        var changes = TurnHandler.moveUnit(unit,battle,gotoHex.q+'.'+gotoHex.r+'.'+gotoHex.s);
        return {
          results:"success",
          data:changes
        }
      } else {
        return {
          results:"fail"
        }
      }
    }
  }
}

module.exports = AIDirectives;
