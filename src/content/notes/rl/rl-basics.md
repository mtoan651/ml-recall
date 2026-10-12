---
topic: rl-basics
summary: The reinforcement-learning setting — agent, environment, states, actions, rewards, MDPs, discounted return, policies and value functions — and the main families of RL methods.
status: reviewed
reviewed_by: claude
references:
  - source: hf-deep-rl-course
    url: https://huggingface.co/learn/deep-rl-course/unit1/rl-framework
    locator: 'Unit 1, The Reinforcement Learning Framework: The RL Process; Markov Property; Observations/States Space; Action Space; Rewards and the discounting'
  - source: hf-deep-rl-course
    url: https://huggingface.co/learn/deep-rl-course/unit1/tasks
    locator: Unit 1, Type of tasks
  - source: hf-deep-rl-course
    url: https://huggingface.co/learn/deep-rl-course/unit1/exp-exp-tradeoff
    locator: Unit 1, The Exploration/Exploitation trade-off
  - source: hf-deep-rl-course
    url: https://huggingface.co/learn/deep-rl-course/unit1/two-methods
    locator: Unit 1, Two main approaches for solving RL problems
  - source: d2l
    url: https://d2l.ai/chapter_reinforcement-learning/mdp.html
    locator: Sec. 17.1 Markov Decision Process (17.1.1–17.1.3)
  - title: 'OpenAI Spinning Up, Part 2: Kinds of RL Algorithms'
    url: https://spinningup.openai.com/en/latest/spinningup/rl_intro2.html
    locator: Model-Free vs Model-Based RL; What to Learn
---
## Key ideas

- **Reinforcement learning (RL):** an agent learns by interacting with an environment, and the reward is its only feedback on whether an action was good. By the reward hypothesis, every goal can be written as maximising the expected cumulative reward, the expected return [^1]. Nobody tells it the correct action, unlike supervised learning, so RL needs an environment to act in (often a simulator such as a game or physics engine) and a reward function that scores outcomes.
- **The loop:** the environment gives a state $S_0$; the agent picks an action $A_0$; the environment moves to $S_1$ and returns a reward $R_1$; and so on, producing the trajectory $S_0, A_0, R_1, S_1, A_1, R_2, \dots$ [^1].
- **Markov decision process (MDP):** states, actions, transition probabilities $P(s' \mid s, a)$, a reward $r(s, a)$ and a discount $\gamma$ [^5]. The **Markov property** says the next state depends only on the current state and action, not on the earlier history, so the agent can decide from the current state alone [^1][^5]. Whether it holds depends on what you call the state: a robot whose action is an acceleration is not Markov if the state is only its position, but it is with (position, velocity) [^5]. A single game frame shows positions but not velocities.
- **State vs observation:** a state describes the world completely (chess, where the board is fully visible); an observation is partial (Super Mario Bros, where you see only part of the level) [^1].
- **Action space:** discrete (finitely many actions, e.g. 4 moves) or continuous (e.g. any steering angle) [^1]. State spaces can likewise be discrete (a board position) or continuous (CartPole's four real numbers).
- **Reward and discounting:** rewards arriving sooner are more predictable, so future rewards are discounted by $\gamma$, typically 0.95–0.99; a larger $\gamma$ makes the agent care more about the long term [^1]. With $\gamma < 1$ the return of a never-ending trajectory stays finite [^5].
- **Tasks:** *episodic* tasks have a terminal state and split into episodes (a Mario level); *continuing* tasks never end (automated trading) [^2].
- **Exploration vs exploitation:** trying actions to learn more about the environment versus using what is already known to collect reward; an agent that only exploits can settle for a small nearby reward and miss a much larger one [^3].
- **Policy:** the agent's brain, mapping a state to an action. A deterministic policy always returns the same action for a state; a stochastic policy returns a distribution $\pi(a \mid s)$ [^4]. **Policy-based** methods learn the policy directly; **value-based** methods learn a value function (expected return from a state) and act by moving to the most valuable state [^4].
- **Model-based vs model-free:** a learned model of the environment lets the agent plan ahead and can greatly improve sample efficiency, but the agent may exploit the model's errors and do well in the model yet badly in reality [^6]. Among model-free methods, policy optimisation is usually on-policy, stable and reliable; Q-learning is usually off-policy, reuses old data and is more sample-efficient but less stable [^6].

## Formulas

$$
G_t = R_{t+1} + \gamma R_{t+2} + \gamma^2 R_{t+3} + \dots = \sum_{k \ge 0} \gamma^k R_{t+k+1} = R_{t+1} + \gamma\, G_{t+1}
$$

$$
V^\pi(s) = \mathbb{E}_\pi[G_t \mid S_t = s], \qquad Q^\pi(s, a) = \mathbb{E}_\pi[G_t \mid S_t = s, A_t = a]
$$

- A reward of 1 forever is worth $1/(1 - \gamma)$, e.g. 100 for $\gamma = 0.99$.
- The optimal policy $\pi^*$ maximises the expected return from every state.

## Worked example

An episode gives $R_1, R_2, R_3, R_4 = 1, 0, 0, 10$ and ends. With $\gamma = 0.9$:

- forwards: $G_0 = 1 + 0.9 \cdot 0 + 0.81 \cdot 0 + 0.729 \cdot 10 = 8.29$;
- backwards with $G_t = R_{t+1} + \gamma G_{t+1}$: $G_3 = 10$, $G_2 = 9$, $G_1 = 8.1$, $G_0 = 1 + 0.9 \cdot 8.1 = 8.29$.

With $\gamma = 0.5$ the same episode is worth only $1 + 0.125 \cdot 10 = 2.25$, and with $\gamma = 0$ just the first reward, 1: a small $\gamma$ makes the agent short-sighted.

## In code

```python
import gymnasium as gym
env = gym.make("CartPole-v1")
print(env.observation_space.shape, env.action_space)    # (4,) Discrete(2)
obs, info = env.reset(seed=0); env.action_space.seed(0)
G, gamma, t, done = 0.0, 0.99, 0, False
while not done:                                          # one episode
    a = env.action_space.sample()                        # random policy
    obs, r, terminated, truncated, info = env.step(a)    # reward +1 per step
    G += gamma**t * r                                    # discounted return G_0
    t += 1
    done = terminated or truncated                       # pole fell / time limit
print(t, round(G, 2), round((1 - gamma**t) / (1 - gamma), 2))   # 18 16.55 16.55
```

CartPole's state is continuous (cart position and velocity, pole angle and angular velocity), while its action space is discrete: push left or right.

## Common pitfalls

- Reward function, value function and policy are different things: the reward scores one step, the value is the expected long-run return, the policy chooses actions.
- Chess and Go have discrete, fully observed states; Super Mario Bros gives only a partial observation [^1].
- A position (or one frame) is not a Markov state when motion matters; add the velocity or stack several frames [^5].
- Training a network to copy expert moves from a labelled dataset is supervised learning (behavioural cloning), not RL: no reward enters the loss.
- An MDP has transition probabilities whether or not the agent knows them; model-free methods learn without them.
- The danger of a learned model is model bias that the agent exploits, not an inability to plan [^6].
- Reward shaping changes the optimum. A bonus of $1/42$ per move makes a win on move 7 worth $1.143$ but a win on move 5 only $1.095$, so the agent may delay a sure win; a per-step penalty can instead make ending the episode early (even by losing) look attractive.
- $\gamma$ close to 1 means far-sighted, $\gamma = 0$ means only the immediate reward counts [^1].
