---
topic: transfer-learning
summary: Reusing pretrained networks; feature extraction vs fine-tuning, choosing a strategy, freezing layers correctly, distribution shift, self-supervised pretraining, and style transfer.
status: reviewed
reviewed_by: claude
references:
  - source: d2l
    url: https://d2l.ai/chapter_computer-vision/fine-tuning.html
    locator: Sec. 14.2.1 Steps; 14.2.2.1 Reading the Dataset; 14.2.2.2 Defining and Initializing the Model; 14.2.3 Summary
  - title: 'CS231n course notes: Transfer Learning'
    url: https://cs231n.github.io/transfer-learning/
    locator: Transfer Learning (ConvNet as fixed feature extractor; When and how to fine-tune?; Practical advice)
  - title: 'Yosinski et al. (2014), How transferable are features in deep neural networks?'
    url: https://arxiv.org/abs/1411.1792
    locator: Abstract; Sec. 4.1 Similar Datasets (Random A/B splits)
  - title: 'Howard & Ruder (2018), Universal Language Model Fine-tuning for Text Classification'
    url: https://arxiv.org/abs/1801.06146
    locator: Sec. 3.2 Target task LM fine-tuning (Discriminative fine-tuning, Slanted triangular learning rates); 3.3 Target task classifier fine-tuning (Gradual unfreezing)
  - title: 'Kumar et al. (2022), Fine-Tuning can Distort Pretrained Features and Underperform Out-of-Distribution'
    url: https://arxiv.org/abs/2202.10054
    locator: Abstract
  - source: d2l
    url: https://d2l.ai/chapter_linear-classification/environment-and-distribution-shift.html
    locator: Sec. 4.7.1 Types of Distribution Shift; 4.7.3.2 Covariate Shift Correction; 4.7.3.3 Label Shift Correction
  - title: 'Chen et al. (2020), A Simple Framework for Contrastive Learning of Visual Representations (SimCLR)'
    url: https://arxiv.org/abs/2002.05709
    locator: Abstract; Sec. 2.1 The Contrastive Learning Framework; 3 Data Augmentation for Contrastive Representation Learning; 5.2 Contrastive learning benefits (more) from larger batch sizes and longer training
  - source: d2l
    url: https://d2l.ai/chapter_computer-vision/neural-style.html
    locator: Sec. 14.12.1 Method; 14.12.4 Extracting Features; 14.12.5 Defining the Loss Function
---
## Key ideas

