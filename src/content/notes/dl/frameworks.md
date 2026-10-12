---
topic: frameworks
summary: What deep learning frameworks such as PyTorch, Keras and JAX provide; autograd rules, eager vs compiled code, train/eval modes, saving models, GPUs, mixed precision and multi-GPU training.
status: reviewed
reviewed_by: claude
references:
  - title: 'PyTorch documentation: Autograd mechanics'
    url: https://docs.pytorch.org/docs/stable/notes/autograd.html
    locator: How autograd encodes the history; Locally disabling gradient computation (Setting requires_grad, No-grad Mode, Evaluation Mode (nn.Module.eval()))
  - title: 'JAX documentation: Just-in-time compilation'
    url: https://docs.jax.dev/en/latest/201/jit.html
    locator: What compilation buys you; What the compiled function captures; Why can't we just jit everything?; JIT and caching
  - title: 'JAX documentation: Pseudorandom numbers'
    url: https://docs.jax.dev/en/latest/101/random.html
    locator: Why not a global generator?; Keys are values; Deriving new keys
  - title: 'PyTorch tutorials: Performance Tuning Guide'
    url: https://docs.pytorch.org/tutorials/recipes/recipes/tuning_guide.html
    locator: Enable asynchronous data loading and augmentation; Disable gradient calculation for validation or inference; Checkpoint intermediate buffers; Avoid unnecessary CPU-GPU synchronization
  - title: 'PyTorch tutorial: Saving and Loading Models'
    url: https://docs.pytorch.org/tutorials/beginner/saving_loading_models.html
    locator: What is a state_dict?; Save/Load state_dict (Recommended); Save/Load Entire Model
  - title: 'PyTorch documentation: Distributed Data Parallel'
    url: https://docs.pytorch.org/docs/stable/notes/ddp.html
    locator: Internal Design
  - title: 'PyTorch documentation: Automatic Mixed Precision package (torch.amp)'
    url: https://docs.pytorch.org/docs/stable/amp.html
    locator: Introduction; Gradient Scaling
  - title: 'PyTorch documentation: Reproducibility'
    url: https://docs.pytorch.org/docs/stable/notes/randomness.html
    locator: PyTorch random number generator; CUDA convolution benchmarking; Avoiding nondeterministic algorithms (CUDA Scaled Dot Product Attention)
---
## Key ideas

- A **deep learning framework** gives you tensors on CPU or GPU, automatic differentiation, ready-made layers, losses and optimizers, data loading, and ways to save or export models. PyTorch, TensorFlow and JAX are frameworks; Keras is a high-level API that runs on top of them (`model.compile(...)`, then `model.fit(x, y, epochs=5)`). GPUs and TPUs help because training is dominated by large tensor operations that run in parallel; they make training faster, not more accurate. ONNX is a common file format for trained models, so other frameworks and runtimes can run them.
- **Eager vs compiled**: PyTorch executes each operation as Python reaches it and records the autograd graph on the fly, rebuilding it from scratch every iteration, so ordinary Python control flow (and printing any intermediate tensor) just works [^1]. Compiling, e.g. with `jax.jit`, hands the whole function to a compiler (XLA) that fuses operations and skips the per-operation Python dispatch, which is usually much faster [^2].
- **Tracing**: `jax.jit` runs the Python function once with tracers that carry only shapes and dtypes. A Python `if` on a traced value therefore raises an error (use `jax.lax.cond` or a static argument); Python side effects such as `print` or `list.append` happen only during tracing; and the compiled code is cached, so calling again with arrays of the same shapes and dtypes reuses it, while a new shape or dtype (or a new value of a static argument) triggers a new trace [^2]. `torch.jit.trace`, now deprecated in favour of `torch.compile` and `torch.export`, records only the branch taken by the example input and replays it on every input.
- **Random numbers in JAX**: there is no hidden global generator; every `jax.random` function is a pure function of an explicit key, so the same key always gives the same numbers. Derive new keys with `key, sub = jax.random.split(key)` and never reuse a key unless you want identical draws [^3].
- **Autograd rules** in PyTorch [^1]:
  - Leaf tensors with `requires_grad=True` **accumulate** gradients into `.grad`, so call `optimizer.zero_grad()` every step.
  - Under `torch.no_grad()` nothing is recorded: use it for manual parameter updates [^1] and for validation or inference, where it saves memory and time [^4]. Calling `backward()` on a result computed there raises a `RuntimeError`, and so does updating a leaf that requires grad in place outside it (`w -= lr * w.grad`).
  - `x.detach()` shares the values but is cut from the graph, so autograd treats it as a constant.
  - To freeze parameters, set `requires_grad=False` on them [^1].
