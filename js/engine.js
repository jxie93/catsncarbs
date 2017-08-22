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

    //can draw from file, has a hit box, extends Drawable
    //IMPORTANT - CENTER ORIGIN BY DEFAULT
    var assetLoadList = []; //list of assetLoaded objects {name: name, loaded: true/false}
    var DrawableImage = function (name, x, y, source, origin, ctx) {
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
                var newFrame = new DrawableImage(this.name + i, this.x, this.y, source[i], origin, ctx);
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
            var info = 
                this.name + "(" + this.source + ")\n" +
                "[dimensions]: " + this.width + " x " + this.height + "\n" +
                "[position]: " + this.x + "," + this.y + "\n" +
                "[speedXY]: x" + this.speedX + " y" + this.speedY + " [accelXY]: x" + this.accelX + " y" + this.accelY + "\n" +
                "[rotation]: " + this.rotation + " [scale]: " + this.scale + " [origin]:" + this.origin + "\n";
            return info;
        }
    };
	
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
        function isOutOfBounds(obj, ctx) {
            if (obj.hasOwnProperty("hitBoxX")) {
                if ((obj.hitBoxY + obj.hitBoxHeight < ctx.canvas.height) && (obj.hitBoxY > 0) && (obj.hitBoxX >= 0) && (obj.hitBoxX + obj.hitBoxWidth < ctx.canvas.width)) {
                    return false;
                } else {
                    return true;
                }
            } else {
                console.log(obj.name + " is missing a hit box");
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