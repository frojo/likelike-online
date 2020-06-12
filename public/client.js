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
var HEIGHT = 800;


//dynamically adjusted based on the window
var canvasScale;

//all avatars are the same size
var AVATAR_W = 16
var AVATAR_H = 16;
//number of avatars in the sheets
var AVATARS = 1;
//the big file if used
var ALL_AVATARS_SHEET = "allAvatars.png";

// 
var AVATAR_SPRITE_FILE = "avatar-large.png";
//the number of frames for walk cycle and emote animation
//the first frame of emote is also the idle frame
var WALK_F = 4;
var EMOTE_F = 2;

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
var AVATAR_PALETTES = [
    ['#ffa300', '#e27c32', '#a8e72e', '#00b543'],
    ['#a8e72e', '#e27c32', '#111d35', '#8f3f17'],
    ['#413830', '#e27c32', '#c2c3c7', '#a28879'],
    ['#a28879', '#e27c32', '#f3ef7d', '#422136'],
    ['#a28879', '#e27c32', '#ca466d', '#1e839d'],
    ['#413830', '#e27c32', '#111d35', '#ca466d'],
    ['#be1250', '#e27c32', '#ffec27', '#1e839d'],
    ['#ffec27', '#e27c32', '#1e839d', '#422136'],

    ['#413830', '#8f3f17', '#ff004d', '#413830'],
    ['#413830', '#8f3f17', '#ff9d81', '#413830'],
    ['#a28879', '#8f3f17', '#ffec27', '#ff6c24'],
    ['#413830', '#8f3f17', '#c2c3c7', '#ca466d'],

    ['#00b543', '#ffccaa', '#ff6c24', '#1e839d'],
    ['#742f29', '#ffccaa', '#ffec27', '#ff6c24'],
    ['#ff6c24', '#ffccaa', '#c2c3c7', '#413830'],
    ['#413830', '#ffccaa', '#be1250', '#422136'],
    ['#413830', '#ffccaa', '#ff6c24', '#8f3f17'],
    ['#413830', '#ffccaa', '#ff6c24', '#8f3f17'],
    ['#742f29', '#ffccaa', '#a8e72e', '#413830']

];
//arrays to speed up the pix by pix recoloring
var REF_COLORS_RGB = [];
var AVATAR_PALETTES_RGB = [];

//GUI
var LABEL_NEUTRAL_COLOR = "#FFFFFF";
var UI_BG = "#000000";

//global vars! I love global vars ///////////////////

//preloaded images
//these are arrays of p5.Images, where each image is a sprite sheet of an
//an animation (walk or emote) for an avatar. index into them with avatar number
var walkSheets = [];
var emoteSheets = [];

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

//sparkles p5 play animations
var appearEffect, disappearEffect;

