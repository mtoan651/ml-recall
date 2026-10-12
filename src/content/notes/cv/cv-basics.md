---
topic: cv-basics
summary: Images as arrays and colour spaces, classic filtering (blur, Sobel and Laplacian edges, median), histogram equalization and other hand-crafted tools, and data augmentation for vision models.
status: reviewed
reviewed_by: claude
references:
  - source: ms-ai-for-beginners
    url: https://github.com/microsoft/AI-For-Beginners/blob/392d0df1b2647cbee104942390551f1ed9e072c8/lessons/4-ComputerVision/06-IntroCV/README.md
    locator: 'Lesson 6 Introduction to Computer Vision: introduction; OpenCV (Loading Images); Examples of using Computer Vision (optical flow)'
  - source: d2l
    url: https://d2l.ai/chapter_computer-vision/image-augmentation.html
    locator: Sec. 14.1 Image Augmentation (introduction); 14.1.1.1 Flipping and Cropping; 14.1.2 Training with Image Augmentation
  - title: 'Wikipedia: Kernel (image processing)'
    url: https://en.wikipedia.org/wiki/Kernel_(image_processing)
    locator: Details (table of kernels); Convolution; Edge handling; Normalization
  - title: 'Wikipedia: Sobel operator'
    url: https://en.wikipedia.org/wiki/Sobel_operator
    locator: Formulation; Extension to other dimensions
  - title: 'Wikipedia: HSL and HSV'
    url: https://en.wikipedia.org/wiki/HSL_and_HSV
    locator: Formal derivation (Lightness); Use in image analysis; Color conversion formulae (From RGB)
  - title: 'Wikipedia: Median filter'
    url: https://en.wikipedia.org/wiki/Median_filter
    locator: Worked one-dimensional example; Edge preservation properties
  - title: 'Wikipedia: Histogram equalization'
    url: https://en.wikipedia.org/wiki/Histogram_equalization
    locator: Overview; Examples (Small image)
  - title: 'Wikipedia: Histogram of oriented gradients'
    url: https://en.wikipedia.org/wiki/Histogram_of_oriented_gradients
    locator: Algorithm implementation (Gradient computation; Orientation binning; Object recognition)
---
## Key ideas

- **Computer vision** aims at a high-level understanding of images and video: finding objects, recognising events, describing a picture, reconstructing a scene in 3D, estimating age or emotion from a face [^1]. **Optical flow** describes how pixels move between video frames: *dense* flow gives a motion vector for every pixel, *sparse* flow follows only distinctive feature points [^1].
- **Images are arrays**: an 8-bit colour image is height × width × channels with values 0–255, so a "320×200" image is a $200 \times 320 \times 3$ array; OpenCV loads the channels in **BGR** order, Matplotlib and most other tools expect RGB [^1]. PyTorch models take float minibatches of shape (N, C, H, W); `ToTensor` turns images into 32-bit floats in $[0, 1]$, channels first [^2]. Arithmetic on `uint8` wraps around modulo 256 (250 + 10 = 4, see the code), so convert to a wider type and clip.
- **Colour**: Rec. 601 luma $Y' = 0.299R + 0.587G + 0.114B$ weights each primary by its contribution to perceived brightness, green most and blue least [^5]. HSV separates hue and saturation from the value $V = \max(R, G, B)$ [^5]. R, G and B all rise and fall with the light hitting an object, so hue (with saturation and value) separates objects more reliably than raw RGB; colour segmentation therefore thresholds hue [^5].
- **Filtering** slides a small kernel over the image and takes a weighted sum at every pixel [^3]. Classic kernels: identity (single 1 in the centre), box blur ($\tfrac19$ times all ones), Gaussian blur, sharpen, edge detectors; a kernel whose weights sum to 1 keeps the average brightness [^3]. A true convolution flips the kernel in both directions first [^3]; CNN layers skip the flip, i.e. they compute cross-correlation. Border pixels need a policy: extend, wrap, mirror, a constant such as zero padding, or a smaller (cropped) output [^3].
- **Sobel** estimates the image gradient. As cross-correlation with $x$ pointing right and $y$ down, $K_x$ subtracts the left column from the right with weights 1, 2, 1 and $K_y = K_x^\top$ the top row from the bottom; the magnitude is $\sqrt{G_x^2 + G_y^2}$ and the direction $\operatorname{atan2}(G_y, G_x)$, which is 0 for a vertical edge that is brighter on the right [^4]. Each kernel is a central difference times a $[1, 2, 1]$ smoothing perpendicular to it (along the edge), so it is less sensitive to noise than a bare difference [^4]. Texts print the kernels with different signs (convolution vs correlation, $y$ up vs down); the magnitude is the same [^4].
- **Laplacian** $\begin{bmatrix} 0 & 1 & 0 \\ 1 & -4 & 1 \\ 0 & 1 & 0 \end{bmatrix}$ sums the second differences along $x$ and $y$: zero on flat regions and on linear ramps, large at isolated spots, thin lines and beside step edges. Kernel tables often list its negative, with 4 in the centre, as an edge detector [^3].
- **Median filter** replaces each pixel by the median of its window [^6]. An isolated impulse ("salt" or "pepper" pixel) is discarded instead of averaged in, while a mean filter smears it into the neighbours; this works as long as fewer than half of the pixels in a window are corrupted [^6]. It is particularly effective against salt-and-pepper noise and preserves edges better than a Gaussian blur at moderate noise levels [^6].
- **Histogram equalization** maps each gray level through the cumulative histogram, spreading the most frequent levels over the full range and increasing global contrast, e.g. for X-rays that use only a narrow band of levels [^7].
- **Integral image** (summed-area table): $S[r, c]$ is the sum of all pixels above and to the left, inclusive; any rectangle sum then takes 4 look-ups, whatever its size (formula below).
- **Hand-crafted vs learned features**: classic pipelines computed descriptors such as SIFT or HOG and trained a classifier such as an SVM on them [^8]. In HOG each pixel of a cell votes with its gradient magnitude into an orientation histogram; Dalal and Triggs found 9 bins over 0–180° ("unsigned" gradients) best for detecting people [^8]. CNNs instead learn the features from raw pixels, jointly with the classifier.
- **Data augmentation** creates random variants of the training images (flips, crops, colour changes): it enlarges the training set and makes the model rely less on the exact position or colour of an object, which improves generalization [^2]. Left–right flips usually keep the category; up–down flips are less common [^2]. Only training images are augmented; d2l applies no random transforms at prediction time, so predictions are deterministic [^2]. Averaging the predictions over several augmented copies at inference is called test-time augmentation (TTA).

