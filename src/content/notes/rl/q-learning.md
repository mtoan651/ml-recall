---
topic: q-learning
summary: Value-based RL — Bellman equations, value iteration, Monte Carlo vs TD, tabular Q-learning vs SARSA, ε-greedy exploration, and Deep Q-Networks with replay, target networks and Double DQN.
status: reviewed
reviewed_by: claude
references:
  - source: hf-deep-rl-course
    url: https://huggingface.co/learn/deep-rl-course/unit2/mc-vs-td
    locator: Unit 2, Monte Carlo vs Temporal Difference Learning
  - source: hf-deep-rl-course
    url: https://huggingface.co/learn/deep-rl-course/unit2/q-learning
    locator: 'Unit 2, Introducing Q-Learning: What is Q-Learning?; The Q-Learning algorithm; Off-policy vs On-policy'
  - source: d2l
    url: https://d2l.ai/chapter_reinforcement-learning/value-iter.html
    locator: Sec. 17.2 Value Iteration (17.2.2–17.2.6, 17.2.9 Summary)
  - source: d2l
    url: https://d2l.ai/chapter_reinforcement-learning/qlearning.html
    locator: Sec. 17.3 Q-Learning (17.3.1–17.3.3, 17.3.6 Summary)
  - source: hf-deep-rl-course
    url: https://huggingface.co/learn/deep-rl-course/unit3/deep-q-network
    locator: Unit 3, The Deep Q-Network (DQN) — Preprocessing the input and temporal limitation
  - source: hf-deep-rl-course
    url: https://huggingface.co/learn/deep-rl-course/unit3/deep-q-algorithm
    locator: 'Unit 3, The Deep Q-Learning Algorithm: Experience Replay; Fixed Q-Target; Double DQN'
  - title: 'Sutton & Barto (2018), Reinforcement Learning: An Introduction, 2nd ed.'
    url: http://incompleteideas.net/book/RLbook2020.pdf
    locator: 'Sec. 6.5 Q-learning: Off-policy TD Control, Example 6.6 Cliff Walking'
  - source: hf-deep-rl-course
    url: https://huggingface.co/learn/deep-rl-course/unit3/from-q-to-dqn
    locator: Unit 3, From Q-Learning to Deep Q-Learning
---
## Key ideas

