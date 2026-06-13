import alpha_vantage.timeseries import TimeSeries
API_key = 'M665TP41YWFG92TW'

ts = TimeSeries(key = API_key, output_format= 'pandas')

data = ts.get_daily_adjusted('AAPL')