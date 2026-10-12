---
topic: information-theory
summary: Information as reduction of uncertainty — self-information, entropy, joint and conditional entropy, mutual information, KL divergence and the cross-entropy loss used to train classifiers.
status: reviewed
reviewed_by: claude
references:
  - source: d2l
    url: https://d2l.ai/chapter_appendix-mathematics-for-deep-learning/information-theory.html
    locator: Sec. 22.11.1 Information (Self-information); 22.11.2 Entropy (22.11.2.3 Interpretations; 22.11.2.4 Properties of Entropy)
  - source: d2l
    url: https://d2l.ai/chapter_appendix-mathematics-for-deep-learning/information-theory.html#mutual-information
    locator: Sec. 22.11.3 Mutual Information (Joint Entropy; Conditional Entropy; Mutual Information; Properties of Mutual Information)
  - source: d2l
    url: https://d2l.ai/chapter_appendix-mathematics-for-deep-learning/information-theory.html#kullbackleibler-divergence
    locator: Sec. 22.11.4 Kullback–Leibler Divergence (KL Divergence Properties); 22.11.5 Cross-Entropy
  - source: d2l
    url: https://d2l.ai/chapter_linear-classification/softmax-regression.html
    locator: Sec. 4.1.2 Loss Function (Log-Likelihood; Softmax and Cross-Entropy Loss); 4.1.3 Information Theory Basics
  - title: 'Wikipedia: Kullback–Leibler divergence'
    url: https://en.wikipedia.org/wiki/Kullback%E2%80%93Leibler_divergence
    locator: Definition; Properties; Examples — Multivariate normal distributions (univariate case)
  - title: 'Wikipedia: Conditional entropy'
    url: https://en.wikipedia.org/wiki/Conditional_entropy
    locator: Definition (equivocation); Properties
  - title: 'Wikipedia: Information gain (decision tree)'
    url: https://en.wikipedia.org/wiki/Information_gain_(decision_tree)
    locator: Introduction; General definition; Example (entropy of the parent minus average entropy of the children)
---
## Key ideas

**Information = reduction of uncertainty.** A message carries as much information as it removes
uncertainty: entropy before minus entropy after; a decision-tree split's *information gain* is
the label entropy of the parent minus the weighted entropy of the children [^7]. Rare events are
more surprising, and a near-certain event tells you almost nothing [^1].

**Self-information** of an outcome with probability $p$: $I=-\log_2p$ bits (use $\ln$ for nats;
1 nat $=1/\ln2\approx1.443$ bits) [^1]. A fair die roll carries $\log_2 6\approx2.585$ bits.

**Entropy** is the expected self-information, $H(X)=-\sum_x p(x)\log p(x)$ [^1]:

- $H\ge0$ for discrete $X$; $H\le\log k$ for $k$ outcomes, with equality only for the uniform
  distribution [^1]. Terms with $p=0$ contribute 0 ($0\log0:=0$).
- It is a lower bound on the average number of bits per symbol needed to encode $X$ [^1]. With $k$
  equally likely symbols a fixed-length code spends $\lceil\log_2k\rceil$ bits — more than $\log_2k$
  unless $k$ is a power of 2. Coding $n$ symbols together needs $\lceil n\log_2k\rceil/n$ bits per
  symbol, which approaches $\log_2k$. With $b$-ary symbols, $N$ messages need $\lceil\log_bN\rceil$
  symbols, and finding one of $N$ equally likely items takes $\lceil\log_2N\rceil$ yes/no questions.
- Randomness per character of a source: bits per choice divided by characters per choice, e.g.
  $\log_2(\text{vocabulary size})$ over the average word length.
- **Differential entropy** $h(X)=-\int p\log p$ of a continuous variable *can be negative*
  ($U(0,\tfrac12)$ has $h=-1$ bit) [^1].
- Binary entropy $H(p)=-p\log_2p-(1-p)\log_2(1-p)$ peaks at 1 bit for $p=\tfrac12$;
  $H'(p)=\log_2\frac{1-p}{p}$.

**Two variables** [^2]: joint entropy $H(X,Y)$ satisfies $\max(H(X),H(Y))\le H(X,Y)\le H(X)+H(Y)$,
with the upper bound reached iff $X\perp Y$ [^2]. Conditional entropy $H(Y\mid X)=H(X,Y)-H(X)$ is
what remains unknown about $Y$ after seeing $X$ [^2]; the uncertainty about what was *sent* that
remains after receiving the signal, $H(\text{sent}\mid\text{received})$, is called the
*equivocation* [^6]. If $Y=f(X)$ then $H(X,Y)=H(X)$, and a one-to-one relabelling of a pair keeps its
joint entropy.

