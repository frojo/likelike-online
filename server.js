//check README.md

//load secret config vars
require('dotenv').config();
const DATA = require('./data');

//.env content
/*
ADMINS=username1|pass1,username2|pass2
PORT = 3000
*/

var port = process.env.PORT || 3000;

//number of emits per second allowed for each player, after that ban the IP.
//over 30 emits in this game means that the client is hacked and the flooding is malicious
//if you change the game logic make sure this limit is still reasonable
var PACKETS_PER_SECONDS = 30;

/*
The client and server version strings MUST be the same!
They can be used to force clients to hard refresh to load the latest client.
If the server gets updated it can be restarted, but if there are active clients (users' open browsers) they could be outdated and create issues.
If the VERSION vars are mismatched they will send all clients in an infinite refresh loop. Make sure you update sketch.js before restarting server.js
*/
var VERSION = "1.0";

//create a web application that uses the express frameworks and socket.io to communicate via http (the web protocol)
var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var Filter = require('bad-words');

//time before disconnecting (forgot the tab open?)
var ACTIVITY_TIMEOUT = 10 * 60 * 1000;
//should be the same as index maxlength="16"
var MAX_NAME_LENGTH = 16;

//cap the overall players 
var MAX_PLAYERS = -1;

// players who rejoin are remembered (only turn off for debugging)
var REMEMBER_IPS = false;

//views since the server started counts relogs
var visits = 0;

/*
A very rudimentary admin system. 
Reserved usernames and admin pass are stored in .env file as
ADMINS=username1|pass1,username2|pass2

Admin logs in as username|password in the normal field
If combo user|password is correct (case insensitive) mark the player as admin on the server side
The "username|password" remains stored on the client as var nickName 
and it's never shared to other clients, unlike player.nickName

admins can call admin commands from the chat like /kick nickName
*/
var admins = [];
if (process.env.ADMINS != null)
    admins = process.env.ADMINS.split(",");

//We want the server to keep track of the whole game state
//in this case the game state are the attributes of each player
var gameState = {
    players: {},
}

// for calculating the position of the new player
var mostRecentPlayerPos = {x: 0, y: 0};

//a collection of banned IPs
//not permanent, it lasts until the server restarts
var banned = [];

//when a client connects serve the static files in the public directory ie public/index.html
app.use(express.static('public'));

