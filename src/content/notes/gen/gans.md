---
topic: gans
summary: A generator and a discriminator trained against each other in a minimax game; the losses, the optimal discriminator, DCGAN design rules and the usual training failures.
status: reviewed
reviewed_by: claude
references:
  - title: 'Goodfellow et al. (2014), Generative Adversarial Nets, arXiv:1406.2661'
    url: https://arxiv.org/abs/1406.2661
    locator: Sec. 3 Adversarial nets (incl. Algorithm 1); Sec. 4.1 Global Optimality of p_g = p_data; Sec. 6 Advantages and disadvantages; Sec. 7 Conclusions and future work
  - source: google-ml-courses
    url: https://developers.google.com/machine-learning/gan/generative
    locator: 'GAN course: Background: What is a Generative Model? (Modeling Probabilities)'
  - source: d2l
    url: https://d2l.ai/chapter_generative-adversarial-networks/gan.html
    locator: Sec. 20.1 Generative Adversarial Networks
  - source: google-ml-courses
    url: https://developers.google.com/machine-learning/gan/problems
    locator: 'GAN course: Common Problems'
  - title: 'Radford, Metz & Chintala (2015), Unsupervised Representation Learning with Deep Convolutional GANs, arXiv:1511.06434'
    url: https://arxiv.org/abs/1511.06434
    locator: Sec. 3 Approach and Model Architecture; Sec. 4 Details of Adversarial Training
  - title: 'Mao et al. (2017), Least Squares Generative Adversarial Networks, arXiv:1611.04076'
    url: https://arxiv.org/abs/1611.04076
    locator: Sec. 3.2 Least Squares Generative Adversarial Networks (Eq. 2); Sec. 3.2.1 Benefits of LSGANs; Sec. 3.2.2 relation to f-divergence (Eq. 5)
  - title: 'Wikipedia: Jensen–Shannon divergence'
    url: https://en.wikipedia.org/wiki/Jensen%E2%80%93Shannon_divergence
    locator: Bounds
  - title: 'Arjovsky, Chintala & Bottou (2017), Wasserstein GAN, arXiv:1701.07875'
    url: https://arxiv.org/abs/1701.07875
    locator: Sec. 2 Different Distances, Example 1 (Learning parallel lines)
---
## Key ideas

- **Generative vs discriminative.** A generative model captures the data distribution $p(X)$ (or $p(X, Y)$) and can produce new instances; a discriminative model captures $p(Y \mid X)$ and only tells instances apart. Both kinds *may* output probabilities, so a probability output alone does not tell you which one you have [^2].
- A **GAN** (generative adversarial network) trains two networks against each other [^1]. The **generator** $G$ turns a random latent vector $z \sim p_z$ into a sample $G(z)$, e.g. an image; the **discriminator** $D$ is a binary classifier that outputs the probability that its input is real rather than generated [^1][^3]. No labels are needed: the targets 1 (real) and 0 (fake) are created automatically.
- **Alternating training.** Each iteration takes $k$ steps (often 1) on $D$ with $G$ fixed, then one step on $G$ with $D$ fixed [^1]. During the $G$ step the loss is computed from $D$'s output, so gradients flow backward *through* $D$ into $G$, but only $G$'s weights change; during the $D$ step the fakes are detached so that no gradient reaches $G$ [^3].
- **Losses.** $D$ minimises binary cross-entropy with label 1 for real and 0 for fake images (d2l averages the two terms) [^3]. For $G$, minimising $\log(1 - D(G(z)))$ saturates early in training, when $D$ rejects fakes confidently; instead $G$ maximises $\log D(G(z))$, the **non-saturating** loss, implemented as BCE on fakes with the label flipped to 1 [^1][^3]. So $G$ and $D$ usually use different losses.
- **Theory.** For a fixed $G$ the best discriminator is $D^*(x) = p_{\text{data}}(x) / (p_{\text{data}}(x) + p_g(x))$; with it, the game value becomes $C(G) = -\log 4 + 2\,\mathrm{JSD}(p_{\text{data}} \,\|\, p_g)$, minimised exactly when $p_g = p_{\text{data}}$, where $D^* = \tfrac12$ everywhere [^1]. The JSD is at most $\log 2$ (1 bit) [^7] and reaches it when the two distributions do not overlap, however far apart they are [^8]; then $C(G) = 0$ and the JSD gives no signal about the distance.
- The generator never writes down $p_g(x)$; sampling is one forward pass with no Markov chain, and a vanilla GAN learns no encoder from $x$ back to $z$ (that would need an extra network) [^1].
- **Typical failures:** vanishing gradients when $D$ becomes too good, **mode collapse** (the generator rotates through a small set of outputs) and failure to converge [^4]. The two players must stay balanced: a $G$ trained too long against a fixed $D$ can map many $z$ to the same output [^1].
- **DCGAN** rules [^5]: replace pooling with strided convolutions in $D$ and fractionally strided (transposed) convolutions in $G$; batch normalization in both networks except the generator's output layer and the discriminator's input layer; ReLU in $G$ with a **tanh** output; LeakyReLU (slope 0.2) in $D$; real images scaled to $[-1, 1]$, the range of tanh; Adam with learning rate 0.0002 and $\beta_1 = 0.5$.
- **LSGAN** replaces the sigmoid cross-entropy by squared errors to target values; it still penalises fakes that are on the correct side of the decision boundary but far from the data, which gives the generator more gradient [^6].

