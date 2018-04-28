const fs = require("fs");
const AppData = {
  battles:{},
  connections:{},
  Users:{},
  DB:{
    updated:Date.now()
  }
}
 
//LOADS DATABASE
var files = fs.readdirSync("./data/");
files.forEach(function(file){
  var d = JSON.parse(fs.readFileSync('./data/'+file).toString());
  if(!AppData.DB.hasOwnProperty(d.dataType)){
    AppData.DB[d.dataType] = {};
  }
  for(var di in d.data){
    AppData.DB[d.dataType][di] = d.data[di]
  }
});

var userDataJSON = JSON.parse(fs.readFileSync("users.db"));
AppData.Users = userDataJSON;
console.log(AppData.Users);
console.log('ReloadingData');
module.exports = AppData;
