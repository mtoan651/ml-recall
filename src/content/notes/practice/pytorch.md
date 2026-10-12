---
topic: pytorch
summary: Practical PyTorch — tensor shapes, broadcasting and reductions, view vs reshape, autograd, nn.Module registration, losses, the training loop, DataLoader and state_dict, with the gotchas that bite.
status: reviewed
reviewed_by: claude
references:
  - title: 'PyTorch documentation: Broadcasting semantics'
    url: https://docs.pytorch.org/docs/stable/notes/broadcasting.html
    locator: General semantics; In-place semantics
  - title: 'PyTorch documentation: torch.Tensor.view'
    url: https://docs.pytorch.org/docs/stable/generated/torch.Tensor.view.html
    locator: torch.Tensor.view (description and note on reshape)
  - title: 'PyTorch documentation: Autograd mechanics'
    url: https://docs.pytorch.org/docs/stable/notes/autograd.html
    locator: Saved tensors; Locally disabling gradient computation (Setting requires_grad; No-grad Mode; Evaluation Mode); Multithreaded Autograd (Graph retaining)
  - title: 'PyTorch source (v2.14.1): torch/nn/modules/module.py'
    url: https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/torch/nn/modules/module.py
    locator: class Module docstring; add_module; to; state_dict; load_state_dict and _load_from_state_dict (size-mismatch check); parameters; eval
  - title: 'PyTorch documentation: torch.nn.CrossEntropyLoss'
    url: https://docs.pytorch.org/docs/stable/generated/torch.nn.CrossEntropyLoss.html
    locator: Description; Parameters (ignore_index, reduction); Shape
  - title: 'PyTorch documentation: torch.utils.data'
    url: https://docs.pytorch.org/docs/stable/data.html
    locator: torch.utils.data.DataLoader (batch_size, shuffle, drop_last)
  - title: 'torchvision documentation: ToTensor'
    url: https://docs.pytorch.org/vision/stable/generated/torchvision.transforms.ToTensor.html
    locator: torchvision.transforms.ToTensor (class description)
  - title: 'PyTorch documentation: torch.argmax'
    url: https://docs.pytorch.org/docs/stable/generated/torch.argmax.html
    locator: torch.argmax(input) (first signature)
---
## Key ideas

- **Shapes first.** Image batches are `(N, C, H, W)`: 32 RGB images of $64 \times 64$ are `(32, 3, 64, 64)`. `ToTensor()` turns a PIL image or `uint8` array of shape `(H, W, C)` with values 0–255 into a float `(C, H, W)` tensor in $[0, 1]$ [^7]; Matplotlib wants `(H, W, C)`, so use `img.permute(1, 2, 0)`. A `reshape` to that shape keeps the memory order and scrambles pixels and channels.
- **Broadcasting** compares shapes from the last dimension backwards; two sizes fit when they are equal, one of them is 1, or one is missing [^1]. It never raises on `(32, 1) - (32,)`: that silently becomes `(32, 32)`, a classic loss bug. In-place operations cannot change the shape of the tensor they write into [^1].
- **Reductions** remove the reduced dimension: for `(2, 3, 4)`, `sum(dim=0)` is `(3, 4)`; `keepdim=True` keeps it as size 1, which is what you need to broadcast the result back (`A / A.sum(dim=1, keepdim=True)` normalises rows). Without `dim`, `argmax` returns one index over all elements, i.e. into the flattened tensor [^8]. `len(X)` is `X.shape[0]`.
- **view vs reshape.** `view` returns a tensor sharing the same data and only works if the new shape is compatible with the existing strides; after `transpose`/`permute` it often fails. `reshape` returns a view when possible and copies otherwise [^2]. `squeeze()` drops *every* size-1 dimension, `squeeze(0)` only the first.
- **Autograd** records the operations on tensors with `requires_grad=True` and saves what the backward pass needs [^3]. `loss.backward()` (on a scalar) *accumulates* gradients into the `.grad` of leaf tensors, so call `optimizer.zero_grad()` every step; the saved tensors are freed by the backward pass, so a second `backward()` through the same graph fails unless `retain_graph=True` [^3]. A layer used twice (tied weights) gets the sum of the gradients of both uses (chain rule).
- **No-grad vs eval mode.** `torch.no_grad()` stops recording, so no graph and no saved tensors are kept [^3], which saves memory and time during evaluation; `model.eval()` only switches layers such as dropout and batch norm to inference behaviour and does not disable gradients [^3][^4]. A net of only `Linear` and `ReLU` layers behaves identically in both modes.
- **`nn.Module` registration.** Submodules assigned as attributes are registered: they appear in `parameters()`, `state_dict()` and are moved by `.to()` [^4]. Layers kept in a plain Python list are invisible; use `nn.ModuleList` or `nn.Sequential`. `parameters()` skips duplicates, so a shared layer is counted once [^4]. `nn.Linear(in, out)` stores a weight of shape `(out, in)` plus `out` biases.
- **Devices.** `Module.to(device)` modifies the module in place [^4], but `Tensor.to(...)` returns a converted copy and leaves the original unchanged, so write `x = x.to(device)`. Model and data must be on the same device.
- **Losses.** `nn.CrossEntropyLoss` expects raw logits of shape `(N, C)` and class indices of shape `(N,)` (dtype `long`, values in $[0, C)$), and then equals `LogSoftmax` followed by `NLLLoss` (float targets of shape `(N, C)` are read as class probabilities instead); it ignores targets equal to `ignore_index = -100` and averages by default (`reduction='mean'`) [^5]. So do not apply softmax first, and pair a model ending in `LogSoftmax` with `NLLLoss`.
- **Data.** A `DataLoader` over $n$ examples yields $\lceil n/B \rceil$ batches, the last one smaller; `drop_last=True` drops that incomplete batch [^6].
- **Saving.** `state_dict()` holds parameters and persistent buffers, not the code, so you rebuild the model class before loading; `load_state_dict` is strict by default and needs exactly matching keys [^4].

