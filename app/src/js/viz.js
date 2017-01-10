(function(window) {
    'use strict';

    var VIZ = window.VIZ || {};

    /******************************************************************
        events shortcuts
     ******************************************************************/
    if ('ontouchstart' in window) {
        window._IN = 'touchstart';
        window._OUT = 'touchend';
        window._MOVE = 'touchmove';
        window._CLICK = 'touchstart';

    } else {
        window._IN = 'mouseover';
        window._OUT = 'mouseout';
        window._MOVE = 'mousemove';
        window._CLICK = 'click';
    }

    /******************************************************************
        configuration
     ******************************************************************/
    VIZ.defaults = VIZ.defaults || {};
    VIZ.defaults['window'] = 6e4;
    VIZ.defaults['transition'] = 1000;

    VIZ.domains = function() {
        ['x','y','z'].map(function(a) {
            if (a in VIZ.meta.summary) {
                if (VIZ.static) {
                    VIZ.defaults[a +'domain'] = VIZ.meta.summary[a].domain;

                } else {
                    if (VIZ.meta[a +'lim']) {
                        VIZ.defaults[a +'domain'] = VIZ.meta[a +'lim'];

                    } else if (VIZ.meta.summary[a]['type'] === 'date') {
                        VIZ.defaults[a +'domain'] = VIZ.defaults[a +'domain'] ||
                            [
                                (new Date()).getTime() - (VIZ.meta['window']*1e3 || VIZ.defaults['window']),
                                (new Date()).getTime()
                            ];

                    } else if (VIZ.meta.summary[a]['type'] !== 'categoric') {
                        var A = VIZ.stream ?
                                10 * VIZ.meta.summary[a]['mean'] :
                                4 * VIZ.meta.summary[a]['std'];
                        VIZ.defaults[a +'domain'] = [
                            VIZ.meta.summary[a]['mean'] - A,
                            VIZ.meta.summary[a]['mean'] + A
                        ];

                    } else {
                        VIZ.defaults[a +'domain'] = VIZ.defaults[a +'domain'] || VIZ.meta.summary[a].domain;
                    }
                }
            }
        });
    };

    VIZ.conf = VIZ.conf || {};
    VIZ.conf['size'] = [ window.innerWidth, window.innerHeight ];
    VIZ.conf['toolbox'] = ['Reset','Select','Marker','Image','Insight'];

    VIZ.insights = {};

    /******************************************************************
        primitives and arrays only considered in configuration
     ******************************************************************/
    function copy(p) {
        if (Array.isArray(p)) return p.slice();
        return p;
    }

    function same(s,t) {
        var a = Array.isArray(s);
        if (a !== Array.isArray(t)) return false;
        if (a) {
            for (var i = 0; i < s.length; ++i)
                if (i >= t.length || t[i] !== s[i]) return false;
            return true;
        }
        return (s == t);
    }

    /******************************************************************
        value is either bookmarked or passed as arg or local default
     ******************************************************************/
    VIZ.configure = function() {
        for (var k in VIZ.defaults) {
            if (VIZ.bookmark && k in VIZ.insights[VIZ.bookmark]) {
                VIZ.conf[k] = copy(VIZ.insights[VIZ.bookmark][k]);
            } else {
                VIZ.conf[k] = copy(VIZ.defaults[k]);
            }
        }
    };

    /******************************************************************
        VIZ instance should know if it was modified
     ******************************************************************/
    VIZ.modified = function() {
        var insight = {};

        for (var k in VIZ.conf) {
            if (k in VIZ.defaults
                && !(same(VIZ.conf[k], VIZ.defaults[k]))) {
                    insight[k] = copy(VIZ.conf[k]);
            }
        }
        return insight;
    };

    /******************************************************************
        retrieve insight configuration
     ******************************************************************/
    VIZ.target = function(i) {
        for (var k in VIZ.defaults)
            VIZ.conf[k] = copy(VIZ.defaults[k]);

        if (i && i in VIZ.insights) {
            for (var k in VIZ.insights[i])
                VIZ.conf[k] = copy(VIZ.insights[i][k]);
        }
    };

    /******************************************************************
        rendering func
     ******************************************************************/
    VIZ.evaluate = function() {
        VIZ.host = window.location.href
                    .split(/\/(d3|png)\//)[0];

        VIZ.image = (window.location.search === '?image');
        VIZ.published = (window.location.href.substr(-5) === '.html');

        if (VIZ.image) VIZ.conf['toolbox'] = [];

        VIZ.bookmark = (window.location.hash ?
                        window.location.hash.substr(1):
                        window.location.href
                                .split('?')[0]
                                .split(VIZ.id)[1]
                                .replace('.html','')
                                .substr(1));

        VIZ.bookmark = (VIZ.bookmark || false);

        VIZ.static  = (VIZ.meta['flow'] === 'static');
        VIZ.stream  = (VIZ.meta['flow'] === 'stream');
        VIZ.dynamic = (VIZ.meta['flow'] === 'dynamic');
    };


    VIZ.render = function(draw, canvas) {
        draw = draw || function(){};
        canvas = canvas || 'svg';

        function render() {
            d3.selectAll(canvas)
                .remove();

            d3.select('#Info')
                .remove();

            VIZ.evaluate();
            VIZ.data = VIZ.data || [];
            VIZ.conf['size'] = [ window.innerWidth, window.innerHeight ];

            ['x','y','z'].map(function(d) {
                if (VIZ.meta['summary'][d]
                    && 'date' === VIZ.meta['summary'][d]['type']) {

                    VIZ.data.sort(
                        function(a,b) {
                            return a[d] - b[d];
                        });

                    VIZ.data.map(
                        function(D,I) {
                            VIZ.data[I][d] = new Date(D[d]);
                        });
                }
            });

            VIZ.canvas = d3.select('body')
                .append(canvas)
                    .attr('width', VIZ.conf['size'][0])
                    .attr('height', VIZ.conf['size'][1]);
            draw();
        }

        window.onresize = render;
        window.onhashchange = render;

        if (VIZ.meta['flow'] === 'dynamic')
            VIZ.refresh(render);
        else render();
    };


    VIZ.init = function() {
        VIZ.margins();
        VIZ.width = VIZ.conf.size[0] - VIZ.margin.left - VIZ.margin.right;
        VIZ.height = VIZ.conf.size[1] - VIZ.margin.top - VIZ.margin.bottom;

        VIZ.canvas.append('g')
            .attr('id','plot')
            .attr('transform','translate('+ [ VIZ.margin.left, VIZ.margin.top ] +')');

        d3.select('#plot').append('text')
            .attr('transform','translate(0,-25)')
            .attr('class','title')
            .text(VIZ.meta['title'] || '');

        VIZ.axes();

        d3.select('#plot')
            .append('g')
                .attr('id','ctrl')
                .style('display', VIZ.image ? 'none':'block')
                .attr('transform','translate('+ [VIZ.width +10, 20] +')')
                .on(_OUT, function(d){ VIZ.info.hide(); })
            .append('text')
                .attr('transform','translate(16,-10)')
                .text('[i]')
                .on(_CLICK,
                    function(d) {
                        d3.select('#Info').style('display','block');
                    })
                .on(_IN,
                    function(d) {
                        VIZ.info.show('Show Info', [
                            VIZ.margin.left + VIZ.width,
                            VIZ.margin.top +80]);
                    });

        d3.select('body')
            .append('div')
                .attr('id','Info')
            .append('div').html(VIZ.meta.title);

        d3.select('#Info')
            .append('div').html(VIZ.meta.description);

        d3.select('#Info')
            .append('div').attr('id','Legend');

        d3.select('#Info')
            .append('div').classed('ok', true)
                .html('[viz]')
                .on(_CLICK,
                    function(d) {
                        d3.select('#Info').style('display','none');
                    });

        var plot = d3.select('#plot').append('g');
        plot.append('defs').append('clipPath')
                .attr('id','clip')
            .append('rect')
                .attr('width', VIZ.width)
                .attr('height', VIZ.height);

        return plot;
    };

    /******************************************************************
        calculate margins to fit the labels and legend
     ******************************************************************/
    VIZ.margins = function() {
        var span = 0, labels, S = VIZ.meta['summary'];

        function format(v,f) {
            return VIZ.format(f)(v);
        }

        /**************************************************************
            default ( if no axes and no legend )
         **************************************************************/
        VIZ.margin = {
            left: Math.max(50,   0.1*VIZ.conf['size'][0]),
            right: Math.max(100,0.15*VIZ.conf['size'][0]),
            top: Math.max(50,    0.1*VIZ.conf['size'][1]),
            bottom: Math.max(50, 0.1*VIZ.conf['size'][1])
        };

        /**************************************************************
            fit legend ( Z axis ) if any
         **************************************************************/
        if ('z' in S) {
            VIZ.margin.right = Math.max(VIZ.margin.right, 150);
        }

        /**************************************************************
            fit Y axis if any
         **************************************************************/
        if ('y' in S) {
            if ('hist' in S['y'])
                span = VIZ.textsize(VIZ.conf['zdomain'],'label');

            else if ('range' in S['y'])
                span = VIZ.textsize(S['y']['range']
                        .map(function(d){
                            return format('date' === S['y']['type'] ?
                                new Date(d) : d,'yformat'); }),'label');

            VIZ.margin.left = Math.max(VIZ.margin.left, span +20);
        }

        /**************************************************************
            fit X axis if any ( after Y & Z margin recalc )
         **************************************************************/
        if ('x' in S) {
            if ('categoric' === S['x']['type']) {
                labels = VIZ.conf['xdomain'];
                span = VIZ.textsize(labels,'label');

                if (span > (VIZ.conf['size'][0] - VIZ.margin.left - VIZ.margin.right)/labels.length) {
                    VIZ.margin.bottom = Math.max(VIZ.margin.bottom, span +20);
                    VIZ.xrotate = true;
                }
            }
        }
    };

    /******************************************************************
        figure out max pix-span for the list of strings
     ******************************************************************/
    VIZ.textsize = function(txt, style) {
        var test, size, max = 0;

        VIZ.canvas.append('g')
            .style('opacity', 0)
            .attr('id','textsize')
        .selectAll('text')
            .data(txt).enter()
                .append('text')
                    .attr('class', style)
                    .text(function(d){ return d; });

        test = document.getElementById('textsize').childNodes;
        for (var i = 0; i < test.length; ++i) {
            size = Math.round(test[i].getComputedTextLength());
            max = Math.max(max, size);
        };

        d3.select('#textsize')
            .remove();

        return max;
    };

    /******************************************************************
        init legend
     ******************************************************************/
    VIZ.legend = function() {
        var legend = d3.select('#plot')
            .append('g')
                .attr('id','legend');

        legend.append('text')
            .attr('class','axis-label')
            .text(VIZ.meta['zlabel'] || '');

        legend.selectAll('.legend').datum(VIZ.conf['zdomain']);

        return legend;
    };

    /******************************************************************
        set flag for phantomjs-horseman
     ******************************************************************/
    VIZ.done = function() {
        d3.select('body').append('span')
            .attr('id','done');
    };


    window.VIZ = VIZ;
})(window);
