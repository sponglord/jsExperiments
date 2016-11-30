/* global define, console, require*/
define(
    [
        'datgui',
        'jquery'
//        'utils/utils2'
    ],
    function(
        dat,
        $jq
//        Utils
    ){

        "use strict";

        function options(){


            var that = {};

            that.options = {};

            // general
            that.options.numFrequencies = 512;
            that.options.batchModulo = 1;

            that.options.spacing = 40;

            that.options.ampMultiplier = 1;
            that.options.boostAmp = false;
            that.options.boostAmpDivider = 5;

            that.options.mapFreqToColor = true;
            that.options.brightColors = true;

            that.options.lineWidth = 1;
            that.options.canvasFillStyle = [ 0, 0, 0];
            that.options.canvasFillAlpha = 0.25;
            that.options.fillStyle = [ 255, 255, 255];
            that.options.strokeStyle = [ 255, 255, 255];

            that.options.linkAlphaToAmplitude = false;
            that.options.invertAlpha = false;


            // barLoop || star || bars
            that.options.numElements = 180; // number of 'ticks' around the circle (barLoop) OR number of 'arms the star has

            // barLoop
            that.options.radius = 200;// radius of the initial circle, the point on the circumference is the centre of the tick bar
            that.options.counterClockwise = false;// which way round to draw the ticks - starting at 'midnight'

            // barLoop || bars || star || circles
            that.options.linkWidthToAmplitude = false;
            that.options.maxLineWidth = 20;

            // star
            that.options.showStarForEachFreq = true;// if true renders one 'star' for every frequency, overlaying them to create a pulsing star effect
            // else renders one 'star' with each arm representing one frequency

            // intersects
            that.options.drawCircles = true;// if false & drawLines is true makes the effect formerly known as: lines
            that.options.intersectRadius = 10; // disregarded if drawCircles is false
            that.options.doIntersectFill = true; // disregarded if drawCircles is false
            that.options.doIntersectStroke = false; // disregarded if drawCircles is false
            that.options.drawLines = true; // if true makes the effect formerly known as: intersectsLines (needs fillStyle...0.1 & spacing:20)
            that.options.clipLines = true;


            var __hideArray = [];

            that.init = function(){

                var options = this.options;

                var gui = new dat.GUI({ autoPlace: false, hideable:true });
                var customContainer = document.getElementById('options');
                customContainer.appendChild(gui.domElement);

                var gen = gui.addFolder('General');

                gen.add(options, 'numFrequencies', 256, 1024).step(256).onChange(function(value) {

                    window.viz.optionChange('numFrequencies', value)
                });

                gen.add(options, 'batchModulo', 1, 40).step(1).onChange(function(value) {

                    window.viz.optionChange('batchModulo', value)
                });

                gen.add(options, 'spacing').onChange(function(value) {

                    window.viz.optionChange('spacing', value)
                });

                gen.add(options, 'mapFreqToColor').onChange(function(value) {

                    showHideElement('brightColors', value);

                    // Never do if vizType = 'barloop' or 'bars'
                    if(that.vizType.indexOf('barloop') === 0 &&
                        that.vizType.indexOf('bars') === 0
                    ){

                        showHideElement('fillStyle', !value);
                    }
                    showHideElement('strokeStyle', !value);

                    window.viz.optionChange('mapFreqToColor', value)
                });

                gen.add(options, 'brightColors').onChange(function(value) {

                    window.viz.optionChange('brightColors', value)
                });

                gen.addColor(options, 'canvasFillStyle').onChange(function(value) {

                    window.viz.optionChange('canvasFillStyle', value)
                });

                gen.add(options, 'canvasFillAlpha', 0.05, 1).step(0.05).onChange(function(value) {

                    window.viz.optionChange('canvasFillAlpha', value)
                });

                gen.addColor(options, 'fillStyle').onChange(function(value) {

                    window.viz.optionChange('fillStyle', value)
                });

                gen.addColor(options, 'strokeStyle').onChange(function(value) {

                    window.viz.optionChange('strokeStyle', value)
                });

                gen.add(options, 'lineWidth').min(0.1).onChange(function(value) {

                    window.viz.optionChange('lineWidth', value)
                });

                gen.add(options, 'linkAlphaToAmplitude').onChange(function(value) {

                    showHideElement('invertAlpha', value);
                    window.viz.optionChange('linkAlphaToAmplitude', value)
                });

                gen.add(options, 'invertAlpha').onChange(function(value) {

                    window.viz.optionChange('invertAlpha', value);
                });

                gen.add(options, 'ampMultiplier').onChange(function(value) {

                    window.viz.optionChange('ampMultiplier', value);
                });

                gen.add(options, 'boostAmp').onChange(function(value) {

                    window.viz.optionChange('boostAmp', value);
                    showHideElement('boostAmpDivider', value);
                });

                gen.add(options, 'boostAmpDivider').onChange(function(value) {

                    window.viz.optionChange('boostAmpDivider', value);
                });

                gen.open();

                //-----------------------------------------------------------

                if(this.vizType === 'barloop'){

                    var barLoop = gui.addFolder('BarLoop');

                    barLoop.add(options, 'numElements').onChange(function(value){

                        window.viz.optionChange('numElements', value)
                    });

                    barLoop.add(options, 'radius').onChange(function(value){

                        window.viz.optionChange('radius', value)
                    });

                    barLoop.add(options, 'counterClockwise').onChange(function(value){

                        window.viz.optionChange('counterClockwise', value)
                    });

                    barLoop.add(options, 'linkWidthToAmplitude').onChange(function(value){

                        showHideElement('lineWidth', !value);
                        showHideElement('maxLineWidth', value);

                        window.viz.optionChange('linkWidthToAmplitude', value)
                    });


                    barLoop.add(options, 'maxLineWidth', 1, 100).step(1).onChange(function(value){

                        window.viz.optionChange('maxLineWidth', value)
                    });

                    barLoop.open();
                }

                //-------------------------------

                if(this.vizType === 'bars'){

                    var bars = gui.addFolder('Bars');

                    bars.add(options, 'numElements').onChange(function(value){

                        window.viz.optionChange('numElements', value)
                    });

                    bars.add(options, 'linkWidthToAmplitude').onChange(function(value){

                        showHideElement('lineWidth', !value);
                        showHideElement('maxLineWidth', value);

                        window.viz.optionChange('linkWidthToAmplitude', value)
                    });

                    bars.add(options, 'maxLineWidth', 1, 200).step(1).onChange(function(value){

                        window.viz.optionChange('maxLineWidth', value)
                    });

                    bars.open()
                }

                //---------------------------------
                if(this.vizType === 'star'){

                    var star = gui.addFolder('Star');

                    star.add(options, 'numElements').onChange(function(value){

                        window.viz.optionChange('numElements', value)
                    });

                    star.add(options, 'showStarForEachFreq').onChange(function(value) {

                        window.viz.optionChange('showStarForEachFreq', value)
                    });

                    star.add(options, 'linkWidthToAmplitude').onChange(function(value){

                        showHideElement('lineWidth', !value);
                        showHideElement('maxLineWidth', value);

                        window.viz.optionChange('linkWidthToAmplitude', value)
                    });

                    star.add(options, 'maxLineWidth', 1, 100).step(1).onChange(function(value){

                        window.viz.optionChange('maxLineWidth', value)
                    });

                    star.open();
                }

                // Start closed
//                gui.closed = true;

                setTimeout(function(){
                    that.hasRendered()
                }, 100);
            };

            // Called from index.html once we know the visualisation type
            // Set config vars based on the viz type and hide/show gui elements based on these values
            that.setUp = function(pVizType){

                this.vizType = pVizType.toLowerCase();

                if(this.vizType.indexOf('barloop') > -1){

                    this.options.lineWidth = 3;
                    this.options.linkAlphaToAmplitude = true;
                    this.options.invertAlpha = true;

                    __hideArray.push('spacing')
                    __hideArray.push('fillStyle')
                    __hideArray.push('lineWidth');
                }

                if(this.vizType.indexOf('bars') > -1){

                    this.options.numElements = 0;// will decide number based on width/spacing

                    this.options.linkAlphaToAmplitude = true;
                    this.options.invertAlpha = true;

                    this.options.linkWidthToAmplitude = true;

                    __hideArray.push('fillStyle')
                    __hideArray.push('lineWidth');
                }

                if(this.vizType.indexOf('intersects') > -1){

                    this.options.linkAlphaToAmplitude = true;
                    this.options.invertAlpha = true;
                }

                if(this.vizType.indexOf('star') > -1){

                    this.options.numElements = 30;

                    this.options.linkAlphaToAmplitude = true;
                    this.options.invertAlpha = true;

                    this.options.linkWidthToAmplitude = true;

                    __hideArray.push('spacing')
                    __hideArray.push('fillStyle')
                    __hideArray.push('lineWidth');
                }

                if(this.vizType.indexOf('circles') > -1){

                    this.options.boostAmpDivider = 35;
                    this.options.linkAlphaToAmplitude = false;
                    this.options.invertAlpha = false;
                }

                if(!that.options.boostAmp){

                    __hideArray.push('boostAmpDivider')
                }


                if(!that.options.mapFreqToColor){

                    __hideArray.push('brightColors');

                }else{

                    __hideArray.push('fillStyle');
                    __hideArray.push('strokeStyle');
                }

                if(!that.options.linkAlphaToAmplitude){

                    __hideArray.push('invertAlpha')
                }

                // ################# INIT #################
                this.init();

                setTimeout(function(){

                    document.getElementById('options').style.display = 'block';
                }, 250);
            };

            that.hasRendered = function(){

                _.each(__hideArray, function(pItem){

                    showHideElement(pItem, false);
                });
            };

            var showHideElement = function(pId, pShow){

                var el;
                $jq('.property-name').each(function(){

                    var text = $jq(this).text();
                    if(text === pId){

                        el = $jq(this);
                    }
                });

                if(el){

                    if(pShow === false){

                        el.closest('li').css('display', 'none');
                    }else{
                        el.closest('li').css('display', 'block');
                    }
                }

            };

            return that;
        }

        return options;
    });