(function(){
	
	var audioCtx, analyserNode, sourceNode, javascriptNode, soundData;
	var canvCtx, canvW, canvH, centerX, centerY, lastTime, audioPlaying, numDisks, posX;

    var batchCount = 0, binSize = 60, row = 0;
    var startPosX = 80, diskWidth = 40; //  where our disks will start & how far apart our discs will be
    var sizeMultiplier = 0.75; // multiplier on the radius of our circles

    var storeObj = {};


    for(var i = 0; i < 512; i++){
        storeObj[i] = NN.utils.randomNumberInRange(0, Math.PI * 2);
    }
//
//    if(window.console && console.log){
//        console.log('### localAudioVisualiser_fatCircles_clean:::: storeObj=',storeObj);
//    }


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
    dropAndLoad(element, init, "ArrayBuffer");


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
        analyserNode.smoothingTimeConstant = 0.9;// defaults to 0.8

//        analyserNode.fftSize = 1024; // defaults to 2048


        // the javascriptNode aka scriptProcessor takes the output of the analyserNode and makes it available to our js code outside of the AudioContext
        javascriptNode = audioCtx.createScriptProcessor(sampleSize, 1, 1);

        ////////////////// BYTES vs FLOATS //////////////////////////////////////////////
        // Create the array for the data produed by the analysis
        // frequencyBinCount is a value half that of the FFT size. This generally equates to the number of data values you will have to play with for the visualization.
        soundData = new Uint8Array(analyserNode.frequencyBinCount);
//        soundData = new Float32Array(analyserNode.frequencyBinCount);
        //-------------------------------------------------------------------------------


        console.log('audioCtx.sampleRate=',audioCtx.sampleRate);
        console.log('analyserNode.frequencyBinCount=',analyserNode.frequencyBinCount);
        console.log('analyserNode.fftSize=',analyserNode.fftSize);

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

	  	canvCtx.lineWidth = 0;
	  	canvCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';

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
            analyserNode.getByteFrequencyData(soundData);

            // (the frequencyBinCount frequency bands are spread linearly across the frequency spectrum, from 0...Nyquist frequency of the current AudioContext)
            // "The frequency data are in dB units." re. http://webaudio.github.io/web-audio-api/#widl-AnalyserNode-getFloatFrequencyData-void-Float32Array-array
            // Values lie in the range analyserNode.minDecibels - analyserNode.maxDecibels
//            analyserNode.getFloatFrequencyData(soundData);

            // Looks at the variation in amplitude, or volume, over time
//            analyserNode.getByteTimeDomainData(soundData);
            //-------------------------------------------------------------------------------

            // Now we have the data that we can use for visualization
            if(audioPlaying){

                requestAnimationFrame(processData);
            }
        }

        decodeAndPlay(pArrayBuffer);
	}

	function processData(){

        batchCount += 1;

        var dt = Date.now() - lastTime;

        if(batchCount % batchModulo !== 0){
            return;
        }

//		if(window.console && console.log){
//            console.log('### localAudioVisualiser_songDna_1::draw:: dt=', dt);
//            console.log('### localAudioVisualiser_songDna_1::draw:: visualising batchNum =', batchCount);
//        }
        

//	    var numSamples = soundData.length;// = analyserNode.ftSize / 2
	    var numSamples = soundData.length / 2;// = 512 the bottom half of the frequency range is of most interest


        //////////// DO SOMETHING BEFORE THE LOOP
        posX = startPosX;
        canvCtx.fillRect(0, 0, canvW, canvH);


        ///////////////////// LOOP ///////////////////////////////////////////////////////////////////////////////

        ///////////////////// BINS ///////////////////////////
        // If processing results as bins e.g to limit number of visualisation objects
        var step = Math.floor(numSamples / binSize);

        for (var i = 0; i < binSize; i ++){

            var freqBinStart = i * step;

            var freqBinEnd = (i + 1) * step;

            var levSum = 0;

            // Collect average level for the bin
            for(var j = freqBinStart; j < freqBinEnd; j++){

                var lev = soundData[j];

                levSum += lev;
            }

            var amplitude = levSum / step;

            draw(freqBinStart, amplitude, numSamples);
        }

        ////////////////// ALL VALUES ///////////////////////
        // If processing all results
//        for (var i = 0; i < numSamples; i ++) {
//
//            var drawResult = draw(i, soundData[i], numSamples);
//
//            if(!drawResult){
//                continue;
//            }
//        }

        //--------------------------------------------------------------------------------------------------------------

        //////////// DO SOMETHING AFTER THE LOOP
//        row += 1;
	}

    function draw(freqIndex, amplitude, numSamples){


        ////////////////// BYTES vs FLOATS //////////////////////////////////////////////
        // normalise the amplitude within the possible range
        var ampNorm = NN.utils.normalize(amplitude, 0, 255); // re. getByteFrequencyData
        if(ampNorm === 0){
            return false
        }

//        var ampNorm = NN.utils.normalize(amplitude, analyserNode.minDecibels, analyserNode.maxDecibels); // re. getFloatFrequencyData
        //-------------------------------------------------------------------------------

        // normalise the frequency within the full frequency range (0 - 511)
        var freqNorm = NN.utils.normalize(freqIndex, 0, numSamples - 1);

        // hue
        var hue = Math.floor(NN.utils.lerp(freqNorm, 0, 360));// ex 310??

        // saturation & brightnesss
        var sat = Math.floor(NN.utils.lerp(ampNorm, 40, 100));
        var bright = Math.floor(NN.utils.lerp(ampNorm, 50, 100));

        var hex = NN.utils.hsvToHEX([hue, sat, bright]);

        canvCtx.strokeStyle = hex;

        // smaller the amplitude, wider the stroke
        var stroke = Math.floor(NN.utils.lerp(ampNorm, 0, 30));
        canvCtx.lineWidth = 30 - stroke;

        // Selected pre-generated random start angle
        var randAngle = storeObj[freqIndex];

        var endAngle = randAngle + NN.utils.lerp(ampNorm, 0, Math.PI * 2)

        // make radius multiplier between 0.5 & 1 depending on amplitude
        sizeMultiplier = NN.utils.lerp(ampNorm, 0.5, 1)

        var heads = Math.round(NN.utils.randomNumberInRange(0, 1));

        canvCtx.beginPath();
        if(heads === 1){
            canvCtx.arc(posX, canvH/2, amplitude * sizeMultiplier, endAngle, randAngle, true);
        }else{
            canvCtx.arc(posX, canvH/2, amplitude * sizeMultiplier, randAngle, endAngle, false);
        }
        canvCtx.stroke();

        // Draw each disk
//        canvCtx.beginPath();
//        canvCtx.arc(posX, canvH/2, amplitude * sizeMultiplier, randAngle, endAngle, (freqIndex%2 === 0));
//        canvCtx.stroke();


        posX += diskWidth;

//        if(window.console && console.log){
//            console.log('### localAudioVisualiser_circles_clean::draw:: freqIndex=',freqIndex,' amplitude=',amplitude, ' posX=',posX, 'hex=',hex);
//        }

        return true;



        ////////////////// BYTES vs FLOATS //////////////////////////////////////////////
        // normalise the amplitude within the possible range
//        var ampNorm = NN.utils.normalize(amplitude, 0, 255); // re. getByteFrequencyData
        var ampNorm = NN.utils.normalize(amplitude, analyserNode.minDecibels, analyserNode.maxDecibels); // re. getFloatFrequencyData
        //-------------------------------------------------------------------------------

        ////////////////// BYTES vs FLOATS //////////////////////////////////////////////
        // if no amplitude - skip. Only works for getByteFrequencyData
//        if(ampNorm === 0){
//            return false
//        }
        //-------------------------------------------------------------------------------

        // normalise the frequency within the full frequency range (0 - 1023)
        var col = NN.utils.normalize(freqIndex, 0, numSamples - 1);

        // interpolate the normalised frequency to a valid hue value (0 - 360 degrees)
        var hue = Math.floor(NN.utils.lerp(col, 0, 360));

        // interpolate the normalised amplitude to values suitable for saturation & brightness
        var sat = Math.floor(NN.utils.lerp(ampNorm, 75, 100));
        var bright = Math.floor(NN.utils.lerp(ampNorm, 20, 100));

        var hex = NN.utils.hsvToHEX([hue, sat, bright]);

        canvCtx.fillStyle = hex;

        canvCtx.fillRect(freqIndex, row, 1, 1);

        return true;
    }


    // Reusable dropAndLoad function: it reads a local file dropped on a
    // `dropElement` in the DOM in the specified `readFormat`
    // (In this case, we want an arrayBuffer)
    function dropAndLoad(dropElement, callback, readFormat) {

        var readFormat = readFormat || "DataUrl";

        dropElement.addEventListener('dragover', function(e) {

            e.stopPropagation();
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';

        }, false);

        dropElement.addEventListener('drop', function(e) {

            e.stopPropagation();
            e.preventDefault();
            loadFile(e.dataTransfer.files[0], callback, readFormat);

        }, false);
    }

    function loadFile(file, callback, readFormat) {

        var reader = new FileReader();

        reader.onload = function(e) {

            callback(e.target.result);
        };

        reader['readAs'+readFormat](file);
    }

    function decodeAndPlay(pArrayBuffer){

        // Decode the data in our array into an audio buffer
        audioCtx.decodeAudioData(

            pArrayBuffer,

            function(buffer) {

                // Use the passed data as as our audio source
                sourceNode.buffer = buffer;

                // Start playing the buffer.
                sourceNode.start(0);
                audioPlaying = true;

                lastTime = Date.now();

                document.getElementById('instructions').innerHTML = '';

                // For play/pause fn see code snippets at: http://stackoverflow.com/questions/11506180/web-audio-api-resume-from-pause
                var canvas = document.getElementById('canvas');
                canvas.addEventListener('click',function(e) {
                    e.preventDefault();

                    if(audioPlaying){

                        sourceNode.stop();
                        audioPlaying = false;
                    }else{

                        // Can probably be done better - see url above
//                        setupAudioNodes()
//                        sourceNode.buffer = buffer;
//                        sourceNode.start(0);
//                        audioPlaying = true;
                    }
                });
            },

            function(error){
                // console.log('decodeAudioData error=',error);
                document.getElementById('instructions').innerHTML = 'Audio Decode Error - reload the page and try a different file.';
            }
        );
    }
	

    // re. http://stackoverflow.com/questions/4364823/how-do-i-obtain-the-frequencies-of-each-value-in-an-fft
    function getFrequencyFromIndex(pIndex){
        return (pIndex * audioCtx.sampleRate) / analyserNode.fftSize; //e.g. (1023 * 44100) / 2048 = 22028.5 Hz
    }
	
})();
