---
topic: statistics
summary: Collecting and summarising data, sampling distributions, confidence intervals and hypothesis tests, plus estimation for ML — maximum likelihood, bias and MSE, Bayesian posteriors and MCMC.
status: reviewed
reviewed_by: claude
references:
  - title: 'OpenIntro, Introduction to Modern Statistics (2nd ed.), Ch. 2 Study design'
    url: https://github.com/OpenIntroStat/ims/blob/b88f367ac03a7b2998812d0dd49d57a8493c3b84/data-design.qmd
    locator: Sec. 2.1 Sampling principles and strategies (Four sampling methods); 2.2 Experiments (Principles of experimental design; Reducing bias in human experiments); 2.3 Observational studies
  - title: 'OpenIntro, Introduction to Modern Statistics (2nd ed.), Ch. 13 Inference with mathematical models'
    url: https://github.com/OpenIntroStat/ims/blob/b88f367ac03a7b2998812d0dd49d57a8493c3b84/foundations-mathematical.qmd
    locator: Sec. 13.1 Central Limit Theorem; 13.2 Normal Distribution (Standardizing with Z scores); 13.3 Quantifying the variability of a statistic (68-95-99.7 rule; Standard error; Margin of error); 13.6.3 Interpreting confidence intervals
  - source: d2l
    url: https://d2l.ai/chapter_appendix-mathematics-for-deep-learning/statistics.html
    locator: Sec. 22.10.1 Evaluating and Comparing Estimators; 22.10.2 Conducting Hypothesis Tests; 22.10.3 Constructing Confidence Intervals
  - source: d2l
    url: https://d2l.ai/chapter_appendix-mathematics-for-deep-learning/maximum-likelihood.html
    locator: Sec. 22.7.1 The Maximum Likelihood Principle; 22.7.2 Numerical Optimization and the Negative Log-Likelihood; 22.7.3 Maximum Likelihood for Continuous Variables
  - title: 'Wikipedia: Conjugate prior'
    url: https://en.wikipedia.org/wiki/Conjugate_prior
    locator: Example; Interpretations (Pseudo-observations); Table of conjugate distributions
  - title: 'Wikipedia: Metropolis–Hastings algorithm'
    url: https://en.wikipedia.org/wiki/Metropolis%E2%80%93Hastings_algorithm
    locator: Description; Step-by-step instructions
  - title: 'OpenIntro, Introduction to Modern Statistics (2nd ed.), Ch. 7 Linear regression with a single predictor'
    url: https://github.com/OpenIntroStat/ims/blob/b88f367ac03a7b2998812d0dd49d57a8493c3b84/model-slr.qmd
    locator: Sec. 7.1 Fitting a line, residuals, and correlation (Describing linear relationships with correlation); 7.2 Least squares regression (Describing the strength of a fit)
  - title: 'OpenIntro, Introduction to Modern Statistics (2nd ed.), Ch. 18 Inference for two-way tables'
    url: https://github.com/OpenIntroStat/ims/blob/b88f367ac03a7b2998812d0dd49d57a8493c3b84/inference-tables.qmd
    locator: Sec. 18.1 Randomization test of independence (Expected counts in two-way tables); 18.2 Mathematical model for test of independence (degrees of freedom; conditions)
---
## Key ideas

**Collecting data** [^1]. A *parameter* describes the population, a *statistic* the sample.

- Sampling: **simple random** (every subset equally likely), **stratified** (random sample inside
  each group, e.g. each district — gives comparisons between groups), **cluster** (sample whole
  groups), **multistage**.
- Bias in surveys: **voluntary response** (only people with strong opinions call in),
  **non-response** (follow up non-responders rather than ignore them), **response bias** (leading
  wording), convenience samples. A bigger sample does not fix bias.
- **Observational study**: researchers only observe → association, possibly due to a
  **confounding** (lurking) variable. **Experiment**: researchers assign treatments at random →
  causal conclusions [^1].
- Experimental principles: **control** (the control group gets the identical procedure minus the
  treatment, e.g. a placebo), **randomise**, **replicate**, **block** (group similar units, e.g. by
  sex, then randomise within blocks to reduce variation within treatments) [^1]. *Double-blind*:
  neither subjects nor evaluators know the treatment. *Matched pairs*: each unit gets both
  treatments (or units are paired) and you analyse the differences. A full factorial design has
  one treatment group per combination of factor levels: 3 doses × 2 diets give 6 groups.

**Describing data.** Mean (pulled by outliers; raising one of $n$ values by $c$ raises the mean
by $c/n$), median, quartiles, SD. Adding a constant shifts the mean but not the SD; multiplying
scales both. $z=(x-\mu)/\sigma$ counts SDs from the mean [^2]. Charts: histogram (distribution of
one numeric variable — more bins, finer detail), KDE (smooth estimate of it), bar chart
(categories), line chart (trends over time), pie or waffle chart (parts of a whole), scatter plot
(two numeric variables; colour, size or shape add a third), facets (one panel per value of a
variable). Truncated or reversed axes and too many pie slices mislead.

**Normal model** [^2]: 68–95–99.7% within 1, 2, 3 SDs. Key quantiles: $z_{0.80}=0.842$,
$z_{0.90}=1.282$, $z_{0.95}=1.645$, $z_{0.975}=1.96$, $z_{0.99}=2.326$, $z_{0.995}=2.576$.