//when a client connects the socket is established and I set up all the functions listening for events
io.on('connection', function (socket) {


    //this bit (middleware?) catches all incoming packets
    //I use to make my own lil rate limiter without unleashing 344525 dependencies
    //a rate limiter prevents malicious flooding from a hacked client
    socket.use((packet, next) => {
        if (gameState.players[socket.id] != null) {
            var p = gameState.players[socket.id];
            p.floodCount++;
            if (p.floodCount > PACKETS_PER_SECONDS) {
                console.log(socket.id + " is flooding! BAN BAN BAN");


                if (p.IP != "") {
                    //comment this if you don't want to ban the IP
                    banned.push(p.IP);
                    socket.emit("errorMessage", "Flooding attempt! You are banned");
                    socket.disconnect();
                }

            }
        }
        next();
    });


    //this appears in the terminal
    console.log('A user connected');

    //if running locally it's not gonna work
    var IP = "";
    //oh look at this beautiful socket.io to get an goddamn ip address
    if (socket.handshake.headers != null)
        if (socket.handshake.headers["x-forwarded-for"] != null) {
  	  IP = socket.handshake.headers["x-forwarded-for"].split(",")[0];
        }

    // we check if we know this player so that we can tell the client
    // to dump the player in the game (with serverWelcome message)
    let relog = false;
    let oldID = idByIP(IP);
    // we only count *real* people, not lurker sheeple
    if (oldID != null && gameState.players[oldID].nickName != "" && 
	REMEMBER_IPS) {
        relog = true;
    }

    //this is sent to the client upon connection
    socket.emit('serverWelcome', VERSION, DATA, relog);

    //wait for the player to send their name and info, then broadcast them
    socket.on('join', function (playerInfo) {

        //console.log("Number of sockets " + Object.keys(io.sockets.connected).length);

        try {

            //if running locally it's not gonna work
            var IP = "";
            //oh look at this beautiful socket.io to get an goddamn ip address
            if (socket.handshake.headers != null)
                if (socket.handshake.headers["x-forwarded-for"] != null) {
                    IP = socket.handshake.headers["x-forwarded-for"].split(",")[0];
                }

            if (playerInfo.nickName == "")
                console.log("New user joined the server in lurking mode " + socket.id + " " + IP);
            else
                console.log("New user joined the game: " + playerInfo.nickName + " avatar# " + playerInfo.avatar + " color# " + playerInfo.color + " " + socket.id);

            var serverPlayers = Object.keys(io.sockets.connected).length + 1;

            var isBanned = false;

            //prevent banned IPs from joining
            if (IP != "") {
                var index = banned.indexOf(IP);
                //found
                if (index > -1) {
                    console.log("ATTENTION: banned " + IP + " is trying to log in again");
                    isBanned = true;
                    socket.emit("errorMessage", "You have been banned");
                    socket.disconnect();
                }

            }

	    // check if we already know this player
	    let isRelogging = false;
	    let oldID = idByIP(IP);
	    // we only count *real* people, not lurker sheeple
	    if (oldID != null && gameState.players[oldID].nickName != "" && 
		REMEMBER_IPS) {
		isRelogging = true;
	    }

            if (isBanned) {

            }
            //prevent a hacked client from duplicating players
            else if (gameState.players[socket.id] != null) {
                console.log("ATTENTION: there is already a player associated to the socket " + socket.id);
            }
            else if (serverPlayers > MAX_PLAYERS && MAX_PLAYERS != -1) {
                //limit the number of players
                console.log("ATTENTION: server has reached maximum capacity");
                socket.emit("errorMessage", "The server is full, please try again later.");
                socket.disconnect();
            }
	    // this person is re-logging in (we remember their IP)
	    else if (isRelogging) {
		  // since gameState indexes players by socket id, and we have 
		  // a new socket for this player, make a new one with updated
		  // id and delete index for the old player
		  let player = gameState.players[oldID];
		  console.log('Player ' + player.nickName + ' is relogging in');
		  console.log('old id: ' + player.id + ', new id: ', socket.id);
		  player.id = socket.id;
		  gameState.players[socket.id] = player;
	      	  delete gameState.players[oldID];

		  player.active = true;
                  io.sockets.emit('playerJoined', player); 
	    }
            else {

                //if client hacked truncate
                if (playerInfo.nickName.length > MAX_NAME_LENGTH)
                    playerInfo.nickName = playerInfo.nickName.substring(0, MAX_NAME_LENGTH);


                //the first validation was to give the player feedback, this one is for real
                var val = 1;

                //always validate lurkers, they can't do anything
                if (playerInfo.nickName != "")
                    val = validateName(playerInfo.nickName);

                if (val == 0 || val == 3) {
                    console.log("ATTENTION: " + socket.id + " tried to bypass username validation");
                }
                else {

                    //if there is an | strip the after so the password remains in the admin client
                    var combo = playerInfo.nickName.split("|");
                    playerInfo.nickName = combo[0];

                    if (val == 2)
                        console.log(playerInfo.nickName + " joins as admin");

		    let position;
                    if (playerInfo.nickName == "") {
		      // lurkers haven't really manifested in the world yet
		      // so just give them a provisional position
		      position = randomPointOnCircle(mostRecentPlayerPos, 200);
		    } else {
		      position = newPlayerPosition();
		    }

		    print('new player ' + playerInfo.nickName + '\'s position = ' + position.x + ', ' + position.y);
		    

		    // Date.now() and new Date().getTime() do the same thing
		    // return number of milliseconds since 1/1/70
		    // so it's an integer
                    var newPlayer = { id: socket.id, nickName: filter.clean(playerInfo.nickName), color: playerInfo.color, avatar: playerInfo.avatar, x: position.x, y: position.y, active: true, lastTimeActive: Date.now()};

                    //save the same information in my game state
                    gameState.players[socket.id] = newPlayer;
                    //set last message at the beginning of time, the SEVENTIES
                    gameState.players[socket.id].lastMessage = 0;
                    //is it admin?
                    gameState.players[socket.id].admin = (val == 2) ? true : false;
                    gameState.players[socket.id].spam = 0;
                    gameState.players[socket.id].lastActivity = new Date().getTime();
                    gameState.players[socket.id].muted = false;
                    gameState.players[socket.id].IP = IP;
                    gameState.players[socket.id].floodCount = 0;
		    

                    newPlayer.new = true;

                    //let's not count lurkers
                    if (playerInfo.nickName != "")
                        visits++;


                    //send all players information about the new player
                    //upon creation destination and position are the same 
                    io.sockets.emit('playerJoined', newPlayer);

		    //send info about all players to this player
		    for (var id in gameState.players) {
    		        if (id != newPlayer.id &&
			    gameState.players.hasOwnProperty(id)) {
			  let player = gameState.players[id];
			  if (player.nickname != "") {
			      console.log('sending new player info about player ' + id);
			      socket.emit('playerUpdateState', player);
			  }
			  // socket.emit('updatePlayerState', player);
    		        }
    		    }


                    console.log("There are now " + Object.keys(gameState.players).length + " players on this server. Total visits " + visits);
                }
            }
        } catch (e) {
            console.log("Error on join, object malformed from" + socket.id + "?");
            console.error(e);
        }
    });

    //when a client disconnects we just mark them inactive 
    socket.on('disconnect', function () {
        try {
            console.log("Player disconnected " + socket.id);

	    let player = gameState.players[socket.id];
	    if (player != null) {
	      // if it was just a lurker, delete them
	      if (player.nickName == "") {
	        delete gameState.players[socket.id];
	      } 
	      // but if it's a real boy, just mark them inactive
	      else {
		player.active = false;
		player.lastTimeActive = Date.now();
	        io.sockets.emit('playerUpdateState', player);
	      }
	    }
        }
        catch (e) {
            console.log("Error on disconnect, object malformed from" + socket.id + "?");
            console.error(e);
        }
    });



    //when I receive a user name validate it
    socket.on('sendName', function (nn) {
        try {

            var res = validateName(nn);

            //send the code 0 no - 1 ok - 2 admin
            socket.emit('nameValidation', res);
        } catch (e) {
            console.log("Error on sendName " + socket.id + "?");
            console.error(e);
        }
    });

    //user afk
    socket.on('focus', function (obj) {
        try {
	    let player = gameState.players[socket.id];
	    if (player) {
	      player.active = true;
	      io.sockets.emit('playerUpdateState', player);
	    }
        } catch (e) {
            console.log("Error on focus " + socket.id + "?");
            console.error(e);
        }
    });

    socket.on('blur', function (obj) {
        try {
	    let player = gameState.players[socket.id];
	    if (player) {
	      player.active = false;
	      player.lastTimeActive = Date.now();
	      io.sockets.emit('playerUpdateState', player);
	    }
        } catch (e) {
            console.log("Error on blur " + socket.id + "?");
            console.error(e);
        }
    });

    socket.on('test', function (obj) {
        try {
	  console.log('test! test! test!');
        } catch (e) {
            console.log("Error on test" + socket.id + "?");
            console.error(e);
        }
    });

});


