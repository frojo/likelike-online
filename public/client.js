var debugImg;
//check README.md for more information

//VS Code intellisense
/// <reference path="TSDef/p5.global-mode.d.ts" />

/*
The client and server version strings MUST be the same!
If the server gets updated it can be restarted, but if there are active clients (users' open browsers) they could be outdated and create issues.
*/
var VERSION = "1.0";

//for testing purposes I can skip the login phase
//and join with a random avatar
var QUICK_LOGIN = false;

//true: preview the game as invisible user
//false: go directly to the login without previewing the room
//ignored if QUICK_LOGIN is true
var LURK_MODE = true;

//can by changed by user
var SOUND = true;
var AFK = false;

//native canvas resolution
var WIDTH = 1024;
var HEIGHT = 1024;

// our "canvas" is square
var NATIVE_SIZE = 1024;


//dynamically adjusted based on the window
var canvasScale;
var landscapeMode;

//all avatars are the same size
var AVATAR_W = 16
var AVATAR_H = 16;
//number of avatars in the sheets
var AVATARS = 1;

var AVATAR_SPRITE_FILE = "avatar-large.png";

//the socket connection
var socket;
//sent by the server
var SETTINGS;

//avatar linear speed, pixels per milliseconds
var SPEED = 50;

var ASSETS_FOLDER = "assets/";

//text vars
//MONOSPACED FONT
//thank you https://datagoblin.itch.io/monogram
var FONT_FILE = "assets/monogram_extended.ttf";
var FONT_SIZE = 64;
var ACTIVE_FONT_SIZE = 32;
var ACTIVE_TEXT_H = 8;
var font;
var TEXT_H = 8;
var TEXT_PADDING = 12;
var TEXT_LEADING = TEXT_H + 4;

var LOGO_FILE = "logo.png";
var MENU_BG_FILE = "menu_white.png";

//how long does the text bubble stay
var BUBBLE_TIME = 8;
var BUBBLE_MARGIN = 3;

//when lurking the logo can disappear
//in millisecs, -1 forever in lurk mode
var LOGO_STAY = -1;

//default page background 
var PAGE_COLOR = "#000000";

// grey instagram background
var INSTA_GREY = '#FAFAFA';

//sprite reference color for palette swap
//hair, skin, shirt, pants
var REF_COLORS = ['#413830', '#c0692a', '#ff004d', '#29adff'];
//the palettes that will respectively replace the colors above

//GUI
var LABEL_NEUTRAL_COLOR = "#FFFFFF";
var UI_BG = "#000000";

//the big spritesheet
var allSheets;

// holds the base avatar sprite (it's white, no tinting yet)
var avatarBaseSprite;

//current room bg and areas
var bg;
var areas;

//command quequed for when the destination is reached
var nextCommand;

//my client only, rollover info
var areaLabel;
var labelColor;
var rolledSprite;


// the following vars are used for having that fade-in effect on mouseover

// how many frames we've been hovering over the label
var hoverTimer = 0;

// a number between 0 and 1 that the represents the opacity modifier for the
// label that is being hovered over currently
var labelOpacityPct = 0;

//GUI
//shows up at the beginning, centered, overlapped to room in lurk mode
var logo;
var logoCounter;

//when pointing on walkable area shows this
var walkIcon;

var menuBg, arrowButton;
//p5 play group, basically an arraylist of sprites
var menuGroup;
//p5 play animation
var avatarPreview;

//long text variables, message that shows on my client only (written text, narration, god messages...)
var longText = "";
var longTextLines;
var longTextAlign;
var longTextLink = "";
var LONG_TEXT_BOX_W = 220;
var LONG_TEXT_PADDING = 4;

//To show when banned or disconnected, disables the client on black screen
var errorMessage = "";

//speech bubbles
var bubbles = [];

//when the nickName is "" the player is invisible inactive: lurk mode
//for admins it contains the password so it shouldn't be shared
var nickName = "";

//these are indexes of arrays not images or colors
var currentAvatar;
var currentColor;

// holds the color picker (can do colorPicker.color() to get current value)
var colorPicker;

//this object keeps track of all the current players in the room, coordinates, bodies and color
var players;
//a reference to my player
var me;
//the canvas object
var canvas;
//draw loop state: user(name), avatar selection or game
var screen;

//set the time at the beginning of the computing era, the SEVENTIES!
var lastMessage = 0;

//sounds
var blips;
var appearSound, disappearSound;

// white noise overlay
var whiteNoiseAnim;
var whiteNoiseAnimIndex = 0;
var whiteNoiseLoaded = false;

// mask overlay that makes the border fuzzy and circular
var borderMask;

//if the server restarts the clients reconnects seamlessly
//don't do first log kind of things
var firstLog = true;

//async check
var serverWelcomed = false;
var gameStarted = false;

// is the player dragging to pan?
var isPanning = false;

// is the player relogging in
var relog = false;

// number of frames that the player has spent with their mouse hovering over
// another avatar
// used for the little magic trick of adjusting mouse temperature thresholds
// for tender rubbing
var framesSpentHovering = 0;

// opacity for the be gentle label
var beGentleLabelOpacityPct = 0;
var beGentleX = 0;
var beGentleY = 0;
// this is currently only used for detecting things for the "be gentle" label
var lastRolledSprite = null;

// timestamp for when we start a new game
// used for tuning mouse temperature tenderness thresholds
var newGameStarted = 0;

// are we on a touch device?
var touchDevice = false;


