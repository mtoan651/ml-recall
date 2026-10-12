---
topic: time-series
summary: Data indexed in time order - trend, seasonality and stationarity, differencing, AR/MA/ARIMA with ACF and PACF, exponential smoothing, ML forecasting features, honest validation and state-space models.
status: reviewed
reviewed_by: claude
references:
  - title: 'Hyndman & Athanasopoulos, Forecasting: Principles and Practice (3rd ed.), Ch. 2 Time series graphics'
    url: https://otexts.com/fpp3/graphics.html#sec-tspatterns
    locator: Sec. 2.3 Time series patterns; Sec. 2.9 White noise
  - title: 'Hyndman & Athanasopoulos, Forecasting: Principles and Practice (3rd ed.), Ch. 9 ARIMA models'
    url: https://otexts.com/fpp3/arima.html#sec-stationarity
    locator: Sec. 9.1 Stationarity and differencing; 9.3 Autoregressive models; 9.4 Moving average models; 9.5 Non-seasonal ARIMA models (ACF and PACF plots); 9.7 ARIMA modelling in fable (Understanding constants in R; Plotting the characteristic roots); 9.8 Forecasting; 9.9 Seasonal ARIMA models
  - title: 'Wikipedia: Stationary process'
    url: https://en.wikipedia.org/wiki/Stationary_process
    locator: Strict-sense stationarity; Weak or wide-sense stationarity; Relationships between types of stationarity; Techniques to stationarize a non-stationary process
  - title: 'Hyndman & Athanasopoulos, Forecasting: Principles and Practice (3rd ed.), Ch. 8 Exponential smoothing'
    url: https://otexts.com/fpp3/exponential-smoothing.html#sec-ses
    locator: Sec. 8.1 Simple exponential smoothing (Weighted average form; Flat forecasts)
  - title: 'Hyndman & Athanasopoulos, Forecasting: Principles and Practice (3rd ed.), Ch. 7 Time series regression models'
    url: https://otexts.com/fpp3/regression.html#sec-useful-predictors
    locator: Sec. 7.2 Least squares estimation (Goodness-of-fit); Sec. 7.4 Some useful predictors; Sec. 7.7 Nonlinear regression
  - title: 'Wikipedia: Kalman filter'
    url: https://en.wikipedia.org/wiki/Kalman_filter
    locator: Underlying dynamic system model; Details (Predict, Update)
---
## Key ideas

- A **time series** is a sequence of observations indexed in time order, usually at equally spaced times. Examples: daily sales, hourly temperature, decades of seismic records.
- **Patterns** [^1]: a **trend** is a long-term increase or decrease (not necessarily linear); a **seasonal** pattern repeats with a fixed, known period (day of week, month of year); a **cycle** is a rise and fall *without* a fixed period. Separately, **outliers** are points far outside the usual spread.
- **Stationarity**: the statistical properties do not depend on when you look [^2]. *Weak* stationarity asks only for a constant mean, a constant finite variance and autocovariances that depend only on the lag [^3]. Trend and seasonality make a series non-stationary; white noise is stationary, and so is a series with only aperiodic cycles [^2].
- **Differencing** $y'_t = y_t - y_{t-1}$ removes a trend (each difference lowers a polynomial trend's degree by one); a **seasonal difference** $y_t - y_{t-m}$ removes a period-$m$ season [^2][^3]. A **random walk** $y_t = y_{t-1} + \varepsilon_t$ has white-noise differences, and its best forecast is the last value [^2].
- **AR($p$)** regresses $y_t$ on its own lags; **MA($q$)** on past forecast errors; **ARIMA($p, d, q$)** fits an ARMA model to the series differenced $d$ times ("Integrated") [^2]. Seasonal ARIMA adds terms at lags $m, 2m, \dots$ [^2]; statsmodels' SARIMAX also takes exogenous regressors.
- An AR($p$) process is stationary iff all roots of $1 - \phi_1 z - \dots - \phi_p z^p$ lie **outside** the unit circle; for AR(1), $\lvert\phi\rvert < 1$, and $\phi = 1$ is a unit root (random walk) [^2]. With $\phi$ near $+1$ the series wanders in long runs; with $\phi < 0$ it oscillates around the mean, zig-zagging for $\phi$ near $-1$ [^2].
- **ACF/PACF**: the autocorrelation at lag $k$ is the correlation of $y_t$ with $y_{t-k}$; the partial autocorrelation removes what the shorter lags already explain, so at lag 1 they coincide. AR($p$): PACF cuts off after lag $p$, ACF decays. MA($q$): ACF cuts off after lag $q$, PACF decays. ARMA: both decay [^2]. For white noise, 95% of ACF spikes lie within $\pm 1.96/\sqrt T$ [^1]. Both measure only *linear* dependence: no structure means uncorrelated, not independent.
- **Simple exponential smoothing** forecasts a weighted average whose weights fall geometrically with age; its forecast is flat for every horizon [^4].
- **Forecasting with ML** turns the series into a table [^5]:
  - a time dummy $t$ for the trend (quadratic and higher-order trends give unrealistic forecasts when extrapolated [^5]);
  - seasonal indicators ($m - 1$ one-hot columns, one season as baseline) or Fourier sine/cosine pairs, which need fewer columns for long periods;
  - holiday/event indicators and lagged values.
