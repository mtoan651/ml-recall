---
topic: cnn
summary: Convolutional layers for images; locality and weight sharing, output-size arithmetic with padding and stride, channels and parameter counts, pooling, receptive fields and cheaper convolution variants.
status: reviewed
reviewed_by: claude
references:
  - source: d2l
    url: https://d2l.ai/chapter_convolutional-neural-networks/why-conv.html
    locator: Sec. 7.1 From Fully Connected Layers to Convolutions (introduction, 7.1.2.1 Translation Invariance, 7.1.2.2 Locality)
  - source: d2l
    url: https://d2l.ai/chapter_convolutional-neural-networks/conv-layer.html
    locator: Sec. 7.2 Convolutions for Images (7.2.3 Object Edge Detection in Images, 7.2.4 Learning a Kernel, 7.2.5 Cross-Correlation and Convolution, 7.2.6 Feature Map and Receptive Field)
  - source: d2l
    url: https://d2l.ai/chapter_convolutional-neural-networks/padding-and-strides.html
    locator: Sec. 7.3 Padding and Stride (7.3.1 Padding, 7.3.2 Stride)
  - source: d2l
    url: https://d2l.ai/chapter_convolutional-neural-networks/channels.html
    locator: Sec. 7.4 Multiple Input and Multiple Output Channels (7.4.2 Multiple Output Channels, 7.4.3 1×1 Convolutional Layer, 7.4.4 Discussion)
  - source: d2l
    url: https://d2l.ai/chapter_convolutional-neural-networks/pooling.html
    locator: Sec. 7.5 Pooling (7.5.1 Maximum Pooling and Average Pooling, 7.5.2 Padding and Stride, 7.5.3 Multiple Channels)
  - title: 'PyTorch documentation: torch.nn.Conv2d'
    url: https://docs.pytorch.org/docs/stable/generated/torch.nn.Conv2d.html
    locator: Conv2d (groups parameter; Shape; Variables weight and bias)
  - title: 'Wikipedia: Convolutional neural network'
    url: https://en.wikipedia.org/wiki/Convolutional_neural_network
    locator: Architecture (Convolutional layers, Pooling layers, Receptive field); Translation equivariance and aliasing; Regularization methods, Artificial data
  - title: 'Howard et al. (2017): MobileNets: Efficient Convolutional Neural Networks for Mobile Vision Applications'
    url: https://arxiv.org/abs/1704.04861
    locator: Abstract; Sec. 3.1 Depthwise Separable Convolution
---
## Key ideas

