(function(window) {
    'use strict';

    var VIZ = window.VIZ || {};

    /******************************************************************
        categorical parameter on the legend 
     ******************************************************************/
    VIZ.legendPie = function(legend, color, select, deselect, domain, datum) {
        color = color || function(d,i){ return 'gray'; };
        select = select || function(d,i){};
        deselect = deselect || function(d,i){};

        var Z, P, D, ord, norm;
        calc();

        var R = D.length >= VIZ.switch ? Math.min(VIZ.margin.right/3, 40) : 0,
            H = 20*Math.min(8, Z.length +1) +2*R,

            arc = d3.svg.arc()
                .outerRadius(R)
                .innerRadius(R/3),

            pie = d3.layout.pie()
                .value(function(d){ return d; })
                .sort(null);

        VIZ.selected = VIZ.conf['selected'] || Z.map(function(d){ return 0; });

        VIZ.select = function(d,i) {
            VIZ.selected[i] = VIZ.selected[i] ? 0 : 1;

            legend.selectAll('.legend')
                .style('opacity',
                    function(D,I) {
                        return VIZ.selected[I] ? 1 : 0.3;
                    });

            legend.selectAll('.arc')
                .attr('fill-opacity',
                    function(D,I) {
                        return VIZ.selected[I] ? 0.5 : 0.1;
                    });

            select(d,i);

            if (!d3.max(VIZ.selected) || d3.min(VIZ.selected)) {
                VIZ.deselect();
                deselect();
            }
        };

        VIZ.deselect = function() {
            VIZ.selected = Z.map(function(d){ return 0; });

            legend.selectAll('.legend')
                .style('opacity', 1);

            legend.selectAll('.arc')
                .attr('fill-opacity', 0.5);
        };

        function calc() {
            if (VIZ.stream) {
                Z = VIZ.zdomain;
                P = Z.map(function(z){ return 0 });
                VIZ.data.map(function(d){ P[Z.indexOf(d.z)]++; });
            } else {
                Z = VIZ.meta['summary']['z']['domain'];
                P = VIZ.meta['summary']['z']['hist'];
            }
            D = VIZ.data;
            norm = d3.sum(P);
        }

        function arcTween(a) {
            var i = d3.interpolate(this._current, a);
            this._current = i(0);
            return function(t) { return arc(i(t)); };
        }

        function transition() {
            calc();

            var donut = legend
                .select('#pie')
                    .datum(P)
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
                        function(D,I) {
                            return VIZ.selected[I] ? 0.5 : 0.1;
                        })
                .each(function(d){ this._current = d; });

            donut.exit()
                .remove();

            update.enter()
                .append('g')
                    .attr('class','legend')
                    .on(_CLICK, VIZ.select)
                    .style('opacity', 1);

            update.exit()
                .remove();

            update.attr('transform',
                function(d,i) {
                    return 'translate('+ [0,10 +2*R +20*(i+0.5)] +')';
                });

            update.select('text')
                .text(
                    function(d,i){
                        if (VIZ.data.length < VIZ.switch) return d;
                        return d +' ( '+ d3.format('%')(parseInt(P[i],10)/norm) +' )';
                    });

            if (VIZ.image)
                return donut
                    .attrTween('d', arcTween);

            donut.transition()
                .duration(250)
                    .attrTween('d', arcTween);
        }

        legend.attr('transform','translate('+
                        [VIZ.width +30, VIZ.height -H] +')');

        legend.selectAll('.legend')
            .data(Z).enter()
                .append('g')
                    .attr('class','legend')
                    .attr('transform',
                        function(d,i) {
                            return 'translate('+ [0,10 +2*R +20*(i+0.5)] +')';
                        })
                    .on(_CLICK, VIZ.select)
                    .style('opacity', 1);

        legend.select('.legend-rect')
            .attr('transform','translate(-10,-10)')
            .attr('width', VIZ.margin.right -45)
            .attr('height', H +10);

        if (H > VIZ.margin.right -30)
            legend.select('.axis-label')
                .style('text-anchor','middle')
                .attr('transform','translate('+ [VIZ.margin.right -48, H/2] +') rotate(90)');
        else
            legend.select('.axis-label')
                .style('text-anchor','start')
                .attr('transform','translate(0,-16)');

        legend
            .append('g')
                .attr('id','pie')
                .attr('transform','translate('+ [Math.min(15+R, (VIZ.margin.right -65)/2), R] +')')
                .datum(P)
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

        legend.selectAll('.legend')
            .append('text')
                .attr('class','label')
                .attr('transform','translate(20,0)')
                .attr('dy','-.15em')
                .text(
                    function(d,i){
                        if (VIZ.data.length < VIZ.switch) return d;
                        return d +' ( '+ d3.format('%')(P[i]/norm) +' )';
                    });

        legend.transition = transition;

        if (VIZ.conf['selected'] && d3.max(VIZ.conf['selected'])) {
            legend.selectAll('.legend')
                .style('opacity',
                    function(D,I) {
                        return VIZ.selected[I] ? 1 : 0.3;
                    });

            legend.selectAll('.arc')
                .attr('fill-opacity',
                    function(D,I) {
                        return VIZ.selected[I] ? 0.5 : 0.1;
                    });

            VIZ.selected.map(function(i){ select(null,i); });
        }

        return legend;
    };

    /******************************************************************
        numerical parameter on the legend
     ******************************************************************/
    VIZ.legendHist = function(legend, color, select, deselect, domain, datum) {
        var Z = domain || VIZ.meta['summary']['z']['domain'] || VIZ.zdomain,
            D = datum || VIZ.data,
            N = VIZ.conf['selected'] ? VIZ.conf['selected'][1] : 10,
            H = Math.min(VIZ.height, 200),
            w = 50, h = H/N;

        legend.attr('transform','translate('+ [VIZ.width +30, VIZ.height -H-20] +')');

        legend.select('.legend-rect')
            .attr('transform','translate('+ [-10,-20] +')')
            .attr('width', VIZ.margin.right -45)
            .attr('height', H +40)
            .call(d3.behavior.zoom()
                .scaleExtent([-64,64])
                .on('zoom', redraw));

        legend.select('.axis-label')
            .style('text-anchor','middle')
            .attr('transform','translate('+ [VIZ.margin.right -48, H/2] +') rotate(90)');

        VIZ.z.range([H+2,0]);
        VIZ.zAxis.tickSize(15);

        VIZ.selected = VIZ.conf['selected'] || [-1,N];

        VIZ.select = function(d,i) {
            if (VIZ.selected[0] === i && d !== null)
                return VIZ.deselect();

            VIZ.selected[0] = i;

            legend.selectAll('.hist')
                .attr('fill-opacity',
                    function(D,I) {
                        return I === i ? 1 : 0.5;
                    });

            select(d,i);
        };

        VIZ.deselect = function() {
            VIZ.selected[0] = -1;

            legend.selectAll('.hist')
                .attr('fill-opacity', 1);

            deselect();
        };

        var scale = legend.append('g')
            .attr('transform','translate('+ [VIZ.data.length < VIZ.switch ? 10:52, 0] +')');

        var hist = legend.append('g');

        hist.selectAll('.hist')
                .data([]).enter()
                    .append('rect')
                        .attr('class','hist');

        function calc() {
            var bins = d3.range(N).map(function(d){ return 0; }),
                n = (Z[1] - Z[0])/N;

            D.map(function(d) {
                var b = parseInt(Math.floor((d.z - Z[0])/n), 10);
                if (b > bins.length - 1) b = bins.length -1;
                bins[b] += 1;
            });

            return bins;
        }

        function redraw() {
        /**************************************************************
            change selection options, data stays the same
         **************************************************************/
            if (!VIZ.stream && D.length < VIZ.switch) return;

            if (d3.event) {
                VIZ.deselect();
                N = Math.max(2, Math.min(D.length, parseInt(d3.event.scale * 10, 10)));
                VIZ.selected = [-1,N];
                h = H/N;
            }

            var bins = calc(D),
                norm = d3.sum(bins),
                max = d3.max(bins) || 1,
                update = hist.selectAll('.hist').data(bins);

            update.enter()
                .append('rect')
                    .attr('class','hist');

            update.exit().remove();

            update
                .attr('transform',
                    function(d,i) {
                        return 'translate('+ [w*(1-d/max),h*(N-i-1)] +')';
                    })
                .attr('width', function(d,i){ return w*d/max; })
                .attr('height', h)
                .attr('fill', function(d,i){ return color(Z[0]+i*(Z[1]-Z[0])/N,i); })
                .on(_CLICK, VIZ.select);
        }

        function transition() {
        /**************************************************************
            data transition, selection options stay the same
         **************************************************************/
            D = VIZ.data;

            var bins = calc(D),
                norm = d3.sum(bins),
                max = d3.max(bins) || 1,
                update = hist.selectAll('.hist').data(bins);

            if (VIZ.conf['selected'] && VIZ.conf['selected'][0] !== -1)
                VIZ.select(null, VIZ.conf['selected'][0]);

            if (VIZ.image)
                return update
                        .attr('transform',
                            function(d,i) {
                                return 'translate('+ [w*(1-d/max),h*(N-i-1)] +')';
                            })
                        .attr('width', function(d,i){ return w*d/max; });
            update
                .transition()
                .duration(250)
                    .attr('transform',
                        function(d,i) {
                            return 'translate('+ [w*(1-d/max),h*(N-i-1)] +')';
                        })
                    .attr('width', function(d,i){ return w*d/max; });
        }

        scale.selectAll('.grad')
            .data(d3.range(20)).enter()
                .append('rect')
                    .attr('class','grad')
                    .attr('transform',
                        function(d,i) {
                                return 'translate('+ [1, H*(20-i-1)/20] +')';
                            })
                    .attr('width', 8)
                    .attr('height', H/20)
                    .attr('fill',
                        function(d,i) {
                            return color(Z[0]+i*(Z[1]-Z[0])/20,i);
                        });

        scale.append('g')
            .attr('class','z')
            .attr('transform','translate(0,-1)');

        scale.select('.z').call(VIZ.zAxis);

        redraw();
        legend.transition = transition;

        legend.domain = function(domain) {
            Z = domain || Z;
            D = VIZ.data;

            VIZ.z.domain(Z);

            scale.select('.z')
                .call(VIZ.zAxis);

            redraw();
        };

        if (VIZ.conf['selected'] && VIZ.conf['selected'][0] !== -1)
            VIZ.select(null, VIZ.conf['selected'][0]);

        return legend;
    };


    window.VIZ = VIZ;
})(window);
