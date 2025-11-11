/////////////////////////////// GENERIC DRAWABLE ///////////////////////////////
// knows how to change its position by speed/accel
var Drawable = function(name, x, y) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.speedX = 0;
    this.speedY = 0;
    this.topSpeedX = 0;
    this.topSpeedY = 0;
    this.accelX = 0;
    this.accelY = 0;

    this.newPos = function() {
        this.x += Math.min(this.speedX, this.topSpeedX);
        this.y += Math.min(this.speedY, this.topSpeedY);

        // cap max speed
        if (this.speedX > this.topSpeedX) this.speedX = this.topSpeedX;
        if (this.speedY > this.topSpeedY) this.speedY = this.topSpeedY;
        if (this.speedX < -this.topSpeedX) this.speedX = -this.topSpeedX;
        if (this.speedY < -this.topSpeedY) this.speedY = -this.topSpeedY;
    };
};

/////////////////////////////// DRAWABLE IMAGE ///////////////////////////////
// extends Drawable, can render to canvas, handle hitboxes & animation frames
var assetLoadList = []; // { name: string, loaded: boolean }

var DrawableImage = function(name, x, y, source, origin = "center", ctx) {
    if (!ctx) throw new Error("DrawableImage requires a valid canvas context");

    Drawable.call(this, name, x, y);

    var self = this;
    this.ctx = ctx;
    this.origin = origin;
    this.source = source;

    this.loaded = false;
    var img = new Image();
    img.onload = function() {
        self.loaded = true;
        self.width = img.naturalWidth;
        self.height = img.naturalHeight;
        // update assetLoadList
        assetLoadList.forEach(a => { if(a.name === name) a.loaded = true; });
    };
    img.src = source;

    // Add to assetLoadList
    assetLoadList.push({ name: name, loaded: false });

    this.render = function(rotation = 0, scale = 1) {
        if (!self.loaded) return;

        if (scale < 0) throw "DrawableImage.render() - invalid scale";

        const ctx = self.ctx;
        if (self.origin === "center") {
            ctx.save();
            ctx.translate(self.x, self.y);
            ctx.rotate(rotation * Math.PI / 180);
            ctx.drawImage(img, -img.naturalWidth * scale / 2, -img.naturalHeight * scale / 2, img.naturalWidth * scale, img.naturalHeight * scale);
            ctx.restore();
        } else { // default: top-left
            ctx.drawImage(img, self.x, self.y, img.naturalWidth * scale, img.naturalHeight * scale);
        }

        self.width = img.naturalWidth * scale;
        self.height = img.naturalHeight * scale;
        self.scale = scale;
        self.rotation = rotation;
    };

    // Hitbox functions
    this.newHitBox = function(w, h) {
        if (self.origin === "center") {
            self.hitBoxX = self.x - w / 2;
            self.hitBoxY = self.y - h / 2;
        } else {
            self.hitBoxX = self.x;
            self.hitBoxY = self.y;
        }
        self.hitBoxWidth = w;
        self.hitBoxHeight = h;
    };

    this.drawHitBox = function(color = "red") {
        const ctx = self.ctx;
        if (!ctx || !self.hitBoxWidth || !self.hitBoxHeight) return;
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = color;
        ctx.fillRect(self.hitBoxX, self.hitBoxY, self.hitBoxWidth, self.hitBoxHeight);
        ctx.globalAlpha = 1;
    };

    // Animation frames
    this.frames = [this];
    this.addFrames = function(sources) {
        sources.forEach((src, i) => {
            const frame = new DrawableImage(`${self.name}_${i}`, self.x, self.y, src, self.origin, self.ctx);
            self.frames.push(frame);
        });
    };
    this.updateFrames = function() {
        self.frames.forEach(f => {
            f.x = self.x;
            f.y = self.y;
            f.speedX = self.speedX;
            f.speedY = self.speedY;
            f.accelX = self.accelX;
            f.accelY = self.accelY;
            f.rotation = self.rotation;
            f.scale = self.scale;
        });
    };

    // Speed helpers
    this.newSpeedX = function(amount) { self.speedX = Math.min(self.speedX + amount, self.topSpeedX); };
    this.newSpeedY = function(amount) { self.speedY = Math.min(self.speedY + amount, self.topSpeedY); };

    this.getInfo = function() {
        return `${self.name}(${self.source})\n[dimensions]: ${self.width} x ${self.height}\n[position]: ${self.x},${self.y}\n[speedXY]: x${self.speedX} y${self.speedY} [accelXY]: x${self.accelX} y${self.accelY}\n[rotation]: ${self.rotation} [scale]: ${self.scale} [origin]: ${self.origin}`;
    };
};

