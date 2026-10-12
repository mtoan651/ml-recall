---
topic: training
summary: How deep networks are trained in practice; minibatch SGD and the learning rate, momentum and Adam, initialization, batch normalization, and regularization (weight decay, dropout, early stopping).
status: reviewed
reviewed_by: claude
references:
  - title: 'PyTorch documentation: torch.optim.SGD'
    url: https://docs.pytorch.org/docs/stable/generated/torch.optim.SGD.html
    locator: Algorithm box (weight decay λ, momentum μ, dampening τ, first step b_1 = g_1) and the note on Sutskever et al.
  - title: 'Kingma & Ba (2015), Adam: A Method for Stochastic Optimization'
    url: https://arxiv.org/abs/1412.6980
    locator: Algorithm 1 and Sec. 2 Algorithm (2.1 Adam's Update Rule); Sec. 5 Related Work (RMSProp, AdaGrad)
  - title: 'Loshchilov & Hutter (2019), Decoupled Weight Decay Regularization'
    url: https://arxiv.org/abs/1711.05101
    locator: Abstract; Sec. 1 Introduction
  - source: d2l
    url: https://d2l.ai/chapter_multilayer-perceptrons/numerical-stability-and-init.html
    locator: Sec. 5.4.1 Vanishing and Exploding Gradients (5.4.1.3 Breaking the Symmetry), 5.4.2.2 Xavier Initialization
  - source: d2l
    url: https://d2l.ai/chapter_convolutional-modern/batch-norm.html
    locator: Sec. 8.5.1 Training Deep Networks, 8.5.2.2 Convolutional Layers, 8.5.2.3 Layer Normalization, 8.5.2.4 Batch Normalization During Prediction
  - title: 'PyTorch documentation: torch.nn.BatchNorm1d'
    url: https://docs.pytorch.org/docs/stable/generated/torch.nn.BatchNorm1d.html
    locator: Class description and note (biased variance in training, unbiased running variance, momentum 0.1, γ = 1 and β = 0 at start)
  - title: 'Hinton et al. (2012), Improving neural networks by preventing co-adaptation of feature detectors'
    url: https://arxiv.org/abs/1207.0580
    locator: Main text, p. 2 (upper bound on each hidden unit's incoming weight norm; mean network with halved outgoing weights)
  - source: d2l
    url: https://d2l.ai/chapter_multilayer-perceptrons/dropout.html
    locator: Sec. 5.6 Dropout (Eq. 5.6.1), 5.6.1 Dropout in Practice
---
## Key ideas

- **Minibatch SGD**: each update uses the gradient averaged over a random minibatch of $B$ examples. One **epoch** is one pass over the data, i.e. $\lceil N/B \rceil$ updates if the last partial batch is kept. Reshuffle every epoch: data sorted by label give biased minibatch gradients, and the fit drifts towards whatever part of the data came last.
- **Learning rate** $\eta$: too large makes the loss oscillate, spike or grow (divergence); too small makes progress slow. Small batches give cheap but noisy updates; large batches give smoother gradients that tolerate a larger $\eta$, but fewer updates per epoch. Neither has a universal best value; tune them together.
- **Momentum** keeps a velocity $v_t = \beta v_{t-1} + g_t$ and steps $\theta \leftarrow \theta - \eta\,v_t$. PyTorch's `SGD` stores exactly this buffer (its docs call the coefficient $\mu$; dampening defaults to 0) and starts it at $v_1 = g_1$ [^1]. A constant gradient $g$ builds the velocity up to $g/(1 - \beta)$, while a gradient alternating $\pm g$ keeps it near $\pm g/(1 + \beta)$: with $\beta = 0.9$, steady directions move 10 times further per step and zig-zags are damped 19-fold relative to them. The moving-average form $v_t = \beta v_{t-1} + (1 - \beta) g_t$, which Adam uses for its first moment [^2], multiplies every gradient by $1 - \beta$, so the same $\eta$ gives steps $1 - \beta$ times as large.
- **Adam** keeps moving averages of the gradient ($m_t$, the momentum part) and of its elementwise square ($v_t$, as in RMSProp), bias-corrects both because they start at 0, and divides one by the square root of the other, giving every parameter its own step size; defaults $\beta_1 = 0.9$, $\beta_2 = 0.999$, $\epsilon = 10^{-8}$ [^2]. Rescaling all gradients by a constant leaves the steps unchanged, and they stay roughly below $\eta$ [^2]; the first step is $\eta\,\mathrm{sign}(g_1)$ up to $\epsilon$, since $\hat m_1 = g_1$ and $\hat v_1 = g_1^2$. RMSProp and AdaGrad divide by a running average or a sum of $g^2$ [^2], which carries no sign, so unlike momentum and Adam they do not damp sign oscillations. Training with Adam holds weights, gradients and two moments: four numbers per parameter.
- **L2 penalty vs weight decay**: with plain SGD, adding $\lambda\lVert\mathbf{w}\rVert^2$ to the loss shrinks every weight by the constant factor $1 - 2\eta\lambda$ per step, i.e. it is weight decay; with Adam it is not, because the penalty's gradient is divided by each parameter's adaptive scale, so weights with large past gradients are decayed less. AdamW therefore decouples the decay from the gradient step [^3].
- **Initialization**: gradients are products of many layer Jacobians, so they can vanish (e.g. saturated sigmoids) or explode [^4]. If all hidden weights start equal, the hidden units compute the same activations and receive the same gradients, and gradient descent alone never makes them differ, so weights are drawn at random to break the symmetry [^4]. Xavier (Glorot) initialization uses variance $2/(n_{\text{in}} + n_{\text{out}})$, a compromise between keeping activation variances ($n_{\text{in}}\sigma^2 = 1$) and gradient variances ($n_{\text{out}}\sigma^2 = 1$) stable [^4].
- **Batch normalization** standardizes each feature with the minibatch mean and variance, then applies a learned scale $\gamma$ (initially 1) and shift $\beta$ (initially 0) [^5][^6]. For conv layers there is one mean, variance, $\gamma$ and $\beta$ per channel, computed over the batch and all positions [^5]. In evaluation mode it uses fixed statistics gathered in training, so a prediction does not depend on the rest of the batch [^5]. PyTorch normalizes with the biased batch variance (divide by $m$) but keeps running averages with momentum 0.1 and the unbiased variance (divide by $m - 1$) [^6]. A bias right before BN is redundant: subtracting the batch mean cancels any constant, and $\beta$ takes its role. In a fully connected layer with batch size 1 each feature equals its own mean, so every normalized value is 0 and nothing can be learned [^5] (PyTorch refuses this in training mode); a conv BN layer still has the positions to average over. Layer normalization instead normalizes each example over its own features, independently of the batch [^5].
- **Regularization** limits effective complexity: L2 shrinks all weights; L1 pushes each nonzero weight towards 0 with the constant force $\lambda\,\mathrm{sign}(w)$ and makes many exactly zero; elastic net adds both penalties; a max-norm constraint caps the L2 norm of each unit's incoming weight vector at $c$, dividing the vector back to length $c$ whenever an update pushes it beyond [^7]; data augmentation adds label-preserving variations of the training inputs.
- **Dropout** sets each hidden activation to 0 with probability $p$ and to $h/(1 - p)$ otherwise, so its expectation is unchanged, and is switched off at test time [^8]. The original version did not rescale during training and instead scaled the outgoing weights by the keep probability $1 - p$ at test time (halved for $p = 0.5$); either way it trains a huge number of weight-sharing subnetworks at once [^7].
- **Early stopping** checks the validation loss after every epoch, stops once it has not improved by at least `min_delta` for `patience` epochs in a row, and usually restores the best epoch's weights: it regularizes and saves compute.
- **Learning curves**: training loss falling while validation loss rises means overfitting (more data, regularization, early stopping, smaller model); both losses high and flat means underfitting (bigger model, longer training, less regularization, a pretrained model); a rising training loss means the step is too large.

## Formulas

$$
w \leftarrow w - \eta\left(\frac{\partial L}{\partial w} + 2\lambda w\right) = (1 - 2\eta\lambda)\,w - \eta\,\frac{\partial L}{\partial w}\qquad\text{for the penalty } \lambda\lVert\mathbf{w}\rVert^2
$$

PyTorch's `weight_decay=λ` adds $\lambda w$ to the gradient [^1]: that is the penalty $\tfrac{\lambda}{2}\lVert\mathbf{w}\rVert^2$, with factor $1 - \eta\lambda$.

$$
m_t = \beta_1 m_{t-1} + (1 - \beta_1) g_t,\quad v_t = \beta_2 v_{t-1} + (1 - \beta_2) g_t^2,\quad \theta \leftarrow \theta - \eta\,\frac{m_t/(1 - \beta_1^t)}{\sqrt{v_t/(1 - \beta_2^t)} + \epsilon}
$$

$$
\mu_B = \frac{1}{m}\sum_i x_i,\quad \sigma_B^2 = \frac{1}{m}\sum_i (x_i - \mu_B)^2,\quad y_i = \gamma\,\frac{x_i - \mu_B}{\sqrt{\sigma_B^2 + \epsilon}} + \beta
$$

PyTorch's running estimates: $\hat\mu \leftarrow 0.9\,\hat\mu + 0.1\,\mu_B$ and $\hat\sigma^2 \leftarrow 0.9\,\hat\sigma^2 + 0.1\,\frac{m}{m - 1}\sigma_B^2$ [^6].

Inverted dropout on a value $h$: $\mathbb{E}[h'] = (1 - p)\frac{h}{1 - p} = h$ and $\mathbb{E}[h'^2] = \frac{h^2}{1 - p}$, so $\mathrm{Var}[h'] = h^2\frac{p}{1 - p}$. Two dropout layers with rates $p$ and $q$ act like one with rate $1 - (1 - p)(1 - q)$.

## Worked example

Minimize $L(w) = (w - 3)^2$ from $w_0 = 0$ with $\eta = 0.1$ and momentum $\beta = 0.5$ in the PyTorch form:

- Step 1: $g_1 = 2(0 - 3) = -6$, $v_1 = g_1 = -6$, $w_1 = 0 - 0.1 \cdot (-6) = 0.6$.
- Step 2: $g_2 = 2(0.6 - 3) = -4.8$, $v_2 = 0.5 \cdot (-6) - 4.8 = -7.8$, $w_2 = 0.6 + 0.78 = 1.38$.

The moving-average form $v_t = 0.5\,v_{t-1} + 0.5\,g_t$ (with $v_0 = 0$) gives $v_1 = -3$, $w_1 = 0.3$, then $v_2 = -4.2$, $w_2 = 0.72$: the same direction with smaller steps, so a learning rate tuned for one convention does not carry over to the other.

## In code

```python
import torch
from torch import nn
bn = nn.BatchNorm1d(1)                     # gamma = 1, beta = 0, momentum = 0.1
x = torch.tensor([[2.0], [4.0], [4.0], [6.0]])
with torch.no_grad():
    print(bn(x).flatten())                 # tensor([-1.4142,  0.0000,  0.0000,  1.4142])  batch stats, var/n
    print(bn.running_mean, bn.running_var) # tensor([0.4000]) tensor([1.1667])  0.9*0 + 0.1*4, 0.9*1 + 0.1*8/3
    bn.eval()
    print(bn(x).flatten())                 # tensor([1.4813, 3.3329, 3.3329, 5.1846])  running stats
try: nn.BatchNorm1d(1)(torch.ones(1, 1))   # a single example in training mode
except ValueError as e: print(type(e).__name__)  # ValueError
torch.manual_seed(0)
drop = nn.Dropout(p=0.25)                  # training mode: kept values become 1/(1 - 0.25)
print(drop(torch.ones(6)))                 # tensor([0.0000, 1.3333, 1.3333, 0.0000, 1.3333, 0.0000])
print(drop.eval()(torch.ones(3)))          # tensor([1., 1., 1.])  dropout is off in eval mode
```

## Common pitfalls

- An epoch is not one update: 6,000 examples in minibatches of 64 give $\lceil 6000/64 \rceil = 94$ updates per epoch, the last one on 48 examples.
- Batch normalization does not make activations Gaussian: it only shifts and rescales each feature, which fixes the mean and variance but keeps the shape of the distribution, and then $\gamma$ and $\beta$ rescale it again.
- Dropout and BN behave differently in training and evaluation mode; forgetting `model.eval()` gives random, batch-dependent predictions.
- Inverted dropout already rescales during training, so nothing is multiplied by $1 - p$ at test time.
- $\lambda\lVert\mathbf{w}\rVert^2$ adds $2\lambda w$ to the gradient, while $\tfrac{\lambda}{2}\lVert\mathbf{w}\rVert^2$ (PyTorch's `weight_decay`) adds $\lambda w$: check the convention before comparing decay factors.
- Regularization fights overfitting; on an underfitting model it hurts, and a far too large $\lambda$ makes training and validation losses both rise.
- With all weights and biases at zero, a tanh MLP's hidden outputs stay 0 and only the output bias ever learns; softmax regression, which has no hidden units, can start from zero.
- Tune hyperparameters on a validation split, never on the test set.