//sounds
var blips;
var appearSound, disappearSound;

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

    //avatar spritesheets are programmatically tinted so they need to be pimages before being loaded as spritesheets

    //METHOD 1:
    //avatar spritesheets are numbered and sequential, one per animation like straight outta Piskel
    //it's a lot of requests for a bunch of tiny images
    /*
    for (var i = 0; i < AVATARS; i++) {
        walkSheets[i] = loadImage(ASSETS_FOLDER + "character" + i + ".png");
    }

    for (var i = 0; i < AVATARS; i++) {
        emoteSheets[i] = loadImage(ASSETS_FOLDER + "character" + i + "-emote.png");
    }
    */

    //METHOD 2:
    //all spritesheets are packed in one long file, preloaded and split on setup
    //packed with this tool  https://www.codeandweb.com/free-sprite-sheet-packer
    //layout horizontal, 0 padding (double check that)


    allSheets = loadImage(ASSETS_FOLDER + ALL_AVATARS_SHEET);

    avatarBaseSprite = loadImage(ASSETS_FOLDER + AVATAR_SPRITE_FILE);

    REF_COLORS_RGB = [];
    //to make the palette swap faster I save colors as arrays 
    for (var i = 0; i < REF_COLORS.length; i++) {
        var rc = REF_COLORS[i];
        var r = red(rc);
        var g = green(rc);
        var b = blue(rc);
        REF_COLORS_RGB[i] = [r, g, b];
    }

    AVATAR_PALETTES_RGB = [];
    //to make the palette swap faster I save colors as arrays 
    // this converts from an array of arrays of (hex) strings to 
    // an array of array of numbers? 
    for (var i = 0; i < AVATAR_PALETTES.length; i++) {

        AVATAR_PALETTES_RGB[i] = [];

        //each color
        for (var j = 0; j < AVATAR_PALETTES[i].length; j++) {

            var rc = AVATAR_PALETTES[i][j];
            var r = red(rc);
            var g = green(rc);
            var b = blue(rc);
            AVATAR_PALETTES_RGB[i][j] = [r, g, b];
        }
    }

    menuBg = loadImage(ASSETS_FOLDER + MENU_BG_FILE);
    arrowButton = loadImage(ASSETS_FOLDER + "arrowButton.png");

    // TODO: change logo (active now?)
    var logoSheet = loadSpriteSheet(ASSETS_FOLDER + LOGO_FILE, 66, 82, 4);
    logo = loadAnimation(logoSheet);
    logo.frameDelay = 10;

    var walkIconSheet = loadSpriteSheet(ASSETS_FOLDER + "walkIcon.png", 6, 8, 4);
    walkIcon = loadAnimation(walkIconSheet);
    walkIcon.frameDelay = 8;

    var appearEffectSheet = loadSpriteSheet(ASSETS_FOLDER + "appearEffect.png", 10, 18, 10);
    appearEffect = loadAnimation(appearEffectSheet);
    appearEffect.frameDelay = 4;
    appearEffect.looping = false;

    var disappearEffectSheet = loadSpriteSheet(ASSETS_FOLDER + "disappearEffect.png", 10, 18, 10);
    disappearEffect = loadAnimation(disappearEffectSheet);
    //disappearEffect.frameDelay = 4;
    disappearEffect.looping = false;

    // font = loadFont(FONT_FILE);
    font = 'Helvetica';

    //load sound
    soundFormats('mp3', 'ogg');

    blips = [];
    for (var i = 0; i <= 5; i++) {
        var blip = loadSound(ASSETS_FOLDER + "blip" + i);
        blip.playMode('sustain');
        blip.setVolume(0.3);
        blips.push(blip);
    }

    appearSound = loadSound(ASSETS_FOLDER + "appear");
    appearSound.playMode('sustain');
    appearSound.setVolume(0.3);

    disappearSound = loadSound(ASSETS_FOLDER + "disappear");
    disappearSound.playMode('sustain');
    disappearSound.setVolume(0.3);


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

    //since my avatars are pixelated and scaled I kill the antialiasing on canvas
    // noSmooth();

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
    if (serverWelcomed && !gameStarted) {
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
        currentColor = floor(random(0, AVATAR_PALETTES.length));
        currentAvatar = floor(random(0, walkSheets.length));
        newGame();
    }
    else if (!LURK_MODE) {

        //paint background
	background(PAGE_COLOR);
        hideJoin();
        showUser();

        var field = document.getElementById("lobby-field");
        field.focus();

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
    logoCounter = 0;

    hideUser();
    hideColor();
    hideAvatar();

    if (menuGroup != null)
        menuGroup.removeSprites();

    // if we're lurking and not re logging in, show join/creation screen
    if (nickName == "" && !relog) {
        showJoin();
    } 

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


            bubbles = [];

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
	    print('forgetting player ' + p.id + ' bc server said so');
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
		hideAvatar();
                hideJoin();
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

    //I can now open it

    socket.open();

}



