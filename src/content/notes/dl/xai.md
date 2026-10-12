---
topic: xai
summary: Explaining what trained models do — global vs local and post-hoc methods, permutation importance, PDP/ICE, LIME, SHAP, saliency, Grad-CAM, integrated gradients, and how to test explanations.
status: reviewed
reviewed_by: claude
references:
  - title: 'Wikipedia: Explainable artificial intelligence'
    url: https://en.wikipedia.org/wiki/Explainable_artificial_intelligence
    locator: Background; Goals; Explainability and interpretability techniques; Regulation
  - title: Molnar, Interpretable Machine Learning (3rd ed., CC BY-NC-SA 4.0)
    url: https://christophm.github.io/interpretable-ml-book/
    locator: Ch. 3 Goals of Interpretability; Ch. 4 Methods Overview; Ch. 14 LIME; Ch. 15 Counterfactual Explanations (Method by Wachter et al.); Ch. 28 Saliency Maps (Vanilla Gradient, Grad-CAM, SmoothGrad, Limitations)
  - title: scikit-learn User Guide
    url: https://scikit-learn.org/stable/modules/partial_dependence.html
    locator: Sec. 5.1 Partial Dependence and ICE plots (5.1.2 ICE; 5.1.3 Mathematical Definition; 5.1.4 Computation methods)
  - title: scikit-learn User Guide
    url: https://scikit-learn.org/stable/modules/permutation_importance.html
    locator: Sec. 5.2 Permutation feature importance (5.2.1 Outline of the algorithm; 5.2.3 Misleading values on strongly correlated features)
  - title: Lundberg & Lee (2017), A Unified Approach to Interpreting Model Predictions, arXiv:1705.07874
    url: https://arxiv.org/abs/1705.07874
    locator: Sec. 2.4 Classic Shapley Value Estimation (Eq. 4); Sec. 3 Properties 1–3 and Theorem 1; Sec. 4 SHAP values (Fig. 1); Sec. 4.2 Corollary 1 (Linear SHAP)
  - title: Simonyan, Vedaldi & Zisserman (2014), Deep Inside Convolutional Networks, arXiv:1312.6034
    url: https://arxiv.org/abs/1312.6034
    locator: Sec. 2 Class Model Visualisation (scores vs posteriors); Sec. 3.1 Class Saliency Extraction
  - title: Sundararajan, Taly & Yan (2017), Axiomatic Attribution for Deep Networks, arXiv:1703.01365
    url: https://arxiv.org/abs/1703.01365
    locator: Sec. 2 Two Fundamental Axioms; Sec. 3 Our Method (Completeness); Sec. 5 Applying Integrated Gradients
  - title: 'Jacovi & Goldberg (2020), Towards Faithfully Interpretable NLP Systems: How should we define and evaluate faithfulness?, arXiv:2004.03685'
    url: https://arxiv.org/abs/2004.03685
    locator: Sec. 2 Faithfulness vs. Plausibility; Sec. 3 Inherently Interpretable?; Sec. 6 Defining Faithfulness (erasure)
---
## Key ideas

- **Why explain**: to trust and justify decisions (medicine, credit), to debug models that learned a shortcut, to check fairness, and to meet regulation — the GDPR's right to explanation concerns *local* explanations of individual decisions [^1]. They matter most when what we want (fairness, safety) is not fully captured by the training objective, since a model can meet the objective with tricks its designers never intended [^1].
- **Interpretability vs explainability**: interpretability is understanding how the model works; explainability is understanding how it produced a given result [^1]. A model can be **interpretable by design** (intrinsic: sparse linear model, short tree) or explained **post-hoc** after training [^2].
- **Model-agnostic** methods only query inputs and outputs; **model-specific** ones read internals (gradients, activations). **Global** methods describe average behaviour over a dataset; **local** methods explain one prediction [^2].

| Method | Scope | Agnostic? | Idea |
|---|---|---|---|
| Permutation importance | global | yes | score drop after shuffling a feature |
| PDP / ICE | global / per row | yes | prediction as one feature varies |
| LIME | local | yes | weighted local linear surrogate |
| Shapley / SHAP | local (aggregated: global) | Kernel SHAP yes | fair split of $f(x) - \mathbb{E}[f(X)]$ |
| Occlusion | local | yes | score drop when a patch is greyed out |
| Counterfactual | local | yes | smallest change that flips the decision |
| Gradient saliency, SmoothGrad | local | no | input gradient (averaged over noise) |
| Integrated gradients | local | no | gradients integrated from a baseline |
| Grad-CAM | local | no (CNNs) | gradient-weighted conv feature maps |

