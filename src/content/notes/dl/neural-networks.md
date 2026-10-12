---
topic: neural-networks
summary: Neurons, perceptrons and MLPs; activation functions, output layers and losses, parameter counts, and how backpropagation computes gradients with the chain rule.
status: reviewed
reviewed_by: claude
references:
  - title: 'Wikipedia: Perceptron'
    url: https://en.wikipedia.org/wiki/Perceptron
    locator: Learning algorithm for a single-layer perceptron (Steps; Convergence of one perceptron on a linearly separable dataset); History, Perceptrons (1969)
  - source: d2l
    url: https://d2l.ai/chapter_multilayer-perceptrons/mlp.html
    locator: Sec. 5.1 Multilayer Perceptrons (5.1.1.2 Incorporating Hidden Layers, 5.1.1.3 From Linear to Nonlinear, 5.1.1.4 Universal Approximators, 5.1.2 Activation Functions)
  - title: 'Wikipedia: Universal approximation theorem'
    url: https://en.wikipedia.org/wiki/Universal_approximation_theorem
    locator: Introduction; Arbitrary-width case
  - title: 'Telgarsky (2016), Benefits of depth in neural networks'
    url: https://arxiv.org/abs/1602.04485
    locator: Sec. 3.3 Many layers, many oscillations (Lemmas 3.10–3.11, the ReLU triangle map)
  - title: 'Hendrycks & Gimpel (2016), Gaussian Error Linear Units (GELUs)'
    url: https://arxiv.org/abs/1606.08415
    locator: Sec. 2 GELU Formulation (GELU and SiLU); Sec. 4 Discussion
  - title: 'PyTorch documentation: torch.nn.CrossEntropyLoss'
    url: https://docs.pytorch.org/docs/stable/generated/torch.nn.CrossEntropyLoss.html
    locator: CrossEntropyLoss (input is unnormalized logits; equivalent to LogSoftmax followed by NLLLoss)
  - source: d2l
    url: https://d2l.ai/chapter_multilayer-perceptrons/backprop.html
    locator: Sec. 5.3.3 Backpropagation (Eqs. 5.3.11–5.3.14), 5.3.4 Training Neural Networks
  - source: d2l
    url: https://d2l.ai/chapter_linear-classification/softmax-regression.html
    locator: Sec. 4.1.2.2 Softmax and Cross-Entropy Loss (Eqs. 4.1.9–4.1.10)
---
## Key ideas

- **Neuron**: pre-activation $z = \sum_i w_i x_i + b$ ($\mathbf{x}\mathbf{w} + b$ for a row vector $\mathbf{x}$), then output $a = \phi(z)$. The bias is a learnable constant added to the weighted sum; it shifts the threshold, so the unit need not pass through the origin (a sigmoid unit $\sigma(wx + b)$ is centred at $x = -b/w$).
- **Perceptron**: one neuron with a step activation, i.e. a binary linear classifier whose decision boundary is a single hyperplane. On a misclassified example it updates $\mathbf{w} \leftarrow \mathbf{w} + \eta\, t\, \mathbf{x}$ (labels $t = \pm 1$). It is guaranteed to converge only when the data are linearly separable, so it cannot learn XOR [^1].
- **MLP / feedforward network**: affine layers with nonlinear activations, wired as a graph with no directed cycle (skip connections are allowed, feedback loops make it recurrent). Depth counts the learned layers (hidden + output), not the input layer, which computes nothing [^2]: widths 784–256–10 give depth 2.
- **Why nonlinearity**: composing affine maps gives an affine map, so without activations a stack of layers collapses into one, $XW^1W^2 + (\mathbf{b}^1W^2 + \mathbf{b}^2)$, and extra layers add no expressive power [^2]; a narrow linear layer can even cap the rank of the overall map (a 50–5–50 linear net has rank at most 5).
- **Universal approximation**: with a non-polynomial activation, one hidden layer that is wide enough can approximate any continuous function on a compact (closed and bounded) region to any accuracy [^3]. It is an existence result: it gives no useful width, no way to find the weights [^3], and no promise that a net fitting the training data generalizes. Training is where the real difficulty lies, and deeper nets often represent the same function far more compactly [^2].
- **ReLU networks** compute continuous piecewise-linear functions. On a scalar input, each unit of a one-hidden-layer net adds at most one kink ($k$ units, at most $k + 1$ pieces), while depth multiplies pieces: the 2-unit tent map $T(x) = 2\,\mathrm{ReLU}(x) - 4\,\mathrm{ReLU}(x - \tfrac12)$ on $[0, 1]$ has 2 pieces that each sweep $[0, 1]$ once, so every composition doubles the count: $k$ stacked tent layers give $2^k$ pieces [^4].

