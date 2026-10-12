---
topic: alignment
summary: Steering a pretrained LLM toward preferred behaviour and better reasoning — RLHF (reward model, PPO, KL penalty), DPO, reward hacking, GRPO and DeepSeek-R1, and self-consistency.
status: reviewed
reviewed_by: claude
references:
  - source: hf-llm-course
    url: https://huggingface.co/learn/llm-course/chapter12/2
    locator: Ch. 12, Introduction to Reinforcement Learning and its Role in LLMs (What is RL?, RLHF)
  - title: 'Ouyang et al. (2022), Training language models to follow instructions with human feedback (InstructGPT)'
    url: https://arxiv.org/abs/2203.02155
    locator: Sec. 3.1 High-level methodology, 3.5 Models (Reward modeling, Reinforcement learning)
  - title: 'Gao, Schulman & Hilton (2022), Scaling Laws for Reward Model Overoptimization'
    url: https://arxiv.org/abs/2210.10760
    locator: Sec. 1 Introduction, 2 Methodology (synthetic gold reward model setup)
  - title: 'Rafailov et al. (2023), Direct Preference Optimization: Your Language Model is Secretly a Reward Model'
    url: https://arxiv.org/abs/2305.18290
    locator: Sec. 3 Preliminaries, 4 Direct Preference Optimization
  - title: 'DeepSeek-AI (2025), DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning'
    url: https://arxiv.org/abs/2501.12948
    locator: Sec. 2 DeepSeek-R1-Zero (2.1 GRPO, 2.2 Reward Design), 3 DeepSeek-R1
  - title: 'Wang et al. (2023), Self-Consistency Improves Chain of Thought Reasoning in Language Models'
    url: https://arxiv.org/abs/2203.11171
    locator: Sec. 2 Self-Consistency over Diverse Reasoning Paths
  - title: 'Wikipedia: Reward hacking'
    url: https://en.wikipedia.org/wiki/Reward_hacking
    locator: Reward hacking in modern language models (length bias, sycophancy, modifying test code)
  - title: 'Bai et al. (2022), Constitutional AI: Harmlessness from AI Feedback'
    url: https://arxiv.org/abs/2212.08073
    locator: Abstract; Sec. 3 Critiques, Revisions, and Supervised Learning; Sec. 4 Reinforcement Learning from AI Feedback
---
## Key ideas

- **Why align?** Next-token pretraining makes a model fluent, not necessarily helpful or
  harmless [^1]. RL vocabulary for LLMs [^1]: the *agent* is the LLM itself, an *action* is
  generating text (words, a chosen answer, a reply), the *reward* is usually a number scoring
  how helpful, truthful or harmless the response is, and the *policy* is the agent's strategy,
  updated to earn more reward. Reading the prompt is observing the state, and the weight
  update is learning, not an action.
- **RLHF, InstructGPT recipe** [^2]:
  1. *SFT*: fine-tune GPT-3 on labeler-written demonstrations (supervised).
  2. *Reward model (RM)*: labelers rank $K = 4$ to $9$ outputs per prompt, giving
     $\binom{K}{2}$ pairwise comparisons; a model with a scalar head learns to predict which
     output is preferred.
  3. *RL*: optimize the SFT policy against the RM score with PPO. Each episode is one prompt and
     one response (a bandit), and a per-token KL penalty to the SFT model counters
     over-optimization of the RM. PPO-ptx also mixes in pretraining gradients to limit
     regressions on public NLP benchmarks.
- **The RM loss depends only on reward differences**, so adding a constant to all rewards
  changes nothing; InstructGPT therefore shifts the RM so demonstrations score 0 on average [^2].
- **Over-optimization and reward hacking.** The RM is only a proxy. Optimizing it harder first
  raises the true ("gold") reward, then lowers it while the proxy keeps rising, an instance of
  Goodhart's law [^3]. This is reward hacking: if the RM happens to favour long or agreeable
  answers, the policy becomes verbose or sycophantic; a coding agent rewarded for passing tests
  may edit the tests instead of the code [^7]. The KL term keeps the policy near the distribution
  where the RM is reliable.
- **Constitutional AI** [^8] needs no human labels of harmfulness, only a written list of
  principles: the model critiques and revises its own answers and is fine-tuned on the
  revisions, then AI-labelled comparisons train a preference model for RL (RL from AI
  feedback, RLAIF).
- **DPO** [^4] skips both the separate RM and RL. The KL-constrained RLHF objective has a
  closed-form optimal policy, so the reward can be written as
  $\beta \log \frac{\pi_\theta(y \mid x)}{\pi_{\text{ref}}(y \mid x)}$ (the *implicit reward*);
  inserting it into the Bradley–Terry likelihood gives a classification loss on stored
  preference pairs. No sampling from the policy during training, but the frozen reference
  model's log-probabilities are needed for every pair; $\beta$ controls how far the policy may
  drift from $\pi_{\text{ref}}$.
