const fs = require("fs");
const socket = require("./src/socket.js");

var soc = new socket({port:5674});
soc.startListening();
