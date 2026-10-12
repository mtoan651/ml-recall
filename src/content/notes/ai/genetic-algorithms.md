---
topic: genetic-algorithms
summary: Genetic algorithms evolve a population of encoded solutions by fitness-based selection, crossover and mutation; this note covers the loop, the operators and the schema theorem.
status: reviewed
reviewed_by: claude
references:
  - title: 'Wikipedia: Genetic algorithm'
    url: https://en.wikipedia.org/wiki/Genetic_algorithm
    locator: Methodology (Optimization problems; Initialization; Selection; Genetic operators; Termination); Limitations; Variants (Elitism); Problem domains
  - title: 'Wikipedia: Selection (evolutionary algorithm)'
    url: https://en.wikipedia.org/wiki/Selection_(evolutionary_algorithm)
    locator: Methods of selection (Roulette wheel selection; Stochastic universal sampling; Rank selection; Linear rank selection; Elitist selection)
  - title: 'Wikipedia: Tournament selection'
    url: https://en.wikipedia.org/wiki/Tournament_selection
    locator: Introduction; Variants
  - title: 'Wikipedia: Crossover (evolutionary algorithm)'
    url: https://en.wikipedia.org/wiki/Crossover_(evolutionary_algorithm)
    locator: Crossover for binary arrays; Crossover for permutations (PMX; Order crossover (OX1); Further crossover operators)
  - title: 'Wikipedia: Mutation (evolutionary algorithm)'
    url: https://en.wikipedia.org/wiki/Mutation_(evolutionary_algorithm)
    locator: Introduction; Bit string mutation; Mutation of permutations
  - title: "Wikipedia: Holland's schema theorem"
    url: https://en.wikipedia.org/wiki/Holland%27s_schema_theorem
    locator: Introduction; Description
  - title: 'Wikipedia: Ant colony optimization algorithms'
    url: https://en.wikipedia.org/wiki/Ant_colony_optimization_algorithms
    locator: Algorithm and formula (Edge selection; Pheromone update)
---
## Key ideas

A genetic algorithm (GA) is a population-based search inspired by evolution. It needs two
things: an **encoding** of candidate solutions as chromosomes (genes, often bit strings) and a
**fitness function** that scores them — e.g. scheduling, knapsack or TSP tours [^1]. For the
0/1 knapsack, bit $i$ says whether item $i$ is packed, and the fitness is the packed value if the
weight limit holds and 0 otherwise [^1].

**The loop** [^1]:

1. Create an initial population (usually random).
2. Evaluate fitness; **select** parents, fitter ones more often.
3. **Crossover** (recombination) mixes two parents into children.
4. **Mutation** randomly changes genes of a child.
5. Form the next generation (optionally keep the best unchanged: **elitism** [^2]); stop after a
   fixed number of generations, a good-enough solution or a fitness plateau.

Only elitism guarantees that the best fitness never drops from one generation to the next; a loop
that replaces the whole population by mutated children can lose its best individual [^1].

**Why both operators.** Crossover combines building blocks of different parents, and this mixing
helps the population leave local optima where a hill climber would stop; mutation keeps diversity
[^1][^5]. A GA without crossover — selection plus random mutation — is essentially a set of
stochastic hill climbers run in parallel. Standard crossovers cannot change a population in which
all individuals are identical; only mutation can [^1]. A mutation rate that is too low lets the
population drift and stagnate; one that is too high destroys good solutions unless elitism keeps
them [^1].

**Fitness design.** A pass/fail fitness (1 if the whole task is solved, else 0) gives a flat
landscape with "no hill to climb": every random start scores 0, and the GA is no better than
random search [^1]. Give partial credit (e.g. the fraction of test cases handled correctly), and
include cases that must be *rejected*, or the evolved solution may simply accept everything.

**Selection** [^2][^3]:

| Method | Rule | Notes |
| --- | --- | --- |
| Roulette wheel | $p_i=f_i/\sum_j f_j$ | needs $f\ge 0$; one dominant individual takes over |
| Stochastic universal sampling | one spin, $N$ pointers $\sum f/N$ apart | same expectations, minimal spread |
| Linear rank | $P(i)=\dfrac{2(n-i+1)}{n(n+1)}$ for rank $i$ (1 = best) | uses only the ordering |
| Tournament | draw $k$, keep the fittest | larger $k$ = higher pressure; $k=1$ is random selection |

