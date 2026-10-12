---
topic: architectures
summary: The landmark CNNs (AlexNet, VGG, NiN, GoogLeNet, ResNet, DenseNet, MobileNet), the design idea each introduced, where their parameters sit, and a note on graph neural networks.
status: reviewed
reviewed_by: claude
references:
  - source: d2l
    url: https://d2l.ai/chapter_convolutional-modern/alexnet.html
    locator: Sec. 8.1.2 AlexNet (8.1.2.1 Architecture, 8.1.2.2 Activation Functions, 8.1.2.3 Capacity Control and Preprocessing), 8.1.4 Discussion
  - title: 'Simonyan & Zisserman (2014), Very Deep Convolutional Networks for Large-Scale Image Recognition'
    url: https://arxiv.org/abs/1409.1556
    locator: Sec. 2.1 Architecture; 2.2 Configurations (Table 1); 2.3 Discussion; 4.1 Single Scale Evaluation
  - source: d2l
    url: https://d2l.ai/chapter_convolutional-modern/nin.html
    locator: Sec. 8.3.1 NiN Blocks, 8.3.2 NiN Model, 8.3.4 Summary
  - source: d2l
    url: https://d2l.ai/chapter_convolutional-modern/googlenet.html
    locator: Sec. 8.4.1 Inception Blocks, 8.4.2 GoogLeNet Model
  - source: d2l
    url: https://d2l.ai/chapter_convolutional-modern/resnet.html
    locator: Sec. 8.6.1 Function Classes, 8.6.2 Residual Blocks, 8.6.3 ResNet Model, 8.6.5 ResNeXt
  - source: d2l
    url: https://d2l.ai/chapter_convolutional-modern/densenet.html
    locator: Sec. 8.7.1 From ResNet to DenseNet, 8.7.2 Dense Blocks, 8.7.3 Transition Layers, 8.7.6 Summary and Discussion
  - title: 'Howard et al. (2017), MobileNets: Efficient Convolutional Neural Networks for Mobile Vision Applications'
    url: https://arxiv.org/abs/1704.04861
    locator: Sec. 3.1 Depthwise Separable Convolution; Table 4
  - title: 'Xu et al. (2018), How Powerful are Graph Neural Networks?'
    url: https://arxiv.org/abs/1810.00826
    locator: Sec. 4 Building Powerful Graph Neural Networks (Lemma 2, Theorem 3), 4.1 Graph Isomorphism Network (Lemma 5)
---
## Key ideas

| Model (year) | Key idea | Parameters |
|---|---|---|
| AlexNet (2012) | deep CNN on GPUs: ReLU, dropout, augmentation, $11 \times 11$ first conv | 61.1 M |
| VGG-16 (2014) | blocks of $3 \times 3$ convs + $2 \times 2$ max-pool, then 3 FC layers | 138.4 M |
| NiN (2013) | $1 \times 1$ convs after each conv; global average pooling instead of FC layers | – |
| GoogLeNet (2014) | Inception block: parallel branches concatenated | 6.6 M |
| ResNet-18 / 50 (2015) | residual (identity shortcut) blocks with batch norm | 11.7 M / 25.6 M |
| DenseNet-121 (2017) | concatenate all earlier feature maps | 8.0 M |
| MobileNet (2017) | depthwise separable convolutions | 4.2 M |

Counts are for torchvision's ImageNet models (see the code below); MobileNet's is from its paper.

