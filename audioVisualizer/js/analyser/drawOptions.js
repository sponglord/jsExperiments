/* global define, console, require*/
define(
    [
        'datgui',
        'jquery',
        'lodash',
        'utils/utils2'
    ],
    function(
        dat,
        $jq,
        _,
        Utils
    ){

        "use strict";

        function options(){

            var that = {};

            that.options = {};

            var __hideArray = [];

            /**
             * Create the dat.gui elements and set onChange behaviours
             * Elements are organised by effect (vizType) - which also influences the behaviours and whether certain
             * elements are visible as other elements change state
             */
            that.init = function(){

                var options = this.options;

                var gui = new dat.GUI({ autoPlace: false, hideable:true });
                var customContainer = document.getElementById('options');
                customContainer.appendChild(gui.domElement);

                // adds save options at top of gui panel
                gui.remember(options);

                var gen = gui.addFolder('General');

                gen.add(options, 'numFrequencies', 256, 1024).step(256).onChange(function(value) {

                    window.viz.optionChange('numFrequencies', value);
                });

                gen.add(options, 'batchModulo', 1, 40).step(1).onChange(function(value) {

                    window.viz.optionChange('batchModulo', value);
                });

                var maxXPos = $jq('#canvas').width();
                gen.add(options, 'startPosX').max(maxXPos).onChange(function(value) {

                    window.viz.optionChange('startPosX', value);
                });

                gen.add(options, 'spacing').onChange(function(value) {

                    window.viz.optionChange('spacing', value);
                });

                gen.add(options, 'mapFreqToColor').onChange(function(value) {

                    // ONLY DO IF vizType = 'intersects'
                    if(that.vizType === 'intersects' || that.vizType === 'circlesandintersects'){

                        showHideElement('fillStyle', !value); // OPP to this value
                        showHideElement('strokeStyle', !value); // OPP to this value

                        // If we ARE stroking the lines between intersect circles then we should show the drawLineStyle option IF mapFreqToColor is set to false
                        // And hide the drawLineStyle option IF mapFreqToColor is set to true
                        if(that.options.drawLines){

                            showHideElement('drawLineStyle', !value); // OPP to this value

                        }else{

                            // If we're in 'intersects' and NOT stroking the lines between intersect circles then always hide the strokeStyle option
                            showHideElement('drawLineStyle', false);
                        }

                        // Don't show brightColors option if effect is 'intersects'
                        showHideElement('brightColors', false);

                    }// ALL OTHER EFFECTS:
                    else{

                        // Show the strokeStyle option IF mapFreqToColor is set to false
                        // And hide the strokeStyle option IF mapFreqToColor is set to true
                        showHideElement('strokeStyle', !value); // OPP to this value

                        // Show brightColors option
                        showHideElement('brightColors', value);
                    }

                    window.viz.optionChange('mapFreqToColor', value);
                });

                gen.add(options, 'brightColors').onChange(function(value) {

                    window.viz.optionChange('brightColors', value);
                });

                gen.addColor(options, 'fillStyle').onChange(function(value) {

                    // Flaw in dat.gui means values can end up to ±10 decimal places
                    // - which doesn't play well with setting the css rgba property... so first round the values
                    var roundVals = [ Math.round(value[0]), Math.round(value[1]), Math.round(value[2]) ];
                    window.viz.optionChange('fillStyle', roundVals);
                });

                gen.addColor(options, 'strokeStyle').onChange(function(value) {

                    // Flaw in dat.gui means values can end up to ±10 decimal places
                    // - which doesn't play well with setting the css rgba property... so first round the values
                    var roundVals = [ Math.round(value[0]), Math.round(value[1]), Math.round(value[2]) ];
                    window.viz.optionChange('strokeStyle', roundVals)
                });

                gen.addColor(options, 'canvasFillStyle').onChange(function(value) {

                    // Flaw in dat.gui means values can end up to ±10 decimal places
                    // - which doesn't play well with setting the css rgba property... so first round the values
                    var roundVals = [ Math.round(value[0]), Math.round(value[1]), Math.round(value[2]) ];
                    window.viz.optionChange('canvasFillStyle', roundVals);

//                    $jq('body').css('background-color', Utils.rgbToHEX(roundVals));
//                    $jq('#container').css('background-color', Utils.rgbToHEX(roundVals));
                });

                gen.add(options, 'canvasFillAlpha', 0.05, 1).step(0.05).onChange(function(value) {

                    window.viz.optionChange('canvasFillAlpha', value);
                });

                gen.add(options, 'lineWidth').min(0.1).onChange(function(value) {

                    window.viz.optionChange('lineWidth', value);
                });

                gen.add(options, 'linkAlphaToAmplitude').onChange(function(value) {

                    showHideElement('invertAlpha', value);

                    if(that.vizType === 'waves1'){
                        showHideElement('invertAlpha', false);
                    }

                    window.viz.optionChange('linkAlphaToAmplitude', value);
                });

                gen.add(options, 'invertAlpha').onChange(function(value) {

                    window.viz.optionChange('invertAlpha', value);
                });

                var ampMult = gen.add(options, 'ampMultiplier').min(0.1).step(0.1).onChange(function(value) {

                    window.viz.optionChange('ampMultiplier', value);
                });
                if(this.vizType === 'rings'){
                    ampMult.max(10).onChange(function(value) {// For some reason have to re-add the listener

                        window.viz.optionChange('ampMultiplier', value);
                    })
                }

                gen.add(options, 'boostAmp').onChange(function(value) {

                    window.viz.optionChange('boostAmp', value);
                    showHideElement('boostAmpDivider', value);
                });

                gen.add(options, 'boostAmpDivider').min(0.1).onChange(function(value) {

                    window.viz.optionChange('boostAmpDivider', value);
                });

                gen.open();

                //-----------------------------------------------------------

                if(this.vizType === 'barloop'){

                    var barLoop = gui.addFolder('BarLoop');

                    barLoop.add(options, 'numElements').min(0).step(1).onChange(function(value){

                        window.viz.optionChange('numElements', value);
                    });

                    barLoop.add(options, 'radius').min(0).step(1).onChange(function(value){

                        window.viz.optionChange('radius', value);
                    });

                    barLoop.add(options, 'counterClockwise').onChange(function(value){

                        window.viz.optionChange('counterClockwise', value);
                    });

                    barLoop.add(options, 'linkWidthToAmplitude').onChange(function(value){

                        showHideElement('lineWidth', !value); // OPP to this value
                        showHideElement('maxLineWidth', value);

                        window.viz.optionChange('linkWidthToAmplitude', value);
                    });


                    barLoop.add(options, 'maxLineWidth', 1, 100).step(1).onChange(function(value){

                        window.viz.optionChange('maxLineWidth', value);
                    });

                    barLoop.open();
                }

                //-------------------------------

                if(this.vizType === 'bars'){

                    var bars = gui.addFolder('Bars');

                    bars.add(options, 'numElements').min(0).onChange(function(value){

                        window.viz.optionChange('numElements', value);
                    });

                    bars.add(options, 'linkWidthToAmplitude').onChange(function(value){

                        showHideElement('lineWidth', !value); // OPP to this value
                        showHideElement('maxLineWidth', value);

                        window.viz.optionChange('linkWidthToAmplitude', value);
                    });

                    bars.add(options, 'maxLineWidth', 1, 200).step(1).onChange(function(value){

                        window.viz.optionChange('maxLineWidth', value);
                    });

                    bars.open()
                }

                //---------------------------------
                if(this.vizType === 'star'){

                    var star = gui.addFolder('Star');

                    star.add(options, 'numElements').min(1).onChange(function(value){

                        window.viz.optionChange('numElements', value);
                    });

                    star.add(options, 'showStarForEachFreq').onChange(function(value) {

                        window.viz.optionChange('showStarForEachFreq', value);
                    });

                    star.add(options, 'linkWidthToAmplitude').onChange(function(value){

                        showHideElement('lineWidth', !value); // OPP to this value
                        showHideElement('maxLineWidth', value);

                        window.viz.optionChange('linkWidthToAmplitude', value);
                    });

                    star.add(options, 'maxLineWidth', 1, 100).step(1).onChange(function(value){

                        window.viz.optionChange('maxLineWidth', value);
                    });

                    star.open();
                }

                //---------------------------

                if(this.vizType === 'circlesandintersects'){

                    var circles, intersects;

                    gen.add(options, 'renderCircles').onChange(function(value) {

                        window.viz.optionChange('renderCircles', value);

                        // Show/hide folder
                        if(value){

                            $jq(circles.domElement).parent().css('display', 'list-item');

                        }else{

                            $jq(circles.domElement).parent().css('display', 'none');
                        }
                    });

                    gen.add(options, 'renderIntersects').onChange(function(value) {

                        window.viz.optionChange('renderIntersects', value);

                        if(value){

                            $jq(intersects.domElement).parent().css('display', 'list-item');

                        }else{

                            $jq(intersects.domElement).parent().css('display', 'none');
                        }
                    });


                    if(this.options.renderCircles){

                        circles = gui.addFolder('Circles');

                        circles.add(options, 'numElements').min(0).onChange(function(value){

                            window.viz.optionChange('numElements', value);
                        });

                        circles.add(options, 'linkWidthToAmplitude').onChange(function(value){

                            showHideElement('lineWidth', !value); // OPP to this value
                            showHideElement('maxLineWidth', value);

                            window.viz.optionChange('linkWidthToAmplitude', value);
                        });

                        circles.add(options, 'maxLineWidth', 1, 200).step(1).onChange(function(value){

                            window.viz.optionChange('maxLineWidth', value);
                        });


                        circles.open();
                    }

                    if(this.options.renderIntersects){

                        intersects = gui.addFolder('Intersects (with circles)');

                        intersects.add(options, 'drawIntersects').onChange(function(value){

                            window.viz.optionChange('drawIntersects', value);

                            showHideElement('intersectRadius', value);
                            showHideElement('doIntersectFill', value);
                            showHideElement('doIntersectStroke', value);
                        });

                        intersects.add(options, 'intersectRadius').min(1).onChange(function(value){

                            window.viz.optionChange('intersectRadius', value);
                        });

                        intersects.add(options, 'doIntersectFill').onChange(function(value){

                            window.viz.optionChange('doIntersectFill', value);

                            // If we're NOT mapping frequency - show option to set circle fill colour
                            if(!that.options.mapFreqToColor){

                                showHideElement('fillStyle', value);
                            }
                        });

                        intersects.add(options, 'doIntersectStroke').onChange(function(value){

                            window.viz.optionChange('doIntersectStroke', value);

                            // If we're NOT mapping frequency - show option to set circle stroke colour
//                            if(!that.options.mapFreqToColor){
//
//                                showHideElement('strokeStyle', value);
//                            }
                        });

                        intersects.add(options, 'drawLines').onChange(function(value){

                            window.viz.optionChange('drawLines', value);

                            // If we're NOT mapping frequency - show option to set line stroke colour
                            if(!that.options.mapFreqToColor){

                                showHideElement('drawLineStyle', value);
                            }
                        });

                        intersects.addColor(options, 'drawLineStyle').onChange(function(value) {

                            // Flaw in dat.gui means values can end up to ±10 decimal places
                            // - which doesn't play well with setting the css rgba property... so first round the values
                            var roundVals = [ Math.round(value[0]), Math.round(value[1]), Math.round(value[2]) ];
                            window.viz.optionChange('drawLineStyle', roundVals)
                        });

                        intersects.add(options, 'intersectLineWidth').min(0.1).onChange(function(value){

                            window.viz.optionChange('intersectLineWidth', value);
                        });

                        intersects.add(options, 'clipLines').onChange(function(value){

                            window.viz.optionChange('clipLines', value);
                        });

                        intersects.open();
                    }

                }

                if(this.vizType === 'rings'){

                    var rings = gui.addFolder('Rings');

                    rings.add(options, 'linkWidthToAmplitude').onChange(function(value){

                        showHideElement('lineWidth', !value); // OPP to this value
                        showHideElement('maxLineWidth', value);

                        window.viz.optionChange('linkWidthToAmplitude', value);
                    });

                    rings.add(options, 'maxLineWidth', 1, 10).step(1).onChange(function(value){

                        window.viz.optionChange('maxLineWidth', value);
                    });

                    rings.open();
                }

                if(this.vizType === 'waves1'){

                    var waves = gui.addFolder('waves');

                    waves.add(options, 'numElements', 2, 150).onChange(function(value){

                        window.viz.optionChange('numElements', value);
                    });

                    waves.add(options, 'maxAlpha', 0, 1).step(0.1).onChange(function(value){

                        window.viz.optionChange('maxAlpha', value);
                    });

                    waves.add(options, 'maxVelocity', 0, 10).step(0.5).onChange(function(value){

                        window.viz.optionChange('maxVelocity', value);
                    });

//                    waves.add(options, 'minAngleIncrement').max(1).step(0.05).onChange(function(value){
//
//                        window.viz.optionChange('minAngleIncrement', value);
//                    });

                    waves.add(options, 'maxAngleIncrement').max(2).step(0.05).onChange(function(value){

                        window.viz.optionChange('maxAngleIncrement', value);
                    });

//                    waves.add(options, 'minAmpBoost').max(2).step(0.1).onChange(function(value){
//
//                        window.viz.optionChange('minAmpBoost', value);
//                    });

                    waves.add(options, 'maxAmpBoost').max(5).step(0.1).onChange(function(value){

                        window.viz.optionChange('maxAmpBoost', value);
                    });

                    waves.add(options, 'minDist').max(100).step(1).onChange(function(value){

                        window.viz.optionChange('minDist', value);
                    });

                    waves.add(options, 'maxDist').max(200).step(1).onChange(function(value){

                        window.viz.optionChange('maxDist', value);
                    });

//                    maxAlpha : 0.2,
//                    maxVelocity : 3,
//                    minAngleIncrement : 0.05,
//                    maxAngleIncrement : 1,
//                    minAmpBoost : 0.1,
//                    maxAmpBoost : 1.5,
//                    minDist : 100,
//                    maxDist : 200

                    waves.open();
                }

                // Start closed
//                gui.closed = true;

                setTimeout(function(){
                    that.hasRendered()
                }, 100);
            };

            /**
             * @description Called from index.html once we know the visualisation type
             *              Hide/show gui elements based on vizType
             *
             * @param pVizType
             * @param pVizOptions - options values from instantiated visualization
             */
            that.setUp = function(pVizType, pVizOptions){

                this.options = pVizOptions;

                this.vizType = pVizType.toLowerCase();

                if(this.vizType === 'barloop'){

                    __hideArray.push('spacing');
                    __hideArray.push('fillStyle');
                }

                if(this.vizType === 'bars'){

                    __hideArray.push('fillStyle');
                    __hideArray.push('lineWidth');
                }

                if(this.vizType === 'star'){

                    __hideArray.push('spacing');
                    __hideArray.push('fillStyle');
                    __hideArray.push('lineWidth');
                }

                if(this.vizType === 'circlesandintersects'){

                    __hideArray.push('brightColors');
                    __hideArray.push('drawLineStyle');
                    __hideArray.push('maxLineWidth');
                }


                if(this.vizType === 'rings'){

                    __hideArray.push('spacing');
                    __hideArray.push('startPosX');
                    __hideArray.push('lineWidth');
                    __hideArray.push('boostAmp');
                }

                if(this.vizType === 'waves1'){

                    __hideArray.push('invertAlpha');
                    __hideArray.push('ampMultiplier');
                    __hideArray.push('boostAmp');
                    __hideArray.push('lineWidth');
                    __hideArray.push('fillStyle');
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