A training step, in order: `model.train()`, move `x, y` to the device, `optimizer.zero_grad()`, `loss = loss_fn(model(x), y)`, `loss.backward()`, `optimizer.step()`. Evaluate with `model.eval()` inside `torch.no_grad()`.

## Formulas

- Parameters of `nn.Linear(n_in, n_out)`: $n_{in} \cdot n_{out} + n_{out}$.
- Samples from $\mathcal{N}(\mu, \sigma^2)$: `mu + sigma * torch.randn(...)`, scaled by the standard deviation, not the variance; `a + (b - a) * torch.rand(...)` gives $U[a, b)$.
- `reduction='sum'` makes the loss and its gradient $B$ times larger than `'mean'` for a batch of $B$ (one loss term per example), so SGD needs learning rate $\eta / B$ for the same steps.
- First loss of a $K$-class classifier with near-zero logits: $\ln K$ (1.099 for 3 classes), a quick sanity check.
- `torch.matmul` multiplies the last two dimensions and broadcasts the rest: `(4, 1, 3, 5) @ (6, 5, 2)` gives `(4, 6, 3, 2)`.

## Worked example

`net = nn.Sequential(nn.Linear(10, 32), nn.ReLU(), nn.Linear(32, 3))` on 1000 examples, batch size 64:

- parameters: $(10 \cdot 32 + 32) + (32 \cdot 3 + 3) = 352 + 99 = 451$; `ReLU` has none;
- after `loss.backward()`, `net[0].weight.grad` has the shape of the weight, `(32, 10)`;
- the loader gives 16 batches per epoch (15 of 64, one of 40), or 15 with `drop_last=True`;
- for logits $(2, 0, -1)$ and class 0, cross-entropy is $-\ln(e^2/(e^2 + 1 + e^{-1})) \approx 0.170$; feeding softmax outputs instead of logits gives a wrong $0.658$.

## In code

```python
import torch
from torch import nn
y_hat, y = torch.zeros(32, 1), torch.zeros(32)
print((y_hat - y).shape)                     # torch.Size([32, 32]): silent broadcast bug
t = torch.randn(2, 3, 4).transpose(1, 2)
print(t.is_contiguous(), t.reshape(2, 12).shape)   # False torch.Size([2, 12]); t.view(2, 12) raises
class ListNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.layers = [nn.Linear(4, 4)]      # plain list: not registered
print(len(list(ListNet().parameters())), len(list(nn.ModuleList([nn.Linear(4, 4)]).parameters())))  # 0 2
shared = nn.Linear(8, 8)
print(sum(p.numel() for p in nn.Sequential(shared, nn.ReLU(), shared).parameters()))  # 72, counted once
x = torch.zeros(2); x.to(torch.float64); print(x.dtype)  # torch.float32: Tensor.to returned a copy
```

## Common pitfalls

- `A / A.sum(dim=1)` on a `(2, 3)` matrix raises, and on a square matrix silently divides column $j$ by the sum of row $j$; keep the dimension with `keepdim=True` [^1].
- Predictions of shape `(N, 1)` against targets of shape `(N,)` broadcast to `(N, N)` without any error [^1].
- `model.eval()` is not `torch.no_grad()`, and neither freezes parameters (that is `requires_grad=False`) [^3].
- Forgetting `zero_grad()` accumulates gradients across steps; calling `backward()` twice on one graph raises an error [^3].
- `t.to("cuda")` without reassignment leaves `t` where it was; `model.to("cuda")` does move the model [^4].
- Class-index targets for `CrossEntropyLoss` are $0, \dots, C-1$ of dtype `long` and shape `(N,)`, not floats of shape `(N, 1)` and not labels 1 to $C$ [^5].
- `load_state_dict(..., strict=False)` only tolerates missing or unexpected keys; a tensor whose shape differs from the model's still raises a size-mismatch error, so filter the dictionary to the layers you want to transfer [^4].
- `view` on a transposed or permuted tensor fails; use `reshape` or `.contiguous().view(...)` [^2].