/*
Things are quite asynchronous here. This is the startup sequence:

* preload() preload general assets - avatars, icons etc
* setup() assets loaded - slice, create canvas and create a temporary socket that only listens to DATA
* wait for settings and room data from the server 
* data is received, ROOM object exists BUT its damn images aren't loaded yet
* check the loading images in draw() until they all look like something
* when room images are loaded go to setupGame() and to lurking mode or fast track with a random username due to QUICK_LOGIN
    In lurking mode (username "") you can see everybody, you are invisible and can't do anything
    BUT you are technically in the room
* when click on the "join" button go to the username and avatar selection screens, back and forth for name validation
* when name is approved the player joins ("playerJoined" event) the room again with the real name and avatar
* upon room join all clients send their intro information and the scene is populated
* changing room is handled in the same way with "playerJoined"
* if server restarts the assets and room data is kept on the clients and that's also a connect > playerJoined sequence
*/


//setup is called when all the assets have been loaded
function preload() {

    document.body.style.backgroundColor = 'black';
    avatarBaseSprite = loadImage(ASSETS_FOLDER + AVATAR_SPRITE_FILE);

    font = 'Helvetica';

    // whiteNoiseAnim = createImg(ASSETS_FOLDER + 'white-noise1.gif');
    whiteNoiseAnim = new p5Gif.loadGif(ASSETS_FOLDER + 'white-noise1.gif',
			  function () {
			    whiteNoiseLoaded = true;
			  });
  
    borderMask = loadImage(ASSETS_FOLDER + 'fuzzy-border-mask.png');
}


//this is called when the assets are loaded
function setup() {

    //create a canvas
    canvas = createCanvas(WIDTH, HEIGHT);

    //accept only the clicks on the canvas (not the ones on the UI)
    canvas.mousePressed(canvasPressed);
    canvas.mouseReleased(canvasReleased);
    canvas.mouseOut(outOfCanvas);
    //by default the canvas is attached to the bottom, i want it in the container
    canvas.parent('canvas-container');

    //adapt it to the browser window 
    scaleCanvas();

    //the page link below
    showInfo();

    //I create a socket but I wait to assign all the functions before opening a connection
    socket = io({
        autoConnect: false
    });

    //server sends out the response to the name submission, only if lurk mode is disabled
    //it's in a separate function because it is shared between the first provisional connection 
    //and the "real" one later
    socket.on('nameValidation', nameValidationCallBack);

    //first server message with version and game data
    socket.on('serverWelcome',
        function (serverVersion, DATA, isRelog) {
            if (socket.id) {
                console.log("Welcome! Server version: " + serverVersion + " - client version " + VERSION);

                //this is before canvas so I have to html brutally
                if (serverVersion != VERSION) {
                    errorMessage = "VERSION MISMATCH: PLEASE HARD REFRESH";
                    document.body.innerHTML = errorMessage;
                    socket.disconnect();
                }

		relog = isRelog;
		serverWelcomed = true;

            }
        }
    );

    //I can now open it
    socket.open();
}


function draw() {
    if (serverWelcomed && whiteNoiseLoaded && !gameStarted) {
        setupGame();
    }

    //this is the actual game loop
    if (gameStarted) {
        update();
    }
}

//called once upon data and image load
function setupGame() {

    gameStarted = true;


    if (QUICK_LOGIN) {
        //assign random name and avatar and get to the game
        nickName = "user" + floor(random(0, 1000));
        newGame();
    }
    else if (!LURK_MODE) {

        //paint background
	background(PAGE_COLOR);
        showUser();

    }
    else {
        nickName = "";
        newGame();
    }
}