## Formulas

$$
G = \sqrt{G_x^2 + G_y^2},\qquad \theta = \operatorname{atan2}(G_y, G_x),\qquad K_x = \begin{bmatrix} 1 \\ 2 \\ 1 \end{bmatrix}\begin{bmatrix} -1 & 0 & 1 \end{bmatrix}
$$

$$
h(v) = \operatorname{round}\left(\frac{\operatorname{cdf}(v) - \operatorname{cdf}_{\min}}{N - \operatorname{cdf}_{\min}}\,(L - 1)\right),\qquad \sum_{\text{rows } r_0..r_1,\ \text{cols } c_0..c_1} = S[r_1, c_1] - S[r_0 - 1, c_1] - S[r_1, c_0 - 1] + S[r_0 - 1, c_0 - 1]
$$

In the equalization map, $\operatorname{cdf}(v)$ counts the pixels with level $\le v$, $\operatorname{cdf}_{\min}$ is its smallest nonzero value, $N$ the number of pixels and $L$ the number of levels [^7]. HSV from RGB in $[0, 1]$: $V = \max$, $S = (\max - \min)/\max$, hue in $60^\circ$ sectors depending on which channel is largest [^5].

## Worked example

Sobel at the centre of the patch $\begin{bmatrix} 0 & 0 & 30 \\ 0 & 30 & 60 \\ 30 & 60 & 90 \end{bmatrix}$ (cross-correlation, $y$ pointing down):

- $G_x = (30 - 0) + 2(60 - 0) + (90 - 30) = 210$ (right column minus left column).
- $G_y = (30 - 0) + 2(60 - 0) + (90 - 30) = 210$ (bottom row minus top row).
- Magnitude $\sqrt{210^2 + 210^2} = 210\sqrt2 \approx 297.0$, direction $45^\circ$: the intensity increases towards the bottom right. As a true convolution both kernels turn into their negatives, giving $-210$, $-210$ and direction $-135^\circ$, with the same magnitude.

Median vs mean on the window $\begin{bmatrix} 12 & 11 & 13 \\ 10 & 0 & 12 \\ 11 & 14 & 12 \end{bmatrix}$ with a "pepper" centre: the median is 12, the mean $95/9 \approx 10.6$.

## In code

```python
import numpy as np
img = np.array([[250, 100], [30, 5]], dtype=np.uint8)
print((img + 10).tolist())                         # [[4, 110], [40, 15]]  uint8 wraps around
print(np.clip(img.astype(np.int16) + 10, 0, 255).astype(np.uint8).tolist())  # [[255, 110], [40, 15]]
batch = np.zeros((16, 120, 160, 3), dtype=np.uint8)  # N x H x W x C, as images are loaded
print(batch.transpose(0, 3, 1, 2).shape)           # (16, 3, 120, 160)  N x C x H x W for PyTorch
green = np.array([0.0, 200.0, 0.0])
print(round(green @ np.array([0.299, 0.587, 0.114]), 1), round(green.mean(), 1))  # 117.4 66.7
```

## Common pitfalls

- Array shape is (height, width, channels), not (width, height); OpenCV images are BGR, Matplotlib expects RGB [^1].
- `uint8` arithmetic overflows silently (modulo 256); it does not saturate at 255.
- A plain channel average makes pure green and pure blue equally bright; luma weights green about five times more than blue.
- Convolution and cross-correlation differ by a $180^\circ$ rotation of the kernel: for an antisymmetric kernel such as Sobel $K_y$ the outputs differ in sign, so gradient directions flip while magnitudes stay the same; kernels unchanged by the rotation (box, Gaussian, Laplacian) give identical results [^3].
- An augmentation must keep the label: rotating a 6 by 180° gives a 9, mirroring "b" gives "d", and large hue shifts can change a flower's species; overhead satellite images, in contrast, tolerate any rotation or flip.
- Augment only the training set, after the train/test split; augmented copies of one image on both sides of the split leak information into the test score.
- Histogram equalization is a global, nonlinear lookup through the cumulative histogram, not a linear stretch of the range [^7].
- Spectrograms are not natural images: shifting them vertically changes the frequencies, so image augmentations can hurt.