- **PDP** averages the prediction over the data with the feature of interest fixed; each row's curve is an **ICE** line, and the PDP is their mean [^3].
- **Permutation importance**: shuffle one column $K$ times on held-out data and average the score drop; it measures how much *this model* relies on the feature [^4].
- **LIME** samples perturbed inputs around $x$, gets the black box's predictions, weights them by closeness to $x$ and fits a sparse linear model. For images its features are super-pixels switched on or greyed out [^2]. Such explanations can expose shortcuts, e.g. a wolf-vs-husky classifier that relied on snow in the background [^2].
- **Shapley values / SHAP** average a feature's marginal contribution over all coalitions of the other features. They are the only additive attribution with local accuracy, missingness and consistency; they explain the gap between $f(x)$ and the base value $\mathbb{E}[f(X)]$ [^5].
- **Gradient saliency** (vanilla gradient) differentiates the class score with respect to the pixels — a first-order Taylor view of the network [^2]. For RGB images Simonyan et al. keep the largest absolute gradient over the three channels, and they work with the unnormalised score $S_c$ rather than the softmax probability, which can also rise when other classes' scores fall [^6]. **SmoothGrad** averages such maps over $n \approx 50$ noisy copies with noise level 10–20% of the pixel range [^2].
- **Grad-CAM** averages the gradients of the pre-softmax score $y^c$ over each feature map of (usually) the last convolutional layer, which still keeps the spatial layout, weights the maps with these averages, sums them and applies a ReLU to keep evidence *for* the class; the coarse map is upscaled and laid over the image [^2].
- **Integrated gradients (IG)** fixes the *saturation* problem of gradients: a flat region gives zero gradient even for an important input. It integrates gradients along the straight path from a baseline $x'$ (black image, zero embedding) to $x$ and satisfies sensitivity, implementation invariance and **completeness** [^7]. Check that the attributions sum to $F(x) - F(x')$ and raise the number of steps (20–300 is typical) if not [^7].
- **Occlusion** is perturbation-based: slide a grey patch over the image and record the drop of the class score. It is model-agnostic [^2], but needs one forward pass per patch position.
- **Counterfactual explanations** state the smallest change that would give the desired outcome ("with income 64k the loan would be approved"). Wachter et al. minimise a prediction loss plus an L1 distance in which each feature's change is divided by its median absolute deviation (MAD), which is robust to outliers and puts features on one scale [^2]; the L1 form tends to change only a few features.
- **Evaluating explanations**: *plausibility* is how convincing an explanation looks to people, *faithfulness* is whether it reflects the model's actual reasoning [^8]. Sanity checks randomise the weights or the labels: Guided Backprop and Guided Grad-CAM barely change, behaving like edge detectors, while vanilla gradients and Grad-CAM pass [^2]. Attention weights are often read as a built-in explanation, but work on text classifiers has cast doubt on how faithful they are [^8].

## Formulas

Permutation importance with reference score $s$ and shuffled scores $s_{k,j}$ [^4]:
$$i_j = s - \frac{1}{K}\sum_{k=1}^{K} s_{k,j}$$

Partial dependence (brute force over $n$ rows) [^3]:
$$\mathrm{pd}_{X_S}(x_S) \approx \frac{1}{n}\sum_{i=1}^{n} f(x_S, x_C^{(i)})$$

LIME: $\xi(x) = \operatorname*{arg\,min}_{g \in G} L(f, g, \pi_x) + \Omega(g)$, where $\pi_x$ is an exponential proximity kernel such as $\exp(-D(x, z)^2/\sigma^2)$ whose width $\sigma$ sets the neighbourhood [^2].

Shapley value of feature $i$ among $M$ features, and local accuracy [^5]:
$$\phi_i = \sum_{S \subseteq F \setminus \{i\}} \frac{|S|!\,(M - |S| - 1)!}{M!}\,\bigl[v(S \cup \{i\}) - v(S)\bigr], \qquad \sum_{i=1}^{M} \phi_i = v(F) - v(\emptyset)$$

For SHAP, $v(F) - v(\emptyset) = f(x) - \mathbb{E}[f(X)]$. Linear SHAP (independent features): $\phi_i = w_i(x_i - \mathbb{E}[x_i])$ [^5].

