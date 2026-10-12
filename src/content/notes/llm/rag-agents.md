---
topic: rag-agents
summary: Giving an LLM outside knowledge and the ability to act — retrieval-augmented generation, tool calling, the agent loop, MCP hosts, clients and servers, and how agents are observed and evaluated.
status: reviewed
reviewed_by: claude
references:
  - source: hf-agents-course
    url: https://huggingface.co/learn/agents-course/unit2/smolagents/retrieval_agents
    locator: Unit 2.1, Building Agentic RAG Systems (introduction, Enhanced Retrieval Capabilities)
  - source: hf-agents-course
    url: https://huggingface.co/learn/agents-course/unit1/tools
    locator: Unit 1, What are Tools? (How do tools work?, How do we give tools to an LLM?)
  - source: hf-agents-course
    url: https://huggingface.co/learn/agents-course/unit1/actions
    locator: Unit 1, Actions (Types of Agent Actions, The Stop and Parse Approach, Code Agents)
  - title: 'Model Context Protocol Specification (2025-06-18): Architecture'
    url: https://modelcontextprotocol.io/specification/2025-06-18/architecture
    locator: Core Components (Host, Clients, Servers)
  - title: 'Model Context Protocol Specification (2025-06-18): Server Features Overview'
    url: https://modelcontextprotocol.io/specification/2025-06-18/server
    locator: Overview (control hierarchy of Prompts, Resources, Tools)
  - source: hf-agents-course
    url: https://huggingface.co/learn/agents-course/bonus-unit2/what-is-agent-observability-and-evaluation
    locator: Bonus Unit 2, AI Agent Observability and Evaluation (Traces and Spans, Key Metrics, Offline and Online Evaluation)
  - title: 'Yao et al. (2022), ReAct: Synergizing Reasoning and Acting in Language Models'
    url: https://arxiv.org/abs/2210.03629
    locator: 'Sec. 2 ReAct: Synergizing Reasoning + Acting (Figure 1: Thought, Act, Obs trajectories)'
  - title: 'Wikipedia: Evaluation measures (information retrieval)'
    url: https://en.wikipedia.org/wiki/Evaluation_measures_(information_retrieval)
    locator: Offline metrics (Precision, Recall, Precision at k, Average precision, Mean average precision)
---
## Key ideas

- **RAG** [^1]. A *retriever* searches your data for passages relevant to the query, and a
  *generator* (the LLM) answers from the query plus those passages. Pipeline: split documents
  into chunks → index them (a keyword index such as BM25, or vector embeddings) → retrieve the
  top-$k$ chunks for the question → put them in the prompt → generate. The model's weights
  never change, so updating the documents updates the answers.
- **RAG vs. fine-tuning vs. prompting.** Fresh, private or frequently changing facts → RAG.
  A stable style, format or task pattern → fine-tuning. Better instructions alone cannot
  supply facts the model never saw.
- **Agentic RAG** [^1]. Traditional RAG retrieves once, by direct similarity to the user's
  query, and can miss information. An agent can reformulate or decompose the query, critique
  what it retrieved and search again, with retrieval as one tool among others.
- **Agents** combine an LLM "brain" that reasons and plans with tools that act on an
  environment. An LLM only reads and writes text, so it cannot call a tool itself: it writes a
  tool call (name and arguments), the agent framework parses and runs it, and the result is
  appended to the conversation as an observation [^2]. The model writes a thought, then an
  action (`Thought: … Action: {…}`) [^3], reads the observation, and repeats this
  Thought → Action → Observation loop until it can give a final answer; interleaving reasoning
  traces with actions in this way is the ReAct pattern [^7].
- **Tool descriptions** [^2]. The model sees each tool only as text in the system prompt: name,
  what it does, typed inputs and output. Frameworks generate this from the function's name,
  type hints and docstring; the implementation itself is not shown.
- **Action formats** [^3]. A JSON agent emits one action as JSON; a code agent writes a code
  block that is executed, so one action can combine several tool calls with variables, loops
  and conditionals. Either way the LLM must stop generating after the action so the framework
  can parse it ("stop and parse"). Running generated code is a security risk and needs a
  sandbox.
