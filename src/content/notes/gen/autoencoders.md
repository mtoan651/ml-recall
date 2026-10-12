---
topic: autoencoders
summary: Encoder–decoder networks trained to reconstruct their own input through a code; denoising and sparse variants, the link to PCA, and the VAE with its ELBO, KL term and reparameterization trick.
status: reviewed
reviewed_by: claude
references:
  - title: 'Wikipedia: Autoencoder'
    url: https://en.wikipedia.org/wiki/Autoencoder
    locator: Lead section; Mathematical principles › Interpretation (undercomplete vs overcomplete); Variations › Sparse autoencoder (SAE), Denoising autoencoder (DAE); History; Applications › Dimensionality reduction › Principal component analysis; Applications › Anomaly detection
  - title: 'Vincent et al. (2010), Stacked Denoising Autoencoders, JMLR 11'
    url: https://www.jmlr.org/papers/volume11/vincent10a/vincent10a.pdf
    locator: Sec. 2.3 Merely Retaining Information is Not Enough; Sec. 3.1 The Denoising Autoencoder Algorithm
  - title: 'Kingma & Welling (2014), Auto-Encoding Variational Bayes, arXiv:1312.6114'
    url: https://arxiv.org/abs/1312.6114
    locator: 'Sec. 2.2 The variational bound; Sec. 2.4 The reparameterization trick; Sec. 3 Example: Variational Auto-Encoder; Appendix B'
  - title: 'Burgess et al. (2018), Understanding disentangling in β-VAE, arXiv:1804.03599'
    url: https://arxiv.org/abs/1804.03599
    locator: Sec. 3 β-VAE
  - title: 'PyTorch documentation: torch.nn.ConvTranspose2d'
    url: https://docs.pytorch.org/docs/stable/generated/torch.nn.ConvTranspose2d.html
    locator: Class description; Shape
  - title: 'Odena, Dumoulin & Olah (2016), Deconvolution and Checkerboard Artifacts, Distill'
    url: https://distill.pub/2016/deconv-checkerboard/
    locator: Deconvolution & Overlap; Better Upsampling
---
## Key ideas