Saliency of pixel $(i, j)$: $M_{ij} = \max_k \lvert \partial S_c / \partial I_{ijk} \rvert$ over channels $k$ [^6]. SmoothGrad: $\hat{M}_c(x) = \frac{1}{n}\sum_{k=1}^{n} M_c(x + \mathcal{N}(0, \sigma^2))$ [^2].

Grad-CAM [^2]:
$$\alpha_k^c = \frac{1}{Z}\sum_{i}\sum_{j}\frac{\partial y^c}{\partial A^k_{ij}}, \qquad L^c = \mathrm{ReLU}\Bigl(\sum_k \alpha_k^c A^k\Bigr)$$

Integrated gradients and completeness [^7]:
$$\mathrm{IG}_i(x) = (x_i - x'_i)\int_0^1 \frac{\partial F(x' + \alpha(x - x'))}{\partial x_i}\,d\alpha, \qquad \sum_i \mathrm{IG}_i(x) = F(x) - F(x')$$

Counterfactual: $\min_{x'} \lambda\,(f(x') - y')^2 + \sum_k |x_k - x'_k| / \mathrm{MAD}_k$ [^2].

## Worked example

Shapley values of $f(x_1, x_2) = x_1 + 2x_2 + x_1x_2$ at $x = (1, 2)$, with absent features set to the baseline 0. Coalition values: $v(\emptyset) = 0$, $v(\{1\}) = 1$, $v(\{2\}) = 4$, $v(\{1, 2\}) = 7$. With two features each coalition order has weight $\frac{1}{2}$:
$\phi_1 = \frac{1}{2}[(1 - 0) + (7 - 4)] = 2$ and $\phi_2 = \frac{1}{2}[(4 - 0) + (7 - 1)] = 5$. They sum to $f(x) - f(0) = 7$: the interaction term $x_1x_2 = 2$ is split equally.

Occlusion cost: a $k \times k$ patch with stride $s$ on an $H \times H$ image gives $((H - k)/s + 1)^2$ positions, e.g. $((32 - 8)/4 + 1)^2 = 49$ forward passes.

## In code

```python
import torch
F = lambda z: z[..., 0] ** 2 * z[..., 1]           # toy model F(x1, x2) = x1^2 * x2
x, x0 = torch.tensor([2.0, 3.0]), torch.zeros(2)   # input and baseline
xg = x.clone().requires_grad_(True)
F(xg).backward()
print(xg.grad)                                     # tensor([12.,  4.])  vanilla gradient
m = 300                                            # Riemann steps
alphas = torch.arange(1, m + 1).view(-1, 1) / m
path = (x0 + alphas * (x - x0)).requires_grad_(True)
F(path).sum().backward()
ig = (x - x0) * path.grad.mean(dim=0)              # integrated gradients
print(ig, ig.sum())                                # tensor([8.0400, 4.0200]) tensor(12.0601)
```

The exact values are $\mathrm{IG} = (8, 4)$, summing to $F(x) - F(x') = 12$; the gradient $(12, 4)$ does not add up to the output [^7].

## Common pitfalls

- A pretty map is not a faithful one: run sanity checks [^2], or erase the top-ranked inputs and check that the decision changes [^8]. High test accuracy on data from the same collection does not rule out a Clever Hans shortcut such as a watermark, because the test set shares it [^1][^2].
- Permutation importance shows reliance, not direction or causality; correlated features hide each other's importance, since the model still sees the copy [^4].
- A flat PDP can hide opposite effects in different rows — look at ICE lines; with correlated features PDPs evaluate impossible inputs [^3].
- SHAP values are measured from the base value $\mathbb{E}[f(X)]$, not from zero: a negative weight with a below-average input gives a *positive* $\phi$ [^5].
- LIME's kernel width defines "local": with a very wide kernel, distant samples weigh as much as close ones, so the surrogate follows the global trend, which can even have the opposite sign to the local effect [^2].
- Plain gradients miss saturated features; IG fixes this, but any pixel equal to the baseline (black pixels with a black baseline) gets exactly zero [^7].
- Grad-CAM averages (not sums) the gradients, uses the pre-softmax score, keeps only positive evidence through the ReLU, and gives a map as coarse as the feature maps [^2].
- Attention weights are not explanations by default; check their faithfulness like any other attribution [^8].
