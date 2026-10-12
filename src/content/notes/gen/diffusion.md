---
topic: diffusion
summary: Diffusion models add Gaussian noise in a fixed forward process and learn to undo it step by step; DDPM training and sampling, the score/SDE view, DDIM, classifier-free guidance and latent diffusion.
status: reviewed
reviewed_by: claude
references:
  - title: 'Ho, Jain & Abbeel (2020), Denoising Diffusion Probabilistic Models, arXiv:2006.11239'
    url: https://arxiv.org/abs/2006.11239
    locator: Sec. 2 Background (Eqs. 2, 4, 6–7); Sec. 3.1 Forward process and L_T; Sec. 3.2 (Eq. 11, Algorithms 1–2); Sec. 3.4 Simplified training objective; Sec. 4 Experiments
  - title: 'Nichol & Dhariwal (2021), Improved Denoising Diffusion Probabilistic Models, arXiv:2102.09672'
    url: https://arxiv.org/abs/2102.09672
    locator: Sec. 3.2 Improving the Noise Schedule
  - title: 'Song et al. (2021), Score-Based Generative Modeling through Stochastic Differential Equations, arXiv:2011.13456'
    url: https://arxiv.org/abs/2011.13456
    locator: Sec. 3.2 Generating samples by reversing the SDE; Sec. 3.3 Estimating scores for the SDE; Sec. 4.3 Probability flow and connection to neural ODEs
  - title: 'Song, Meng & Ermon (2021), Denoising Diffusion Implicit Models, arXiv:2010.02502'
    url: https://arxiv.org/abs/2010.02502
    locator: Sec. 3 Variational inference for non-Markovian forward processes; Sec. 4 Sampling from Generalized Generative Processes (4.1–4.2); Sec. 5 Experiments (Eq. 16, η)
  - title: 'Ho & Salimans (2022), Classifier-Free Diffusion Guidance, arXiv:2207.12598'
    url: https://arxiv.org/abs/2207.12598
    locator: Sec. 3.2 Classifier-free guidance (Eq. 6, Algorithm 1)
  - title: 'Rombach et al. (2022), High-Resolution Image Synthesis with Latent Diffusion Models, arXiv:2112.10752'
    url: https://arxiv.org/abs/2112.10752
    locator: Sec. 1 Introduction (contributions); Sec. 3.1 Perceptual Image Compression; Sec. 3.2 Latent Diffusion Models; Sec. 3.3 Conditioning Mechanisms
  - title: 'Wikipedia: Diffusion model'
    url: https://en.wikipedia.org/wiki/Diffusion_model
    locator: Score-based generative model › Their equivalence
---
## Key ideas

