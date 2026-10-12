---
topic: probability
summary: The probability toolkit for ML — rules and Bayes' theorem, independence, random variables, expectation and variance, common distributions, the law of large numbers and the CLT.
status: reviewed
reviewed_by: claude
references:
  - source: d2l
    url: https://d2l.ai/chapter_preliminaries/probability.html
    locator: Sec. 2.6.1 A Simple Example — Tossing Coins; 2.6.2 A More Formal Treatment; 2.6.4 Multiple Random Variables; 2.6.5 An Example; 2.6.6 Expectations; 2.6.7 Discussion
  - source: d2l
    url: https://d2l.ai/chapter_appendix-mathematics-for-deep-learning/random-variables.html
    locator: Sec. 22.6.1.2 Probability Density Functions; 22.6.1.3 Cumulative Distribution Functions; 22.6.1.4–22.6.1.6 Means, Variances, Standard Deviations; 22.6.1.10 Covariance; 22.6.1.11 Correlation
  - source: d2l
    url: https://d2l.ai/chapter_appendix-mathematics-for-deep-learning/distributions.html
    locator: Sec. 22.8.1 Bernoulli; 22.8.3 Continuous Uniform; 22.8.4 Binomial; 22.8.5 Poisson; 22.8.6 Gaussian
  - title: 'Wikipedia: Fréchet inequalities'
    url: https://en.wikipedia.org/wiki/Fr%C3%A9chet_inequalities
    locator: Introduction (bounds for a conjunction and a disjunction of two events)
  - title: 'Wikipedia: Inverse transform sampling'
    url: https://en.wikipedia.org/wiki/Inverse_transform_sampling
    locator: The method; Examples (exponential distribution)
  - title: 'Wikipedia: Exponential distribution'
    url: https://en.wikipedia.org/wiki/Exponential_distribution
    locator: Infobox (mean, variance); Properties (Memorylessness)
  - title: 'Wikipedia: Geometric distribution'
    url: https://en.wikipedia.org/wiki/Geometric_distribution
    locator: Infobox and Definition (pmf, mean, variance); Properties (Memorylessness)
  - title: 'Wikipedia: Hypergeometric distribution'
    url: https://en.wikipedia.org/wiki/Hypergeometric_distribution
    locator: Infobox; Definitions (sampling without replacement)
---
## Key ideas

**Rules.** Probabilities are non-negative, the sample space has probability 1, and disjoint events
add; hence $P(\lnot A)=1-P(A)$ and $P(\emptyset)=0$ [^1]. For any two events
$P(A\cup B)=P(A)+P(B)-P(A\cap B)$. If only $P(A)$ and $P(B)$ are known, the Fréchet bounds give
the range of the joint events [^4] (see Formulas).

**Conditioning.** $P(B\mid A)=P(A,B)/P(A)$. The chain rule
$P(A,B,C)=P(A,B\mid C)\,P(C)=P(A\mid B,C)\,P(B\mid C)\,P(C)$ needs no independence assumption.
Marginalise with $P(B)=\sum_a P(B,A=a)=\sum_a P(B\mid A=a)P(A=a)$ — the **law of total
probability**: average the conditional probabilities over the cases [^1]. From a two-way
table, $P(\lnot T\mid O)=1-P(O\cap T)/P(O)$. **Bayes' theorem** turns $P(\text{evidence}\mid
\text{cause})$ into $P(\text{cause}\mid\text{evidence})$; for a rare condition, even an accurate test
gives a modest posterior because most positives are false positives (base-rate effect) [^1].

**Independence.** $A\perp B$ iff $P(A,B)=P(A)P(B)$. *Mutually exclusive* events with positive
probabilities are **dependent** (knowing one happened rules out the other). Conditional
independence $P(A,B\mid C)=P(A\mid C)P(B\mid C)$ neither implies nor follows from independence [^1].
Independent trials have no memory: after three even rolls, the next is still even with probability
1/2. Continuous $X,Y$ are independent exactly when the joint density factorises,
$p(x,y)=p_X(x)\,p_Y(y)$; then their covariance is 0. For a point drawn uniformly from a region, a
probability is a ratio of areas (favourable area / total area).

**Random variables.** A pmf gives probabilities; a **density** $p(x)$ is not a probability and can
exceed 1 (Uniform(0, 0.5) has density 2) — only its integral over an interval is [^2]. The CDF
$F(x)=P(X\le x)$ rises from 0 to 1 [^2].

**Expectation and variance** [^1][^2]: $E$ is linear, $E[aX+b]=aE[X]+b$, $E[X+Y]=E[X]+E[Y]$
always. $\mathrm{Var}(X)=E[X^2]-E[X]^2$, $\mathrm{Var}(aX+b)=a^2\mathrm{Var}(X)$, and for
**independent** $X,Y$: $\mathrm{Var}(X\pm Y)=\mathrm{Var}X+\mathrm{Var}Y$ — variances add, standard
deviations do not. $\mathrm{Cov}(X,Y)=E[XY]-E[X]E[Y]$; correlation is covariance divided by both
SDs and lies in $[-1,1]$. Independence ⇒ zero covariance, but not conversely ($Y=X^2$ with $X$
uniform on $\{-1,0,1\}$) [^2]. For a random vector with covariance $\Sigma$,
$\mathrm{Var}(\alpha^\top X)=\alpha^\top\Sigma\alpha$.

