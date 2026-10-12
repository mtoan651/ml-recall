---
topic: segmentation
summary: Labelling every pixel; semantic, instance and panoptic segmentation, FCN, U-Net, DeepLab and Mask R-CNN, transposed and dilated convolutions, and the IoU, Dice and PQ metrics.
status: reviewed
reviewed_by: claude
references:
  - title: 'Kirillov et al. (2018), Panoptic Segmentation'
    url: https://arxiv.org/abs/1801.00868
    locator: Sec. 1 Introduction; 3 Panoptic Segmentation Format; 4.1 Segment Matching; 4.2 PQ Computation
  - source: d2l
    url: https://d2l.ai/chapter_computer-vision/transposed-conv.html
    locator: Sec. 14.10.1 Basic Operation; 14.10.2 Padding, Strides, and Multiple Channels; 14.10.3 Connection to Matrix Transposition
  - source: d2l
    url: https://d2l.ai/chapter_computer-vision/fcn.html
    locator: Sec. 14.11 (introduction); 14.11.1 The Model; 14.11.2 Initializing Transposed Convolutional Layers; 14.11.4 Training; 14.11.5 Prediction
  - title: 'Ronneberger et al. (2015), U-Net: Convolutional Networks for Biomedical Image Segmentation'
    url: https://arxiv.org/abs/1505.04597
    locator: Sec. 2 Network Architecture; 3 Training
  - title: 'He et al. (2017), Mask R-CNN'
    url: https://arxiv.org/abs/1703.06870
    locator: Sec. 3 Mask R-CNN (Mask Representation; RoIAlign)
  - title: 'Chen et al. (2016), DeepLab: Semantic Image Segmentation with Deep Convolutional Nets, Atrous Convolution, and Fully Connected CRFs'
    url: https://arxiv.org/abs/1606.00915
    locator: Sec. 3.1 Atrous Convolution for Dense Feature Extraction and Field-of-View Enlargement; 3.2 Multiscale Image Representations using Atrous Spatial Pyramid Pooling
  - title: 'Long et al. (2015), Fully Convolutional Networks for Semantic Segmentation'
    url: https://arxiv.org/abs/1411.4038
    locator: Sec. 4 Segmentation Architecture (introduction; 4.1 From classifier to dense FCN; 4.2 Combining what and where); 5 Results (Metrics)
  - title: 'Milletari et al. (2016), V-Net: Fully Convolutional Neural Networks for Volumetric Medical Image Segmentation'
    url: https://arxiv.org/abs/1606.04797
    locator: Sec. 3 Dice loss layer
---
## Key ideas

- **Tasks** [^1]: *semantic* segmentation gives every pixel a class but does not separate objects of the same class (three sheep form one "sheep" region); *instance* segmentation detects and masks each object separately; *panoptic* segmentation gives every pixel a class and an instance id. Countable **things** (people, cars) get one segment per object, amorphous **stuff** (sky, road, grass) one segment per class [^1].
- **Encoder–decoder**: the encoder (a classification backbone) extracts features at decreasing resolution; the decoder upsamples them to the input's height and width with one channel of class scores per class, and the predicted class of a pixel is the argmax over the channels [^3].
- **Loss**: per-pixel cross-entropy averaged over the pixels (binary cross-entropy for a two-class mask) [^3][^7]. When the foreground is tiny, background pixels dominate this loss and the network may learn to miss the object; V-Net instead maximizes a soft Dice coefficient, which relates the overlap to the sizes of the predicted and true foreground and needs no class re-weighting [^8].
- **Transposed convolution** broadcasts each input value through the kernel and sums the overlapping results, so the output is larger than the input [^2]. Its stride spaces those results apart and its padding *removes* output rows and columns [^2]. It multiplies by the transpose of the convolution's sparse weight matrix, which is why it undoes the shape change of a convolution (not its values) [^2]. When the kernel size is not divisible by the stride, output pixels receive unequal numbers of contributions (kernel 3, stride 2: 1, 1, 2, 1, 2, …), so even a constant input comes out as a checkerboard-like grid.
- **FCN** [^3][^7]: a pretrained classification CNN without its global pooling and fully connected head (the original FCN turned the FC layers into convolutions), a $1 \times 1$ conv to the number of classes, and a transposed conv that scales by the backbone's total stride, initialized as bilinear upsampling. Kernel $2s$, stride $s$, padding $s/2$ scale height and width by exactly $s$ (64, 32, 16 for $s = 32$) [^3]. FCN-32s upsamples its stride-32 scores in one step and is coarse; FCN-16s adds class scores predicted from pool4 (stride 16) to the 2× upsampled scores, and FCN-8s repeats this with pool3 [^7].
- **U-Net** [^4]: a contracting path that gathers context and a mirror-image expanding path that recovers precise locations. At every level the decoder concatenates the cropped encoder feature map of the same resolution with its up-convolved map and applies two $3 \times 3$ convolutions [^4]. Unpadded $3 \times 3$ convs shrink the maps, hence the cropping; a weight map boosts the thin background borders between touching cells [^4].
- **Dilated (atrous) convolution** with rate $r$ inserts $r - 1$ zeros between kernel taps: a $k \times k$ kernel covers $k + (k - 1)(r - 1)$ pixels per side with the same $k^2$ weights and no extra computation [^6]. It enlarges the field of view without downsampling. **ASPP** runs parallel atrous convolutions with different rates on one feature map and fuses them to capture several scales [^6].
- **Mask R-CNN** adds a small FCN mask branch to Faster R-CNN, so it does *instance* segmentation [^5]. It predicts one binary mask per class with a per-pixel sigmoid and trains only the mask of the ground-truth class, so classes do not compete [^5]. **RoIAlign** samples features at exact (unrounded) positions with bilinear interpolation instead of RoIPool's rounding, which matters for pixel-accurate masks [^5].
- **Label maps** hold class indices, not intensities. Geometric transforms (flip, crop, resize) must be applied identically to image and label map, with nearest-neighbour resizing for the labels; colour jitter changes the image only. Do not convert masks with `ToTensor`: it divides `uint8` values by 255 (see the code).