function newGame() {

    screen = "game";
    nextCommand = null;
    areaLabel = "";
    rolledSprite = null;
    lastRolledSprite = null;
    logoCounter = 0;

    hideUser();
    hideColor();

    if (nickName != "") {
      fadeInfoToBlack();
    }

    if (menuGroup != null)
        menuGroup.removeSprites();

    //this is not super elegant but I create another socket for the actual game
    //because I've got the data from the server and I don't want to reinitiate everything 
    //if the server restarts
    if (socket != null) {
        //console.log("Lurker joins " + socket.id);
        socket.disconnect();
        socket = null;
    }

    //I create a socket but I wait to assign all the functions before opening a connection
    socket = io({
        autoConnect: false
    });

    // set width and height of white noise effect
    whiteNoiseAnim.width = WIDTH;
    whiteNoiseAnim.height = HEIGHT;

    //paint background
    background(PAGE_COLOR);

    //initialize players as object
    players = {};


    //all functions are in a try/catch to prevent a hacked client from sending garbage that crashes other clients 

    //if the client detects a server connection it may be because the server restarted 
    //in that case the clients reconnect automatically and are assigned new ids so I have to clear
    //the previous player list to avoid ghosts
    //as long as the clients are open they should not lose their avatar and position even if the server is down
    socket.on('connect', function () {
        try {
            players = {};

            //ayay: connection lost while setting up character, just force a refresh
            if (screen == "avatar" || screen == "user") {
                screen = "error";
                errorMessage = "SERVER RESTARTED: PLEASE REFRESH";
                socket.disconnect();
            }


            //first time
            if (me == null) {
		// PLAYER INIT init
		
		console.log('sending first join');

                //send the server my name and avatar
                socket.emit('join', { nickName: nickName, color: currentColor, avatar: currentAvatar});
            }
            else {

                socket.emit('join', { nickName: nickName, color: currentColor, avatar: currentAvatar});
            }
        } catch (e) {
            console.log("Error on connect");
            console.error(e);
        }

    });//end connect


    //when somebody joins the game create a new player
    socket.on('playerJoined',
        function (p) {
            try {
                //console.log("new player in the room " + p.room + " " + p.id + " " + p.x + " " + p.y + " color " + p.color);

                //stop moving
                p.destinationX = p.x;
                p.destinationY = p.y;

                //if it's me///////////
                if (socket.id == p.id) {
                    rolledSprite = null;
                    lastRolledSprite = null;

                    players = {};

                    deleteAllSprites();

                    players[p.id] = me = new Player(p);
		    nickName = me.nickName;
		
		    camera.position.x = me.x;
		    camera.position.y = me.y;

                }//it me
                else {
		    // register new player
                    players[p.id] = new Player(p);
                }

                if (p.new && p.nickName != "" && firstLog) {
                    firstLog = false;
                }

                console.log("There are now " + Object.keys(players).length + " players in this room");

            }
            catch (e) {
                console.log("Error on playerJoined");
                console.error(e);
            }
        }
    );

    // a general purpose signal for updating one player's state
    // used to mostly mark players active/inactive
    socket.on('playerUpdateState',
	function(p) {
	  try {
	    // remove the old sprite before overwriting player entry
	    // (if there is one)
	    if (players[p.id] && players[p.id].sprite != null) {
	      if (players[p.id].sprite == rolledSprite) {
                rolledSprite = null;
                lastRolledSprite = null;
	      }
	      removeSprite(players[p.id].sprite);
	    }
	    
	    let player = new Player(p);
	    if (p.id == me.id) {
	      me = player;
	    }
	    players[p.id] = player;
	  } catch (e) {
	      console.log('Error on playerUpdateState');
	      console.error(e)
	  }
    });

    // delete and forget this player
    socket.on('goneForever',
	function(p) {
	  try {
	    let player = players[p.id];
 	    if (!player)
 	      return;

 	    // clean up sprite things
 	    if (player.sprite != null) {
 	      if (player.sprite == rolledSprite) {
 	        rolledSprite = null;
 	      }
 	      removeSprite(player.sprite);
 	    }

 	    // forget player from our master list
 	    delete players[p.id];
	  } catch (e) {
	      console.log('Error on goneForever');
	      console.error(e)
	  }
    });



    // when a player reopens the page
    socket.on('playerRejoined',
        function (p) {
            try {
		// the client /should/ have this player on record already
		// but in case we don't, just re-init it
                players[p.id] = new Player(p);

                console.log("Player " + p.id + " has rejoined the network");
            } catch (e) {
                console.log("Error on playerRejoined");
                console.error(e);
            }
        }
    );


    //displays a message upon connection refusal (server full etc)
    //this is an end state and requires a refresh or a join
    socket.on('errorMessage',
        function (msg) {
            if (socket.id) {
                screen = "error";
                errorMessage = msg;
                hideUser();
                hideColor();
            }
        }
    );



    //when a server message arrives
    socket.on('godMessage',
        function (msg) {
            if (socket.id) {

                longText = msg;
                longTextLines = -1;
                longTextAlign = "center";
                longTextLink = "";
            }
        }
    );

    //when a server message arrives
    socket.on('playerEmoted',
        function (id, em) {
            try {
                if (players[id] != null) {
                    if (players[id].sprite != null) {

                        if (em) {
                            players[id].sprite.changeAnimation("emote");
                            players[id].sprite.animation.changeFrame(1);
                            players[id].sprite.animation.stop();
                        }
                        else {
                            players[id].sprite.changeAnimation("emote");
                            players[id].sprite.animation.changeFrame(0);
                            players[id].sprite.animation.stop();
                        }
                    }


                }

            } catch (e) {
                console.log("Error on playerTalked");
                console.error(e);
            }
        });


    //server sends out the response to the name submission, only if lurk mode is enabled
    //it's in a separate function because it is shared between the first 
    //provisional connection (earlier)
    //and the "real" one here
    socket.on('nameValidation', nameValidationCallBack);


    //when a server message arrives
    socket.on('popup',
        function (msg) {
            if (socket.id) {
                alert(msg);
            }
        }
    );

    //when the client realizes it's being disconnected
    socket.on('disconnect', function () {
        //console.log("OH NO");
	// lol
    });

    //server forces refresh (on disconnect or to force load a new version 
    // of the client, or when client has been inactive for too long)
    socket.on('refresh', function () {
        socket.disconnect();
        location.reload(true);
    });

    newGameStartedTime = Date.now();

    //I can now open it
    socket.open();

}