| Activation | Formula | Range | Derivative |
|---|---|---|---|
| sigmoid | $\sigma(z) = 1/(1 + e^{-z})$ | $(0, 1)$ | $\sigma(1 - \sigma)$, at most 0.25 (at 0) |
| tanh | $2\sigma(2z) - 1$ | $(-1, 1)$ | $1 - \tanh^2 z$, at most 1 (at 0) |
| ReLU | $\max(0, z)$ | $[0, \infty)$ | 0 if $z < 0$, 1 if $z > 0$ |
| leaky ReLU / PReLU | $\max(0, z) + \alpha\min(0, z)$ | all reals ($\alpha > 0$) | 1 if $z > 0$, $\alpha$ if $z < 0$; $\partial a/\partial\alpha = \min(0, z)$ |
| GELU / SiLU (Swish) | $z\,\Phi(z)$ / $z\,\sigma(z)$ | dips slightly below 0 (GELU to about $-0.17$) | smooth, not monotonic |

- Sigmoid and tanh **saturate**: for large $\lvert z \rvert$ their slope is near 0, so gradients vanish [^2]; through $n$ sigmoid layers the activations alone multiply a gradient by at most $0.25^n$. ReLU passes slope 1 through active units and 0 through inactive ones; at exactly $z = 0$ the left derivative 0 is used [^2], as in PyTorch (see In code). A unit whose pre-activation is negative on every training example is "dead": neither it nor its incoming weights get any gradient. PReLU keeps a slope for $z < 0$ [^2], and GELU ($\Phi$ = standard normal CDF) and SiLU are smooth ReLU-like curves with a small negative dip [^5].
- **Output layer and loss** follow the target:

| Target | Output | Loss |
|---|---|---|
| real number | identity | MSE (predicts the conditional mean) or MAE (median) |
| one binary label | sigmoid | binary cross-entropy (log loss) |
| one of $K$ exclusive classes | softmax | categorical cross-entropy |
| several independent yes/no labels | $K$ sigmoids | sum of binary cross-entropies |

- PyTorch's `nn.CrossEntropyLoss` takes raw **logits** and is LogSoftmax followed by NLLLoss [^6], so no softmax layer goes before it; `binary_cross_entropy_with_logits` likewise takes a logit (see In code). Softmax only depends on differences of logits, since $e^{z_j + c}/\sum_k e^{z_k + c} = e^{z_j}/\sum_k e^{z_k}$; implementations therefore subtract the largest logit before exponentiating. Scaling the logits (temperature) does change the probabilities.
- **Backpropagation** applies the chain rule from the loss back towards the inputs, reusing values stored during the forward pass, one reason training needs more memory than prediction [^7]. It only computes gradients; the optimizer then updates the weights. When a value feeds several later nodes, its gradient is the sum over those paths, and every gradient has the same shape as the variable it belongs to.

## Formulas

Dense layer on a minibatch in the row convention: $Z = AW + \mathbf{b}$ with input $A \in \mathbb{R}^{B \times n_{\text{in}}}$ ($A = X$ for the first layer), $W_{ij}$ the weight from input $i$ to unit $j$, the bias row broadcast to every example, and upstream gradient $D = \partial L/\partial Z$:

$$
\frac{\partial L}{\partial W} = A^\top D,\qquad \frac{\partial L}{\partial \mathbf{b}} = \sum_n D_{n,:},\qquad \frac{\partial L}{\partial A} = D\,W^\top,\qquad \#\text{params} = n_{\text{in}}\,n_{\text{out}} + n_{\text{out}}
$$

These are the column-convention rules for $\mathbf{z} = W\mathbf{x} + \mathbf{b}$, namely $\boldsymbol\delta\,\mathbf{x}^\top$ for the weights and $W^\top\boldsymbol\delta$ for the input [^7], transposed and summed over the batch; for a mean loss the $1/B$ is already inside $D$. The count does not depend on the batch size: a 3–5–2 net has $(15 + 5) + (10 + 2) = 32$ parameters.

Through an activation, $\boldsymbol\delta = \frac{\partial L}{\partial \mathbf{a}} \odot \phi'(\mathbf{z})$ [^7]. Softmax with cross-entropy ($\ell_{\text{CE}}$ below, in its log-sum-exp form) gives the logit gradient $p_j - y_j$ [^8]: the components sum to 0 and only the true class's is negative. Binary cross-entropy with a sigmoid gives $p - y$; half-squared error $\tfrac12(p - y)^2$ with a sigmoid gives $(p - y)\,p(1 - p)$, which vanishes when the unit saturates, and with an identity output simply $\hat y - y$.