- **Training loop**: `zero_grad()` → forward → loss → `backward()` → `optimizer.step()` → `scheduler.step()`.
- **Modes**: `model.train()` and `model.eval()` switch dropout and batch normalization between training and inference behaviour. `eval()` is not a gradient mode: it neither stops graph recording nor freezes weights [^1]; conversely `no_grad()` does not switch dropout off.
- **Parameters vs buffers**: BatchNorm's $\gamma$ and $\beta$ are parameters; `running_mean`, `running_var` and `num_batches_tracked` are buffers, stored in the `state_dict` but not returned by `parameters()`. Saving the `state_dict` is the recommended way; pickling the whole model stores only a reference to the file that defines its class, so moving or refactoring that code breaks loading. Call `model.eval()` before inference [^5].
- **GPUs run asynchronously**: Python queues GPU work and moves on; anything that needs a GPU value on the CPU (`print(t)`, `t.item()`, `t.cpu()`) forces a synchronization, so a per-step `.item()` stalls the pipeline [^4]. With the default `num_workers=0` the `DataLoader` loads batches in the main process while the GPU waits; `num_workers=k > 0` uses $k$ worker processes that prepare batches in parallel with training [^4].
- **Data-parallel training (DDP)**, usually one process per GPU: the replicas start identical (state broadcast from rank 0); gradients are grouped into buckets whose all-reduce starts as soon as they are ready, overlapping with the rest of the backward pass; when `backward()` returns, every process holds the same averaged gradient and takes the same optimizer step on its own replica [^6]. The effective batch is the per-GPU batch times the number of GPUs.
- **Memory** during training: weights, gradients, optimizer state (two extra tensors per parameter for Adam) and stored activations, which grow with the batch size. Remedies: smaller micro-batches with gradient accumulation, mixed precision, and activation checkpointing, which keeps only some activations and recomputes the rest during the backward pass, trading compute for memory [^4].
- **Mixed precision and loss scaling**: in float16, gradients below about $6 \times 10^{-8}$ flush to zero and their updates are lost. Multiplying the loss by a factor $S$ multiplies every gradient by $S$, which lifts them into range; the gradients are divided by $S$ again before the optimizer step, so the learning rate is unchanged. An $S$ that is too large makes gradients overflow (float16's maximum is 65504), and the scaler then lowers $S$. PyTorch's float16 recipe pairs autocasting with a `GradScaler`, while its bfloat16 mixed precision (e.g. on CPU) uses autocasting alone [^7]; bfloat16 keeps float32's 8 exponent bits and hence its range.

## Formulas

Gradient accumulation over $k$ micro-batches equals one large batch only if each micro-batch's mean loss is divided by $k$:

$$
\nabla_\theta \frac{1}{kb}\sum_{i=1}^{kb} \ell_i = \sum_{j=1}^{k} \nabla_\theta\left(\frac{1}{k}\cdot\frac{1}{b}\sum_{i \in \text{micro-batch } j} \ell_i\right)
$$

Loss scaling: $\nabla_\theta (S \cdot L) = S \cdot \nabla_\theta L$, so the unscaled step is $\theta \leftarrow \theta - \eta \cdot \tfrac{1}{S}\nabla_\theta(S \cdot L)$.

Training memory with Adam in float32: about $4 \times 4$ bytes per parameter (weights, gradients, two moments) plus activations.

## Worked example

$w = 2$, data $x = (1, 3, 2, 4)$, loss = mean of $(w x_i)^2$, whose gradient is $2w \cdot \text{mean}(x_i^2)$.

- Full batch: $\text{mean}(x^2) = 30/4 = 7.5$, gradient $= 2 \cdot 2 \cdot 7.5 = 30$.
- Two micro-batches $(1, 3)$ and $(2, 4)$ with `backward()` on each mean loss: $4 \cdot 5 = 20$ plus $4 \cdot 10 = 40$, so `.grad` holds $60$, twice too much. Dividing each micro-batch loss by $k = 2$ gives $10 + 20 = 30$.
- Memory: 10 million float32 parameters trained with Adam need $10^7 \cdot 4 \cdot 4$ bytes $= 160$ MB before activations.

## In code

```python
import torch
w = torch.tensor(2.0, requires_grad=True)
x = torch.tensor([1.0, 3.0, 2.0, 4.0])
for chunk in x.split(2):                           # two micro-batches of 2
    (((w * chunk) ** 2).mean() / 2).backward()     # divide by the number of micro-batches
print(w.grad)                                      # tensor(30.)  same as one batch of 4
with torch.no_grad():
    w -= 0.01 * w.grad                             # manual SGD step, not recorded
w.grad.zero_()
y = w.detach() ** 2 + 3 * w                        # detached term is a constant
y.backward()
print(w.grad)                                      # tensor(3.)
```

## Common pitfalls

- `.grad` accumulates across `backward()` calls; forgetting `zero_grad()` adds old gradients to new ones.
- `model.eval()` is not `torch.no_grad()`: one changes layer behaviour, the other stops graph recording; inference usually needs both. To freeze layers set `requires_grad=False`; `.eval()` freezes nothing.
- A traced or compiled function keeps the control flow seen at trace time; data-dependent `if` statements need framework control-flow primitives, and Python side effects inside `jax.jit` silently stop once the compiled version is cached.
- Calling a `jax.random` function twice with the same key does not give new numbers; split the key.
- Summing micro-batch mean losses without dividing by their number multiplies the gradient by that number.
- Loss scaling fights underflow of small float16 gradients, not overflow, and it does not raise the effective learning rate, because the gradients are unscaled before the step.
- The same seed and code can still drift apart on a GPU: `torch.manual_seed` seeds CPU and CUDA alike, but some kernels add with atomic operations in a varying order, floating-point addition is not associative, and cuDNN's benchmark mode may pick a different convolution algorithm in each run [^8].
- A `state_dict` holds tensors only; you need the model class to rebuild the network before `load_state_dict`.
