/* global define, console, require*/
define(
    [
        'utils/ObjectSuper',
        'avBase',
        'utils/utils2',
        'jquery'
    ],
    function(objectSuper,
             baseCode,
             Utils,
             $jq
    ){

        "use strict";

        function analyser(){

            var defaultOptions = {

                // general
                numFrequencies : 512,
                batchModulo : 1,

                numElements : 80,
                startPosX : 10,
                spacing : 50,
                canvasFillAlpha : 0.06,

                // DRAW OPTIONS

//                ampMultiplier : 0.2,
//                boostAmp : false,
//                boostAmpDivider : 5,

                mapFreqToColor : true,
                brightColors : true,

                lineWidth : 1,
                strokeStyle: [255, 255, 255],

                linkAlphaToAmplitude : false,
//                invertAlpha : false,

                // specific
                maxAlpha : 0.2,
                maxVelocity : 3,
                minAngleIncrement : 0.05,
                maxAngleIncrement : 1,
                minAmpBoost : 0.1,
                maxAmpBoost : 1.5,
                minDist : 100,
                maxDist : 200
            }

            var _imageW = 30, _imageH = 30, _images = [];

            var that = baseCode(defaultOptions);

            var __super = objectSuper(that);

            that.init = function(pVizType){

                var canvas = document.getElementById('canvas');
                canvas.width = 800;
                canvas.height = 600;

                // swimming pool effect
//                $jq('body').css('background-color', '#1bdada');
//                $jq('#container').css('background-color', '#1bdada');
//                defaultOptions.canvasFillStyle = [27, 218, 218];
//                defaultOptions.canvasFillAlpha = 0.25;
//                defaultOptions.numElements = 145;
//                defaultOptions.mapFreqToColor = false;
                //--

                var init = __super.init(pVizType);

                this.createImages();

                return init;
            };

            /////////// OVERRIDEABLE FUNCTIONS FOR SUBCLASSES TO CHANGE CORE FUNCTIONALITY /////////////

            that.createFrequencyDataTypedArray = function(){

                this.soundData = new Uint8Array(this.analyserNode.frequencyBinCount);
            };

            that.getFrequencyData = function(){

                this.analyserNode.getByteFrequencyData(this.soundData);
            };

            that.preLoopAction = function(){

                // reset the canvas, with a reduced alpha to leave traces of the last draw
                __super.preLoopAction();

                this.checkForCollision();

                for(var i = 0, len = this.binSize; i < len; i++){
                    var img = _images[i];
                    this.move(img);
                }
            }

            that.loop = function(pNumSamples){

                Utils.loopOverBins(pNumSamples, this.binSize, this.soundData, this.draw, this);
            };

            that.postLoopAction = function(){ }

            //--- end OVERRIDEABLE FUNCTIONS FOR SUBCLASSES TO CHANGE CORE FUNCTIONALITY -------------


            that.draw = function(pFreqIndex, pAmplitude, pNumSamples, i){

//              if(window.console && console.log){
//                  console.log('### localAudioVisualiser_songDna_5_batch::draw:: pFreqIndex=',pFreqIndex,' pAmplitude=',pAmplitude);
//              }

                // normalise the amplitude within the possible range
                var ampNorm = Utils.normalize(pAmplitude, 0, 255); // re. getByteFrequencyData
                if(ampNorm === 0){
                  return false
                }

                //-------------------------------------------------------------------------------

                /////////////// SET ALPHA /////////////////
                var alpha = this.options.maxAlpha;

                if(this.options.linkAlphaToAmplitude){

                    // link alpha to amplitude: strongest signal = 1, weakest = 0.1
                    alpha = Utils.lerp(ampNorm, 0.1, alpha);
//
//                    if(this.options.invertAlpha){
//
//                        // link alpha to amplitude, but invert: strongest signal = 0.1, weakest = 1
//                        alpha = 1.1 - alpha;
//                    }
                }

                /////////////// SET COLOR /////////////////


                var strokeStyle = this.options.strokeStyle
                this.canvCtx.strokeStyle = 'rgba(' + strokeStyle[0] + ','  + strokeStyle[1] + ',' + strokeStyle[2] + ',' + alpha + ')';
                var chosenRGB;

                if(this.options.mapFreqToColor){

                    // normalise the frequency within the full frequency range (0 - 511)
                    var freqNorm = Utils.normalize(pFreqIndex, 0, pNumSamples - 1);

                    // hue
                    var hue = Math.floor(Utils.lerp(freqNorm, 0, 360));

                    // saturation & brightnesss
                    var sat = Math.floor(Utils.lerp(ampNorm, 40, 100));// TODO make 2nd param an option?
                    var bright = Math.floor(Utils.lerp(ampNorm, 50, 100));

                    var rgb = Utils.hsvToRGB([hue, sat, bright]);
                    var rgbBright = Utils.hsvToRGB([hue, 100, 100]);

                    chosenRGB = rgb;

                    if(this.options.brightColors){

                        chosenRGB = rgbBright;
                    }

                    this.canvCtx.strokeStyle = 'rgba(' + chosenRGB[0] + ','  + chosenRGB[1] + ',' + chosenRGB[2] + ',' + alpha + ')';;
//                    this.canvCtx.fillStyle = 'rgba(' + chosenRGB[0] + ','  + chosenRGB[1] + ',' + chosenRGB[2] + ',' + 1 + ')';;
                }


                var img0 = _images[i];

                // Give node velocity based on amplitude
                var vel = Utils.lerp(ampNorm, 0, this.options.maxVelocity);

                // if node was already moving in a particular direction - keep it moving that way.
                img0.vx = (img0.vx >= 0)? vel : -vel;
                img0.vy = (img0.vy >= 0)? vel : -vel;


                // test: draw circle coloured by frequency
//                var rad = Utils.lerp(ampNorm, 1, 5)
//                this.canvCtx.lineWidth = 1;//rad;
//                this.canvCtx.beginPath();
//                this.canvCtx.arc(img0.x, img0.y, rad, 0, Math.PI * 2, false);
//                this.canvCtx.stroke();
////                this.canvCtx.fill();
//                return true;

                //--


                // NODES
                var j, img1, dx, dy, dist, maxDist, c1ax, c1ay, c2ax, c2ay, c1x, c1y, c2x, c2y, ampEffect, angleIncr;

                angleIncr = Utils.lerp(ampNorm, this.options.minAngleIncrement, this.options.maxAngleIncrement);
                ampEffect = Utils.lerp(ampNorm, this.options.minAmpBoost, this.options.maxAmpBoost);

                maxDist = Utils.lerp(ampNorm, this.options.minDist, this.options.maxDist);

                if(i < this.binSize - 1){

                    for(j = i + 1; j < this.binSize; j++){

                        img1 = _images[j];

                        dx = img0.x - img1.x;
                        dy = img0.y - img1.y;

                        dist = Math.sqrt(dx * dx + dy * dy);

                        if(dist < maxDist){

//                            this.canvCtx.strokeStyle = 'rgba(' + strokeStyle[0] + ','  + strokeStyle[1] + ',' + strokeStyle[2] + ',' + alpha + ')';

                            this.canvCtx.lineWidth = 1 - dist / maxDist;

                            this.canvCtx.beginPath();
                            this.canvCtx.moveTo(img0.x, img0.y);


//  						        this.canvCtx.quadraticCurveTo(img1.x + dx, img0.y - dy, img1.x, img1.y);

                            c1ax = Math.sin(img0.cAngleX) * (dx * ampEffect);
                            c1ay = Math.sin(img0.cAngleY) * (dx * ampEffect);

                            c2ax = Math.sin(img1.cAngleX) * (dx * ampEffect);
                            c2ay = Math.sin(img1.cAngleY) * (dx * ampEffect);

                            c1x = (img1.x + dx) + c1ax;
                            c1y = (img0.y - dy) + c1ay;
                            c2x = (img0.x - dx) + c2ax;
                            c2y = (img1.y + dy) + c2ay;

                            this.canvCtx.bezierCurveTo(c1x, c1y, c2x, c2y, img1.x, img1.y);

                            img1.cAngleX += angleIncr / this.binSize;
                            img1.cAngleY += angleIncr / this.binSize;

                            this.canvCtx.stroke();
                        }
                    }

                    img0.cAngleX += angleIncr;
                    img0.cAngleY += angleIncr;

                }

                return true;
            }

            that.optionChange = function(pOpt, pVal){

                __super.optionChange(pOpt, pVal);

                switch(pOpt){

                    case 'numElements':

                        this.binSize = this.options.numElements = pVal;
                        _images = [];
                        that.createImages();

                        break
                }
            };

            that.createImages = function(){

                var i, imageObj;

                for(i = 0; i < this.binSize; i++){

                    imageObj = {
                        width       : _imageW,
                        height      : _imageH,
                        radius      : Math.sqrt(_imageW * _imageW + _imageH * _imageH) / 2,
//                        x           : this.options.startPosX + (i * this.options.spacing),// fixed position for testing
//                        y           : this.options.startPosX + (i * this.options.spacing),//
                        x           : Math.random() * this.canvW,//this.options.startPosX + (i * this.options.spacing),// fixed position for testing
                        y           : Math.random() * this.canvH,//this.options.startPosX + (i * this.options.spacing),//
                        vx          : ( (Math.round(Math.random() + 1) - 1) === 1)? 1 : -1,
                        vy          : ( (Math.round(Math.random() + 1) - 1) === 1)? 1 : -1,
                        cAngleX     : 0.01,
                        cAngleY     : 0.99
                    };

                    _images.push(imageObj);
                }

//                if(window.console && console.log){
//                    console.log('### waves1::createImages:: _images.length=',_images.length);
//                }
            };

            that.checkForCollision = function(){

                var i, j, img0, img1, dx, dy, dist, minDist, angle, tx, ty, ax, ay, spring = 0.05;

                for(i = 0; i < this.binSize - 1; i++){

                    img0 = _images[i];

                    for(j = i + 1; j < this.binSize; j++){

                        img1 = _images[j];

                        dx = img1.x - img0.x;
                        dy = img1.y - img0.y;
                        dist = Math.sqrt(dx * dx + dy * dy);
                        minDist = img0.radius + img1.radius;

                        if(dist <= minDist){

                            angle = Math.atan2(dy, dx);
                            tx = img0.x + dx / dist * minDist;
                            ty = img0.y + dy / dist * minDist;
                            ax = (tx - img1.x) * spring;
                            ay = (ty - img1.y) * spring;
                            img0.vx -= ax;
                            img0.vy -= ay;
                            img1.vx += ax;
                            img1.vy += ay;
                        }
                    }
                }
            };

            that.move = function(img){

                var bounce = -1, rad = 0;

                img.x += img.vx;
                img.y += img.vy;


                if(img.x + rad > this.canvW){
                    img.x = this.canvW - rad;
                    img.vx *= bounce;
                }
                else if(img.x - rad < 0){
                    img.x = rad;
                    img.vx *= bounce;
                }
                if(img.y + rad > this.canvH){
                    img.y = this.canvH - rad;
                    img.vy *= bounce;
                }
                else if(img.y - rad < 0){
                    img.y = rad;
                    img.vy *= bounce;
                }
            };

            return that;
        }

        return analyser;
    });