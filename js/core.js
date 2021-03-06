//TODO - pick ups
//TODO - OPTIMISE!!!! start with collision detection (instead of checking every single thing)
//TODO - add a proper pause menu
/*jslint browser: true, devel: true*/
/*global $, jQuery, alert, this*/
$(document).ready(function () {
    $.getScript('js/engine.js', function() { //split file, needs functions from engine to work
        //engine contains: Drawable object definitions, jQuery animations
        "use strict";
        //simple debug messaging
        function sendDebugMsg(text) {
            var msg = $("<p>[debug] " + text + "</p>");
            $("body").append(msg);
        }

        var levelNo = 0;
        while (levelNo < 1 || levelNo > 16 || !isNumber(levelNo)) {
            levelNo = prompt("select level (1-16)");
        }

        ////////////////////////////// GAME CANVAS INITIALISATION //////////////////////////////
        var canvasWidth = 360;
        var canvasHeight = 720;
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

        ////////////////////////////// UI //////////////////////////////
        function setupUI () {
            //UI setup code
            $(".gameUI").css({
                "width": canvasWidth,
                "height": canvasHeight,
                "margin-top": -canvasHeight
            });
            $("#progBar").css({
                "height": canvasHeight - 140,
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
            $("#bonus").css({
                "padding-left": canvasWidth - 55,
                "color": "#f00"
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
        var flameOn;
        var playerCharSpin;
        var backdrop;
        var levelLength = 100;
        //var levelNo = 1; //disabled temporary because we're using a prompt
        var levelTime = 0;
        var maxLives = 6;
        var curLives = maxLives;
        function startGame() {
            myGameArea.start();
            console.log("starting game at " + new Date().getTime());

            setupUI();

            playerChar = new DrawableImage("player", 60, 200, "../_assets/general/cat.png", "center", myGameArea.context);
            playerCharSpin = false;
            playerChar.rotation = 0;
            playerChar.topSpeedX = 20;
            playerChar.topSpeedY = 20;
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
            dust = new DrawableImage("dust effect", 60, 220, "../_assets/general/dust.png", "center", myGameArea.context);
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

            //powerup effect frames
            flameOn = new DrawableImage("powerup effect", 60, 220, "../_assets/general/powerup_effect.png", "center", myGameArea.context);
            flameOn.rotation = 0;
            flameOn.topSpeedX = 10;
            flameOn.topSpeedY = 10;
            flameOn.accelX = 0;
            flameOn.accelY = 0;
            flameOn.addFrames([
                "../_assets/general/powerup_effect_2.png"
            ]);

            explosion = new DrawableImage("explosion", 60, 200, "../_assets/general/explosion_0.png", "center", myGameArea.context);
            explosion.rotation = 0;
            explosion.addFrames([
                "../_assets/general/explosion_1.png",
                "../_assets/general/explosion_2.png",
                "../_assets/general/explosion_3.png",
                "../_assets/general/explosion_4.png",
                "../_assets/general/explosion_5.png" 
            ]);

            generateLevel(levelNo, levelLength); //eg. use level 1's assets, generate 50 blocks
            console.log("level length: " + levelLength);

            //$("h1").text("ayylmao");
            sendDebugMsg("D to jump and double jump, hold to go further, tap repeatedly to hover, esc to pause");
        }

        ////////////////////////////// LEVEL GENERATION //////////////////////////////
        //spawn n obstacles and load their assets
        //n is how many blocks to generate
        var blockHeight = 218 //height of a standard block
        var blockObstacles = [];
        var addOnObstacles = [];
        var powerUps = [];
        var maxPowerUps; //max no. of powerups a level is allowed to spawn, related to the no. of blocks we spawned
        var spawnChance = 0.3; //needs to be DYNAMIC?
        var easyBlocks = 10; //number of guaranteed easy blocks
        var addOnExcludeList = []; //list of indexes where add ons can and can't spawn
        var collided = false; //collision flag
        var powerUpIndex = []; //use to find out where the powerups are

        function generateLevel(level, n) {
            var baseControlX = 0;
            var baseControlY = 0; //controls the Y coordinate to spawn new blocks

            backdrop = new DrawableImage("backdrop", 0, 0, "../_assets/levels/level " + level + "/bg.png", "default", myGameArea.context);

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
                    var easyBase = new DrawableImage("easy base", baseControlX, baseControlY, bdfileList[2], "default", myGameArea.context);
                    easyBase.newHitBox(0, 0);
                    blockObstacles.push(easyBase);
                    baseControlY += blockHeight;
                    addOnExcludeList.push(false);
                }
                //generate n random base blocks
                //load base blocks then randomly push them onto the obstacle list
                for (var i = 0; i < n - easyBlocks; i++) {
                    var selection = Math.floor(Math.random() * bdfileList.length);
                    var base = new DrawableImage("base" + selection, baseControlX, baseControlY, bdfileList[selection], "default", myGameArea.context);
                    base.newHitBox(0, 0);
                    blockObstacles.push(base);
                    baseControlY += blockHeight; //increments height (to put next block) this should be the height of a standard block - SET MANUALLY
                    if (selection == 2) { //build exclude list, for id 2 blocks
                        addOnExcludeList.push(false);
                    } else {
                        addOnExcludeList.push(true);
                    }
                }
            });

            var addOnControlX = 0;
            var addOnControlY = 50; //offset
            var obConsec = false; //consecutive spawn flag, works for 2 blocks only
            //now spawn the add on obstacles
            var obfileList = [];
            $.post("listdir.php", {lvl: level, type: "ob"}, function(response) {//response get, now parse it
                obfileList = response.split("%");
                obfileList.pop(); //pop the last element since it's empty due to parsing
                for (var f = 0; f < obfileList.length; f++) { //reformat the paths so they're usable
                    obfileList[f] = "." + obfileList[f];
                }
                //generate random add ons with spawn chance
                //can not spawn 2 add ons consecutively
                for (var k = 0; k < n; k++) {
                    if (Math.random() < spawnChance && !obConsec && !addOnExcludeList[k]) { //has a percentage spawn chance, else push an empty object
                        var selection = Math.floor(Math.random() * obfileList.length);
                        var addOn = new DrawableImage("addOn" + selection, addOnControlX, addOnControlY, obfileList[selection], "default", myGameArea.context);
                        addOn.newHitBox(0, 0);
                        addOnObstacles.push(addOn);
                        addOnControlY += blockHeight;
                        obConsec = true;
                    } else {
                        var addOn = new DrawableImage("empty" + selection, addOnControlX, addOnControlY, "../_assets/general/empty.png", "default", myGameArea.context)
                        addOn.newHitBox(0, 0);
                        addOnObstacles.push(addOn);
                        addOnControlY += blockHeight;
                        obConsec = false;
                    }
                }
            });

            var powerUpControlY = 0;
            //a simpler spawn algorithm since we don't need to consider matching base blocks
            //generate random powerups, shares the global spawnchance with addons
            //we're only allowed to spawn 1 powerup every 10 blocks - SET MANUALLY
            //set powerup x position MANUALLY
            for (var l = 0; l < n; l++) {
                if (Math.random() < spawnChance && l % 10 == 0) {
                    var powerUp = new DrawableImage("power up", 260, powerUpControlY, "../_assets/general/p.png", "center", myGameArea.context);
                    powerUp.newHitBox(0, 0);
                    powerUps.push(powerUp);
                    powerUpControlY += blockHeight;
                    powerUpIndex.push(l);
                    console.log("powerup added at " + l);
                } else {
                    var powerUp = new DrawableImage("power up", 260, powerUpControlY, "../_assets/general/empty.png", "center", myGameArea.context);
                    powerUp.newHitBox(0, 0);
                    powerUps.push(powerUp);
                    powerUpControlY += blockHeight;
                }
            }
        }

        ////////////////////////////// PRIMARY GAME LOOP //////////////////////////////
        //update function, gets called continuously by setInterval in startGame()
        var animFrameCounter = 0;
        var flameOnFrameCounter = 0;
        var falling = true;
        var sticky = false;
        var allAssetsLoaded = false;
        var scrollSpeed = 6; //starting scrolling speed
        var savedFrame = 0; //variables for taking snapshots of frames for calculating cooldowns
        var frameCaptured = false; //
        var playerMoveLimit = canvasWidth * 0.8; //player can't move beyond this x
        var backdropScale;
        var levelEnd = false;
        var distanceCounter = 0; //distance travelled so far
        var levelProgress = 0;
        var countDown = 3;
        var powerUpStart = false;
        var powerUpSpeedCounter = 0;
        var savedPlayerCharX;
        var gameScore = 0;

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
                //show countdown in the meantime
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
                if (myGameArea.frameNo > 250) { //when to clear - SET MANUALLY
                    $("#announcementText").text("");
                    $("#countDown").text("");
                }

                //////////////////// SETTING UP & PRE-RENDERING ////////////////////
                myGameArea.frameNo++;
                //$("h1").text("ayylmao");
                myGameArea.clear();
                //pre-rendering
                if (myGameArea.frameNo === 1) { //only on first frame
                    playerChar.render(0, 0.01); //VERY IMPORTANT - EVERYTHING HAS TO RENDER ONCE FIRST
                    dust.render(0, 0.01); //render super small so they're hard to see
                    flameOn.render(0, 0.01);
                    explosion.render(0, 0.01);
                    backdrop.render(0, 0.01); //because they're not supposed to be seen yet
                    backdropScale = canvasWidth / backdrop.width * 0.01 + 0.01; //+ little offset
                    for (var i = 0; i < blockObstacles.length; i++) {
                        blockObstacles[i].render(0, 0.01);
                        addOnObstacles[i].render(0, 0.01);
                        powerUps[i].render(0, 0.01);
                    }
                    myGameArea.clear();
                }
                //////////////////// RENDERING & HITBOXING ////////////////////
                //render the level backdrop
                backdrop.render(0, backdropScale);
                //constant scrolling - could be tweaked - SET MANUALLY
                if (backdrop.y + backdrop.height >= canvasHeight) {
                    backdrop.y -= 0.05;
                }

                //render obstacles and move them, then get the current obstacle for later reference
                var currentOb = 0; //the index of the current obstacle player is on top of
                //render blocks
                scrollSpeed += 0.001; //accelerate speed as level goes on - SET MANUALLY
                for (var i = 0; i < blockObstacles.length; i++) {
                    blockObstacles[i].y -= scrollSpeed; //obstacle scrolling speed
                    //render call optimisation
                    //this selects only blocks that should be visible in the canvas
                    if (!isOutOfBounds(blockObstacles[i], myGameArea.context) || (blockObstacles[i].y + blockObstacles[i].height >= 0 && blockObstacles[i].y < 0) || (blockObstacles[i].y <= canvasHeight && blockObstacles[i].y + canvasHeight > canvasHeight)) {//look at obstacles inside the canvas and get the current one
                        //obstacle's position in the list is its ID
                        blockObstacles[i].render(0, 0.33);
                        blockObstacles[i].newHitBox(blockObstacles[i].width, blockObstacles[i].height);

                        //blockObstacles[i].drawHitBox("red"); //debug

                        if (blockObstacles[i].y <= playerChar.y && blockObstacles[i].y + blockObstacles[i].height >= playerChar.y) {
                            currentOb = i;
                        } else { //fixes undefined currentOb bug, so we always have a currentOb
                            //this was breaking stickywalling after render call optimisation
                            //currentOb = i - 1;
                        }
                    }

                }

                //now render the add ons
                //for every base block, an add on exists, but only render and hitbox the ones that are valid
                for (var a = easyBlocks + 1; a < addOnObstacles.length; a++) { //first 10 blocks are easy blocks - no add on allowed
                    if(!addOnExcludeList[a]) { //not allowed to spawn on the biggest block
                        addOnObstacles[a].y -= scrollSpeed;
                        //optimisation - doesn't seem to be perfect but does the job
                        if (!isOutOfBounds(addOnObstacles[a], myGameArea.context) || (addOnObstacles[a].y + addOnObstacles[a].height >= 0 && addOnObstacles[a].y < 0) || (addOnObstacles[a].y <= canvasHeight && addOnObstacles[a].y + canvasHeight > canvasHeight)) {
                            addOnObstacles[a].render(0, 0.33);
                            //addOnObstacles[a].drawHitBox("yellow"); //debug
                            addOnObstacles[a].x = blockObstacles[a].width - 5;
                            addOnObstacles[a].newHitBox(addOnObstacles[a].width, addOnObstacles[a].height);
                        }
                    }
                }


                //console.log("powerupindex " + powerUpIndex.length);
                //now render the powerups 
                for (var p = easyBlocks + 1; p < powerUps.length; p++) {
                    powerUps[p].y -= scrollSpeed;
                    //optimisation
                    if (!isOutOfBounds(powerUps[p], myGameArea.context) || (powerUps[p].y + powerUps[p].height >= 0 && powerUps[p].y < 0) || (powerUps[p].y <= canvasHeight && powerUps[p].y + canvasHeight > canvasHeight)) {
                        for (var q = 0; q < powerUpIndex.length; q++) { //using powerup index to only render powerups not been picked up
                            if (powerUpIndex[q] == p) {
                                powerUps[p].render(0, 0.33);
                                powerUps[p].newHitBox(powerUps[p].width, powerUps[p].height);
                            }
                        }
                    }
                }

                //explode player into scene
                if (myGameArea.frameNo > 200 && myGameArea.frameNo < 230) { //explode into scene at 200 - SET MANUALLY
                    playerChar.topSpeedX = 50;
                    playerChar.accelX = 100;
                } else {
                    //reset player's topspeed back to normal
                    playerChar.topSpeedX = 10;
                    falling = true;
                }
                if (myGameArea.frameNo > 200 && myGameArea.frameNo < 205) { //explosion has 6 frames (0 to 5)
                    explosion.updateFrames();
                    explosion.frames[myGameArea.frameNo - 200].render(0, 0.33);
                    playerCharSpin = true;
                }
                if (myGameArea.frameNo == 230) { //reset explosive start spin flag
                    playerCharSpin = false;
                    sticky = false;
                }

                //start rendering the player and dust - SET MANUALLY
                if (myGameArea.frameNo > 200) { 
                    //image assets need to be paired with a separate hitbox since rotation screws up their position
                    playerChar.newPos(); //update position
                    playerChar.updateFrames(); //update all frames to match
                    //offset hitbox a bit for the cat
                    playerChar.newHitBox(playerChar.width - 15, playerChar.height); //update hit box to match new position and match player width and height properly, width offset is related to sticky wall offset

                    //update effects to keep up with the playerChar
                    //dust.newPos(); //effects are not using accel so we probably don't need newPos()
                    //flameOn.newPos();

                    //collision reaction and player render function
                    if (!collided) {
                        if (playerCharSpin) { //spin flag
                            playerChar.render(playerChar.rotation + 30, 0.33); //draw self
                        } else {
                            playerChar.frames[animFrameCounter].render(0, 0.33);
                        }
                    } else {
                        //HACK - makes player blink by playing empty frame
                        playerChar.frames[animFrameCounter + 1].render(0, 0.33);
                    }
                    //playerChar.drawHitBox("green"); //debug
                }

                if (sticky && myGameArea.frameNo > 300) { //HACK - takes about 300 frames for the player to first sticky - SET MANUALLY
                    //only render and animate dust when player is stuck to building
                    dust.x = playerChar.x - 10; //offsets - SET MANUALLY
                    dust.y = playerChar.y - playerChar.height;
                    dust.updateFrames();
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
                //sticky walling
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
                }

                //'fall' into building
                if (falling && !collided && !levelEnd) {
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
                gameScore++; //score = frame
                if (myGameArea.frameNo < 1000 && myGameArea.frameNo > 100) {
                    zeroAppend = "000";
                } else if (myGameArea.frameNo < 10000 && myGameArea.frameNo > 1000) {
                    zeroAppend = "00";
                } else if (myGameArea.frameNo > 10000) {
                    zeroAppend = "0";
                } else if (myGameArea.frameNo < 100 && myGameArea.frameNo > 10) {
                    zeroAppend = "0000";
                } else if (myGameArea.frameNo < 10) {
                    zeroAppend = "00000";
                }
                //$("#scoreValue").text(zeroAppend + myGameArea.frameNo);
                $("#scoreValue").text(zeroAppend + gameScore);


                ////////////////////////////// RENDER & UPDATE LIVES //////////////////////////////
                //HTML/CSS SOLUTION
                $("#hpBar").prop("src", "../_assets/general/hp_" + curLives + ".png");

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
                    //implement collision actions here
                    if (collided && myGameArea.frameNo - savedFrame < 50) { //freeze player's x for 50 frames on collision
                        playerChar.x = playerMoveLimit;
                        playerChar.speedX = 0;
                    } else { //release player
                        frameCaptured = false;
                        collided = false;
                        falling = true; //a bit of a hack, I think, to fix the stuck in air bug
                    }

                    //powerup action
                    if (powerUpStart && myGameArea.frameNo - savedFrame < 50) {
                        playerChar.x = 260;//freeze at powerup position - SET MANUALLY
                        playerChar.speedX = 0;
                        scrollSpeed += 1;
                        powerUpSpeedCounter += 1; //start counting speed increase so we can revert it later
                        //animation counter for flame
                        if (flameOnFrameCounter == 0) {
                            flameOnFrameCounter++;
                        } else if (flameOnFrameCounter == 1) {
                            flameOnFrameCounter--;
                        }
                        flameOn.y = playerChar.y - 5;
                        flameOn.x = playerChar.x;
                        flameOn.updateFrames();
                        flameOn.frames[flameOnFrameCounter].render(0, 0.33);
                    } else {
                        powerUpStart = false;
                        scrollSpeed -= powerUpSpeedCounter;
                        powerUpSpeedCounter = 0;
                    }

                    //powerup collision
                    //console.log("we have " + powerUpIndex.length + " powerups");
                    for (var c = 0; c < powerUpIndex.length; c++) {
                        if (checkCollision(powerUps[powerUpIndex[c]], playerChar)) {
                            console.log("powerup picked up, +50 score");
                            gameScore += 50;
                            $("#bonus").text("+50");
                            //doesnt work yet - FIX
                            if (!frameCaptured) {
                                savedFrame = myGameArea.frameNo;
                            }
                            //picked up, remove this index from the list
                            powerUpIndex.splice(c, 1);
                            powerUpStart = true;
                            if (!frameCaptured) {
                                savedFrame = myGameArea.frameNo;
                            }
                        }
                    }
                    if (myGameArea.frameNo - savedFrame > 20) { //show for 20 frames
                        $("#bonus").text("");
                    }
                }


                ////////////////////////////// PROGRESS BAR //////////////////////////////
                if (currentOb >= easyBlocks) { //start counting progress distance after easy blocks
                    distanceCounter += scrollSpeed;
                }
                //only animates after clearing easy blocks
                if (!levelEnd) {
                    levelProgress = (distanceCounter / ((blockObstacles.length - 4 - easyBlocks) * blockHeight));
                    //$("h1").text(levelProgress + "%");
                    //max height is canvasHeight - 136 //IMPORTANT LAYOUT VALUE
                    //move the progress bar by jquery
                    if (currentOb >= easyBlocks) {
                        $("#curProg").css({
                            "height": (canvasHeight - 136) * (levelProgress)
                        });
                    }
                }

                ////////////////////////////// GAMEOVER //////////////////////////////
                //WINNING
                if (currentOb >= blockObstacles.length - 5) { // block reached - winning condition
                    //offset by 5 blocks so we don't run out of blocks to render
                    //freeze x movement then send player down
                    playerChar.speedY += 5;
                    playerChar.speedX = 0;
                    scrollSpeed = 0;
                    levelEnd = true;
                }
                //properly end the game now
                if (playerChar.y > canvasHeight + playerChar.height) {
                    gameOverWin();
                }
                //LOSING
                if (curLives === 0) {
                    levelEnd = true;
                    gameOverLose()
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
            if (confirm("restart game?")) { //temp restart prompt
                location.reload();
            }
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
            gameOverLose();
            if (confirm("restart game?")) { //temp restart prompt
                location.reload();
            }
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
                } else { //unpause
                    $(".gameUI").css({
                        "background": "none",
                        "opacity": "1"
                    });
                    isPaused = false;
                }
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
                        playerChar.accelX = -0.2;
                        playerChar.speedX = 0;
                    } else if (!downKeys[68] && jumpCounter == maxJumps) { //hover code
                        playerChar.accelX = -0.2;
                        playerChar.speedX = 0;
                    }
                    break;
                default:
                    break;
                       }
        };

        startGame();
    });
});