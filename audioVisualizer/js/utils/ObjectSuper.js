/* global define */
/**
 * @description Util fn for use with Crockford's functional inheritance structure (i.e. drivers)
 *      Creates object with reference to all the original super fny, that can be used by the extending class.
 *
 * @usage implement immediately after extending super object:
 *      var that = basicDriver(options, data, containerTag, timelineRef, template);
 *      var __super = objectSuper(that);
 *      Then, later in code: __super.init(), __super.myNotOverwrittenSuperFunction()
 *
 */
define( [], function () {
    "use strict";

    var os = function(pThat){

        var __super = {};

        function makeSuperMethod(prop){

            var method = pThat[prop];
            __super[prop] = function(){
               return method.apply(pThat, arguments);
            };
        }

        for(var prop in pThat){

            if(pThat.hasOwnProperty(prop) && typeof pThat[prop] === 'function'){

                makeSuperMethod(prop);
            }
        }

        return __super;
    };

    return os;
} );