---
topic: multi-agent
summary: Systems of interacting agents — agent types and emergence, multi-agent reinforcement learning and self-play, game theory (dominance, Nash and correlated equilibria) and adversarial search.
status: reviewed
reviewed_by: claude
references:
  - source: ms-ai-for-beginners
    url: https://github.com/microsoft/AI-For-Beginners/blob/392d0df1b2647cbee104942390551f1ed9e072c8/lessons/6-Other/23-MultiagentSystems/README.md
    locator: 'Lesson: Multi-Agent Systems — introduction (agent types); Flocking; Deliberative Agents'
  - source: hf-deep-rl-course
    url: https://huggingface.co/learn/deep-rl-course/unit7/self-play
    locator: 'Unit 7, Self-Play: What is Self-Play?; Self-Play in MLAgents; The ELO Score to evaluate our agent'
  - title: 'Wikipedia: Nash equilibrium'
    url: https://en.wikipedia.org/wiki/Nash_equilibrium
    locator: Definitions; Existence; Rationality; Computing Nash equilibria
  - title: 'Wikipedia: Correlated equilibrium'
    url: https://en.wikipedia.org/wiki/Correlated_equilibrium
    locator: Formal definition; An example; Learning correlated equilibria
  - title: 'Wikipedia: Alpha–beta pruning'
    url: https://en.wikipedia.org/wiki/Alpha%E2%80%93beta_pruning
    locator: Core idea; Improvements over naive minimax
  - title: Rashid et al., QMIX — Monotonic Value Function Factorisation for Deep Multi-Agent Reinforcement Learning (ICML 2018)
    url: https://arxiv.org/abs/1803.11485
    locator: Sec. 2 Related Work; Sec. 3.3 Independent Q-Learning; Sec. 3.4 Value Decomposition Networks; Sec. 4 QMIX
  - title: 'Wikipedia: Strategic dominance'
    url: https://en.wikipedia.org/wiki/Strategic_dominance
    locator: Dominance and Nash equilibria; Iterated elimination of strictly dominated strategies
  - title: 'Wikipedia: Minimax theorem'
    url: https://en.wikipedia.org/wiki/Minimax_theorem
    locator: Introduction; Bilinear functions and zero-sum games
---
## Key ideas

**Agents.** An agent is an entity that lives in an environment, perceives it and acts on it [^1].
*Reactive* agents have simple request–response behaviour; *deliberative* (cognitive) agents reason
and plan, e.g. with the belief–desire–intention (BDI) architecture [^1].

**Emergence.** In flocking each bird sees only its neighbours and follows three local rules —
*alignment* (match their heading), *cohesion* (move towards their centre), *separation* (avoid
crowding) — yet a realistic flock appears with no central controller [^1]. Typical uses:
game NPCs, crowds in films, epidemic and traffic simulation [^1].

**Kinds of interaction.** *Cooperative*: agents maximise a common reward. *Competitive*
(zero-sum): each maximises its own reward, which is the opponent's loss. *Mixed*: both at once.

**Multi-agent RL.**

- **Decentralised / independent learners** (e.g. independent Q-learning): each agent treats the
  others as part of the environment. Because the others keep learning, the environment is
  **non-stationary** — old replay-buffer transitions describe opponents that no longer exist, and
  there is no convergence guarantee [^6].
- **Centralised** learning of joint actions (one common policy, a global reward) avoids
  non-stationarity but the joint action space grows exponentially with the number of agents [^6].
- **Centralised training, decentralised execution (CTDE)**: during training a critic may use
  all agents' observations and actions (MADDPG, Lowe et al. 2017); at test time each actor uses
  only its own observation [^6]. COMA gives each agent a **counterfactual advantage** [^6]: the
  value of the joint action it took minus the policy-weighted average over its own alternative
  actions, the others' actions held fixed.
- **Value factorisation** for a shared team reward: VDN sets $Q_{tot}=\sum_a Q_a$; QMIX allows any
  mixing that is **monotonic**, $\partial Q_{tot}/\partial Q_a\ge 0$ (non-negative weights produced
  by hypernetworks that see the state $s$), so each agent's greedy action also maximises $Q_{tot}$
  [^6].

