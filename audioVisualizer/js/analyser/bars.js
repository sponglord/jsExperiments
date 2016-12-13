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
                canvasFillAlpha : 0.25, //.25 for others, 0.1 for 'lines'

                // DRAW OPTIONS
                spacing : 40, // 40 for others, 20 for 'lines'

                ampMultiplier : 1,
                boostAmp : false,
                boostAmpDivider : 5,

                mapFreqToColor : true,
                brightColors : false,

                lineWidth : 1,
                strokeStyle: [255, 255, 255],

                linkAlphaToAmplitude : true,
                invertAlpha : true,

                // specific
                linkWidthToAmplitude : true,
                maxLineWidth: 20
            }

            var posX = null;

            var that = baseCode(defaultOptions);

            var __super = objectSuper(that);

            that.init = function(pVizType){

                return __super.init(pVizType);


//                for(var i = 1; i < 255; i++){
//                    if(window.console && console.log){
//                        console.log('### bars::preLoopAction:: log ',i, '=',Math.log2(i));
//                    }
//                }
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

//                    this.canvCtx.fillStyle = 'rgba(' + chosenRGB[0] + ','  + chosenRGB[1] + ',' + chosenRGB[2] + ',' + alpha + ')';
                    this.canvCtx.strokeStyle = 'rgba(' + chosenRGB[0] + ','  + chosenRGB[1] + ',' + chosenRGB[2] + ',' + alpha + ')';
                }


                // Draw each disk
//                this.canvCtx.lineWidth = 1;
//                this.canvCtx.beginPath();
//                this.canvCtx.arc(posX, this.centerY, pAmplitude * (this.options.sizeMultiplier / 7), 0, Math.PI * 2, false);
//                this.canvCtx.stroke();



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
                }

                var barHeight = pAmplitude * multiplier;


                this.canvCtx.beginPath();
                this.canvCtx.moveTo(posX, this.centerY - (barHeight / 2) );
                this.canvCtx.lineTo(posX, this.centerY + (barHeight / 2) );
                this.canvCtx.stroke();


                posX += this.options.spacing;

                return true;
            }

            that.optionChange = function(pOpt, pVal){

                __super.optionChange(pOpt, pVal);

                switch(pOpt){

                    case 'numElements':

                        this.binSize = this.options.numElements = pVal;

                        break
                }
            };

            return that;
        }

        return analyser;
    });