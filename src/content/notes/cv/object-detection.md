---
topic: object-detection
summary: Finding and classifying objects with bounding boxes; box formats and IoU, anchors and offsets, non-maximum suppression, two-stage vs one-stage detectors, focal loss, and AP / mAP evaluation.
status: reviewed
reviewed_by: claude
references:
  - source: d2l
    url: https://d2l.ai/chapter_computer-vision/anchor.html
    locator: Sec. 14.4.1 Generating Multiple Anchor Boxes; 14.4.2 Intersection over Union (IoU); 14.4.3 Labeling Anchor Boxes in Training Data; 14.4.4 Predicting Bounding Boxes with Non-Maximum Suppression
  - source: d2l
    url: https://d2l.ai/chapter_computer-vision/ssd.html
    locator: Sec. 14.7.1 Model (14.7.1.1 Class Prediction Layer; 14.7.1.2 Bounding Box Prediction Layer); 14.7.2.2 Defining Loss and Evaluation Functions; 14.7.5 Exercises (smooth L1 loss)
  - source: d2l
    url: https://d2l.ai/chapter_computer-vision/rcnn.html
    locator: Sec. 14.8.1 R-CNNs; 14.8.2 Fast R-CNN; 14.8.3 Faster R-CNN
  - title: 'Ren et al. (2015), Faster R-CNN: Towards Real-Time Object Detection with Region Proposal Networks'
    url: https://arxiv.org/abs/1506.01497
    locator: Sec. 3.1.1 Anchors; 3.1.2 Loss Function (Eq. 2); 3.1.3 Training RPNs; 4.2 Experiments on MS COCO (Table 11)
  - title: 'Redmon et al. (2015), You Only Look Once: Unified, Real-Time Object Detection'
    url: https://arxiv.org/abs/1506.02640
    locator: Sec. 1 Introduction; 2 Unified Detection; 2.4 Limitations of YOLO
  - title: 'Lin et al. (2017), Focal Loss for Dense Object Detection'
    url: https://arxiv.org/abs/1708.02002
    locator: Sec. 2 Related Work (Class Imbalance); 3.2 Focal Loss Definition; 3.3 Class Imbalance and Model Initialization; 3.4 Class Imbalance and Two-stage Detectors; 4.1 Inference and Training (Initialization)
  - title: 'Lin et al. (2016), Feature Pyramid Networks for Object Detection'
    url: https://arxiv.org/abs/1612.03144
    locator: Sec. 3 Feature Pyramid Networks (Top-down pathway and lateral connections); 4.1 Feature Pyramid Networks for RPN
  - title: 'Hosang et al. (2017), Learning non-maximum suppression'
    url: https://arxiv.org/abs/1705.02950
    locator: Sec. 1 Introduction; 4 Doing NMS with a convnet (4.1 Loss, matching of detections to objects)
---
## Key ideas

