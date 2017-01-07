#!/usr/bin/env

import os
import sys
import json
import time
import redis
import subprocess

from IPython.core.display import display, HTML
from viz import config, client, validate, transform, request


if config.get('REDIS_PASS'):
    red = redis.StrictRedis(host=config.get('REDIS_HOST'),
                            port=config.get('REDIS_PORT'),
                            password=config.get('REDIS_PASS'))
else:
    red = redis.StrictRedis()
pubsub = red.pubsub()


class VizNotebook(client.VizNotebook):
    '''
    extending client
    '''

    def stream(self, channel, **kwargs):
        '''
        call from Jupyter notebook to create/update visualization
        using REDIS pubsub
        '''
        meta = json.loads(request.get('%s/meta/%s' % (self.HOST, kwargs['type'])))
        meta['host'] = '%s://%s' % (config.get('PROTOCOL'),config.get('NODEIP'))
        meta = validate.check(kwargs, meta)
        meta['flow'] = 'stream'
        meta['source'] = channel
        meta['dev'] = self.DEV
        if self.DEV: print('VIZ listening %s @ %s' % (channel, meta['host']))

        pubsub.subscribe(channel)
        for message in pubsub.listen():
            if message['type'] == 'message':
                if self.DEV: print(message)
                data = json.loads(message['data'].decode())
                if 'x' not in meta:
                    meta['x'] = 'timestamp'
                data['timestamp'] = time.time()
                data = transform.filters([data], meta)
                meta['summary'] = transform.summary(data, meta)
                pubsub.unsubscribe(channel)
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

        script = __file__.replace('local.py','publish')
        proc = subprocess.Popen([script, str(path_publish), str(path_notebook)], stdout=subprocess.PIPE)
        out, err = proc.communicate()

        if err != None:
            raise Exception('Publishing ERROR: %s' % err)
        for line in out.decode('utf-8').strip().split('\n'):
            if self.DEV: print(line)


def main():
    pubsub.subscribe('sample-io')
    for message in pubsub.listen():
        if message['type'] == 'message':
            print(message)
            pubsub.unsubscribe('sample-io')



if  __name__ =='__main__':
    main()
