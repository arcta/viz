(function(window) {
    'use strict';

    var VIZ = window.VIZ || {};

    VIZ.area = function() {
        VIZ.switch = Infinity;

        VIZ.conf['mode'] = VIZ.conf['mode'] || VIZ.meta['mode'] || 'base';
        VIZ.conf['translate'] = VIZ.conf['translate'] || 0;
        VIZ.conf['scale'] = VIZ.conf['scale'] || 1;
        VIZ.conf['selected'] = VIZ.conf['selected'] || null;
        VIZ.conf['plot'] = VIZ.conf['plot'] || [1,1];
        VIZ.conf['pin'] = VIZ.conf['pin'] || false;

        /**************************************************************
            VIZ shoud know if it was modified
         **************************************************************/
        var translate = VIZ.conf['translate'],
            scale = VIZ.conf['scale'],
            selected = VIZ.conf['selected'] ? VIZ.conf['selected'].slice() : [];

        VIZ.modified = function() {
            if (VIZ.conf['pin'])
                return true;

            if (VIZ.conf['mode'] !== 'base')
                return true;

            if (VIZ.conf['scale'] !== scale )
                return true;

            if (VIZ.conf['translate'] !== translate )
                return true;

            if (!VIZ.selected || d3.max(VIZ.selected) === 0)
                return false;

            for (var i = 0; i < VIZ.selected.length; ++i)
                if (!selected[i] || VIZ.selected[i] !== selected[i])
                    return true;

            return false;
        };

        /**************************************************************
            common build
         **************************************************************/
        var plot = VIZ.plot();

        translate *= VIZ.width/VIZ.conf['plot'][0];

        /**************************************************************
            local functionality
         **************************************************************/
        function conf() {
            if (d3.event) {
                VIZ.conf['translate'] = d3.event.translate || VIZ.conf['translate'];
                VIZ.conf['scale'] = d3.event.scale || VIZ.conf['scale'];
            }

            var xdomain = VIZ.x.domain(), ydomain = VIZ.y.domain();

            if ('date' === VIZ.meta['summary']['x']['type'])
                xdomain = [ xdomain[0].getTime()/1000, xdomain[1].getTime()/1000 ];

            if ('date' === VIZ.meta['summary']['y']['type'])
                ydomain = [ ydomain[0].getTime()/1000, ydomain[1].getTime()/1000 ];

            VIZ.conf['xdomain'] = xdomain;
            VIZ.conf['ydomain'] = ydomain;
            VIZ.conf['selected'] = VIZ.selected;
            VIZ.conf['plot'] = [ VIZ.width, VIZ.height ];

            VIZ.meta['mode'] = VIZ.conf['mode'];
        }

        function color(d,i) {
            return VIZ.color(d,i);
        }

        function display(d,i) {
            if (data.length === 1) return 'block';
            return VIZ.selected[i] || !d3.max(VIZ.selected) ? 'block':'none';
        }

        function select(d,i) {
            VIZ[VIZ.conf['mode']](500);
        }

        function deselect(d,i) {

        }

        function zoom() {
            var e = d3.event || VIZ.conf;
            VIZ.callAxes();
            plot.selectAll('.area')
                .attr('d', function(d){ return area(d.values); });

            if (VIZ.conf['pin'])
                align(VIZ.conf['pin'], 1);
            conf();
        }

        VIZ.zoom = d3.behavior.zoom()
            .x(VIZ.x)
            .scaleExtent([Math.min(1,VIZ.conf['scale']),Infinity])
            .on('zoom', zoom);

        /**************************************************************
            display modes
         **************************************************************/
        function value(d){ return d.y; }

        function reset() {
            data = []; D = 0;

            Z.map(function(z) {
                data.push({ z:z, values:[] });
            });

            VIZ.data.map(function(d) {
                var z = Z.indexOf(d.z),
                    ok = !VIZ.selected || VIZ.selected[z] || !d3.max(VIZ.selected);
                data[Z.indexOf(d.z)].values.push({ x: d.x, y: ok? d.y : 0 });
            });
        }

        function transition(t) {
            VIZ.callAxes();

            if (VIZ.image || !t)
                plot.select('#area').datum(data)
                    .selectAll('.area').data(layers)
                        .attr('d', function(d){ return area(d.values); });
            else
                plot.select('#area').datum(data)
                    .selectAll('.area').data(layers)
                        .transition()
                        .duration(t || 500)
                            .attr('d', function(d){ return area(d.values); });

            if (VIZ.conf['pin'])
                align(VIZ.conf['pin'], t || 500);
        }

        VIZ.base = function(t) {
            reset();

            layers = d3.layout.stack()
                .values(function(d){ return d.values; });

            D = d3.max(data[0].values.map(function(d,i) {
                return d3.sum(data, function(D){ return D.values[i].y; });
            }));

            VIZ['y'].domain([0,D]);

            VIZ.yAxis
                .tickValues(null)
                .tickFormat(VIZ.format('yformat'));

            transition(t);
        };

        VIZ.normalize = function(t) {
            reset();
            layers = d3.layout.stack()
                .values(function(d){ return d.values; });

            var norm = data[0].values.map(function(d,i) {
                return d3.sum(data, function(D){ return D.values[i].y; }) || 1;
            });

            data.map(function(d,i) {
                d.values.map(function(D,I){ D.y /= norm[I]; });
            });

            VIZ['y'].domain([0,1]);

            VIZ.yAxis
                .tickValues([0.25, 0.5, 0.75])
                .tickFormat(d3.format('%'));

            transition(t);
        };

        VIZ.wiggle = function(t) {
            reset();
            layers = d3.layout.stack()
                .offset('wiggle') //minimize weighted change in slope
                .values(function(d){ return d.values; })(data);

            D = 0;
            layers.map(function(d){
                D = Math.max(D, d3.max(d.values, function(v){ return v.y + v.y0;  }));
            });

            VIZ['y'].domain([0,D]);

            VIZ.yAxis
                .tickValues([D/2])
                .tickFormat('');

            transition(t);
        };

        /**************************************************************
            data transition
         **************************************************************/
        function transform() {
            data = [];
            VIZ.data.sort(function(a,b){ return a.x - b.x; });

            if ('z' in VIZ.meta) {
                Z = 'z' in VIZ.meta ? VIZ.meta['summary']['z']['domain'] || VIZ.zdomain : [];

                Z.map(function(z) {
                    data.push({ z:z, values:[] });
                });

                VIZ.data.map(function(d) {
                    data[Z.indexOf(d.z)].values.push({ x:d.x, y:0 });
                });

            } else {
            /**********************************************************
                single line
             **********************************************************/
                Z = [''];
                data.push({ z:'', values:[] });

                VIZ.data.map(function(d) {
                    d.z = '';
                    data[0].values.push({ x:d.x, y:0 });
                });
            }

            /**********************************************************
                resolve bookmark if any
             **********************************************************/
            if (VIZ.bookmark) VIZ.set(zoom);

            VIZ[VIZ.conf['mode']](500);
            mode();

            if (VIZ.conf['pin']) align(VIZ.conf['pin'], 1);

            /**********************************************************
                data transition
             **********************************************************/
            var update = plot.select('#area').datum(data)
                                .selectAll('.area').data(layers);

            update.enter()
                .append('path')
                    .attr('class','area');

            update.exit()
                .remove();

            update
                .attr('fill',
                    function(d) {
                        return d.z ? color(d.z, Z.indexOf(d.z)) : color();
                    });

            if (VIZ.image) {
                if (VIZ.stream) d3.select(".x.axis").call(VIZ.xAxis);
                if (VIZ.conf['pin']) align(VIZ.conf['pin']);

                update
                    .attr('d',
                        function(d) {
                            return area(d.values);
                        });

            } else {
                if (VIZ.stream) {
                    d3.select('#align')
                        .attr('transform','translate('
                                + [VIZ.margin.left+VIZ.width, VIZ.margin.top] +')');

                    var t = new Date(),
                        t0 = t.getTime()/1000 - (VIZ.meta['window'] || 60),
                        n = data[0].values.length,
                        x0 = n ? VIZ.x(data[0].values[0].x) : VIZ.width,
                        x1;

                    VIZ.x.domain([new Date(1000*t0), t]);
                    x1 = n ? VIZ.x(data[0].values[0].x) : VIZ.width;

                    //d3.transition().duration(500)
                        d3.select('.x.axis').call(VIZ.xAxis);

                    update
                        .attr('d', function(d){ return area(d.values); })
                        //.attr('transform','translate('+ [x0,0] +')')
                        .transition()
                        .duration(500)
                            .attr('d', function(d){ return area(d.values); })
                            //.attr('transform','translate('+ [x1,0] +')');

                    if (n > 0) align(n-1, 500);

                } else {
                    update
                        .transition()
                        .duration(500)
                            .attr('d',
                                function(d) {
                                    return area(d.values);
                                });

                    if (VIZ.conf['pin']) align(VIZ.conf['pin'], 500);
                }
            }
        }

        /**************************************************************
            init with empty data
         **************************************************************/
        var Z = 'z' in VIZ.meta ? VIZ.meta['summary']['z']['domain'] : [''],
            D, DY, data = [], tween = [],
            legend = 'z' in VIZ.meta,

            area = d3.svg.area()
                .interpolate(VIZ.meta['interpolate'] ? 'basis':'line')
                .x(function(d){ return VIZ.x(d.x); })
                .y0(function(d){ return VIZ.y(d.y0); })
                .y1(function(d){ return VIZ.y(d.y0 + d.y); }),

            layers = d3.layout.stack()
                .values(function(d){ return d.values; });

        plot.append('g').attr('id','area');

        /**************************************************************
            axis on the top
         **************************************************************/
        VIZ.buildAxes();

        VIZ.xAxis
            .ticks(3)
            .outerTickSize(4);

        VIZ.yAxis
            .ticks(3)
            .tickSize(-VIZ.width -20)
            .outerTickSize(4);

        /**************************************************************
            mouse-over
         **************************************************************/
        VIZ.canvas.append('g')
            .attr('id','align')
                .on(_CLICK, pin)
            .style('display','none')
                .append('line')
                    .attr('x1',0)
                    .attr('x2',0)
                    .attr('y1',0)
                    .attr('y2',VIZ.height +20);

        d3.select('#align').append('text')
            .attr('class','label');

        d3.select('#align').selectAll('g')
            .data(d3.range(Z.length)).enter()
                .append('g')
                    .attr('class','dot')
                .append('circle')
                    .attr('r', 15)
                    .attr('fill',
                        function(i) {
                            return Z ? color(Z[i],i) : color();
                        })
                    .attr('fill-opacity', 0.2);

        d3.select('#align').selectAll('.dot')
            .append('circle')
                .attr('r', 4)
                .attr('stroke',
                    function(i) {
                        return Z ? color(Z[i],i) : color();
                    })
                .attr('stroke-width', 3)
                .attr('fill','white');

        d3.select('#align').append('path')
            .attr('transform','translate(0,-20)')
            .attr('d','M-6 0 L6 0 L3 8 L5 10 L1 10 L0 20 L-1 10 L-5 10 L-3 8 Z')
            .attr('id','pin');

        VIZ.frame(plot);

        function find(x) {
            for (var i = 0; i < data[0].values.length; ++i)
                if (VIZ.x(data[0].values[i].x) >= x) return i;
            return data[0].values.length -1;
        }

        function align(i,t) {
            var x = VIZ.x(data[0].values[i].x),
                text = VIZ.format('xformat')(data[0].values[i].x);

            if (x < 0 || x > VIZ.width) {
                d3.select('#align')
                    .style('display','none');

                d3.select('#pin')
                    .style('display','none');

                return;
            }

            if (legend) {
                legend.select('.axis-label')
                    .text((VIZ.meta['xlabel'] || VIZ.meta['x']) +': '+ text);

                legend.selectAll('.legend').select('text')
                    .text(
                        function(D,I) {
                            if ('normalize' === VIZ.conf['mode'])
                                return D +': '+ d3.format('%')(data[I].values[i].y);
                            return D +': '+ VIZ.format('yformat')(data[I].values[i].y);
                        });
            } else {
                text = (VIZ.meta['xlabel'] || VIZ.meta['x']) +': '+ text
                        +'; '+ (VIZ.meta['ylabel'] || VIZ.meta['y'])
                        +': '+ VIZ.format('yformat')(data[0].values[i].y);

                d3.select('#align').select('text')
                    .attr('dx', x > VIZ.width/2 ? -15:15)
                    .style('text-anchor', x > VIZ.width/2 ? 'end':'start')
                    .text(text);
            }

            d3.select('#pin')
                .style('display', VIZ.conf['pin'] ? 'block':'none');


            if (VIZ.image)
                d3.select('#align')
                    .style('display','block')
                    .attr('transform','translate('+ [VIZ.margin.left+x, VIZ.margin.top] +')')
                    .selectAll('.dot')
                        .style('display', display)
                        .attr('transform',
                            function(D,I) {
                                return 'translate('+ [0,VIZ.y(data[I].values[i].y + data[I].values[i].y0)] +')';
                            });
            else
                d3.select('#align')
                    .style('display','block')
                    .transition()
                    .duration(t || 100)
                        .attr('transform','translate('+ [VIZ.margin.left+x, VIZ.margin.top] +')')
                        .selectAll('.dot')
                        .style('display', display)
                        .attr('transform',
                            function(D,I) {
                                return 'translate('+ [0,VIZ.y(data[I].values[i].y + data[I].values[i].y0)] +')';
                            });
        }

        function pin() {
            if (VIZ.stream) return;

            var X = d3.event.pageX - VIZ.margin.left,
                i = find(X), x = VIZ.x(data[0].values[i].x);

            VIZ.conf['pin'] = VIZ.conf['pin'] ? false : i;
            align(i);
        }

        plot.append('rect')
            .attr('class','tooltip-overlay')
            .attr('width', VIZ.width)
            .attr('height', VIZ.height)
            .on(_MOVE,
                function() {
                    var X = d3.event.pageX - VIZ.margin.left,
                        i = find(X);
                    if (!VIZ.conf['pin'])
                        align(i);
                })
            .on(_OUT,
                function(d) {
                    if (VIZ.conf['pin']) return;

                    d3.select('#align')
                        .style('display','none');

                    VIZ.info.hide();

                    if (legend) {
                        legend.select('.axis-label')
                            .text(VIZ.meta['zlabel'] || '');

                        legend.selectAll('.legend').select('text')
                            .text(function(D,I){ return D; });
                    }
                })
            .on(_CLICK, pin);

        if (legend) {
            /**********************************************************
                set legend
             **********************************************************/
            legend = VIZ.legend();
            legend = VIZ.legendPie(legend, color, select, deselect);

            legend.selectAll('.legend')
                .append('rect')
                    .attr('transform', function(d,i){ return 'translate('+ [0,-12] +')'; })
                    .attr('width', 12)
                    .attr('height', 12)
                    .attr('fill', color)
                    .attr('fill-opacity', 0.5);
        }

        /**************************************************************
            enable mode control
         **************************************************************/
        var control = d3.select('#plot')
            .append('g')
                .attr('class','ctrl')
                .style('display', VIZ.image ? 'none':'block')
                .attr('transform','translate('+ [VIZ.width +10, 20] +')')
                .on(_OUT, function(d){ VIZ.info.hide(); });

        function mode() {
            control.selectAll('g')
                .attr('id', function(d){ return d; })
                .style('cursor',
                    function(d){
                        return d === VIZ.conf['mode'] ? 'default':'pointer';
                    })
                .style('opacity',
                    function(d){
                        return d === VIZ.conf['mode'] ? 1 : 0.4;
                    });
        }

        function camelize(str) {
            return str.charAt(0).toUpperCase() + str.substr(1);
        }

        control.selectAll('g')
            .data(legend ? ['base','normalize','wiggle'] : ['base','wiggle']).enter()
                .append('g')
                    .attr('id', function(d){ return d; })
                    .attr('transform', function(d,i){ return 'translate('+ [10, 10+20*i] +')'; })
                    .on(_IN,
                        function(d,i) {
                            VIZ.info.show(camelize(d), [VIZ.margin.left + VIZ.width, VIZ.margin.top +100 +30*i]);
                        })
                    .on(_CLICK,
                        function(d) {
                            VIZ.conf['mode'] = d;
                            mode();
                            VIZ[d](500);
                        })
                .append('rect')
                    .attr('transform','translate(-4,-4)')
                    .attr('width', 20)
                    .attr('height', 20)
                    .attr('fill','white');

        control.select('#base').selectAll('path')
            .data([3,7,5,0,4]).enter()
                .append('path')
                    .attr('transform', function(d,i){ return 'translate('+ [i*3,0] +')'; })
                    .attr('d', function(d){ return 'M0 '+ d +' L0 14'; });

        control.select('#normalize').selectAll('path')
            .data(d3.range(5)).enter()
                .append('path')
                    .attr('transform', function(d){ return 'translate('+ [d*3,0] +')'; })
                    .attr('d','M0 0 L0 14');

        control.select('#wiggle').selectAll('path')
            .data([5,11,9,15,7]).enter()
                .append('path')
                    .attr('transform', function(d,i){ return 'translate('+ [i*3,0] +')'; })
                    .attr('d', function(d){ return 'M'+ [0,(15-d)/2] +' L'+ [0,(15+d)/2]; });

        /**************************************************************
            get actual data in
         **************************************************************/
        transform();
        VIZ.transition(transform);

        /**************************************************************
            enable common utilities
         **************************************************************/
        VIZ.utils(conf);
        VIZ.tooltip();
        VIZ.done();
    }

    window.VIZ = VIZ;
})(window);