**Selection pressure**: the higher it is, the faster the population converges — too high causes
**premature convergence** to a suboptimal solution [^2]. Tournament and rank selection depend only
on which individual is fitter, so adding a constant to all fitness values changes nothing; roulette
probabilities do change.

**Crossover** [^4]: one-point (swap tails after a random cut), two-/k-point, uniform (each gene
from either parent with probability 1/2; parents that differ in $m$ positions give $2^m$
possible children). For **permutations** (TSP tours) these break validity — a child may contain
a city twice and miss another — so special operators are used: **PMX** (copy a segment, repair the
rest through the segment's mapping), **OX1** (copy a segment, fill the gaps in the other parent's
order), **cycle crossover** (each position keeps a parent's value; positions are split into cycles).
Other tour encodings: *adjacency* (position $i$ holds the city after $i$) and *ordinal* (indices
into a shrinking reference list).

**Mutation** [^5]: bit-flip with probability $p_m$ per bit, commonly $p_m=1/l$ (about one flip per
child). With $p_m=0.5$ every child is a uniformly random string — the GA degrades to random search.
Permutations use swap, inversion or rotation [^5].

**Ant colony optimisation** (a related swarm method for the TSP): each ant builds a tour edge by
edge, preferring edges with more pheromone and shorter length; afterwards pheromone evaporates
by a factor $1-\rho$ and each ant adds $Q/L_k$ to every edge of its tour, so shorter tours
($L_k$ small) leave more pheromone [^7].

## Formulas

Schema $H$ (e.g. `1**0*1**`): **order** $o(H)$ = number of fixed positions, **defining length**
$\delta(H)$ = distance between the first and last fixed positions; it matches $2^{\#*}$ strings [^6].
Holland's schema theorem [^6]:

$$
\mathbb{E}[m(H,t+1)]\ \ge\ \frac{m(H,t)\,f(H)}{a_t}\,(1-p),\qquad p=\frac{\delta(H)}{l-1}\,p_c+o(H)\,p_m
$$

Short, low-order, above-average schemata grow exponentially [^6]. Probability a child of length
$l$ survives bit-flip mutation unchanged: $(1-p_m)^l$, which is $\approx e^{-1}\approx 0.37$ for
$p_m=1/l$.

## Worked example

Fitness 5, 3, 2 (total 10). Roulette: $P=0.5, 0.3, 0.2$; a mating pool of 3 expects $3\times0.5=1.5$
copies of the best. Deterministic tournament, $k=2$, with replacement: the best wins iff it is
drawn at least once, $1-(2/3)^2=5/9\approx0.56$.

Schema `1**0*1**` ($l=8$): fixed positions 1, 4, 6, so $o=3$, $\delta=5$, $2^5=32$ matching strings.
With $p_c=0.7$, $p_m=0.01$: $p=\tfrac57(0.7)+3(0.01)=0.53$. If $m=10$ and $f(H)/a_t=1.2$, the bound
is $10\times1.2\times0.47=5.64<10$: although the schema is fitter than average, the theorem no
longer promises growth, because crossover disrupts such a long schema too often.

## In code

```python
def ox1(p0, p1, i, j):          # keep p0[i:j], fill the rest in p1's order
    child = [None] * len(p0)
    child[i:j] = p0[i:j]
    rest = [g for g in p1 if g not in child]
    for k in range(len(p0)):
        if child[k] is None:
            child[k] = rest.pop(0)
    return child

print("".join(ox1(list("ABCDEFGH"), list("HGFEDCBA"), 2, 5)))   # HGCDEFBA
```

## Common pitfalls

- **Crossover vs mutation**: crossover needs two parents and recombines; mutation alters one
  individual randomly [^1].
- **Pass/fail fitness stalls the search** — there is no gradient of quality to follow [^1].
- **Plain one-point crossover on path-encoded tours gives invalid tours**; use PMX, OX1 or CX [^4].
- **More selection pressure is not always better**: it speeds convergence but risks premature
  convergence [^2].
- **A larger tournament raises pressure** (weak individuals meet stronger ones more often) [^3].
- **Defining length counts the distance**, not the number of fixed positions: for `*10***1*`
  the fixed positions are 2, 3, 7, so $o=3$ but $\delta=5$ [^6].
- **High mutation is not "more exploration for free"**: at $p_m=0.5$ inheritance is lost entirely.