**Sampling distribution and CLT.** A statistic varies from sample to sample; its distribution over
all samples of size $n$ is the *sampling distribution*, and its SD is the **standard error** [^2].
$\bar X$ has mean $\mu$ and SE $\sigma/\sqrt n$; by the CLT it is approximately normal when the
observations are independent and $n$ is large, whatever the population's shape (finite variance)
[^2]. With small $n$ from a skewed population it is still skewed.

**Confidence intervals.** estimate ± critical value × SE. "95% confidence" describes the
*procedure*: about 95% of intervals built this way contain the parameter; it is **not** a 95%
probability that this particular interval does [^3]. The margin of error is $z^*\times$SE, about
$2\times$SE at 95% [^2]. Higher confidence → wider; four times the data → half the width. The
width scales with $z^*$: 95% instead of 90% multiplies it by $1.96/1.645\approx1.19$.

**Hypothesis tests** [^3]: $H_0$ (no effect) vs $H_a$. The **p-value** is the probability, computed
assuming $H_0$, of a test statistic at least as extreme as the one observed; reject when $p\le\alpha$.

| | $H_0$ true | $H_0$ false |
| --- | --- | --- |
| reject $H_0$ | Type I error, probability $\alpha$ | correct; probability = **power** $=1-\beta$ |
| keep $H_0$ | correct | Type II error, probability $\beta$ |

$\beta$ cannot be computed from $\alpha$ alone (it depends on the true effect and $n$); more data
raises power at fixed $\alpha$ [^3]. Use a $t$ distribution with $n-1$ df when $\sigma$ is estimated
— heavier tails, approaching the normal as df grows [^3]. Chi-square test of independence on an
$r\times c$ table: df $=(r-1)(c-1)$, expected counts at least 5 in every cell [^8]; larger df shift
the distribution right, so the critical value grows with df [^8]. **Correlation** $r\in[-1,1]$ has no
units; $R^2=r^2$ is the share of the variation in $y$ explained by the least-squares line [^7], so it
grows with the *square* of $r$ ($r=0.5$ explains 25%).

**Estimation for ML.** **Maximum likelihood** picks the parameters that make the data most probable;
in practice minimise the negative log-likelihood (sums instead of products, no underflow) [^4].
Gaussian: $\hat\mu=\bar x$, $\hat\sigma^2=\frac1n\sum(x_i-\bar x)^2$ (biased; $\frac1{n-1}$ is unbiased).
An estimator's **MSE = bias² + variance**, so a biased estimator with small variance can have a
lower MSE than an unbiased one [^3]. **Bayesians** put a prior distribution on parameters;
frequentists do not. Beta($a,b$) prior + $k$ successes in $n$ Bernoulli trials → Beta($a+k$,
$b+n-k$) posterior, predictive $P(x_{\text{new}}=1)=\frac{a+k}{a+b+n}$ [^5].

**MCMC.** Random-walk Metropolis–Hastings proposes $\theta^*$ near $\theta$ and accepts with
probability $\min(1,p^*(\theta^*)/p^*(\theta))$, so the normalising constant is never needed [^6].
Discard the early **burn-in** samples, which still reflect the start point. Tiny proposals: almost
all accepted but the chain crawls; huge proposals: most rejected, long flat stretches. Correlated
samples carry less information (smaller effective sample size) [^6].

## Formulas

$$
\text{SE}(\bar x)=\frac{\sigma}{\sqrt n},\qquad \text{SE}(\hat p)=\sqrt{\frac{\hat p(1-\hat p)}{n}},\qquad n\ge\Big(\frac{z^*}{\text{ME}}\Big)^2 p(1-p)
$$

$$
\text{MSE}(\hat\theta)=\big(E[\hat\theta]-\theta\big)^2+\mathrm{Var}(\hat\theta)
$$

## Worked example

$n=100$, $\bar x=52$, known $\sigma=10$: SE $=10/\sqrt{100}=1$; 95% CI $52\pm1.96=[50.04,\,53.96]$. Test
$H_0:\mu=50$: $z=(52-50)/1=2$, two-sided $p\approx0.046<0.05$ → reject; consistently, 50 lies outside
the 95% CI. MLE for data $\{2,4,4,6\}$ under a Gaussian: $\hat\mu=4$, $\hat\sigma^2=8/4=2$ (unbiased:
$8/3$). Uniform Beta(1, 1) prior, 6 heads in 8 tosses → Beta(7, 3), predictive $7/10=0.7$
(MLE $0.75$).

## Common pitfalls

- **Correlation/association ≠ causation**: only randomised experiments support causal claims [^1].
- **Blocking reduces variability within treatments**; it is not about removing bias in sampling.
- **CI interpretation**: the parameter is fixed, the interval is random [^3]; and a CI targets
  the population parameter, not individual observations [^2].
- **p-value ≠ P($H_0$ true)** — it assumes $H_0$ [^3].
- **Choosing α sets P(Type I)**; it does not determine β.
- **MLE variance divides by $n$** and is biased low.
- **Stratified sampling improves precision and comparisons**, but does not remove bias from a
  flawed frame or wording.
