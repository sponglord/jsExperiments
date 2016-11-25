(function(){
	
	var audioCtx, analyserNode, sourceNode, javascriptNode, soundData;
	var canvCtx, canvW, canvH, centerX, centerY, numDisks, binSize, posX, oldX, oldY, newX, newY;

    var Utils = NN.utils;
    var AudioUtils = NN.audioUtils;
    
    var batchCount = 0, row = 0;

    var halfwayPointReached = false, elapsedTime = 0;

    var startPosX = 80, diskWidth = 40; //  where our 'disks' will start & how far apart our discs will be
    var sizeMultiplier = 0.5; // multiplier on the radius of our circles

    // Reduces the number of samples we process from frequencyBinCount to a proportion of that e.g. 1024 * .75 = 768
    var samplesMultiplier = 1



    // Number of samples to collect before analyzing data (i.e. triggering the javaScriptNode.onaudioprocess event).
    // Multiplying by one means we are receiving data to analyse 40-50 times a second, whilst multiplying by max value of 16 limits batches to 2-3 per second
    var sampleSize = 1024 * 1;

    var batchModulo = 1;// Controls how often we draw the results from the batch of data created by javaScriptNode.onaudioprocess. 20 = about twice per second

    // NOTE (re. above): batchModulo seems to be a more effective way of limiting data drawing than the multiplier on sampleSize.
    // (At least when the aim is to produce similar results between different plays of the audio.)
    // Looking at the timestamps (in the draw cycle) the differences between them vary hugely when the sampleSize is larger (multiplied by more than 1); whereas keeping sampleSize small (1024)
    // and using batchModulo to limit drawing cycles means the timestamps between 2 plays of the audio are close enough to one another to produce very similar (tho' not absolutely identical) results.


	// Set up drag &  drop
    var element = document.getElementById('container');
    AudioUtils.dropAndLoad(element, init, "ArrayBuffer");


    // Set up the audio Analyser, the Source Buffer and javascriptNode
    function setupAudioNodes(){

        // Store the audio clip in our context. This is our SourceNode and we create it with createBufferSource.
        sourceNode     = audioCtx.createBufferSource();

        // Creates an AnalyserNode, which can be used to expose audio time and frequency data
        // It processes batches of audio samples from the Source Node
        analyserNode   = audioCtx.createAnalyser();

        // this specifies the min & max values for the range of results when using getByteFrequencyData().
        analyserNode.minDecibels = -90;//defaults to -100
        analyserNode.maxDecibels = -40;//defaults to -30

        // The smoothingTimeConstant property's value defaults to 0.8; it must be in the range 0 to 1 (0 meaning no time averaging).
        // If 0 is set, there is no averaging done, whereas a value of 1 means "overlap the previous and current buffer quite a lot while computing the value",
        // which essentially smoothes the changes across AnalyserNode.getFloatFrequencyData/AnalyserNode.getByteFrequencyData calls.
        // In technical terms, we apply a Blackman window and smooth the values over time. The default value is good enough for most cases.
        analyserNode.smoothingTimeConstant = 0.8;// defaults to 0.8

//        analyserNode.fftSize = 1024; // defaults to 2048


        // the javascriptNode aka scriptProcessor takes the output of the analyserNode and makes it available to our js code outside of the AudioContext
        javascriptNode = audioCtx.createScriptProcessor(sampleSize, 1, 1);

        ////////////////// BYTES vs FLOATS //////////////////////////////////////////////
        // Create the array for the data produed by the analysis
        // frequencyBinCount is a value half that of the FFT size. This generally equates to the number of data values you will have to play with for the visualization.
        soundData = new Uint8Array(analyserNode.frequencyBinCount);
//        soundData = new Float32Array(analyserNode.frequencyBinCount);
        //-------------------------------------------------------------------------------

        console.log('visualiser type=',window.optionText);
        console.log('audioCtx.sampleRate=',audioCtx.sampleRate);
        console.log('analyserNode.fftSize=',analyserNode.fftSize);
        console.log('analyserNode.frequencyBinCount=',analyserNode.frequencyBinCount);
        console.log('numSamples=',analyserNode.frequencyBinCount * samplesMultiplier);
        console.log('binSize=',binSize);


        // Now connect the nodes together
        sourceNode.connect(audioCtx.destination);// comment out to get the visualisation without the audio
        sourceNode.connect(analyserNode);
        analyserNode.connect(javascriptNode);
        javascriptNode.connect(audioCtx.destination);
    }

	// Once the file is loaded, we start getting our hands dirty.
	function init(pArrayBuffer) {
		
  		document.getElementById('instructions').innerHTML = 'Loading ...';
  		document.getElementById('canvas-container').classList.remove('phaseTwo');
  		
  		// Canvas and drawing config
		var canvas = document.getElementById('canvas');
	  	canvCtx = canvas.getContext("2d");

        canvCtx.lineWidth = 1;
        canvCtx.strokeStyle = '#fff';
	  	canvCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';

		canvW = canvas.width;
		canvH = canvas.height;

        centerX = canvW / 2;
        centerY = canvH / 2;


        // We get the total number of bins/disks based on width / diskWidth figuring in the fact we start [x] px in
        numDisks = Math.ceil( (canvW - startPosX * 2) / diskWidth ) + 1;
        binSize = numDisks;

  		// Create a new `audioContext`
  		audioCtx = new AudioContext();

        // Set up the audio Analyser, the Source Buffer and javascriptNode
        setupAudioNodes();

        // Setup the event handler that is called whenever the analyserNode node tells the javascriptNode that a new batch of samples have been processed
        javascriptNode.onaudioprocess = function () {

            // Trigger the audio analysis and place it into the typed array

            // re. http://stackoverflow.com/questions/14169317/interpreting-web-audio-api-fft-results
            // Both getByteFrequencyData and getFloatFrequencyData give you the magnitude in decibels (aka amplitude aka volume) [of each frequency band].

            // re. http://apprentice.craic.com/tutorials/31:
            // [getByteFrequencyData] contains the spectrum of audio frequencies contained in each batch of samples taken from the audio stream
            // Each FREQUENCY (which can be plotted as an x-coordinate, which increases from left to right) has an AMPLITUDE (which can be plotted as a y-coordinate)

            ////////////////// BYTES vs FLOATS //////////////////////////////////////////////
            // Values lie within the range 0 - 255
//            analyserNode.getByteFrequencyData(soundData);

            // (the frequencyBinCount frequency bands are spread linearly across the frequency spectrum, from 0...Nyquist frequency of the current AudioContext)
            // "The frequency data are in dB units." re. http://webaudio.github.io/web-audio-api/#widl-AnalyserNode-getFloatFrequencyData-void-Float32Array-array
            // Values lie in the range analyserNode.minDecibels - analyserNode.maxDecibels
//            analyserNode.getFloatFrequencyData(soundData);

            // Looks at the variation in amplitude, or volume, over time
            analyserNode.getByteTimeDomainData(soundData);
            //-------------------------------------------------------------------------------

            // Now we have the data that we can use for visualization
            if(AudioUtils.audioPlaying){

                requestAnimationFrame(processData);
            }
        }

        AudioUtils.decodeAndPlay(pArrayBuffer, audioCtx, sourceNode, javascriptNode);
	}

	function processData(){

        batchCount += 1;

        elapsedTime = Date.now() - AudioUtils.lastTime;

        if(elapsedTime > AudioUtils.trackLength / 2){
            halfwayPointReached = true;
        }

        if(batchCount % batchModulo !== 0){
            return;
        }

//		if(window.console && console.log){
//            console.log('### localAudioVisualiser_songDna_1::draw:: elapsedTime=', elapsedTime);
//            console.log('### localAudioVisualiser_songDna_1::draw:: visualising batchNum =', batchCount);
//        }


        var numSamples = soundData.length * samplesMultiplier;

        //////////// DO SOMETHING BEFORE THE LOOP
        posX = startPosX;

        canvCtx.fillStyle = '#000';
//        canvCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        canvCtx.fillRect(0, 0, canvW, canvH);

        oldX = 0;

        ///////////////////// LOOP ///////////////////////////////////////////////////////////////////////////////

        ///////////////////// BINS ///////////////////////////
        // If processing results as bins e.g to limit number of visualisation objects
//        var step = Math.floor(numSamples / binSize);
//
//        for (var i = 0; i < binSize; i ++){
//
//            var freqBinStart = i * step;
//
//            var freqBinEnd = (i + 1) * step;
//
//            var levSum = 0;
//
//            // Collect average level for the bin
//            for(var j = freqBinStart; j < freqBinEnd; j++){
//
//                var lev = soundData[j];
//
//                levSum += lev;
//            }
//
//            var amplitude = levSum / step;
//
//            draw(freqBinStart, amplitude, numSamples);
//        }

        //////////////////////////////////// ALL VALUES ////////////////////////////////////////////////////////////////
        // If processing all results
        for (var i = 0; i < numSamples; i ++) {

            var drawResult = draw(i, soundData[i], numSamples);

            if(!drawResult){
                continue;
            }
        }

        //--------------------------------------------------------------------------------------------------------------

        //////////// DO SOMETHING AFTER THE LOOP
        row += 1;
	}

    function draw(freqIndex, amplitude, numSamples){

        ////////////////// BYTES vs FLOATS //////////////////////////////////////////////
        // normalise the amplitude within the possible range
//        var ampNorm = Utils.normalize(amplitude, 0, 255); // re. getByteFrequencyData
//        var ampNorm = Utils.normalize(amplitude, analyserNode.minDecibels, analyserNode.maxDecibels); // re. getFloatFrequencyData
        //-------------------------------------------------------------------------------

        ////////////////// BYTES vs FLOATS //////////////////////////////////////////////
        // if no amplitude - skip. Only works for getByteFrequencyData
//        if(ampNorm === 0){
//            return false
//        }
        //-------------------------------------------------------------------------------

        // normalise the frequency within the full frequency range (0 - 1023)
//        var freqNorm = Utils.normalize(freqIndex, 0, numSamples - 1);
//
//        // interpolate the normalised frequency to a valid hue value (0 - 360 degrees)
//        var hue = Math.floor(Utils.lerp(freqNorm, 0, 360));
//
//        // interpolate the normalised amplitude to values suitable for saturation & brightness
//        var sat = Math.floor(Utils.lerp(ampNorm, 75, 100));
//        var bright = Math.floor(Utils.lerp(ampNorm, 20, 100));
//
//        var hex = Utils.hsvToHEX([hue, sat, bright]);
//
//        canvCtx.fillStyle = hex;
//
//        canvCtx.fillRect(freqIndex, row, 1, 1);
//        canvCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';


        var percent = amplitude / 256;
        var height = canvH * percent;
        var offset = canvH - height - 1;

        // rects
//        canvCtx.fillStyle = '#fff';
//        canvCtx.fillRect(freqIndex, offset, 1, 1);

        // lines
        newX = freqIndex;
        newY = offset;

        canvCtx.beginPath();
        canvCtx.moveTo(oldX, (freqIndex === 0)? newY : oldY);
        canvCtx.lineTo(newX, newY);
        canvCtx.stroke()

        oldX = newX;
        oldY = newY;

        return true;
    }
	
})();
