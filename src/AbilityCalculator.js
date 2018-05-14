const HexAPI = require("./HexAPI.js");

class AbilityCalculator {

  //TODO I MAY BE ABLE TO JUST HAVE the the units not the grid
  doAbility(sending,receiving,ability,units){
    //This makes sure the attacker can do the ability
    var errors = this.checkForErrorsInAttack(sending,receiving,ability);
    if(errors){
      console.log(errors);
      return errors;
    } else {
      var results = this.executeAbility(sending,receiving,ability,units);
      return {"success":results}
    }
  };

  checkForErrorsInAttack(sender,receiver,ability){
    if(sender.didAbility) {
      return {"err":"Unit has Already Done Ability."}
    }

    //TODO CONSUMABLE IS DIFFERENT NOW
    if(sender._energy < ability.consumes){
      return {"err":"Not Enough Energy."}
    }

    if(HexAPI.getDistanceBetweenHexes(HexAPI.hex(sender.onHex), HexAPI.hex(receiver.onHex))-1 > ability.range){
      return {"err":"Target is Out Of Range."}
    }

    var targetRelationship = "ally";
    if(sender.commander !== receiver.commander){
      targetRelationship = "enemy";
    }

    console.log(sender, receiver)


    if(ability.affects !== targetRelationship && ability.style !== "aoe"){
      return {"err":"Ability can ony Target an "+ability.affects}
    }

    if(sender.canTarget != "any" && sender.canTarget != receiver.id && ability.target == 'unit' && ability.affects == 'enemy'){
      return {"err":"Cannot directly attack a unit that is not the one that taunted you."}
    }

    //if none of those things are true it is false
    return false;
  };

  executeAbility(sender,receiver, ability, units){
    var results = []
    var affectedHexes = this.getAffectedHexes(sender, receiver, ability);
    var affectedUnits = this.getAffectedUnits(affectedHexes,sender,ability,units);

    var results = {"abilityDone":{"sender":sender.id,"ability":ability.id}, "abilityResults":[]}
    if(ability.type == "damage") {
      affectedUnits.forEach(function(unitId){
        results.abilityResults.push({
          "sender":sender.id,
          "receiver":unitId,
          "ability":ability.id,
          "value":this.calculateAttack(sender,units[unitId],ability)
        });
      }.bind(this));

      //heal
    } else if(ability.type == 'heal'){
      affectedUnits.forEach(function(unitId){
        results.abilityResults.push({
          "sender":sender.id,
          "receiver":unitId,
          "ability":ability.id,
          "value":this.calculateHeal(sender, ability)
        });
      }.bind(this));

      //taunts
    } else if(ability.type == 'taunt'){
      affectedUnits.forEach(function(unitId){
        results.abilityResults.push({
          "sender":sender.id,
          "receiver":unitId,
          "ability":ability.id,
          "value":sender.id
        });
      }.bind(this));
      //all other buffs and debuffs
    } else {
      affectedUnits.forEach(function(unitId){
        results.abilityResults.push({
          "sender":sender.id,
          "receiver":unitId,
          "ability":ability.id,
          "value":this.calculateAbility(sender,ability)
        });
      }.bind(this));
    }
    return results
  };

  calculateHeal(sender,ability){
    var hV = Number(ability.power)+Number(sender.power)+Number(sender.powerMod);
    return hV;
  };

  calculateAbility(sender, ability){
    //TODO I NEED MORE Data
    var val = Number(sender.power)+Number(ability.power)+Number(sender.powerMod);
    //It will do something no matter the power of the Unit
    if(val <= 0){
      val = 1;
    }
    //TODO FORGOT TO ADD EFFECT
    return val;
  };

  calculateAttack(sender, receiver, ability){
    //The Total Attack Power
    var tA = -1*(Number(sender.power)+Number(ability.power)+Number(sender.powerMod))
    //The Total Defence
    var tD = Number(receiver.defence)+Number(receiver.defenceMod)
    //The total absorbtion ... may not be needed anymore
    var aB = 0
    var p = Number(ability.pierce);
    if(typeof p == "undefined"){
      p = 0;
    }

    //If the pierce is greater than the total of the total Attack. Pierce is just the total attack.
    if(p > Math.abs(tA)){
      p = tA
    }

    //This removes the pierce for the total Attack IE damage vs defence
    var tAV = (tA+p)+tD

    //if the defence is higer than the total attack then it resets to zero
    if (tAV > 0){
      tAV = 0
    }

    tAV = tAV-p//peirce is added back to the total

    if(tD<Math.abs(tAV)-p){
      aB = tD;
    } else {
      aB = tD-p
    }

    if(aB < 0){
      aB = 0
    }

    //return {"value":tAV,"absorb":aB,"pierce":p}
    return tAV;
  };

  getAffectedHexes(sender, receiver, ability){
    var affectedHexes =[]
    //find affected hexes
    if(ability.style == "single"){
      affectedHexes = [HexAPI.hex(receiver.onHex)]
    } else if(ability.style == "linear") {
      var dir = HexAPI.getDirectionFromHex(HexAPI.hex(sender.onHex),HexAPI.hex(receiver.onHex));
      console.log(dir);
      affectedHexes = HexAPI.getStraightLineOfHexes(HexAPI.hex(sender.onHex), dir, ability.range);
    } else if(ability.style == "aoe"){
      affectedHexes = HexAPI.getHexesWithinDistance(HexAPI.hex(sender.onHex),ability.range);
    }

    return affectedHexes;
  };

  getAffectedUnits(hexList, sender, ability, units){
    var affectedList = [];
    for(var i = 0; i < hexList.length; i++){
      var id = hexList[i].q+'.'+hexList[i].r+'.'+hexList[i].s;
      for(var u in units){
        if(units[u].onHex === id){
          if(!units[u].hasFallen){
            if(
              (units[u].commander === sender.commander && ability.affects === 'ally') ||
              (units[u].commander !== sender.commander && ability.affects === 'enemy')
            ){
              affectedList.push(u);
            }
          }
        }
      }
    }
    return affectedList
  };



  getTargetableUnits(sender,ability, units){
    var targetable = [];
    console.log(ability);
    if(ability.style === "linear"){
      console.log('I need to have a seperate calculator for this');
      var i = 0;
      var newUnits = {};
      while(i < 6){
        var p = HexAPI.getStraightLineOfHexes(HexAPI.hex(sender.onHex), i, ability.range);
        console.log(p);
        for(var u in units){
          for(var h = 0; h < p.length; h++){
            if(units[u].onHex === p[h].q+'.'+p[h].r+'.'+p[h].s){
              newUnits[u] = units[u];
            }
          }
        }
        i++;
      }
      units = newUnits;
    }
    for(var u in units){
      if(
        (
          (units[u].commander === sender.commander && ability.affects === 'ally') ||
          (units[u].commander !== sender.commander && ability.affects === 'enemy')
        ) &&
          HexAPI.getDistanceBetweenHexes(HexAPI.hex(sender.onHex), HexAPI.hex(units[u].onHex)) <= ability.range
          &&
         !units[u].hasFallen
      ) {
        targetable.push(units[u].id);
      }
    }
    if(ability.los){
      console.log("I need to get LOS");
    }
    return targetable;
  }
}
module.exports = new AbilityCalculator();
