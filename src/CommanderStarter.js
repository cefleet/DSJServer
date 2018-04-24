const AppData = require("./AppData");
const uuidv4 = require('uuid/v4');

function CommanderStarter(data){
  console.log()
  var commander = {
    id:data.id ||uuidv4(),
    name:data.username || data.name,
    shardColor: data.shardColor || data.color,
    controlType : data.controlType || "Player",
    curUnit: 0,
    unitOrder:[]
  }
  return commander;
}

module.exports = CommanderStarter;
