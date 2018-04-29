const AppData = require("./AppData");
const uuidv4 = require('uuid/v4');

function UnitStarter(data){
  var unit = {
    id:data.id || uuidv4(),
    name:data.name,
    onHex:data.onHex,
    didAbility:false,
    didMove:false,
    onTurn:false,
    aggroCount:0,
    aggroTarget:null,
    hasFallen:false,
    canTarget:"any",
    canBeTargeted:true,
    totalDesperation:false,
    _energy:0,
    _hp:0,
    speedMod:0,
    powerMod:0,
    defenceMod:0,
    pierceMod:0,
    //These should be in the database
    fullRegen:4,
    partRegen:2,
    noActionDefBuff:2,
    noMoveDefBuff:1,
    totalDesperationPowerBuff:2,
    totalDesperationSpeedBuff:2,
    totalDesperationCounterStart:6,
    aggroFallOff:1,
  }

  //its a monster
  if(data.hasOwnProperty("monster")){
    //redis
    var monster = AppData.DB.monster[data.monster];
    var shard = AppData.DB.shard[data.shard];
    unit.name = Number(monster.name);
    unit.hp = Number(monster.hp);
    unit.speed = Number(monster.speed);
    unit.defence = Number(monster.defence);
    unit.power = Number(monster.power);
    unit.energy = Number(monster.energy)*3;
    unit.pierce = 0; //for monsters pierce always comes from the ability
    unit.firstAbility = monster.firstAbility;
    unit.secondAbility = monster.secondAbility;
    unit.thirdAbility = monster.thridAbility;
    unit.images = {
      "shard":shard.image,
      "monster":monster.image
    }
    unit.parts = {
      "monster":data.monster,
      "shard":data.shard
    };
  } else {
    //its a rider
    var rider = AppData.DB.rider[data.rider];
    var weapon = AppData.DB.weapon[data.weapon];
    var dragon = AppData.DB.dragon[data.dragon];
    var shard = AppData.DB.shard[data.shard];

    unit.hp = Number(rider.hp)+Number(dragon.hp);
    unit.speed = Number(rider.speed)+Number(dragon.speed);
    unit.defence = Number(rider.defence)+Number(dragon.defence);
    unit.power = Number(rider.power)+Number(weapon.power);
    unit.energy = Number(rider.energy)*3+Number(weapon.energy)*3;
    unit.pierce = Number(weapon.pierce) || 0;
    unit.firstAbility = weapon.weaponAbility;//change this in the editor
    unit.secondAbility = weapon.specialAbility;//change this in the edirot
    unit.thirdAbility = weapon.ultimateAbility; // change this is nthe editor
    unit.images = {
      "shard":shard.image,
      "dragon":{
        "bodyType":dragon.bodyType,
        "bodyColor":dragon.bodyColor,
        "wingColor":dragon.wingColor,
        "wingPos":dragon.wingPos,
        "extra":dragon.extra
      },
      "rider":rider.image,
      "weapon":weapon.image
    }
    unit.parts = {
      "rider":data.rider,
      "dragon":data.dragon,
      "weapon":data.weapon,
      "shard":data.shard
    }
  }

  unit._hp = unit.hp;
  unit._energy = unit.energy;
  return unit;

}

module.exports = UnitStarter;