- **Leakage**: a feature for time $t$ may only use information available when the forecast is made. A rolling mean must be shifted first (`y.shift(1).rolling(7).mean()`); a variable that is planned in advance, such as a promotion calendar, may be used for future dates.
- A tree predicts the mean target of a leaf, so a tree ensemble never predicts outside the range of targets it was trained on: beyond the training range of a feature such as time its prediction stays flat and cannot continue a trend. With a growing trend, predict the change $y_t - y_{t-1}$, or fit the trend with linear regression and boost its residuals (hybrid).
- **Validation**: never shuffle. Use walk-forward (rolling-origin) evaluation: each test block is forecast by a model trained only on earlier data, then the origin moves forward. scikit-learn's `TimeSeriesSplit` does this with growing training sets (see the code below). A good in-sample fit says little about forecast accuracy [^5].
- **State-space models**: an HMM has a discrete hidden state; the **Kalman filter** is the analogue with a continuous, linear-Gaussian state [^6]. In an HMM the observations alone are not a Markov chain: their dependence runs through the hidden states.

## Formulas

- ARIMA on the differenced series: $y'_t = c + \phi_1 y'_{t-1} + \dots + \phi_p y'_{t-p} + \theta_1 \varepsilon_{t-1} + \dots + \theta_q \varepsilon_{t-q} + \varepsilon_t$ [^2].
- AR(1) $y_t = c + \phi y_{t-1} + \varepsilon_t$: mean $c/(1 - \phi)$ (take expectations of both sides); forecasts are made recursively, feeding each forecast back in as a lag [^2].
- SES: $\hat y_{t+1} = \alpha y_t + (1 - \alpha)\hat y_t = \alpha y_t + \alpha(1-\alpha) y_{t-1} + \alpha(1-\alpha)^2 y_{t-2} + \dots$ [^4].
- 1-D Kalman step for $h_s = A h_{s-1} + \text{noise}(Q)$, $v_s = C h_s + \text{noise}(R)$ [^6]: predict $P_s = A^2\sigma_{s-1}^2 + Q$; gain $K_s = P_s C/(C^2 P_s + R)$; update $\mu_s = A\mu_{s-1} + K_s(v_s - CA\mu_{s-1})$, $\sigma_s^2 = (1 - K_s C)P_s$. As $R \to 0$ the filter trusts the measurement ($\mu_s \to v_s/C$, $\sigma_s^2 \to 0$); as $R \to \infty$ it keeps its prediction.

## Worked example

$y_t = 3 + 0.5\,y_{t-1} + \varepsilon_t$ with last value $y_T = 10$.

- Stationary: the root of $1 - 0.5z$ is $z = 2$, outside the unit circle. Long-run mean $3/(1 - 0.5) = 6$.
- Forecasts: $\hat y_{T+1} = 3 + 0.5 \cdot 10 = 8$, $\hat y_{T+2} = 3 + 0.5 \cdot 8 = 7$, then $6.5$, $6.25$, decaying towards 6.
- Its ACF is $0.5^k$ ($0.5, 0.25, 0.125, \dots$), while its PACF is $0.5$ at lag 1 and 0 afterwards. With $T = 400$ observations, sample autocorrelations beyond $\pm 1.96/20 \approx \pm 0.098$ are significant at 5%.

## In code

```python
import numpy as np
import pandas as pd
from sklearn.model_selection import TimeSeriesSplit

y = pd.Series(np.arange(1.0, 11.0))                     # toy series 1, 2, ..., 10
X = pd.DataFrame({"lag1": y.shift(1),                   # value at t-1
                  "mean3": y.shift(1).rolling(3).mean()})  # mean of t-3..t-1, no leakage
print(X.iloc[3].tolist())                               # [3.0, 2.0]  features for y = 4
for tr, te in TimeSeriesSplit(n_splits=3).split(X):
    print(len(tr), te)                                  # 4 [4 5] / 6 [6 7] / 8 [8 9]
```

## Common pitfalls

- Random $K$-fold splits train on the future; for forecasting use time-ordered splits.
- Weak stationarity needs constant mean, variance and autocovariances, not an unchanging distribution; strict stationarity (with finite variance) implies weak, not the other way round [^3].
- AR stationarity is about roots **outside** the unit circle, not about every $\lvert\phi_i\rvert < 1$: $y_t = 0.6y_{t-1} + 0.5y_{t-2} + u_t$ has a root at $0.94$, inside the circle, so it is not stationary; $y_t = 1.5y_{t-1} - 0.5y_{t-2} + u_t$ has the roots 1 and 2, a unit root.
- A high lag-2 autocorrelation may just be lag-1 dependence carried over; look at the PACF before adding a lag-2 feature.
- `y.rolling(7).mean()` without `shift(1)` includes today's value and leaks the target.
- Differencing eliminates a trend (and, at lag $m$, the seasonality) instead of merely smoothing it; differencing more often than needed adds spurious autocorrelation [^2].
