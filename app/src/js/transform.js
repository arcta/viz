(function(window) {
    'use strict';

    var VIZ = window.VIZ || {};

    function parseDate(str) {
    /******************************************************************
     * TODO: parse non-standard *
     ******************************************************************/
        return Date.parse(str);
    }

    function transform(data) {
        if (!Array.isArray(data)) data = [data];
        VIZ.data = [];

        var Y = Array.isArray(VIZ.meta['y']);
        /**************************************************************
            extract X,Y,Z
         **************************************************************/
        data.map(function(d) {
            var O = !Y ? [{}] : VIZ.meta['y'].map(
                                function(y) {
                                    return { z:y };
                                });

            ['x','y','z'].map(function(a) {
                O.map(function(o,i) {
                    if (a in VIZ.meta) {
                        if (a === 'y' && Y)
                            o[a] = d[VIZ.meta['y'][i]];

                        else if (a === 'z' && Y)
                            o[a] = o[a]; //ignore passed arg

                        else o[a] = d[VIZ.meta[a]];

                        if ('date' === VIZ.meta.summary[a].type)
                            o[a] = parseDate(o[a]);
                    }
                });
            });

            O.map(function(o){ VIZ.data.push(o); });
        });
        /**************************************************************
            update summary
         **************************************************************/
        ['x','y','z'].map(function(d) {
            if (VIZ.meta['summary'][d]) {
                if ('date' === VIZ.meta['summary'][d]['type']) {
                    VIZ.data.sort(
                        function(a,b) {
                            return a[d] - b[d];
                        });

                    VIZ.defaults[d +'domain'] = [
                        VIZ.data[0][d],
                        VIZ.data[VIZ.data.length-1][d]
                    ];

                    VIZ.data.map(
                        function(D,I) {
                            D[d] = new Date(D[d]);
                        });

                } else if ('numeric' === VIZ.meta['summary'][d]['type']) {
                    VIZ.defaults[d +'domain'] = [
                        d3.min(VIZ.data, function(D){ return D[d]; }),
                        d3.max(VIZ.data, function(D){ return D[d]; })
                    ];
                }
            }
        });
    }


    VIZ.refresh = function(callback) {
        callback = callback || function(){};
    /******************************************************************
        load current data: callback is either render or transition
     ******************************************************************/
        d3.json(VIZ.meta.source, function(err, data) {
            if (err) return console.log(err);

            transform(data);
            callback();
        });
    };


    VIZ.transition = function(transition) {
        transition = transition || function(){};
        var tlabel = 'timestamp';
        for (var key in VIZ.meta.summary)
            if (VIZ.meta.summary[key].type === 'date')
                tlabel = key;
    /******************************************************************
        data transition for non-static
     ******************************************************************/
        function parse(data) {
            data = JSON.parse(data);
            if (!Array.isArray(data)) data = [data];

            var t = new Date(), T = t.getTime(),
                delta = T - 2*VIZ.conf['window'],
                Y = Array.isArray(VIZ.meta['y']);

            while (VIZ.data.length > 1 && VIZ.data[0][tlabel] < delta)
                VIZ.data.shift();

            /**********************************************************
                extract X,Y,Z from message
             **********************************************************/
            data.map(function(d) {
                var T = new Date(parseDate(d[VIZ.meta[tlabel]])),
                    O = !Y ? [{ t:t }] :
                            VIZ.meta['y'].map(
                                function(y) {
                                    return { t:t, z:y };
                                });

                ['x','y','z'].map(function(a) {
                    O.map(function(o,i) {
                        if (a in VIZ.meta) {
                            if (a === 'y' && Y)
                                o[a] = d[VIZ.meta['y'][i]];

                            else if (a === tlabel)
                                o[a] = t; // T????

                            else if (a === 'z' && Y)
                                o[a] = o[a];

                            else o[a] = d[VIZ.meta[a]];
                        }
                    });
                });
                O.map(function(o){ VIZ.data.push(o); });
            });
            transition();
        }

        if (VIZ.stream) {
            io.connect(VIZ.meta.host).on(VIZ.meta.source, parse);
        }

        else if (VIZ.dynamic && VIZ.meta.refresh > 0) {
            VIZ.interval = window.setInterval(
                    function(){ VIZ.refresh(transition); },
                                1000 * Math.max(1, VIZ.meta.refresh));
        }
    };


    window.VIZ = VIZ;
})(window);
