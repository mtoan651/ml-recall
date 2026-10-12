---
topic: search
summary: State-space search (uninformed, A*, heuristics), constraint satisfaction, local search, game-tree search and classical planning, with the guarantees and costs of each.
status: reviewed
reviewed_by: claude
references:
  - title: 'Wikipedia: A* search algorithm'
    url: https://en.wikipedia.org/wiki/A*_search_algorithm
    locator: Description (Pseudocode remark; Special cases); Properties (Termination and completeness; Admissibility); Bounded relaxation; Complexity (Space complexity)
  - title: 'Wikipedia: Backtracking'
    url: https://en.wikipedia.org/wiki/Backtracking
    locator: Introduction; Examples — Constraint satisfaction (variable ordering)
  - title: 'Wikipedia: Look-ahead (backtracking)'
    url: https://en.wikipedia.org/wiki/Look-ahead_(backtracking)
    locator: Look ahead techniques; Use of look ahead
  - title: Poole & Mackworth, Artificial Intelligence — Foundations of Computational Agents, 3rd ed. (2023)
    url: https://artint.info/3e/html/ArtInt3e.Ch4.S6.html
    locator: Sec. 4.6 Local Search (4.6.1 Iterative Best Improvement; 4.6.3 Local Search Variants — tabu search, Simulated Annealing)
  - source: d2l
    url: https://d2l.ai/chapter_recurrent-modern/beam-search.html
    locator: Sec. 10.8 Beam Search (10.8.1 Greedy Search; 10.8.2 Exhaustive Search; 10.8.3 Beam Search)
  - title: 'Wikipedia: Alpha–beta pruning'
    url: https://en.wikipedia.org/wiki/Alpha%E2%80%93beta_pruning
    locator: Core idea; Improvements over naive minimax
  - title: Poole & Mackworth, Artificial Intelligence — Foundations of Computational Agents, 3rd ed. (2023), Ch. 6 Deterministic Planning
    url: https://artint.info/3e/html/ArtInt3e.Ch6.html
    locator: Sec. 6.3 Regression Planning; Sec. 6.5 Partial-Order Planning
  - title: 'Wikipedia: Sussman anomaly'
    url: https://en.wikipedia.org/wiki/Sussman_anomaly
    locator: Introduction (the problem and both subgoal orders)
---
## Key ideas

A search problem has states, actions (successors), step costs, a start and a goal test. Let $b$ =
branching factor, $d$ = depth of the shallowest goal, $m$ = maximum depth.

| Strategy | Expands | Complete? | Optimal? | Memory |
| --- | --- | --- | --- | --- |
| BFS | shallowest first (FIFO) | yes (finite $b$) | fewest edges, so optimal only if all steps cost the same | $O(b^d)$ |
| DFS | deepest first (LIFO) | no on infinite/cyclic graphs without a check | no | $O(bm)$ |
| Uniform-cost (UCS) | lowest path cost $g$ | yes, costs ≥ $\varepsilon>0$ | yes | can be large |
| Iterative deepening (IDS) | DFS with limits 0, 1, 2, … | yes | fewest edges | $O(bd)$ |
| Greedy best-first | lowest $h$ | no | no | — |
| A\* | lowest $f=g+h$ | yes (see below) | yes with admissible $h$ | large |

IDS repeats the shallow levels, but most nodes sit at the deepest level, so the overhead is small:
for $b=10$, $d=5$ it generates 123,456 nodes against 111,111 for a single pass (about 11% more),
while memory stays that of one DFS. UCS is Dijkstra's algorithm, i.e. A\* with $h=0$ [^1]. BFS
may goal-test when a node is *generated*; UCS and A\* must test when it is *popped*, otherwise a
cheaper path found later is missed.

**Heuristics.** $h$ is **admissible** if it never overestimates the true cost $h^*$; **consistent**
(monotone) if $h(m)\le c(m,n)+h(n)$ on every edge [^1] and $h(\text{goal})=0$. Summing that
inequality along a path to the goal shows consistent ⇒ admissible, and since
$f(n)=g(m)+c(m,n)+h(n)\ge g(m)+h(m)=f(m)$, $f$ never decreases along a path. So with a consistent
$h$, A\* expands nodes in non-decreasing $f$, pops each node with its optimal $g$ and never needs
to process it twice [^1]. With an admissible but inconsistent $h$, A\* is optimal only if a node
reached again by a cheaper path is put back on the open list [^1]; a **strict** expanded list can
return a suboptimal path. On an infinite graph A\* still finds a solution, if one exists, when $b$
is finite and every edge costs at least some $\varepsilon>0$ [^1]. Good admissible heuristics come
from relaxed problems (e.g. Manhattan distance for the 8-puzzle), and the maximum of several
admissible heuristics is admissible and at least as informed. **Weighted A\*** ($f=g+w\,h$, $w>1$)
usually expands fewer nodes and returns a path costing at most $w\,C^*$ [^1]. A\* keeps every
generated node, its main drawback; memory-bounded variants such as **IDA\*** (iterative deepening
on $f$) need memory linear in depth but re-expand nodes [^1].

