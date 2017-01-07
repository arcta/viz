(function(window) {
    'use strict';

    var VIZ = window.VIZ || {};

    /******************************************************************
        enable viewport selection
     ******************************************************************/
    function render() {
        d3.select('#Zoom').append('path')
            .attr('d','M10 10 L14 14')
            .style('stroke-width', 4);

        d3.select('#Zoom').append('circle')
            .attr('r', 6)
            .attr('transform','translate(6,6)');

        VIZ.zoom = VIZ.zoom || d3.zoom();

        d3.select('#ZoomScreen')
            .select('rect')
                .call(VIZ.zoom);
    }

    function check() {
        return (VIZ.static || (VIZ.dynamic && !VIZ.meta.refresh));
    }

    VIZ.ZoomCTRL = new VIZ.Control('Zoom','Toggle zoom',
                            true,   //has screen
                            null,   //no action
                            null,   //default mouse-over
                            null,   //default mouse-out
                            render,
                            check);

    window.VIZ = VIZ;
})(window);