//this p5 function is called continuously 60 times per second by default
function update() {

    // print('mouseX = ' + mouseX);
    // print('movedX = ' + movedX);

    if (screen == "user") {
      // freeze for that charming jankiness
    }
    //renders the avatar selection screen which can be fully within the canvas
    else if (screen == "avatar") {
	background(PAGE_COLOR);

        textFont(font, FONT_SIZE * 2);
        textAlign(CENTER, BASELINE);
        fill(0);

        text('choose your color', WIDTH / 2, HEIGHT * .2);

        menuGroup.draw();
    }
    else if (screen == "error") {
        //end state, displays a message in full screen
        textFont(font, FONT_SIZE);
        textAlign(CENTER, CENTER);
        fill(UI_BG);
        rect(0, 0, WIDTH, HEIGHT);
        fill(LABEL_NEUTRAL_COLOR);

        text(errorMessage, floor(WIDTH / 8), floor(HEIGHT / 8), WIDTH - floor(WIDTH / 4), HEIGHT - floor(HEIGHT / 4) + 1);
    }
    else if (screen == "game") {

        //draw a background
	// for some reason, background() wasn't drawing the whole background
	camera.off();
	fill(PAGE_COLOR);
	rect(0, 0, width, height);
	// background(PAGE_COLOR);

	// // draw slight white noise effect
	// // yes, there's probably a better way to do this
	tint(255, 44);
	imageMode(CENTER);
	image(whiteNoiseAnim._frames[whiteNoiseAnimIndex++], 
	  width / 2, height / 2, whiteNoiseAnim.width, whiteNoiseAnim.height);
	if (whiteNoiseAnimIndex >= whiteNoiseAnim._frames.length)
                whiteNoiseAnimIndex = 0;
	noTint();

	camera.on();
        // textFont(font, FONT_SIZE);

        //iterate through the players
        for (var playerId in players) {
            if (players.hasOwnProperty(playerId)) {
                var p = players[playerId];

                //make sure the coordinates are non null since I may have created a player
                //but I may still be waiting for the first update
                if (p.x != null && p.y != null) {
		    p.updatePosition();
                }

		p.updateLabelOpacity();
            }
        }//player update cycle


	// update gentle label opacity
	let too_fast = getUpperTempThreshold();
	let opacityIncr = .01;
	let opacityDecr = .03;
	let temperature = getTemperature();

	// bring up the label if we're stroking too fast
	if (nickName != '' && rolledSprite 
	      && temperature > too_fast) {
	  beGentleLabelOpacityPct += opacityIncr;
	} else {
	  beGentleLabelOpacityPct -= opacityDecr;
	}
	beGentleLabelOpacityPct = constrain(beGentleLabelOpacityPct, 0, 1);

        //set the existing sprites' depths in relation to their position
        for (var i = 0; i < allSprites.length; i++) {
            //sprites on the bottom will be drawn first
            allSprites[i].depth = allSprites[i].position.y + allSprites[i].height / 2;

        }

	// click and drag to pan camera
	if (isPanning) {
	  let dx = mouseX - pmouseX;
	  camera.position.x += -dx;
	  let dy = mouseY - pmouseY;
	  camera.position.y += -dy;
	}

	// scale(1/canvasScale, 1/canvasScale);
        drawSprites();

        // GUI
	
	// draw player labels
        for (var playerId in players) {
            if (players.hasOwnProperty(playerId)) {
                var p = players[playerId];
		// draw rollover labels
		if (p && p.nickName != '' && !goneForever(p)) {
		  // draw nama label
	       	  let lx = p.sprite.position.x;

		  // we use sqrt() bc of weird positioning stuff when you
		  // zoom. look, it works, okay
	       	  let ly = p.sprite.position.y - 
	       	           sqrt(p.sprite.collider.size().y)*5.5;

		  drawLabel(p.nickName, lx, ly,
			    p.labelOpacityPct*opacityFromActivity(p));

	       	  // don't show activity for myself
	       	  if (me != null && me.sprite != p.sprite) {
	       	    // draw activity label (below circle)
	       	    let lx = p.sprite.position.x;

		    // we use sqrt() bc of weird positioning stuff when you
		    // zoom. look, it works, okay
	       	    let ly = p.sprite.position.y + 
			     sqrt(p.sprite.collider.size().y)*5.5;

		    drawLabel(activityLabel(p), lx, ly,
			      p.labelOpacityPct*opacityFromActivity(p));
	       	  }
		}
	    }
        }

	// draw be gentle label
	if (rolledSprite) {
	  beGentleX = rolledSprite.position.x;
	  beGentleY = rolledSprite.position.y;
	}
	drawLabel('be gentle', beGentleX, beGentleY, 
		  beGentleLabelOpacityPct*255);
	    
	camera.off();

	// draw black letterboxes around main screen
	// this covers up players so that they don't fade in to dark
	// with the border mask, but then pop out the other size
	fill('black');

	let margin;
	if (landscapeMode) {
	  margin = (width - NATIVE_SIZE) / 2;
	  // left box
	  rect(0, 0, margin, height);
	  // right box
	  rect(margin + NATIVE_SIZE, 0, margin, height);
	} else {
	  margin = (height - NATIVE_SIZE) / 2;
	  // top box
	  rect(0, 0, width, margin);
	  // bottom box
	  rect(0, margin + NATIVE_SIZE, width, margin);
	}

	// fuzzy border mask
	noTint();
	imageMode(CENTER);
	image(borderMask, width/2, height/2);

	camera.on();

        //long text above everything
        if (longText != "" && nickName != "") {

            noStroke();
            textFont(font, FONT_SIZE);
            textLeading(TEXT_LEADING);

            //dramatic text on black
            if (longTextLines == -1) {

                if (longTextAlign == "left")
                    textAlign(LEFT, CENTER);
                else
                    textAlign(CENTER, CENTER);

                fill(UI_BG);
                rect(0, 0, width, height);
                fill(LABEL_NEUTRAL_COLOR);
                //-1 to avoid blurry glitch
                text(longText, LONG_TEXT_PADDING, LONG_TEXT_PADDING, width - LONG_TEXT_PADDING * 2, height - LONG_TEXT_PADDING * 2 - 1);
            }
            else {

                if (longTextAlign == "left")
                    textAlign(LEFT, BASELINE);
                else
                    textAlign(CENTER, BASELINE);

                //measuring text height requires a PhD so we
                //require the user to do trial and error and counting the lines
                //and use some magic numbers
		// lol

                var tw = LONG_TEXT_BOX_W - LONG_TEXT_PADDING * 2;
                var th = longTextLines * TEXT_LEADING;


                //single line centered text
                if (longTextAlign == "center" && longTextLines == 1)
                    tw = textWidth(longText + " ");

                var rw = tw + LONG_TEXT_PADDING * 2;
                var rh = th + LONG_TEXT_PADDING * 2;

                fill(UI_BG);

                rect(floor(width / 2 - rw / 2), floor(height / 2 - rh / 2), floor(rw), floor(rh));
                //rect(20, 20, 100, 50);

                fill(LABEL_NEUTRAL_COLOR);
                text(longText, floor(width / 2 - tw / 2 + LONG_TEXT_PADDING - 1), floor(height / 2 - th / 2) + TEXT_LEADING - 3, floor(tw));
            }
        }//end long text


        if (nickName == "" && (logoCounter < LOGO_STAY || LOGO_STAY == -1)) {
            logoCounter += deltaTime;

	    // we draw ui without camera
	    camera.off();
            textAlign(CENTER, BASELINE);
	    textFont(font, FONT_SIZE);

	    // white with black outline
            fill(255);
	    stroke(0);
	    strokeWeight(1);
	    // text('souls', WIDTH/2, HEIGHT/2);
	    camera.on();
	    
            // animation(logo, floor(width / 2), floor(height / 2));
        }

    }//end game


}

