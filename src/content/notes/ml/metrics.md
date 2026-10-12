---
topic: metrics
summary: How to score models — confusion-matrix metrics, thresholds, ROC/AUC and PR curves, multiclass averaging, regression errors and R², ranking metrics and calibration.
status: reviewed
reviewed_by: claude
references:
  - source: google-mlcc
    url: https://developers.google.com/machine-learning/crash-course/classification/accuracy-precision-recall
    locator: 'Classification: Accuracy, recall, precision, and related metrics (incl. Choice of metric and tradeoffs; F1 score)'
  - source: google-mlcc
    url: https://developers.google.com/machine-learning/crash-course/classification/roc-and-auc
    locator: 'Classification: ROC and AUC (incl. Precision-recall curve; AUC and ROC for choosing model and threshold)'
  - title: scikit-learn User Guide
    url: https://scikit-learn.org/stable/modules/model_evaluation.html
    locator: 'Sec. 3.4.4 Classification metrics (3.4.4.9 Precision, recall and F-measures; 3.4.4.13 Matthews correlation coefficient) and Sec. 3.4.6 Regression metrics (3.4.6.1 R² score; 3.4.6.5 Mean absolute percentage error)'
  - title: 'Wikipedia: Evaluation measures (information retrieval)'
    url: https://en.wikipedia.org/wiki/Evaluation_measures_(information_retrieval)
    locator: Offline metrics (Precision at k, Average precision, Mean average precision, Discounted cumulative gain)
  - title: scikit-learn User Guide
    url: https://scikit-learn.org/stable/modules/calibration.html
    locator: Sec. 1.16 Probability calibration (1.16.1 Calibration curves)
---
## Key ideas

**Confusion matrix** (also called an error matrix). For a binary classifier it counts true positives (TP), false positives (FP: an actual negative predicted positive, a false alarm), false negatives (FN: a missed positive) and true negatives (TN). "True/false" says whether the prediction was right; "positive/negative" names the class that was *predicted* [^1]. Check which axis holds the true class — below, rows are true classes.

**Binary metrics** [^1]

- *Accuracy* $= (TP + TN)/N$. Misleading when classes are imbalanced: always predicting the majority class scores the majority share, so compare with that baseline.
- *Recall* (true positive rate, sensitivity, probability of detection) $= TP/(TP + FN)$: the share of real positives found. Optimize it when misses are expensive (disease screening, an invasive pest).
- *Precision* $= TP/(TP + FP)$: the share of positive predictions that are right. It matters when false alarms are expensive (business mail sent to the spam folder).
- *False positive rate* $= FP/(FP + TN) = 1 -$ *specificity*, where specificity $= TN/(TN + FP)$.
- *F1*, the harmonic mean of precision and recall, sits close to the smaller of the two and ignores TN; it is the usual single number for imbalanced data [^1].

**Thresholds.** A classifier outputs a score; a threshold turns it into a label. Raising the threshold labels fewer examples positive, so TP and FP both fall while TN and FN both rise: recall can only fall or stay, precision usually (not always) rises [^1]. The threshold changes decisions, never the scores.

**ROC and AUC** [^2]. The ROC curve plots TPR against FPR over all thresholds, from $(0, 0)$ (nothing labelled positive) to $(1, 1)$ (everything positive). Random guessing gives the diagonal, AUC 0.5; a perfect ranking gives 1.0. AUC is the probability that a random positive gets a higher score than a random negative, so it depends only on the order of the scores: a strictly increasing transform such as $\log$ leaves it unchanged, and so does any later choice of threshold. An AUC below 0.5 means the ranking is reversed — flipping the predictions turns AUC into $1 - \text{AUC}$; a constant predictor is only at chance. To choose an operating point, pick a low FPR when false positives are costly and a high TPR when misses are costly [^2].

**Rare positives.** On imbalanced data, precision–recall curves often compare models more clearly than ROC curves [^2]. A random ranker has precision equal to the positive rate at every recall, so its average precision (area under the PR curve) is about that rate — 0.02 for 2% fraud — while its ROC AUC stays at 0.5 [^3].

**Multiclass** [^3]. With rows as true classes, precision of class $i$ divides the diagonal entry by its *column* sum (everything predicted $i$); recall divides it by its *row* sum (everything truly $i$). *Macro* averaging takes the plain mean of the per-class scores, so a rare class weighs as much as a frequent one; *weighted* averaging weights by class size; *micro* averaging pools the counts, and for single-label multiclass data micro precision, recall and F1 all equal accuracy [^3]. Macro-F1 is the mean of the per-class F1 scores, not the F1 of the mean precision and recall.

**Matthews correlation** (MCC) uses all four cells and ranges from $-1$ through 0 (random) to $+1$ (perfect), which keeps it informative under imbalance [^3].

**Regression metrics** [^3]