**Distributions** [^3]:

| Distribution | Use | Mean | Variance |
| --- | --- | --- | --- |
| Bernoulli($p$) | one yes/no trial | $p$ | $p(1-p)$ |
| Binomial($n,p$) | successes in $n$ **fixed, independent, same-$p$** trials | $np$ | $np(1-p)$ |
| Poisson($\lambda$) | counts of rare events (binomial limit) | $\lambda$ | $\lambda$ |
| Uniform($a,b$) | flat density | $(a+b)/2$ | $(b-a)^2/12$ |
| Normal($\mu,\sigma^2$) | sums/averages (CLT) | $\mu$ | $\sigma^2$ |
| Exponential($\lambda$) | waiting times, memoryless [^6] | $1/\lambda$ | $1/\lambda^2$ |
| Geometric($p$) | trial of the first success, $P(k)=(1-p)^{k-1}p$ [^7] | $1/p$ | $(1-p)/p^2$ |
| Hypergeometric($N,K,n$) | successes in $n$ draws *without* replacement [^8] | $nK/N$ | smaller than binomial |

**Counting.** $\binom nk=\frac{n!}{k!(n-k)!}$ ways to choose $k$ of $n$. Binomial:
$P(X=k)=\binom nk p^k(1-p)^{n-k}$ [^3]; get "at least $k$" by summing or via the complement.
Hypergeometric: $P(X=k)=\binom Kk\binom{N-K}{n-k}/\binom Nn$ [^8]. A count is binomial only if the
trials are independent with one fixed $p$ — defects that come in batches, for example, are not.
A Poisson($\lambda$) count with integer $\lambda$ is a sum of $\lambda$ independent Poisson(1) counts, so
the CLT makes it nearly normal for large $\lambda$.

**Limits.** The **law of large numbers**: sample averages converge to the expectation. The **central
limit theorem**: the standardised sum (or mean) of many i.i.d. variables with finite variance is
approximately normal, whatever their distribution [^3]. The mean of $n$ draws has standard
deviation $\sigma/\sqrt n$, so estimation error shrinks like $1/\sqrt n$ [^1]. Epistemic
uncertainty (about a parameter, e.g. a bent coin's bias) shrinks with data; aleatoric uncertainty
(the next toss) does not [^1].

**Sampling.** Inverse transform: draw $u\sim U(0,1)$ and return $x=F^{-1}(u)$; for the exponential,
$x=-\ln(1-u)/\lambda$ [^5].

## Formulas

$$
P(H\mid D)=\frac{P(D\mid H)\,P(H)}{P(D\mid H)\,P(H)+P(D\mid\lnot H)\,P(\lnot H)}
$$

$$
\max(0,\,P(A)+P(B)-1)\le P(A\cap B)\le\min(P(A),P(B)),\qquad \max(P(A),P(B))\le P(A\cup B)\le\min(1,\,P(A)+P(B))
$$

Chebyshev: $P(|X-\mu|\ge k\sigma)\le 1/k^2$ for any distribution with finite variance [^2].

## Worked example

Prevalence 1%, sensitivity $P(+\mid D)=0.95$, false-positive rate $P(+\mid\lnot D)=0.05$.
$P(+)=0.95(0.01)+0.05(0.99)=0.059$, so $P(D\mid +)=0.0095/0.059\approx0.161$ — only 16%. A second
positive test that is conditionally independent given the disease status raises it to
$0.95^2(0.01)/(0.95^2(0.01)+0.05^2(0.99))\approx0.785$.

## In code

```python
import numpy as np

rng = np.random.default_rng(0)
lam = 2.0
u = rng.uniform(size=100_000)
x = -np.log(1 - u) / lam           # inverse-CDF sample of Exponential(2)
print(round(x.mean(), 3), round(x.var(), 3))   # 0.499 0.25  (theory: 0.5, 0.25)
```

## Common pitfalls

- **Disjoint ≠ independent**: $P(A\cap B)=0$ with positive $P(A)$, $P(B)$ means dependent.
- **$P(A\mid B)\ne P(B\mid A)$**: forgetting the prior (base rate) is the classic Bayes error [^1].
- **A density value is not a probability**; $p(x)>1$ is allowed [^2].
- **SDs of independent sums don't add**: four independent items with SD 10 have a total SD of
  $\sqrt{4\cdot100}=20$, not 40 [^2].
- **Zero correlation does not mean independence** [^2].
- **The 68–95 rule is for normal distributions**; for an arbitrary distribution only Chebyshev holds
  (at most $1/k^2$ beyond $k$ SDs).
- **Gambler's fallacy**: past independent outcomes don't change the next one; long runs (10 heads)
  are unlikely but possible.