- **Forward process (fixed).** DDPM corrupts data $x_0$ over $T$ steps with $q(x_t \mid x_{t-1}) = \mathcal{N}(\sqrt{1 - \beta_t}\,x_{t-1}, \beta_t I)$. Each $\beta_t$ is a *variance* (the added noise has standard deviation $\sqrt{\beta_t}$), and the schedule $\beta_1, \dots, \beta_T$ is a set of constants, so this "encoder" has no trainable parameters [^1]. Shrinking $x_{t-1}$ by $\sqrt{1 - \beta_t}$ keeps unit-variance data at unit variance.
- **Closed form.** With $\alpha_t = 1 - \beta_t$ and $\bar\alpha_t = \prod_{s \le t} \alpha_s$, one can jump straight from $x_0$ to any $x_t$, so training never simulates the chain [^1]. DDPM uses $T = 1000$ and a linear schedule from $\beta_1 = 10^{-4}$ to $\beta_T = 0.02$, which leaves $\sqrt{\bar\alpha_T} \approx 0.006$: $x_T$ is almost, but not exactly, pure noise [^1].
- **Reverse process (learned).** A network $\epsilon_\theta(x_t, t)$, usually a U-Net with a time embedding, is trained to predict the noise $\epsilon$ that produced $x_t$ [^1]. The latents $x_1, \dots, x_T$ have the same dimension as the data.
- **Training** (Algorithm 1): pick $x_0$, $t \sim \text{Uniform}\{1, \dots, T\}$ and $\epsilon \sim \mathcal{N}(0, I)$, build $x_t$ in closed form, take a gradient step on $\lVert \epsilon - \epsilon_\theta(x_t, t) \rVert^2$. This $L_{\text{simple}}$ drops the per-step weights of the variational bound, which down-weights the easy small-$t$ terms and improved sample quality [^1].
- **Sampling** (Algorithm 2): start from $x_T \sim \mathcal{N}(0, I)$ and apply the learned denoising step for $t = T, \dots, 1$, adding fresh noise $\sigma_t z$ except at the last step: $T$ network evaluations in sequence [^1].
- **Schedules.** For $64 \times 64$ and $32 \times 32$ images the linear schedule destroys information too early: the end of the forward process is so noisy that skipping up to 20% of the reverse process barely hurts. The **cosine** schedule changes $\bar\alpha_t$ slowly near $t = 0$ and $t = T$ [^2].
- **Score view.** The score $\nabla_x \log p(x)$ points uphill in density; for $\mathcal{N}(\mu, \sigma^2 I)$ it is $-(x - \mu)/\sigma^2$. In continuous time the forward process is an SDE, and running the **reverse-time SDE** or the deterministic **probability-flow ODE** from $T$ to 0 passes through the same marginals $p_t$; both need only the score, which a network learns by denoising [^3]. A noise predictor is a scaled score: since $\nabla_{x_t} \log q(x_t \mid x_0) = -\epsilon/\sqrt{1 - \bar\alpha_t}$, the optimal $\epsilon_\theta(x_t, t) = \mathbb{E}[\epsilon \mid x_t] = -\sqrt{1 - \bar\alpha_t}\,\nabla_{x_t} \log q(x_t)$ [^7].
- **DDIM** uses non-Markovian forward processes with the *same* training objective, so a model trained as a DDPM can be reused unchanged. Its sampler can skip steps, and with $\eta = 0$ (all $\sigma_t = 0$) it is deterministic, mapping each $x_T$ to one $x_0$ [^4].
- **Classifier-free guidance.** One network learns both $\epsilon_\theta(z, c)$ and the unconditional $\epsilon_\theta(z) = \epsilon_\theta(z, \varnothing)$ by replacing the condition with a null token with probability $p_{\text{uncond}}$ during training; sampling extrapolates away from the unconditional prediction [^5].
- **Latent diffusion (LDM).** An autoencoder $(\mathcal{E}, \mathcal{D})$ is trained first and can be reused; it downsamples an $H \times W \times 3$ image by a factor $f$ to a latent $h \times w \times c$ that keeps its 2-D layout. A time-conditional U-Net runs the whole diffusion in latent space, prompts enter through cross-attention (queries from U-Net features, keys and values from the encoded prompt $\tau_\theta(y)$), and $\mathcal{D}$ decodes once at the end [^6].

## Formulas

$$
q(x_t \mid x_0) = \mathcal{N}\big(\sqrt{\bar\alpha_t}\,x_0,\ (1 - \bar\alpha_t) I\big), \qquad x_t = \sqrt{\bar\alpha_t}\,x_0 + \sqrt{1 - \bar\alpha_t}\,\epsilon
$$

$$
L_{\text{simple}}(\theta) = \mathbb{E}_{t, x_0, \epsilon}\big\lVert \epsilon - \epsilon_\theta(\sqrt{\bar\alpha_t}\,x_0 + \sqrt{1 - \bar\alpha_t}\,\epsilon,\ t) \big\rVert^2
$$

$$
x_{t-1} = \frac{1}{\sqrt{\alpha_t}}\Big(x_t - \frac{\beta_t}{\sqrt{1 - \bar\alpha_t}}\,\epsilon_\theta(x_t, t)\Big) + \sigma_t z
$$

