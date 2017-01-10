(function(window) {
    'use strict';

    var VIZ = window.VIZ || {};

    /******************************************************************
        numerical parameter on the legend
     ******************************************************************/
    VIZ.numericParameter = function(legend, color, select, deselect) {
        color = color || function(d){ return 'gray'; };
        select = select || function(i){};
        deselect = deselect || function(){};

        var Z = VIZ.conf['zdomain'],
            bins = VIZ.meta.summary.z.hist,
            max = d3.max(bins) || 1,
            N = VIZ.conf['zbins'],
            H = Math.min(VIZ.height -20, 200),
            w = 50, h = H/N, hist;

        legend.attr('transform','translate('+
                        [ VIZ.width +30, (VIZ.height -H)/2 +10 ] +')');

        legend.select('.axis-label')
            .attr('transform','translate(35,-10)')
            .attr('text-anchor','middle')
            .attr('dy','.25em')
            .text(VIZ.meta.z ? '[z]':'')
            .on(_IN,
                function() {
                    VIZ.info.show(VIZ.meta.zlabel || VIZ.meta.z, [
                        VIZ.margin.left + VIZ.width + 52,
                        VIZ.margin.top +(VIZ.height -H)/2 -10], true);
                })
            .on(_OUT, function(){ VIZ.info.hide(); });

        VIZ.z.range([H +2, 0]);
        VIZ.zAxis.ticks(4).tickSizeInner(14);

        VIZ.conf['selected'] = VIZ.conf['selected'] ||
                    d3.range(N).map(function(d){ return 1; });

        function reset() {
            legend.select('#hist').selectAll('.hist')
                .attr('fill-opacity',
                    function(d,i) {
                        return VIZ.conf['selected'][i] ? 1 : 0.5;
                    });

            VIZ.conf['selected'].map(select);
        }

        function transition() {
            Z = VIZ.conf['zdomain'];
            bins = VIZ.meta.summary.z.hist;
            max = d3.max(bins) || 1;
            N = VIZ.conf['zbins'];
            h = H/N;

            VIZ.z.domain(Z);

            hist = legend.select('#hist')
                .selectAll('.hist').data(d3.range(N));

            hist.enter()
                .append('rect')
                    .classed('hist', true)
                //.merge(hist)
                    .attr('transform',
                        function(d,i) {
                            return 'translate('+ [42,h*(N-i-1)] +')';
                        })
                    .attr('width',
                        function(i){ return w*bins[i]/max; })
                    .attr('height', h)
                    .attr('fill',
                        function(i) {
                            return color(Z[0]+i*(Z[1]-Z[0])/N);
                        })
                    .attr('fill-opacity', 1)
                    .on(_CLICK, VIZ.select);

            hist.exit()
                .remove();

            if (VIZ.image) {
                legend.select('#scale').select('.z')
                    .call(VIZ.zAxis);

                legend.select('#scale').selectAll('.grad')
                    .attr('fill',
                        function(i) {
                            return color(Z[0]+i*(Z[1]-Z[0])/20);
                        });

                hist.attr('width',
                        function(i){ return w*bins[i]/max; })
                    .attr('fill',
                        function(i) {
                            return color(Z[0]+i*(Z[1]-Z[0])/N);
                        })
                    .attr('fill-opacity',
                        function(i) {
                            return VIZ.conf['selected'][i] ? 1 : 0.5;
                        });
            } else {
                legend.select('#scale').select('.z')
                    .transition().duration(50)
                        .call(VIZ.zAxis);

                legend.select('#scale').selectAll('.grad')
                    .transition().duration(VIZ.conf['transition'])
                        .attr('fill',
                            function(i) {
                                return color(Z[0]+i*(Z[1]-Z[0])/20);
                            });

                hist.transition().duration(VIZ.conf['transition']/2)
                    .attr('width',
                        function(i){ return w*bins[i]/max; })
                    .attr('fill',
                        function(i) {
                            return color(Z[0]+i*(Z[1]-Z[0])/N);
                        })
                    .attr('fill-opacity',
                        function(i) {
                            return VIZ.conf['selected'][i] ? 1 : 0.5;
                        });
            }
        }

        legend.append('g')
                .attr('id','scale')
                .attr('transform','translate(40,0)')
            .selectAll('.grad')
            .data(d3.range(20)).enter()
                .append('rect')
                    .attr('class','grad')
                    .attr('transform',
                        function(d,i) {
                                return 'translate('+ [-10, H*(20-i-1)/20] +')';
                            })
                    .attr('width', 10)
                    .attr('height', H/20)
                    .attr('fill',
                        function(d,i) {
                            return color(Z[0]+i*(Z[1]-Z[0])/20,i);
                        });

        legend.select('#scale').append('g')
            .attr('class','z')
            .attr('transform','translate(0,-1)')
            .call(VIZ.zAxis);

        legend.append('g').attr('id','hist');

        VIZ.select = function(i) {
            if (d3.sum(VIZ.conf['selected']) === VIZ.conf['selected'].length)
                VIZ.conf['selected'] = d3.range(VIZ.conf.zbins)
                    .map(function(n,j){ return j === i ? 1 : 0; });
            else VIZ.conf['selected'][i] = VIZ.conf['selected'][i] ? 0 : 1;

            reset();
            if (!d3.max(VIZ.conf['selected']) || d3.min(VIZ.conf['selected'])) {
                VIZ.deselect();
                deselect();
            }
        };

        VIZ.deselect = function() {
            VIZ.conf['selected'] = d3.range(VIZ.conf.zbins)
                .map(function(d){ return 1; });
            legend.select('#hist').selectAll('.hist')
                .attr('fill-opacity', 1);
            deselect();
        };

        transition();

        legend.reset = reset;
        legend.transition = transition;

        return legend;
    };


    window.VIZ = VIZ;
})(window);