// given a string <s>, draws a label at <x>, <y>, with <opacity>
function drawLabel(s, lx, ly, opacity) {
	// need to set these before calling textWidth() for it to work
	// correctly
        textFont(font, ACTIVE_FONT_SIZE);
        textAlign(CENTER, CENTER);

	let padding_x = 7;
	let padding_y = 5;

	// position it in the middle of the screen for now
        let lw = textWidth(s);

	// draw background rectangle
        fill(0, 0, 0, opacity);
        noStroke();
	rectMode(CENTER);
        rect(floor(lx), floor(ly), 
	     lw + padding_x*2, 
	     ACTIVE_FONT_SIZE + padding_y*2);

	// draw text
        fill(255, 255, 255, opacity);
        text(s, floor(lx), floor(ly));
}

// checks if player has been gone for more than 24 hours
function goneForever(player) {
  return (!player.active && 
	  (Date.now() - player.lastTimeActive > 24*60*60*1000));
}


// pretty prints the active label
// returns a string
function activityLabel(player) {
  if (player.active)
    return 'active now';

  // time in ms since last time active
  let time_ms = Date.now() - player.lastTimeActive;

  // away for less than an hour, so we do minute granularity
  if (time_ms < 60*60*1000) {
    let minutes = floor(time_ms / (60*1000));
    if (minutes == 0)
      minutes = 1;
    return 'active ' + minutes + 'm ago';
  }

  // away for more than an hour, but less than 8 hours, hour granularity
  else if (time_ms < 8*60*60*1000) {
    let hours = floor(time_ms / (60*60*1000));
    return 'active ' + hours + 'h ago';
  }
  
  // if away for more than 8 hours, we vague like fb
  return 'active a while ago';
}



function windowResized() {
    scaleCanvas();
}


// scale to the smallest dimension
// we're trying to fit our square canvas into whatever the form factor
// is (i.e. portrait for phone, landscape for laptop)
//
// if, for example, we're in a portrait window:
//  _________ 
// |_ _ _ _ _| <- this padding on top (and bottom) is also part 
// |         |    of the p5 canvas
// |"canvas" | <- this square part is our "canvas"
// |         |    although we extend the true p5 canvas to the whole window
// |_ _ _ _ _| 
// |_________| 
//
// our "canvas" is always a square with sides of length NATIVE_SIZE
function scaleCanvas() {

    let aspectRatio = windowWidth / windowHeight;
    
    // landscape
    if (windowWidth > windowHeight) {
	landscapeMode = true;
        canvasScale = windowHeight / NATIVE_SIZE;
	height = NATIVE_SIZE;
	width = NATIVE_SIZE * (windowWidth / windowHeight);
    }
    // portrait
    else {
	landscapeMode = false;
        canvasScale = windowWidth / WIDTH;
	width = NATIVE_SIZE
	height = NATIVE_SIZE * (windowHeight / windowWidth);
    }

    resizeCanvas(width, height);

    // stretch that canvas across the entire window
    //if (canvas) {
      canvas.style("width", windowWidth + "px");
      canvas.style("height", windowHeight + "px");
    //}

    var container = document.getElementById("canvas-container");
    container.setAttribute("style", "width:" + windowWidth + "px; height: " + windowHeight + "px");

}

function colorSelection() {

    var randomColor = color(floor(random(255)), floor(random(255)), floor(random(255)));
    colorPicker = createColorPicker(randomColor);
    colorPicker.class('color-picker-input');
    colorPicker.parent('color-picker-container');

    // call setCurrentColor() every time user sets color with color picker
    colorPicker.input(setCurrentColor);
    setCurrentColor();
}

function setCurrentColor() {
  // .value() returns a color string
  currentColor = colorPicker.value();
}

