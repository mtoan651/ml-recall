---
topic: data-prep
summary: Turning raw data into model-ready features — data types, cleaning, missing values, scaling, encoding categories, feature selection, class balance and avoiding leakage.
status: reviewed
reviewed_by: claude
references:
  - source: google-mlcc
    url: https://developers.google.com/machine-learning/crash-course/numerical-data/normalization
    locator: 'Numerical data: Normalization (Linear scaling, Z-score scaling, Log scaling, Clipping, Summary of normalization techniques, Exercise: Test your knowledge)'
  - title: scikit-learn User Guide
    url: https://scikit-learn.org/stable/modules/preprocessing.html
    locator: Sec. 8.3 Preprocessing data (8.3.1 Standardization, or mean removal and variance scaling; 8.3.4 Encoding categorical features; 8.3.5 Discretization; 8.3.7 Generating polynomial features)
  - title: scikit-learn User Guide
    url: https://scikit-learn.org/stable/common_pitfalls.html#data-leakage
    locator: Sec. 12.2 Data leakage (12.2.1 How to avoid data leakage)
  - source: d2l
    url: https://d2l.ai/chapter_multilayer-perceptrons/kaggle-house-price.html
    locator: Sec. 5.7.4 Data Preprocessing; Sec. 5.7.5 Error Measure
  - title: scikit-learn User Guide
    url: https://scikit-learn.org/stable/modules/feature_selection.html
    locator: Sec. 1.13 Feature selection (1.13.2 Univariate, 1.13.3 Recursive feature elimination, 1.13.4.1 L1-based, 1.13.5 Sequential Feature Selection)
  - title: 'Wikipedia: Missing data'
    url: https://en.wikipedia.org/wiki/Missing_data
    locator: Types (intro; Missing completely at random; Missing not at random)
---
## Key ideas

**Know your data.** Rows are examples, columns are features (measurable properties) or the label. *Numerical* (quantitative) features can be added and averaged: height, counts, marks. *Categorical* (qualitative) ones name groups: blood type, colour, free-text reviews. Digits do not make a column numeric — IDs, postcodes and phone numbers are categories. Structured data sits in fixed tables; semi-structured data (JSON documents, graphs) has a flexible structure; unstructured data (essays, images, audio) has none. By definition, a relational database splits data into tables linked by keys — a primary key identifies a row, a foreign key holds the primary key of a row in another table — and is queried with SQL; "NoSQL" is the umbrella name for non-relational stores (key–value, document, column-family, graph).

**Cleaning.** Fix formats (stray whitespace, mixed date or number conventions), wrong data types and duplicate rows; joining sources with different conventions is a common cause of both. Never delete correct values because they contradict a hypothesis. Plot before modelling: histograms and box plots reveal skew, outliers and class imbalance.

**Missing values** [^6]. First ask *why* values are missing. Values missing completely at random leave the remaining sample representative; values missing *not* at random — the gap depends on the missing value itself — can bias any analysis that ignores the reason [^6]. Example: `GarageArea` is blank exactly for houses without a garage, so the true value is 0 and filling in the mean invents a typical garage; fill 0, or keep the information in a "was missing" indicator column. Replacing a missing feature value by the column mean is a common simple heuristic [^4]. Never impute the *target*: an example without a label has nothing to teach, so drop it.

**Scaling numerical features** [^1]

| method | formula | suits |
| --- | --- | --- |
| linear (min–max) | $(x - x_{\min}) / (x_{\max} - x_{\min})$ | roughly uniform values with stable bounds, e.g. age |
| z-score | $(x - \mu) / \sigma$ | roughly bell-shaped values |
| log | $\ln x$ | power-law / long right tail, e.g. sales |
| clipping | cap at a chosen limit | rare but real extreme values |

Z-scores have mean 0 and standard deviation 1 but no fixed range; only min–max maps the training data into $[0, 1]$. Values that are recording errors (a temperature of 1000) should be deleted, not clipped [^1]. Methods built on distances, variances or penalties need comparable scales: $k$-NN, $k$-means and PCA, and — as scikit-learn notes — RBF-kernel SVMs and $\ell_1$/$\ell_2$-regularized linear models [^2]; gradient descent also converges faster [^1]. Trees split one feature at a threshold, so a monotone rescaling does not change them. For a positive, right-skewed target such as a house price, relative errors matter more than absolute ones, so errors are measured (and the model is often fitted) on $\log y$: a difference of logs is a log-ratio, i.e. a relative error [^4].

**Encoding categories** [^2]