- **Why convolutions**: a fully connected layer gives each hidden unit its own weight for every pixel; for a one-megapixel image even 1000 hidden units need $10^6 \times 10^3 = 10^9$ weights [^1]. Two priors fix this [^1]: **locality** (a unit only looks at a small window) and **translation invariance** (the same kernel is used at every position, i.e. weight sharing). In d2l's example, a $1000 \times 1000$ hidden map needs $10^{12}$ parameters; translation invariance cuts this to $4 \times 10^6$ and locality to $4\Delta^2$, a few hundred for window radius $\Delta < 10$ [^1]. An MLP on flattened pixels has neither prior and must learn everything from data.
- **Equivariance, not rotation invariance**: a shifted input gives a shifted feature map (translation equivariance), but rotations and scale changes are not built in; they must be learned, e.g. by training on rotated and rescaled copies (data augmentation) [^7].
- **The operation is cross-correlation**: each output is the sum of the elementwise product of the kernel and the window under it, with no kernel flip. A true convolution flips the kernel in both directions; since kernels are learned, the difference does not matter for a CNN [^2] (but `np.convolve` and SciPy's `convolve2d` do flip).
- **Hand-made kernels**: a single 1 in the centre is the identity; $\tfrac19$ times all ones is a box blur; $[1, -1]$ takes horizontal differences, so it responds to vertical edges and gives zero on purely horizontal ones [^2]. A CNN learns such kernels from data instead of having them designed by hand [^2].
- **Padding and stride** [^3]: without padding a $k \times k$ kernel shrinks the height and the width by $k - 1$ each, and border pixels take part in fewer windows than interior ones. Zero padding of $k - 1$ rows and columns in total ($\tfrac{k-1}{2}$ per side for odd $k$) keeps the size at stride 1 ("same"). Stride $s$ moves the window by $s$, dividing height and width by about $s$ and the number of outputs, hence the compute, by about $s^2$. Padding never changes the number of channels.
- **Channels** [^4]: with $c_i$ input and $c_o$ output channels the kernel tensor is $c_o \times c_i \times k_h \times k_w$; each output channel sums over all input channels; there is one bias per output channel. The parameter count does not depend on the image size, while the cost grows like $h \cdot w \cdot k^2 \cdot c_i \cdot c_o$. A $1 \times 1$ convolution is a dense layer from $c_i$ to $c_o$ channels applied at every pixel.
- **Pooling** [^5]: max or average over each window, separately per channel (channel count unchanged), no parameters; frameworks default the stride to the window size, so $2 \times 2$ pooling halves height and width. Max pooling gives a little invariance to small shifts. Global average pooling averages each whole feature map, turning $c \times h \times w$ into $c$ numbers [^7], so a dense head after it needs far fewer weights than after flattening.
- **Receptive field**: the input region one unit depends on. Stacking layers enlarges it [^2][^7]: $n$ stacked $3 \times 3$ stride-1 convs see $(2n + 1) \times (2n + 1)$; after a stride or pooling every later layer adds more input pixels per step.
- **Cheaper variants**: `groups=g` splits the channels into $g$ groups that never exchange information, cutting weights and cost by $g$; `groups=c_in` is a depthwise convolution [^6]. A depthwise convolution followed by a $1 \times 1$ (pointwise) convolution that mixes the channels is a depthwise separable convolution [^7], the building block of MobileNets [^8].
- **Typical CNN**: [conv → BatchNorm → ReLU → pool] × n → flatten or global average pooling → dense layers. Most parameters sit in the first dense layer after flatten; `BatchNorm2d(C)` needs $C$ = the conv's output channels.

## Formulas

Output size per dimension (input $n$, kernel $k$, padding $p$ per side, stride $s$, dilation $d$) [^3][^6]:

$$
n_{\text{out}} = \left\lfloor \frac{n + 2p - d(k - 1) - 1}{s} \right\rfloor + 1 \qquad (d = 1:\ \lfloor (n + 2p - k)/s \rfloor + 1)
$$

$$
\#\text{params} = c_o\,c_i\,k_h k_w + c_o,\qquad \text{multiply-adds} = c_o\,h_{\text{out}} w_{\text{out}} \cdot c_i\,k_h k_w
$$

Receptive field, layer by layer for kernel $k$ and stride $s$: $r \leftarrow r + (k - 1)\,j$ and $j \leftarrow j \cdot s$, starting from $r = j = 1$ ($j$ is the distance in input pixels between neighbouring units).

## Worked example

Input $3 \times 64 \times 64$:

1. `Conv2d(3, 16, 5, padding=2)`: $(64 + 4 - 5) + 1 = 64$, so $16 \times 64 \times 64$; parameters $16 \cdot 3 \cdot 25 + 16 = 1216$.
2. `MaxPool2d(2)`: $16 \times 32 \times 32$, no parameters.
3. `Conv2d(16, 32, 3, stride=2, padding=1)`: $\lfloor (32 + 2 - 3)/2 \rfloor + 1 = 16$, so $32 \times 16 \times 16$; parameters $32 \cdot 16 \cdot 9 + 32 = 4640$; multiply-adds $32 \cdot 16 \cdot 16 \cdot 16 \cdot 9 = 1{,}179{,}648$.
4. Flatten: $32 \cdot 16 \cdot 16 = 8192$ features; `Linear(8192, 10)` has $81{,}930$ parameters, far more than both convolutions together.

## In code

```python
import torch
from torch import nn
net = nn.Sequential(
    nn.Conv2d(3, 16, kernel_size=5, padding=2), nn.ReLU(), nn.MaxPool2d(2),
    nn.Conv2d(16, 32, kernel_size=3, stride=2, padding=1), nn.ReLU(),
    nn.Flatten(), nn.Linear(32 * 16 * 16, 10))
x, shapes = torch.zeros(8, 3, 64, 64), []
for layer in net:
    x = layer(x)
    if not isinstance(layer, nn.ReLU):   # (shape without batch, parameters)
        shapes.append((tuple(x.shape[1:]), sum(p.numel() for p in layer.parameters())))
print(shapes)  # [((16, 64, 64), 1216), ((16, 32, 32), 0), ((32, 16, 16), 4640), ((8192,), 0), ((10,), 81930)]
```

## Common pitfalls

- Padding changes height and width, not channels; the number of output channels equals the number of kernels.
- Conv parameters do not depend on the input's height and width; the bias is one per output channel, not per position.
- Pooling, ReLU and dropout have no parameters; pooling never mixes channels.
- Sizes are floored: a $7 \times 7$ map under $2 \times 2$ pooling with stride 2 becomes $3 \times 3$, while "same"-style padding ($p = \tfrac{k-1}{2}$, or TensorFlow's `"SAME"`) with stride 2 gives $\lceil n/2 \rceil$.
- Two stacked convolutions with stride 1, no padding and no nonlinearity in between equal one convolution with kernel size $k_1 + k_2 - 1$; the nonlinearity is what adds expressive power.
- Three $3 \times 3$ layers see a $7 \times 7$ region with $27$ instead of $49$ weights per channel pair.
- CNNs are not rotation invariant: a model trained on upright images can fail on rotated ones.
- A max of a window is not a weighted sum, so a single linear conv layer cannot imitate max pooling, while average pooling equals a depthwise conv with all weights $1/(k_h k_w)$ and stride equal to the window.