- **Value-based methods** learn how good states or state–action pairs are and derive the policy from that. The action-value $Q^\pi(s, a)$ is the expected return after taking $a$ in $s$ and then following $\pi$. Once the optimal $Q^*$ is known, acting greedily, $\pi^*(s) = \arg\max_a Q^*(s, a)$, is optimal and needs no model of the environment [^3].
- **Bellman equation:** a recursive definition: the value of a state is the expected immediate reward plus the discounted value of the next state [^3].
- **Value iteration** (dynamic programming) needs the model $P(s' \mid s, a)$ and $r(s, a)$ and repeats the Bellman optimality backup for every state; it converges to $V^*$ whatever the initial values [^3]. One sweep costs $|\mathcal{S}| \cdot |\mathcal{A}| \cdot |\mathcal{S}|$ products, e.g. $64 \cdot 4 \cdot 64 = 16{,}384$ on an $8 \times 8$ grid.
- **Monte Carlo vs TD.** Monte Carlo waits for the end of the episode and moves $V(S_t)$ toward the actual return $G_t$. TD(0) updates after a single step toward $R_{t+1} + \gamma V(S_{t+1})$, using its own current estimate of the next state (**bootstrapping**) [^1].
- **Q-learning** is an off-policy, value-based TD method that trains the Q-function; in the tabular case the **Q-table** has one cell per state–action pair and acts as the agent's memory [^2]. Its hyperparameters are the learning rate $\alpha$, the discount $\gamma$ and the exploration rate $\epsilon$.
- **ε-greedy:** with probability $\epsilon$ take a random action (explore), otherwise the action with the highest Q-value (exploit); $\epsilon$ starts high, e.g. 1.0, and is decayed as the table improves [^2].
- **Off-policy vs on-policy.** Q-learning *acts* ε-greedily but its target uses the greedy $\max_{a'} Q(S_{t+1}, a')$: two different policies. **SARSA** is on-policy: its target uses the action $A_{t+1}$ the ε-greedy policy actually picks [^2]. On the cliff-walking grid Q-learning therefore learns the optimal path right along the edge (and, while it still explores, sometimes falls off), whereas SARSA learns a longer, safer path that allows for its own exploratory slips [^7].
- Because the target takes a max, Q-learning can learn $Q^*$ even from a random behaviour policy; poor coverage of the state space, however, gives poor estimates everywhere, so the exploration policy matters [^4].
- **Deep Q-learning.** Tabular methods only work for small spaces: an Atari frame of $210 \times 160 \times 3$ values in 0–255 can take $256^{100800}$ different values, far too many for a table, so a network $Q_\theta(s, a)$ replaces it [^8]. In DQN, frames are reduced to $84 \times 84$ grayscale, and four frames are stacked because one frame shows no motion (temporal limitation) [^5].
- DQN alternates a **sampling** phase (act, store transitions in a replay memory) and a **training** phase (learn from a random minibatch). **Experience replay** reuses each transition many times, breaks the correlation between consecutive samples and reduces catastrophic forgetting. A **fixed Q-target** network, copied from the online network every $C$ steps, keeps the target from moving at every update. **Double DQN** lets the online network choose the next action and the target network evaluate it, which reduces the overestimation caused by taking a max over noisy values [^6].

## Formulas

$$
V^\pi(s) = \sum_a \pi(a \mid s) \Big[ r(s, a) + \gamma \sum_{s'} P(s' \mid s, a)\, V^\pi(s') \Big], \qquad V_{k+1}(s) = \max_a \Big[ r(s, a) + \gamma \sum_{s'} P(s' \mid s, a)\, V_k(s') \Big]
$$

$$
\text{MC: } V(S_t) \leftarrow V(S_t) + \alpha [G_t - V(S_t)], \qquad \text{TD(0): } V(S_t) \leftarrow V(S_t) + \alpha [R_{t+1} + \gamma V(S_{t+1}) - V(S_t)]
$$

$$
Q(S_t, A_t) \leftarrow Q(S_t, A_t) + \alpha \big[ R_{t+1} + \gamma \max_{a'} Q(S_{t+1}, a') - Q(S_t, A_t) \big]
$$

- The bracket is the **TD error**; $R_{t+1} + \gamma \max_{a'} Q(S_{t+1}, a')$ is the **TD target**. If $S_{t+1}$ is terminal, the target is just $R_{t+1}$ [^4].
- SARSA target: $R_{t+1} + \gamma Q(S_{t+1}, A_{t+1})$ [^2].
- DQN target $y = r + \gamma \max_{a'} Q_{\text{target}}(s', a')$; Double DQN $y = r + \gamma\, Q_{\text{target}}(s', \arg\max_{a'} Q_{\text{online}}(s', a'))$ [^6].

## Worked example

$Q(s, a) = 2$, reward $r = 1$, $\gamma = 0.9$, $\alpha = 0.5$, and $Q(s', \cdot) = (5, 3)$.

- Q-learning: target $1 + 0.9 \cdot 5 = 5.5$, TD error $3.5$, new $Q(s, a) = 2 + 0.5 \cdot 3.5 = 3.75$.
- SARSA, if the ε-greedy policy actually picked the second action in $s'$: target $1 + 0.9 \cdot 3 = 3.7$, new value $2 + 0.5 \cdot 1.7 = 2.85$.
- Double DQN with online values $(5, 4)$ and target-network values $(3, 4.5)$ at $s'$: the online net picks the first action, the target net scores it 3, so $y = 1 + 0.9 \cdot 3 = 3.7$; plain DQN would use $\max(3, 4.5)$ and get $5.05$.

## In code

```python
import numpy as np
Q, goal = np.zeros((5, 2)), 4              # chain 0-1-2-3-4, actions 0 = left, 1 = right
alpha, gamma, eps = 0.5, 0.9, 0.3
rng = np.random.default_rng(0)
for episode in range(200):
    s = 0
    while s != goal:                       # entering state 4 gives reward 1 and ends
        a = int(rng.integers(2)) if rng.random() < eps else int(Q[s].argmax())  # eps-greedy
        s2 = max(s - 1, 0) if a == 0 else s + 1
        r = 1.0 if s2 == goal else 0.0
        target = r + gamma * Q[s2].max() * (s2 != goal)    # no bootstrap from a terminal state
        Q[s, a] += alpha * (target - Q[s, a])              # move toward the TD target
        s = s2
print(Q[:goal].round(3).tolist())  # [[0.656, 0.729], [0.656, 0.81], [0.729, 0.9], [0.81, 1.0]]
```

The "right" column is $\gamma^{3-s}$ and the "left" one is $\gamma$ times the value of the state reached (state 0 stays put), i.e. $Q^*$ to three decimals: each update moves an entry halfway to its TD target, and the reward spreads backwards from the goal one state at a time.

## Common pitfalls

- Q-learning is the *algorithm*; the Q-function is the action-value function it trains; the Q-table is where the values are stored. Each cell holds a state–action value, not a state value [^2].
- Monte Carlo cannot update before the episode ends; TD can, because it bootstraps [^1].
- Value iteration needs the transition model; Q-learning is model-free and learns from sampled transitions [^3][^4].
- Forgetting the terminal case (bootstrapping from a terminal state) corrupts the values [^4].
- With all Q-values 0, a first-action tie-break and $\epsilon = 0$, the agent may repeat the same move forever on a sparse-reward map and never learn; with $\gamma = 0$ only states one step from a reward get nonzero values.
- Classic Q-learning fails on Atari because the state space is gigantic, not because the actions are continuous (Atari has a few discrete actions) or because games are fast [^8].
- One frame is not a Markov state; stacking four frames adds the motion information [^5].
- Taking a max over noisy estimates is biased upward (overestimation); Double DQN decouples selection from evaluation, the replay buffer and target network address correlation and moving targets [^6].
