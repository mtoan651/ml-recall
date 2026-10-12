---
topic: ai-intro
summary: What AI is (weak vs strong, symbolic vs neural, rational agents), the Turing test and its critics, task environments and agent types, and the main eras of AI history.
status: reviewed
reviewed_by: claude
references:
  - source: ms-ai-for-beginners
    url: https://github.com/microsoft/AI-For-Beginners/blob/392d0df1b2647cbee104942390551f1ed9e072c8/lessons/1-Intro/README.md
    locator: 'Lesson 1 Introduction to AI: Weak AI vs. Strong AI; Different Approaches to AI; Recent AI Research'
  - title: 'Wikipedia: Turing test'
    url: https://en.wikipedia.org/wiki/Turing_test
    locator: History (The Chinese room); Weaknesses (Human intelligence vs. intelligence in general; Impracticality and irrelevance)
  - title: 'Wikipedia: Intelligent agent'
    url: https://en.wikipedia.org/wiki/Intelligent_agent
    locator: Agent-based definition of artificial intelligence; Russell and Norvig's classification
  - title: 'Wikipedia: Multi-agent system'
    url: https://en.wikipedia.org/wiki/Multi-agent_system
    locator: Concept (properties of environments)
  - title: 'Wikipedia: History of artificial intelligence'
    url: https://en.wikipedia.org/wiki/History_of_artificial_intelligence
    locator: Dartmouth Workshop; Micro-worlds; Perceptrons and early neural networks; First AI winter (1974–1980) incl. Problems; MIT's "anti-logic" approach; Revival of neural networks ("connectionism"); Second AI winter (AI winter); Deep learning
  - title: 'Wikipedia: Physical symbol system'
    url: https://en.wikipedia.org/wiki/Physical_symbol_system
    locator: Introduction (statement of the hypothesis); Evidence against the hypothesis
---
## Key ideas

**Weak vs strong AI.** *Weak (narrow) AI* is built for one task or a narrow family of tasks
(a spam filter, a chess engine, a chatbot). *Strong AI* or AGI would handle any intellectual task a
human can; no such system exists yet [^1].

**Two approaches** [^1]:

- **Top-down (symbolic reasoning):** extract knowledge and rules from experts and encode them
  (logic, expert systems). Struggles with tasks that resist explicit rules, such as guessing a
  person's age from a photo.
- **Bottom-up (neural / connectionist):** model the brain with networks of simple neurons that
  learn from examples. Deep learning is the branch of machine learning that stacks many such
  layers to learn representations.

**Defining intelligence.**

- The **Turing test** asks whether a judge chatting by text can tell the machine from a person.
  Criticisms: it tests *human-likeness*, not intelligence — a machine must also fake human
  weaknesses (typing errors), and a superhuman machine would have to hide its abilities; Russell
  and Norvig compare it to defining aeronautics as building machines that fool pigeons [^2].
- **Searle's Chinese room** does *not* claim a program cannot answer like a native speaker; it
  claims that producing the right answers by symbol manipulation would not show understanding [^2].
- The textbook definition used in most courses is **acting rationally**: an agent perceives its
  environment and chooses the action *expected* to maximise its performance measure, given its
  percepts and knowledge [^3]. Rationality is judged by the expected outcome, not by luck: a
  well-informed decision that ends badly is still rational.

**Agents and task environments.** An agent senses through **sensors** and acts through
**actuators** [^3]; a PEAS description lists Performance measure, Environment, Actuators, Sensors
(for an automated taxi: safe, fast, legal trips; roads and traffic; steering, brakes, horn;
cameras, GPS, speedometer). Actuators are the agent's outputs, sensors its inputs. Environments
are classified along these dimensions [^4]:

| Dimension | One end | Other end |
| --- | --- | --- |
| Observability | fully observable (chess board) | partially observable (hidden cards, unseen traffic) |
| Effects | deterministic (same action, same state → same next state) | stochastic (dice, other drivers) |
| Episodes | episodic (each decision independent, e.g. checking parts on a conveyor) | sequential (moves affect the future) |
| Change | static (crossword) | dynamic (traffic) |
| States/actions | discrete (chess moves) | continuous (steering angle) |
| Agents | single-agent (crossword) | multi-agent (chess, driving) |

A deterministic environment can still be uncertain if it is only partially observable.

**Agent designs** (Russell & Norvig) [^3]:

| Type | Decides by | Example |
| --- | --- | --- |
| Simple reflex | condition–action rules on the current percept | thermostat |
| Model-based reflex | rules plus an internal state of the unseen world | driver aid that tracks a car now hidden behind a truck |
| Goal-based | search/planning towards a goal state | route finder |
| Utility-based | maximising expected utility, trading off several criteria | taxi weighing speed, safety, comfort and fare |
| Learning | improves itself: performance element acts, **critic** scores behaviour against a fixed standard, learning element changes the agent, problem generator suggests exploration | — |

Simple reflex agents fail in partially observable worlds (they can loop forever); adding memory
(a model) fixes this [^3].

## Formulas

The rational choice is the action with the highest expected performance:

$$
a^* = \operatorname*{arg\,max}_{a} \; \mathbb{E}\left[\,U(\text{outcome}) \mid a, \text{percepts}, \text{knowledge}\right]
$$

## Worked example

**Classify an automated taxi's environment.** Its cameras cannot see round corners → *partially
observable*; other drivers and the weather make outcomes uncertain → *stochastic*; each manoeuvre
changes the later situation → *sequential*; traffic moves while it decides → *dynamic*; speed and
steering vary smoothly → *continuous*; other road users act → *multi-agent*. A crossword solver is
the opposite on almost every axis: fully observable, deterministic, static, discrete,
single-agent — but still sequential, since each filled word constrains the next.

## Common pitfalls

- **Weak AI ≠ "bad AI".** Weak means narrow (one task); "solves many tasks" describes strong AI.
- **Passing the Turing test ≠ intelligence.** Fooling some users shows human-likeness of the
  replies; the test also penalises machines that are smarter than people [^2].
- **Chinese room is about understanding, not ability**: Searle grants the program answers
  perfectly [^2].
- **Rational ≠ successful.** Judge a decision by what was expected given the available
  information, not by the actual result [^3].
- **History dates.** John McCarthy introduced the term "artificial intelligence" for the 1956
  Dartmouth workshop (1950s, not 1940s or 1960s); its 1955 proposal conjectured that every
  feature of intelligence can be described precisely enough for a machine to simulate it [^5].
  The first **AI winter** was in the **1970s (1974–1980)**: limited compute, combinatorial
  explosion, overpromising, and the discovery that perception and movement — easy for people —
  are the hardest to program (**Moravec's paradox**) [^5].
- **Other history traps** [^5]: SHRDLU worked in the **blocks world**, a micro-world of blocks to
  stack; "scruffy" labs hacked programs until they worked while "neat" labs relied on formal logic;
  Minsky and Papert's *Perceptrons* (1969) showed single-layer limits, but multi-layer networks
  trained with **backpropagation** (popularised 1986) revived the field; expert systems such as
  R1/XCON were abandoned because they were costly to maintain, could not learn and were brittle;
  deep learning took off around 2012 (AlexNet on ImageNet) thanks to large labelled datasets and
  fast hardware [^1][^5].
- **Physical symbol system hypothesis**: "necessary" means human thinking itself must be symbol
  manipulation; "sufficient" means a machine with the right symbol system can be intelligent [^6].