- **Reasoning via RL: DeepSeek-R1** [^5]. *R1-Zero* applies RL (GRPO) directly to the base
  model with rule-based accuracy and format rewards, no SFT first; reflection and
  re-checking emerged on their own (the "aha moment"), but outputs had poor readability and
  mixed languages. *R1* adds stages: cold-start SFT on thousands of readable long
  chain-of-thought examples → reasoning RL → rejection sampling plus another SFT round (with
  non-reasoning data) → a final RL stage for helpfulness and harmlessness.
- **GRPO** [^5] samples a group of $G$ outputs per prompt (16 for R1-Zero), scores each, and uses
  the reward normalized within the group as the advantage in a PPO-style clipped objective
  with a KL penalty to a reference policy.
- **Test-time reasoning.** Self-consistency samples several chain-of-thought paths and
  returns the majority answer instead of the single greedy path [^6].

## Formulas

- Bradley–Terry preference and RM loss [^2][^4]:
  $P(y_w \succ y_l \mid x) = \sigma\big(r(x, y_w) - r(x, y_l)\big)$,
  $\mathcal{L}_{\text{RM}} = -\log \sigma\big(r(x, y_w) - r(x, y_l)\big)$.
- InstructGPT RL objective [^2]:
  $\mathbb{E}\big[r_\theta(x, y) - \beta \log \frac{\pi^{RL}_\phi(y \mid x)}{\pi^{SFT}(y \mid x)}\big] + \gamma\, \mathbb{E}_{x \sim D_{\text{pretrain}}}\big[\log \pi^{RL}_\phi(x)\big]$
- DPO loss [^4]:

$$
\mathcal{L}_{\text{DPO}} = -\log \sigma\Big(\beta \log \frac{\pi_\theta(y_w \mid x)}{\pi_{\text{ref}}(y_w \mid x)} - \beta \log \frac{\pi_\theta(y_l \mid x)}{\pi_{\text{ref}}(y_l \mid x)}\Big)
$$

- GRPO advantage [^5]: $A_i = \dfrac{r_i - \operatorname{mean}(r_1, \dots, r_G)}{\operatorname{std}(r_1, \dots, r_G)}$.
- Self-consistency [^6]: $\hat{a} = \operatorname*{arg\,max}_a \sum_i \mathbb{1}(a_i = a)$.

## Worked example

- **RM loss.** $r(x, y_w) = 1.0$, $r(x, y_l) = 0.2$: $P(y_w \succ y_l) = \sigma(0.8) \approx 0.69$
  and the loss is $\log(1 + e^{-0.8}) \approx 0.371$; with rewards 6.0 and 5.2 it is the same.
- **DPO**, $\beta = 0.1$, summed log-probabilities: chosen $-40$ (policy) vs. $-42$ (reference),
  rejected $-60$ vs. $-57$. Implicit rewards $0.1 \cdot 2 = 0.2$ and $0.1 \cdot (-3) = -0.3$, logit
  $0.5$, loss $\log(1 + e^{-0.5}) \approx 0.474$.
- **Comparisons:** one ranking of $K = 6$ responses gives $\binom{6}{2} = 15$ pairs.
- **GRPO:** group rewards $(1, 0, 0, 1)$ have mean 0.5 and population std 0.5, so the
  advantages are $(1, -1, -1, 1)$ (with the sample std, $\pm 0.866$).

## In code

```python
import torch
import torch.nn.functional as F

def rm_loss(r_chosen, r_rejected):                     # Bradley-Terry pairwise loss
    return -F.logsigmoid(r_chosen - r_rejected)

def dpo_loss(pi_w, pi_l, ref_w, ref_l, beta=0.1):     # summed log-probs of whole responses
    return -F.logsigmoid(beta * ((pi_w - ref_w) - (pi_l - ref_l)))

t = torch.tensor
print(round(rm_loss(t(1.0), t(0.2)).item(), 3))              # 0.371
print(round(rm_loss(t(6.0), t(5.2)).item(), 3))              # 0.371: a shift changes nothing
print(round(dpo_loss(t(-40.), t(-60.), t(-42.), t(-57.)).item(), 3))  # 0.474
r = t([1.0, 0.0, 0.0, 1.0])                                  # rewards of one GRPO group
print(((r - r.mean()) / r.std(unbiased=False)).tolist())     # [1.0, -1.0, -1.0, 1.0]
```

## Common pitfalls

- The reward model is trained *before* RL on comparison data; the RL step optimizes only the
  policy.
- The KL term is subtracted: it penalizes drifting from the SFT/reference model, it does not
  reward exploration.
- In DPO, a *larger* $\beta$ keeps the policy *closer* to the reference, and the reference model
  is still needed throughout training.
- Reward hacking is a mismatch between proxy and intent, not an optimization failure such as a
  diverging loss.
- GRPO's group is several answers to the *same* prompt from one model, not an ensemble of models
  or a split of the dataset; GRPO itself predates R1 (Shao et al., 2024) [^5].
- R1-Zero and R1 start from the same base model; they differ only in post-training (pure RL vs.
  SFT + RL).
- Self-consistency votes over final answers; the single most probable path can lose.