//this p5 function is called continuously 60 times per second by default
function update() {

    if (screen == "user") {
	background(PAGE_COLOR);
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
	// and i don't feel like debugging that
        // background(PAGE_COLOR);
	camera.off();
	fill(PAGE_COLOR);
	rect(0, 0, WIDTH, HEIGHT);
	camera.on();


        textFont(font, FONT_SIZE);

        //iterate through the players
        for (var playerId in players) {
            if (players.hasOwnProperty(playerId)) {
                var p = players[playerId];

                //make sure the coordinates are non null since I may have created a player
                //but I may still be waiting for the first update
                if (p.x != null && p.y != null) {
		    p.updatePosition()
                }
            }
        }//player update cycle


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

        drawSprites();

        //GUI
	
	let player;
        if (rolledSprite != null) {
	  player = players[rolledSprite.id];
        }
	
	// draw labels rollover labels
	if (player && !goneForever(player)) {
	    // need to set these before calling textWidth() for it to work
	    // correctly
            textFont(font, ACTIVE_FONT_SIZE);
            textAlign(CENTER, CENTER);

	    let padding_x = 7;
	    let padding_y = 5;

	    // draw name label (above circle)
	    let nameText = player.nickName;

	    // we position the text below the rolled over sprite
            let lw = textWidth(nameText);
	    let lx = rolledSprite.position.x;
	    let ly = rolledSprite.position.y - 
		     rolledSprite.collider.size().y*.5;

	    // draw background rectangle
            fill(UI_BG);
            noStroke();
	    rectMode(CENTER);
            rect(floor(lx), floor(ly), 
		 lw + padding_x*2, 
		 ACTIVE_FONT_SIZE + padding_y*2);

	    // draw text
            fill(LABEL_NEUTRAL_COLOR);
            text(nameText, floor(lx), floor(ly));

	    // don't show activity for myself
	    if (me != null && me.sprite != rolledSprite) {
	      // draw activity label (below circle)
	      activityText = activityLabel(player);

	      // we position the name above over sprite
              let lw = textWidth(activityText);
	      let lx = rolledSprite.position.x;
	      let ly = rolledSprite.position.y + 
	               rolledSprite.collider.size().y*.5;

	      // draw background rectangle
              fill(UI_BG);
              noStroke();
	      rectMode(CENTER);
              rect(floor(lx), floor(ly), 
	           lw + padding_x*2,
	           ACTIVE_FONT_SIZE + padding_y*2);

	      // draw text
              fill(LABEL_NEUTRAL_COLOR);
              text(activityText, floor(lx), floor(ly));
	    }


        }

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
	    text('souls', WIDTH/2, HEIGHT/2);
	    camera.on();
	    
            // animation(logo, floor(width / 2), floor(height / 2));
        }

    }//end game


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
  
  // debug
  let hours = floor(time_ms / (60*60*1000));
  return 'active ' + hours + 'h ago';

  // if away for more than 8 hours, we vague
  return 'active a while ago';
}



function windowResized() {
    scaleCanvas();
}


function scaleCanvas() {
    //landscape scale to height
    if (windowWidth > windowHeight) {
        canvasScale = windowHeight / WIDTH; //scale to W because I want to leave room for chat and instructions (squareish)
        canvas.style("width", WIDTH * canvasScale + "px");
        canvas.style("height", HEIGHT * canvasScale + "px");
    }
    else {
        canvasScale = windowWidth / WIDTH;
        canvas.style("width", WIDTH * canvasScale + "px");
        canvas.style("height", HEIGHT * canvasScale + "px");
    }

    var container = document.getElementById("canvas-container");
    container.setAttribute("style", "width:" + WIDTH * canvasScale + "px; height: " + HEIGHT * canvasScale + "px");

    var form = document.getElementById("interface");
    form.setAttribute("style", "width:" + WIDTH * canvasScale + "px;");

}

function colorSelection() {

    var randomColor = color(floor(random(255)), floor(random(255)), floor(random(255)));
    colorPicker = createColorPicker(randomColor);
    colorPicker.parent('color-picker-container');

    // call setCurrentColor() every time user sets color with color picker
    colorPicker.input(setCurrentColor);
    setCurrentColor();
}

function setCurrentColor() {
  // .value() returns a color string
  currentColor = colorPicker.value();
}
    

