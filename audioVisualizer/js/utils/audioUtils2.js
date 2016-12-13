/* global define, require*/

define( ['utils/utils2'],
    function (Utils){

        var audioUtils = {

            // Reusable dropAndLoad function: it reads a local file dropped on a
            // `dropElement` in the DOM in the specified `readFormat`
            // (In this case, we want an arrayBuffer)
            dropAndLoad : function(dropElement, callback, readFormat) {

                var readFormat = readFormat || "DataUrl";

                dropElement.addEventListener('dragover', function(e) {

                    e.stopPropagation();
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';

                }, false);

                dropElement.addEventListener('drop', function(e) {

                    e.stopPropagation();
                    e.preventDefault();
                    console.log('### AudioUtils file name = ',e.dataTransfer.files[0].name);
                    audioUtils.loadFile(e.dataTransfer.files[0], callback, readFormat);

                }, false);
            },

            loadFile : function(file, callback, readFormat) {

                var reader = new FileReader();

                reader.onload = function(e) {

                    audioUtils.trackLength = Math.floor( Utils.fileSizeToLength(file.size) * 1000 );// secs to milliseconds
                    console.log('### file sizes = ',file.size);
                    console.log('### track length @ 192 bitRate = ',audioUtils.trackLength);
                    callback(e.target.result);
                };

                reader['readAs'+readFormat](file);
            },

            decodeAndPlay : function(pArrayBuffer, pAudioCtx, pSourceNode, pJavascriptNode){

                // Decode the data in our array into an audio buffer
                pAudioCtx.decodeAudioData(

                    pArrayBuffer,

                    function(buffer) {

                        // Use the passed data as as our audio source
                        pSourceNode.buffer = buffer;

                        // Start playing the buffer.
                        pSourceNode.start(0);

                        audioUtils.audioPlaying = true;
                        audioUtils.lastTime = Date.now();

                        pSourceNode.onended = function(){

                            console.log('--------------- audio has finished ---------------');
                            pJavascriptNode.onaudioprocess = null;
                        }

                        document.getElementById('instructions').innerHTML = '';
                        document.getElementById('instructions').style.display = 'none';
                        console.log('--------------- audio has started ----------------');

                        // For play/pause fn see code snippets at: http://stackoverflow.com/questions/11506180/web-audio-api-resume-from-pause
                        var canvas = document.getElementById('canvas');
                        canvas.addEventListener('click',function(e) {

                            e.preventDefault();

                            if(audioUtils.audioPlaying){

                                pSourceNode.stop();
                                audioUtils.audioPlaying = false;

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
            },

            setUpAudioInput : function(pCallback){

                var constraints = {audio : true};

                if(typeof window.navigator.mediaDevices === 'undefined' ||
                    typeof window.navigator.mediaDevices.enumerateDevices === 'undefined'){
                    alert('This browser does not support navigator.mediaDevices.\n\nTry Chrome or Firefox.');
                }else{

                    window.navigator.mediaDevices.enumerateDevices().then(function(devices){

                            var audioSource = null;

                            devices.forEach(function(device){

                                if(device.kind === 'audioinput'){

                                    console.log('kind:', device.kind + " label: " + device.label + " id = " + device.deviceId);

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
                                audio : {
                                    optional : [{
                                        sourceId : audioSource
                                    }]
                                }
                            };
                        })
                        .catch(function(err){
                            console.log(err.name + ": " + err.message);
                        });
                }

                if(typeof window.navigator.getUserMedia !== 'undefined'){

                    window.navigator.getUserMedia(constraints, pCallback, function(error){
                        if(window.console && console.log){
                            console.log('### baseCode::getUserMedia:: error=', error);
                        }
                    });

                    return true;

                }

                return false;
            },

            // re. http://stackoverflow.com/questions/4364823/how-do-i-obtain-the-frequencies-of-each-value-in-an-fft
            getFrequencyFromIndex : function(pIndex, pAudioCtx, pAnalyserNode){
                return (pIndex * pAudioCtx.sampleRate) / pAnalyserNode.fftSize; //e.g. (1023 * 44100) / 2048 = 22028.5 Hz
            }
        };

        return audioUtils;
    }
);

