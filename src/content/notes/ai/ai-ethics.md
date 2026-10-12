---
topic: ai-ethics
summary: Responsible AI — Microsoft's six principles, data-ethics challenges, kinds of harm and bias across the ML life cycle, and group fairness metrics such as demographic parity and equal opportunity.
status: reviewed
reviewed_by: claude
references:
  - source: ms-ai-for-beginners
    url: https://github.com/microsoft/AI-For-Beginners/blob/392d0df1b2647cbee104942390551f1ed9e072c8/lessons/7-Ethics/README.md
    locator: 'Lesson: Ethical and Responsible AI — introduction; Principles of Responsible AI'
  - source: ms-ml-for-beginners
    url: https://github.com/microsoft/ML-For-Beginners/blob/de2d4e12236445198213a0711855e348e7253cd4/1-Introduction/3-fairness/README.md
    locator: 'Lesson: Building ML solutions with responsible AI — Fairness; Accountability; Impact assessment'
  - source: ms-ds-for-beginners
    url: https://github.com/microsoft/Data-Science-For-Beginners/blob/4d2ac427ad6f022e73a75c4f46a28bbb7978ec3f/1-Introduction/02-ethics/README.md
    locator: 'Lesson 2: Introduction to Data Ethics — Basic Definitions; 1. Ethics Principles; 2. Ethics Challenges; Applied Ethics'
  - source: google-mlcc
    url: https://developers.google.com/machine-learning/crash-course/fairness/types-of-bias
    locator: 'Fairness: Types of bias'
  - title: Suresh & Guttag, A Framework for Understanding Sources of Harm throughout the Machine Learning Life Cycle (EAAMO 2021)
    url: https://arxiv.org/abs/1901.10002
    locator: Sec. 3, subsections 3.1 Historical Bias to 3.7 Deployment Bias (incl. 3.6.1 commercial facial analysis tools)
  - source: google-mlcc
    url: https://developers.google.com/machine-learning/crash-course/fairness/equality-of-opportunity
    locator: 'Fairness: Equality of opportunity'
  - source: google-mlcc
    url: https://developers.google.com/machine-learning/crash-course/fairness/counterfactual-fairness
    locator: 'Fairness: Counterfactual fairness (incl. Summary)'
  - source: google-mlcc
    url: https://developers.google.com/machine-learning/crash-course/fairness/mitigating-bias
    locator: 'Fairness: Mitigating bias — Augmenting the training data; Adjusting the model''s optimization function'
---
## Key ideas

**Why principles?** AI is a powerful tool that can be misused, by accident (a biased model) or on
purpose, so it needs guiding principles even though it is "just" matrix arithmetic [^1].

**Microsoft's six principles of responsible AI** [^1][^2]:

| Principle | Core question |
| --- | --- |
| Fairness | Does the model treat groups equally? Balance the data, check for bias. |
| Reliability & safety | Models err (finite precision and recall); understand errors to avoid harm. |
| Privacy & security | Training data become part of the model; protect and track it. |
| Inclusiveness | AI should augment people, not replace them, and include under-represented groups. |
| Transparency | People should know when AI is used; prefer interpretable systems. |
| Accountability | A human stays in the loop and takes responsibility for decisions. |

Transparency favours interpretable systems [^1] — e.g. a rule-based expert system, whose
reasoning can be traced, rather than a black-box neural network.

**Data ethics** [^3]. *Ethics* = shared moral values; *data ethics* studies moral problems around
data **and algorithms**; *applied ethics* checks real products and processes and corrects them.
*Principles* are values an organisation adopts voluntarily; *regulations* are laws (GDPR, HIPAA,
CCPA). *Challenges* are situations where actions may conflict with principles: data ownership,
**informed consent**, intellectual property and privacy (these arise when collecting data);
dataset bias, data quality, algorithm fairness and misrepresentation (these arise in algorithm
design); also the right to be forgotten and free choice. Practices: professional codes of
conduct, ethics checklists (e.g. Deon), compliance with regulations, an ethics culture [^3].

**Harms.** "Unfairness" means negative impacts on a group [^2]: **allocation** (resources or
opportunities withheld), **quality of service** (works worse for some groups), **stereotyping**,
**denigration**, **over- or under-representation**. Unfairness often arises without any intent
to discriminate: human biases slip into the data unnoticed [^2].

