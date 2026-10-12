---
topic: gnn
summary: Graph neural networks; graphs as data, permutation symmetry, message passing, GCN, GraphSAGE, GAT, readout, depth and over-smoothing, and PyTorch Geometric's edge_index.
status: reviewed
reviewed_by: claude
references:
  - title: Sanchez-Lengeling et al. (2021), A Gentle Introduction to Graph Neural Networks, Distill
    url: https://distill.pub/2021/gnn-intro/
    locator: Images as graphs; What types of problems have graph structured data?; The challenges of using graphs in machine learning; Graph Neural Networks (pooling, passing messages); Into the Weeds (Comparing aggregation operations; matrix multiplications as walks on a graph)
  - title: Kipf & Welling (2017), Semi-Supervised Classification with Graph Convolutional Networks
    url: https://arxiv.org/abs/1609.02907
    locator: Sec. 2 (Eq. 2); Sec. 2.2 Layer-Wise Linear Model (Eqs. 7–8, renormalization trick); Sec. 3.1 Example (Eq. 9); Sec. 4.2 Neural Networks on Graphs; Sec. 5–6 (Cora set-up); Appendix B Experiments on Model Depth
  - title: Hamilton, Ying & Leskovec (2017), Inductive Representation Learning on Large Graphs
    url: https://arxiv.org/abs/1706.02216
    locator: Abstract; Sec. 3.1 Embedding generation (Algorithm 1, Neighborhood definition); Sec. 3.3 Aggregator Architectures; Appendix A Minibatch pseudocode
  - title: Veličković et al. (2018), Graph Attention Networks
    url: https://arxiv.org/abs/1710.10903
    locator: Sec. 2.1 Graph Attentional Layer (Eqs. 1–6); Sec. 2.2 Comparisons to Related Work; Sec. 3.1 Datasets (Inductive learning); Sec. 3.3 Experimental Setup
  - title: Li, Han & Wu (2018), Deeper Insights into Graph Convolutional Networks for Semi-Supervised Learning
    url: https://arxiv.org/abs/1801.07606
    locator: Sec. 3 Analysis (Why GCNs Work; When GCNs Fail, i.e. the karate-club experiment, the text before Theorem 1 and its proof)
  - title: 'PyTorch Geometric documentation: Introduction by Example'
    url: https://pytorch-geometric.readthedocs.io/en/2.8.1/get_started/introduction.html
    locator: Data Handling of Graphs; Common Benchmark Datasets; Mini-batches
---
## Key ideas