- **MCP** (Model Context Protocol) is a shared client–host–server protocol that connects AI
  applications to external tools and data [^4]. The *host* is the user-facing application (chat app, IDE); it creates one
  *client* per connection, each with a 1:1 session to one *server*; servers expose resources,
  tools and prompts, and messages use JSON-RPC [^4]. Control differs by primitive [^5]: *prompts* are
  user-controlled templates (slash commands), *resources* are application-controlled context
  (file contents, git history), *tools* are model-controlled functions that take actions.
- **Observability** [^6]: a *trace* is one whole agent task, *spans* are its steps (an LLM
  call, a tool call). Common metrics: latency, cost, errors, user feedback, accuracy and
  automated scores. Frameworks such as smolagents export them via the OpenTelemetry standard.
- **Evaluation** [^6]. *Offline*: curated test sets with ground truth, repeatable, e.g. in
  CI. *Online*: monitoring real user interactions in production, which reveals drift and
  unexpected queries. The two complement each other.
- **Safety.** Text from web pages, documents or tool outputs is data, not instructions
  (indirect prompt injection). Read-only steps can run autonomously; actions with
  consequences (sign-in, messages, payments) need explicit user approval, which the MCP host
  is responsible for enforcing [^4].

## Formulas

- Retrieval score: cosine similarity
  $\cos(\mathbf{q}, \mathbf{d}) = \frac{\mathbf{q}^\top\mathbf{d}}{\lVert\mathbf{q}\rVert\,\lVert\mathbf{d}\rVert}$;
  return the top-$k$ chunks.
- Retrieval quality [^8]: precision@$k$ = relevant in top $k$ / $k$; recall@$k$ = relevant in
  top $k$ / all relevant. Average precision (AP) averages the precision at the rank of each
  relevant document, counting relevant documents never retrieved as 0; MAP is the mean of AP
  over queries.
- Integrations: $M$ applications × $N$ tools need $M \cdot N$ custom connectors without a
  standard, but only $M + N$ implementations with MCP (each app a client side, each tool a
  server).

## Worked example

- Ranked results with relevance $(1, 0, 1, 0, 0)$ and 3 relevant documents in total:
  $P@1 = 1$, $P@3 = 2/3$, $R@3 = 2/3$, $P@5 = 0.4$, and
  $\mathrm{AP} = (1 + 2/3 + 0)/3 \approx 0.556$.
- 4 applications and 6 tools: $4 \times 6 = 24$ custom integrations vs. $4 + 6 = 10$ MCP
  implementations. An IDE connected to GitHub, a database and web search runs 3 MCP clients.

## In code

```python
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

chunks = ["Refunds are possible within 30 days of purchase.",
          "Shipping to Taiwan takes 5 to 7 business days.",
          "Gift cards cannot be refunded or exchanged."]
query = "Are refunds possible after 40 days?"
vec = TfidfVectorizer(stop_words="english").fit(chunks)    # index the knowledge base
C, q = vec.transform(chunks).toarray(), vec.transform([query]).toarray()[0]
scores = C @ q                                             # rows are L2-normalized: cosine
top = np.argsort(-scores)[:2]                              # retrieve the top-k = 2 chunks
prompt = "Answer from the context only.\n" + "\n".join(chunks[i] for i in top) + "\nQ: " + query
print(scores.round(2), top)                                # [0.75 0.17 0.  ] [0 1]
```

The prompt now starts with the refund rule; the LLM answers from it. Exact keyword matching is
brittle: for "Can I get a refund after 40 days?" only "days" matches ("refund" ≠ "refunds"),
so the refund and shipping chunks tie at 0.355. Dense embeddings or stemming close this gap.

## Common pitfalls

- RAG does not retrain or fine-tune the model; retrieved text goes into the prompt at query
  time.
- The retriever finds passages; the generator writes the answer. A retriever alone returns
  chunks and scores, not an answer.
- The LLM never executes a tool; the application does, then feeds back the result.
- An agent is defined by acting on its environment through tools; a chatbot that only answers
  questions, or a fixed-rule calculator, is not one.
- One MCP client per server: a host connected to three servers runs three clients.
- Resource vs. tool: read-only context chosen by the application is a resource; an action the
  model decides to invoke is a tool.
- Offline evaluation (known answers) ≠ online evaluation (live traffic, A/B tests) ≠
  observability (collecting logs, metrics, traces).
- Instructions found in retrieved pages are untrusted content, never commands.
