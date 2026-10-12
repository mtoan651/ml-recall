---
topic: probabilistic-models
summary: Generative classifiers, Bayesian networks and Markov random fields, d-separation, exact inference by message passing (forward, Viterbi), parameter learning with priors and EM, and Gaussian processes.
status: reviewed
reviewed_by: claude
references:
  - title: 'Wikipedia: Bayesian network'
    url: https://en.wikipedia.org/wiki/Bayesian_network#Factorization_definition
    locator: Graphical model; Definitions and concepts (Factorization definition, Markov blanket, d-separation); Inference and learning (Inferring unobserved variables, Parameter learning); Inference complexity and approximation algorithms
  - source: gutmann-pen-paper
    url: https://arxiv.org/abs/2206.13446
    locator: Ch. 3.2 Canonical connections; Ch. 4.2 Factorisation and independencies for undirected graphical models; Ch. 4.6 Undirected graphical model with pairwise potentials; Ch. 5.1 I-equivalence; Ch. 5.4 Moralisation; Ch. 6.5 Choice of elimination order in factor graphs; Ch. 8.2 Posterior of the mean of a Gaussian with known variance; Ch. 8.3 Maximum likelihood estimation of probability tables; Ch. 8.5 Bayesian inference for the Bernoulli model
  - title: 'Wikipedia: Belief propagation'
    url: https://en.wikipedia.org/wiki/Belief_propagation
    locator: Description of the sum-product algorithm; Exact algorithm for trees; Approximate algorithm for general graphs; Related algorithm and complexity issues
  - title: Bishop, Pattern Recognition and Machine Learning (2006)
    url: https://www.microsoft.com/en-us/research/wp-content/uploads/2006/01/Bishop-Pattern-Recognition-and-Machine-Learning-2006.pdf
    locator: Sec. 1.5.5 Loss functions for regression, p. 48; Sec. 9.4 The EM Algorithm in General, eqs. (9.76)–(9.77), p. 454; Sec. 13.2.1 Maximum likelihood for the HMM, p. 615; Sec. 13.2.2 The forward-backward algorithm, p. 621; Sec. 13.2.5 The Viterbi algorithm, pp. 629–630
  - title: 'Wikipedia: Expectation–maximization algorithm'
    url: https://en.wikipedia.org/wiki/Expectation%E2%80%93maximization_algorithm
    locator: Description — The EM algorithm; Properties; Proof of correctness
  - source: d2l
    url: https://d2l.ai/chapter_gaussian-processes/gp-inference.html
    locator: Sec. 18.3 Gaussian Process Inference (18.3.2 Equations for Making Predictions; 18.3.3 Interpreting Equations; 18.3.4 Worked Example from Scratch; 18.3.7 Exercises)
---
## Key ideas

**Generative vs discriminative.** A generative classifier models $p(\mathbf{x}, y) = p(y)\,p(\mathbf{x} \mid y)$ and classifies with Bayes' rule; a discriminative one (logistic regression) models $p(y \mid \mathbf{x})$ directly. **Naive Bayes** assumes the features are independent given the class, so it only stores per-class counts: training is one pass, updates are cheap, but it cannot capture feature interactions (it fails on XOR). In a Gaussian class-conditional model, the covariance choice is the main complexity knob: a full matrix has $d(d+1)/2$ parameters per class, a diagonal one $d$. A shared covariance gives a linear boundary, separate ones a quadratic boundary.

**Bayesian networks** (directed acyclic graphs) factorise the joint as $p(\mathbf{x}) = \prod_i p(x_i \mid \mathrm{pa}_i)$ [^1]. A binary node with $k$ binary parents needs $2^k$ numbers (one per parent configuration), far fewer than a full table [^1].

**d-separation.** A trail between two variables is blocked by an evidence set $Z$ if it contains [^1][^2]:

| Connection | Blocked when | So |
|---|---|---|
| chain $x \to z \to y$ | $z$ observed | $x \perp y \mid z$ |
| fork $x \leftarrow z \to y$ | $z$ observed | $x \perp y \mid z$ |
| collider $x \to z \leftarrow y$ | neither $z$ nor any descendant observed | $x \perp y$, but in general not $x \perp y \mid z$ |

Observing a collider (or a descendant) makes its parents dependent; typically, once the effect is seen, evidence for one cause lowers the probability of the other (**explaining away**). If every trail is blocked, the independence holds for *every* distribution on the graph; a d-connected pair is only *not guaranteed* independent. The **Markov blanket** (parents, children, children's other parents) shields a node from all the rest [^1].

**Markov random fields** (undirected) write $p \propto \prod_C \phi_C(\mathbf{x}_C)$ over the maximal cliques, with a partition function $Z$. Sets are independent given a separating set; a node's Markov blanket is just its neighbours [^2]. For a Gaussian, a zero in the precision matrix $\Sigma^{-1}$ means conditional independence given all other variables [^2]. **Moralisation** turns a DAG into an undirected I-map: marry the parents of each node, then drop the arrows; it loses the marginal independence of a collider's parents [^2]. Two DAGs encode the same independencies (I-equivalent) exactly when they share the skeleton and the immoralities (colliders with unlinked parents) [^2].

**Inference.** Exact inference is NP-hard in general [^1]. Variable elimination sums variables out one at a time; the cost is set by the largest intermediate factor, so the order matters: eliminate variables with few neighbours first [^2]. On a tree-structured factor graph the **sum-product** algorithm gives exact marginals in two passes; a leaf variable sends the constant message 1. On graphs with loops it is only approximate ("loopy BP") [^3]. Replacing sums by maxima (max-product, or max-sum in logs) finds the most probable joint configuration; Viterbi is the special case for chains [^3]. A constant factor such as $1/Z$ does not change the arg max.

**HMMs.** Hidden chain with transitions $a_{ij}$ and emissions $b_j(o) = P(o \mid \text{state } j)$. The forward recursion sums over the previous state, Viterbi maximises over it and keeps back-pointers. Both cost $O(n^2 T)$ for $n$ states and $T$ steps, against $O(T n^T)$ for enumerating all $n^T$ paths [^4].

**Learning.** With complete data, the maximum-likelihood conditional probability table is normalised counts, undefined for a parent configuration never seen [^2]. A Beta prior fixes this: $\mathrm{Beta}(\alpha, \beta)$ plus $s$ successes and $f$ failures gives $\mathrm{Beta}(\alpha + s, \beta + f)$ [^2]. With latent variables, **EM** alternates an E-step (posterior of the latent variables) and an M-step (maximise the expected complete-data log-likelihood) [^5]. Each iteration never decreases the observed-data likelihood, but EM may stop at a local optimum [^5]. For MAP estimation only the M-step changes: the prior does not involve the latent variables, so the E-step is the same and the M-step maximises the same expectation plus $\log p(\theta)$ [^4].

**Gaussian processes.** The posterior mean is a weighted combination of the observed targets, but the posterior variance does not depend on their values [^6]. With an RBF kernel, far from the data every $k(x, x_i)$ vanishes, so the posterior falls back to the prior (mean 0, variance $k(x, x)$) [^6]. That epistemic uncertainty grows away from the data and shrinks as data arrive; the observation noise $\sigma^2$ is aleatoric and does not shrink [^6]. The marginal likelihood used to fit $\ell$ and $\sigma^2$ is non-convex, and a smooth-and-noisy fit and a wiggly-and-precise fit can both be local optima [^6].

## Formulas

- Bayes: $p(y \mid \mathbf{x}) = p(\mathbf{x} \mid y)\,p(y) / \sum_{y'} p(\mathbf{x} \mid y')\,p(y')$.
- Parameters of a discrete BN: $\sum_i (K_i - 1)\prod_{j \in \mathrm{pa}_i} K_j$.
- $x \perp y \mid z \iff p(x, y, z) = a(x, z)\,b(y, z)$ for some non-negative $a, b$.
- Forward: $\alpha_t(j) = b_j(o_t) \sum_i \alpha_{t-1}(i)\,a_{ij}$, $P(O) = \sum_j \alpha_T(j)$. Viterbi: $\delta_t(j) = b_j(o_t) \max_i \delta_{t-1}(i)\,a_{ij}$.
- Beta posterior mean $\frac{\alpha + s}{\alpha + \beta + n}$ [^2]; Laplace (add-one) smoothing is the uniform prior $\mathrm{Beta}(1,1)$: $\frac{s + 1}{n + 2}$.
- Point estimates: squared loss → posterior mean, absolute loss → median, 0–1 loss → mode (MAP) [^4].
- Gaussian prior times Gaussian likelihood: posterior precision = sum of the precisions, posterior mean = precision-weighted average of the two means [^2].
- GP regression [^6]: $\mu_* = \mathbf{k}_*^\top (K + \sigma^2 I)^{-1}\mathbf{y}$, $\;s_*^2 = k(x_*, x_*) - \mathbf{k}_*^\top (K + \sigma^2 I)^{-1}\mathbf{k}_*$; a new noisy $y_*$ has variance $s_*^2 + \sigma^2$.

## Worked example

Rain $R$ and sprinkler $S$ both cause wet grass $W$ ($R \to W \leftarrow S$). $P(R{=}1) = 0.2$, $P(S{=}1) = 0.3$, and $P(W{=}1 \mid R, S) = 0.05, 0.8, 0.9, 0.99$ for $(R, S) = (0,0), (0,1), (1,0), (1,1)$. That is $1 + 1 + 4 = 6$ parameters instead of $2^3 - 1 = 7$.

- $P(R, S, W{=}1)$: $0.8 \cdot 0.7 \cdot 0.05 = 0.028$, $0.8 \cdot 0.3 \cdot 0.8 = 0.192$, $0.2 \cdot 0.7 \cdot 0.9 = 0.126$, $0.2 \cdot 0.3 \cdot 0.99 = 0.0594$; sum $P(W{=}1) = 0.4054$.
- $P(R{=}1 \mid W{=}1) = (0.126 + 0.0594)/0.4054 = 0.457$, up from the prior 0.2.
- Now learn $S = 1$: $P(R{=}1 \mid W{=}1, S{=}1) = 0.0594/(0.192 + 0.0594) = 0.236$. The sprinkler explains the wet grass away.

## In code

```python
import numpy as np

pi = np.array([0.6, 0.4])                          # initial distribution
A = np.array([[0.7, 0.3], [0.4, 0.6]])             # A[i, j] = P(next j | now i)
B = np.array([[0.5, 0.4, 0.1], [0.1, 0.3, 0.6]])   # B[i, o] = P(obs o | state i)
obs = [0, 1, 2]
alpha = delta = pi * B[:, obs[0]]
for o in obs[1:]:
    alpha = (alpha @ A) * B[:, o]                       # forward: sum over previous state
    delta = (delta[:, None] * A).max(axis=0) * B[:, o]  # Viterbi: max over previous state
print(alpha.sum().round(5))   # 0.03628  = P(observations)
print(delta.max().round(5))   # 0.01512  = P(best path, observations)
```

## Common pitfalls

- Colliders work the other way round: their parents are independent until the collider **or one of its descendants** is observed.
- "EM always increases the likelihood" is false: it never *decreases* it, and it can converge to a local optimum [^5].
- The most likely path (Viterbi) is not the sequence of individually most likely states taken from the forward or forward–backward values; that sequence can even have probability 0 [^4].
- Emission probabilities are $P(\text{observation} \mid \text{state})$, not the probability of a state given what was observed.
- A conditional independence that holds in one distribution need not be visible as d-separation in its graph; d-separation is a sufficient, graph-level guarantee.
- With the kernel hyperparameters fixed, more data never increases a GP's posterior variance, whatever value is observed [^6].
- Without smoothing, an unseen feature value gives naive Bayes a zero probability for that class.