- *MAE*, mean absolute error: in target units, grows linearly with each error, so it is robust to outliers.
- *MSE*, mean squared error: in squared units; an error twice as large costs four times as much, so a few large misses dominate; the sign of the errors is lost.
- *RMSE* $= \sqrt{\text{MSE}}$: back in target units, never below MAE, as outlier-sensitive as MSE.
- *R²*: 1 for perfect predictions, 0 for always predicting the mean of $y$, negative when worse than that.
- *MAPE*: mean of $|y - \hat y|/|y|$ — relative and unitless, so it weighs small and large targets equally but blows up near $y = 0$. scikit-learn returns it as a fraction, not a percentage.

Squared-error metrics are dominated by the examples with large values, so a model can have a high R² and a poor MAPE at the same time.

**Ranking** [^4]. Precision@$k$ = relevant items in the top $k$ divided by $k$; recall@$k$ divides by the number of all relevant items. Average precision (AP) averages precision@$k$ over the ranks of the relevant items, divided by the total number relevant; MAP is AP averaged over queries. NDCG divides the discounted cumulative gain by that of the ideal order.

**Calibration** [^5]. A classifier is well calibrated if, among the cases it gives probability about 0.8, about 80% are positive. It is checked on held-out data with a calibration curve (reliability diagram) that bins the predictions. Ranking well and being calibrated are different properties.

## Formulas

$$
\text{precision} = \frac{TP}{TP + FP}, \qquad \text{recall} = \frac{TP}{TP + FN}, \qquad F_1 = \frac{2PR}{P + R} = \frac{2\,TP}{2\,TP + FP + FN}
$$

$$
\mathrm{MCC} = \frac{TP \cdot TN - FP \cdot FN}{\sqrt{(TP + FP)(TP + FN)(TN + FP)(TN + FN)}}
$$

$$
R^2 = 1 - \frac{\sum_i (y_i - \hat y_i)^2}{\sum_i (y_i - \bar y)^2}, \qquad \mathrm{DCG} = \sum_{i} \frac{\mathrm{rel}_i}{\log_2(i + 1)}
$$

ROC AUC = share of (positive, negative) pairs in which the positive has the higher score, ties counting one half.

## Worked example

*Classification.* 1000 items, 20 of them positive; the model gets TP = 15, FN = 5, FP = 25, TN = 955.

- Accuracy $= 970/1000 = 0.97$, *below* the 0.98 of always answering "negative".
- Precision $= 15/40 = 0.375$, recall $= 15/20 = 0.75$, F1 $= 30/60 = 0.5$ (the arithmetic mean would say 0.5625).
- Specificity $= 955/980 \approx 0.974$, FPR $\approx 0.026$, MCC $\approx 0.518$.

*AUC by counting pairs.* Positive scores 0.8, 0.4; negative scores 0.6, 0.3, 0.2. The 0.8 beats all 3 negatives and the 0.4 beats 2, so AUC $= 5/6 \approx 0.833$. Taking the log of every score keeps 0.833; replacing each score $s$ by $1 - s$ gives $1/6$.

*Regression.* $y = (3, 5, 8, 4)$, $\hat y = (4, 5, 6, 4)$: errors $\hat y - y = 1, 0, -2, 0$, so MAE $= 0.75$, MSE $= 1.25$, RMSE $\approx 1.118$. With $\bar y = 5$, the total sum of squares is 14 and the residual sum 5, so $R^2 = 1 - 5/14 \approx 0.643$. Predicting 6 for every case gives $R^2 \approx -0.286$.

## In code

```python
from sklearn.metrics import (confusion_matrix, f1_score, precision_score,
                             r2_score, recall_score, roc_auc_score)

y_true = [1, 1, 0, 0, 0, 1, 0, 0]
score = [0.9, 0.4, 0.35, 0.8, 0.1, 0.7, 0.2, 0.3]     # predicted P(y = 1)
y_pred = [int(s >= 0.5) for s in score]               # threshold 0.5
print(confusion_matrix(y_true, y_pred).ravel())       # [4 1 1 2] = tn, fp, fn, tp
p, r = precision_score(y_true, y_pred), recall_score(y_true, y_pred)
f1, auc = f1_score(y_true, y_pred), roc_auc_score(y_true, score)
print(round(p, 3), round(r, 3), round(f1, 3), round(auc, 3))  # 0.667 0.667 0.667 0.867
print(round(r2_score([3, 5, 8, 4], [4, 5, 6, 4]), 3),          # 0.643
      round(r2_score([3, 5, 8, 4], [6, 6, 6, 6]), 3))          # -0.286
```

## Common pitfalls

- High accuracy on imbalanced data can be worse than the majority-class baseline; look at recall, precision or F1 of the rare class.
- Recall of 1 does not mean no false positives (label everything positive), and higher accuracy does not imply higher precision or recall.
- Precision divides by the predicted-class total, recall by the true-class total; swapping row and column sums is the classic slip.
- Moving the decision threshold does not change ROC AUC; an AUC below 0.5 is fixed by reversing the scores, not by always predicting one class.
- Macro-F1 is the mean of the per-class F1 scores, and it lets a rare class pull the average down.
- R² can be negative on new data: the model is worse than predicting the mean.
- MSE is in squared units and RMSE is in target units; MAPE is unitless and unusable when true values are near zero.
- Precision, recall and accuracy count exact class matches — they are not regression metrics.
