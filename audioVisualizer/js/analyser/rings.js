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
                smoothingTimeConstant : 0.8,

                numFrequencies : 512,
                batchModulo : 1,

                boostAmp : false,
                boostAmpDivider : 5, // lower = bigger circles

                mapFreqToColor : true,
                brightColors : false,

                canvasFillAlpha : 0.3, // 0.1 good for original circles effect

                linkAlphaToAmplitude : false,
                invertAlpha : false,

                // specific
                numElements : 60,
                linkWidthToAmplitude : true,
                maxLineWidth: 10
            }

            var posX = null;

            var that = baseCode(defaultOptions);

            var __super = objectSuper(that);

            that.init = function(pVizType){

                var canvas = document.getElementById('canvas');
                // higher heights have a negative impact on performance e.g. a height of 800px means a CPU usage of 70%+
                // 500px means a CPU usage of around 50%
                canvas.height = 500;

               return  __super.init(pVizType);
            };

            /////////// OVERRIDEABLE FUNCTIONS FOR SUBCLASSES TO CHANGE CORE FUNCTIONALITY /////////////

            that.createFrequencyDataTypedArray = function(){

                this.soundData = new Uint8Array(this.analyserNode.frequencyBinCount);
            };

            that.getFrequencyData = function(){

                this.analyserNode.getByteFrequencyData(this.soundData);
            };

            that.preLoopAction = function(){

                posX = 0;

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

                ////////////// SET COLOR /////////////////

                var strokeStyle = this.options.strokeStyle
                this.canvCtx.strokeStyle = 'rgba(' + strokeStyle[0] + ','  + strokeStyle[1] + ',' + strokeStyle[2] + ',' + alpha + ')';

                if(this.options.mapFreqToColor){

                    // normalise the frequency within the full frequency range (0 - 511)
                    var freqNorm = Utils.normalize(pFreqIndex, 0, pNumSamples - 1);

                    // hue
                    var hue = Math.floor(Utils.lerp(freqNorm, 0, 360));

                    // saturation & brightnesss
                    var sat = Math.floor(Utils.lerp(ampNorm, 40, 100));// rings = 75 TODO make 2nd param an option?
                    var bright = Math.floor(Utils.lerp(ampNorm, 50, 100));//

                    var rgb = Utils.hsvToRGB([hue, sat, bright]);
                    var rgbBright = Utils.hsvToRGB([hue, 100, 100]);

                    var chosenRGB = rgb;

                    if(this.options.brightColors){

                        chosenRGB = rgbBright;
                    }

                    this.canvCtx.strokeStyle = 'rgba(' + chosenRGB[0] + ','  + chosenRGB[1] + ',' + chosenRGB[2] + ',' + alpha + ')';
                }


                // DRAW EACH RING
                var stroke = this.options.lineWidth;

                if(this.options.linkWidthToAmplitude){

                    stroke = Math.floor(Utils.lerp(ampNorm, 0, this.options.maxLineWidth));
                }

                // Use math.log to boost size - the larger the amplitude the bigger the boost
                // Values 1 - 255 will give results 0 - 2.4065
//                if(this.options.boostAmp){
//
//                    var log =  Math.log10(pAmplitude / this.options.boostAmpDivider);
//                    if(log > 1){
//                        stroke *= log;
//                    }
//                }

                this.canvCtx.lineWidth = stroke;

                var multiplier = this.options.ampMultiplier;

                // Create start & angles for the arc...

                // Stagger start point - gives value between -0.5 & 0.5 (equiv to ±30 degrees)
                var startAngle = Math.sin(pFreqIndex) * 0.5;

                // Extend startAngle round to a maximum of 360 degrees, based on amplitude
                var angle = Utils.lerp(ampNorm, 0, Math.PI * 2);
                angle += startAngle;

                // Start every other arc 180 degrees further on
                var dir = (i%2 === 0)? true : false;
                if(dir){
                    startAngle += Math.PI;
                    angle += Math.PI;
                }


                // How far from the centre the arc is drawn depends on its frequency
                var radius = 10  + (pFreqIndex  * multiplier);


                // Draw each arc
                this.canvCtx.beginPath();
                this.canvCtx.arc(this.centerX, this.centerY, radius + posX, startAngle, angle, false);
                this.canvCtx.stroke();

                // take into account the previous stroke width so the next arc doesn't overlap this one
                posX += stroke;

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

//            that.init();

            return that;
        }

        return analyser;
    });