//copy the properties
function Player(p) {
    this.id = p.id;
    this.nickName = p.nickName;
    this.color = p.color;
    this.avatar = p.avatar;
    this.ignore = false;

    // is this player currently active?
    this.active = p.active;
    // timestamp
    this.lastTimeActive = p.lastTimeActive;

    this.sprite = createSprite(100, 100);

    if (this.nickName == "") {
        this.sprite.mouseActive = false;
    }
    else {
      // todo
      // this is where we create the colored spirte
	this.avatarSprite = tintGraphics(avatarBaseSprite, this.color);

	// saveCanvas(this.avatarSprite.canvas, 'favicon.ico');
    	this.sprite.addImage('default', this.avatarSprite);
        this.sprite.mouseActive = true;
    }

    //this.sprite.debug = true;

    //no parent in js? WHAAAAT?
    this.sprite.id = this.id;
    this.sprite.label = p.nickName;

    // a number between 0 and 1 that the represents the opacity modifier
    // for the label that is being hovered over currently
    this.labelOpacityPct = 0;

    // if (brightness(c) > 30)
    //     this.sprite.labelColor = color(this.color)
    // else
    //     this.sprite.labelColor = color(this.color)

    this.x = p.x;
    this.y = p.y;
    this.destinationX = p.destinationX;
    this.destinationY = p.destinationY;

    //lurkmode
    if (this.nickName == "")
        this.sprite.visible = false;


    this.updatePosition = function () {
        this.sprite.position.x = round(this.x);
        this.sprite.position.y = round(this.y - AVATAR_H / 2 * this.sprite.scale);
    }

    // the idea is that in order to see someone's activity, you have to
    // tenderly stroke their avatar with your cursor (/finger on touch device)
    // uWu
    //
    // "mouse temperature" means how fast the cursor is being moved
    // if you shake the mouse erratically, you get a high mouse temperature
    // if the mouse is not moving, the mouse temperature is 0
    //
    // to reveal the label, you have to move the mouse at just the right 
    // speed, not too fast not too slow
    this.updateLabelOpacity = function () {
      // let too_fast = 1.2;
      // let too_slow = .9;
      let too_fast = getUpperTempThreshold();
      let too_slow = getLowerTempThreshold();
      let opacityIncr = .015;
      let opacityDecr = .003;

      let temperature = getTemperature();

      // print('temp = ' + temperature);
      
      // increment when the cursor is stroking us tenderly
      if (nickName != '' && this.sprite.mouseIsOver &&
	  temperature <= too_fast && temperature >= too_slow) {
	  this.labelOpacityPct += opacityIncr;

	  // this will only increment when mouse is at a tender temp
	  // but that's probabably okay
	  framesSpentHovering += 1;
      }
      // otherwise, fade into nothingness
      else {
        this.labelOpacityPct -= opacityDecr;
      }

      this.labelOpacityPct = constrain(this.labelOpacityPct, 0, 1);
    }


    if (this.nickName != "") {
        this.sprite.onMouseOver = function () {
	    if (touchDown) {

	    }
            rolledSprite = this;
	    if (lastRolledSprite != rolledSprite) {
	      beGentleLabelOpacityPct = 0;
	    }

	    // a little hand for rubbing
	    cursor('grab');
        };

        this.sprite.onMouseOut = function () {
            if (rolledSprite == this) {
		lastRolledSprite = rolledSprite;
                rolledSprite = null;
	    }
	    cursor();
        };

        this.sprite.onMousePressed = function () {

        };
    }

    //ugly as fuck but javascript made me do it
    this.sprite.originalDraw = this.sprite.draw;
    this.sprite.draw = function () {
        if (!this.ignore) {
	    let player = players[this.id];

	    // don't draw if player gone for more than 24 hours
	    if (!player || goneForever(player))
	      return;

            tint(255, opacityFromActivity(player));

	    // ellipse(0, 0, 40, 40);

            this.originalDraw();
            noTint();
        }
    }

    // this.stopWalkingAnimation();
    this.sprite.changeImage('default');

}

// calculates oppacity of player sprite based on how long they've been inactive.
// 255 is completely opaque, 0 is transparent.
// a player's sprite is completely opaque when they're active.
// when they become inactive, there's an immediate drop-off in opacity, and
// then an exponential decay until the sprite.
// fades into complete nothingness at around 24h
function opacityFromActivity(p) {
  if (p.active)
    return 255;

  let max_time_inactive_ms = 24*60*60*1000;
  let time_inactive_ms = Date.now() - p.lastTimeActive;

  // exponential decay (so it's a steeper drop off at the beginning)
  // also it's more ~~natural~~ than linear decay
  // tau_ms is the time it takes for opacity to get to ~.36 of starting value.
  // ty wikipedia https://en.wikipedia.org/wiki/Exponential_decay
  let tau_ms = max_time_inactive_ms*.6;
  let opacity = 150*exp(-(1/tau_ms)*time_inactive_ms);

  return opacity;
}

// returns the mouse or touch "temperature" aka how much it's moving.
// erratically moving your mouse around is high temperature, not moving 
// at all is 0 temperature
function getTemperature() {
  // using a mouse
  if (!touchDevice) {
    return mag(movedX, movedY);

  } 
  // using touch
  else {
    // we divide by 10 because touch is weird
    let touchTemp = mag(touchMovedX, touchMovedY) / 10;
    return touchTemp;
  }
  return 0;
}

// honestly, i probably could just make them snap to thresholds after a bit
// but whtever i already coded this and it works good enough

// try to time this with however long it takes for the label to fully appear
// (roughly)
function getLowerTempThreshold() {

  //
  //   |               
  //   |                /
  //   |    thresh->  /
  //   |            /
  //   |          /
  // 0 |________/_______
  //      elbow^
  //      framesSpentHovering
  let elbow = 100;

  let thresh = 0;
  if (framesSpentHovering < elbow) {
    thresh = 0;
  } else {
    thresh = constrain((framesSpentHovering - elbow) / 100, 0, .9);
  }

  // remember that we want to end on .9
  return thresh;
}

