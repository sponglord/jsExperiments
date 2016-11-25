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


            // re. http://stackoverflow.com/questions/4364823/how-do-i-obtain-the-frequencies-of-each-value-in-an-fft
            getFrequencyFromIndex : function(pIndex, pAudioCtx, pAnalyserNode){
                return (pIndex * pAudioCtx.sampleRate) / pAnalyserNode.fftSize; //e.g. (1023 * 44100) / 2048 = 22028.5 Hz
            }
        };

        return audioUtils;
    }
);

