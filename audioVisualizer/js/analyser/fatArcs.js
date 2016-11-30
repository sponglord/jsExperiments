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
                batchModulo : 1,
                samplesMultiplier : 0.5
            }

            var posX = null;

            var that = baseCode(defaultOptions);

            var __super = objectSuper(that);

            // pre-generate random start angles
            var storeObj = [];
            for(var i = 0; i < 512; i++){
                storeObj[i] = Utils.randomNumberInRange(0, Math.PI * 2);
            }

            that.init = function(){

                __super.init();
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
//                if(ampNorm === 0){
//                  return false
//                }

                //-------------------------------------------------------------------------------

                // normalise the frequency within the full frequency range (0 - 511)
                var freqNorm = Utils.normalize(pFreqIndex, 0, pNumSamples - 1);

                // hue
                var hue = Math.floor(Utils.lerp(freqNorm, 0, 360));// ex 310??

                // saturation & brightnesss
                var sat = Math.floor(Utils.lerp(ampNorm, 40, 100));
                var bright = Math.floor(Utils.lerp(ampNorm, 50, 100));

                var hex = Utils.hsvToHEX([hue, sat, bright]);

                this.canvCtx.strokeStyle = hex;

                // smaller the amplitude, wider the stroke
                var stroke = Math.floor(Utils.lerp(ampNorm, 0, 30));
                this.canvCtx.lineWidth = 30 - stroke;

                // Selected pre-generated random start angle
                var randAngle = storeObj[pFreqIndex];

                var endAngle = randAngle + Utils.lerp(ampNorm, 0, Math.PI * 2)

                // make radius multiplier between 0.5 & 1 depending on amplitude
                this.options.sizeMultiplier = Utils.lerp(ampNorm, 0.5, 1)

                var heads = Math.round(Utils.randomNumberInRange(0, 1));

                this.canvCtx.beginPath();

                if(heads === 1){

                    this.canvCtx.arc(posX, this.canvH/2, pAmplitude * this.options.sizeMultiplier, endAngle, randAngle, true);

                }else{

                    this.canvCtx.arc(posX, this.canvH/2, pAmplitude * this.options.sizeMultiplier, randAngle, endAngle, false);
                }

                this.canvCtx.stroke();


                posX += this.options.diskWidth;

                return true;
            }

//            that.init();

            return that;
        }

        return analyser;
    });