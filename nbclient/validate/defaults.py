
import os
import json


def check(meta):
    if 'x' not in meta and 'y' not in meta:
        raise KeyError('The should be x or y or both present in the arguments passed to plot()!')
    if 'width' not in meta:
        meta['width'] = '100%'
    if 'height' not in meta:
        meta['height'] = 600
    return meta


def main():
    print('Meta parsing/validation module')


if  __name__ =='__main__':
    main()
