/* global define, console, require*/
define(
    [
        'utils/ObjectSuper',
        'analyser/baseCode',
        'utils/utils2'
    ],
    function(objectSuper,
             baseCode,
             Utils
    ){

        "use strict";

        function analyser(){

            var defaultOptions = {

                // GENERAL
                numFrequencies : 512,
                batchModulo : 1,

                ampMultiplier : 0.5,
                boostAmp : false,
                boostAmpDivider : 5,

                mapFreqToColor : true,
                brightColors : true,

                lineWidth : 3,
                canvasFillAlpha : 0.25, //.25 for others, 0.1 for 'lines'
                strokeStyle: [255, 255, 255],

                linkAlphaToAmplitude : true,
                invertAlpha : true,

                // SPECIFIC

                // Number of 'ticks' around the circle
                //
                // NOTE: if this value doesn't 'play well' with the numFrequencies value then you may never
                // see bars with colours representing the upper end  of the frequency range.
                // Example: numFrequencies = 512, numElements = 180:
                // When averaging frequencies across bins (default fny) then binSize = Math.floor(512 / 180) = 2
                // 2 * 180 = 360 i.e we will only be visiting frequencies up to index 360 (even though we have 512 to inspect)
                numElements : 160,
                radius : 200, // radius of the initial circle, the point on the circumference is the centre of the tick bar
                counterClockwise : false, // which way round to draw the ticks - starting at 'midnight'

                linkWidthToAmplitude : false,
                maxLineWidth: 20

            }

            var posX = null;
            var posY = null;

            var storedAngles = [];

            var that = baseCode(defaultOptions);

            var __super = objectSuper(that);

            that.init = function(pVizType){

                __super.init(pVizType);

//                for(var i = 0; i < 1; i+=0.1){
//                    if(window.console && console.log){
//                        console.log('### bars::init:: log ',i, '=',Math.log10(i));
//                    }
//                }
//                for(var i = 0; i < 256; i++){
//                    if(window.console && console.log){
//                        console.log('### bars::init:: log ',i, '=',Math.log10(i));
//                    }
//                }
            };

            that.setUp = function(pArrayBuffer){

                __super.setUp(pArrayBuffer);

                this.binSize = this.options.numElements;

                var angle = (Math.PI * 2 ) / this.binSize;

                for(var i = 0; i < this.binSize; i++){
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
//                  console.log('### localAudioVisualiser_songDna_5_batch::draw:: pFreqIndex=',pFreqIndex,' pAmplitude=',pAmplitude, ' pNumSamples=',pNumSamples, 'pBinNum=',pBinNum);
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

                    var chosenRGB = rgb;

                    if(this.options.brightColors){

                        chosenRGB = rgbBright;
                    }

                    this.canvCtx.strokeStyle = 'rgba(' + chosenRGB[0] + ','  + chosenRGB[1] + ',' + chosenRGB[2] + ',' + alpha + ')';
                }



                // DRAW BARS
                this.canvCtx.lineWidth = this.options.lineWidth;

                if(this.options.linkWidthToAmplitude){

                    this.canvCtx.lineWidth = Math.floor(Utils.lerp(ampNorm, 0, this.options.maxLineWidth));
                }

                var multiplier = this.options.ampMultiplier;

                // Use math.log to boost size - the larger the amplitude the bigger the boost
                // Values 1 - 255 will give results 0 - 2.4065
                if(this.options.boostAmp){

                    var log =  Math.log10(pAmplitude / this.options.boostAmpDivider);
                    multiplier = (log > 0 && log > this.options.ampMultiplier)? log : this.options.ampMultiplier

//                    if(window.console && console.log){
//                        console.log('### barLoop::draw:: pAmplitude=',pAmplitude, 'this.options.ampMultiplier=',this.options.ampMultiplier, 'rawLog=', Math.log10(pAmplitude), 'log=',log);
//                    }
                }


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

            that.optionChange = function(pOpt, pVal){

                __super.optionChange(pOpt, pVal);

                switch(pOpt){

                    case 'numElements':

                        this.binSize = this.options.numElements = pVal;

                        var angle = (Math.PI * 2 ) / this.binSize;

                        storedAngles = [];

                        for(var i = 0; i < this.binSize; i++){
                            storedAngles[i] = angle * i;
                        }

                        if(this.options.counterClockwise){
                            storedAngles.reverse();
                        }

                        break;

                    case 'radius':

                        this.options.radius = pVal;
                            break;

                    case 'counterClockwise':

                        this.options.counterClockwise = pVal;
                        storedAngles.reverse();

                        break;
                }

            };

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