- **AlexNet** made the 2012 breakthrough: ReLU instead of sigmoid (cheaper, trains more easily), dropout in the fully connected layers, heavy data augmentation, and an $11 \times 11$ first convolution [^1]. In d2l's version (one $224 \times 224$ input channel, 10 classes) the two hidden FC layers need $6400 \times 4096$ and $4096 \times 4096$ weight matrices, over 40 million parameters and 164 MB [^1]. Counted over that whole model, the FC layers hold about 92% of its 46.8 million parameters, while the convolutions, whose kernels are reused at every position, do about 95% of its 0.94 billion multiply–adds.
- **VGG** builds the network from blocks: several $3 \times 3$ convolutions with stride 1 and padding 1 (size kept), then $2 \times 2$ max-pooling with stride 2 (size halved) [^2]. A deep net of small filters beat a shallow net of larger ones: two stacked $3 \times 3$ layers see a $5 \times 5$ region, three see $7 \times 7$ with $27C^2$ instead of $49C^2$ weights and three ReLUs instead of one [^2]. VGG-11 has 8 conv + 3 FC weight layers, VGG-16 13 + 3, VGG-19 16 + 3 [^2]. Five poolings turn $224$ into $7$, and the first FC layer, fed by the $512 \times 7 \times 7$ map, holds most of the parameters.
- **NiN** follows each ordinary convolution with two $1 \times 1$ convolutions (a small MLP applied at every pixel) and ends with a block that outputs one channel per class, then global average pooling, with no FC layer at all [^3]. Dropping the giant FC layers is the main reason it has far fewer parameters than AlexNet and VGG [^3].
- **Inception (GoogLeNet)**: four parallel branches ($1 \times 1$; $1 \times 1$ then $3 \times 3$; $1 \times 1$ then $5 \times 5$; $3 \times 3$ max-pool then $1 \times 1$) whose outputs are **concatenated** along channels; the $1 \times 1$ convs of the middle branches first reduce the channels to cut cost [^4]. Like NiN it ends with global average pooling, followed by one FC layer [^4]. Pooling instead of 4096-wide FC layers plus these channel reductions keep GoogLeNet small.
- **ResNet**: a residual block computes $\mathbf{x} + g(\mathbf{x})$, so pushing the last layer's weights to zero gives the identity; extra blocks can always fall back to "do nothing", and the function classes are nested [^5]. Each conv is followed by batch norm and ReLU; a $1 \times 1$ conv on the shortcut matches channels or stride; the network ends with global average pooling and one FC layer [^5]. The shortcut also passes gradients straight back. Nesting guarantees a training fit at least as good, not better test accuracy.
- **ResNeXt** uses grouped $3 \times 3$ convolutions ($g$ times cheaper; groups exchange no information) between $1 \times 1$ convs that mix the channels again [^5].
- **DenseNet** **concatenates** each layer's output to its input instead of adding it. Each layer adds only $k$ channels (the growth rate), and transition layers ($1 \times 1$ conv + average pooling) cut the channels and halve the size [^6]. The concatenations make it memory-hungry [^6].
- **MobileNet** replaces each standard convolution by a depthwise one (one $k \times k$ filter per input channel) followed by a pointwise $1 \times 1$ convolution that mixes the channels. With $3 \times 3$ kernels this needs 8 to 9 times less computation; MobileNet has 4.2 M parameters and 569 M multiply–adds, against 29.3 M and 4866 M for the same network with full convolutions [^7].
- **Graph neural networks** pass messages: each node aggregates its neighbours' features (sum, mean or max) and updates its own. Such GNNs can tell two graphs apart at most as well as the Weisfeiler–Lehman test, and sum aggregation with injective functions reaches that bound [^8]. With identical starting features, every node of a 6-cycle and of two disjoint triangles has two neighbours, so no message-passing GNN separates these graphs.

## Formulas

$$
\text{conv weights} = c_o c_i k^2,\qquad \text{stack of } n \text{ layers } 3 \times 3:\ \text{field } (2n + 1)^2,\ 9nC^2 \text{ weights}
$$

$$
\frac{\text{depthwise separable cost}}{\text{standard conv cost}} = \frac{k^2 c_i + c_i c_o}{k^2 c_i c_o} = \frac{1}{c_o} + \frac{1}{k^2}
$$

$$
\text{DenseNet block input to layer } \ell = c_0 + (\ell - 1)\,k,\qquad \text{block output} = c_0 + L\,k
$$

## Worked example

torchvision's VGG-16 on a $224 \times 224$ image: the conv part outputs $512 \times 7 \times 7 = 25{,}088$ values. The first FC layer to 4096 units has $25{,}088 \cdot 4096 + 4096 = 102{,}764{,}544$ parameters, 74% of the network's $138{,}357{,}544$; the three FC layers together hold 89%. At 4 bytes per float32 the whole model is about 553 MB. Stacking three $3 \times 3$ convs with $C = 256$ uses $27 \cdot 256^2 = 1{,}769{,}472$ weights, against $49 \cdot 256^2 = 3{,}211{,}264$ for one $7 \times 7$ conv with the same receptive field. A dense block with 64 input channels, 4 layers and growth rate 32 feeds its fourth layer $64 + 3 \cdot 32 = 160$ channels and outputs $192$.

## In code

```python
import torchvision.models as M
names = ["alexnet", "vgg16", "resnet18", "resnet50", "densenet121"]
counts = {n: sum(p.numel() for p in getattr(M, n)(weights=None).parameters()) for n in names}
print(counts)  # {'alexnet': 61100840, 'vgg16': 138357544, 'resnet18': 11689512, 'resnet50': 25557032, 'densenet121': 7978856}
vgg = M.vgg16(weights=None)                          # architecture only, no download
print(sum(p.numel() for p in vgg.classifier[0].parameters()))  # 102764544
```

## Common pitfalls

- ResNet **adds** the shortcut; DenseNet and Inception **concatenate** along channels.
- ResNet-50 has about 25.6 million parameters, not billions, and ends with global average pooling plus one FC layer, not two 4096-unit layers as VGG does.
- The original ResNet uses batch normalization, not layer normalization, and ReLU, not tanh; ResNeXt keeps that recipe.
- Highway networks (gated shortcuts) came before ResNet, which uses plain identity shortcuts instead [^5].
- In AlexNet and VGG the FC layers hold most **parameters**, but the conv layers do most of the **computation**.
- VGG's depth counts weight layers only; pooling, ReLU and dropout are not counted.
- A ViT has much less of a CNN's built-in locality and translation bias, so on small datasets a ResNet of similar size usually wins.
- A GNN that sees only the bond graph cannot distinguish a molecule from its mirror image; geometry must be part of the input.
