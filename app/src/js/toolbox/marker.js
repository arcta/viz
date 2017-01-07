(function(window) {
    'use strict';

    var VIZ = window.VIZ || {};

    /******************************************************************
        enable state/location marker
     ******************************************************************/
    function action() {
        var insight = VIZ.modified();

        function callback(input) {
            var url = VIZ.orig() +'/'+ VIZ.hash(input);

            if (!VIZ.static) {
                if (VIZ.stream) {
                    VIZ.meta.summary.x.domain = [
                        VIZ.data[0].x.getTime(),
                        VIZ.data[VIZ.data.length-1].x.getTime()
                    ];

                } else {
                    if ('xdomain' in VIZ.conf)
                        VIZ.meta.summary.x.domain = VIZ.conf.xdomain;
                    if ('ydomain' in VIZ.conf)
                        VIZ.meta.summary.y.domain = VIZ.conf.ydomain;
                }
                VIZ.meta.id = VIZ.meta.id.replace(VIZ.meta.flow,'static');
                url = url.replace(VIZ.meta.flow,'static');
                VIZ.meta.flow = 'static';
            }

            d3.select('#Marker')
                .attr('data-clipboard-text', url);

            VIZ.save(input, insight, function(data) {
                window.location.href = url;
            });
        }

        if (VIZ.stream || Object.keys(insight).length > 0) {
            prompt('Short description for this marker:', callback);

        } else {
            VIZ.MarkerCTRL.deactivate();
            var txt = 'You have to modify the view\n'+
                               'to set a marker';
            VIZ.info.show(txt, [window.innerWidth -70, 120]);
        }
    }

    function prompt(txt, callback) {
        callback = callback || function(input){};

        d3.select('body')
            .append('div')
                .attr('class','prompt')
            .append('form')
                .attr('id','prompt')
                .html(txt)
            .append('input')
                .attr('type','txt')
                .attr('id','bookmark')
                .attr('maxlength', 250)
                .attr('autofocus', true);

        d3.select('#prompt')
            .append('span')
                .html('submit')
                .on(_CLICK,
                    function() {
                        var label = d3.select('#bookmark').property('value');
                        if (label.trim() !== '')
                            callback(label);
                    });

        d3.select('#prompt')
            .append('span')
                .html('cancel')
                .on(_CLICK,
                    function() {
                        VIZ.MarkerCTRL.deactivate();
                        d3.select('.prompt')
                            .remove();
                    });
    }

    function render() {
        var clipboard = new Clipboard('#Marker');

        clipboard.on('success',
            function(e) {
                e.clearSelection();
            });

        clipboard.on('error',
            function(e) {
                console.log('clipboard ERROR', e.action, e.trigger);
            });

        d3.select('#Marker')
            .attr('data-clipboard-text', VIZ.orig());

        d3.select('#Marker').append('path')
            .attr('d','M7 21 L1 10.5 A7 7 0 1 1 13 10.5 Z');

        d3.select('#Marker').append('circle')
            .attr('r', 1)
            .attr('transform','translate(7,7)');
    }

    function check() {
        return !VIZ.published;
    }

    VIZ.MarkerCTRL = new VIZ.Control('Marker','Set view-marker',
                            false,   //no screen
                            action,
                            null,    //default mouse-over
                            null,    //default mouse-out
                            render,
                            check);

    window.VIZ = VIZ;
})(window);
