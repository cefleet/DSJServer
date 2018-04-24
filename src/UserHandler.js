const AppData = require("./AppData");
const fs = require("fs");
const uuidv4 = require('uuid/v4');

const UserHandler = {

  createNewUser:function(email,username,id){
    id = id || uuidv4();
    var user = {
      "username":username,
      "email":email,
      "id":id,
      "battles":[],
      "color":"G",
      "units":[
        {"name":"Player Healer","shard":"cbe0cae3-96bf-4eb8-90bd-50e09a89ae33","onHex":"4.2.-6","dragon":"a4005bcc-a2fb-477a-b32d-888712886181","rider":"8a4322ac-d2c6-4d36-b82a-ef7e703cf0da","weapon":"b39b05bd-f3ee-41a5-a4a2-8506533b7022"},
        {"name":"Player DPS","shard":"63df7cf6-d95a-479a-a616-323065c95c92","onHex":"3.6.-9","dragon":"08d37765-89a5-4e96-923d-792cedde52b4","rider":"726b1e68-f13a-47b3-aba3-92d2a5fd255f","weapon":"bee9a6cc-c3e5-4cc9-84d3-283726aaaf19"},
        {"name":"Player Support","shard":"3c794269-21bf-4d62-bf3a-37ed5df125b8","onHex":"-1.7.-6","dragon":"ff97bae6-369e-4df7-8953-a57275959319","rider":"4e52cb1c-db3e-4fb0-a8c3-3a1a0ae66ab7","weapon":"6c4abaa6-40ce-489b-8f91-1456e12b1160"}
      ],
      "riders":["8a4322ac-d2c6-4d36-b82a-ef7e703cf0da","726b1e68-f13a-47b3-aba3-92d2a5fd255f","4e52cb1c-db3e-4fb0-a8c3-3a1a0ae66ab7"],
      "dragons":["a4005bcc-a2fb-477a-b32d-888712886181","08d37765-89a5-4e96-923d-792cedde52b4","ff97bae6-369e-4df7-8953-a57275959319"],
      "weapons":["b39b05bd-f3ee-41a5-a4a2-8506533b7022","bee9a6cc-c3e5-4cc9-84d3-283726aaaf19","6c4abaa6-40ce-489b-8f91-1456e12b1160"],
      "maps":["586d621d-5770-408e-8e83-12ba47c39527"]
    }

    AppData.Users[user.id] = user;
    //write the new user
    fs.writeFile('users.db', JSON.stringify(AppData.Users), 'utf8', function(){
      console.log(this);
    });
  }, 

  giveBattleToUser:function(userId,battleId){
    AppData.Users[userId].battles.push(battleId);

    fs.writeFile('users.db', JSON.stringify(AppData.Users), 'utf8', function(){
      console.log(this);
    });
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
        }
      });
    }

    //thisi s not technically a reward but it is part of winning a map
    if(map.loseOnWin){
      user.maps.splice(user.maps.indexOf(mapId),1);
    }

    fs.writeFile('users.db', JSON.stringify(AppData.Users), 'utf8', function(){
      console.log(this);
    });

  }
}

module.exports = UserHandler;
