(function(window) {
    'use strict';

    var VIZ = window.VIZ || {};

    /******************************************************************
        categoric parameter on the legend
     ******************************************************************/
    VIZ.categoricParameter = function(legend, color, select, deselect, labels) {
        color = color || function(z,i){ return 'gray'; };
        select = select || function(z,i){};
        deselect = deselect || function(){};
        labels = labels || function(z){ return VIZ.format('zformat')(z); };

        var Z = VIZ.conf['zdomain'],
            hist = VIZ.meta.summary.z.hist,
            norm = d3.sum(hist),
            R = 30,

            arc = d3.arc()
                .outerRadius(R)
                .innerRadius(R/2),

            pie = d3.pie()
                .value(function(d){ return d; })
                .sort(null);

        VIZ.conf['selected'] = VIZ.conf['selected'] ||
                Z.map(function(d){ return 1; });

        function arcTween(a) {
            var i = d3.interpolate(this._current, a);
            this._current = i(0);
            return function(t) { return arc(i(t)); };
        }

        function transition() {
            Z = VIZ.conf['zdomain'];
            hist = VIZ.meta.summary.z.hist;
            norm = d3.sum(hist);

            var donut = legend
                .select('#pie')
                    .datum(hist)
                .selectAll('.arc')
                    .data(pie);

            var update = legend
                .selectAll('.legend')
                    .data(Z);

            donut.enter()
                .append('path')
                    .attr('class','arc')
                    .attr('d', arc)
                    .attr('fill',
                        function(d,i) {
                            return color(Z[i],i);
                        })
                    .attr('fill-opacity',
                        function(d,i) {
                            return VIZ.selected[i] ? 0.5 : 0.1;
                        })
                .each(function(d){ this._current = d; });

            donut.exit()
                .remove();

            update.enter()
                .append('g')
                    .attr('class','legend')
                    .attr('transform',
                        function(d,i) {
                            return 'translate('+ [0,10 +2*R +20*(i+0.5)] +')';
                        })
                    .on(_CLICK, VIZ.select)
                    .style('opacity', 1);

            update.exit()
                .remove();

            update.select('text')
                .text(function(d,i) {
                        return d3.format('.2%')(hist[i]/norm); });

            if (VIZ.image) donut.attrTween('d', arcTween);

            else donut.transition().duration(VIZ.conf['transition'])
                        .attrTween('d', arcTween);
            reset();
        }

        function reset() {
            legend.selectAll('.legend')
                .style('opacity',
                    function(d,i) {
                        return VIZ.conf['selected'][i] ? 1 : 0.3;
                    });

            legend.selectAll('.arc')
                .attr('fill-opacity',
                    function(d,i) {
                        return VIZ.conf['selected'][i] ? 0.5 : 0.1;
                    });

            VIZ.conf['selected'].map(select);
        }

        VIZ.select = function(d,i) {
            if (d3.sum(VIZ.conf['selected']) === VIZ.conf['selected'].length)
                VIZ.conf['selected'] = Z.map(function(z,j){ return j === i ? 1 : 0; });
            else VIZ.conf['selected'][i] = VIZ.conf['selected'][i] ? 0 : 1;

            reset();
            if (!d3.max(VIZ.conf['selected']) || d3.min(VIZ.conf['selected'])) {
                VIZ.deselect();
                deselect();
            }
        };

        VIZ.deselect = function() {
            VIZ.conf['selected'] = Z.map(function(d){ return 1; });

            legend.selectAll('.legend')
                .style('opacity', 1);

            legend.selectAll('.arc')
                .attr('fill-opacity', 0.5);
        };

        legend.attr('transform','translate('+ [VIZ.width +30, 10] +')');

        legend.append('g')
                .attr('id','pie')
                .attr('transform','translate('+ [R,R] +')')
                .datum(hist)
            .selectAll('.arc')
                .data(pie).enter()
                    .append('path')
                        .attr('class','arc')
                        .attr('fill',
                            function(d,i) {
                                return color(Z[i],i);
                            })
                        .attr('fill-opacity', 0.5)
                        .style('cursor','pointer')
                        .attr('d', arc)
                        .on(_CLICK, function(d,i){ VIZ.select(Z[i],i); })
                        .each(function(d){ this._current = d; });

        legend.select('#pie')
            .append('text')
                .attr('class','label')
                .attr('text-anchor','middle')
                .attr('dy','.25em')
                .text('[z]')
                .on(_IN,
                    function() {
                        VIZ.info.show(VIZ.meta.zlabel || VIZ.meta.z, [
                            VIZ.margin.left + VIZ.width + R +20,
                            VIZ.margin.top + R +10], true);
                    })
                .on(_OUT, function(){ VIZ.info.hide(); });

        legend.selectAll('.legend')
            .data(Z).enter()
                .append('g')
                    .attr('class','legend')
                    .attr('transform',
                        function(d,i) {
                            return 'translate('+ [0,30+2*R+20*(i+0.5)] +')';
                        })
                    .on(_IN,
                        function(z,i) {
                            VIZ.info.show(labels(z),[
                                VIZ.margin.left + VIZ.width +24,
                                VIZ.margin.top +95+20*(i+0.5)], true);
                        })
                    .on(_OUT, function(){ VIZ.info.hide(); })
                    .on(_CLICK, VIZ.select)
                    .style('opacity', 1);

        legend.select('.axis-label')
            .style('display','none');

        legend.selectAll('.legend')
            .append('circle')
                .attr('transform','translate(6,-6)')
                .attr('r', 6)
                .attr('fill', color)
                .attr('fill-opacity', 0.5);

        legend.selectAll('.legend')
            .append('text')
                .attr('class','label')
                .attr('transform','translate(18,1)')
                .attr('dy','-.15em')
                .text(function(d,i) {
                    return d3.format('.2%')(hist[i]/norm); });

        legend.reset = reset;
        legend.transition = transition;

        return legend;
    };


    window.VIZ = VIZ;
})(window);
