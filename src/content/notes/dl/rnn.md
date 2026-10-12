---
topic: rnn
summary: Recurrent networks for sequences; the hidden-state recurrence, weight sharing and parameter counts, backpropagation through time, vanishing and exploding gradients, LSTM and GRU gates, and seq2seq.
status: reviewed
reviewed_by: claude
references:
  - source: trusthlt-nlp
    url: https://github.com/trusthlt/nlp-with-deep-learning-lectures/blob/751182ea7a6a6f2246bbd8313329ecd09d270dbc/lectures/lecture06/pdf/nlpwdl2025-lecture06-handout.pdf
    locator: "Lecture 6 slides, frames 'Define RNN recursively — Computing current state', 'Graphical visualization of abstract RNN (unrolled)', 'RNN as acceptor or encoder', 'RNN as transducer', 'Bi-directional RNNs', 'How to provide more controlled memory access?'"
  - source: d2l
    url: https://d2l.ai/chapter_recurrent-neural-networks/rnn-scratch.html
    locator: Sec. 9.5 Recurrent Neural Network Implementation from Scratch (9.5.1 RNN Model, 9.5.2 RNN-Based Language Model, 9.5.3 Gradient Clipping)
  - source: d2l
    url: https://d2l.ai/chapter_recurrent-neural-networks/bptt.html
    locator: Sec. 9.7 Backpropagation Through Time (9.7.1.2 Truncating Time Steps, 9.7.2 Backpropagation Through Time in Detail)
  - source: d2l
    url: https://d2l.ai/chapter_recurrent-modern/lstm.html
    locator: Sec. 10.1 Long Short-Term Memory (LSTM) (introduction, 10.1.1 Gated Memory Cell)
  - source: d2l
    url: https://d2l.ai/chapter_recurrent-modern/gru.html
    locator: Sec. 10.2 Gated Recurrent Units (GRU) (10.2.1 Reset Gate and Update Gate, 10.2.2 Candidate Hidden State, 10.2.3 Hidden State)
  - source: d2l
    url: https://d2l.ai/chapter_recurrent-modern/bi-rnn.html
    locator: Sec. 10.4 Bidirectional Recurrent Neural Networks (introduction, 10.4.3 Summary)
  - source: d2l
    url: https://d2l.ai/chapter_recurrent-modern/seq2seq.html
    locator: Sec. 10.7 Sequence-to-Sequence Learning for Machine Translation (10.7.1 Teacher Forcing, 10.7.3 Decoder, 10.7.5 Loss Function with Masking, 10.7.7 Prediction)
  - source: ms-ai-for-beginners
    url: https://github.com/microsoft/AI-For-Beginners/blob/392d0df1b2647cbee104942390551f1ed9e072c8/lessons/5-NLP/17-GenerativeNetworks/README.md
    locator: 'Lesson: Generative networks (introduction: RNN architecture patterns; Soft text generation and temperature)'
---
## Key ideas