//rate limiting - clears the flood count
setInterval(function () {
    for (var id in gameState.players) {
        if (gameState.players.hasOwnProperty(id)) {
            gameState.players[id].floodCount = 0;
        }
    }
}, 1000);


// bias towards being near people that recently logged on for the first time
// but not TOO near. we don't want to overlap with anybody else or feel
// claustrophobic
// returns an object with properties x and y
function newPlayerPosition() {
  // keeps trying to get a new position
  let newPos = randomPointOnCircle(mostRecentPlayerPos, 200);
  // this is so that we don't hang forever
  let failSafe = 0;
  while (!sociallyDistanced(newPos)) {
    if (failSafe > 100) {
      print('DEPLOYED FAILSAFE');
      break;
    }
    newPos = randomPointOnCircle(mostRecentPlayerPos, 200);
    failSafe++;
  }

  mostRecentPlayerPos = newPos;
  return newPos;
}

// does what it says on the tin
function randomPointOnCircle(center, r) {
  let theta = Math.random() * 2*Math.PI;
  return {x: center.x + r*Math.cos(theta),
	  y: center.y + r*Math.sin(theta)};
}

// returns true iff this position is far enough away from any extant players
function sociallyDistanced(pos) {
  let socialDistance = 100;

  for (var id in gameState.players) {
    if (gameState.players.hasOwnProperty(id)) {
      let x1 = gameState.players[id].x;
      let y1 = gameState.players[id].y;

      let x2 = pos.x;
      let y2 = pos.y;
	
      // distance check using trick to avoid Math.sqrt()
      if (socialDistance*socialDistance >=
	  (x1 - x2)*(x1 - x2) + (y1 - y2)*(y1-y2))
      {
        return false;
      }
    }
  }

  return true;
}



