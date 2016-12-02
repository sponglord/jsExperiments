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

                // general
                numFrequencies : 512,
                batchModulo : 1,

                ampMultiplier : 1,
                boostAmp : false,
                boostAmpDivider : 5,

                mapFreqToColor : true,
                brightColors : false,

                lineWidth : 1,

                linkAlphaToAmplitude : true,
                invertAlpha : true,

                // specific

                numElements : 30,// number of 'arms the star has

                // if true renders one 'star' for every frequency, overlaying them to create a pulsing star effect
                // else renders one 'star' with each arm representing one frequency
                showStarForEachFreq : true,

                linkWidthToAmplitude : true,
                maxLineWidth: 20,
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
//                for(var i = 0; i < 255; i++){
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


                // DRAW STAR(S)
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
                }

                var barHeight = pAmplitude * multiplier;


                if(this.options.showStarForEachFreq){

                    for(var i = 0; i < this.options.numElements; i++){

                        this.renderStar(barHeight, i);
                    }

                }else{

                    this.renderStar(barHeight, pBinNum);
                }

                return true;
            }

            that.renderStar = function(pBarHeight, pBinNum){

                posX = this.centerX;
                posY = this.centerY;

                var posX2, posY2, a, o, A;

                var startAngle = storedAngles[pBinNum];

                if(startAngle <= Math.PI / 2){ // 0 - 90

                    A = startAngle;

                    o = Math.sin(A) * pBarHeight;
                    a = Math.cos(A) * pBarHeight;

                    posX2 = posX + o;
                    posY2 = posY - a;

                }else if(startAngle > Math.PI / 2 && startAngle <= Math.PI){ // 91 - 180

                    A = Math.PI - startAngle;
                    o = Math.sin(A) * pBarHeight;
                    a = Math.cos(A) * pBarHeight;

                    posX2 = posX + o;
                    posY2 = posY + a;

                }else if(startAngle > Math.PI && startAngle <= ((Math.PI * 3) / 2)){// 181 - 270

                    A = startAngle - Math.PI;
                    o = Math.sin(A) * pBarHeight;
                    a = Math.cos(A) * pBarHeight;

                    posX2 = posX - o;
                    posY2 = posY + a ;

                }else{ // 271 - 360

                    A = (Math.PI * 2) - startAngle;
                    o = Math.sin(A) * pBarHeight;
                    a = Math.cos(A) * pBarHeight;

                    posX2 = posX - o;
                    posY2 = posY - a;
                }


                this.canvCtx.beginPath();
                this.canvCtx.moveTo(posX, posY);
                this.canvCtx.lineTo(posX2, posY2 );
                this.canvCtx.stroke();
            }

            that.optionChange = function(pOpt, pVal){

                __super.optionChange(pOpt, pVal);

                switch(pOpt){

                    case 'numElements':

                        this.binSize = this.options.numElements = pVal;

                        var angle = (Math.PI * 2 ) / this.binSize;

                        for(var i = 0; i < this.binSize; i++){
                            storedAngles[i] = angle * i;
                        }

                        break;
                }
            };

            return that;
        }

        return analyser;
    });