- Forward posterior: $q(x_{t-1} \mid x_t, x_0) = \mathcal{N}(\tilde\mu_t, \tilde\beta_t I)$ with $\tilde\beta_t = \frac{1 - \bar\alpha_{t-1}}{1 - \bar\alpha_t}\beta_t$ [^1].
- Clean-data estimate: $\hat{x}_0 = (x_t - \sqrt{1 - \bar\alpha_t}\,\epsilon_\theta)/\sqrt{\bar\alpha_t}$.
- Reverse-time SDE and probability-flow ODE for $dx = f\,dt + g\,dw$ [^3]: $dx = [f - g^2 \nabla_x \log p_t]\,dt + g\,d\bar{w}$ and $dx = [f - \tfrac12 g^2 \nabla_x \log p_t]\,dt$. Stepping backwards by $\Delta t$ therefore *adds* $g^2\,\nabla_x \log p_t\,\Delta t$.
- Classifier-free guidance [^5]: $\tilde\epsilon = (1 + w)\,\epsilon_\theta(z, c) - w\,\epsilon_\theta(z)$; $w = 0$ is plain conditional sampling.
- LDM with factor $f$ and $c$ latent channels: $3f^2/c$ times fewer values, e.g. 48 for $f = 8$, $c = 4$ [^6].

## Worked example

Schedule $\beta = (0.1, 0.1, 0.2)$, so $\bar\alpha = (0.9, 0.81, 0.648)$. Take $x_0 = 1$ and noise $\epsilon = 0.5$:

- $x_3 = \sqrt{0.648} \cdot 1 + \sqrt{0.352} \cdot 0.5 = 0.805 + 0.297 = 1.102$; given $x_0$, $x_3$ has mean 0.805 and variance 0.352.
- A perfect noise predictor ($\epsilon_\theta = 0.5$) recovers $\hat{x}_0 = (1.102 - 0.593 \cdot 0.5)/0.805 = 1$; a prediction of 0.8 would give $\hat{x}_0 \approx 0.78$.
- Posterior variance of $x_2$ given $x_3$ and $x_0$: $\tilde\beta_3 = \frac{0.19}{0.352} \cdot 0.2 \approx 0.108$, much smaller than $\beta_3$, because $x_0$ is known too.
- Guidance with $\epsilon_\theta(z, c) = 0.5$, $\epsilon_\theta(z) = 0.3$, $w = 2$: $3 \cdot 0.5 - 2 \cdot 0.3 = 0.9$, pushed beyond the conditional prediction.

## In code

```python
import torch
T = 1000
betas = torch.linspace(1e-4, 0.02, T)               # DDPM linear schedule
alphas_bar = torch.cumprod(1 - betas, dim=0)         # index i holds alpha_bar_{i+1}
print(round(alphas_bar[-1].sqrt().item(), 4))        # 0.0064
x0 = torch.randn(8, 3, 32, 32)                       # a batch of "images"
t = torch.randint(0, T, (8,))                        # one random step per example
eps = torch.randn_like(x0)
ab = alphas_bar[t].view(-1, 1, 1, 1)                 # broadcast over C, H, W
xt = ab.sqrt() * x0 + (1 - ab).sqrt() * eps          # jump straight to x_t
eps_model = lambda x, t: torch.zeros_like(x)         # stand-in for the U-Net
loss = ((eps - eps_model(xt, t)) ** 2).mean()        # L_simple
print(xt.shape, round(loss.item(), 1))               # torch.Size([8, 3, 32, 32]) 1.0
```

## Common pitfalls

- $\beta_t$ is the variance of the added noise, not its standard deviation; the noise is scaled by $\sqrt{\beta_t}$ [^1].
- The forward process is not learned and is not simulated step by step during training; $x_t$ comes from the closed form [^1].
- The network's target in $L_{\text{simple}}$ is the noise $\epsilon$, not $x_0$ and not $\beta_t$, although $\hat{x}_0$ can be computed from it.
- Undoing one step divides by $\sqrt{\alpha_t}$; $(x_t - \sqrt{1 - \bar\alpha_t}\,\epsilon)/\sqrt{\bar\alpha_t}$ is the estimate of $x_0$, not of $x_{t-1}$.
- DDPM sampling needs one network call per step, in sequence; unlike a VAE decoder it is not a single pass. DDIM cuts the number of steps without retraining [^4].
- $w = 0$ in classifier-free guidance gives the ordinary conditional model, not an unconditional one; the unconditional prediction comes from the null token [^5].
- Moving with $-g^2 \times$ score in the reverse SDE walks downhill in density, away from the data; the sign is $+$ when stepping backwards in time [^3].
- An LDM runs its decoder once at the end, not at every denoising step, and its latent is a small image-shaped tensor, not a flat vector [^6].