**Where bias comes from.** Bias can enter through the data, the training objective, or a
pretrained model the system was fine-tuned from. Suresh and Guttag map seven sources onto the ML
life cycle [^5]:

| Bias | Arises when… | Example from the paper |
| --- | --- | --- |
| Historical | the world itself is unequal, even with perfect measurement and sampling | word embeddings echoing gender stereotypes |
| Representation | the development sample under-represents part of the population | image datasets drawn mostly from a few countries |
| Measurement | features or labels are poor or uneven proxies | arrests used as a proxy for crime |
| Aggregation | one model is forced onto groups that differ | a general Twitter model applied to a community with its own slang and emoji meanings |
| Learning | modelling choices amplify performance gaps | optimising for compactness or privacy |
| Evaluation | the benchmark does not represent the users | face benchmarks with few darker-skinned women |
| Deployment | the system is used differently than intended | crime-risk scores used "off-label" to set sentence length |

Gender Shades found commercial gender classifiers erred most on darker-skinned women, partly
because benchmarks barely contained them [^5]. Human biases from Google's list [^4]: *reporting*
(data over-record unusual events), *automation* (trusting the machine), *selection* (coverage,
non-response, sampling), *group attribution* (**in-group** favouritism, out-group homogeneity),
*implicit*, **confirmation** (reading data to fit your beliefs), *experimenter's* (retraining until
the model agrees).

**Group fairness metrics** (binary classifier, groups A and B):

- **Demographic parity**: equal positive-prediction (acceptance) rate in each group [^6].
- **Equality of opportunity**: equal true positive rate — qualified people are accepted at the
  same rate in each group [^6].
- **Equalized odds**: equal success rates for both labels, i.e. equal TPR *and* equal FPR [^6].
- **Counterfactual fairness**: two examples identical in every feature except the sensitive
  attribute must get the same prediction [^7]. It compares individual pairs, so it needs group
  labels only for those pairs, and only pairs from *different* groups are relevant.

Some fairness definitions are mutually incompatible [^7], yet a model can satisfy demographic
parity and equality of opportunity at once [^6]. Assess fairness by listing the possible harms and
the affected groups, then defining metrics and comparing them across groups [^2]. Mitigate by
collecting more data — only if it is more representative, since data with the same imbalance does
not help — or by changing the training loss [^8]: **MinDiff** penalises differences between the
*distributions* of predictions of two slices; **counterfactual logit pairing (CLP)** penalises
different predictions for *pairs* of examples that differ only in the sensitive attribute [^8].

**Generative AI** adds harms to measure and mitigate: hallucinated facts, biased or hateful
output, help with illegal acts. Whoever can edit the training data can poison it (e.g. flip some
labels), so control and audit who may change it and where it came from.

## Formulas

$$
\text{TPR}_g=\frac{TP_g}{TP_g+FN_g},\qquad \text{acceptance rate}_g=\frac{TP_g+FP_g}{N_g}
$$

## Worked example

200 applicants per group. Group A: 100 qualified, 80 of them approved; 20 of 100 unqualified
approved. Group B: 50 qualified, 40 approved; 60 of 150 unqualified approved.

- Acceptance rate: A $100/200=50\%$, B $100/200=50\%$ → demographic parity holds.
- TPR: A $80/100=80\%$, B $40/50=80\%$ → equality of opportunity holds.
- FPR: A $20\%$, B $60/150=40\%$ → equalized odds fails; accuracy is 80% vs 65%.

## Common pitfalls

- **Unfair ≠ intentional**: bias usually enters through data and design choices [^2].
- **Dropping the sensitive column does not guarantee fairness**: other features (postcode, name,
  missing-data patterns) can act as proxies.
- **Missing data is not harmless** unless it is missing at random: if values are missing more
  often for some subgroup (an age band, a region), the model learns less about exactly that group.
- **Principle vs challenge vs regulation**: informed consent is a *challenge*; GDPR is a
  *regulation*; fairness is a *principle* [^3].
- **Reliability & safety** (not transparency) is the principle about understanding a model's
  errors; **accountability** is about a responsible human [^1].
- **Demographic parity and equal opportunity are not mutually exclusive** [^6].
- **Raw likelihood comparisons mislead**: a language model prefers frequent words, so sentence
  probabilities differ even without social bias.
