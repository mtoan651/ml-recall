---
topic: policy-gradient
summary: Learning a parameterised policy directly by gradient ascent on the expected return — the log-derivative trick, REINFORCE, reward-to-go and baselines, actor-critic with advantages, GAE and PPO.
status: reviewed
reviewed_by: claude
references:
  - source: hf-deep-rl-course
    url: https://huggingface.co/learn/deep-rl-course/unit4/what-are-policy-based-methods
    locator: Unit 4, What are the policy-based methods? (The difference between policy-based and policy-gradient methods)
  - source: hf-deep-rl-course
    url: https://huggingface.co/learn/deep-rl-course/unit4/advantages-disadvantages
    locator: Unit 4, The advantages and disadvantages of policy-gradient methods
  - title: 'OpenAI Spinning Up, Part 3: Intro to Policy Optimization'
    url: https://spinningup.openai.com/en/latest/spinningup/rl_intro3.html
    locator: Deriving the Simplest Policy Gradient; Implementing the Simplest Policy Gradient; Expected Grad-Log-Prob Lemma; Don't Let the Past Distract You; Baselines in Policy Gradients; Other Forms of the Policy Gradient
  - source: hf-deep-rl-course
    url: https://huggingface.co/learn/deep-rl-course/unit6/advantage-actor-critic
    locator: 'Unit 6, Advantage Actor-Critic (A2C): Reducing variance with Actor-Critic methods; Adding Advantage in Actor-Critic'
  - title: 'Schulman et al. (2016), High-Dimensional Continuous Control Using Generalized Advantage Estimation, arXiv:1506.02438'
    url: https://arxiv.org/abs/1506.02438
    locator: Sec. 3 Advantage Function Estimation (Eqs. 16–18)
  - title: 'Schulman et al. (2017), Proximal Policy Optimization Algorithms, arXiv:1707.06347'
    url: https://arxiv.org/abs/1707.06347
    locator: Abstract; Sec. 2.1 Policy Gradient Methods; Sec. 3 Clipped Surrogate Objective
  - title: 'OpenAI Spinning Up, Part 1: Key Concepts in RL'
    url: https://spinningup.openai.com/en/latest/spinningup/rl_intro.html
    locator: Policies › Stochastic Policies › Diagonal Gaussian Policies
---
## Key ideas

- **Policy-based methods** learn the policy $\pi_\theta(a \mid s)$ directly, usually a network that outputs a probability distribution over actions, and maximise the expected return $J(\theta)$. **Policy-gradient** methods are the *subset* that do this by gradient ascent on $J(\theta)$; other policy-based methods optimise $\theta$ indirectly, e.g. by hill climbing, simulated annealing or evolution strategies [^1]. It is ascent because $J$ is a return to maximise.
- **Pros:** they can learn genuinely stochastic policies (useful against perceptual aliasing, where two states look the same but need different actions), they handle high-dimensional and continuous action spaces by outputting a distribution, and action preferences change smoothly. **Cons:** they often converge to a local rather than a global maximum, learn slowly and have high variance [^2].
- **Log-derivative trick:** $\nabla_\theta P = P\,\nabla_\theta \log P$ turns the gradient of an expectation into an expectation that can be estimated from sampled trajectories. In $\log P(\tau \mid \theta)$ the start-state and transition terms do not depend on $\theta$, so only $\sum_t \nabla_\theta \log \pi_\theta(a_t \mid s_t)$ remains: no model of the environment is needed [^3].
- **REINFORCE** (Monte Carlo policy gradient) weights each $\nabla \log \pi$ by a return from a complete episode: unbiased, but noisy. Two variance reducers keep the expected gradient unchanged [^3]:
    - **reward-to-go**: weight action $a_t$ only by rewards from $t$ on, since earlier rewards cannot be its consequences;
    - **baseline**: subtract any $b(s_t)$ that depends on the state only (not on the action), usually a learned value function trained by regression on the returns. This follows from the expected grad-log-prob (EGLP) lemma, $\mathbb{E}_{a \sim \pi}[\nabla_\theta \log \pi_\theta(a \mid s)] = 0$.
- The PyTorch "loss" `-(logp * weights).mean()` only has the right *gradient* at the current parameters on fresh data; its value says nothing about performance, so watch the average return instead [^3].
- **Actor-critic:** the actor is the policy $\pi_\theta$, the critic a learned value function that judges the actions; replacing full Monte Carlo returns by the critic's estimates reduces variance [^4]. **A2C** uses the advantage $A(s, a) = Q(s, a) - V(s)$, how much better $a$ is than the state's average; a positive advantage pushes the policy toward $a$, a negative one away, and the TD error estimates it without a separate $Q$ [^4].
- **GAE** sums discounted TD errors with a parameter $\lambda$: $\lambda = 0$ gives the TD error (low variance, biased unless $V$ is exact), $\lambda = 1$ the discounted return minus $V(s_t)$ (unbiased, high variance) [^5].
- **On-policy data.** The estimate assumes trajectories from the current policy, so vanilla policy gradient takes one step per batch; repeated steps on the same batch are not well-justified and often destroy the policy. **PPO** (also on-policy) clips the probability ratio, giving a pessimistic lower bound on the unclipped objective, so several epochs of minibatch updates on one batch become workable [^6].
- **Continuous actions:** a diagonal Gaussian policy outputs means $\mu_\theta(s)$ and often keeps a separate, state-independent parameter vector $\log\sigma$. It learns $\log \sigma$ rather than $\sigma$ because $\log\sigma$ may take any real value while $\sigma$ must stay positive; $\sigma = e^{\log\sigma}$ is then positive with no constraint to enforce [^7].