//I could do this in DOM (regular html and javascript elements) 
//but I want to show a canvas with html overlay
function avatarSelection() {
    menuGroup = new Group();
    screen = "avatar";

    //buttons
    var previousBody, nextBody, previousColor, nextColor;

    var ss = loadSpriteSheet(arrowButton, 28, 28, 3);
    var animation = loadAnimation(ss);

    //the position is the bottom left
    previousBody = createSprite(8 * ASSET_SCALE + 14, 50 * ASSET_SCALE + 14);
    previousBody.addAnimation("default", animation);
    previousBody.animation.stop();
    previousBody.mirrorX(-1);
    menuGroup.add(previousBody);

    nextBody = createSprite(24 * ASSET_SCALE + 14, 50 * ASSET_SCALE + 14);
    nextBody.addAnimation("default", animation);
    nextBody.animation.stop();
    menuGroup.add(nextBody);

    previousColor = createSprite(90 * ASSET_SCALE + 14, 50 * ASSET_SCALE + 14);
    previousColor.addAnimation("default", animation);
    previousColor.animation.stop();
    previousColor.mirrorX(-1);
    menuGroup.add(previousColor);

    nextColor = createSprite(106 * ASSET_SCALE + 14, 50 * ASSET_SCALE + 14);
    nextColor.addAnimation("default", animation);
    nextColor.animation.stop();
    menuGroup.add(nextColor);

    previousBody.onMouseOver = nextBody.onMouseOver = previousColor.onMouseOver = nextColor.onMouseOver = function () {
        this.animation.changeFrame(1);
    }
    previousBody.onMouseOut = nextBody.onMouseOut = previousColor.onMouseOut = nextColor.onMouseOut = function () {
        this.animation.changeFrame(0);
    }

    previousBody.onMousePressed = nextBody.onMousePressed = previousColor.onMousePressed = nextColor.onMousePressed = function () {
        this.animation.changeFrame(2);
    }

    previousBody.onMouseReleased = function () {
        currentAvatar -= 1;
        if (currentAvatar < 0)
            currentAvatar = AVATARS - 1;

        previewAvatar();
        this.animation.changeFrame(1);
    }

    nextBody.onMouseReleased = function () {
        currentAvatar += 1;
        if (currentAvatar >= AVATARS)
            currentAvatar = 0;

        previewAvatar();
        this.animation.changeFrame(1);
    }

    previousColor.onMouseReleased = function () {
        currentColor -= 1;
        if (currentColor < 0)
            currentColor = AVATAR_PALETTES.length - 1;

        previewAvatar();
        this.animation.changeFrame(1);
    }

    nextColor.onMouseReleased = function () {
        currentColor += 1;
        if (currentColor >= AVATAR_PALETTES.length)
            currentColor = 0;

        previewAvatar();
        this.animation.changeFrame(1);
    }

    //nextBody.onMouseReleased = previousColor.onMouseReleased = nextColor.onMouseReleased = function () {

    randomAvatar();
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
	this.avatarSprite = tintGraphics(avatarBaseSprite, this.color);
    	this.sprite.addImage('default', this.avatarSprite);
        this.sprite.mouseActive = true;
    }

    //this.sprite.debug = true;

    //no parent in js? WHAAAAT?
    this.sprite.id = this.id;
    this.sprite.label = p.nickName;

    //save the dominant color for bubbles and rollover label
    // var c = color(this.color)

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

    if (this.nickName != "") {
        this.sprite.onMouseOver = function () {
            rolledSprite = this;
        };

        this.sprite.onMouseOut = function () {
            if (rolledSprite == this)
                rolledSprite = null;
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

	    // make sprite transparent based of inactivity
            tint(255, opacityFromActivity(player));
            this.originalDraw();
            noTint();
        }
    }

    // this.stopWalkingAnimation();
    this.sprite.changeImage('default');

}


// calculates oppacity of player sprite based on how long they've been inactive
// 255 is completely opaque, 0 is transparent
// a player's sprite is completely opaque when they're active
// when they become inactive, there's an immediate drop-off in opacity, and
// then a gradual decline the longer they are inactive for, until the sprite
// fades completely into nothingness at the 24h mark
function opacityFromActivity(p) {
  if (p.active)
    return 255;

  // let max_time_inactive_ms = 24*60*60*1000;
  // debug
  let max_time_inactive_ms = 10*1000;
  let time_inactive_ms = Date.now() - p.lastTimeActive;

  // make sure we don't go negatitve
  let time_left_ms = max(max_time_inactive_ms - time_inactive_ms, 0);

  // linear map
  let opacity = map(time_left_ms, 0, max_time_inactive_ms, 
				  0, 120);

  // exponential decay
  // tau_ms is the time it takes for opacity to get to ~.36 of starting value
  let tau_ms = max_time_inactive_ms/2;
  let opacity_e = 120*exp(-(1/tau_ms)*time_inactive_ms);
  return opacity_e;
}


//they exist in a different container so kill them
function deleteAllSprites() {
    allSprites.removeSprites();
}


//on mobile there is no rollover so allow a drag to count as mouse move
//the two functions SHOULD be mutually exclusive
//touchDown prevents duplicate event firings
var touchDown = false;

function mouseDragged() {
    mouseMoved();
}

function touchMoved() {
    mouseMoved();
    touchDown = true;
}

function touchEnded() {

    if (touchDown) {
        touchDown = false;
        canvasReleased();
    }
}