**Mutual information** [^2]:

$$
I(X,Y)=H(X)-H(X\mid Y)=H(Y)-H(Y\mid X)=H(X)+H(Y)-H(X,Y)=D_{\mathrm{KL}}\big(p(x,y)\,\|\,p(x)p(y)\big)
$$

It is symmetric, $\ge0$, and $0$ iff $X$ and $Y$ are independent [^2]. Unlike correlation it sees
non-linear dependence: if $Y$ is a function of $X$, $I(X,Y)=H(Y)$ even when their correlation is
zero. The information gain of a split is the mutual information between the label and the split
attribute [^7]. Mixing distributions raises entropy: tossing a randomly chosen biased coin has more
entropy than the average entropy of the coins, by exactly the information the toss gives about the
coin.

**KL divergence** $D_{\mathrm{KL}}(P\|Q)=\sum_xP(x)\log\frac{P(x)}{Q(x)}$ [^3]:

- $\ge0$ (Gibbs' inequality, via Jensen), $=0$ iff $P=Q$ [^3][^5].
- **Not symmetric**, so not a distance [^3].
- **Infinite** if $Q(x)=0$ for some $x$ with $P(x)>0$ — a problem for count-based estimates with
  zeros (smoothing helps) [^3][^5].
- $D_{\mathrm{KL}}(P\|Q)+D_{\mathrm{KL}}(Q\|P)=\sum_x(P(x)-Q(x))\log\frac{P(x)}{Q(x)}$.

**Cross-entropy** $H(P,Q)=-\sum_xP(x)\log Q(x)$ is the expected surprisal of someone who believes
$Q$ while data come from $P$ [^3][^4]. Since $H(P,Q)=H(P)+D_{\mathrm{KL}}(P\|Q)$ and $H(P)$ is fixed by
the data, minimising cross-entropy over $Q$ is minimising KL, and for one-hot labels it is
maximising the log-likelihood: the loss is $-\log q_y$ for the true class $y$ [^3][^4]. With softmax
outputs this is $-z_y+\log\sum_je^{z_j}$ for logits $z$ [^4]. For fixed $P$ it is smallest at $Q=P$.

## Formulas

$$
D_{\mathrm{KL}}\big(\mathcal N(\mu_0,\sigma_0^2)\,\|\,\mathcal N(\mu_1,\sigma_1^2)\big)=\ln\frac{\sigma_1}{\sigma_0}+\frac{\sigma_0^2+(\mu_0-\mu_1)^2}{2\sigma_1^2}-\frac12
$$

With equal variances this is $(\mu_0-\mu_1)^2/(2\sigma^2)$ in both directions [^5]. Entropy is concave:
the entropy of a mixture is at least the average entropy of its components.

## Worked example

$P=(0.5,0.3,0.2)$: $H(P)=0.5(1)+0.3(1.737)+0.2(2.322)\approx1.485$ bits. Against the uniform
$Q=(\tfrac13,\tfrac13,\tfrac13)$: $H(P,Q)=\log_23\approx1.585$, so $D_{\mathrm{KL}}(P\|Q)\approx1.585-1.485=0.099$
bits, while $D_{\mathrm{KL}}(Q\|P)\approx0.101$ bits — different. Mutual information of a fair bit sent
through a channel that flips it with probability 0.25: $I=1-H(0.25)=1-0.811\approx0.189$ bits.

## In code

```python
import numpy as np
from scipy.stats import entropy
import torch
import torch.nn.functional as F

p = np.array([0.5, 0.3, 0.2])
q = np.ones(3) / 3
print(round(entropy(p, base=2), 4))        # 1.4855
print(round(entropy(p, q, base=2), 4))     # 0.0995  KL(p||q)
print(round(entropy(q, p, base=2), 4))     # 0.1013  KL(q||p)
logits, y = torch.tensor([[2.0, 1.0, 0.1]]), torch.tensor([0])
print(round(F.cross_entropy(logits, y).item(), 4))   # 0.417 = -log softmax(logits)[y]
```

## Common pitfalls

- **Units**: $\log_2$ gives bits, $\ln$ gives nats — don't mix them in one calculation.
- **$H(X,Y)\le H(X)+H(Y)$**, never $\ge$ (except with equality under independence) [^2].
- **KL is asymmetric and can be infinite**; it is not a metric [^3].
- **Zero correlation does not imply zero mutual information**.
- **Differential entropy can be negative**; discrete entropy cannot [^1].
- **Cross-entropy ≥ entropy**: $H(P,Q)\ge H(P)$, with equality only when $Q=P$ [^3].
