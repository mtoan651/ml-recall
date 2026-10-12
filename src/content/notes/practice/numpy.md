---
topic: numpy
summary: Practical NumPy — array creation, indexing (views vs copies), broadcasting, reductions and axes, reshape order, dtype casting and promotion, and the classic gotchas.
status: reviewed
reviewed_by: claude
references:
  - title: 'NumPy documentation: Broadcasting'
    url: https://numpy.org/doc/stable/user/basics.broadcasting.html
    locator: General broadcasting rules
  - title: 'NumPy documentation: Indexing on ndarrays'
    url: https://numpy.org/doc/stable/user/basics.indexing.html
    locator: Basic indexing; Advanced indexing (Integer array indexing, Boolean array indexing); Assigning values to indexed arrays
  - title: 'NumPy documentation: Copies and views'
    url: https://numpy.org/doc/stable/user/basics.copies.html
    locator: View; Copy; Other operations; How to tell if the array is a view or a copy
  - title: 'NumPy documentation: numpy.arange'
    url: https://numpy.org/doc/stable/reference/generated/numpy.arange.html
    locator: Parameters (stop); Returns; Warning
  - title: 'NumPy documentation: Universal functions (ufunc)'
    url: https://numpy.org/doc/stable/reference/ufuncs.html
    locator: Optional keyword arguments (out, casting); Methods (ufunc.at)
  - title: 'NumPy documentation: Data type promotion in NumPy'
    url: https://numpy.org/doc/stable/reference/arrays.promotion.html
    locator: Detailed behavior of Python scalars
  - title: 'NumPy documentation: numpy.std'
    url: https://numpy.org/doc/stable/reference/generated/numpy.std.html
    locator: Parameters (ddof, keepdims); Notes
  - title: 'NumPy documentation: numpy.argmax'
    url: https://numpy.org/doc/stable/reference/generated/numpy.argmax.html
    locator: Parameters (axis); Examples (np.unravel_index)
---
## Key ideas

- **Arrays** hold one dtype and have a `shape`; `np.zeros`, `np.ones` and `np.empty` default to float64 (8 bytes per element, so `np.zeros((10, 10)).nbytes` is 800). `np.arange(start, stop, step)` covers the half-open interval $[start, stop)$, so `np.arange(10, 50)` ends at 49; with a non-integer step, rounding can change the length and even include `stop`, so prefer `np.linspace(start, stop, num)` [^4].
- **Basic indexing** (slices `start:stop:step`, integers, `None`/`np.newaxis`, `...`) returns **views** that share memory with the original; an integer for every axis gives a single scalar instead [^2][^3]. Indices are zero-based and negative ones count from the end; an integer index removes its axis, so `x[:, 0]` is 1-D while `x[:, [0]]` and `x[:, 0:1]` stay 2-D.
- **Advanced indexing** with integer arrays or boolean masks always returns a **copy** [^2][^3]. Assigning *through* it works (`a[[0, 2]] = 9` changes `a`), but a chained write such as `a[[0, 2]][0] = 9` lands in a temporary copy and is lost. A boolean mask with as many dimensions as the array returns a 1-D array of the selected elements in row-major order [^2].
- **Assignment** converts values to the array's dtype: writing 2.9 into an integer array stores 2 [^2]. With repeated indices, `x[idx] += 1` adds only once per distinct index, because the sum is computed on a temporary and written back [^2]; the unbuffered `np.add.at(x, idx, 1)` (or `np.bincount`) counts every repetition [^5].
- **Broadcasting** compares shapes from the trailing dimension; two sizes fit when they are equal or one of them is 1, and missing leading dimensions count as 1 [^1]. Insert axes with `None`/`np.newaxis` to choose which dimensions line up, e.g. `b[:, None]` makes a column.
- **Reductions** (`sum`, `mean`, `std`, `max`, `argmax`…) remove the axis they reduce; `axis` can be a tuple, and `keepdims=True` keeps a size-1 axis so the result broadcasts back [^7]. Without `axis`, `argmax`/`argmin` return an index into the flattened array (convert with `np.unravel_index`) [^8]. `np.std` divides by $N - \text{ddof}$ with `ddof=0` by default, i.e. the population standard deviation; pass `ddof=1` for the sample standard deviation [^7].
- **reshape** reads and refills elements in C (row-major) order by default and returns a view when possible; it regroups, it does not transpose. `ravel` gives a view when possible, `flatten` always a copy; `arr.base` tells a view (not `None`) from a copy [^3].
- **Element-wise vs matrix:** `*` multiplies element-wise, `@`/`np.matmul` is the matrix product; `np.einsum` writes either explicitly (`'ii'` is the trace, `'ij,jk->ik'` the matrix product).
- **Casting in place.** Ufuncs accept `out=` to write into an existing array, and since NumPy 1.10 their default `casting` is `'same_kind'` [^5]: `a += 0.5` on an integer array raises a `UFuncTypeError` (float → int), while `a = a + 0.5` builds a new float array.
- **Python scalars are "weak"** (NumPy ≥ 2.0): their kind counts but their precision is ignored, so the array's dtype wins, e.g. `uint8_array + 10` stays `uint8` and silently wraps around, without a warning for arrays [^6].