## Formulas

$$
\nabla_\theta J(\theta) = \mathbb{E}_{\tau \sim \pi_\theta}\Big[\sum_{t} \nabla_\theta \log \pi_\theta(a_t \mid s_t)\, \Phi_t\Big], \qquad \theta \leftarrow \theta + \alpha \nabla_\theta J(\theta)
$$

Valid weights $\Phi_t$ with the same expectation [^3]: $R(\tau)$, the reward-to-go $\hat R_t = \sum_{t' \ge t} r_{t'}$, $\hat R_t - b(s_t)$, $Q^\pi(s_t, a_t)$, $A^\pi(s_t, a_t)$.

$$
\delta_t = r_t + \gamma V(s_{t+1}) - V(s_t), \qquad \hat A_t^{\text{GAE}} = \sum_{l \ge 0} (\gamma\lambda)^l\, \delta_{t+l}
$$

$$
L^{\text{CLIP}}(\theta) = \hat{\mathbb{E}}_t\big[\min\big(r_t(\theta)\hat A_t,\ \operatorname{clip}(r_t(\theta), 1 - \epsilon, 1 + \epsilon)\hat A_t\big)\big], \qquad r_t(\theta) = \frac{\pi_\theta(a_t \mid s_t)}{\pi_{\theta_{\text{old}}}(a_t \mid s_t)}
$$

- Softmax policy over preferences $h$: $\nabla_h \ln \pi(a) = \text{onehot}(a) - \pi$.
- Diagonal Gaussian over $k$ dimensions: $\log \pi(a \mid s) = -\tfrac12 \big(\sum_i [(a_i - \mu_i)^2/\sigma_i^2 + 2 \log \sigma_i] + k \log 2\pi\big)$, a *sum* over dimensions [^7].

## Worked example

Softmax policy with preferences $h = (1, 0, 0)$, so $\pi \approx (0.576, 0.212, 0.212)$. The agent takes the third action and the episode returns $G = 3$; with $\alpha = 0.1$:

- $\nabla_h \ln \pi(a_3) = (0, 0, 1) - \pi = (-0.576, -0.212, 0.788)$;
- $h \leftarrow h + 0.1 \cdot 3 \cdot \nabla = (0.827, -0.064, 0.236)$, and $\pi(a_3)$ rises to $0.282$ while the actions not taken lose preference.

PPO with $\epsilon = 0.2$: for $\hat A = +2$ and ratio $r = 1.5$, $L = \min(3.0, 1.2 \cdot 2) = 2.4$, clipped, so there is no incentive to push further. For $\hat A = -2$ and $r = 1.5$, $L = \min(-3.0, -2.4) = -3.0$: the unclipped, worse value is kept.

## In code

```python
import torch
from torch.distributions import Normal
rewards = torch.tensor([1.0, 2.0, 0.0, 3.0])                  # r_0 .. r_3 of one episode
rtg = rewards.flip(0).cumsum(0).flip(0)                       # reward-to-go
mu = torch.zeros(4, 2, requires_grad=True)                    # policy means (stand-in for a net)
log_std = torch.zeros(2, requires_grad=True)                  # state-independent log sigma
acts = torch.tensor([[0.5, -1.0]] * 4)                        # the 2-D actions that were taken
logp = Normal(mu, log_std.exp()).log_prob(acts).sum(-1)       # sum over action dimensions
loss = -(logp * rtg).mean()                                   # minimising -J = gradient ascent on J
loss.backward()
print(rtg.tolist(), logp.shape)       # [6.0, 5.0, 3.0, 3.0] torch.Size([4])
print(mu.grad[0].tolist())            # [-0.75, 1.5]
```

## Common pitfalls

- Policy-gradient methods are a subset of policy-based methods, not the other way round [^1].
- Policy gradients usually find a local maximum; global convergence is not guaranteed [^2].
- A baseline that depends only on the state keeps the gradient unbiased whatever it is (it need not equal $V^\pi$), and reward-to-go likewise only removes zero-mean noise; a baseline that depends on the action does bias it [^3].
- A decreasing policy-gradient "loss" does not mean the return is improving [^3].
- `Normal(...).log_prob(act)` returns one value per action dimension; sum them (not average) to get $\log \pi(a \mid s)$ [^7].
- The critic is a learned value function trained on observed returns or TD targets; it is not the environment's reward function [^4].
- GAE's extremes are easy to swap: $\lambda = 0$ is the one-step TD error, $\lambda = 1$ the Monte Carlo advantage [^5].
- PPO is still on-policy: it reuses only the latest batch, for a few epochs, inside the clipping range [^6].
