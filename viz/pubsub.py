#!/usr/bin/env

import os
import re
import sys
import json
import time
import redis
import subprocess

from IPython.core.display import display, HTML
from viz import config, client, validate, transform, request


class VizNotebook(client.VizNotebook):
    '''
    using redis pubsub as data-source
    '''
    def __init__(self, host = None, dev = False, redis_host = None, redis_port = 6379):
        super(VizNotebook, self).__init__(host = host, dev = dev)

        if redis_host != None:
            red = redis.StrictRedis(host=redis_host,
                                    port=redis_port)

        elif config.get('REDIS_PASS'): # default local conf
            red = redis.StrictRedis(host=config.get('REDIS_HOST'),
                                    port=config.get('REDIS_PORT'),
                                    password=config.get('REDIS_PASS'))
        else: # default container
            red = redis.StrictRedis(host='redis')

        self.pubsub = red.pubsub()


    def stream(self, channel, **kwargs):
        '''
        call from Jupyter notebook to create/update visualization
        using REDIS pubsub
        '''
        meta = json.loads(request.get('%s/meta/%s' % (self.HOST, kwargs['type'])))
        match = re.match('(https?://.*)/([^/]+)', channel)
        if match != None:
            meta['host'] = match.group(1)
            channel = match.group(2)
        else:
            meta['host'] = '%s://%s' % (config.get('PROTOCOL'), config.get('NODEIP'))
        meta = validate.check(kwargs, meta)
        meta['flow'] = 'stream'
        meta['source'] = channel
        meta['dev'] = self.DEV
        if self.DEV: print('VIZ listening %s @ %s' % (channel, meta['host']))

        self.pubsub.subscribe(channel)
        for message in self.pubsub.listen():
            if message['type'] == 'message':
                if self.DEV: print(message)
                data = json.loads(message['data'].decode())
                if 'x' not in meta:
                    meta['x'] = 'timestamp'
                data['timestamp'] = time.time()
                data = transform.filters([data], meta)
                meta['summary'] = transform.summary(data, meta)
                self.pubsub.unsubscribe(channel)
                return self.iframe(data, meta)


    def publish(self, **kwargs):
        '''
        call from Jupyter notebook to compile all visuals
        included in the notebook and save in destination folder
        '''
        if 'path_publish' not in kwargs:
            raise Exception('Missing path_publish arg')
        path_publish = kwargs['path_publish']

        if 'path_notebook' not in kwargs:
            raise Exception('Missing path_notebook arg')
        path_notebook = kwargs['path_notebook']

        script = __file__.replace('pubsub.py','publish')
        proc = subprocess.Popen([script, str(path_publish), str(path_notebook)],
                                        stdout = subprocess.PIPE)
        out, err = proc.communicate()

        if err != None:
            raise Exception('Publishing ERROR: %s' % err)
        for line in out.decode('utf-8').strip().split('\n'):
            if self.DEV: print(line)


def main():
    test = VizNotebook()
    test.pubsub.subscribe('sample-io')
    for message in test.pubsub.listen():
        if message['type'] == 'message':
            print(message)
            test.pubsub.unsubscribe('sample-io')


if  __name__ =='__main__':
    main()