// and this one maybe we only lower it when the player is hovering AND moving
// the mouse (which they will be ofrced to do when we raise the lower 
// threshold)
function getUpperTempThreshold() {

  // return 1.2;
  // realistically, can never really go over 200 (almost never above 100)
  let initial = 200;

  
  // this gets to 2 in a couple seconds
  let thresh = constrain(initial - framesSpentHovering*5, 2, initial);

  // then we step down to 1.5 at the 30 second mark
  // (you have to rub pretty slowly for 1.5, but it's doable i think)
  let now = Date.now();
  if (now - newGameStartedTime > 30*1000) {
    thresh = 1.5;
  }
  
  // then step down again to 1.2 at 3 minute mark
  // (you have to be really slow for 1.2, so give the player some time to
  // get invested before we make it almost cruelly hard lol)
  if (now - newGameStartedTime > 3*60*1000) {
    thresh = 1.2;
  }

  return thresh;
}


//they exist in a different container so kill them
function deleteAllSprites() {
    allSprites.removeSprites();
}

//on mobile there is no rollover so allow a drag to count as mouse move
//the two functions SHOULD be mutually exclusive (but i think aren't)
//touchDown prevents duplicate event firings
var touchDown = false;
var twoFingerTouch = false;
var touchPinch = false;
var touchPan = false;

// like pMouseX/Y. the X/Y position of touches[0] for the previous frame
var pTouchX = 0;
var pTouchY = 0;

// like movedX/Y
var touchMovedX = 0;
var touchMovedY = 0;

// variables for making two-finger pinch and pan work
var firstFrameTouchDist = 0;
var pTouchPanPos = {x : 0, y: 0};
var pTouchPinchDist = 0;


// every frame, we want to somehow save the touch position
// we need to remember the touch position from last frame to calc temperature
//
function mouseClicked() {
  print('mouse clicked');
  

}


function touchStarted() {
  // this is the real check for touch. 
  // for some reaosn touchStarted() is called when i click the mouse on
  // my laptop. and mouseClicked() is called when i touch on my phone.
  // we love it.
  // so this is a workaround...
  if (touches.length >= 1) {
    // sort of a finicky way of detecting touch
    // but it works question mark?
    touchDevice = true;


    // print('touch started!!!');
    touchDown = true;
    pTouchX = touches[0].x;
    pTouchY = touches[0].y;
    // canvasPressed();
    if (touches.length == 2) {
      twoFingerTouchStarted();
    }
  }
  // print('touches = ' + touches.length);
}

function touchMoved() {
    if (touchDown) {
      // print('touch moved!!!');
      touchMovedX = touches[0].x - pTouchX;
      touchMovedY = touches[0].y - pTouchY;
      pTouchX = touches[0].x;
      pTouchY = touches[0].y;
      if (twoFingerTouch) {
	// print('two finger touch move!')


	// on the first frame that we /move/ with two finger touch, we
	// determine if it's a pan or a pinch.
	// (works similarly to Google Maps on iOS 11.4.1 Aug. 2020)
	if (!touchPinch && !touchPan) {
	  twoFingerTouchDetectPanOrPinch()


	} else if (touchPinch) {
	  touchPinchMoved();
	} else if (touchPan) {
	  touchPanMoved();
	}
      }
    }
    // touchDown = true;
}

function touchEnded() {


  // print('on touch end, touches length = ' + touches.length);

  // all fingers (and bets) are off
  if (touches.length == 0)  {
    touchDown = false;
    twoFingerTouch = false;
    touchPinch = false;
    touchPan = false;
    touchMovedX = 0;
    touchMovedY = 0;

  // lifted some fingers but still one remains
  } else if (touches.length == 1) {
    touchDown = true;
    twoFingerTouch = false;
    touchPinch = false;
    touchPan = false;
  }
}

// calculates distance between two (x,y) points.
// takes two objects, each of which must have properties x and y
function calcDist(xy0, xy1) {
  // p5js sqrt() uses Math.sqrt(), which is actually pretty fast??
  // https://jsperf.com/math-hypot-vs-math-sqrt/6
  // don't @ me
  return sqrt(sq(xy0.x - xy1.x) + 
	      sq(xy0.y - xy1.y));
}

function twoFingerTouchStarted() {
  // print('two finger touch start!');
  twoFingerTouch = true;

  firstFrameTouchDist = calcDist(touches[0], touches[1]);
}

// on the first frame of two-finger touch, we determine if it's a
// pinch (fingers moving apart/together) or a pan (fingers moving together
// in the same direction)
function twoFingerTouchDetectPanOrPinch() {
  // ¯\_(ツ)_/¯
  let panThresh = 8;

  let secondFrameDist = calcDist(touches[0], touches[1]);
  let diff = abs(firstFrameTouchDist - secondFrameDist);

  // print('first frame dist = ' + TouchfirstFrameDist);
  // print('second frame dist = ' + secondFrameDist);
  // print('dist diff = ' + diff);

  if (abs(firstFrameTouchDist - secondFrameDist) < panThresh) {
    touchPanStart();
  } else {
    touchPinchStart();
  }
   
}

function touchPinchStart() {
  touchPinch = true;
  pTouchPinchDist = calcDist(touches[0], touches[1]);
}

function touchPinchMoved() {
  // print('still pinching');

  let zoomSpeed = 1.1;
  let maxZoom = 8;
  let minZoom = .5;

  let touchPinchDist = calcDist(touches[0], touches[1]);
  let zoomDiff = pTouchPinchDist - touchPinchDist;

  let zoomScale = 1;
  if (zoomDiff < 0) {
    zoomScale = zoomSpeed;
  } else {
    zoomScale = 1/zoomSpeed;
  }


  // loop through all players and change their scale.
  // (we can't just change the camera.zoom because that won't change the
  // colliders on the sprites)
  for (var playerId in players) {
    if (players.hasOwnProperty(playerId)) {
      var p = players[playerId];
      p.sprite.scale = constrain(p.sprite.scale * zoomScale, minZoom, maxZoom);
    }
  }
}

