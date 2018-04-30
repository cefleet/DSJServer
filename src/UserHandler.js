const AppData = require("./AppData");
const fs = require("fs");
const uuidv4 = require('uuid/v4');

const UserHandler = {

  createNewUser:function(email,username,id){
    id = id || uuidv4();
    //this needs to be in data
    var user = JSON.parse(fs.readFileSync("defaultUser.json", "utf8"));
    user.email = email;
    user.username = username;
    user.id = id;

    AppData.Users[id] = user;

    //write the new user
    fs.writeFile("Users/"+id+'.db', JSON.stringify(user), "utf8", function(err){
      if(err){
        console.log(err)
      } else {
        console.log("User "+id+" saved!");
      }
    });
    /*
    fs.writeFile('users.db', JSON.stringify(AppData.Users), 'utf8', function(){
      console.log(this);
    });
    */
  },

  giveBattleToUser:function(userId,battleId){
    AppData.Users[userId].battles.push(battleId);

    var user = AppData.Users[userId];

    fs.writeFile("Users/"+userId+'.db', JSON.stringify(user), "utf8", function(err){
      if(err){
        console.log(err)
      } else {
        console.log("User "+userId+" saved!");
      }
    });

/*
    fs.writeFile('users.db', JSON.stringify(AppData.Users), 'utf8', function(){
      console.log(this);
    });
    */
  },

  giveUserMapRewards: function(userId,mapId){
    var map = AppData.DB.map[mapId];
    var user = AppData.Users[userId];

    if(map.hasOwnProperty("winRewards")){
      map.winRewards.forEach(function(reward){
        console.log(reward);
        //Rewards can be dragons,riders,weapons,
        if(reward.type === "newMap"){
          if(user.maps.indexOf(reward.mapId) < 0){//if player doesn't already have it
            console.log("adding reward");
            user.maps.push(reward.mapId);
          }
        } else if(reward.type ==="newDragon"){
          if(user.dragons.indexOf(reward.dragonId) < 0){//if player doesn't already have it
            console.log("adding reward");
            user.dragons.push(reward.dragonId);
          }
        } else if(reward.type ==="newRider"){
          if(user.riders.indexOf(reward.riderId) < 0){//if player doesn't already have it
            console.log("adding reward");
            user.riders.push(reward.riderId);
          }
        } else if(reward.type ==="newWeapon"){
          if(user.weapons.indexOf(reward.weaponId) < 0){//if player doesn't already have it
            console.log("adding reward");
            user.weapons.push(reward.weaponId);
          }
        }
      });
    }

    //thisi s not technically a reward but it is part of winning a map
    if(map.loseOnWin){
      user.maps.splice(user.maps.indexOf(mapId),1);
    }

    fs.writeFile("Users/"+userId+'.db', JSON.stringify(user), "utf8", function(err){
      if(err){
        console.log(err)
      } else {
        console.log("User "+userId+" saved!");
      }
    });
/*
    fs.writeFile('users.db', JSON.stringify(AppData.Users), 'utf8', function(){
      console.log(this);
    });
*/
  }
}

module.exports = UserHandler;