- **Graphs as data.** $N$ nodes with a feature matrix $X \in \mathbb{R}^{N \times d}$, edges (possibly with features $e_{ij}$) and an adjacency matrix $A$ with $A_{ij} = 1$ when $i$ and $j$ are linked. For an undirected graph $A$ is symmetric with $2|E|$ non-zeros, and row $i$ sums to the degree $d_i$; a directed graph has $A_{ij} \neq A_{ji}$ in general. A self-loop is a 1 on the diagonal. $(A^k)_{ij}$ counts the walks of length $k$ from $i$ to $j$, so multiplying features by $A$ is one hop of sum aggregation [^1]. Real graphs are sparse, so they are stored as edge lists, not $N \times N$ matrices [^1].
- **Tasks** [^1]: node-level (a label per node: the topic of each paper in a citation network), edge-level (whether or how two nodes are linked: link prediction), graph-level (one label per graph: is this molecule toxic?).
- **Why not an MLP or a CNN?** Nodes have no order, so one graph has up to $N!$ adjacency matrices, and an MLP on the flattened matrix may answer differently for each; it also needs a fixed $N$ [^1]. A $3 \times 3$ kernel keeps one weight per neighbour offset, which works because every interior pixel has exactly 8 neighbours at fixed offsets; graph nodes have a varying number of unordered neighbours [^1].
- **Symmetry.** Renumbering nodes with a permutation matrix $P$ maps $X \to PX$ and $A \to PAP^\top$. Layers with one output per node should be **equivariant**, $F(PX, PAP^\top) = P\,F(X, A)$; graph-level outputs should be **invariant**. GNNs are built to respect these symmetries [^1].
- **Message passing** (one layer): compute a message along every edge, **aggregate** the messages at each node with a permutation-invariant function that takes any number of inputs (sum, mean, max), then **update** the node from its old state and the aggregate with a learned network. The same functions serve every node [^1]. The sum is not normalised, so it also reflects how many neighbours there are; the mean gives a normalised view (useful when degrees vary a lot); the max highlights the single most salient value [^1]. Neighbours $\{1, 1, 2, 2\}$ and $\{1, 2\}$ give sums 6 and 3 but the same mean (1.5) and max (2).
- **GCN** [^2]: self-loops $\tilde A = A + I$ keep each node's own features in its update; the symmetric normalisation weights edge $(i, j)$ by $1/\sqrt{\tilde d_i \tilde d_j}$, where $\tilde d_i$ is the degree counting the self-loop, so outputs do not grow with degree, using a single weight matrix per layer. It replaces $I + D^{-1/2}AD^{-1/2}$ ($D$: degrees of $A$), whose eigenvalues reach 2 and make deep stacks unstable (the renormalisation trick). With a sparse $\tilde A$ a layer with $C$ input and $F$ output features costs $O(|E|FC)$. The Cora model has two layers, $1433 \to 16 \to 7$, trained full-batch.
- **GraphSAGE** [^3] learns aggregators (mean, max-pooling, or an LSTM fed a random order of the neighbours, since an LSTM is not permutation invariant) and concatenates the node's own state with the aggregate. It samples a fixed number of neighbours per layer, with replacement if needed, so a batch costs $O(\prod_k S_k)$: with $S_1 = 25$, $S_2 = 10$, a target node gets 10 sampled neighbours and 250 two-hop samples. Because it learns functions instead of one embedding per node, it is **inductive**: it embeds nodes and graphs never seen in training.
- **GAT** [^4] learns how much each neighbour matters. Attention is masked: scores exist only for $j$ in the neighbourhood of $i$ (including $i$). With $K$ heads the outputs are concatenated ($8 \times 8 = 64$ features in Cora's first layer); a multi-head output layer averages them instead.
- **Readout.** For graph classification, a permutation-invariant pooling (sum, mean, max) turns the node embeddings into one vector [^1].
- **Depth.** After $k$ layers a node depends on its $k$-hop neighbourhood [^2]. More layers are not better: GCN propagation is a form of Laplacian smoothing, and repeating it makes the nodes of a connected component indistinguishable (**over-smoothing**), even with untrained weights [^5]. Kipf and Welling got their best results with 2–3 layers, and beyond about 7 layers training without residual connections became difficult [^2].
- **Transductive vs inductive.** Transductive: the test nodes sit in the training graph with visible features and hidden labels (GCN on Cora: 140 training labels, 500 validation and 1,000 test nodes) [^2][^6]. Inductive: test nodes or graphs are unseen (GraphSAGE; GAT on protein graphs) [^3][^4].
- **PyTorch Geometric** [^6]: a graph is `Data(x, edge_index)`; `edge_index` is a `[2, num_edges]` long tensor in COO format with source nodes in row 0 and target nodes in row 1, not a list of pairs. An undirected edge is stored in both directions, and `num_edges` counts columns. A mini-batch is one big graph with a block-diagonal adjacency matrix, concatenated node features and a `batch` vector giving each node's graph.

## Formulas

$$
H^{(l+1)} = \sigma\big(\tilde D^{-1/2}\tilde A\tilde D^{-1/2} H^{(l)} W^{(l)}\big), \qquad \tilde A = A + I, \quad \tilde D_{ii} = \sum_j \tilde A_{ij}
$$

Kipf and Welling write $\hat A$ for the whole normalised matrix $\tilde D^{-1/2}\tilde A\tilde D^{-1/2}$ [^2]; some texts use $\hat A$, $\hat D$ for $A + I$ and its degrees, so check which is meant. Node-wise, with $\tilde d_i = \tilde D_{ii}$ (the degree counting the self-loop): $h_i' = \sigma\big(\sum_{j \in \mathcal N(i) \cup \{i\}} \frac{1}{\sqrt{\tilde d_i \tilde d_j}}\, W^\top h_j\big)$. A layer with $C$ inputs and $F$ outputs has a $C \times F$ weight matrix ($CF$ parameters, plus $F$ with a bias), whatever $N$ and $|E|$ are [^2].

General message passing, GraphSAGE and GAT [^1][^3][^4]:

$$
h_i' = \gamma\Big(h_i, \bigoplus_{j \in \mathcal N(i)} \phi(h_i, h_j, e_{ji})\Big), \qquad h_v^{k} = \sigma\big(W^k \cdot \mathrm{CONCAT}(h_v^{k-1}, \mathrm{AGG}_k\{h_u^{k-1} : u \in \mathcal N(v)\})\big)
$$

$$
\alpha_{ij} = \frac{\exp\big(\mathrm{LeakyReLU}(\mathbf a^\top [W h_i \,\Vert\, W h_j])\big)}{\sum_{k \in \mathcal N(i)} \exp\big(\mathrm{LeakyReLU}(\mathbf a^\top [W h_i \,\Vert\, W h_k])\big)}, \qquad h_i' = \sigma\Big(\sum_{j \in \mathcal N(i)} \alpha_{ij} W h_j\Big)
$$

GraphSAGE also rescales $h_v^k$ to unit length [^3]. In the GAT formulas $\mathcal N(i)$ includes $i$ itself; the LeakyReLU has slope 0.2; one head has $FF' + 2F'$ parameters ($W$ and $\mathbf a$), and $K$ heads multiply this by $K$ [^4]. Readout: $h_G = \sum_v h_v$ (or the mean or max). Over-smoothing limit on a connected graph: $\hat A = \tilde D^{-1/2}\tilde A\tilde D^{-1/2}$ satisfies $\hat A\,\tilde D^{1/2}\mathbf 1 = \tilde D^{1/2}\mathbf 1$, so $\hat A^k x$ tends to a multiple of $\tilde D^{1/2}\mathbf 1$ (entries proportional to $\sqrt{\tilde d_i}$), while the mean $(\tilde D^{-1}\tilde A)^k x$ tends to a constant vector [^5].

## Worked example

Star graph: centre 0 with leaves 1, 2, 3; features $x = (2, 1, 0, 3)$, $W = 1$, no bias, ReLU.

- Degrees with self-loops: $\tilde d = (4, 2, 2, 2)$, so the centre weights itself by $\frac14$ and each leaf by $\frac{1}{\sqrt 8} \approx 0.354$.
- Node 0: $\frac{2}{4} + \frac{1 + 0 + 3}{\sqrt 8} \approx 0.5 + 1.414 = 1.914$.
- Leaf $j$: $\frac{x_j}{2} + \frac{2}{\sqrt 8}$, giving $1.207$, $0.707$, $2.207$ for nodes 1, 2, 3; node 2 had feature 0 but receives its neighbour's signal.
- Compare: the plain sum $(\tilde A x)_0 = 6$ and the mean $1.5$ differ from 1.914, and row 0 of $\hat A$ sums to $\frac14 + \frac{3}{\sqrt 8} \approx 1.31$, not 1.

## In code

```python
import torch
from torch_geometric.data import Data
from torch_geometric.nn import GCNConv

edge_index = torch.tensor([[0, 1, 0, 2, 0, 3],   # source nodes
                           [1, 0, 2, 0, 3, 0]])  # target nodes (both directions)
data = Data(x=torch.tensor([[2.0], [1.0], [0.0], [3.0]]), edge_index=edge_index)
print(data.num_nodes, data.num_edges)  # 4 6
conv = GCNConv(1, 1)  # adds self-loops, symmetric normalisation, bias
with torch.no_grad():
    conv.lin.weight.fill_(1.0)
    conv.bias.zero_()
    print(conv(data.x, data.edge_index).view(-1))  # tensor([1.9142, 1.2071, 0.7071, 2.2071])
print(sum(p.numel() for p in GCNConv(1433, 16).parameters()))  # 22944
```

## Common pitfalls

- An undirected edge is two columns of `edge_index` and two non-zeros of $A$; $\tilde A$ has $2|E| + N$ non-zeros. In a directed graph, node $i$ aggregates only the columns whose target (row 1) is $i$, its in-degree, not every edge that touches it.
- Equivariant (node outputs move with the nodes) is not invariant (one unchanged graph output). Concatenating node vectors in index order is neither a valid aggregator nor a valid readout.
- Self-loops are not there for symmetry or connectivity; they keep the node's own features. The rows of $\tilde D^{-1/2}\tilde A\tilde D^{-1/2}$ do not sum to 1; only the mean $\tilde D^{-1}\tilde A$ does.
- The parameter count of GCN, GraphSAGE and GAT layers does not depend on the number of nodes or edges.
- Deeper is not better. The GNN-specific danger is over-smoothing (all node representations look alike), which is not the same thing as exploding gradients or overfitting.
- GAT applies the LeakyReLU before the softmax, includes the node itself, and attends only over neighbours, not over all node pairs.
- GraphSAGE is inductive because it learns shared aggregators; the sampling only fixes the cost. Transductive is not unsupervised: labels are used, only the test nodes' labels are hidden.