## Formulas

- Broadcast shape: align right, then take the larger size where one of them is 1; `(4, 1, 3)` with `(5, 1)` gives `(4, 5, 3)`.
- Floor division and remainder: `a == b * (a // b) + a % b`; `//` rounds toward $-\infty$ and `%` takes the sign of the divisor, so $-7 // 2 = -4$ and $-7 \% 3 = 2$.
- `np.std(x, ddof=d)` $= \sqrt{\sum_i (x_i - \bar{x})^2 / (N - d)}$ [^7].
- Strides of a C-ordered `(m, n)` float64 array: `(8n, 8)` bytes.

## Worked example

`a` has shape `(4, 1, 3)` and `b` shape `(5, 1)`. Pad `b` on the left to `(1, 5, 1)` and compare position by position: $4$ vs $1$ → 4, $1$ vs $5$ → 5, $3$ vs $1$ → 3, so `a + b` is `(4, 5, 3)`. Adding a `(5,)` array to `a` instead fails, because 5 meets the trailing 3; `(3,)`, `(5, 3)` and `(4, 1)` all work, the last giving `(4, 4, 3)`.

Row-normalising `X = [[0, 1, 2], [3, 4, 5]]`: `X.sum(axis=1)` is `[3, 12]` with shape `(2,)`, which lines up with the 3 columns and raises; `X / X.sum(axis=1, keepdims=True)` divides each row by its own sum, and the rows then sum to 1.

## In code

```python
import numpy as np
a = np.arange(6)
a[::2][0] = 9; a[[1, 3]][0] = 9            # slice = view (write sticks); fancy index = copy (lost)
print(a)                                   # [9 1 2 3 4 5]
x, y = np.zeros(3), np.zeros(3)
x[[0, 0, 2]] += 1; np.add.at(y, [0, 0, 2], 1)
print(x, y)                                # [1. 0. 1.] [2. 0. 1.]
u = np.array([250, 5], dtype=np.uint8) + 10
print(u, u.dtype)                          # [ 4 15] uint8
i = np.array([1, 2, 3])
try: i += 0.5
except TypeError as e: print(type(e).__name__)   # UFuncTypeError
print(np.std([1, 2, 3, 4]).round(3), np.std([1, 2, 3, 4], ddof=1).round(3))   # 1.118 1.291
print(np.arange(1, 1.3, 0.1))              # [1.  1.1 1.2 1.3]: stop included by rounding
```

## Common pitfalls

- `a + b` with shapes `(4, 3)` and `(4,)` fails: the 4 meets the trailing 3; use `b[:, None]` (`b.T` does nothing to a 1-D array) [^1].
- Chained writes through fancy indexing or boolean masks are lost, because these return copies [^2][^3].
- `x[idx] += 1` with repeated indices counts each index once [^2].
- `a > 1 & a < 4` parses as `a > (1 & a) < 4`, a chained comparison that raises `ValueError` (ambiguous truth value); write `(a > 1) & (a < 4)`, and use `&`, `|`, `~` rather than `and`, `or`, `not` on arrays.
- `np.nan == np.nan` is `False`; test with `np.isnan`.
- `Z.sort()` sorts in place and returns `None`; `np.sort(Z)` returns a sorted copy.
- `reshape(3, 2)` of `[[0, 1, 2], [3, 4, 5]]` is `[[0, 1], [2, 3], [4, 5]]`, not the transpose; for image axes use `transpose`, not `reshape`.
- The array's dtype wins: `int_array += 0.5` raises instead of upcasting, and `uint8_array + 10` wraps around instead of growing to a wider type [^5][^6].