- **Recurrence**: an RNN reads a sequence one step at a time and keeps a hidden state that summarizes everything seen so far. The new state is computed directly from just two things, the current input and the previous state [^1], yet through $\mathbf{h}_{t-1}$ it depends on all earlier inputs. In d2l's row-vector notation $\mathbf{h}_t = \phi(\mathbf{x}_t W_{xh} + \mathbf{h}_{t-1} W_{hh} + \mathbf{b}_h)$, usually with $\phi = \tanh$, and the output is $\mathbf{o}_t = \mathbf{h}_t W_{hq} + \mathbf{b}_q$ [^2].
- **Weight sharing**: the same parameters are used at every time step [^1], so the parameter count does not grow with the sequence length. Unrolling over 5 or 500 steps adds no parameters (stacked layers, by contrast, each have their own weights).
- **Shapes**: input size $d$, hidden size $h$, output size $q$ give $W_{xh} \in \mathbb{R}^{d \times h}$, $W_{hh} \in \mathbb{R}^{h \times h}$, $W_{hq} \in \mathbb{R}^{h \times q}$ (with column vectors, $\mathbf{h}_t = \phi(W\mathbf{x}_t + U\mathbf{h}_{t-1} + \mathbf{b})$, the matrices are transposed, e.g. $W$ is $h \times d$). For a language model $q$ is the vocabulary size: one score per possible next token, turned into probabilities by a softmax [^2].
- **Patterns** [^8]: one-to-one (an ordinary network), one-to-many (image captioning: CNN features start an RNN that emits the caption word by word), many-to-one (text classification), many-to-many or sequence-to-sequence (translation). By where the loss sits [^1]: an **acceptor** (encoder) is supervised only on its final output, e.g. a sentiment label; a **transducer** is supervised at every position and sums the per-position losses, e.g. part-of-speech tagging.
- **Backpropagation through time (BPTT)** runs backprop on the unrolled graph. The gradient picks up powers of $W_{hh}^\top$: components along eigenvalues below 1 in magnitude vanish and those above 1 explode [^3]. Truncated BPTT stops the sum after $\tau$ steps, which can be done by detaching the gradient after a fixed number of steps [^3], e.g. by detaching the hidden state at the start of every batch.
- **Gradient clipping** rescales the gradient of all parameters together (one long vector) to norm at most $\theta$, keeping its direction; it tames exploding gradients but does nothing against vanishing ones [^2].
- **LSTM** [^4]: a memory cell $\mathbf{C}_t$ with three sigmoid gates. The forget gate keeps or erases old memory, the input gate decides how much of the tanh "input node" is written into the cell, and the output gate decides how much of $\tanh(\mathbf{C}_t)$ becomes $\mathbf{H}_t$; the outer tanh is needed because the cell, a running sum, can leave $(-1, 1)$. The additive cell update lets gradients flow across many steps, easing the vanishing-gradient problem [^4]. Gates are soft versions of a 0/1 mask that chooses, per component, between new input and old memory [^1].
- **GRU** [^5]: two sigmoid gates and no separate cell. The reset gate controls how much of $\mathbf{H}_{t-1}$ enters the candidate (short-term dependencies); the update gate $\mathbf{Z}_t$ mixes old state and candidate, and $\mathbf{Z}_t \approx 1$ copies the state forward while ignoring the input (long-term dependencies) [^5].
- **Bidirectional RNN**: one RNN reads left to right, another right to left, and their states are concatenated at each step [^1], giving $2h$ features (or $h_f + h_b$ if the sizes differ). It needs the whole sequence up front, so it suits tagging and encoding, but not next-token generation, which may only use the leftward context [^6].
- **Seq2seq** [^7]: an encoder RNN reads the source, a decoder RNN generates the target. In training the decoder gets `<bos>` plus the true target shifted by one (teacher forcing), and padding positions are masked out of the loss; at test time it is fed its own previous prediction until it emits `<eos>` [^7]. d2l's decoder starts from the encoder's final state, which requires equal numbers of layers and hidden units [^7]; otherwise a learned layer can map one state to the other. The two halves need not even be the same kind of network: captioning pairs a CNN encoder with an RNN decoder [^8].
- **Generation**: always taking the most likely token tends to loop through the same phrases; sampling from the predicted distribution with a temperature (higher means flatter and more varied) works better [^8]. Each step multiplies $d$-vectors by $d \times d$ matrices, so $N$ steps cost $O(N d^2)$, and step $t$ needs $\mathbf{h}_{t-1}$, so the steps cannot run in parallel.

## Formulas

$$
\mathbf{I}_t, \mathbf{F}_t, \mathbf{O}_t = \sigma(\mathbf{X}_t W_{x\cdot} + \mathbf{H}_{t-1} W_{h\cdot} + \mathbf{b}_\cdot),\quad \tilde{\mathbf{C}}_t = \tanh(\cdots),\quad \mathbf{C}_t = \mathbf{F}_t \odot \mathbf{C}_{t-1} + \mathbf{I}_t \odot \tilde{\mathbf{C}}_t,\quad \mathbf{H}_t = \mathbf{O}_t \odot \tanh(\mathbf{C}_t)
$$

