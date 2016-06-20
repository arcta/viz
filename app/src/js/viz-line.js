(function(window) {
    'use strict';

    var VIZ = window.VIZ || {};

    VIZ.line = function() {
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
            d3.select('#plot').selectAll('.line')
                .style('display',
                    function(D,I) {
                        return VIZ.selected[Z.indexOf(D.z)] ? 'block':'none';
                    });

            legend.selectAll('.legend').select('.line')
                .style('display','block');

            if (VIZ.conf['pin'])
                d3.select('#align').selectAll('.dot')
                    .style('display', display);
        }

        function deselect(d,i) {
            d3.select('#plot').selectAll('.line')
                .style('display','block');

            if (VIZ.conf['pin'])
                d3.select('#align').selectAll('.dot')
                    .style('display','block');
        }

        function zoom() {
            var e = d3.event || VIZ.conf;
            VIZ.callAxes();
            plot.selectAll('.line')
                .attr('d', function(d){ return line(d.values); });

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
            data = [];

            Z.map(function(z) {
                data.push({ z:z, values:[] });
            });

            VIZ.data.map(function(d) {
                var z = Z.indexOf(d.z);
                data[Z.indexOf(d.z)].values.push({ x:d.x, y:d.y });
            });
        }

        function transition(t) {
            VIZ.callAxes();

            if (VIZ.image || !t)
                plot.datum(data).selectAll('.line').data(data)
                    .attr('d', function(d){ return line(d.values); });
            else
                plot.datum(data).selectAll('.line').data(data)
                    .transition()
                    .duration(t || 500)
                        .attr('d', function(d){ return line(d.values); });

            if (VIZ.conf['pin'])
                align(VIZ.conf['pin'], t || 500);
        }

        VIZ.base = function(t) {
            reset();

            var m = Infinity, M = -Infinity;
            data.map(function(d) {
                M = Math.max(M, d3.max(d.values, value));
                m = Math.min(m, d3.min(d.values, value));
            });

            DY = VIZ.meta['ylim'] ? VIZ.ydomain : [m,M];
            VIZ.y.domain(DY);
            VIZ.yAxis.tickFormat(VIZ.format('yformat'));
            VIZ.meta['mode'] = 'base';

            transition(t);
        };

        VIZ.normalize = function(t) {
            reset();

            var norm = data.map(function(d,i) {
                return d3.max(d.values, value)-d3.min(d.values, value) || 1;
            });

            var m = 1, M = -1;
            data.map(function(d,i) {
                var b = d3.min(d.values, value);
                d.values.map(function(D,I) {
                    D.y = (D.y - b)/norm[i];
                });
                M = Math.max(M, d3.max(d.values, value));
                m = Math.min(m, d3.min(d.values, value));
            });

            DY = [m,M];
            VIZ.y.domain(DY);
            VIZ.yAxis.tickFormat(d3.format('%'));
            VIZ.meta['mode'] = 'normalize';

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
                    data[Z.indexOf(d.z)].values.push({ x:d.x, y:d.y });
                });

            } else {
            /**********************************************************
                single line
             **********************************************************/
                Z = [''];
                data.push({ z:'', values:[] });

                VIZ.data.map(function(d) {
                    d.z = '';
                    data[0].values.push({ x:d.x, y:d.y });
                });
            }

            /**********************************************************
                resolve bookmark if any
             **********************************************************/
            if (VIZ.bookmark) VIZ.set(zoom);

            VIZ[VIZ.conf['mode']]();
            mode();

            /**********************************************************
                data transition
             **********************************************************/

            var update = plot.select('#lines')
                            .selectAll('.line').data(data);

            update.enter()
                .append('path')
                    .attr('class','line');

            update.exit()
                .remove();

            if (VIZ.image) {
                if (VIZ.stream) d3.select(".x.axis").call(VIZ.xAxis);
                if (VIZ.conf['pin']) align(VIZ.conf['pin']);

                update
                    .style('display', display)
                    .attr('stroke',
                        function(d) {
                            return d.z ? color(d.z, Z.indexOf(d.z)) : color();
                        })
                    .attr('d',
                        function(d) {
                            return line(d.values);
                        });

            } else {
                if (VIZ.stream) {
                    d3.select('#align')
                        .attr('transform','translate('
                                + [VIZ.margin.left+VIZ.width, VIZ.margin.top] +')');

                    var t = new Date(),
                        t0 = t.getTime()/1000 - (VIZ.meta['window'] || 60),
                        n = data[0].values.length;

                    VIZ.x.domain([new Date(1000*t0), t]);

                    d3.transition().duration(500)
                        .select('.x.axis').call(VIZ.xAxis);

                    update
                        .style('display', display)
                        .attr('stroke',
                            function(d) {
                                return d.z ? color(d.z, Z.indexOf(d.z)) : color();
                            })
                        .transition()
                        .duration(500)
                            .attr('d', function(d){ return line(d.values); });

                    if (n > 0) align(n-1, 500);

                } else {
                    data.map(function(d,i) {
                        if (i >= tween.length) tween.push({ z:d.z, values:[] });
                        d.values.map(function(v,j) {
                            if (j >= tween[i].values.length) tween[i].values.push({ x:v.x, y:0 });
                        });
                    });

                    update
                        .style('display', display)
                        .attr('stroke',
                            function(d) {
                                return d.z ? color(d.z, Z.indexOf(d.z)) : color();
                            })
                        .attr('d',
                            function(d,i) {
                                return line(tween[i].values);
                            })
                        .transition()
                        .duration(500)
                            .attr('d',
                                function(d) {
                                    return line(d.values);
                                });

                    if (VIZ.conf['pin']) align(VIZ.conf['pin'], 500);
                    tween = data.slice();
                }
            }
        }

        /**************************************************************
            init with empty data
         **************************************************************/
        var Z = 'z' in VIZ.meta ? VIZ.meta['summary']['z']['domain'] : [''],
            DY, data = [], tween = [],
            legend = 'z' in VIZ.meta,

            line = d3.svg.line()
                .interpolate(VIZ.meta['interpolate'] ? 'basis':'line')
                .x(function(d){ return VIZ.x(d.x); })
                .y(function(d){ return VIZ.y(d.y); });

        plot.append('g').attr('id','lines');

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

        VIZ.ydomain = VIZ.y.domain();

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
                                return 'translate('+ [0,VIZ.y(data[I].values[i].y)] +')';
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
                                    return 'translate('+ [0,VIZ.y(data[I].values[i].y)] +')';
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
                .append('path')
                    .attr('class','line')
                    .attr('transform', function(d,i){ return 'translate(0,-6)'; })
                    .attr('d','M0 0 L 24 0')
                    .attr('stroke', color);

            legend.selectAll('.legend')
                .append('circle')
                    .attr('transform', function(d,i){ return 'translate(12,-6)'; })
                    .attr('r', 4)
                    .attr('stroke', color)
                    .attr('stroke-width', 3)
                    .attr('fill', 'white');

            legend.selectAll('.legend').select('text')
                .attr('transform', function(d,i){ return 'translate(30,0)'; });
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
            .data(legend ? ['base','normalize'] : []).enter()
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