- **Transfer learning** starts a new model from the weights of a model pretrained on a large source dataset (e.g. ImageNet) instead of from random weights, so what it learned carries over [^1]. Copying only the architecture transfers nothing.
- **Fine-tuning recipe** [^1]: copy every layer except the output layer, add a new output layer sized for the target classes and initialized randomly, then train on the target data, the copied layers with a small learning rate (they are already good) and the new layer with a larger one (d2l uses 10×). Inputs must be preprocessed as in pretraining; d2l normalizes the inputs of its ImageNet-pretrained ResNet-18 with per-channel mean $(0.485, 0.456, 0.406)$ and std $(0.229, 0.224, 0.225)$ [^1].
- **Fixed feature extractor**: run the frozen network, read the activations of one layer (e.g. AlexNet's 4096-D codes just before the classifier) and train a linear classifier, such as a linear SVM or softmax, on them [^2]. Cheap, and it works with few labels. Any layer can serve; the vector length is that layer's size (a flattened conv map keeps spatial information; a globally pooled one does not).
- **Which strategy** (rules of thumb) [^2]:

| Target data | Similar to source | Very different |
|---|---|---|
| small | linear classifier on top features | linear classifier on **earlier**-layer features |
| large | fine-tune the whole network | fine-tune (or train), starting from pretrained weights |

- **Why it works** [^3]: first-layer features (Gabor-like edges, colour blobs) are general and later layers become specific to the source task; transferability drops as the tasks grow apart, yet even distant-task features beat random ones, and a transferred initialization still helps after fine-tuning. Freezing copied middle layers also hurts because neighbouring layers had co-adapted; letting the copied layers fine-tune removes that drop [^3].
- **Discriminative fine-tuning** (ULMFiT): every layer gets its own learning rate, 2.6 times smaller per step down, $\eta^{l-1} = \eta^l / 2.6$, so the general lower layers change least; ULMFiT pairs it with slanted triangular learning rates (short linear increase, long linear decay) and gradual unfreezing from the last layer down, which avoids catastrophic forgetting [^4].
- **Domain adaptation**: keep training a pretrained model on data from the target domain (e.g. a language model on legal or medical text) so it fits that domain better; ULMFiT fine-tunes its language model on the target task's text before training the classifier [^4].
- **Linear probing vs. fine-tuning**: with a random head, the backbone changes while the head is still being learned, which distorts the pretrained features. On 10 distribution-shift datasets, fine-tuning was about 2% better in-distribution but 7% worse out-of-distribution than linear probing; linear probing first and full fine-tuning afterwards (LP-FT) beat both [^5].
- **Distribution shift** [^6], with $q$ the training and $p$ the target distribution: *covariate shift* changes $p(\mathbf{x})$ but keeps $p(y \mid \mathbf{x})$ (photos at training, cartoons at test); reweight training examples by $p(\mathbf{x})/q(\mathbf{x})$, estimated with a classifier that separates target from source inputs. *Label shift* changes $p(y)$ but keeps $p(\mathbf{x} \mid y)$ (a disease becomes more common, its symptoms look the same); reweight by $p(y)/q(y)$, estimating the target $p(y)$ by solving $\mathbf{C}\,p(\mathbf{y}) = \mu(\hat{\mathbf{y}})$ with the validation confusion matrix $\mathbf{C}$ and the mean test prediction. *Concept shift* changes what the labels mean.
- **Self-supervised pretraining** learns features without labels. SimCLR makes two random augmentations of every image in a batch of $N$; for each view the other view of the same image is the positive and the other $2(N - 1)$ views are negatives; the loss (NT-Xent) is a softmax cross-entropy over cosine similarities divided by a temperature $\tau$ [^7]. The augmentations define the task, so the features learn to ignore what they change. A constant encoder would satisfy the positive term alone; the negatives push different images apart, and more of them (larger batches, longer training) help [^7]. A linear classifier on SimCLR features matched a supervised ResNet-50 on ImageNet, and fine-tuning on 1% of the labels reached 85.8% top-5 accuracy [^7].
- **Neural style transfer** keeps a pretrained VGG-19 frozen and optimizes the pixels of a synthesized image [^8]: content loss compares feature maps at a layer near the output, style loss compares Gram matrices $XX^\top$ (channel × channel inner products summed over positions, so "which features co-occur", not where) at several layers, and a total-variation term removes high-frequency noise [^8].

## Formulas

$$
\ell_{i,j} = -\log\frac{\exp(\mathrm{sim}(\mathbf{z}_i, \mathbf{z}_j)/\tau)}{\sum_{k \ne i}\exp(\mathrm{sim}(\mathbf{z}_i, \mathbf{z}_k)/\tau)},\qquad \mathrm{sim}(\mathbf{u}, \mathbf{v}) = \frac{\mathbf{u}^\top\mathbf{v}}{\lVert\mathbf{u}\rVert\,\lVert\mathbf{v}\rVert}
$$

New head parameters: $n_{\text{features}} \cdot n_{\text{classes}} + n_{\text{classes}}$. Label-shift weight: $\beta_i = p(y_i)/q(y_i)$. Gram matrix of a $c \times h \times w$ map: $c \times c$, independent of $h$ and $w$. For unit vectors, $\lVert\mathbf{u} - \mathbf{v}\rVert = \sqrt{2 - 2\cos\theta}$.

## Worked example

ResNet-18 ends in global average pooling to 512 features. For 5 target classes the new head `Linear(512, 5)` has $512 \cdot 5 + 5 = 2565$ parameters, the only trainable ones if the backbone is frozen. Unfreezing the last stage (`layer4`, $8{,}393{,}728$ parameters) as well makes $8{,}396{,}293$ of the $11{,}179{,}077$ parameters trainable.

Contrastive batch with $N = 8$ images: 16 views; each anchor has 1 positive and 14 negatives, so 15 terms in the denominator. With unit vectors and $\tau = 1$, even a perfect encoder (positive similarity 1, negatives $-1$) has loss $\log(1 + 14e^{-2}) \approx 1.06$; with $\tau = 0.1$ it drops to about $3 \times 10^{-8}$, which is why the temperature is needed.

## In code

```python
import torch
import torchvision
from torch import nn
model = torchvision.models.resnet18(weights=None)  # weights="IMAGENET1K_V1" in practice
for p in model.parameters():
    p.requires_grad = False                         # 1) freeze the backbone ...
model.fc = nn.Linear(model.fc.in_features, 5)        # 2) ... then add a new, trainable head
print(sum(p.numel() for p in model.parameters() if p.requires_grad))  # 2565
opt = torch.optim.SGD([p for p in model.parameters() if p.requires_grad], lr=1e-3)
print(model(torch.zeros(2, 3, 224, 224)).shape)     # torch.Size([2, 5])
```

## Common pitfalls

- Freezing with a loop over `model.parameters()` **after** replacing the head also freezes the head; `backward()` then fails because nothing requires a gradient.
- `model.eval()` does not freeze weights; set `requires_grad=False` (PyTorch) or `trainable = False` (Keras).
- Passing only `model.classifier.parameters()` to the optimizer trains all layers of that classifier, not just the new last layer.
- Use the pretraining normalization statistics, not those of your new dataset, and keep random augmentation out of the validation set.
- Fine-tuning everything with a large learning rate on 300 images overfits and wipes out the pretrained features.
- For data very different from the source, features from the last layers are the least transferable (earlier layers are more general), and if such data are also plentiful, pretraining helps least [^2].
- Style transfer trains the image, not the network; the Gram matrix discards where features occur.
- Label shift is not covariate shift: when the class frequencies change but each class looks the same, $p(y \mid \mathbf{x})$ does change, so reweight by $p(y)/q(y)$ [^6].