## Formulas

With $n_{ij}$ = pixels of true class $i$ predicted as $j$ and $t_i = \sum_j n_{ij}$, as in the FCN paper [^7]:

$$
\text{pixel acc} = \frac{\sum_i n_{ii}}{\sum_i t_i},\qquad \mathrm{IoU}_i = \frac{n_{ii}}{t_i + \sum_j n_{ji} - n_{ii}},\qquad \text{mIoU} = \frac{1}{C}\sum_i \mathrm{IoU}_i
$$

$$
D = \frac{2\lvert X \cap Y \rvert}{\lvert X \rvert + \lvert Y \rvert} = \frac{2J}{1 + J},\qquad D_{\text{soft}} = \frac{2\sum_i p_i g_i}{\sum_i p_i^2 + \sum_i g_i^2},\qquad \mathrm{PQ} = \frac{\sum_{(p, g) \in TP}\mathrm{IoU}(p, g)}{\lvert TP \rvert + \tfrac12\lvert FP \rvert + \tfrac12\lvert FN \rvert}
$$

$D_{\text{soft}}$ is V-Net's Dice for predicted probabilities $p_i$ and labels $g_i$ [^8]. PQ is computed per class and averaged; it matches a predicted and a ground-truth segment only if their IoU is strictly above 0.5, which makes the matching unique because panoptic segments do not overlap [^1]. Transposed convolution output size (dilation 1): $(n - 1)s - 2p + k$, plus PyTorch's `output_padding`, which follows from the stride spacing and the removed padding [^2].

## Worked example

Binary segmentation of 100 pixels; rows are the true class, columns the prediction:

| true \ pred | background | object |
|---|---|---|
| background | 70 | 10 |
| object | 5 | 15 |

- Pixel accuracy $= 85/100 = 0.85$.
- Background IoU $= 70/(80 + 75 - 70) = 70/85 = 0.824$; object IoU $= 15/(20 + 25 - 15) = 15/30 = 0.5$; mIoU $= 0.662$.
- Object Dice $= 2 \cdot 15/(20 + 25) = 0.667 = 2(0.5)/(1 + 0.5)$.
- Mean per-class accuracy $= (70/80 + 15/20)/2 = 0.8125$. Pixel accuracy hides the weak object class; mIoU and Dice expose it.

## In code

```python
import numpy as np
import torch
from torch import nn
from torchvision.transforms import ToTensor
up = nn.ConvTranspose2d(21, 21, kernel_size=64, stride=32, padding=16)
print(up(torch.zeros(1, 21, 15, 20)).shape)   # torch.Size([1, 21, 480, 640])  scores back at input size
up2 = nn.ConvTranspose2d(16, 16, kernel_size=3, stride=2, padding=1)
print(up2(torch.zeros(1, 16, 8, 8)).shape)    # torch.Size([1, 16, 15, 15])  not 16
up3 = nn.ConvTranspose2d(16, 16, kernel_size=3, stride=2, padding=1, output_padding=1)
print(up3(torch.zeros(1, 16, 8, 8)).shape)    # torch.Size([1, 16, 16, 16])
mask = np.full((4, 4, 1), 15, dtype=np.uint8)  # label map: class 15 everywhere
print(round(ToTensor()(mask)[0, 0, 0].item(), 4))  # 0.0588  = 15/255, no longer a class index
```

## Common pitfalls

- U-Net is semantic segmentation; Mask R-CNN separates instances. Semantic segmentation never tells two touching dogs apart.
- Padding in a transposed convolution shrinks the output instead of enlarging it.
- Pixel accuracy is misleading under class imbalance: predicting "background" everywhere on 95% background scores 0.95 accuracy, 0.5 mean class accuracy and only 0.475 mIoU.
- Dice is never below IoU for the same masks (equal only at 0 and 1); do not compare a Dice score with an IoU score.
- Averaging IoU per image is not the same as one IoU from pixel counts pooled over the dataset.
- A dilated $3 \times 3$ kernel still has 9 weights; it sees a wider area, it does not downsample.
- Interpolating a label map bilinearly invents classes between neighbouring labels (between 1 and 3 it creates 2).
- U-Net *concatenates* encoder features; FCN *adds* class-score maps.
