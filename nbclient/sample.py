
import numpy
import pandas
import datetime
import time

df = pandas.DataFrame(numpy.random.randn(100, 3), columns=list('ABC'))
df['B'] = df['B'].apply(lambda b: 1 + 1000*abs(b))
df['C'] = df['C'].apply(lambda c: ['red','blue','yellow','green','purple','orange','lime'][int(abs(round(c)))])
df['D'] = df.index.map(lambda i: datetime.datetime.fromtimestamp(time.time() - 43*i).strftime('%Y-%m-%d %H:%M:%S'))
df['E'] = df['A'].apply(lambda a: 1000*a*a) - df['B']
print(df.to_json(orient='records'))
