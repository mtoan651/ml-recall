---
topic: optimization
summary: Calculus for training — critical points, convexity, gradient descent and step sizes, SGD, momentum, Adagrad/RMSProp/Adam and automatic differentiation.
status: reviewed
reviewed_by: claude
references:
  - source: d2l
    url: https://d2l.ai/chapter_optimization/gd.html
    locator: Sec. 12.3.1 One-Dimensional Gradient Descent; 12.3.2 Multivariate Gradient Descent; 12.3.3 Adaptive Methods (Newton's Method, Preconditioning, Line Search)
  - source: d2l
    url: https://d2l.ai/chapter_optimization/sgd.html
    locator: Sec. 12.4.1 Stochastic Gradient Updates; 12.4.2 Dynamic Learning Rate; 12.4.3 Convergence Analysis for Convex Objectives; 12.4.4 Stochastic Gradients and Finite Samples
  - source: d2l
    url: https://d2l.ai/chapter_optimization/momentum.html
    locator: Sec. 12.6.1 Basics (Leaky Averages; An Ill-conditioned Problem; Effective Sample Weight); 12.6.3 Theoretical Analysis
  - source: d2l
    url: https://d2l.ai/chapter_optimization/rmsprop.html
    locator: Sec. 12.8.1 The Algorithm (recap of Adagrad and the leaky-average fix)
  - source: d2l
    url: https://d2l.ai/chapter_optimization/adam.html
    locator: Sec. 12.10.1 The Algorithm; 12.10.3 Yogi; 12.10.4 Summary
  - title: 'Wikipedia: Automatic differentiation'
    url: https://en.wikipedia.org/wiki/Automatic_differentiation
    locator: Difference from other differentiation methods; Forward and reverse accumulation (Two types of automatic differentiation; Forward accumulation; Reverse accumulation); Automatic differentiation using dual numbers
  - source: d2l
    url: https://d2l.ai/chapter_optimization/adagrad.html
    locator: Sec. 12.7.2 Preconditioning; 12.7.3 The Algorithm
  - source: d2l
    url: https://d2l.ai/chapter_optimization/lr-scheduler.html
    locator: Sec. 12.11.3.3 Cosine Scheduler; 12.11.3.4 Warmup
---
## Key ideas

**Training = minimising a loss** $L(\theta)$. The **gradient** $\nabla L$ is the vector of partial
derivatives; it points uphill, so we step against it [^1].

**Critical points** ($\nabla f=0$) are minima, maxima or **saddle points**. In 1-D, $f''>0$ ⇒ local
min, $f''<0$ ⇒ local max, $f''=0$ ⇒ no conclusion ($x^3$, $x^4$, $-x^4$). In $n$-D, look at the
Hessian $H$: positive definite ⇒ min, negative definite ⇒ max, mixed signs ⇒ saddle. A maximum at
an endpoint of an interval, or at a kink, need not have $f'=0$. Gradient descent rarely stays at a
saddle: a tiny offset along a direction of negative curvature grows geometrically.

**Convexity.** A set is convex if it contains every segment between its points (balls of any norm,
half-spaces, lines). $f$ is convex if $f(\lambda x+(1-\lambda)y)\le\lambda f(x)+(1-\lambda)f(y)$,
equivalently $H\succeq0$; then every local minimum is global. Sums and maxima of convex functions
are convex; **minima are not**, and neither is $\mathrm{ReLU}(x)-\mathrm{ReLU}(x-1)$. Neural network
losses are non-convex — e.g. permuting the $k$ hidden units gives $k!$ equivalent weight settings.

**Gradient descent (GD)**: $x\leftarrow x-\eta\nabla f(x)$. Too small $\eta$ crawls, too large overshoots
and diverges [^1]. On $f=\frac{\lambda}{2}x^2$ the update is $x\leftarrow(1-\eta\lambda)x$, which converges
iff $0<\eta<2/\lambda$ [^3]. With several curvatures the steepest one caps $\eta$ ($\eta<2/\lambda_{\max}$)
while the flattest one sets the speed, so a large condition number $\kappa=\lambda_{\max}/\lambda_{\min}$
means slow progress [^3]. Given the gradient, one update costs $O(D)$ for $D$ parameters. Stop when
the gradient or the updates become tiny, or after an iteration budget.

**Second-order ideas** [^1]. Newton: $x\leftarrow x-H^{-1}\nabla f$ — the minimiser of the local quadratic
Taylor model, exact in one step on a quadratic; on non-convex $f$ use $|H|$ so the step still goes
downhill. A full Hessian has $P^2$ entries (1 million parameters → $10^{12}$ numbers), so practice uses
diagonal **preconditioning**, a per-coordinate learning rate — it only helps when the steep and flat
directions are aligned with the axes; rotate the problem and the benefit is gone [^7].

**SGD** [^2]. One example (or a minibatch) per step: cost $O(1)$ instead of $O(n)$. The stochastic
gradient is an **unbiased** estimate of the full gradient; averaging over a minibatch of $b$
i.i.d. examples divides its variance by $b$ (SD by $\sqrt b$). Because the noise does not vanish at
the optimum, $\eta$ must decay; for convex problems $\eta_t\propto1/\sqrt t$ gives an $O(1/\sqrt T)$
rate [^2]. Sampling $n$ examples *with* replacement touches only about $1-e^{-1}\approx63\%$ of them
[^2]. Full-batch GD is the only one of GD/SGD/minibatch whose updates do not depend on the order of
the data.

**Momentum** keeps a leaky average $v_t=\beta v_{t-1}+g_t$, $x\leftarrow x-\eta v_t$. It averages about
$1/(1-\beta)$ recent gradients, so noise cancels and the effective step is $\eta/(1-\beta)$ (10× for
$\beta=0.9$) [^3]; it damps oscillation across a narrow valley and accepts larger $\eta$.

**Adaptive methods** (per-coordinate scaling):

| Method | State | Step |
| --- | --- | --- |
| Adagrad | $s_t=s_{t-1}+g_t^2$ | $\eta\,g_t/\sqrt{s_t+\epsilon}$ — rate decays like $t^{-1/2}$ [^4][^7] |
| RMSProp | $s_t=\gamma s_{t-1}+(1-\gamma)g_t^2$ | same; leaky average fixes the decay [^4] |
| Adam | $v_t=\beta_1v_{t-1}+(1-\beta_1)g_t$, $s_t=\beta_2s_{t-1}+(1-\beta_2)g_t^2$ | $\eta\,\hat v_t/(\sqrt{\hat s_t}+\epsilon)$, $\hat v_t=\frac{v_t}{1-\beta_1^t}$, $\hat s_t=\frac{s_t}{1-\beta_2^t}$ [^5] |

Adam (defaults $\beta_1=0.9$, $\beta_2=0.999$) keeps **two extra numbers per parameter**; bias
correction undoes the zero initialisation [^5]. On step 1, $\hat v_1/\sqrt{\hat s_1}=\mathrm{sign}(g_1)$,
so the first move has size $\eta$ whatever the gradient's scale. Its learning rate should still
decay: near a minimum, noisy gradients keep $\hat v/\sqrt{\hat s}$ from vanishing, so the iterates
jitter at a scale set by $\eta$. Schedules: step or polynomial decay, **cosine**
$\eta_t=\eta_T+\frac{\eta_0-\eta_T}{2}(1+\cos\frac{\pi t}{T})$ (slow decay at first, a small rate to
refine at the end), and **warm-up** — raise $\eta$ from a small value, because a large rate at the
start, when updates from random weights are large and poorly aimed, can diverge [^8].

**Computing derivatives.** Symbolic, numerical (finite differences — truncation error for large $h$,
round-off for tiny $h$) and **automatic differentiation**, exact to working precision [^6]. Forward
mode carries a tangent with each value (dual numbers $a+b\varepsilon$, $\varepsilon^2=0$) and needs one
pass per *input*; reverse mode (backpropagation) needs one pass per *output*, ideal for a scalar
loss with millions of parameters [^6].

## Formulas

$$
\nabla_{w}\,(w^\top Aw)=(A+A^\top)w,\qquad \nabla_v\lVert v\rVert_2=\frac{v}{\lVert v\rVert_2},\qquad \nabla_W\log|\det W|=(W^{-1})^\top
$$

$$
\frac{\partial}{\partial x}\log(e^x+e^y)=\frac{e^x}{e^x+e^y},\qquad \min_x\ \tfrac12x^\top Qx+c^\top x:\ x^*=-Q^{-1}c\ \ (Q\succ0)
$$

Chain rule for $u=f(x(a),y(a))$: $\frac{\partial u}{\partial a}=\frac{\partial f}{\partial x}\frac{\partial x}{\partial a}+\frac{\partial f}{\partial y}\frac{\partial y}{\partial a}$.

## Worked example

$f(x)=\frac12(x_1^2+10x_2^2)$, so $\nabla f=(x_1,\,10x_2)$ and each GD step multiplies the coordinates by
$1-\eta$ and $1-10\eta$. Stability needs $|1-10\eta|<1$, i.e. $\eta<0.2$. From $(1,1)$ with $\eta=0.15$:
one step gives $(0.85,\,-0.5)$ — $x_2$ flips sign but shrinks. With $\eta=0.25$ the factor is $-1.5$
and $x_2$ explodes, although $x_1$ would still converge. $\kappa=10$: $x_1$ loses at most 20% per step
at the largest stable $\eta$.

## In code

```python
import torch

for g in [1000.0, -0.002]:                    # very different gradient sizes
    w = torch.tensor([0.0], requires_grad=True)
    opt = torch.optim.Adam([w], lr=0.01)
    (g * w).sum().backward()                  # dL/dw = g
    opt.step()
    print(round(w.item(), 6))                 # -0.01, then 0.01

x = torch.tensor([1.0, 1.0], requires_grad=True)
f = 0.5 * (x[0] ** 2 + 10 * x[1] ** 2)
f.backward()
print(x.grad)                                 # tensor([ 1., 10.])
```

## Common pitfalls

- **$f'(x)=0$ does not mean an extremum** (saddle or inflection, e.g. $x^3$ at 0).
- **The steepest direction limits the step size** — a learning rate safe for flat directions can
  diverge along steep ones [^3].
- **SGD needs a decaying learning rate** to converge; a constant one leaves it jittering [^2].
- **"Stochastic" means random sampling of examples**, not just using minibatches.
- **Adagrad's effective rate keeps shrinking**; RMSProp/Adam use leaky averages instead [^4].
- **Skipping Adam's bias correction** distorts the first steps: on step 1 the uncorrected ratio
  $v_1/\sqrt{s_1}$ is $(1-\beta_1)/\sqrt{1-\beta_2}$ times the corrected one [^5].
- **Momentum in "EMA form"** ($v=\beta v+(1-\beta)g$) has no $1/(1-\beta)$ boost; with $v=\beta v+g$
  you must shrink $\eta$ by $(1-\beta)$ to keep the same step.
- **Finite differences with tiny $h$ are not more accurate** — round-off dominates [^6].
