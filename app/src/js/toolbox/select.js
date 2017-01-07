(function(window) {
    'use strict';

    var VIZ = window.VIZ || {};

    /******************************************************************
        enable viewport selection
     ******************************************************************/
    function render() {
        d3.select('#Select').append('path')
            .attr('d','M0 0 L0 10 L10 10 L10 0 Z')
            .style('stroke-opacity', 0.3);

        d3.select('#Select').append('path')
            .attr('d','M10 6 L10 14')
            .style('stroke-width', 2);

        d3.select('#Select').append('path')
            .attr('d','M6 10 L14 10')
            .style('stroke-width', 2);

        function start() {
            VIZ.SelectCTRL.start = false;
            VIZ.SelectCTRL.stop = false;

            d3.select('#SelectScreen')
                .append('path')
                    .attr('d','M0 0');
        }

        function stop() {
            var A = VIZ.SelectCTRL.start,
                B = VIZ.SelectCTRL.stop;

            ['x','y'].map(function(a,i) {
                if (VIZ.meta.summary[a].type !== 'categoric') {
                    var D = [ VIZ[a].invert(A[i]), VIZ[a].invert(B[i]) ];

                    if ('date' === VIZ.meta['summary'][a]['type'])
                        D = [ D[0].getTime(), D[1].getTime() ];

                    D.sort(function(a,b){ return a-b; });
                    VIZ.conf[a +'domain'] = D.slice();
                }
            });

            VIZ.reset();
            VIZ.SelectCTRL.deactivate();

            d3.select('#SelectScreen')
                .select('path')
                    .remove();
        }

        VIZ.drag = VIZ.drag || d3.behavior.drag();

        VIZ.drag.on('start', start);
        VIZ.drag.on('end', stop);

        d3.select('#SelectScreen')
            .select('rect')
                .call(VIZ.drag);

    }

    function check() {
        return (VIZ.static || (VIZ.dynamic && !VIZ.meta.refresh));
    }

    VIZ.SelectCTRL = new VIZ.Control('Select','Select viewport',
                                true,   //has screen
                                null,   //no action
                                null,   //default mouse-over
                                null,   //default mouse-out
                                render,
                                check);

    window.VIZ = VIZ;
})(window);
