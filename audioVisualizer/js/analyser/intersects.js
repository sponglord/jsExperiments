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

        /**
         * Through the use of options can now represent the effects previously contained in the files:
         *  - intersects
         *  - lines (now with option to clipLines)
         *  - intersectsLines (now with option to clipLines)
         *  - intersectsLinesColor (now with option to clipLines)
         */
        function analyser(){

            // Private vars
            var defaultOptions = {

                // general
                numFrequencies : 512,
                batchModulo : 1,

                spacing : 40, // 40 for others, 20 for 'lines'

                mapFreqToColor : true,

                canvasFillAlpha : 0.25, //.25 for others, 0.1 for 'lines'
                fillStyle: [255, 255, 255],
                strokeStyle: [255, 255, 255],

                linkAlphaToAmplitude : true,
                invertAlpha : true,

                // specific
                drawCircles : true, // if false & drawLines is true makes the effect formerly known as: lines
                intersectRadius : 10, // disregarded if drawCircles is false
                doIntersectFill : true, // disregarded if drawCircles is false
                doIntersectStroke : false, // disregarded if drawCircles is false

                drawLines : true, // if true makes the effect formerly known as: intersectsLines (needs fillStyle...0.1 & spacing:20)
                clipLines : true, // true = draw from edges of intersect circles not from centers ('dumbbell' effect)

            }

            var lastCircle = null;
            var posX = null;
            //--

            var that = baseCode(defaultOptions);

            var __super = objectSuper(that);

            that.init = function(pVizType){

                __super.init(pVizType);
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
                lastCircle = null;

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
                var ampNorm = Utils.normalize(pAmplitude, 0, 255);
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

                var fillStyle = this.options.fillStyle
                this.canvCtx.fillStyle = 'rgba(' + fillStyle[0] + ','  + fillStyle[1] + ',' + fillStyle[2] + ',' + alpha + ')';

                var strokeStyle = this.options.strokeStyle
                this.canvCtx.strokeStyle = 'rgba(' + strokeStyle[0] + ','  + strokeStyle[1] + ',' + strokeStyle[2] + ',' + alpha + ')';

                var rgb = strokeStyle;

                if(this.options.mapFreqToColor){

                    // normalise the frequency within the full frequency range (0 - 511)
                    var freqNorm = Utils.normalize(pFreqIndex, 0, pNumSamples - 1);

                    // hue
                    var hue = Math.floor(Utils.lerp(freqNorm, 0, 360));

                    // saturation & brightnesss
                    var sat = Math.floor(Utils.lerp(ampNorm, 40, 100));// TODO make 2nd param an option?
                    var bright = Math.floor(Utils.lerp(ampNorm, 50, 100));

                    rgb = Utils.hsvToRGB([hue, sat, bright]);
                    var rgbBright = Utils.hsvToRGB([hue, 100, 100]);

                    this.canvCtx.fillStyle = 'rgba(' + rgbBright[0] + ','  + rgbBright[1] + ',' + rgbBright[2] + ',' + alpha + ')';

                    this.canvCtx.strokeStyle = 'rgba(' + rgbBright[0] + ','  + rgbBright[1] + ',' + rgbBright[2] + ',' + alpha + ')';;
                }


                if(lastCircle){

                    var multiplier = this.options.ampMultiplier;

                    // Use math.log to boost size - the larger the amplitude the bigger the boost
                    // Values 1 - 255 will give results 0 - 2.4065
                    if(this.options.boostAmp){

                        var log =  Math.log10(pAmplitude / this.options.boostAmpDivider);
                        multiplier = (log > 0 && log > this.options.ampMultiplier)? log : this.options.ampMultiplier
                    }

                    var intersect = Utils.circleIntersection(posX, this.canvH/2, pAmplitude * this.options.ampMultiplier, lastCircle[0], lastCircle[1], lastCircle[2]);

                    if(intersect){

                        if(this.options.drawCircles){

                            this.canvCtx.beginPath();
                            this.canvCtx.arc(intersect[0], intersect[1], this.options.intersectRadius, 0, Math.PI * 2, false);


                            // Intersect circles are drawn at max. sat & bright
                            if(this.options.doIntersectFill){

                                this.canvCtx.fill();
                            }

                            if(this.options.doIntersectStroke){

                                this.canvCtx.stroke();
                            }
                        }


                        if(intersect.length > 2){

                            if(this.options.drawCircles){

                                this.canvCtx.beginPath();
                                this.canvCtx.arc(intersect[2], intersect[3], this.options.intersectRadius, 0, Math.PI * 2, false);

                                if(this.options.doIntersectStroke){
                                    this.canvCtx.stroke();
                                }

                                if(this.options.doIntersectFill){
                                    this.canvCtx.fill();
                                }
                            }

                            if(this.options.drawLines){

                                // Line sat & bright is linked to amplitude
                                this.canvCtx.strokeStyle = 'rgba(' + rgb[0] + ','  + rgb[1] + ',' + rgb[2] + ',' + alpha + ')';;

                                var lineLengthAdjust = (!this.options.clipLines)? 0 : this.options.intersectRadius;

                                // Draw line
                                this.canvCtx.beginPath();
                                this.canvCtx.moveTo(intersect[0], intersect[1] - lineLengthAdjust);
                                this.canvCtx.lineTo(intersect[2], intersect[3] + lineLengthAdjust);
                                this.canvCtx.stroke();
                            }

                        }

                    }
                }

                lastCircle = [posX, this.canvH/2, pAmplitude * this.options.ampMultiplier];

                posX += this.options.spacing;

                return true;
            }

            return that;
        }

        return analyser;
    });