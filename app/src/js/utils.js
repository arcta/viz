(function(window) {
    'use strict';

    var VIZ = window.VIZ || {};

    VIZ.info = VIZ.info || { show:function(){}, hide:function(){} };


    VIZ.evaluate = function() {
        VIZ.host = window.location.href.split(/\/(static|dynamic|stream)\//)[0];
        VIZ.image = window.location.search === '?image';

        VIZ.static = VIZ.meta['static'] || false;
        VIZ.stream = VIZ.meta['stream'] || false;
        VIZ.dynamic = VIZ.meta['dynamic'] || false;
    };


    VIZ.set = function(callback) {
        callback = callback || function(){};

        var S = VIZ.meta['summary'],
            xdomain = VIZ.conf['xdomain'] || S['x']['domain'],
            ydomain = VIZ.conf['ydomain'] || S['y']['domain'];

        if ('date' === VIZ.meta['summary']['x']['type'])
                xdomain = [ new Date(1000*xdomain[0]), new Date(1000*xdomain[1]) ];

        if ('date' === VIZ.meta['summary']['y']['type'])
                ydomain = [ new Date(1000*ydomain[0]), new Date(1000*ydomain[1]) ];

        VIZ.x.domain(xdomain);
        VIZ.y.domain(ydomain);
        callback();
    };

    /******************************************************************
        common utilities
     ******************************************************************/

    VIZ.utils = function(conf) {
        if (VIZ.image) return;

        conf = conf || function(){};

        function hash() {
            var key = '', ord = Object.keys(VIZ.conf);
            ord.sort();
            ord.map(function(d){ key += (d[0]+ VIZ.conf[d]); });
            return key.replace(/\W/g,'').substr(0,128);
        }

        function orig() {
            return VIZ.host +'/static/'+ VIZ.id;
        }

        function save(callback) {
            callback = callback || function(data){};

            var text = JSON.stringify({ key: hash(), conf: VIZ.conf });

            d3.json(VIZ.host +'/conf')
                .header('Content-Type','application/json')
                .post(text,
                    function(err, data) {console.log(data);
                        if (err) return console.log(err);
                        callback(data);
                    });
        }

        var W = window.innerWidth, H = window.innerHeight;

        var utils = VIZ.canvas.append('g')
            .attr('class','utils')
            .attr('transform','translate('+ [W -90, 5] +') scale(1)');

        var clipboard = new Clipboard('#Marker');

        clipboard.on('success',
            function(e) {
                e.clearSelection();
            });

        clipboard.on('error',
            function(e) {
                console.log('clipboard ERROR', e.action, e.trigger);
            });

        utils.append('rect')
            .attr('class','utils-rect')
            .attr('width', 100)
            .attr('height', 31)
            .attr('transform','translate(-6,-5)');

        utils.selectAll('.butt')
            .data(['Zoom','Marker','Image']).enter()
                .append('g')
                    .attr('class','butt')
                    .attr('id', function(d){ return d; })
                    .attr('transform',
                        function(d,i) {
                            return 'translate('+ [i*30, 0] +')';
                        })
                    .on(_OUT,
                        function() {
                            VIZ.info.hide();
                        });

        /**************************************************************
            enable zoom/tooltip toggle
         **************************************************************/
        d3.select('#Zoom').append('path')
            .attr('d','M10 10 L21 21')
            .style('stroke-width', 4);

        d3.select('#Zoom').append('circle')
            .attr('r', 9)
            .attr('transform','translate(9,9)');

        d3.select('#Zoom')
            .style('opacity', VIZ.bookmark ? 0 : 0.5)
            .style('display', VIZ.static ? 'block':'none')
            .on(_IN,
                function(d,i) {
                    VIZ.info.show('Zoom/Tooltip toggle:\n( tooltip OR zoom )',
                                    [W -100, 100]);
                })
            .on(_CLICK,
                function() {
                    var d = VIZ.canvas.select('.zoom').style('display');

                    VIZ.canvas.select('.zoom')
                        .style('display', d === 'block' ? 'none':'block');

                    d3.select('#Zoom')
                        .style('opacity', d === 'block' ? 0.5 : 1);
                });

        /**************************************************************
            enable state/location marker
         **************************************************************/
        d3.select('#Marker').append('path')
            .attr('d','M10 23 L4 13 A8 8 0 1 1 16 13 Z');

        d3.select('#Marker').append('circle')
            .attr('r', 1)
            .attr('transform','translate(10,7)');

        d3.select('#Marker')
            .style('opacity', VIZ.bookmark ? 1 : 0.5)
            .style('display', VIZ.static ? 'block':'none')
            .attr('data-clipboard-text', orig())
            .on(_IN,
                function(d,i) {
                    var text = VIZ.bookmark ? 'Return to the original view':
                        'Create Deep-Link to the view\nand copy url to Clipboard';
                    VIZ.info.show(text, [W -70, 100]);
                })
            .on(_CLICK,
                function() {
                    if (VIZ.bookmark) return window.location.href = orig();

                    if (VIZ.modified()) {
                        conf();

                        var url = orig() +'/'+ hash();

                        d3.select('#Marker')
                            .attr('data-clipboard-text', url);

                        save(function(data) {
                            window.location.href = url;
                        });
                    }
                    else
                        VIZ.info.show('You have to modify the view\nto set a marker',
                                            [W -70, 120]);
                });

        /**************************************************************
            enable render as image
         **************************************************************/
        d3.select('#Image').append('rect')
            .attr('rx', 4)
            .attr('ry', 4)
            .attr('width', 22)
            .attr('height', 22);

        d3.select('#Image').append('circle')
            .attr('r', 5)
            .attr('transform','translate(11,11)');

        d3.select('#Image').append('circle')
            .attr('r', 1)
            .attr('transform','translate(17.5,4.5)');

        d3.select('#Image')
            .style('opacity', 0.5)
            .on(_IN,
                function(d,i) {
                    VIZ.info.show('Render this view as PNG-image\n',
                                    [W -40, 100]);
                })
            .on(_CLICK,
                function() {
                    if (!VIZ.static) {
                        d3.json(VIZ.host +'/static')
                            .header('Content-Type','application/json')
                            .post(JSON.stringify({ meta:VIZ.meta, data:VIZ.data }),
                                function(err, data) {
                                    if (err) return console.log(err);
                                    window.location.href = VIZ.host +'/png/'+ data.id +'?size='+ W +'x'+ H;
                                });
                    } else {
                        var url = (window.location.href.split('?').shift()).replace('static','png'),
                            query = '?size='+ W +'x'+ H;

                        if (!VIZ.modified()) return window.location.href = url + query;
                        url = orig().replace('static','png') +'/'+ hash() + query;
                        save(function(data){ window.location.href = url; });
                    }
                });

        VIZ.canvas.select('.zoom')
            .call(VIZ.zoom);
    };

    window.VIZ = VIZ;
})(window);