/////////////////////////////// COLLISION & BOUNDS ///////////////////////////////
function checkCollision(obj1, obj2) {
    if (obj1.hitBoxX === undefined || obj1.hitBoxY === undefined ||
        obj1.hitBoxWidth === undefined || obj1.hitBoxHeight === undefined) {
        console.warn(obj1.name + " missing hitBox (collision)");
        return false;
    }

    if (obj2.hitBoxX === undefined || obj2.hitBoxY === undefined ||
        obj2.hitBoxWidth === undefined || obj2.hitBoxHeight === undefined) {
        console.warn(obj2.name + " missing hitBox (collision)");
        return false;
    }

    if (obj1.hitBoxY + obj1.hitBoxHeight < obj2.hitBoxY) return false;
    if (obj1.hitBoxY > obj2.hitBoxY + obj2.hitBoxHeight) return false;
    if (obj1.hitBoxX + obj1.hitBoxWidth < obj2.hitBoxX) return false;
    if (obj1.hitBoxX > obj2.hitBoxX + obj2.hitBoxWidth) return false;

    $("h1").text("collision");
    return true;
}

function isOutOfBounds(obj, ctx) {
    if (obj.hitBoxX == undefined) { console.warn(obj.name + " missing hitBox (bounds)"); return true; }
    return !(obj.hitBoxY >= 0 && obj.hitBoxY + obj.hitBoxHeight <= ctx.canvas.height &&
             obj.hitBoxX >= 0 && obj.hitBoxX + obj.hitBoxWidth <= ctx.canvas.width);
}

/////////////////////////////// JQUERY ANIMATIONS ///////////////////////////////
function elementPop(selector, popSize) {
    const $el = $(selector);
    const tag = $el.prop("tagName");
    if (tag === "DIV") {
        $el.css("position", "relative")
            .animate({ width: `+=${popSize}`, height: `+=${popSize}`, left: `-=${popSize/2}`, top: `-=${popSize/2}` }, 200)
            .animate({ width: `-=${popSize*0.6}`, height: `-=${popSize*0.6}`, left: `+=${popSize*0.6/2}`, top: `+=${popSize*0.6/2}` }, 100)
            .animate({ width: `+=${popSize*0.4}`, height: `+=${popSize*0.4}`, left: `-=${popSize*0.4/2}`, top: `-=${popSize*0.4/2}` }, 100);
    } else if (tag === "P") {
        $el.css("padding", popSize)
            .animate({ fontSize: `+=${popSize}`, padding: `-=${popSize}` }, 200)
            .animate({ fontSize: `-=${popSize*0.6}`, padding: `+=${popSize*0.6}` }, 100)
            .animate({ fontSize: `+=${popSize*0.4}`, padding: `-=${popSize*0.4}` }, 100);
    } else throw "elementPop only supports <div> and <p>";
}

function blink(selector, times){
    if (times <= 0) return;
    $(selector).fadeOut(100, function(){ $(this).fadeIn(100, function(){ blink(this, times-1); }); });
}

function isNumber(n) { return !isNaN(parseFloat(n)) && isFinite(n); }
