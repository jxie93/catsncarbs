/*jslint browser: true*/
/*global $, jQuery, alert*/
$(document).ready(function () {
    //use strict mode for the whole file
    "use strict";
    
    //simple debug messaging
    function sendDebugMsg(text) {
        var msg = $("<p>[debug] " + text + "</p>");
        $("body").append(msg);
        //$("#debug").text(text);
    }
    
    //define game area
    var myGameArea = {
        canvas : document.createElement("canvas"),
        start : function () {
            this.canvas.width = 375;
            this.canvas.height = 667;
            this.context = this.canvas.getContext("2d");
            $("body").prepend(this.canvas);
        }
    };
    
    //draw a red rectangle
    function DrawableRect(width, height, x, y) {
        this.width = width;
        this.height = height;
        this.x = x;
        this.y = y;
        var ctx = myGameArea.context;
        ctx.fillStyle = "red";
        ctx.fillRect(x, y, width, height);
    }
    //draw an asset
    function DrawableAsset(source, x, y, scale) {
        this.scale = scale;
        this.x = x;
        this.y = y;
        this.source = source;
        if (scale < 1) {
            throw "drawAsset() - invalid scale";
        }
        var ctx = myGameArea.context;
        var img = new Image();
        img.onload = function () {
            ctx.drawImage(img, x, y, img.naturalWidth * scale, img.naturalHeight * scale);
        };
        img.src = source;
    }
    
    myGameArea.start();
    var myObj1 = new DrawableRect(100, 100, 10, 120);
    var myAsset1 = new DrawableAsset("../_assets/general/cash.png", 0, 0, 1);
    sendDebugMsg("message goes here");
    
});