function validateName(nn) {

    var admin = false;
    var duplicate = false;
    var reserved = false;

    //check if the nickname is a name + password combo
    var combo = nn.split("|");

    //it may be
    if (combo.length > 1) {
        var n = combo[0];
        var p = combo[1];

        for (var i = 0; i < admins.length; i++) {
            if (admins[i].toUpperCase() == nn.toUpperCase()) {
                //it is an admin name! check if the password is correct, case insensitive 
                admin = true;
            }
        }
        //if there is an | just strip the after
        nn = n;
    }

    //if not admin check if the nickname is reserved (case insensitive)
    if (!admin) {
        for (var i = 0; i < admins.length; i++) {
            var combo = admins[i].split("|");
            if (combo[0].toUpperCase() == nn.toUpperCase()) {
                //it is! kill it. Yes, it should be done at login and communicated 
                //but hey I don't have to be nice to users who steal my name
                reserved = true;
            }
        }
    }

    var id = idByName(nn);
    if (id != null) {
        duplicate = true;
        console.log("There is already a player named " + nn);
    }

    //i hate this double negative logic but I hate learning regex more
    var res = nn.match(/^([a-zA-Z0-9 !@#$%&*(),._-]+)$/);

    if (res == null)
        return 3
    else if (duplicate || reserved)
        return 0
    else if (admin)
        return 2
    else
        return 1

}


//parse a potential admin command
function adminCommand(adminSocket, str) {
    try {
        //remove /
        str = str.substr(1);
        var cmd = str.split(" ");
        switch (cmd[0]) {
            case "kick":
                var s = socketByName(cmd[1]);
                if (s != null) {
                    //shadow disconnect
                    s.disconnect();

                }
                else {
                    //popup to admin
                    adminSocket.emit("popup", "I can't find a user named " + cmd[1]);
                }
                break;

            case "mute":
                var s = idByName(cmd[1]);
                if (s != null) {
                    gameState.players[s].muted = true;
                }
                else {
                    //popup to admin
                    adminSocket.emit("popup", "I can't find a user named " + cmd[1]);
                }
                break;

            case "unmute":
                var s = idByName(cmd[1]);
                if (s != null) {
                    gameState.players[s].muted = false;
                }
                else {
                    //popup to admin
                    adminSocket.emit("popup", "I can't find a user named " + cmd[1]);
                }
                break;

            //trigger a direct popup
            case "popup":

                var s = socketByName(cmd[1]);
                if (s != null) {
                    //take the rest as string
                    cmd.shift();
                    cmd.shift();
                    var msg = cmd.join(" ");
                    s.emit("popup", msg);
                }
                else {
                    //popup to admin
                    adminSocket.emit("popup", "I can't find a user named " + cmd[1]);
                }
                break;

            //send fullscreen message to everybody
            case "god":
                cmd.shift();
                var msg = cmd.join(" ");
                io.sockets.emit('godMessage', msg);
                break;


            //add to the list of banned IPs
            case "ban":
                var IP = IPByName(cmd[1]);
                var s = socketByName(cmd[1]);
                if (IP != "") {
                    banned.push(IP);
                }

                if (s != null) {
                    s.emit("errorMessage", "You have been banned");
                    s.disconnect();
                }
                else {
                    //popup to admin
                    adminSocket.emit("popup", "I can't find a user named " + cmd[1]);
                }

                break;

            case "unban":
                //releases the ban
                banned = [];
                break;

            //forces a hard refresh - all players disconnect
            //used to load a new version of the client
            case "refresh":
                io.sockets.emit("refresh");
                break;

        }
    }
    catch (e) {
        console.log("Error admin command");
        console.error(e);
    }
}

function idByIP(ip) {
    var i = null;
    for (var id in gameState.players) {
        if (gameState.players.hasOwnProperty(id)) {
            if (gameState.players[id].IP == ip) {
                i = id;
            }
        }
    }
    return i;
}

//admin functions, the admin exists in the client frontend so they don't have access to ip and id of other users
function socketByName(nick) {
    var s = null;
    for (var id in gameState.players) {
        if (gameState.players.hasOwnProperty(id)) {
            if (gameState.players[id].nickName.toUpperCase() == nick.toUpperCase()) {
                s = io.sockets.sockets[id];
            }
        }
    }
    return s;
}

function idByName(nick) {
    var i = null;
    for (var id in gameState.players) {
        if (gameState.players.hasOwnProperty(id)) {
            if (gameState.players[id].nickName.toUpperCase() == nick.toUpperCase()) {
                i = id;
            }
        }
    }
    return i;
}

function IPByName(nick) {
    var IP = "";
    for (var id in gameState.players) {
        if (gameState.players.hasOwnProperty(id)) {
            if (gameState.players[id].nickName.toUpperCase() == nick.toUpperCase()) {
                IP = gameState.players[id].IP;
            }
        }
    }
    return IP;
}


//listen to the port 3000 this powers the whole socket.io
http.listen(port, function () {
    console.log('listening on *:3000');
});


function goneForever(player) {
  return (!player.active &&
	  (Date.now() - player.lastTimeActive > 24*60*60*1000));
}

// permanently forget players that have been gone for more than 24 hours
// runs once an hour
setInterval(function () {
    for (var id in gameState.players) {
        if (gameState.players.hasOwnProperty(id)) {
	  let player = gameState.players[id];
	  if (goneForever(player)) {
	    console.log(id + " has been inactive for more than 24 hours");
	    delete gameState.players[id];
	    // broadcast to all clients, telling them to delete this player
	    io.sockets.emit('goneForever', player);

	    // if this player has been inactive due to not having their 
	    // screen focused (e.g. window open in background), force refresh
            let socket = io.sockets.sockets[id];
	    if (socket)
	      socket.emit('refresh');
	  }
        }
    }
}, 60*60*1000);



//in my gallery people can swear but not use slurs, override bad-words list, and add my own, pardon for my french
let myBadWords = ['chink', 'cunt', 'cunts', "fag", "fagging", "faggitt", "faggot", "faggs", "fagot", "fagots", "fags", "jap", "homo", "nigger", "niggers", "n1gger", "nigg3r"];
var filter = new Filter({ emptyList: true });
filter.addWords(...myBadWords);

//p5 style alias
function print(s) { console.log(s); }

