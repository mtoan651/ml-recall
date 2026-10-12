---
topic: trees-ensembles
summary: Decision trees split greedily on impurity; bagging and random forests average many trees to cut variance, while boosting (AdaBoost, gradient boosting) adds trees in sequence to cut bias.
status: reviewed
reviewed_by: claude
references:
  - title: 'scikit-learn User Guide: Decision Trees'
    url: https://scikit-learn.org/stable/modules/tree.html#mathematical-formulation
    locator: Sec. 1.10 (advantages and disadvantages); Sec. 1.10.5 Tips on practical use; Sec. 1.10.6 Tree algorithms; Sec. 1.10.7 Mathematical formulation; Sec. 1.10.9 Minimal Cost-Complexity Pruning
  - title: 'scikit-learn User Guide: Ensembles'
    url: https://scikit-learn.org/stable/modules/ensemble.html#random-forests-and-other-randomized-tree-ensembles
    locator: Sec. 1.11.1.2 GradientBoostingClassifier and GradientBoostingRegressor (1.11.1.2.3 Mathematical formulation, 1.11.1.2.5 Shrinkage via learning rate); Sec. 1.11.2 Random forests and other randomized tree ensembles (1.11.2.1–1.11.2.3); Sec. 1.11.3 Bagging meta-estimator; Sec. 1.11.4 Voting Classifier; Sec. 1.11.6 Stacked generalization
  - title: 'Wikipedia: AdaBoost'
    url: https://en.wikipedia.org/wiki/AdaBoost#Example_algorithm_(Discrete_AdaBoost)
    locator: Example algorithm (Discrete AdaBoost); Boosting as gradient descent
  - title: 'Wikipedia: Bias–variance tradeoff'
    url: https://en.wikipedia.org/wiki/Bias%E2%80%93variance_tradeoff
    locator: Approaches
  - source: google-ml-courses
    url: https://developers.google.com/machine-learning/decision-forests/random-forests
    locator: 'Decision Forests: Random forests — The clarity of noise (adding more trees)'
  - title: 'scikit-learn User Guide: Permutation feature importance'
    url: https://scikit-learn.org/stable/modules/permutation_importance.html
    locator: Sec. 5.2.2 Relation to impurity-based importance in trees; Sec. 5.2.3 Misleading values on strongly correlated features
---
## Key ideas

**Decision trees.** A tree predicts by routing an example from the **root to a leaf**, answering one test per node; the leaf returns its majority class (classification), the class shares (`predict_proba`) or the mean target (regression) [^1]. Most tests are axis-aligned (one feature against a threshold); oblique tests that combine several features also exist.

- **Growing**: top-down and greedy. At each node, try every candidate split (for a numeric feature, thresholds halfway between sorted neighbouring values) and keep the one with the lowest weighted child impurity, i.e. the highest **information gain** [^1]. The search scores every candidate, so it returns the best candidate, not a local maximum. Finding the optimal tree is NP-complete, so greedy algorithms such as ID3 and CART give no optimality guarantee [^1].
- Splits depend only on the **order** of feature values, so standardising or negating a feature changes the thresholds but not the partition: trees need no feature scaling [^1].
- Trees are piecewise constant: they **cannot extrapolate** beyond the target range seen in training [^1].
- **Complexity control**: a deep tree overfits (it can memorise the training set); a too-shallow tree underfits (poor on training *and* test data). Regularise with `max_depth`, `min_samples_leaf`, a minimum impurity decrease, or post-pruning on a validation set or by cost-complexity pruning with $\alpha$ chosen by cross-validation [^1]. Pruning exists to fight overfitting.
- Strengths: interpretable if–then rules; weaknesses: high variance, since small data changes can give a very different tree [^1].

**Bagging and random forests.** Bagging trains each model on a **bootstrap sample** ($n$ draws with replacement; a point is missed with probability $(1 - 1/n)^n \approx 1/e$, so about $63\%$ of the points are distinct) and averages the predictions, which mainly **reduces variance**; it suits strong, unstable learners such as deep trees [^2][^4]. A **random forest** adds a second source of randomness: each split considers only a random subset of features (`max_features`, often $\sqrt d$ for classification) [^2]. Trees are independent, so they train in parallel [^2]. More trees cost time but cannot make a random forest overfit; beyond some number the error just stops improving [^5]. **Extra-trees** also draw the thresholds at random, which lowers variance a little more at a small cost in bias [^2].

**Boosting.** Weak learners are added **one after another**, each focusing on what the current ensemble gets wrong; it suits weak, high-bias learners such as stumps or shallow trees and mainly **reduces bias** [^2][^4].

