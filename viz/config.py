#!/usr/bin/env

try:
    from lib import config
    cnf = config.LocalCnf()

except ImportError:
    cnf = {
        'REDIS_HOST':'localhost',
        'REDIS_PORT': 6379,
        'NODEIP':'0.0.0.0',
        'PROTOCOL':'http'
    }
    cnf['PROJECT'] = {}
    cnf['PROJECT']['viz'] = {}
    cnf['PROJECT']['viz']['PORT'] = 4000

def get(key):
    return cnf.get(key)
