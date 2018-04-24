const AppData = require("./AppData");

const TurnHandler = {
  startTurn: function(unitId,battleId){
    var unit = AppData.battles[battleId].units[unitId];

    var uChanges = {};

    if(unit.didAbility){
      unit.didAbility = false;
      uChanges.didAbility = false;
    }
    if(unit.doneMove){
      unit.doneMove = false;
      uChanges.doneMove = false;
    }
    if(unit.defenceMod != 0){
      unit.defenceMod = 0;
      uChanges.defenceMod = 0;
    }
    if(!unit.canBeTargeted){
      unit.canBeTargeted = true;
      uChanges.canBeTargeted = true;
    }
    if(unit.aggroCount>0){
      unit.aggroCount-= 1;
      if(unit.aggroCount <= 0){
        unit.aggroCount = 0;
        unit.aggroTarget = null;
        uChanges.aggroTarget = null;
      }
      uChanges.aggroCount = unit.aggroCount;
    }
    unit.onTurn = true;
    uChanges.onTurn = true;
    return uChanges;
  },

  endTurn: function(unitId,battleId){
    var unit = AppData.battles[battleId].units[unitId];

    uChanges = {}

    var regen = unit.fullRegen;
    if(unit.didAbility){
      regen = 0;
    } else if (unit.doneMove) {
      regen = unit.partRegen;
    }

    if(unit._energy != unit.energy && regen > 0){
      unit._energy += regen;
      if(unit._energy > unit.energy){
        unit._energy = unit.energy
      }
      uChanges._energy = unit._energy;
    }

    var defBonus = unit.noActionDefBuff;
    if(unit.doneMove){
      defBonus = 0;
    } else if (unit.didAbility) {
      defBonus = unit.noMoveDefBuff;
    }

    if(defBonus >0){
      unit.defenceMod += defBonus;
      uChanges.defenceMod = unit.defenceMod;
    }
    if(unit.powerMod != 0){
      unit.powerMod = 0;
      uChanges.powerMod = 0;
    }
    if(unit.canTarget != "any"){
      unit.canTarget = 'any';
      uChanges.canTarget = "any";
    }
    if(unit.speedMod != 0){
      unit.speedMod = 0;
      uChanges.speedMod = 0;
    }

    if(unit.totalDesperation == true){
      unit.desperationCountdown -= 1;
      uChanges.desperationCountdown = unit.desperationCountdown;
      if(unit.desperationCountdown == 0){
        unit._hp = 0;
        unit.hasFallen = true;
        uChanges._hp = 0;
        uChanges.hasFallen = true;
      }
    }
    unit.onTurn = false;
    uChanges.onTurn = false;
    return uChanges;
  },

  moveUnit:function(unit,battle,hex){
    unit.onHex = hex;
    unit.doneMove = true;

    var logItem = {
      "action":"UnitMoved",
      "timestamp":Date.now(),
      "actionData":{
        "unit":unit.id,
        "hex":unit.onHex
      }
    };

    battle.battleLog.push(logItem);

    var changes = {
      units:{
        [unit.id]:{
          onHex:unit.onHex,
          doneMove:true
        }
      },
      battleLog:[logItem]
    };

    return changes;

  },
  //consider sending just id
  doAbility: function(results, battle, ability, sender, receiver){
    var units = battle.units;
    console.log(results);

    var changes = {
      units:{
        [sender.id]:{}
      }
    };

    var logItem = {
      "action":"DidAbility",
      "timestamp":Date.now(),
      "actionData":{
        "doer":sender.id,
        "ability":ability.id,
        "target":receiver.id,
        "results":[]
      }
    };

    if(results.hasOwnProperty("success")){

      sender._energy -= ability.consumes;
      sender.didAbility = true;
      changes.units[sender.id].didAbility = true;
      changes.units[sender.id]._energy = sender._energy;
      var gameOver = false;
      results.success.abilityResults.forEach(function(result){
        if(!changes.units.hasOwnProperty(result.receiver)){
          changes.units[result.receiver] = {};
        }
        units[result.receiver][ability.affectedAttribute] = Number(units[result.receiver][ability.affectedAttribute])+Number(result.value);
        //if it is HP or energy it is handled differently

      //  console.log("INSTANT KILL");
    //    units[result.receiver]._hp = 0;

        if(ability.affectedAttribute === "_hp" || ability.affectedAttribute === "_energy"){
          if(units[result.receiver][ability.affectedAttribute] > units[result.receiver][ability.affectedAttribute.replace("_",'')]){
            //result difference here

            result.value = result.value - (units[result.receiver][ability.affectedAttribute]-units[result.receiver][ability.affectedAttribute.replace("_",'')])
            units[result.receiver][ability.affectedAttribute] = units[result.receiver][ability.affectedAttribute.replace("_",'')];
          }
        }

        logItem.actionData.results.push({
          "unit":result.receiver,
          "attribute":ability.affectedAttribute,
          "for":result.value,
          "final":units[result.receiver][ability.affectedAttribute]
        });

        changes.units[result.receiver][ability.affectedAttribute] = units[result.receiver][ability.affectedAttribute];

        if(units[result.receiver]._hp <= 0){
          console.log('Unit has fallen.');
          var commander = battle.commanders[units[result.receiver].commander];

          //unit falling affects the commander
          if(!changes.hasOwnProperty("commanders")){
            changes.commanders={}
          }
          if(!changes.commanders.hasOwnProperty(commander.id)){
            changes.commanders[commander.id] = {};
          }

          //this is all fall protocal
          units[result.receiver].hasFallen = true;
          changes.units[result.receiver].hasFallen = true;

          logItem.actionData.results.push({
            "unit":result.receiver,
            "statusChange":"HasFallen"
          });

          //remove the index of the fallen unit
          var i = commander.unitOrder.indexOf(result.receiver);
          var c = commander.curUnit;

          commander.unitOrder.splice(i,1);
          console.log('Unit Order ', commander.unitOrder);
          changes.commanders[commander.id].unitOrder = commander.unitOrder;
          if(i > c){
            commander.curUnit -= 1;
            changes.commanders[commander.id].curUnit = commander.curUnit;
          }
          if(c > commander.unitOrder.length-1){
            commander.curUnit = 0;
            changes.commanders[commander.id].curUnit = 0;
          }

          //Finally if it is the last unit... Total Desperation!!!
          if(commander.unitOrder.length === 1){
            var unit = units[commander.unitOrder[0]];
            if(!changes.units.hasOwnProperty(unit.id)){
              changes.units[unit.id] = {};
            }
            unit.power += unit.totalDesperationPowerBuff;
            unit.speed += unit.totalDesperationSpeedBuff;
            unit.totalDesperation = true;
            unit._energy = unit.energy;
            changes.units[unit.id].power = unit.power;
            changes.units[unit.id].speed = unit.speed;
            changes.units[unit.id]._energy = unit._energy;
            changes.units[unit.id].totalDesperation = true;

            logItem.actionData.results.push({
              "unit":unit.id,
              "statusChange":"IsTotalDesperation"
            });
          } else if(commander.unitOrder.length === 0){
            console.log('Game Over');
            battle.battleOver = true;

            gameOver = {
              "action":"GameOver",
              "timestamp":Date.now()
            }
          }
        }
      });
      if(!changes.hasOwnProperty("battleLog")){
        changes.battleLog = []
      }
      changes.battleLog.push(logItem)
      battle.battleLog.push(logItem);//mutates battle

      if(battle.battleOver){
        changes.battleLog.push(gameOver);
        battle.battleLog.push(gameOver);
      }

      return changes;
    }
  }
}

module.exports = TurnHandler;