**Self-play** trains an agent against earlier copies of its own policy, so the opponent stays at
about its level [^2]. Keeping few, slowly changing opponents is stable but risks overfitting to
them; a larger, more varied pool gives a more general policy [^2]. Progress is measured with
**Elo**, not reward: points won equal points lost, and an upset moves more points than an expected
result [^2].

**Game theory** (simultaneous moves, payoff tables).

- A strategy is **strictly dominated** if another is better against every opponent choice; it is
  never part of a Nash equilibrium, so iteratively removing such strategies never removes an
  equilibrium [^7].
- **Nash equilibrium**: no player gains by changing *only their own* strategy [^3]. Every finite
  game has one, possibly in **mixed** strategies (Nash); a pure one may not exist (matching
  pennies). Equilibria need not be Pareto optimal [^3].
- **Prisoner's dilemma**: defect strictly dominates, so (D, D) is the unique equilibrium, though
  (C, C) is better for both [^7].
- **Mixed equilibrium**: each player mixes so that the *other* player is indifferent between the
  pure strategies they use [^3].
- **Zero-sum** (Row receives $a_{ij}$, Column pays it): von Neumann's minimax theorem says
  $\max_x\min_y x^\top Ay=\min_y\max_x x^\top Ay$ over mixed strategies [^8]; a pure saddle point
  exists when $\max_i\min_j a_{ij}=\min_j\max_i a_{ij}$ (in general only $\le$ holds) [^8].
- **Correlated equilibrium**: a mediator draws a joint action and privately tells each player
  their part; following the advice must be a best response [^4]. Every Nash equilibrium is one;
  they are found by linear programming and can be reached by simple learning dynamics [^4].
  No player is ever told to play a strictly dominated action, since obeying would not be a best
  response.

**Adversarial search** (two players, alternate moves): minimax, made faster by **alpha–beta**,
which returns the same value and move; good move ordering prunes more, and the best case
evaluates about $b^{d/2}$ leaves [^5]. Progressive (iterative) deepening returns the minimax value
for each depth and supplies a usually good order for the next one [^5] — usually, because shallow
values only estimate deeper ones.

## Formulas

$$
E_A=\frac{1}{1+10^{(R_B-R_A)/400}},\qquad R_A'=R_A+K\,(S_A-E_A)
$$

Expected payoff of mixed strategies $x$ (row) and $y$ (column) with payoff matrix $A$:
$x^\top A\,y=\sum_{i,j}x_i\,y_j\,a_{ij}$ [^8]. Entropy-regularised best response (multiplicative
weights / Hedge): maximising $\langle G,x\rangle-\tfrac1\eta\sum_i x_i\log x_i$ over the simplex
gives $x_i\propto\exp(\eta\,G_i)$, a softmax of the cumulative utilities $G_i$ (set the gradient of
the Lagrangian to zero).

## Worked example

Payoffs (Row, Column): (U, L) = (3, 0), (U, R) = (0, 2), (D, L) = (0, 1), (D, R) = (1, 0). Each
cell has a player who wants to deviate, so there is no pure equilibrium. Row plays U with
probability $p$ that makes Column indifferent: $1-p=2p\Rightarrow p=1/3$. Column plays L with $q$
that makes Row indifferent: $3q=1-q\Rightarrow q=1/4$. Equilibrium payoffs: Row $3/4$,
Column $2/3$.

## Common pitfalls

- **Nash ≠ best outcome**: it only rules out *unilateral* improvements [^3].
- **Not every finite game has a pure equilibrium**; mixed ones always exist [^3].
- **Your mixing probability is set by the opponent's payoffs**, not your own.
- **Independent learners face a moving target**, so their stored experience goes stale [^6].
- **Alpha–beta does not change the minimax value**; only ordering changes how much is pruned [^5].
  Its cut-offs compare values only by order, so any strictly increasing transform of the static
  evaluator prunes exactly the same leaves; a decreasing one (e.g. a sign flip) reverses MAX's
  preferences and can prune different leaves.
- **Elo is relative**: ratings depend on the opponents' ratings, and an expected win earns few
  points [^2].