- An **autoencoder** has an encoder $f$ that maps an input $x$ to a code (latent vector) $z = f(x)$ and a decoder $g$ that maps it back, $\hat{x} = g(z)$. Training makes $\hat{x}$ close to $x$ (e.g. MSE), so each input is its own target and no labels are needed: autoencoders learn from unlabeled data, in a setting called unsupervised or self-supervised [^1]. The reconstruction is lossy, an approximation of the input.
- Reconstruction alone can be useless: with a code at least as large as the input and no other constraint, the network can simply learn the identity [^2]. The standard ways out are an **undercomplete** bottleneck ($d' < d$), a **sparse** code (more units than inputs, but only a few active per input) and **denoising** [^1][^2].
- A **denoising autoencoder** corrupts each input with a random process $\tilde{x} \sim q_D(\tilde{x} \mid x)$ (Gaussian noise, masking), encodes $\tilde{x}$ and scores the output against the **clean** $x$; a fresh corruption is drawn every time an example is presented [^2].
- **Linear autoencoder ≈ PCA.** With no nonlinearity and squared error, $k$ code units span the same subspace as the top $k$ principal components, but the learned weight vectors need not be orthonormal or ordered like the principal axes [^1][^2]. The smallest achievable error is the variance along the discarded principal directions.
- **Convolutional autoencoders** shrink the image with strided convolutions or pooling and grow it back with transposed convolutions (`nn.ConvTranspose2d`). A transposed convolution can be seen as the gradient of a convolution with respect to its input; it restores the *shape*, not the values, and is not an inverse [^5]. When the kernel size is not divisible by the stride, outputs overlap unevenly and show checkerboard artifacts; nearest-neighbour resizing followed by an ordinary convolution avoids them [^6].
- A plain autoencoder is not a generator: nothing forces its codes to follow $\mathcal{N}(0, I)$, so most random Gaussian codes land where the decoder was never trained.
- A **variational autoencoder (VAE)** lets the encoder output a distribution $q_\phi(z \mid x) = \mathcal{N}(\mu_\phi(x), \sigma^2_\phi(x) I)$ and trains it together with the decoder $p_\theta(x \mid z)$ by maximising the **ELBO**: a reconstruction term minus a KL term that pulls $q_\phi(z \mid x)$ toward the prior $p(z) = \mathcal{N}(0, I)$ [^3]. Because the codes then fill the prior, decoding $z \sim \mathcal{N}(0, I)$ generates new data. The loss has two parts, reconstruction and KL; there is no adversarial term.
- **Reparameterization trick:** draw $\epsilon \sim \mathcal{N}(0, I)$ and set $z = \mu + \sigma \odot \epsilon$. The randomness moves into $\epsilon$, so $z$ is a differentiable function of the encoder parameters $\phi$ and backpropagation reaches the encoder; the naive Monte Carlo gradient estimator would have very high variance [^3]. A new $\epsilon$ is drawn at every step.
- **β-VAE** multiplies the KL term by $\beta$. $\beta = 1$ is the ordinary VAE; $\beta > 1$ usually gives more disentangled latent factors but worse reconstructions, because less information passes through the latent bottleneck [^4].

## Formulas

The ELBO and its gap to the log-likelihood [^3]:

$$
\mathcal{L}(\theta, \phi; x) = \mathbb{E}_{q_\phi(z \mid x)}[\log p_\theta(x \mid z)] - D_{\mathrm{KL}}(q_\phi(z \mid x) \,\|\, p(z)), \qquad \log p_\theta(x) = \mathcal{L} + D_{\mathrm{KL}}(q_\phi(z \mid x) \,\|\, p_\theta(z \mid x)) \ge \mathcal{L}
$$

KL between a diagonal Gaussian and $\mathcal{N}(0, I)$, in closed form because both are Gaussian [^3]:

$$
D_{\mathrm{KL}} = \tfrac12 \sum_j \left(\mu_j^2 + \sigma_j^2 - 1 - \ln \sigma_j^2\right)
$$

With `logvar` $= \ln \sigma^2$ this is `-0.5 * sum(1 + logvar - mu**2 - logvar.exp())`, and $\sigma$ = `exp(0.5 * logvar)`.

- Gaussian decoder with unit variance: $\log p_\theta(x \mid z) = -\tfrac12 \lVert x - f_\theta(z) \rVert^2 + \text{const}$, so maximising it is minimising squared error, and pixels are independent given $z$.
- β-VAE: $\mathbb{E}_{q}[\log p(x \mid z)] - \beta\, D_{\mathrm{KL}}(q(z \mid x) \,\|\, p(z))$ [^4].
- `nn.Linear(n_in, n_out)` has $n_{in} n_{out} + n_{out}$ parameters, e.g. $784 \to 32 \to 784$ has $25{,}120 + 25{,}872 = 50{,}992$.
- Transposed convolution (dilation 1): $H_{out} = (H_{in} - 1)s - 2p + k + \text{output\_padding}$ [^5]; ordinary convolution: $\lfloor (H_{in} + 2p - k)/s \rfloor + 1$.

## Worked example

An encoder outputs $\mu = (0.6, 0)$ and $\sigma^2 = (1, 0.5)$ for one image. KL to the prior, per dimension:

- dimension 1: $\tfrac12(0.36 + 1 - 1 - \ln 1) = 0.18$, paid only for the shifted mean;
- dimension 2: $\tfrac12(0 + 0.5 - 1 - \ln 0.5) = \tfrac12(-0.5 + 0.693) \approx 0.097$, paid only for the narrowed variance.

Total $\approx 0.277$ nats. A dimension with $\mu = 0$ and $\sigma^2 = 1$ costs nothing but also carries no information about $x$; when every dimension ends up like that, the code is useless (posterior collapse).

## In code

```python
import torch
from torch import nn
enc = nn.Sequential(nn.Conv2d(3, 8, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
                    nn.Conv2d(8, 4, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2))
dec = nn.Sequential(nn.ConvTranspose2d(4, 8, 2, stride=2), nn.ReLU(),     # kernel = stride:
                    nn.ConvTranspose2d(8, 3, 2, stride=2), nn.Sigmoid())  # no uneven overlap
x = torch.rand(16, 3, 32, 32)
code = enc(x)
print(code.shape, code[0].numel())   # torch.Size([16, 4, 8, 8]) 256
print(dec(code).shape)               # torch.Size([16, 3, 32, 32])
mu, logvar = torch.tensor([0.6, 0.0]), torch.log(torch.tensor([1.0, 0.5]))
z = mu + torch.exp(0.5 * logvar) * torch.randn(2)          # reparameterization
kl = -0.5 * torch.sum(1 + logvar - mu**2 - logvar.exp())
print(round(kl.item(), 4))           # 0.2766
```

## Common pitfalls

- Using the noisy image as both input and target teaches the network to copy the noise; a denoising autoencoder needs noisy inputs and **clean** targets [^2].
- More code units, or a cross-entropy instead of a squared-error loss, do not stop the identity solution; a bottleneck, a sparsity penalty or input corruption does [^2].
- `ConvTranspose2d` is not the inverse of `Conv2d`: its weights are learned separately and it only maps back to the larger shape [^5].
- A linear autoencoder finds the PCA subspace, not the ordered, orthogonal principal axes; its best output is the projection onto that subspace, so it matches PCA's reconstruction error and cannot beat it [^1].
- Decoding random $\mathcal{N}(0, I)$ codes with a plain autoencoder does not give realistic samples; the VAE's KL term is what ties the codes to the prior.
- The reparameterization trick exists for the encoder's gradient ($\phi$), not the decoder's, and it is not what makes the KL term closed-form; that comes from both distributions being Gaussian [^3].
- `logvar` stores $\ln \sigma^2$: the standard deviation is `exp(0.5 * logvar)`, and plugging $\sigma$ where the formula wants $\sigma^2$ gives a wrong KL.
- Raising β trades reconstruction quality for disentanglement; it does not improve both [^4].
