/* global define, console, require*/
define(
    [
        'utils/ObjectSuper',
        'analyser/baseCode',
        'utils/utils2',
    ],
    function(objectSuper,
             baseCode,
             Utils
    ){

        "use strict";

        function analyser(){

            var defaultOptions = {
                batchModulo : 1,
                samplesMultiplier : 0.75,
                canvasFillStyle : 'rgba(0, 0, 0, 0.25)', //.25 for others, 0.1 for 'lines'

                // DRAW OPTIONS
                sizeMultiplier : 0.25,

                numBars : 180, // number of 'ticks' around the circle
                radius : 200, // radius of the initial circle, the point on the circumference is the centre of the tick bar
                counterClockwise : false, // which wat round to draw the ticks

                lineWidth : 3,
                linkWidthToAmplitude : false,
                maxLineWidth: 20,

                strokeStyle: [255, 255, 255],
                inColor : true,
                brightColors : true,

                linkAlphaToAmplitude : true,
                invertAlpha : true,

                logAmpDivider : 5
            }

            var posX = null;
            var posY = null;

            var storedAngles = [];

            var that = baseCode(defaultOptions);

            var __super = objectSuper(that);

            that.init = function(){

                __super.init();

//                for(var i = 0; i < 1; i+=0.1){
//                    if(window.console && console.log){
//                        console.log('### bars::init:: log ',i, '=',Math.log10(i));
//                    }
//                }
//                for(var i = 0; i < 255; i++){
//                    if(window.console && console.log){
//                        console.log('### bars::init:: log ',i, '=',Math.log10(i));
//                    }
//                }
            };

            that.setUp = function(pArrayBuffer){

                __super.setUp(pArrayBuffer);

                this.numDisks = this.binSize = this.options.numBars;

                var angle = (Math.PI * 2 ) / this.numDisks;

                for(var i = 0; i < this.numDisks; i++){
                    storedAngles[i] = angle * i;
                }

                if(this.options.counterClockwise){

                    storedAngles.reverse();
                }
            };

            /////////// OVERRIDEABLE FUNCTIONS FOR SUBCLASSES TO CHANGE CORE FUNCTIONALITY /////////////

            that.createFrequencyDataTypedArray = function(){

                this.soundData = new Uint8Array(this.analyserNode.frequencyBinCount);
            };

            that.getFrequencyData = function(){

                this.analyserNode.getByteFrequencyData(this.soundData);
            };

            that.preLoopAction = function(){

                posX = this.options.startPosX;

                // reset the canvas, with a reduced alpha to leave traces of the last draw
                __super.preLoopAction();
            }

            that.loop = function(pNumSamples){

                Utils.loopOverBins(pNumSamples, this.binSize, this.soundData, this.draw, this);
            };

            that.postLoopAction = function(){}

            //--- end OVERRIDEABLE FUNCTIONS FOR SUBCLASSES TO CHANGE CORE FUNCTIONALITY -------------


            that.draw = function(pFreqIndex, pAmplitude, pNumSamples, pBinNum){

//              if(window.console && console.log){
//                  console.log('### localAudioVisualiser_songDna_5_batch::draw:: pFreqIndex=',pFreqIndex,' pAmplitude=',pAmplitude, ' pNumSamples=',pNumSamples, 'i=',i);
//              }


                // normalise the amplitude within the possible range
                var ampNorm = Utils.normalize(pAmplitude, 0, 255); // re. getByteFrequencyData
                if(ampNorm === 0){
                  return false
                }

                //-------------------------------------------------------------------------------

                /////////////// SET ALPHA /////////////////
                var alpha = 1;

                if(this.options.linkAlphaToAmplitude){

                    // link alpha to amplitude: strongest signal = 1, weakest = 0.1
                    alpha = Utils.lerp(ampNorm, 0.1, 1);

                    if(this.options.invertAlpha){

                        // link alpha to amplitude, but invert: strongest signal = 0.1, weakest = 1
                        alpha = 1.1 - alpha;
                    }
                }

                /////////////// SET COLOR /////////////////

//                this.canvCtx.fillStyle = this.options.fillStyle;
                var strokeStyle = this.options.strokeStyle
                this.canvCtx.strokeStyle = 'rgba(' + strokeStyle[0] + ','  + strokeStyle[1] + ',' + strokeStyle[2] + ',' + alpha + ')';

                if(this.options.inColor){

                    // normalise the frequency within the full frequency range (0 - 511)
                    var freqNorm = Utils.normalize(pFreqIndex, 0, pNumSamples - 1);

                    // hue
                    var hue = Math.floor(Utils.lerp(freqNorm, 0, 360));

                    // saturation & brightnesss
                    var sat = Math.floor(Utils.lerp(ampNorm, 40, 100));// TODO make 2nd param an option?
                    var bright = Math.floor(Utils.lerp(ampNorm, 50, 100));

                    var rgb = Utils.hsvToRGB([hue, sat, bright]);
                    var rgbBright = Utils.hsvToRGB([hue, 100, 100]);

                    var chosenRGB = rgb;

                    if(this.options.brightColors){

                        chosenRGB = rgbBright;
                    }

                    this.canvCtx.strokeStyle = 'rgba(' + chosenRGB[0] + ','  + chosenRGB[1] + ',' + chosenRGB[2] + ',' + alpha + ')';
                }


                // DRAW STAR(S)
                if(this.options.linkWidthToAmplitude){

                    this.canvCtx.lineWidth = Math.floor(Utils.lerp(ampNorm, 0, this.options.maxLineWidth));
                }

                var log =  Math.log10(pAmplitude / this.options.logAmpDivider);// Use math.log to boost size - the larger the amplitude the bigger the boost
                var multiplier = (log > 0 && log > this.options.sizeMultiplier)? log : this.options.sizeMultiplier
//                multiplier = this.options.sizeMultiplier;

                var barHeight = pAmplitude * multiplier;

                this.renderBars(barHeight, pBinNum);

                return true;
            }

            that.renderBars = function(pBarHeight, pBinNum){

                posX = this.centerX;
                posY = this.centerY;

                var radius = this.options.radius;
                var r2 = pBarHeight / 2;
                var r3 = r2;
                var posX1, posY1, posX2, posY2, posX3, posY3, a, o, A, A2, A3, B, o2, a2, o3, a3, oppAdj, tickAngles;

                var startAngle = storedAngles[pBinNum];

                if(startAngle <= Math.PI / 2){ // 0 - 90

                    A = startAngle;

                    oppAdj = getOppAdj(A, radius);

                    posX1 = posX + oppAdj[0];
                    posY1 = posY - oppAdj[1];

                    tickAngles = getTickAngles(A);

                    oppAdj = getOppAdj(tickAngles[0], r2);
                    posX2 = posX1 + oppAdj[0];
                    posY2 = posY1 - oppAdj[1];

                    oppAdj = getOppAdj(tickAngles[1], r3);
                    posX3 = posX1 - oppAdj[0];
                    posY3 = posY1 + oppAdj[1];

                }else if(startAngle > Math.PI / 2 && startAngle <= Math.PI){ // 91 - 180

                    A = Math.PI - startAngle;

                    oppAdj = getOppAdj(A, radius);

                    posX1 = posX + oppAdj[0];
                    posY1 = posY + oppAdj[1];

                    tickAngles = getTickAngles(A);

                    oppAdj = getOppAdj(tickAngles[0], r2);
                    posX2 = posX1 + oppAdj[0];
                    posY2 = posY1 + oppAdj[1];

                    oppAdj = getOppAdj(tickAngles[1], r3);
                    posX3 = posX1 - oppAdj[0];
                    posY3 = posY1 - oppAdj[1];

                }else if(startAngle > Math.PI && startAngle <= ((Math.PI * 3) / 2)){// 181 - 270

                    A = startAngle - Math.PI;

                    oppAdj = getOppAdj(A, radius);

                    posX1 = posX - oppAdj[0];
                    posY1 = posY + oppAdj[1];

                    tickAngles = getTickAngles(A);

                    oppAdj = getOppAdj(tickAngles[0], r2);
                    posX2 = posX1 - oppAdj[0];
                    posY2 = posY1 + oppAdj[1];

                    oppAdj = getOppAdj(tickAngles[1], r3);
                    posX3 = posX1 + oppAdj[0];
                    posY3 = posY1 - oppAdj[1];

                }else{ // 271 - 360

                    A = (Math.PI * 2) - startAngle;

                    oppAdj = getOppAdj(A, radius);

                    posX1 = posX - oppAdj[0];
                    posY1 = posY - oppAdj[1];

                    tickAngles = getTickAngles(A);

                    oppAdj = getOppAdj(tickAngles[0], r2);
                    posX2 = posX1 - oppAdj[0];
                    posY2 = posY1 - oppAdj[1];

                    oppAdj = getOppAdj(tickAngles[1], r3);
                    posX3 = posX1 + oppAdj[0];
                    posY3 = posY1 + oppAdj[1];
                }


                this.canvCtx.beginPath();
                this.canvCtx.moveTo(posX3, posY3);
                this.canvCtx.lineTo(posX2, posY2 );
                this.canvCtx.stroke();
            }

            // Private members
            var getOppAdj = function(pAngle, pRadius){

                var o = Math.sin(pAngle) * pRadius;
                var a = Math.cos(pAngle) * pRadius;

                return [o, a];
            };

            var getTickAngles = function(pAngle){

                var A2 = pAngle;
                var B = (Math.PI / 2) - pAngle;
                var A3 = (Math.PI / 2) - B;

                return [A2, A3];
            };
            //--

            return that;
        }

        return analyser;
    });