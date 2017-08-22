//TODO - fix assets
//TODO - animate level start - explode into scene
/*jslint browser: true, devel: true*/
/*global $, jQuery, alert, this*/
$(document).ready(function () {
    "use strict";
    //simple debug messaging
    function sendDebugMsg(text) {
        var msg = $("<p>[debug] " + text + "</p>");
        $("body").append(msg);
    }

    ////////////////////////////// GAME CANVAS INITIALISATION //////////////////////////////
    var canvasWidth = 360;
    var canvasHeight = 640;
    //define game area, it can init and clear itself
    //calls updateGameArea every 20ms (50fps)
    var myGameArea = {
        canvas : document.createElement("canvas"), //create a new canvas html element
        start : function () {
            $(this.canvas).prop("id", "gameDrawable"); //add properties to the new html element
            this.canvas.width = canvasWidth;
            this.canvas.height = canvasHeight;
            this.context = this.canvas.getContext("2d");
            $("#gameContainer").prepend(this.canvas);
            this.frameNo = 0;
            this.interval = setInterval(updateGameArea, 20);
        },
        clear : function () {
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    };
    //returns true if current frame corresponds with given interval n
    function everyInterval(n) {
        if ((myGameArea.frameNo / n) % 1 === 0) {
            return true;
        }
        return false;
    }


    //generic drawable, update function needs extended to actually draw itself
    //knows how to change its position by adding speed
    var Drawable = function (name, x, y) {
        this.name = name;
        this.x = x;
        this.y = y;
        this.speedX = 0;
        this.speedY = 0;
        this.topSpeedX = 0;
        this.topSpeedY = 0;
        this.accelX = 0;
        this.accelY = 0;
        //calculate new position using speed then move there
        //only need this if you're changing a Drawable using speed and accel
        //won't actually show up unless you render it !!!
        this.newPos = function () {
            this.x += Math.min(this.speedX, this.topSpeedX);
            this.y += Math.min(this.speedY, this.topSpeedY);
            //cap max speed
            if (this.speedX > this.topSpeedX) {
                this.speedX = this.topSpeedX;
            }
            if (this.speedY > this.topSpeedY) {
                this.speedY = this.topSpeedY;
            }
            if (this.speedX < this.topSpeedX * -1) {
                this.speedX = this.topSpeedX * -1;
            }
            if (this.speedY < this.topSpeedY * -1) {
                this.speedY = this.topSpeedY * -1;
            }
            //console.log(this.name + " updating my position to " + this.x + "," + this.y);
        };
    };

    //extends drawable
    //knows how to draw itself and calculate its new speeds
    var DrawableBox = function (name, width, height, x, y, colour) {
        var self = this;
        self = new Drawable(x, y);
        this.name = name;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speedX = self.speedX;
        this.speedY = self.speedY;
        this.topSpeedX = self.topSpeedX;
        this.topSpeedY = self.topSpeedY;
        this.newPos = self.newPos;
        this.render = function () {
            var ctx = myGameArea.context;
            ctx.fillStyle = colour;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            //console.log("drawing " + this.name + " size " + this.width + "x" + this.height + " at " + this.x + "," + this.y);
        };
        //calculates new speed
        this.newSpeedX = function (speedIn) {
            this.speedX = Math.min(this.speedX + speedIn, this.topSpeedX);
        };
        this.newSpeedY = function (speedIn) {
            this.speedY = Math.min(this.speedY + speedIn, this.topSpeedY);
        };
    };

    //can draw from file, has a hit box
    //IMPORTANT - CENTER ORIGIN BY DEFAULT
    var assetLoadList = []; //list of assetLoaded objects {name: name, loaded: true/false}
    var DrawableImage = function (name, x, y, source, origin) {
        var self = this; //keep a reference to the current DrawableImage object
        self = new Drawable(x, y);
        var rotation, scale, height, width;
        this.name = name;
        this.x = x;
        this.y = y;
        this.source = source;
        this.speedX = self.speedX;
        this.speedY = self.speedY;
        this.topSpeedX = self.topSpeedX;
        this.topSpeedY = self.topSpeedY;
        this.newPos = self.newPos;
        this.origin = origin;
        //load the image
        var img = new Image();
        this.loaded = false;

        //assetLoaded object structure
        //        assetLoaded = {
        //            name: DrawableImage.name,
        //            loaded: false
        //        }
        //works - but not very pretty
        var assetLoaded = {};
        assetLoaded.name = name;
        assetLoaded.loaded = false;
        assetLoadList.push(assetLoaded);

        img.onload = function () {
            self.loaded = true;
            assetLoaded.loaded = true;
            //console.log("loading done for " + name + " at " + new Date().getTime());
        };
        img.src = source;
        this.render = function (rotation, scale) { //render itself - with rotation
            if (self.loaded) { //only render when image is loaded
                var ctx = myGameArea.context;
                if (origin === "center") {
                    if (scale < 0) {
                        throw "DrawableAsset().render() - invalid scale";
                    }
                    ctx.save();
                    ctx.translate(this.x, this.y);
                    ctx.rotate(rotation * Math.PI / 180);
                    ctx.drawImage(img, -(img.naturalWidth * scale / 2), -(img.naturalHeight * scale / 2), img.naturalWidth * scale, img.naturalHeight * scale);
                    ctx.restore();
                    //object will only have rotation and scale once rendered
                    this.rotation = rotation;
                    this.scale = scale;
                    this.height = img.naturalHeight * scale;
                    this.width = img.naturalWidth * scale;
                    //console.log("drawing " + this.name + " at " + this.x + "," + this.y + " rotation " + this.rotation + " degrees, " + this.scale + "x scale");
                } else if (origin === "default") { //no rotation, origin - default (top left)
                    if (scale < 0) {
                        throw "DrawableAsset().render() - invalid scale";
                    }
                    ctx.drawImage(img, this.x, this.y, img.naturalWidth * scale, img.naturalHeight * scale);
                    this.scale = scale;
                    this.height = img.naturalHeight * scale;
                    this.width = img.naturalWidth * scale;
                    //console.log("drawing " + this.name + " at " + this.x + "," + this.y + " " + this.scale + "x scale");
                }
            } else {
                console.log("can't render " + this.name + " (not loaded yet) " + new Date().getTime());
            }
        };
        this.newSpeedX = function (speedIn) {
            this.speedX = Math.min(this.speedX + speedIn, this.topSpeedX);
        };
        this.newSpeedY = function (speedIn) {
            this.speedY = Math.min(this.speedY + speedIn, this.topSpeedY);
        };
        //hit box X and Y uses top left corner as origin
        this.newHitBox = function (hitBoxWidth, hitBoxHeight) {
            if (origin === "center") {
                this.hitBoxX = this.x - hitBoxWidth / 2;
                this.hitBoxY = this.y - hitBoxHeight / 2;
            } else if (origin === "default") {
                this.hitBoxX = this.x;
                this.hitBoxY = this.y;
            }
            this.hitBoxWidth = hitBoxWidth;
            this.hitBoxHeight = hitBoxHeight;
            //console.log("updating hit box for " + this.name + " at " + hitBoxWidth + "," + hitBoxHeight + "(" + this.hitBoxX + "," + this.hitBoxY + ")");
        };
        this.drawHitBox = function (colour) {
            var ctx = myGameArea.context;
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = colour;
            ctx.fillRect(this.hitBoxX, this.hitBoxY, this.hitBoxWidth, this.hitBoxHeight);
            ctx.globalAlpha = 1.0;
        };
        //assign and load assets for animation frames
        //source is an array of file dir
        this.frames = [];
        this.frames.push(this); //the first frame is the original asset created
        this.addFrames = function (source) { //only bundles frames with the object
            for (var i = 0; i < source.length; i++) {
                var newFrame = new DrawableImage(this.name + i, this.x, this.y, source[i], origin);
                this.frames.push(newFrame);
            }
        };
        this.updateFrames = function () { //update all frames to inherit the object's properties
            for (var i = 0; i < this.frames.length; i++) {
                this.frames[i].x = this.x;
                this.frames[i].y = this.y;
                this.frames[i].speedX = this.speedX;
                this.frames[i].speedY = this.speedY;
                this.frames[i].accelX = this.accelX;
                this.frames[i].accelY = this.accelY;
                this.frames[i].rotation = this.rotation;
                this.frames[i].scale = this.scale;
            }
        }
        this.getInfo = function () { //retrieve everything this DrawableImage instance has
            console.log(this.name + "(" + this.source + ")");
            console.log("[position]: " + this.x + "," + this.y);
            console.log("[speedXY]: x" + this.speedX + " y" + this.speedY + " [accelXY]: x" + this.accelX + " y" + this.accelY);
            console.log("[rotation]: " + this.rotation + " [scale]: " + this.scale + " [origin]:" + this.origin);
            console.log("");
        }
    };

    ////////////////////////////// UI //////////////////////////////
    function setupUI () {
        //UI setup code
        $(".gameUI").css({
            "width": canvasWidth,
            "height": canvasHeight,
            "margin-top": -canvasHeight
        });
        $("#progBar").css({
            "height": canvasHeight - 120,
            "margin-left": canvasWidth - 20
        });
        $("#cup").css({
            "margin-left": canvasWidth - 26
        });
        $("#announcementText").css({
            "margin-top": - (canvasHeight / 2) - 20 //-20 offset for the count down text
        });
        $("#announcementText").after("<p id=\"countDown\" class=\"gameAnnouncement\"></p>");
        $("#countDown").css({
            "color": "#ffd815",
            "-webkit-text-stroke": "2px black",
            "font-size": "40px",
            "padding": "10px",
            "margin-top": "20px"
        });
    }

    function setUIOpacity (opacity) {
        $("#topBar").css({"opacity":opacity});
        $("#progBar").css({"opacity":opacity});
        $("#cup").css({"opacity":opacity});
    }

    ////////////////////////////// GAME OBJECTS INITIALISATION //////////////////////////////
    //set up the game
    //drawables need to be declared here before they can be used 
    var playerChar;
    var dust;
    var explosion;
    var playerCharSpin;
    var backdrop;
    var levelLength = 80;
    var levelNo = 1;
    var levelTime = 0;
    var maxLives = 6;
    var curLives = maxLives;
    function startGame() {
        myGameArea.start();
        console.log("starting game at " + new Date().getTime());

        setupUI();

        playerChar = new DrawableImage("player", 60, 250, "../_assets/general/cat.png", "center");
        playerCharSpin = false;
        playerChar.rotation = 0;
        playerChar.topSpeedX = 10;
        playerChar.topSpeedY = 10;
        playerChar.accelX = 0;
        playerChar.accelY = 0;
        //provisional hit box, can be set to anything
        playerChar.newHitBox(0, 0); //can't use asset's width and height here because by this point it hasn't loaded yet
        playerChar.addFrames([ //playerChar's animation frames
            "../_assets/general/cat_2.png",
            "../_assets/general/cat_3.png", 
            "../_assets/general/empty.png" 
        ]);
        //NOTE - DUST NEEDS TO HAVE SAME NO. OF FRAMES AS PLAYERCHAR
        //dust effect follows player
        dust = new DrawableImage("dust effect", 60, 220, "../_assets/general/dust.png", "center");
        dust.rotation = 0;
        dust.topSpeedX = 10;
        dust.topSpeedY = 10;
        dust.accelX = 0;
        dust.accelY = 0;
        dust.addFrames([ //dust's animation frames
            "../_assets/general/dust_2.png",
            "../_assets/general/dust_3.png",
            "../_assets/general/empty.png" 
        ]);

        explosion = new DrawableImage("explosion", 60, 220, "../_assets/general/explosion_0.png", "center");
        explosion.rotation = 0;
        explosion.addFrames([
            "../_assets/general/explosion_1.png",
            "../_assets/general/explosion_2.png",
            "../_assets/general/explosion_3.png",
            "../_assets/general/explosion_4.png",
            "../_assets/general/explosion_5.png" 
        ]);

        createObstacles(levelNo, levelLength); //eg. use level 1's assets, generate 50 blocks

        $("h1").text("ayylmao");
        sendDebugMsg("d to jump, again to double jump, hold to go further, tap d repeatedly to hover");
    }

    //check two drawables for collision, only works with drawables with a hit box
    //otherwise does nothing
    function checkCollision(obj1, obj2) {
        if (obj1.hasOwnProperty("hitBoxX") && obj2.hasOwnProperty("hitBoxX")) {
            if (obj1.hitBoxY + obj1.hitBoxHeight < obj2.hitBoxY) {
                return false;
            } else if (obj1.hitBoxY > obj2.hitBoxHeight + obj2.hitBoxY) {
                return false;
            } else if (obj1.hitBoxX > obj2.hitBoxX + obj2.hitBoxWidth) {
                return false;
            } else if (obj1.hitBoxX + obj1.hitBoxWidth < obj2.hitBoxX) {
                return false;
            } else {
                //console.log(obj1.name + " collided with " + obj2.name);
                $("h1").text("collision");
                return true;
            }
        } else if (!obj1.hasOwnProperty("hitBoxX")) {
            console.log(obj1.name + " is missing a hit box");
        } else if (!obj2.hasOwnProperty("hitBoxX")) {
            console.log(obj2.name + " is missing a hit box");
        } else {
            console.log(obj1.name + " and " + obj2.name + " are missing their hit boxes");
        }
    }

    //check if a drawable is inside the canvas, can only check if it has a hitbox
    //otherwise does nothing
    function isOutOfBounds(obj) {
        if (obj.hasOwnProperty("hitBoxX")) {
            if ((obj.hitBoxY + obj.hitBoxHeight < myGameArea.canvas.height) && (obj.hitBoxY > 0) && (obj.hitBoxX >= 0) && (obj.hitBoxX + obj.hitBoxWidth < canvasWidth)) {
                return false;
            } else {
                return true;
            }
        } else {
            console.log(obj.name + " is missing a hit box");
        }
    }

    ////////////////////////////// LEVEL GENERATION //////////////////////////////
    //spawn n obstacles and load their assets
    //n is how many blocks to generate
    var blockHeight = 218 //height of a standard block
    var blockObstacles = [];
    var addOnObstacles = [];
    var spawnChance = 1; //needs to be DYNAMIC?
    var easyBlocks = 10; //number of guaranteed easy blocks
    var addOnExcludeList = []; //list of indexes where add ons can and can't spawn
    var collided = false; //collision flag

    function createObstacles(level, n) {
        var baseControlX = 0;
        var baseControlY = 0; //controls the Y coordinate to spawn new blocks

        backdrop = new DrawableImage("backdrop", 0, 0, "../_assets/levels/level " + level + "/bg.png", "default");

        //WARNING - THIS ONLY WORKS ON AN ACTUAL SERVER
        //generate base blocks
        var bdfileList = [];
        $.post("listdir.php", {lvl: level, type: "bd"}, function(response) {//response get, now parse it
            bdfileList = response.split("%");
            bdfileList.pop(); //pop the last element since it's empty due to parsing
            for (var f = 0; f < bdfileList.length; f++) { //reformat the paths so they're usable
                bdfileList[f] = "." + bdfileList[f];
            }
            //create and add the easy blocks first
            for (var easy = 0; easy < easyBlocks; easy++) {
                var easyBase = new DrawableImage("easy base", baseControlX, baseControlY, bdfileList[2], "default");
                easyBase.newHitBox(0, 0);
                blockObstacles.push(easyBase);
                baseControlY += blockHeight;
            }
            //generate n random base blocks
            //load base blocks then randomly push them onto the obstacle list
            for (var i = 0; i < n - easyBlocks; i++) {
                var selection = Math.floor(Math.random() * bdfileList.length);
                var base = new DrawableImage("base" + selection, baseControlX, baseControlY, bdfileList[selection], "default");
                base.newHitBox(0, 0);
                blockObstacles.push(base);
                baseControlY += blockHeight; //increments height (to put next block) this should be the height of a standard block - SET MANUALLY
            }
        });

        var addOnControlX = 0;
        var addOnControlY = 50; //offset
        var obConsec = false; //consecutive spawn flag
        //now spawn the add on obstacles
        var obfileList = [];
        $.post("listdir.php", {lvl: level, type: "ob"}, function(response) {//response get, now parse it
            obfileList = response.split("%");
            obfileList.pop(); //pop the last element since it's empty due to parsing
            for (var f = 0; f < obfileList.length; f++) { //reformat the paths so they're usable
                obfileList[f] = "." + obfileList[f];
            }
            //generate n random base blocks
            //load base blocks then randomly push them onto the obstacle list
            //can not spawn 2 add ons consecutively
            for (var k = 0; k < n; k++) {
                if (Math.random() < spawnChance && !obConsec && !addOnExcludeList[k]) { //has a percentage spawn chance, else push an empty object
                    var selection = Math.floor(Math.random() * obfileList.length);
                    var addOn = new DrawableImage("addOn" + selection, addOnControlX, addOnControlY, obfileList[selection], "default");
                    addOn.newHitBox(0, 0);
                    addOnObstacles.push(addOn);
                    addOnControlY += blockHeight; //increments height (to put next block) this should be the height of a standard block
                    obConsec = true;
                } else {
                    var addOn = new DrawableImage("empty" + selection, addOnControlX, addOnControlY, "../_assets/general/empty.png", "default")
                    addOn.newHitBox(0, 0);
                    addOnObstacles.push(addOn);
                    addOnControlY += blockHeight; //increments height (to put next block) this should be the height of a standard block
                    obConsec = false;
                }
            }
        });

    }

    ////////////////////////////// PRIMARY GAME LOOP //////////////////////////////
    //update function, gets called continuously by startGame()
    //things get rendered here
    var animFrameCounter = 0;
    var falling = true;
    var sticky = false;
    var allAssetsLoaded = false;
    var scrollSpeed = 6; //starting scrolling speed
    var savedFrame; //variables for taking snapshots of frames for calculating cooldowns
    var frameCaptured = false; //
    var playerMoveLimit = canvasWidth * 0.75; //player can't move beyond this x
    var backdropScale;
    var levelEnd;
    var distanceCounter = 0; //distance travelled so far
    var levelProgress = 0;
    var countDown = 3;

    function updateGameArea() {    
        //checks everything is loaded
        if (!allAssetsLoaded) {
            setUIOpacity(0);
            for (var i = 0; i < assetLoadList.length; i++) {
                if (!assetLoadList[i].loaded) {
                    allAssetsLoaded = false;
                    break;
                } else {
                    allAssetsLoaded = true;
                    //console.log(assetLoadList[i].name + " loaded at " + new Date().getTime());
                    $("#announcementText").text("loading " + Math.ceil((i + 1) / assetLoadList.length * 100) + "%");
                }
            }
        }

        //only run the game if all assets are loaded - VERY VERY IMPORTANT
        if (allAssetsLoaded && !isPaused) {
            setUIOpacity(1);
            //it takes about 300 frames to clear the easy blocks
            //show countdown
            $("#announcementText").html("level " + levelNo);
            if (everyInterval(50)) {
                if (countDown > 0) {
                    $("#countDown").text(countDown);
                    elementPop("#countDown", 10);
                    countDown--;
                } else {
                    $("#countDown").text("GO!");
                }
            }
            //clear countdown text
            if (myGameArea.frameNo > 250) { //SET MANUALLY
                $("#announcementText").text("");
                $("#countDown").text("");
            }

            //////////////////// SETTING UP ////////////////////
            myGameArea.frameNo++;
            $("h1").text("ayylmao");
            myGameArea.clear();
            //prepare for render
            if (myGameArea.frameNo === 1) { //only on first frame
                playerChar.render(0, 0.01); //VERY IMPORTANT - EVERYTHING HAS TO RENDER ONCE FIRST
                dust.render(0, 0.01); //render super small so they're hard to see
                explosion.render(0, 0.01);
                backdrop.render(0, 0.01); //because they're not supposed to be seen yet
                backdropScale = canvasWidth / backdrop.width * 0.01 + 0.01; //+ little offset
                myGameArea.clear();
            }
            //////////////////// RENDERING & HITBOXING ////////////////////
            //render the level backdrop
            backdrop.render(0, backdropScale);
            //constant - could be tweaked
            if (backdrop.y + backdrop.height >= canvasHeight) {
                backdrop.y -= 0.05;
            }

            //render obstacles and move them, then get the current obstacle for later reference
            var currentOb; //the index of the current obstacle player is on top of
            //render blocks
            scrollSpeed += 0.001; //accelerate speed as level goes on
            for (var i = 0; i < blockObstacles.length; i++) {
                blockObstacles[i].y -= scrollSpeed; //obstacle scrolling speed
                blockObstacles[i].render(0, 0.33); //need to render successfully once first to get width and height
                blockObstacles[i].newHitBox(blockObstacles[i].width, blockObstacles[i].height);
                if (!isOutOfBounds(blockObstacles[i])) {//look at obstacles inside the canvas and get the current one
                    //obstacle's position in the list is its ID
                    if (blockObstacles[i].y <= playerChar.y && blockObstacles[i].y + blockObstacles[i].height >= playerChar.y) {
                        currentOb = i;
                    }
                }
                //build exclusion list, record all widest blocks, only need to do it once
                if(addOnExcludeList.length != blockObstacles.length) {
                    if(blockObstacles[i].width > 130) {
                        addOnExcludeList[i] = true;
                    } else {
                        addOnExcludeList[i] = false;
                    }
                }
            }
            if (currentOb >= easyBlocks) { //start counting progress distance after easy blocks
                distanceCounter += scrollSpeed;
            }

            //now render the add ons
            //for every base block, an add on exists, but only render and hitbox the ones that are valid
            for (var a = easyBlocks + 1; a < addOnObstacles.length; a++) { //first 10 blocks are easy blocks - no add on allowed
                if(!addOnExcludeList[a]) {
                    addOnObstacles[a].y -= scrollSpeed;
                    addOnObstacles[a].render(0, 0.33);
                    addOnObstacles[a].x = blockObstacles[a].width - 5;
                    addOnObstacles[a].newHitBox(addOnObstacles[a].width, addOnObstacles[a].height);
                }
            }

            //explode player into scene
            if (myGameArea.frameNo > 200 && myGameArea.frameNo < 230) { //explode into scene at 200 - SET MANUALLY
                playerChar.topSpeedX = 50;
                playerChar.accelX = 100;
            } else {
                //reset player's topspeed back to normal
                playerChar.topSpeedX = 10;
                playerCharSpin = false;
            }
            if (myGameArea.frameNo > 200 && myGameArea.frameNo < 205) { //explosion has 6 frames (0 to 5)
                explosion.updateFrames();
                explosion.frames[myGameArea.frameNo - 200].render(0, 0.33);
                playerCharSpin = true;
            }

            if (myGameArea.frameNo > 200) { //start rendering the player - SET MANUALLY
                //image assets need to be paired with a separate hitbox since rotation screws up their position
                playerChar.newPos(); //update position
                playerChar.updateFrames(); //update all frames to match
                //offset hitbox a bit for the cat
                playerChar.newHitBox(playerChar.width - 15, playerChar.height); //update hit box to match new position and match player width and height properly, width offset is related to sticky wall offset

                //render effects
                dust.newPos();
                dust.updateFrames();

                //canvas animation code
                //collision reaction and player render function
                if (!collided) {
                    if (playerCharSpin) { //spin flag
                        playerChar.render(playerChar.rotation + 10, 0.33); //draw self
                    } else {
                        playerChar.frames[animFrameCounter].render(0, 0.33);
                    }
                } else {
                    //HACK - makes player blink by playing empty frame
                    playerChar.frames[animFrameCounter + 1].render(0, 0.33);
                }
            }


            if (sticky && myGameArea.frameNo > 300) { //takes about 300 frames for the player to first sticky - SET MANUALLY
                //only render and animate dust when player is stuck to building
                dust.x = playerChar.x - 10; //offsets - SET MANUALLY
                dust.y = playerChar.y - playerChar.height;
                dust.frames[animFrameCounter].render(0, 0.33);
            }

            //animation frame duration control
            //NEEDS TO BE DYNAMIC - SCALE WITH SCROLL SPEED
            if (everyInterval(6)) { //swith anim frame every n game frames
                animFrameCounter++;
                //-1 to normalise array index, -1 to offset last frame empty frame
                if (animFrameCounter > playerChar.frames.length - 2) {
                    animFrameCounter = 0;
                }
            }

            //////////////////// PLAYER INTERACTIONS ////////////////////
            //cap playerChar horizontal movement - SET MANUALLY
            //eg. can move up to 2/3 of the screen
            if (!levelEnd) {
                if (playerChar.x > playerMoveLimit) {
                    playerChar.speedX = 0;
                    playerChar.accelX = 0;
                    playerChar.x--;
                } else if (playerChar.x < blockObstacles[currentOb].width + playerChar.hitBoxWidth - 5 && !collided) { //makes player char stick to the base block, a HACK to stop collision detection with the building
                    sticky = true;
                    falling = false;
                    playerChar.x = blockObstacles[currentOb].width + playerChar.hitBoxWidth - 10;
                    playerChar.speedX = 0;
                    jumpCounter = 0; //reset jump counter too
                }
                //debug
                blockObstacles[currentOb].drawHitBox("red");
                playerChar.drawHitBox("yellow");
                addOnObstacles[currentOb].drawHitBox("green");
            }


            //'fall' into building
            if (falling && !collided) {
                playerChar.accelX -= 0.01;
            }
            playerChar.newSpeedX(playerChar.accelX);

            //double jump code
            if (jumpCounter == maxJumps && !doubleJumpStarted && falling) {
                doubleJumpStarted = true;
            }
            if ( doubleJumpStarted && !falling) { //reset counter to allow jumping after once landed
                doubleJumpStarted = false;
                jumpCounter = 0;
            }

            ////////////////////////////// SCORE //////////////////////////////
            var zeroAppend;
            if (myGameArea.frameNo < 1000) {
                zeroAppend = "000";
            } else if (myGameArea.frameNo < 10000 && myGameArea.frameNo > 1000) {
                zeroAppend = "00";
            } else if (myGameArea.frameNo > 10000) {
                zeroAppend = "0";
            }
            $("#scoreValue").text(zeroAppend + myGameArea.frameNo);


            ////////////////////////////// RENDER & UPDATE LIVES //////////////////////////////
            //HTML/CSS SOLUTION
            $("#hpBar").prop("src", "../_assets/general/hp_" + curLives + ".png")

            ////////////////////////////// COLLISION DETECTION //////////////////////////////
            if (!levelEnd) {
                //block level and addon level collision
                if (checkCollision(blockObstacles[currentOb], playerChar) || checkCollision(addOnObstacles[currentOb], playerChar)) {
                    curLives--;
                    collided = true;
                    sticky = false;
                    if (!frameCaptured) {
                        savedFrame = myGameArea.frameNo;
                    }
                    blink("#hpBar", 3); //animate hp on collision
                }
                if (myGameArea.frameNo - savedFrame < 50) { //freeze player's x for 50 frames
                    playerChar.x = playerMoveLimit;
                    playerChar.speedX = 0;
                } else { //release player
                    frameCaptured = false;
                    collided = false;
                    falling = true; //a bit of a hack, I think, to fix the stuck in air bug
                }
            }

            ////////////////////////////// PROGRESS BAR //////////////////////////////
            //only animates after clearing easy blocks
            if (!levelEnd) {
                levelProgress = (distanceCounter / ((blockObstacles.length - 4 - easyBlocks) * blockHeight));
                $("h1").text(levelProgress + "%");
                //max height is canvasHeight - 136 //IMPORTANT
                //move the progress bar by jquery
                if (currentOb >= easyBlocks) {
                    $("#curProg").css({
                        "height": (canvasHeight - 136) * (levelProgress)
                    });
                }
            }

            ////////////////////////////// GAMEOVER //////////////////////////////
            //WIN
            if (currentOb == blockObstacles.length - 4) { // block reached - winning condition
                //offset by 4 blocks so we don't run out of blocks to render
                //freeze x movement then send player down
                playerChar.speedY += 5;
                playerChar.speedX = 0;
                playerChar.accelX = 0;
                levelEnd = true;

            }
            //
            if (playerChar.y > canvasHeight + playerChar.height) {
                gameOverWin();
            }
            //LOSE
            if (curLives == 0) {
                levelEnd = true;
                gameOverLose();
            }

        }
    }

    function gameOverLose() {
        $("h1").text("you died");
        //temp game over screen
        var ctx = myGameArea.context;
        ctx.fillStyle = "red";
        ctx.font = "50px Impact";
        var txt = "YOU DIED";
        ctx.fillText("YOU DIED", (canvasWidth / 2) - (ctx.measureText(txt).width / 2), ctx.canvas.height / 2);
        clearInterval(myGameArea.interval);
    }

    function gameOverWin() {
        $("h1").text("you win");
        //temp game over screen
        var ctx = myGameArea.context;
        ctx.fillStyle = "green";
        ctx.font = "50px Impact";
        var txt = "YOU DIED";
        ctx.fillText("YOU WIN", (canvasWidth / 2) - (ctx.measureText(txt).width / 2), ctx.canvas.height / 2);
        clearInterval(myGameArea.interval);
    }

    $("#pauseBtn").click(function () {
        gamePause(); 
    });
    var isPaused = false;
    function gamePause() {
        if (!levelEnd && allAssetsLoaded) {
            $(".gameUI").css({
                "background": "#000000",
                "opacity": "0.75"
            });
            if (!isPaused) {
                isPaused = true;
            } else {
                $(".gameUI").css({
                    "background": "none",
                    "opacity": "1"
                });
                isPaused = false;
            }
        }
    }

    ////////////////////////////// JQUERY ANIMATIONS //////////////////////////////
    //basic jQuery pop animation, pops once to a specific popsize
    //WARNING - ONLY WORKS ON DIVs and Ps
    function elementPop (selector, popSize) {
        if ($(selector).prop("tagName") == "DIV") {
            $(selector).css("position", "relative");
            $(selector).animate({
                width: "+=" + popSize,
                height: "+=" + popSize,
                left: "-=" + popSize / 2,
                top: "-=" + popSize / 2
            }, 200);
            $(selector).animate({
                width: "-=" + popSize * 0.6,
                height: "-=" + popSize * 0.6,
                left: "+=" + (popSize * 0.6) / 2,
                top: "+=" + (popSize * 0.6) / 2
            }, 100);
            $(selector).animate({
                width: "+=" + popSize * 0.4,
                height: "+=" + popSize * 0.4,
                left: "-=" + (popSize * 0.4) / 2,
                top: "-=" + (popSize * 0.4) / 2
            }, 100);
        } else if ($(selector).prop("tagName") == "P") {
            $(selector).css("padding", popSize);
            $(selector).animate({
                fontSize: "+=" + popSize,
                padding: "-=" + popSize
            }, 200);
            $(selector).animate({
                fontSize: "-=" + popSize * 0.6,
                padding: "+=" + popSize * 0.6
            }, 100);
            $(selector).animate({
                fontSize: "+=" + popSize * 0.4,
                padding: "-=" + popSize *0.4
            }, 100);
        } else {
            throw "can't perform pop animation - element type not supported (<div> and <p> only)";
        }
    }

    //jQuery blink animation, 100ms
    function blink(selector, times){
        var remaining = times;
        if (remaining > 0) {
            $(selector).fadeOut(100, function(){
                $(this).fadeIn(100, function(){
                    remaining--;
                    blink(this, remaining);
                });
            });
        }
    }

    ////////////////////////////// PLAYER CONTROLS //////////////////////////////
    //obj new speed is calculated by current speed and acceleration, capped by top speed
    var doubleJumpStarted = false;
    var jumpCounter = 0; //keeps track of how many times player has jumped
    var maxJumps = 2;
    var downKeys = {}; //array of flags to keycode, makes sure each key only fires once
    window.onkeydown = function (e) {
        var key = e.keyCode || e.which;
        switch (key) {
            case 68:
                if (!downKeys[68] && jumpCounter < maxJumps && playerChar.x != playerMoveLimit) {
                    falling = true;
                    sticky = false;
                    playerChar.speedX = 0;
                    playerChar.accelX = 5;
                    playerChar.newSpeedX(playerChar.accelX);
                    downKeys[68] = true;
                    jumpCounter++;
                }
                break;
            case 27:
                gamePause();
                break;
            default:
                break;
                   }
    };

    //currently obj1 stops moving when keys are lifted
    //so obj only accelerates once
    window.onkeyup = function (e) {
        var key = e.keyCode || e.which;
        downKeys[key] = false;
        switch (key) {
            case 68:
                //
                if (!downKeys[68] && jumpCounter < maxJumps && !collided && playerChar.x != playerMoveLimit) {
                    falling = true;
                    playerChar.accelX = 0;
                    playerChar.speedX = 0;
                } else if (!downKeys[68] && jumpCounter == maxJumps) { //hover code
                    playerChar.accelX = -0.1;
                    playerChar.speedX = 0;
                }
                break;
            default:
                break;
                   }
    };

    startGame();
});