$$
\mathbf{H}_t = \mathbf{Z}_t \odot \mathbf{H}_{t-1} + (1 - \mathbf{Z}_t) \odot \tilde{\mathbf{H}}_t,\qquad \tilde{\mathbf{H}}_t = \tanh\big(\mathbf{X}_t W_{xh} + (\mathbf{R}_t \odot \mathbf{H}_{t-1}) W_{hh} + \mathbf{b}_h\big)
$$

$$
\mathbf{g} \leftarrow \min\left(1, \frac{\theta}{\lVert\mathbf{g}\rVert}\right)\mathbf{g}
$$

Parameters per block of the form $\mathbf{X}W_x + \mathbf{H}W_h + \mathbf{b}$: $h(d + h + 1)$. A vanilla RNN layer has 1 block, a GRU 3, an LSTM 4 (cost per step scales the same way). PyTorch stores two bias vectors per block, so it reports $h(d + h + 2)$ per block.

## Worked example

Scalar RNN $h_t = \tanh(0.5\,h_{t-1} + x_t)$, $h_0 = 0$, inputs $x = (1, 0, 0)$:

- $h_1 = \tanh(1) = 0.7616$, $h_2 = \tanh(0.3808) = 0.3634$, $h_3 = \tanh(0.1817) = 0.1797$.
- $\partial h_3/\partial x_1 = (1 - h_1^2) \cdot 0.5 \cdot (1 - h_2^2) \cdot 0.5 \cdot (1 - h_3^2) = 0.420 \cdot 0.5 \cdot 0.868 \cdot 0.5 \cdot 0.968 \approx 0.088$.

Every step multiplies by $w_{hh} \cdot \tanh' \le 0.5$, so the influence of $x_1$ shrinks geometrically. Even a per-step factor of 0.9 (a linear RNN with $w_{hh} = 0.9$) leaves the first of 50 inputs a weight of only $0.9^{49} \approx 0.0057$. Counting parameters for $d = 10$, $h = 20$ (one bias per block): a block has $20 \cdot 31 = 620$, so RNN 620, GRU 1860, LSTM 2480.

## In code

```python
import torch
from torch import nn
for cls in (nn.RNN, nn.GRU, nn.LSTM):
    m = cls(input_size=10, hidden_size=20, batch_first=True)
    print(cls.__name__, sum(p.numel() for p in m.parameters()))  # RNN 640, GRU 1920, LSTM 2560
out, (h, c) = nn.LSTM(10, 20, batch_first=True)(torch.zeros(4, 7, 10))
print(out.shape, h.shape)          # torch.Size([4, 7, 20]) torch.Size([1, 4, 20])
bi = nn.GRU(10, 20, batch_first=True, bidirectional=True)
print(bi(torch.zeros(4, 7, 10))[0].shape)  # torch.Size([4, 7, 40])
```

## Common pitfalls

- An RNN does **not** have separate weights per time step; the parameter count is independent of sequence length.
- The hidden-to-hidden matrix is $h \times h$ (here $20 \times 20$), not input-sized.
- Gradient clipping fixes exploding gradients only; gated cells (LSTM/GRU) are the answer to vanishing ones. Switching from tanh to ReLU does not make clipping unnecessary: on active units nothing damps the powers of $W_{hh}^\top$ [^3].
- GRU gates are sigmoids too; both cells mix sigmoid gates with tanh candidates. An LSTM has 3 gates and a cell state, a GRU 2 gates and none.
- In the GRU, $\mathbf{Z}_t = 1$ keeps the old state and $\mathbf{Z}_t = 0$ takes the candidate, not the other way round.
- Bidirectional RNNs cannot be used for left-to-right generation, because the backward pass needs future tokens.
- Detaching the hidden state between batches (truncated BPTT) keeps its value but cuts the gradient; it does not reset the state to zero.
- If a classifier reads only the output at the last position (`out[:, -1]`), pad short sequences on the left so that the last step comes right after the real tokens; in seq2seq, exclude `<pad>` targets from the loss [^7].
