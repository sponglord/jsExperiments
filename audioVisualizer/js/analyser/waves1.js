/* global define, console, require*/
define(
    [
        'utils/ObjectSuper',
        'avBase',
        'utils/utils2'
    ],
    function(objectSuper,
             baseCode,
             Utils
    ){

        "use strict";

        function analyser(){

            var defaultOptions = {

                // general
                numFrequencies : 512,
                batchModulo : 1,

                startPosX : 0,
                spacing : 20,
                canvasFillAlpha : 0.06,

                // DRAW OPTIONS

                ampMultiplier : 0.2,
                boostAmp : false,
                boostAmpDivider : 5,

                mapFreqToColor : true,
                brightColors : true,

                lineWidth : 1,
                strokeStyle: [255, 255, 255],

                linkAlphaToAmplitude : true,
                invertAlpha : true,

                // specific
                linkWidthToAmplitude : false,
                maxLineWidth: 20
            }

            var _imageW = 30, _imageH = 30, _images = [];

            var that = baseCode(defaultOptions);

            var __super = objectSuper(that);

            that.init = function(pVizType){

                var canvas = document.getElementById('canvas');
                canvas.width = 500
                canvas.height = 500

                var init = __super.init(pVizType);

                this.createImages();

                return init
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
                var alpha = 0.2;

//                if(this.options.linkAlphaToAmplitude){
//
//                    // link alpha to amplitude: strongest signal = 1, weakest = 0.1
//                    alpha = Utils.lerp(ampNorm, 0.1, 1);
//
//                    if(this.options.invertAlpha){
//
//                        // link alpha to amplitude, but invert: strongest signal = 0.1, weakest = 1
//                        alpha = 1.1 - alpha;
//                    }
//                }

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
                }


                var heads = i%2;

                var img0 = _images[i];

                // Give node velocity based on amplitude
                var vel = Utils.lerp(ampNorm, 0, 3);

                // if node was already moving in a particular direction - keep it moving that way.
                img0.vx = (img0.vx >= 0)? vel : -vel;
                img0.vy = (img0.vy >= 0)? vel : -vel;


                // test: draw circle coloured by frequency
//                this.canvCtx.strokeStyle = 'rgba(' + chosenRGB[0] + ','  + chosenRGB[1] + ',' + chosenRGB[2] + ',' + alpha + ')';;
                var rad = Utils.lerp(ampNorm, 1, 5)
                this.canvCtx.lineWidth = 1;//rad;
                this.canvCtx.beginPath();
                this.canvCtx.arc(img0.x, img0.y, rad, 0, Math.PI * 2, false);
                this.canvCtx.stroke();


                //--


//                var multiplier = this.options.ampMultiplier;
//
//                // Use math.log to boost size - the larger the amplitude the bigger the boost
//                // Values 1 - 255 will give results 0 - 2.4065
//                if(this.options.boostAmp){
//
//                    var log =  Math.log10(pAmplitude / this.options.boostAmpDivider);
//                    multiplier = (log > 0 && log > this.options.ampMultiplier)? log : this.options.ampMultiplier
//                }

                // ARCS
                //var i, img0;
                var j, img1, dx, dy, dist, max = 100, c1ax, c1ay, c2ax, c2ay, c1x, c1y, c2x, c2y, oscFactor = 2, angleIncr = 0.05;

                angleIncr = Utils.lerp(ampNorm, 0.05, 1);

//                for(i = 0; i < this.binSize - 1; i++){
                if(i < this.binSize - 1){

//                    img0 = _images[i];

                    for(j = i + 1; j < this.binSize; j++){

                        img1 = _images[j];

                        dx = img0.x - img1.x;
                        dy = img0.y - img1.y;

                        dist = Math.sqrt(dx * dx + dy * dy);

                        if(dist < max){

//                            this.canvCtx.strokeStyle = 'rgba(' + strokeStyle[0] + ','  + strokeStyle[1] + ',' + strokeStyle[2] + ',' + alpha + ')';

                            this.canvCtx.lineWidth = 1.0 - dist / max;

                            this.canvCtx.beginPath();
                            this.canvCtx.moveTo(img0.x, img0.y);


//  						        this.canvCtx.quadraticCurveTo(img1.x + dx, img0.y - dy, img1.x, img1.y);

                            c1ax = Math.sin(img0.cAngleX) * dx / oscFactor;
                            c1ay = Math.sin(img0.cAngleY) * dy / oscFactor;

                            c2ax = Math.sin(img1.cAngleX) * dx / oscFactor;
                            c2ay = Math.sin(img1.cAngleY) * dy / oscFactor;

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

//            that.optionChange = function(pOpt, pVal){
//
//                __super.optionChange(pOpt, pVal);
//
//                switch(pOpt){
//
//                    case 'numElements':
//
//                        this.binSize = this.options.numElements = pVal;
//
//                        break
//                }
//            };

            that.createImages = function(){

                var i, imageObj;

                for(i = 0; i < this.binSize; i++){

                    imageObj = {
                        width       : _imageW,
                        height      : _imageH,
                        radius      : Math.sqrt(_imageW * _imageW + _imageH * _imageH) / 2,
                        x           : Math.random() * this.canvW,
                        y           : Math.random() * this.canvH,
                        vx          : 1,//Math.random() * 6 - 3,
                        vy          : 1,//Math.random() * 6 - 3,
//                        column      : -1,
//                        row         : -1,
//                        targetX     : -1,
//                        targetY     : -1,
//                        inCollision : false,
//                        inPlace     : false,
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

//                    img0.inCollision = false;

                    for(j = i + 1; j < this.binSize; j++){

                        img1 = _images[j];

//                        img1.inCollision = false;

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
//
//                            img0.inCollision = true;
//                            img1.inCollision = true;
                        }
                        else{
//                            img1.inCollision = false;
                        }
                    }
                }
            };

            that.move = function(img){

                var bounce = -1, rad;

                img.x += img.vx;
                img.y += img.vy;

                rad = 0;

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