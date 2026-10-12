---
topic: knowledge-rep
summary: How symbolic AI stores and uses knowledge — representations, propositional and first-order logic, entailment and resolution, rule-based systems, near-miss learning and knowledge-graph embeddings.
status: reviewed
reviewed_by: claude
references:
  - source: ms-ai-for-beginners
    url: https://github.com/microsoft/AI-For-Beginners/blob/392d0df1b2647cbee104942390551f1ed9e072c8/lessons/2-Symbolic/README.md
    locator: 'Lesson 2: Knowledge Representation; Classifying Computer Knowledge Representations; Expert Systems; Forward vs. Backward Inference'
  - source: forallx-yyc
    url: https://forallx.openlogicproject.org/html/Ch12.html
    locator: Ch. 12 Semantic concepts (§12.1–12.6)
  - title: 'Wikipedia: Resolution (logic)'
    url: https://en.wikipedia.org/wiki/Resolution_(logic)
    locator: Resolution in propositional logic (A resolution technique); Resolution in first-order logic
  - title: 'Wikipedia: Rete algorithm'
    url: https://en.wikipedia.org/wiki/Rete_algorithm
    locator: Overview; Description (Conflict resolution)
  - source: mit-ocw-6034
    url: https://ocw.mit.edu/courses/6-034-artificial-intelligence-fall-2010/resources/mega-recitation-7-near-misses-arch-learning/
    locator: 'Mega-Recitation 7: Near Misses, Arch Learning (transcript)'
  - title: 'Wikipedia: Knowledge graph embedding'
    url: https://en.wikipedia.org/wiki/Knowledge_graph_embedding
    locator: Models (Tensor decomposition models — bilinear; Geometric models — translational, roto-translational)
  - source: forallx-yyc
    url: https://forallx.openlogicproject.org/html/
    locator: Ch. 15 Partial truth tables (closing summary table); Ch. 25.3 The order of quantifiers; Ch. 31 Truth in FOL; Ch. 34 Reasoning about interpretations; Ch. 38 Conversion of quantifiers; Ch. 45.3 Conjunctive normal form; Ch. 46 Functional completeness (46.1, 46.2)
  - title: 'Wikipedia: Monotonic function'
    url: https://en.wikipedia.org/wiki/Monotonic_function
    locator: In Boolean functions
---
## Key ideas

**Knowledge is not information.** In the DIKW pyramid, *data* are raw symbols, *information* is
interpreted data, *knowledge* is information actively integrated into our model of the world,
and *wisdom* is knowing when to use it [^1]. Top-down (symbolic) AI rests on representing
knowledge and reasoning with it.

**Representations** form a spectrum [^1]. At the simple end is *algorithmic* knowledge (a program:
directly usable by a computer, but inflexible); at the other end *natural language* (most
expressive, unusable for automatic reasoning). In between: *network* representations (semantic
nets, stored as object–attribute–value triples), *hierarchical* ones (**frames** with slots,
default values and inheritance; a **scenario** is a frame for a situation that unfolds in time),
*procedural* ones (production rules) and *logic* (predicate logic, Horn clauses in Prolog,
description logics).

**Propositional semantics** (truth tables) [^2][^7]:

| Concept | Definition | One good row is enough to show… |
| --- | --- | --- |
| tautology | true on every valuation | …that it is **not** a tautology |
| contradiction | false on every valuation | …that it is not a contradiction |
| jointly satisfiable | some valuation makes all true | …that they **are** satisfiable |
| valid argument / $KB \models \alpha$ | no valuation makes premises true and conclusion false | …that it is **invalid** |

Key equivalences: $P_1,\dots,P_n \models C$ iff $(P_1\land\dots\land P_n)\to C$ is a tautology iff
$\{P_1,\dots,P_n,\lnot C\}$ is unsatisfiable; unsatisfiable premises entail everything [^2]. Also
$A\to B \equiv \lnot A\lor B \equiv \lnot B\to\lnot A$ (contrapositive), but $A\to B$ is *not*
equivalent to $B\to A$.

**Normal forms and completeness.** Every sentence has an equivalent CNF (a conjunction of
clauses); the truth-table method writes one clause per *false* row [^7]. $\{\lnot,\land,\lor\}$,
$\{\lnot,\to\}$ and NAND alone are functionally complete; $\{\land,\lor,\to\}$ is not, because every
sentence built from them is true when all letters are true, so it cannot express $\lnot A$ [^7].
Formulas without $\lnot$ express exactly the *monotone* conditions — making one more letter true
can never make them false [^8]. So "at least $k$ of $n$ true" is expressible, while "exactly
$k$" and parity are not.

**Resolution** works on CNF clauses: from $(A\lor X)$ and $(\lnot A\lor Y)$ infer $(X\lor Y)$. To
prove $KB\models\alpha$, add $\lnot\alpha$ and derive the empty clause. It is sound and
refutation-complete; in first-order logic it needs **unification** (a substitution making two
literals identical, ideally the most general one) [^3].