## Formulas

$$
\min_G \max_D V(D, G) = \mathbb{E}_{x \sim p_{\text{data}}}[\log D(x)] + \mathbb{E}_{z \sim p_z}[\log(1 - D(G(z)))]
$$

$$
D^*(x) = \frac{p_{\text{data}}(x)}{p_{\text{data}}(x) + p_g(x)}, \qquad C(G) = \max_D V(D, G) = -\log 4 + 2\,\mathrm{JSD}(p_{\text{data}} \,\|\, p_g)
$$

- LSGAN [^6]: $D$ minimises $\tfrac12\mathbb{E}_x[(D(x) - b)^2] + \tfrac12\mathbb{E}_z[(D(G(z)) - a)^2]$ ($b$ = real target, $a$ = fake target), $G$ minimises $\tfrac12\mathbb{E}_z[(D(G(z)) - c)^2]$. Minimising pointwise gives $D^*(x) = (b\,p_{\text{data}} + a\,p_g)/(p_{\text{data}} + p_g)$ [^6].
- With a logit $s$ and $D = \sigma(s)$: $\partial_s \log(1 - D) = -D$ but $\partial_s \log D = 1 - D$.
- A convolution with kernel 4, stride 2, padding 1 halves the side: $(W - 4 + 2)/2 + 1 = W/2$, e.g. $32 \to 16 \to 8 \to 4$.

## Worked example

$D$ gives a real image $D(x) = 0.8$ and a fake $D(G(z)) = 0.2$.

- Discriminator loss (average BCE): $\tfrac12[-\ln 0.8 - \ln(1 - 0.2)] = -\ln 0.8 \approx 0.223$. At the equilibrium $D = 0.5$ it would be $\ln 2 \approx 0.693$, not 0.
- Generator, non-saturating: $-\ln 0.2 \approx 1.609$.
- Gradient with respect to the fake's logit: the saturating objective gives $-D = -0.2$, the non-saturating one $1 - D = 0.8$. For a confidently rejected fake, $D(G(z)) = 0.01$, the two are $0.01$ and $0.99$: the minimax loss nearly stops teaching $G$, the flipped-label loss does not.

## In code

```python
import torch
from torch import nn
G = nn.Sequential(nn.Linear(8, 32), nn.ReLU(), nn.Linear(32, 2), nn.Tanh())
D = nn.Sequential(nn.Linear(2, 32), nn.LeakyReLU(0.2), nn.Linear(32, 1))  # logits: no sigmoid
opt_G = torch.optim.Adam(G.parameters(), lr=2e-4, betas=(0.5, 0.999))
opt_D = torch.optim.Adam(D.parameters(), lr=2e-4, betas=(0.5, 0.999))
bce, real, z = nn.BCEWithLogitsLoss(), torch.rand(64, 2) * 2 - 1, torch.randn(64, 8)
ones, zeros = torch.ones(64, 1), torch.zeros(64, 1)
fake = G(z)
d_loss = (bce(D(real), ones) + bce(D(fake.detach()), zeros)) / 2  # detach: D step leaves G alone
opt_D.zero_grad(); d_loss.backward(); opt_D.step()
w_D = D[0].weight.clone()
g_loss = bce(D(fake), ones)        # non-saturating loss: fakes labelled "real"
opt_G.zero_grad(); g_loss.backward(); opt_G.step()    # gradient flows through D into G
print(G[0].weight.grad is not None, torch.equal(D[0].weight, w_D))   # True True
```

## Common pitfalls

- "The two networks only exchange data and labels" is false: the generator's gradient is backpropagated through the discriminator, which is merely not updated in that step [^1][^3].
- The generator step uses the *real* label (1) on fakes. Using label 0 trains $G$ to look more fake, and real images give $G$ no gradient at all.
- `BCEWithLogitsLoss` applies the sigmoid itself; a sigmoid at the end of $D$ as well squashes outputs into $(0.5, 0.73)$, so "fake" can never be predicted.
- If $G$ ends in tanh, rescale real images from $[0, 1]$ to $[-1, 1]$ ($x \mapsto 2x - 1$); otherwise $D$ separates real from fake by value range alone [^5].
- A loss near zero is not the goal: at the ideal equilibrium $D$ outputs 0.5 everywhere and its BCE stays at $\ln 2$ [^1]; a discriminator loss that drops to 0 signals vanishing gradients for $G$ [^4].
- Mode collapse (few distinct outputs) and vanishing gradients (a too-strong $D$) are different failures [^4].
- Batch normalization everywhere is not better: DCGAN leaves it out of $G$'s output and $D$'s input layer [^5].
- In a conditional GAN both networks get the condition $y$ as input [^1]: if only $G$ sees it, $D$ cannot penalise a realistic sample of the wrong class.