//rollover state
function mouseMoved() {

    if (walkIcon != null)
        walkIcon.visible = false;

    if (areas != null && me != null) {

        //you know, at this point I'm not sure if you are using assets scaled by 2 for the areas
        //so I'm just gonna stretch the coordinates ok
        var mx = floor(map(mouseX, 0, WIDTH, 0, areas.width));
        var my = floor(map(mouseY, 0, HEIGHT, 0, areas.height));

        var c = areas.get(mx, my);
        areaLabel = "";

        if (alpha(c) != 0) {
            //walk icon?
            if (c[0] == 255 && c[1] == 255 && c[2] == 255) {
                if (walkIcon != null)
                    walkIcon.visible = true;
            }
            else {
                var command = getCommand(c);
                if (command != null)
                    if (command.label != null) {
                        areaLabel = command.label;
                    }
            }
        }

    }
}

function canvasPressed() {

    if (nickName != "" && screen == "game") {
      console.log('canvas pressed!');
      isPanning = true;

    }
}


//when I click to move
function canvasReleased() {

    //print("CLICK " + mouseButton);

    isPanning = false;
    if (screen == "error") {
    }
    else if (nickName != "" && screen == "game" && mouseButton == RIGHT) {
        if (me.destinationX == me.x && me.destinationY == me.y) {
	}
	    // do something if we click with rmb?
            // socket.emit('emote', { room: me.room, em: false });
    }
    else if (nickName != "" && screen == "game" && mouseButton == LEFT) {
        //exit text
        if (longText != "" && longText != SETTINGS.INTRO_TEXT) {

            if (longTextLink != "")
                window.open(longTextLink, '_blank');

            longText = "";
            longTextLink = "";
        }
        else if (me != null) {

            longText = "";
            longTextLink = "";

            if (AFK) {
                AFK = false;
                if (socket != null)
                    socket.emit('focus', {});
            }

            //clicked on person
            if (rolledSprite != null) {

                //click on player sprite attempt to move next to them
                if (rolledSprite.id != null) {
                    nextCommand = null;
                    var t = players[rolledSprite.id];
                    if (t != null && t != me) {
		      // what if we clicked on someone else?
                    }
                }
            }
            //check the area info
            else if (areas != null) {

                //you know, at this point I'm not sure if you are using assets scaled by 2 for the areas
                //so I'm just gonna stretch the coordinates ok
                var mx = floor(map(mouseX, 0, WIDTH, 0, areas.width));
                var my = floor(map(mouseY, 0, HEIGHT, 0, areas.height));

                var c = areas.get(mx, my);

                //if transparent or semitransparent do nothing
                if (alpha(c) != 255) {
                    //cancel command
                    nextCommand = null;
                    //stop if moving
                    if (me.x != me.destinationX && me.y != me.destinationY) {
		    }
                        // socket.emit('move', { x: me.x, y: me.y, room: me.room, destinationX: me.x, destinationY: me.y });
                }
                else if (c[0] == 255 && c[1] == 255 && c[2] == 255) {
                    //if white, generic walk stop command
                    nextCommand = null;

                    // socket.emit('move', { x: me.x, y: me.y, destinationX: mouseX, destinationY: mouseY });
                }
                else {
                    //if something else check the commands
                    var command = getCommand(c);

                    //walk and executed when you arrive or stop
                    if (command != null)
                        moveToCommand(command);
                }
            }


        }
    }

}

//queue a command, move to the point
function moveToCommand(command) {

    nextCommand = command;

    //I need to change my destination locally before the message bouces back

    if (command.point != null) {
        me.destinationX = command.point[0] * ASSET_SCALE;
        me.destinationY = command.point[1] * ASSET_SCALE;
        socket.emit('move', { x: me.x, y: me.y, destinationX: command.point[0] * ASSET_SCALE, destinationY: command.point[1] * ASSET_SCALE });
    }
    else //just move where you clicked (area) 
    {
        me.destinationX = mouseX;
        me.destinationY = mouseY;
        socket.emit('move', { x: me.x, y: me.y, destinationX: mouseX, destinationY: mouseY });
    }

}

