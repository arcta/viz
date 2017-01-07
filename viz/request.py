
import json
import requests

def get(url, data = ''):
    headers = {'content-type':'application/json; charset=utf-8'}
    response = requests.get(url, data = data, headers = headers)

    if response.status_code == 200:
        return response.text
    return json.dumps({ 'status':response.status_code })


def post(url, data = ''):
    headers = {'content-type':'application/json; charset=utf-8'}
    response = requests.post(url, data = data, headers = headers)

    if response.status_code == 200:
        return response.text
    return json.dumps({ 'status':response.status_code })