**First-order logic.** Truth is relative to an *interpretation* (domain + meanings). There is no
truth-table test for FOL validity: a sentence has infinitely many interpretations, though one
counter-interpretation refutes it [^7]. Quantifier order matters [^7]. Useful facts:
$\exists y\,\forall x\,L(x,y)\models\forall x\,\exists y\,L(x,y)$ but not conversely;
$\lnot\forall x\,F(x)\equiv\exists x\,\lnot F(x)$ [^7]; if $x$ is not free in $G$,
$\forall x\,(F(x)\to G)\equiv\exists x\,F(x)\to G$ and $\exists x\,(F(x)\to G)\equiv\forall x\,F(x)\to G$.
$N(a)\land N(b)\land N(c)$ does not entail $\forall x\,N(x)$, since the domain may contain unnamed
objects [^7].

**Rule-based (expert) systems** have a working memory of facts, a knowledge base of IF–THEN
rules and an inference engine [^1]. **Forward chaining** is data-driven: fire rules whose
conditions hold until nothing new (or the goal) is added. **Backward chaining** is goal-driven:
pick rules that conclude the goal and recursively prove their conditions — natural for diagnosis
[^1]. The engine loops **match → resolve conflicts → act**; matching is the expensive phase, and the
**Rete** algorithm keeps partial matches between cycles and only processes changes to working
memory [^4]. Conflict resolution picks one instantiation from the conflict set: rule order,
salience, **recency** (newest fact), **specificity** (most conditions); **refraction** stops the
same instantiation firing twice [^4].

**Near-miss (arch) learning** (Winston) updates a model from one example at a time [^5]:

| Seen | Heuristic | Effect |
| --- | --- | --- |
| near miss (differs in exactly one feature) | require-link, forbid-link | specialise |
| positive example | drop-link, extend-set, climb-tree, close-interval | generalise |

Example: the model allows only red; a yellow positive example → extend-set to {red, yellow}.
Positive examples with incandescent and with fluorescent bulbs → climb-tree to "light source".
A near miss that differs only by an orange colour → forbid-link orange [^5].

**Knowledge-graph embeddings** score triples $(s, r, o)$ [^6]: TransE wants
$\mathbf{e}_s+\mathbf{e}_r\approx\mathbf{e}_o$ (small distance = plausible fact); DistMult uses a
diagonal bilinear score, which is symmetric in $s$ and $o$; ComplEx uses complex vectors and the
conjugate of the object, so it can model antisymmetric relations; RotatE rotates $\mathbf{e}_s$
element-wise by unit-modulus $r_k=e^{i\theta_k}$.

## Formulas

$$
f_{\text{TransE}}=\lVert\mathbf{e}_s+\mathbf{e}_r-\mathbf{e}_o\rVert,\qquad f_{\text{DistMult}}=\sum_k e_{s,k}\,r_k\,e_{o,k},\qquad f_{\text{ComplEx}}=\mathrm{Re}\Big(\sum_k e_{s,k}\,r_k\,\overline{e_{o,k}}\Big)
$$

RotatE: $\mathbf{e}_o\approx\mathbf{e}_s\circ\mathbf{r}$; a symmetric relation needs
$\mathbf{r}\circ\mathbf{r}=\mathbf{1}$, i.e. every $\theta_k\in\{0,\pi\}$. ComplEx with a purely real
$\mathbf{r}$ is symmetric again.

## Worked example

$KB=\{P\lor Q,\ \lnot P\lor R,\ \lnot Q\lor S,\ \lnot R\}$. Does $KB\models S$? Add $\lnot S$ and
resolve: $(\lnot P\lor R)+\lnot R\Rightarrow\lnot P$; $(P\lor Q)+\lnot P\Rightarrow Q$;
$(\lnot Q\lor S)+Q\Rightarrow S$; $S+\lnot S\Rightarrow$ empty clause. So $KB\models S$. Check by
truth table: only 1 of the 16 valuations satisfies $KB$ ($P,R$ false; $Q,S$ true), and $S$ is
true on it.

## Common pitfalls

- **Knowledge ≠ information**: knowledge is information integrated into a world model [^1].
- **Entailment vs implication**: $P\models Q$ is a claim *about* sentences; it holds iff $P\to Q$ is a
  tautology [^2]. And $P\not\models Q$ does **not** give $P\models\lnot Q$.
- **Contradictory premises make any argument valid** — validity is not truth [^2].
- **Quantifier order matters**: "someone is loved by everyone" entails "everyone loves someone",
  not the reverse [^7].
- **Forward = data-driven, backward = goal-driven**, not the other way round [^1].
- **Drop-link generalises.** It removes a requirement because positive examples showed it does
  not matter; only near misses specialise (require/forbid) [^5].
- **A near miss differs from the model in exactly one way**; an example differing in two ways
  teaches nothing [^5].
- **DistMult cannot model antisymmetric relations**: swapping $s$ and $o$ leaves its score
  unchanged [^6].