$$
\ell_{\text{CE}} = -\sum_j y_j \log p_j = \log\sum_j e^{z_j} - z_{\text{true}},\qquad \ell_{\text{BCE}} = -y\log p - (1 - y)\log(1 - p)
$$

Gradient checking: by Taylor expansion the central difference $[L(\theta + \varepsilon) - L(\theta - \varepsilon)]/(2\varepsilon)$ has error $O(\varepsilon^2)$, the forward difference $[L(\theta + \varepsilon) - L(\theta)]/\varepsilon$ only $O(\varepsilon)$.

## Worked example

A 2–2–1 network in the row convention, $\mathbf{z}^1 = \mathbf{x}W^1 + \mathbf{b}^1$, $\mathbf{a}^1 = \mathrm{ReLU}(\mathbf{z}^1)$, $\hat y = \mathbf{a}^1\mathbf{v} + c$, with $\mathbf{x} = [2, 1]$, $W^1 = \begin{bmatrix} 1 & -1 \\ -1 & 2 \end{bmatrix}$ (row $i$ = weights from input $i$), $\mathbf{b}^1 = [0, -1]$, $\mathbf{v} = [2, 1]^\top$, $c = 0.5$, target $y = 1$ and $L = \tfrac12(\hat y - y)^2$.

- Forward: $\mathbf{z}^1 = [2 - 1 + 0,\ -2 + 2 - 1] = [1, -1]$, so $\mathbf{a}^1 = [1, 0]$, $\hat y = 2 + 0 + 0.5 = 2.5$ and $L = 1.125$.
- Backward: $\delta^2 = \hat y - y = 1.5$, so $\partial L/\partial \mathbf{v} = (\mathbf{a}^1)^\top\delta^2 = [1.5, 0]^\top$ and $\partial L/\partial c = 1.5$. Then $\partial L/\partial \mathbf{a}^1 = \delta^2\,\mathbf{v}^\top = [3, 1.5]$; multiplying by the ReLU slopes $[1, 0]$ gives $\boldsymbol\delta^1 = [3, 0]$.
- Weight gradients: $\partial L/\partial W^1 = \mathbf{x}^\top\boldsymbol\delta^1$, i.e. $\partial L/\partial W^1_{ij} = x_i\,\delta^1_j$, giving $\begin{bmatrix} 6 & 0 \\ 3 & 0 \end{bmatrix}$, and $\partial L/\partial \mathbf{b}^1 = [3, 0]$. The inactive second unit gets no gradient at all.

## In code

```python
import torch
import torch.nn.functional as F
z = torch.tensor([[2.0, 1.0, 0.0]], requires_grad=True)  # logits, true class 0
loss = F.cross_entropy(z, torch.tensor([0]))
loss.backward()
print(round(loss.item(), 4))           # 0.4076
print(torch.softmax(z, 1).detach())    # tensor([[0.6652, 0.2447, 0.0900]])
print(z.grad)                          # tensor([[-0.3348,  0.2447,  0.0900]]) = p - y
x = torch.tensor([-2.0, 0.0, 3.0], requires_grad=True)
torch.relu(x).sum().backward()
print(x.grad)                          # tensor([0., 0., 1.])  slope 0 at exactly 0
bce = F.binary_cross_entropy_with_logits(torch.tensor([2.0]), torch.tensor([0.0]))
print(round(bce.item(), 4))            # 2.1269 = -log(1 - sigmoid(2))
```

## Common pitfalls

- ReLU and sigmoid are both monotonic (GELU and SiLU are not); tanh saturates just like the sigmoid, since it is a rescaled sigmoid.
- The sigmoid's derivative is computed from its **output**, $s(1 - s)$ with $s = \sigma(z)$; plugging the input $z$ into $z(1 - z)$ gives wrong values, even negative ones.
- Softmax is for mutually exclusive classes; multilabel problems need one sigmoid per label.
- Parameter counts include one bias per unit; activations, softmax and the batch size add no parameters.
- Stacking layers without a nonlinearity adds no expressive power.
- Backpropagation computes gradients; it does not update the weights, split the data or pick hyperparameters.
- Accuracy and the 0-1 loss change only in jumps (zero gradient almost everywhere), so networks are trained on cross-entropy instead.
- MSE pulls the prediction to the conditional mean: if a delivery takes 15 or 45 minutes with equal odds, it predicts about 30, a time that almost never happens.
