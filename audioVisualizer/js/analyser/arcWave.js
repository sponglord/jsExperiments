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
                batchModulo : 10,

                startPosX : 60,
                spacing : 60,
                canvasFillAlpha : 0.5,

                // DRAW OPTIONS

                ampMultiplier : 0.2,
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

            var posX, storedStartAngle, lastRadius;

            var that = baseCode(defaultOptions);

            var __super = objectSuper(that);

            that.init = function(pVizType){

                return __super.init(pVizType);
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

                posX = this.options.startPosX;

                storedStartAngle = Math.PI;
                lastRadius = 0;
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

                    this.canvCtx.strokeStyle = 'rgba(' + chosenRGB[0] + ','  + chosenRGB[1] + ',' + chosenRGB[2] + ',' + alpha + ')';;
                }


                var multiplier = this.options.ampMultiplier;

                // Use math.log to boost size - the larger the amplitude the bigger the boost
                // Values 1 - 255 will give results 0 - 2.4065
                if(this.options.boostAmp){

                    var log =  Math.log10(pAmplitude / this.options.boostAmpDivider);
                    multiplier = (log > 0 && log > this.options.ampMultiplier)? log : this.options.ampMultiplier
                }

                // ARCS

                this.canvCtx.lineWidth = 1;

//                if(this.batchCount % 100 === 0){
//                    this.canvCtx.strokeStyle = 'rgba(' + 0 + ','  + 0 + ',' + 0 + ',' + 0.5 + ')';// 0.5 -- 1
//                }

                var heads = i%2;//Math.round(Utils.randomNumberInRange(0, 1));

                // Start anywhere on a circle
                var randAngle = storedStartAngle;//(heads === 0)? Utils.randomNumberInRange(0, Math.PI) : Utils.randomNumberInRange(Math.PI, Math.PI * 2);


                var endRads = (210 * Math.PI) / 180;// 120 degs = (Math.PI * 2)/3, 270 degs = (Math.PI * 3) / 2

                // Go from that point to a max of endRads degrees depending on amplitude
                var endAngle = (heads === 0)? randAngle + Utils.lerp(ampNorm, 0, endRads) : randAngle - Utils.lerp(ampNorm, 0, endRads);


                var numSegments = Utils.lerp(ampNorm, 3, 8); // 5

                var arcSize = (endAngle - randAngle) / numSegments;


                var posY = this.centerY;//Utils.randomIntInRange(30, canvH - 30);


                // Draw each arc
                var arcStart = randAngle, arcEnd = 0;

//                this.canvCtx.beginPath();
////                this.canvCtx.arc(posX, posY, pAmplitude * multiplier, arcStart, endAngle, false);// CW
//                this.canvCtx.arc(posX, posY, pAmplitude * multiplier, arcStart,  endAngle, true);// CCW
//                this.canvCtx.stroke();


                for(var i = 0; i < numSegments; i++){

                    arcEnd = arcStart + arcSize;

                    this.canvCtx.beginPath();

                    if(heads === 0){

                        this.canvCtx.lineWidth = numSegments - i; // fat to thin
                        this.canvCtx.arc(posX, posY, pAmplitude * multiplier, arcStart, arcEnd, false);// CW

                    }else{

                        this.canvCtx.lineWidth = i; // thin to fat
                        this.canvCtx.arc(posX, posY, pAmplitude * multiplier, arcStart, arcEnd, true);// CCW
                    }


                    this.canvCtx.stroke();

                    arcStart = arcEnd;
                }



//                var wobble = NN.utils.randomIntInRange(-wobbleAmt, wobbleAmt);
//                posX += this.options.spacing;

                posX += lastRadius + (pAmplitude * multiplier);

                storedStartAngle = endAngle - Math.PI;
                lastRadius = pAmplitude * multiplier;

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