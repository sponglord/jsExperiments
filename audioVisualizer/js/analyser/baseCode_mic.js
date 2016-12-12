/* global define, console, require*/
define(
    [
        'lodash',
        'utils/utils2',
        'utils/audioUtils2'
    ],
    function(
        _,
        Utils,
        AudioUtils){

        "use strict";

        function baseAnalyser(pOptions){

            var defaultOptions = {

                minDecibels : -90,// defaults to -100
                maxDecibels : -40,// defaults to -30
                smoothingTimeConstant : 0.9,// defaults to 0.8
                fftSize : 2048, // defaults to 2048

                // The number of frequencies we examine from the frequencyBinCount range (=1024)
                // (sometimes the lower part of the frequency range is of most interest)
                numFrequencies : 1024,

                // Number of samples to collect before analyzing data (i.e. triggering the javaScriptNode.onaudioprocess event).
                // Multiplying by one means we are receiving data to analyse 40-50 times a second, whilst multiplying by max value of 16 limits batches to 2-3 per second
                sampleSize: 1024 * 1,

                // Controls how often we draw the results from the batch of data created by javaScriptNode.onaudioprocess. 20 = about twice per second
                batchModulo : 20,

                // NOTE (re. above): batchModulo seems to be a more effective way of limiting data drawing than the multiplier on sampleSize.
                // (At least when the aim is to produce similar results between different plays of the audio.)
                // Looking at the timestamps (in the draw cycle) the differences between them vary hugely when the sampleSize is larger (multiplied by more than 1); whereas keeping sampleSize small (1024)
                // and using batchModulo to limit drawing cycles means the timestamps between 2 plays of the audio are close enough to one another to produce very similar (tho' not absolutely identical) results.

                numElements : 0,// number of elements will be decided by width/spacing & startPosX
                startPosX : 80,
                spacing : 40,//  where our disks will start & how far apart our discs will be
                ampMultiplier : 0.5, // multiplier on the radius of our circles

                mapFreqToColor : true,
                brightColors : true,

                lineWidth : 1,
                canvasFillStyle : [ 0, 0, 0 ],
                canvasFillAlpha :  0.25,
                fillStyle: [255, 255, 255],
                strokeStyle: [255, 255, 255],

                linkAlphaToAmplitude : false,
                invertAlpha : false

            }

            var that = {};

            that.batchCount = 0;
            that.row = 0;
            that.elapsedTime = 0;
            that.halfwayPointReached = false;

            var __vizType;


            that.init = function(pVizType){

                __vizType = pVizType;

                _.bindAll(this, 'setUp', 'processData');

                // Gather and overwrite all options and defaults (from this class and any subclasses) into this.options
                this.options = _.defaults(pOptions, defaultOptions);

                /////////////// DRAG 'N DROP //////////////////////
//                var element = document.getElementById('container');
//                AudioUtils.dropAndLoad(element, this.setUp, "ArrayBuffer");
                //--------- end DRAG 'N DROP ----------------------


                /////////////// MICROPHONE //////////////////////
                var constraints = {audio: true};

                window.navigator.mediaDevices.enumerateDevices().then(function(devices) {

                        var audioSource = null;

                        devices.forEach(function(device) {

                            if(device.kind === 'audioinput'){

                                console.log('kind:', device.kind + " label: " + device.label +  " id = " + device.deviceId);

                                // last audio source detected is set as the audio source
                                audioSource = device.deviceId;
                            }
//                        kind: audioinput label: Default id = default
//                        kind: audioinput label: Built-in Microphone id = 088d17f634d1b2b203a9ab19f0bb9a81804b03604934abeb942ea433c76b9a3f
//                        kind: audioinput label: Display Audio id = aff4a4348dd651c4cd42e0e7f91718e1f78fa99e1bed59cce811e91eda20d389
//                        kind: videoinput label:  id = 405cb69c9e54069b1fd58329ea3c1f75f282ad0e5070f548f34a66c6aa7a1143
//                        kind: videoinput label:  id = 8778a875bbf8152aad31799df2185d9b1edbc95ac88dd7fa541a610e5ea9ecce
//                        kind: audiooutput label: Default id = default
//                        kind: audiooutput label: Built-in Output id = 69cc65bb9c0f1d4211260075bb26edc82160f996a92a3b0609d62358465f0935
//                        kind: audiooutput label: Display Audio id = aff4a4348dd651c4cd42e0e7f91718e1f78fa99e1bed59cce811e91eda20d389
                        });

                        constraints = {
                            audio: {
                                optional: [{
                                    sourceId: audioSource
                                }]
                            }
                        };
                    })
                    .catch(function(err) {
                        console.log(err.name + ": " + err.message);
                    });


                window.navigator.getUserMedia( constraints, this.setUp, function(error){
                    if(window.console && console.log){
                        console.log('### baseCode::getUserMedia:: error=',error);
                    }
                });
                //----------- end MICROPHONE -------------------
            };

            // Once the file is loaded, we start getting our hands dirty.
            that.setUp = function(pArrayBuffer){

                document.getElementById('instructions').innerHTML = 'Loading ...';
                document.getElementById('canvas-container').classList.remove('phaseTwo');

                // Canvas and drawing config
                var canvas = document.getElementById('canvas');
                this.canvCtx = canvas.getContext("2d");

                this.canvCtx.lineWidth = this.options.lineWidth;
                this.canvCtx.fillStyle = 'rgba(' + this.options.fillStyle[0] + ','  + this.options.fillStyle[1] + ',' + this.options.fillStyle[2] + ',' + 1 + ')';
                this.canvCtx.strokeStyle = 'rgba(' + this.options.strokeStyle[0] + ','  + this.options.strokeStyle[1] + ',' + this.options.strokeStyle[2] + ',' + 1 + ')';

                this.canvW = canvas.width;
                this.canvH = canvas.height;

                this.centerX = this.canvW / 2;
                this.centerY = this.canvH / 2;

                // If numElements not specified...
                // ...we get the total number of elements based on width / spacing figuring in the fact we start [x] px in
//                this.numDisks = Math.ceil((this.canvW - this.options.startPosX * 2) / this.options.spacing) + 1;
                this.binSize = (this.options.numElements > 0)? this.options.numElements : Math.ceil((this.canvW - this.options.startPosX * 2) / this.options.spacing) + 1;

                // Create a new 'audioContext'
                this.audioCtx = new AudioContext();


                /////////////// DRAG 'N DROP //////////////////////
                // Set up the audio Analyser, the Source Buffer and javascriptNode
//                this.setupAudioNodes();
//                AudioUtils.decodeAndPlay(pArrayBuffer, this.audioCtx, this.sourceNode, this.javascriptNode);
                //--------- end DRAG 'N DROP ----------------------


                /////////////// MICROPHONE //////////////////////
                this.setupAudioNodes(pArrayBuffer);

                document.getElementById('instructions').innerHTML = '';
                document.getElementById('instructions').style.display = 'none';
                console.log('--------------- audio has started ----------------');

                AudioUtils.addStopFunctionality(this.sourceNode, this.javascriptNode);

                AudioUtils.audioPlaying = true;
                //----------- end MICROPHONE -------------------
            };

            // Set up the audio Analyser, the Source Buffer and javascriptNode
            that.setupAudioNodes = function(pArrayBuffer){

                if(pArrayBuffer){

                    /////////////// MICROPHONE //////////////////////

                    // Create an AudioNode from the stream.
                    this.sourceNode = this.audioCtx.createMediaStreamSource( pArrayBuffer );

                }else{

                    /////////////// DRAG 'N DROP //////////////////////

                    // Store the audio clip in our context. This is our SourceNode and we create it with createBufferSource.
                    this.sourceNode = this.audioCtx.createBufferSource();
                }


                // Creates an AnalyserNode, which can be used to expose audio time and frequency data
                // It processes batches of audio samples from the Source Node
                this.analyserNode = this.audioCtx.createAnalyser();

                // this specifies the min & max values for the range of results when using getByteFrequencyData().
                this.analyserNode.minDecibels = this.options.minDecibels;
                this.analyserNode.maxDecibels = this.options.maxDecibels;

                // The smoothingTimeConstant property's value defaults to 0.8; it must be in the range 0 to 1 (0 meaning no time averaging).
                // If 0 is set, there is no averaging done, whereas a value of 1 means "overlap the previous and current buffer quite a lot while computing the value",
                // which essentially smoothes the changes across AnalyserNode.getFloatFrequencyData/AnalyserNode.getByteFrequencyData calls.
                // In technical terms, we apply a Blackman window and smooth the values over time. The default value is good enough for most cases.
                this.analyserNode.smoothingTimeConstant = this.options.smoothingTimeConstant;

                this.analyserNode.fftSize = this.options.fftSize;


                // the javascriptNode aka scriptProcessor takes the output of the analyserNode and makes it available to our js code outside of the AudioContext
                this.javascriptNode = this.audioCtx.createScriptProcessor(this.options.sampleSize, 1, 1);

                // Setup the event handler that is called whenever the analyserNode node tells the javascriptNode that a new batch of samples have been processed
                this.javascriptNode.onaudioprocess = function(){

                    // Trigger the audio analysis and place it into the typed array

                    // re. http://stackoverflow.com/questions/14169317/interpreting-web-audio-api-fft-results
                    // Both getByteFrequencyData and getFloatFrequencyData give you the magnitude in decibels (aka amplitude aka volume) [of each frequency band].

                    // re. http://apprentice.craic.com/tutorials/31:
                    // [getByteFrequencyData] contains the spectrum of audio frequencies contained in each batch of samples taken from the audio stream
                    // Each FREQUENCY (which can be plotted as an x-coordinate, which increases from left to right) has an AMPLITUDE (which can be plotted as a y-coordinate)

                    ////////////////// BYTES vs FLOATS //////////////////////////////////////////////
                    // Values lie within the range 0 - 255
//                    that.analyserNode.getByteFrequencyData(that.soundData);

                    // (the frequencyBinCount frequency bands are spread linearly across the frequency spectrum, from 0...Nyquist frequency of the current AudioContext)
                    // "The frequency data are in dB units." re. http://webaudio.github.io/web-audio-api/#widl-AnalyserNode-getFloatFrequencyData-void-Float32Array-array
                    // Values lie in the range analyserNode.minDecibels - analyserNode.maxDecibels
//                    that.analyserNode.getFloatFrequencyData(that.soundData);

                    // Looks at the variation in amplitude, or volume, over time
//                  that.analyserNode.getByteTimeDomainData(that.soundData);


                    that.getFrequencyData();
                    //-------------------------------------------------------------------------------

                    // Now we have the data that we can use for visualization
                    if(AudioUtils.audioPlaying){

                        requestAnimationFrame(that.processData);
                    }
                }

                ////////////////// BYTES vs FLOATS //////////////////////////////////////////////
                // Create the array for the data produed by the analysis
                // frequencyBinCount is a value half that of the FFT size. This generally equates to the number of data values you will have to play with for the visualization.
//                this.soundData = new Uint8Array(this.analyserNode.frequencyBinCount);
//                this.soundData = new Float32Array(this.analyserNode.frequencyBinCount);

                that.createFrequencyDataTypedArray();
                //-------------------------------------------------------------------------------


                console.log('visualiser type=', __vizType);
                console.log('audioCtx.sampleRate=', this.audioCtx.sampleRate);
                console.log('analyserNode.fftSize=', this.analyserNode.fftSize);
                console.log('analyserNode.frequencyBinCount=',this. analyserNode.frequencyBinCount);
                console.log('numFrequencies=', this.options.numFrequencies);
                console.log('binSize=', this.binSize);

                // Now connect the nodes together
                this.sourceNode.connect(this.audioCtx.destination);// comment out to get the visualisation without the audio
                this.sourceNode.connect(this.analyserNode);
                this.analyserNode.connect(this.javascriptNode);
                this.javascriptNode.connect(this.audioCtx.destination);
            };

            that.processData = function (){

                this.batchCount += 1;

                this.elapsedTime = Date.now() - AudioUtils.lastTime;

                if(this.elapsedTime > AudioUtils.trackLength / 2){
                    this.halfwayPointReached = true;
                }

                if(this.batchCount % this.options.batchModulo !== 0){
                    return;
                }

//		        if(window.console && console.log){
//                    console.log('### localAudioVisualiser_songDna_1::draw:: this.elapsedTime=', this.elapsedTime);
//                    console.log('### localAudioVisualiser_songDna_1::draw:: visualising batchNum =', batchCount);
//                }


                // NOTE: soundData.length always equals this.analyserNode.fftSize / 2
//                var numSamples = this.soundData.length * this.options.samplesMultiplier;
                var numSamples = this.options.numFrequencies;


                //////////// DO SOMETHING BEFORE THE LOOP
                this.preLoopAction();

                ///////////////////// LOOP ///////////////////////////////////////////////////////////////////////////////

                ///////////////////// BINS ///////////////////////////
                // If processing results as bins e.g to limit number of visualisation objects
//                var step = Math.floor(numSamples / this.binSize);
//
//                for (var i = 0; i < this.binSize; i ++){
//
//                    var freqBinStart = i * step;
//
//                    var freqBinEnd = (i + 1) * step;
//
//                    var levSum = 0;
//
//                    // Collect average level for the bin
//                    for(var j = freqBinStart; j < freqBinEnd; j++){
//
//                        var lev = this.soundData[j];
//
//                        levSum += lev;
//                    }
//
//                    var amplitude = levSum / step;
//
//                    var drawResult = this.draw(freqBinStart, amplitude, numSamples, i);
//                    if(!drawResult){
//                        continue;
//                    }
//                }

                ////////////////// ALL VALUES ///////////////////////
                // If processing all results
//                for (var i = 0; i < numSamples; i ++) {
//
//                    var drawResult = this.draw(i, this.soundData[i], numSamples);
//
//                    if(!drawResult){
//                        continue;
//                    }
//                }

                this.loop(numSamples);

                //--------------------------------------------------------------------------------------------------------------

                //////////// DO SOMETHING AFTER THE LOOP
                this.postLoopAction();
            };


            /////////// OVERRIDEABLE FUNCTIONS FOR SUBCLASSES TO CHANGE CORE FUNCTIONALITY /////////////

            // Change the type of the frequency data array
            that.createFrequencyDataTypedArray = function(){

                this.soundData = new Float32Array(this.analyserNode.frequencyBinCount);
            };

            // Change the retrieval methods for frequency data
            that.getFrequencyData = function(){

                this.analyserNode.getFloatFrequencyData(that.soundData);
            };

            that.preLoopAction = function(){

                // reset the canvas, with a reduced alpha to leave traces of the last draw
                this.canvCtx.fillStyle = 'rgba(' + this.options.canvasFillStyle[0] + ','  + this.options.canvasFillStyle[1] + ',' + this.options.canvasFillStyle[2] + ',' + this.options.canvasFillAlpha + ')';

                this.canvCtx.fillRect(0, 0, this.canvW, this.canvH);
            }

            that.loop = function(pNumSamples){

                for (var i = 0; i < pNumSamples; i ++) {

                    var drawResult = this.draw(i, this.soundData[i], pNumSamples);

                    if(!drawResult){
                        continue;
                    }
                }
            };

            that.postLoopAction = function(){

                this.row += 1;
            }
            //--- end OVERRIDEABLE FUNCTIONS FOR SUBCLASSES TO CHANGE CORE FUNCTIONALITY -------------


            that.draw = function(pFreqIndex, pAmplitude, pNumSamples, i){

                ////////////////// BYTES vs FLOATS //////////////////////////////////////////////
                // normalise the amplitude within the possible range
//              var ampNorm = Utils.normalize(pAmplitude, 0, 255); // re. getByteFrequencyData
                var ampNorm = Utils.normalize(pAmplitude, this.analyserNode.minDecibels, this.analyserNode.maxDecibels); // re. getFloatFrequencyData
                //-------------------------------------------------------------------------------

                ////////////////// BYTES vs FLOATS //////////////////////////////////////////////
                // if no amplitude - skip. Only works for getByteFrequencyData
//              if(ampNorm === 0){
//                  return false
//              }
                //-------------------------------------------------------------------------------

                // normalise the frequency within the full frequency range (0 - numFrequencies)
                var freqNorm = Utils.normalize(pFreqIndex, 0, pNumSamples - 1);

                // interpolate the normalised frequency to a valid hue value (0 - 360 degrees)
                var hue = Math.floor(Utils.lerp(freqNorm, 0, 360));

                // interpolate the normalised amplitude to values suitable for saturation & brightness
                var sat = Math.floor(Utils.lerp(ampNorm, 75, 100));
                var bright = Math.floor(Utils.lerp(ampNorm, 20, 100));

                var hex = Utils.hsvToHEX([hue, sat, bright]);

                this.canvCtx.fillStyle = hex;

                this.canvCtx.fillRect(pFreqIndex, this.row, 1, 1);
                this.canvCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';

                return true;

            }

            //------------------------------

            that.optionChange = function(pOpt, pVal){

                switch(pOpt){


//                    case 'canvasFillStyle':
//                    case 'fillStyle':
//                    case 'strokeStyle':
//
//                        this.options[pOpt] = [ Math.round(pVal[0]), Math.round(pVal[1]), Math.round(pVal[2]) ];
//                        break;


                    default:

                        this.options[pOpt] = pVal;
                        break;

                }

            };

            return that;
        }

        return baseAnalyser;
    });