function getCommand(c) {
    try {
        //turn color into string
        var cString = color(c).toString('#rrggbb');//for com

        var command;

        //go through properties
        for (var colorId in areaColors) {

            if (areaColors.hasOwnProperty(colorId)) {
                var aString = "#" + colorId.substr(1);

                if (aString == cString) {
                    //color found
                    command = areaColors[colorId];

                }
            }
        }
    }
    catch (e) {
        console.log("Get command error: color " + c);
        console.error(e);
    }

    return command;
}


function executeCommand(c) {
    areaLabel = "";
    //print("Executing command " + c.cmd);

    switch (c.cmd) {
        case "enter":
            var sx, sy;
            break;


        case "text":
            if (c.txt != null) {

                longText = c.txt;
                if (c.lines != null)
                    longTextLines = c.lines;
                else
                    longTextLines = 1;

                if (c.align != null)
                    longTextAlign = c.align;
                else
                    longTextAlign = "center";//or center

                if (c.url == null)
                    longTextLink = "";
                else
                    longTextLink = c.url;

            }
            else
                print("Warning for text: make sure to specify arg as text")
            break;


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

    print('name validation callback!');
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
                e.innerHTML = "Sorry, only standard western characters are allowed";
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

//draws a random avatar body in the center of the canvas
//colors it a random color
function randomAvatar() {
    currentColor = floor(random(0, AVATAR_PALETTES.length));
    currentAvatar = floor(random(0, AVATARS));
    previewAvatar();
}

function previewAvatar() {

    if (avatarPreview != null)
        removeSprite(avatarPreview);

    var aGraphics = paletteSwap(emoteSheets[currentAvatar], AVATAR_PALETTES_RGB[currentColor]);
    var aSS = loadSpriteSheet(aGraphics, AVATAR_W, AVATAR_H, round(emoteSheets[currentAvatar].width / AVATAR_W));
    var aAnim = loadAnimation(aSS);
    avatarPreview = createSprite(width / 2, height / 2);
    avatarPreview.scale = 4;
    avatarPreview.addAnimation("default", aAnim);
    avatarPreview.animation.frameDelay = 10;
    //avatarPreview.debug = true;
    //avatarPreview.animation.stop();
    menuGroup.add(avatarPreview);
}

// returns a p5.Image
function paletteSwap(ss, palette, t) {

    var tint = [255, 255, 255];

    if (t != null)
        tint = [red(t), green(t), blue(t)];

    var img = createImage(ss.width, ss.height);
    img.copy(ss, 0, 0, ss.width, ss.height, 0, 0, ss.width, ss.height);
    img.loadPixels();

    for (var i = 0; i < img.pixels.length; i += 4) {

        if (img.pixels[i + 3] == 255) {
            var found = false;

            //non transparent pix replace with palette
            for (var j = 0; j < REF_COLORS_RGB.length && !found; j++) {

                if (img.pixels[i] == REF_COLORS_RGB[j][0] && img.pixels[i + 1] == REF_COLORS_RGB[j][1] && img.pixels[i + 2] == REF_COLORS_RGB[j][2]) {
                    found = true;
                    img.pixels[i] = palette[j][0] * tint[0] / 255;
                    img.pixels[i + 1] = palette[j][1] * tint[1] / 255;
                    img.pixels[i + 2] = palette[j][2] * tint[2] / 255;
                }

            }
        }
    }
    img.updatePixels();

    return img;
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

    deleteAllSprites();
    hideJoin();

    if (QUICK_LOGIN) {
        //assign random name and avatar and get to the game
        nickName = "user" + floor(random(0, 1000));
        currentColor = floor(random(0, AVATAR_PALETTES.length));
        currentAvatar = floor(random(0, emoteSheets.length));
        newGame();
    }
    else {
        screen = "user";
        showUser();
    }

}

function colorOk() {

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


// shows the "continue" button right before entering
function showAvatar() {
    var e = document.getElementById("avatar-form");
    if (e != null) {
        e.style.display = "block";
    }
}

//don't show the link while the canvas loads
function showInfo() {

    var e = document.getElementById("info");
    if (e != null) {
        e.style.visibility = "visible";
    }

}

function hideAvatar() {

    var e = document.getElementById("avatar-form");
    if (e != null)
        e.style.display = "none";
}

function showJoin() {
    document.getElementById("join-form").style.display = "block";
}

function hideJoin() {
    document.getElementById("join-form").style.display = "none";
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
});

// Inactive
window.addEventListener('blur', function () {
    if (socket != null && me != null)
        socket.emit('blur', { });
});