**Constraint satisfaction (CSP).** Variables, domains, constraints; solved by backtracking [^2].
**Forward checking** removes, after each assignment, the values of unassigned neighbours that
conflict with it and backtracks when a domain empties; **arc consistency** (AC-3, MAC) also checks
pairs of unassigned variables, so it prunes more [^3]. Put the most critical variables first [^2]:
the one with the fewest remaining values (MRV) [^3], and on ties the one in the most constraints
with unassigned variables (degree heuristic), whose value prunes the most other domains. Try first
the value that removes the fewest values from other domains [^3].

**Local search** keeps one complete state. Hill climbing (greedy descent) moves to the best
neighbour and stops at a local optimum [^4]. **Simulated annealing** accepts a worse neighbour with
probability $e^{-\Delta E/T}$: close to a random walk at high $T$, greedy descent as $T\to 0$ [^4].
**Tabu search** keeps taking the best allowed move, even a worse one, but forbids undoing recent
changes for a few steps (the tabu tenure), so it does not cycle back [^4]. TSP 2-opt removes two
edges and reconnects by reversing a segment. **Beam search** keeps the $k$ most probable prefixes;
$k=1$ is greedy search, cost grows as $O(k\,|\mathcal{Y}|\,T')$ versus $O(|\mathcal{Y}|^{T'})$ for
exhaustive search [^5]. A finite beam is guaranteed optimal only if it can hold every prefix.

**Games.** Minimax backs up max at MAX nodes and min at MIN nodes. **Alpha–beta** prunes branches
that cannot change the decision, so it returns *the same value and move* [^6]. With perfect move
ordering the leaf count follows $b\times1\times b\times1\cdots$, about $b^{d/2}$ instead of $b^d$, and
iterative deepening supplies good ordering [^6]. As an AND/OR tree, MAX needs one good move (OR
node) that works against every MIN reply (AND node).

**Planning (STRIPS).** Each action has $pre(a)$, $add(a)$, $del(a)$. Forward (progression)
planning picks the *first* action first; backward (regression) planning picks the *last* action
first; a partial-order planner commits to an order only when forced [^7]. It starts from a dummy
start action (achieves the initial state) and finish action (preconditions = goal), keeps
**causal links** $a_2\xrightarrow{P}a_3$, and resolves a **threat** (an action that may undo $P$
between them) by ordering it before $a_2$ or after $a_3$ [^7]. The **Sussman anomaly** (C on A;
goal A on B and B on C) defeats planners that finish one subgoal before starting the other:
whichever subgoal is achieved first must be undone to achieve the second [^8].

## Formulas

$$
f(n)=g(n)+h(n),\qquad \text{admissible: } h(n)\le h^*(n),\qquad \text{consistent: } h(m)\le c(m,n)+h(n)
$$

$$
\text{IDS generations}=\sum_{i=0}^{d}(d+1-i)\,b^{i}=O(b^d),\qquad \text{BFS (goal test on generation)}\le\sum_{i=0}^{d}b^{i}
$$

Regression of goal $g$ through a relevant action ($add(a)\cap g\ne\emptyset$, $del(a)\cap g=\emptyset$) [^7]:

$$
g'=\big(g\setminus add(a)\big)\cup pre(a)
$$

## Worked example

Edges S→A (2), S→B (5), A→B (1), B→G (3); $h(S)=0$, $h(A)=4$, $h(B)=0$, $h(G)=0$. True costs to
G are 6, 4, 3, 0, so $h$ is admissible, but $h(A)=4>c(A,B)+h(B)=1$: not consistent. A\* with a
strict expanded list: pop S; push A ($f=2+4=6$) and B ($f=5$). Pop B, push G ($f=g=8$). Pop A,
push S–A–B ($g=3$, $f=3$); when it is popped, B is already expanded, so it is dropped. Pop G and
return cost **8**, while S–A–B–G costs **6**. Re-opening B (non-strict list) gives the optimum.

## Common pitfalls

- **BFS is not cost-optimal** when step costs differ — it minimises the number of edges.
- **Admissible + strict expanded list can fail**; it needs a consistent heuristic [^1].
- **UCS cannot goal-test on generation**, unlike BFS.
- **Alpha–beta never changes the answer** — only how many leaves are evaluated; bad ordering just
  prunes less [^6].
- **Forward checking ≠ arc consistency**: forward checking only looks at neighbours of the
  variable just assigned [^3].
- **A wider beam** costs more and usually finds an equally or more probable output [^5], but it is
  not guaranteed to: the extra prefixes can crowd out the one that led to the narrower beam's answer.
- **Regression adds preconditions and removes achieved goals** — and the action must not delete
  any other goal [^7].
