const fs = require("fs");
const AppData = {
  battles:{},
  connections:{},
  Users:{},
  DB:{
    updated:Date.now()
  } 
}

function parseJSON(msg){
  try {
    return JSON.parse(msg);
  } catch(ex){
    return null;
  }
};
//LOADS DATABASE
var files = fs.readdirSync("./data/");
files.forEach(function(file){
  var d = parseJSON(fs.readFileSync('./data/'+file));
  if(!AppData.DB.hasOwnProperty(d.dataType)){
    AppData.DB[d.dataType] = {};
  }
  for(var di in d.data){
    AppData.DB[d.dataType][di] = d.data[di]
  }
});

var userCredsDataJSON = parseJSON(fs.readFileSync("users.db")) || {};

AppData.UserCreds = userCredsDataJSON;

module.exports = AppData;