- *One-hot*: one 0/1 column per category, so any two categories are $\sqrt 2$ apart and no false order is implied. With `handle_unknown="ignore"`, every category unseen in `fit` becomes the same all-zero row. Many categories make the table very wide (50,000 rows and 200 categories: 10 million cells instead of 50,000), and a column that is unique per row (a customer ID) only lets the model memorize rows — drop identifiers [^4].
- *Ordinal / integer codes*: one integer per category; linear and distance-based models read the order and spacing literally, so use them only for truly ordered levels. `LabelEncoder` numbers classes in sorted order (`['pear', 'apple', 'fig', 'apple']` → `[2, 0, 1, 0]`); an `OrdinalEncoder` fitted on training data raises an error on unseen categories unless told how to handle them.
- *Target encoding*: replace a category by a shrunk mean of the target. Fit it on separate data or by cross-fitting; otherwise a category that occurs once encodes its own label [^2].

**Feature engineering** [^2]. Binning (discretization) followed by one-hot encoding gives a linear model one weight per range, so it can follow a nonlinear relationship. Polynomial features (degree 2 on $[a, b]$ gives $[1, a, b, a^2, ab, b^2]$) let it bend [^2].

**Feature selection** [^5]. *Filters* score each feature alone (F-test, $\chi^2$ for non-negative features, mutual information): fast, but blind to interactions — a feature useless on its own can matter together with another (XOR). *Wrappers* search subsets by a cross-validation score: forward selection adds and backward selection removes one feature at a time (greedy, no guarantee); exhaustive search scores all $2^d$ subsets. Recursive feature elimination refits and drops the least important feature by `coef_` or `feature_importances_`. *Embedded*: the L1 penalty of the lasso sets coefficients exactly to zero; ridge shrinks but keeps every feature.

**Imbalanced classes.** A model trained on skewed classes leans towards the majority. Options: class weights, undersampling the majority, or oversampling the minority — by copying examples, or by generating new synthetic ones as SMOTE (Synthetic Minority Over-sampling Technique) does. Balancing evens out the classes; it is not a way to get more information. Stratified splits keep the class proportions in every fold.

**Leakage** [^3]. Leakage is using information at training time that will not exist at prediction time; it makes validation scores optimistic. Split first, then fit every imputer, scaler, encoder and selector on the training split only (`fit_transform` on train, `transform` on validation and test); a `Pipeline` does this inside each cross-validation fold. Watch for *target leakage* — features computed from the label or known only after it (price per square metre, a neighbourhood average that includes the sale itself) — and for *train–test contamination*: statistics from all rows, near-duplicate photos of one product in both splits, or random splits of time-ordered data.

## Formulas

Standardization with training statistics (`StandardScaler` uses the population standard deviation, dividing by $n$):

$$
z = \frac{x - \mu_{\text{train}}}{\sigma_{\text{train}}}, \qquad \sigma_{\text{train}} = \sqrt{\tfrac{1}{n}\textstyle\sum_i (x_i - \mu_{\text{train}})^2}
$$

Polynomial features of total degree at most $p$ in $d$ inputs, constant included: $\binom{d+p}{p}$ — 6 for $d = p = 2$, 10 for $d = 3, p = 2$.

## Worked example

Training column $[2, 4, 6, 12]$: $\mu = 6$, $\sigma = \sqrt{14} \approx 3.742$, so the z-scores are $[-1.069, -0.535, 0, 1.604]$. A test value 8 becomes $(8 - 6)/3.742 \approx 0.535$, computed with the *training* $\mu$ and $\sigma$. Min–max scaling with the training minimum 2 and maximum 12 maps 8 to 0.6 and a later value 15 to 1.3 — outside $[0, 1]$, which is expected. Refitting the scaler on training plus test rows (mean 6.4) would let the test data shift the statistics: leakage [^3].

## In code

```python
import pandas as pd
from sklearn.compose import make_column_transformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

X_train = pd.DataFrame({"area": [50.0, 80.0, None, 120.0], "city": ["Hanoi", "Hue", "Hanoi", "Hue"]})
X_test = pd.DataFrame({"area": [100.0], "city": ["Da Nang"]})   # a city never seen in training
prep = make_column_transformer(
    (make_pipeline(SimpleImputer(strategy="median"), StandardScaler()), ["area"]),
    (OneHotEncoder(handle_unknown="ignore"), ["city"]))
prep.fit(X_train)                        # medians, means, categories: training split only
print(prep.transform(X_test).round(2))   # [[0.7 0.  0. ]]  -> unseen city = all zeros
```

## Common pitfalls

- Scaling, imputing or selecting features on the full dataset before the split leaks test information into training; fit on the training split only.
- Standardization does not squeeze values into $[0, 1]$ — that is min–max scaling.
- Mean imputation is wrong when the blank itself means something (missing not at random); and a missing *target* is dropped, not imputed.
- `LabelEncoder` codes are alphabetical, and any integer code implies an order; use one-hot for nominal features.
- One-hot encoding a unique ID column lets the model memorize training rows and says nothing about new customers.
- A feature that separates the classes poorly on its own can still help in combination; univariate scores (correlation, mutual information) miss interactions.
- Ridge regression is not a feature-selection method: its weights shrink but stay non-zero.
- Decision trees do not need scaled inputs; $k$-NN, SVMs, PCA and $k$-means do.
