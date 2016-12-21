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
                numFrequencies : 1024,
                batchModulo : 4,
                canvasFillAlpha : 0.2,

                // DRAW OPTIONS

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
                linkWidthToAmplitude : false,
                maxLineWidth: 20
            }

            var row, oldX, oldY, newX, newY;

            var that = baseCode(defaultOptions);

            var __super = objectSuper(that);

            that.init = function(pVizType){

                var inited = __super.init(pVizType);

                row = 0;// this.centerY

                return inited;
            };

            /////////// OVERRIDEABLE FUNCTIONS FOR SUBCLASSES TO CHANGE CORE FUNCTIONALITY /////////////

            that.createFrequencyDataTypedArray = function(){

                this.soundData = new Uint8Array(this.analyserNode.frequencyBinCount);
            };

            that.getFrequencyData = function(){

                this.analyserNode.getByteTimeDomainData(this.soundData);
            };

            that.preLoopAction = function(){

                // reset the canvas, with a reduced alpha to leave traces of the last draw
                __super.preLoopAction();

                oldX = 0;
            }

//            that.loop = function(pNumSamples){
//
//                Utils.loopOverBins(pNumSamples, this.binSize, this.soundData, this.draw, this);
//            };

            that.postLoopAction = function(){

//                row -= 1;
//
//                if(row < -(this.canvH / 2)){
//                    row = this.canvH / 2;
//                }
            }

            //--- end OVERRIDEABLE FUNCTIONS FOR SUBCLASSES TO CHANGE CORE FUNCTIONALITY -------------


            that.draw = function(pFreqIndex, pAmplitude, pNumSamples, i){

//              if(window.console && console.log){
//                  console.log('### localAudioVisualiser_songDna_5_batch::draw:: pFreqIndex=',pFreqIndex,' pAmplitude=',pAmplitude);
//              }

                // normalise the amplitude within the possible range
                var ampNorm = Utils.normalize(pAmplitude, 0, 255); // re. getByteFrequencyData
//                if(ampNorm === 0){
//                  return false
//                }

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

                var strokeStyle = this.options.strokeStyle
                this.canvCtx.strokeStyle = 'rgba(' + strokeStyle[0] + ','  + strokeStyle[1] + ',' + strokeStyle[2] + ',' + alpha + ')';


                // DRAW BARS
                this.canvCtx.lineWidth = this.options.lineWidth;
                if(this.options.linkWidthToAmplitude){

                    this.canvCtx.lineWidth = Math.floor(Utils.lerp(ampNorm, 0, this.options.maxLineWidth));
                }


                var multiplier = this.options.ampMultiplier;

                // centralises - min amp drawn at y = 500, max amp drawn at 0
//                var height = this.canvH * ampNorm;
//                var offset = this.canvH - height - 1;
//                newY = offset;
                //


                var range = 256 * multiplier;
                var halfRange = range/2;
                var offset = Utils.lerp(ampNorm, -halfRange, halfRange);
                newY = (this.centerY + row) - offset

//                if(window.console && console.log){
//                    console.log('### wave::draw:: pAmplitude=',pAmplitude, ' halfRange=',halfRange, 'offset = ',offset, ' newY=',newY);
//                }


                // draw lines
                newX = pFreqIndex;

                this.canvCtx.beginPath();
                this.canvCtx.moveTo(oldX, (pFreqIndex === 0)? newY : oldY);
                this.canvCtx.lineTo(newX, newY);
                this.canvCtx.stroke()

                oldX = newX;
                oldY = newY;

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

            return that;
        }

        return analyser;
    });