- **AdaBoost** reweights the training points: misclassified points are multiplied by the same factor $e^{\alpha_t}$, correct ones by $e^{-\alpha_t}$ [^3]. The final classifier $H(x) = \operatorname{sign}\big(\sum_t \alpha_t h_t(x)\big)$ is a weighted vote, so its boundary is far richer than one stump's. AdaBoost minimises the exponential loss [^3].
- **Gradient boosting** fits each new tree to the negative gradient of the loss (for squared loss: the residuals $y - F_{m-1}(x)$) and adds it scaled by the learning rate $\nu$ [^2]. A smaller $\nu$ needs more trees for the same training error [^2]; as a rule of thumb, halving $\nu$ roughly doubles the number of trees, since each step is half as long. Gradient boosting uses shallow trees and **can overfit** as trees are added, so the number of trees is chosen by early stopping on validation data [^2]. Trees are built sequentially, so libraries parallelise the split search inside each tree.

**Combining models.** Hard voting takes the majority label; soft voting averages predicted probabilities, and the two can disagree [^2]. **Stacking** trains a meta-model on the base models' out-of-fold predictions [^2].

**Feature importance.** Impurity-based (MDI) importance comes from training-time splits and favours high-cardinality features, even pure noise; permutation importance on held-out data avoids this. When features are strongly correlated, permuting one barely hurts the model, so each gets a low permutation importance [^6].

## Formulas

- Node class shares $p_k$. Entropy $H = -\sum_k p_k \log_2 p_k$ (0 for a pure node, 1 bit for a 50/50 binary node); Gini $= 1 - \sum_k p_k^2$ [^1].
- Information gain $= H(\text{parent}) - \sum_{\text{children}} \frac{n_c}{n} H(c)$ [^1].
- Cost-complexity pruning: $R_\alpha(T) = R(T) + \alpha\,\lvert T \rvert$, with $\lvert T \rvert$ the number of leaves [^1].
- AdaBoost round $t$: $\epsilon_t = \sum_{i:\,h_t(x_i) \ne y_i} w_i$, $\alpha_t = \frac12 \ln\frac{1 - \epsilon_t}{\epsilon_t}$, $w_i \leftarrow w_i\, e^{-\alpha_t y_i h_t(x_i)}$, then renormalise [^3]. Since $\epsilon_t < \frac12$, $\alpha_t > 0$. After renormalising, the misclassified points hold exactly half the weight, so $h_t$ has error $\frac12$ and cannot be picked in the very next round.
- Gradient boosting: $F_m(x) = F_{m-1}(x) + \nu\, h_m(x)$, starting from a constant (the mean for squared loss) [^2].
- Averaging $k$ predictors whose errors have mean 0, variance $v$ and pairwise covariance $c$: expected squared error $\frac{v}{k} + \frac{k-1}{k}c$ (expand the variance of a mean). Correlated members ($c$ near $v$) gain little, which is why random forests decorrelate their trees.
- Majority vote of $k$ independent classifiers with error $p$: the vote is wrong when more than half are wrong, a binomial tail. Three members with $p = 0.2$ give $3p^2(1-p) + p^3 = 0.104$.

## Worked example

A node holds 5 positives and 3 negatives; a split sends $[4+, 0-]$ left and $[1+, 3-]$ right.

- Parent: $H(5/8) = 0.954$ bits; Gini $= 1 - (25 + 9)/64 = 0.469$.
- Children: left is pure ($H = 0$); right $H(1/4) = 0.811$, Gini $= 1 - (1 + 9)/16 = 0.375$.
- Weighted child entropy $= \frac48 \cdot 0 + \frac48 \cdot 0.811 = 0.406$, so the information gain is $0.954 - 0.406 = 0.549$ bits. Weighted Gini $= 0.1875$.

## In code

```python
import numpy as np
from sklearn.tree import DecisionTreeClassifier

x = np.arange(1, 9).reshape(-1, 1)
y = np.array([1, 1, 1, 1, 0, 1, 0, 0])
stump = DecisionTreeClassifier(criterion="entropy", max_depth=1).fit(x, y)
t = stump.tree_
print(t.threshold[0])               # 4.5
print(t.impurity.round(3))          # [0.954 0.    0.811]  (root, left, right)
print(stump.predict_proba([[6]]))   # [[0.75 0.25]]  class shares in the leaf
```

## Common pitfalls

- High entropy means an **impure** node; trees pick the split with the **largest** information gain (smallest weighted child impurity).
- Bad accuracy on both training and test data means the tree is too shallow (underfitting), not overfitting.
- More trees never make a random forest overfit, but they can make gradient boosting overfit; the learning rate belongs to boosting, not to random forests [^2][^5].
- A boosted classifier is a weighted vote of weak learners, not a weak learner with new parameters; AdaBoost's votes $\alpha_t$ are never negative.
- In AdaBoost, the weighted error of each newly chosen weak learner tends to **increase** over rounds, because the weights concentrate on hard points.
- Averaging probabilities is not guaranteed to beat the best member's accuracy; it helps most when members are accurate and their errors are weakly correlated.
- Standardising features is pointless for trees, unlike for $k$-NN or SVMs.
