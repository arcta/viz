#!/usr/bin/env

import os
import sys
import json
import time
import subprocess

from IPython.core.display import display, HTML
from viz import config, client, validate, transform, request


class VizNotebook(client.VizNotebook):
    '''
    publish to local file-system
    '''
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
    nbv = VizNotebook(dev=True)


if  __name__ =='__main__':
    main()
