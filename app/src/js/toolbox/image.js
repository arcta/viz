(function(window) {
    'use strict';

    var VIZ = window.VIZ || {};

    /******************************************************************
        enable render PNG
     ******************************************************************/
    function action() {
        window.clearInterval(VIZ.interval);

        var W = window.innerWidth, H = window.innerHeight,
            query = '?size='+ W +'x'+ H,
            insight = VIZ.modified(),
            key = Date.now() +''+ Math.round(Math.random()*100);

        if (VIZ.static) {
            var url = VIZ.orig().replace('/d3/','/png/') +'/'+ key + query;
            VIZ.save(key, insight, function(data){ window.location.href = url; });

        } else {
            if (VIZ.stream) {
                var X = VIZ.x.domain();
                VIZ.meta.summary.x.domain = [X[0].getTime(), X[1].getTime()];
            } else {
                if ('xdomain' in VIZ.conf)
                    VIZ.meta.summary.x.domain = VIZ.conf.xdomain;
                if ('ydomain' in VIZ.conf)
                    VIZ.meta.summary.y.domain = VIZ.conf.ydomain;
            }
            VIZ.insights[key] = insight;
            VIZ.meta.id = VIZ.meta.id.replace(VIZ.meta.flow,'static');
            url = url.replace(VIZ.meta.flow,'static');
            VIZ.meta.flow = 'static';
            delete VIZ.meta.id;
            d3.json(VIZ.host)
                .header('Content-Type','application/json')
                .post(JSON.stringify({ meta:VIZ.meta, data:VIZ.data, insights:VIZ.insights }),
                    function(err, data) {
                        if (err) return console.log(err);
                        window.location.href = VIZ.host +'/png/'+ data.id +'?size='+ W +'x'+ H;
                    });
        }
    }

    function render() {
        d3.select('#Image').append('rect')
            .attr('rx', 2)
            .attr('ry', 2)
            .attr('width', 18)
            .attr('height', 10)
            .attr('transform','translate(1,3)')
            .style('fill','gray');

        d3.select('#Image').append('circle')
            .attr('r', 6)
            .attr('transform','translate(10,6)');

        d3.select('#Image').append('circle')
            .attr('r', 2)
            .attr('transform','translate(10,6)')
            .style('fill','gray');
    }

    function check() {
        return true;//!!VIZ.static;
    }

    VIZ.ImageCTRL = new VIZ.Control('Image','Render PNG',
                                false,   //no screen
                                action,
                                null,    //default mouse-over
                                null,    //default mouse-out
                                render,
                                check);

    window.VIZ = VIZ;
})(window);