function touchPanStart() {
  touchPan = true;
  // print('detected panning!!!!!!!');

  // get the midpoint of the touches, this is our virtual position
  pTouchPanPos.x = (touches[0].x + touches[1].x) / 2;
  pTouchPanPos.y = (touches[0].y + touches[1].y) / 2;
}

function touchPanMoved() {
  let panSpeed = 1;
  panSpeed = panSpeed / camera.zoom;

  let touchPanPos = {x: 0, y: 0};
  touchPanPos.x = (touches[0].x + touches[1].x) / 2;
  touchPanPos.y = (touches[0].y + touches[1].y) / 2;

  let dx = touchPanPos.x - pTouchPanPos.x;
  let dy = touchPanPos.y - pTouchPanPos.y;

  dx = dx * panSpeed;
  dy = dy * panSpeed;

  camera.position.x += -dx;
  camera.position.y += -dy;

  pTouchPanPos = touchPanPos;
}

function touchPinchEnded() {
  touchPinch = false;
}

function touchPanEnded() {
  touchPan = false;
}

function twoFingerTouchEnded() {
  print('two finger touch end!');
  twoFingerTouch = false;
}


function canvasPressed() {

    if (nickName != "" && screen == "game") {
      ////  console.log('canvas pressed!');
      isPanning = true;

    }
}

//when I click to move
function canvasReleased() {

    isPanning = false;
    if (screen == "error") {
    }
    else if (nickName == "" && screen == "game") {
      // we're lurking and we click on screen, so go to prompt for user
      joinGame();
    }
}


function keyPressed() {
    if (screen == "user") {
        var field = document.getElementById("lobby-field");
        field.focus();
    }
}

//called by the continue button in the html
function nameOk() {
    var v = document.getElementById("lobby-field").value;

    if (v != "") {
        nickName = v;

        //if socket !null the connection has been established ie lurk mode
        if (socket != null) {
            socket.emit('sendName', v);
        }

        //prevent page from refreshing on enter (default form behavior)
        return false;
    }
}

function nameValidationCallBack(code) {

    if (socket.id) {

        if (code == 0) {
            console.log("Username already taken");
            var e = document.getElementById("lobby-error");

            if (e != null)
                e.innerHTML = "Username already taken";
        }
        else if (code == 3) {

            var e = document.getElementById("lobby-error");

            if (e != null)
                e.innerHTML = "Sorry, only standard western characters are allowed :/";
        }
        else {

            hideUser();
	    showColor();
	    colorSelection();
            //showAvatar();
            //avatarSelection();
        }
    }
}

function tintGraphics(img, colorString) {

    var c = color(colorString);
    let pg = createGraphics(img.width, img.height);
    // pg.noSmooth();
    pg.tint(red(c), green(c), blue(c), 255);
    pg.image(img, 0, 0, img.width, img.height);
    //i need to convert it back to image in order to use it as spritesheet
    var img = createImage(pg.width, pg.height);
    img.copy(pg, 0, 0, pg.width, pg.height, 0, 0, pg.width, pg.height);

    return img;
}


//join from lurk mode
function joinGame() {

    if (QUICK_LOGIN) {
        //assign random name and avatar and get to the game
        nickName = "user" + floor(random(0, 1000));
        newGame();
    }
    else {
        screen = "user";
        showUser();
    }

}

function colorOk() {

  // todo
  // at this point, player has locked in their chosen color

    newGame();
}

function keyTyped() {
    if (screen == "avatar") {
        if (keyCode === ENTER || keyCode === RETURN) {
            newGame();
        }
    }
}

function showUser() {
    var e = document.getElementById("user-form");
    if (e != null)
        e.style.display = "block";

    e = document.getElementById("lobby-container");
    if (e != null)
        e.style.display = "block";
}

function showColor() {
    var e = document.getElementById("color-form");
    if (e != null)
        e.style.display = "block";

    e = document.getElementById("color-container");
    if (e != null)
        e.style.display = "block";
}

function hideUser() {
    var e = document.getElementById("user-form");
    if (e != null)
        e.style.display = "none";

    e = document.getElementById("lobby-container");
    if (e != null)
        e.style.display = "none";
}

function hideColor() {
    var e = document.getElementById("color-form");
    if (e != null)
        e.style.display = "none";

    e = document.getElementById("color-container");
    if (e != null)
        e.style.display = "none";
}

//don't show the link while the canvas loads
function showInfo() {

    var e = document.getElementById("info");
    if (e != null) {
        e.style.visibility = "visible";
    }

}

//don't show the link while the canvas loads
function fadeInfoToBlack() {

    print('fadding to black!!!');

    var e = document.getElementById("info-text");
    if (e != null) {
	e.className = 'info-text-black';
    }

}

function outOfCanvas() {
    areaLabel = "";
    rolledSprite = null;

    isPanning = false;
}

//disable scroll on phone
function preventBehavior(e) {
    e.preventDefault();
};

document.addEventListener("touchmove", preventBehavior, { passive: false });

// Active
window.addEventListener('focus', function () {
    if (socket != null && me != null)
        socket.emit('focus', { });

    // when a player re-focuses, they're prooooobably not over a circle
    cursor();
});

// Inactive
window.addEventListener('blur', function () {
    if (socket != null && me != null)
        socket.emit('blur', { });
});

