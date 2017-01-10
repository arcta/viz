#!/usr/bin/env

import os
import sys
import json
import time

from IPython.display import IFrame
from abc import ABCMeta, abstractmethod
from viz import config, validate, transform, request


class VizNotebook:
    '''
    Jupyter notebook client for VIZ project API
    '''
    def __init__(self, host = None, dev = False):
        if host == None:
            self.HOST = '%s://%s:%s' % (config.get('PROTOCOL'),
                                        config.get('NODEIP'),
                                        config.get('PROJECT')['viz']['PORT'])
        else:
            self.HOST = host

        self.DEV = dev
        if self.DEV: print(self.HOST)


    def iframe(self, source, args):
        response = request.post('%s/' % self.HOST,
                        data=json.dumps({ 'data':source, 'meta':args }))
        response = json.loads(response)
        if 'id' in response:
            url = '%s/d3/%s' % (self.HOST, response['id'])
            if self.DEV: print(url)
            return IFrame(url, width=args['width'], height=args['height'])
        raise Exception('VIZ-API communication issue: host[ %s ] status [ %s ] ' %
                             (self.HOST, response['status']))


    def args(self, name):
        '''
        print meta for VIZ[name]
        '''
        meta = json.loads(request.get('%s/meta/%s' % (self.HOST, name)))
        if 'status' in meta:
            return print('No such thing...')

        keys = sorted(meta.keys())
        for key in keys:
            prefix = meta[key][:7]
            if prefix == 'REQUIRE':
                print('%s %s %s' % (key.ljust(15), prefix, meta[key][9:]))
        for key in keys:
            prefix = meta[key][:7]
            if prefix == 'DEFAULT':
                print('%s %s %s' % (key.ljust(15), prefix, meta[key][9:]))


    def summary(self, data, **kwargs):
        '''
        statistical summary visual
        '''
        meta = json.loads(request.get('%s/meta/summary' % self.HOST))
        meta = validate.check(kwargs, meta)
        meta['flow'] = 'static'

        data = json.loads(data)
        meta['summary'] = transform.summary(data, meta)
        if 'target' not in meta: meta['target'] = 'numeric'
        data, meta = transform.extract(meta, meta['target'])
        meta['dev'] = self.DEV
        return self.iframe(data, meta)


    def static(self, data, **kwargs):
        '''
        call from Jupyter notebook to create/update visualization
        which will be saved on the server and retrieved with http request
        '''
        meta = json.loads(request.get('%s/meta/%s' % (self.HOST, kwargs['type'])))
        meta = validate.check(kwargs, meta)

        data = json.loads(data)
        data = transform.filters(data, meta)
        meta['flow'] = 'static'
        meta['summary'] = transform.summary(data, meta)
        meta['dev'] = self.DEV
        return self.iframe(data, meta)


    def dynamic(self, url, **kwargs):
        '''
        call from Jupyter notebook to create/update visualization
        with dynamic data-source defined by url end-poin
        '''
        meta = json.loads(request.get('%s/meta/%s' % (self.HOST, kwargs['type'])))
        meta = validate.check(kwargs, meta)

        source = request.get(url)
        data = json.loads(source)
        data = transform.filters(data, meta)
        meta['flow'] = 'dynamic'
        meta['summary'] = transform.summary(data, meta)
        meta['source'] = url
        meta['dev'] = self.DEV
        return self.iframe(data, meta)


    @abstractmethod
    def stream(self, channel, **kwargs):
        '''
        call from Jupyter notebook to create/update visualization
        streaming data-source channel
        '''
        pass


    @abstractmethod
    def publish(self, **kwargs):
        '''
        call from Jupyter notebook to compile all visuals
        included in the notebook and save in destination whatever
        '''
        pass


def main():
    nbv = VizNotebook(dev=True)


if  __name__ =='__main__':
    main()
