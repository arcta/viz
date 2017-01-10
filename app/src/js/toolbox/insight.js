(function(window) {
    'use strict';

    var VIZ = window.VIZ || {};

    /******************************************************************
        attached list of saved insights ( bookmarked settings )
     ******************************************************************/
    function show(d) {
        VIZ.target(d);
        if (typeof(VIZ.reset) ==='function') VIZ.reset();
        VIZ.InsightCTRL.deactivate();
    }

    function render() {
        d3.select('#InsightScreen')
            .select('rect')
                .attr('width', window.innerWidth)
                .attr('height', window.innerHeight)
                .attr('transform','translate('+ [-VIZ.margin.left, -VIZ.margin.top] +')');

        d3.select('#InsightScreen')
            .append('g')
                .attr('id','legendInfo');

        d3.select('#InsightScreen').selectAll('text')
            .data(Object.keys(VIZ.insights)).enter()
                .append('text')
                    .attr('transform',
                        function(d,i) {
                            return 'translate('+ [0.95 * window.innerWidth - VIZ.margin.left, 50+i*30] +')';
                        })
                    .attr('text-anchor','end')
                    .text(function(d,i){ return '[ '+ decodeURIComponent(d) +' ] @'; })
                    .on(_CLICK, show);

        d3.select('#InsightScreen')
            .append('text')
                .attr('transform','translate('+ [0.95 * window.innerWidth - VIZ.margin.left, 10] +')')
                .attr('text-anchor','end')
                .text('[ original non-modified view ] @')
                .on(_CLICK, show);

        d3.select('#Insight').append('path')
            .attr('transform','translate(30,0) rotate(30) scale(0.8)')
            .attr('d','M0 16 L0 2 A6 6 0 0 1 13 2 L13 26 A5 5 0 0 1 3 26 L3 7 A3 3 0 0 1 9 7 L9 18');
    }

    function check() {
        return (VIZ.static && (!VIZ.published || Object.keys(VIZ.insights).length > 0));
    }

    VIZ.InsightCTRL = new VIZ.Control('Insight','Show saved markers',
                            true,   //has screen
                            null,   //no action
                            null,   //default mouse-over
                            null,   //default mouse-out
                            render,
                            check);

    window.VIZ = VIZ;
})(window);