- **Task**: for every object, output a class label **and** a bounding box. A box is 4 numbers: corners $(x_1, y_1, x_2, y_2)$ or centre format $(c_x, c_y, w, h)$, with $y$ pointing down in pixel coordinates. Classification answers "what", detection also "where"; pixel masks are segmentation.
- **IoU** (Jaccard index) = area of intersection / area of union: 1 for identical boxes, 0 for disjoint ones [^1]. A detection counts as correct only if its IoU with a ground-truth box reaches a threshold, 0.5 in PASCAL VOC's metric [^4]; IoU punishes missed area as much as extra background.
- **Anchor boxes**: reference boxes of several scales and aspect ratios centred on a grid; the network predicts a class and four **offsets** per anchor [^1]. d2l gives an anchor of scale $s$ and ratio $r$ the size $ws\sqrt r \times hs/\sqrt r$ and keeps the $n + m - 1$ scale–ratio pairs that contain $s_1$ or $r_1$ at every pixel [^1]. Offsets measure the centre shift in units of the anchor's width and height and the size change as a log ratio [^1][^4]; d2l also divides them by 0.1 (centre) and 0.2 (size) so the targets are more evenly spread and easier to fit [^1]. The log treats doubling and halving symmetrically ($\pm\log 2$), and decoding $w = w_a e^{t_w}$ always gives a positive width.
- **Labelling anchors**: in Faster R-CNN an anchor is positive if it has the highest IoU with some ground-truth box or an IoU above 0.7, negative if its IoU is below 0.3 for every ground-truth box, and ignored otherwise [^4]. d2l likewise first gives every ground-truth box its best anchor, then applies a threshold [^1].
- **Non-maximum suppression**: sort the boxes by score, keep the best, delete the remaining boxes whose IoU with it exceeds a threshold, repeat with the next survivor [^1]. A box that only overlaps an already deleted box survives. d2l's NMS, like torchvision's `nms`, puts all classes into one list; `batched_nms` runs it per class, so it never suppresses across classes (see the code). The greedy rule is hand-crafted, but a network can also learn to suppress duplicates [^8].
- **Two-stage detectors** [^3]: R-CNN runs a CNN on each of about 2000 selective-search proposals (slow). Fast R-CNN runs the CNN once per image and uses **RoI pooling**, which splits each proposal's window into an $h_2 \times w_2$ grid and max-pools every cell, so all proposals give features of the same shape. Faster R-CNN drops selective search and lets a learned **region proposal network** (RPN) propose regions from the shared feature map. The RPN predicts $2k$ objectness scores and $4k$ box coordinates per position for $k = 9$ anchors (3 scales × 3 ratios) [^4].
- **One-stage detectors** predict classes and boxes for all positions in a single pass, which makes them fast [^5]. YOLO frames detection as one regression from the image to an $S \times S \times (5B + C)$ tensor. The cell containing an object's centre is responsible for it and predicts the centre relative to the cell and the size relative to the image; a cell's few boxes share one set of class probabilities, so groups of small objects (flocks of birds) are hard [^5]. SSD predicts from dense anchors on several feature maps with $3 \times 3$ convolutions that output $a(q + 1)$ class channels and $4a$ offset channels for $a$ anchors per position [^2]; deeper, coarser maps have larger receptive fields and detect larger objects [^2].
- **Feature pyramids**: FPN adds a top-down pathway with lateral connections, so even the fine, high-resolution maps carry strong semantics and can detect small objects; its RPN puts anchors of a single scale (three aspect ratios) on each pyramid level [^7].
- **Class imbalance**: almost every candidate location is easy background. Two-stage detectors cut the candidates to one or two thousand proposals and sample minibatches with a fixed positive/negative ratio (the RPN: 256 anchors per image, up to 1:1) [^4][^6]. One-stage detectors face the full imbalance: SSD-style models mine hard negatives, while RetinaNet uses the **focal loss**, which down-weights well-classified examples, and initializes the classifier bias so that every anchor starts at foreground probability $\pi = 0.01$ [^6].
- **Box regression loss**: L1 (d2l's SSD) or smooth L1 (Faster R-CNN) on the offsets, computed for positive anchors only [^2][^4].
- **Evaluation**: go down the detections in order of confidence and pair each with a still unclaimed ground-truth object; every object can be claimed only once, so a second detection of it is a false positive that costs precision [^8]. A detection is a true positive if it claims a ground-truth box at the IoU threshold, otherwise a false positive; ground-truth boxes nobody claims are false negatives. AP summarizes the precision–recall curve of one class, and mAP averages AP over classes. COCO's main metric averages AP over the IoU thresholds $0.50, 0.55, \ldots, 0.95$, written mAP@[.5, .95], while PASCAL VOC uses mAP@0.5 [^4]. A detector can win at 0.5 and lose on the stricter average if its boxes are loose [^4].

## Formulas

$$
\mathrm{IoU}(A, B) = \frac{\lvert A \cap B \rvert}{\lvert A \rvert + \lvert B \rvert - \lvert A \cap B \rvert},\qquad t_x = \frac{x - x_a}{w_a},\ t_y = \frac{y - y_a}{h_a},\ t_w = \log\frac{w}{w_a},\ t_h = \log\frac{h}{h_a}
$$

Faster R-CNN regresses these offsets directly [^4]; d2l divides $t_x, t_y$ by 0.1 and $t_w, t_h$ by 0.2 [^1].

$$
\mathrm{FL}(p_t) = -\alpha_t (1 - p_t)^{\gamma}\log p_t \quad (\gamma = 2 \text{ works well}),\qquad b = -\log\frac{1 - \pi}{\pi}
$$

Here $p_t$ is the predicted probability of the true class and $b$ the prior bias [^6]. Smooth L1 with parameter $\sigma$ is $(\sigma x)^2/2$ for $\lvert x \rvert < 1/\sigma^2$ and $\lvert x \rvert - 0.5/\sigma^2$ otherwise [^2].

$$
\text{precision} = \frac{TP}{TP + FP},\qquad \text{recall} = \frac{TP}{TP + FN},\qquad \text{AP} \approx \frac{1}{\#\text{GT}}\sum_{\text{ranks of TPs}} \text{precision@rank}
$$

## Worked example

Boxes $A = (0, 0, 10, 10)$ score 0.9, $B = (5, 0, 15, 10)$ score 0.8, $C = (1, 1, 11, 11)$ score 0.7, $D = (20, 20, 30, 30)$ score 0.6.

- $\mathrm{IoU}(A, B)$: overlap $5 \times 10 = 50$, union $100 + 100 - 50 = 150$, so $1/3$. $\mathrm{IoU}(A, C)$: overlap $9 \times 9 = 81$, union $119$, so $0.681$.
- NMS at threshold 0.5: keep $A$, delete $C$ (0.681 > 0.5), keep $B$ (only 1/3 with $A$), keep $D$. Result: $A, B, D$.
- AP with 3 ground-truth objects and ranked detections TP, FP, TP, TP: precisions at the TPs are $1/1$, $2/3$, $3/4$, so AP $= (1 + 0.667 + 0.75)/3 \approx 0.806$.

## In code

```python
import torch
from torchvision.ops import batched_nms, box_iou, nms
boxes = torch.tensor([[0., 0., 10., 10.],    # A  (x1, y1, x2, y2)
                      [5., 0., 15., 10.],    # B
                      [1., 1., 11., 11.],    # C
                      [20., 20., 30., 30.]]) # D
scores = torch.tensor([0.9, 0.8, 0.7, 0.6])
print(box_iou(boxes, boxes)[0])               # tensor([1.0000, 0.3333, 0.6807, 0.0000])
print(nms(boxes, scores, iou_threshold=0.5))  # tensor([0, 1, 3])
labels = torch.tensor([0, 0, 1, 0])           # now C belongs to another class
print(batched_nms(boxes, scores, labels, 0.5))  # tensor([0, 1, 2, 3])  C survives
```

## Common pitfalls

- A predicted box with a tiny IoU is a **false positive**, not a false negative; a false negative is a ground-truth object that nothing detected.
- A box lying entirely inside the object can still fail the 0.5 threshold, because IoU also punishes the missed area.
- Two detections of the same object: only the higher-ranked match is a TP, the other is a FP [^8].
- Plain NMS ignores classes: a dog box can delete an overlapping cat box unless NMS runs per class (`batched_nms`).
- Geometric augmentation must transform the boxes too: a horizontal flip maps $(x_1, x_2)$ to $(W - x_2, W - x_1)$, and random crops must clip or drop boxes.
- YOLO predicts $5B + C$ numbers per cell: class probabilities are shared by the cell's boxes, not repeated per box [^5].
- Deep, coarse feature maps are for large objects (large receptive fields); small objects need the fine, early maps [^2].
- A higher AP@0.5 does not imply a higher COCO AP@[.5, .95] [^4].
