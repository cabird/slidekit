---
title: "Conceptual Design Guide"
description: "Cognitive and rhetorical principles for structuring presentations — throughlines, progressive disclosure, assertion-evidence model"
---

**How to structure and present ideas so they land and stick.**

This section covers the cognitive and rhetorical principles behind effective presentations--not visual design, but how to think about communicating ideas.

---

### The Throughline

Every presentation must have a **throughline** expressible in 2-3 sentences. Every slide must serve that throughline.

#### Actionable Principles

- **Define the throughline before generating any slides**: What is the one argument or message that ties everything together?
- **Test every slide against it**: If a slide doesn't advance the throughline, move it to backup or cut it.
- **The throughline is not the topic**: "Machine learning for healthcare" is a topic. "Our approach reduces diagnostic errors by 40% without requiring new hardware" is a throughline.

#### Finding Your Throughline

Ask:
- What should the audience believe or do differently after this talk?
- If they remember only one thing, what must it be?
- What's the "so what?" of the entire presentation?

---

### Cognitive Load: The Bandwidth Constraint

The brain can hold only 3-4 "chunks" in working memory. Exceed this and the audience stops processing.

#### Actionable Principles

- **Define the "load budget" per slide**: What is the ONE new thing they must understand here?
- **Never ask audiences to read and listen simultaneously**: If the slide is dense, pause and let them read. If you're talking, the slide should be a visual support, not a transcript.
- **Reduce "extraneous load"**: Unexplained acronyms, dense text, unlabeled charts, decorative elements--all steal cognitive capacity from learning.
- **Turn complexity into a sequence**: Break complex concepts into a path: premise -> mechanism -> implication -> decision.

#### Planning Questions

- What does the audience already know vs. what's new?
- What must they *remember* vs. what can they *reference* later (appendix)?
- What are they doing cognitively: understanding, comparing, choosing, trusting, remembering?

---

### Progressive Disclosure: Build, Don't Dump

Complex ideas are overwhelming when presented all at once. Reveal information in the order people need it.

#### Actionable Principles

- **Start with a stable frame**: Give the "map" before the terrain (goal, problem, constraints, success criteria).
- **Reveal in dependency order**: If B depends on A, show A first--even if B is more exciting.
- **Use layering questions**:
  1. What is it?
  2. How does it work?
  3. Why does it matter?
  4. What should we do?
- **Earn detail with intent**: Don't add detail because you have it--add it because the audience has a decision to make.

#### Practical Patterns

- **Overview -> zoom-in -> zoom-out**: Show system view, focus on one part, then reconnect to outcomes.
- **Claim -> constraint -> resolution**: State what you want, acknowledge the tricky part, then show the path.
- **The "grey out" technique**: If you must show a complex diagram, grey out everything except what you're currently discussing. Shift the highlight as you progress.

#### Structure Templates by Talk Type

**Technical/Academic Talks** (most common):
> Problem you care about -> Why existing approaches fall short -> What we did -> What happened -> Why it matters

This structure is more natural for results-oriented presentations than narrative oscillation techniques.

**Leadership/Decision Presentations**:
> Recommendation -> Supporting evidence -> Tradeoffs acknowledged -> Ask

Executive audiences have low patience for buildup. Lead with the conclusion, then support it.

**Data-Heavy Presentations**:
> Headline finding -> Supporting detail -> Implications -> Decision point

Layer complexity: start with the insight, offer detail for those who want it.

---

### Concrete vs. Abstract: The Ladder of Abstraction

People understand concrete examples faster; they generalize via abstractions. Use both, deliberately.

#### Actionable Principles

- **Unfamiliar audience -> concrete first**: Start with a real scenario, then name the principle.
- **Expert but misaligned audience -> abstract first**: Start with a shared framework, then show examples.
- **The "For Example" rule**: Never go more than two slides of pure theory without a concrete illustration.
- **Traverse the ladder**: example -> pattern -> rule -> implication.

#### A Reliable Formula

- **Principle slide**: "In general, X leads to Y because Z."
- **Example slide**: "Here's X in our context."
- **Transfer slide**: "So we should do A, not B."

---

### The "So What?" Test

A slide is a unit of argument, not a unit of information. Every slide should change what the audience knows, believes, or is willing to do.

#### Actionable Principles

- **Write each slide's job as a verb phrase**: convince, explain, compare, de-risk, decide, align.
- **If the job is just "inform," it's too weak**: "Inform" should become: clarify uncertainty, resolve debate, justify choice, show tradeoffs.
- **One slide, one move**: Each slide advances one step of logic or narrative.

#### Gate Questions

Before including a slide, ask:
- If I remove this slide, what breaks?
- What question does this slide answer?
- What decision does this enable?
- What misconception does it prevent?

#### Content Selection Criteria

Include content only if it meets at least one of these criteria:
1. **Advances the narrative** (moves the throughline forward)
2. **Supports the core claim** (provides evidence)
3. **Enables a decision or insight** (actionable)
4. **Establishes credibility or reproducibility** (for technical audiences)

The fourth criterion is critical for technical and academic contexts: audiences need to trust your methodology. Some content exists to preempt "but did you control for X?" Don't cut it--present it efficiently or hold it for backup slides.

Remove all content failing all four criteria. Simplicity means finding the essential core, not removing nuance.

---

### Assertion-Evidence Model

Titles should be complete, falsifiable statements. The body provides evidence that makes the claim credible.

#### Actionable Principles

- **Use assertion headlines**: Not "Market Trends" but "Demand is shifting to X, making Y our fastest path."
- **Make the claim testable**: If someone can't disagree with it, it's probably vague.
- **Visual proof**: The body of the slide serves ONLY to prove the assertion--charts, code snippets, diagrams. No bullet point lists restating what the headline says.
- **Pre-empt the obvious objection**: A great evidence slide answers the first skeptical question the audience will ask.

#### The Headline Audit

Read ONLY the headlines of your deck in sequence. Do they form a coherent argument? If not, rewrite them until they do.

#### Align Evidence to Claim Type

| Claim Type | Evidence Needed |
|------------|-----------------|
| **Causal** | Mechanism + data + controls |
| **Comparative** | Side-by-side criteria + measurement |
| **Predictive** | Assumptions + model + sensitivity |
| **Risk** | Likelihood/impact + mitigations + triggers |

#### Results Slides: Lead with the Takeaway

Results slides should lead with the insight, not the setup:
- **Good**: "Our method reduces error by 40%"
- **Bad**: "Table 3 shows the results of our experiment"

The audience should know what to conclude before they see the data. The data then serves as proof.

#### Data Insight-First

Answer "so what?" before showing data. Find the insight first, then design the visual to make that insight unmissable. Context and comparison turn numbers into argument.

Never show a chart without first knowing and stating what the audience should take away from it.

---

### Signposting and Callbacks

Audiences constantly ask: Where are we? Why are we here? What's next? Your deck should answer automatically.

#### Actionable Principles

- **Install a "narrative spine"**: 3-5 sections that everything hangs on.
- **Use explicit transitions**: "We've established X. Now we'll examine Y. Then we'll decide Z."
- **Callback to earlier anchors**: Reuse key terms and frames so the audience doesn't re-learn labels.
- **Close loops**: If you pose a question early, visibly answer it later.

#### Practical Mechanisms

- **"Agenda as argument"**: Show logic steps, not just topics.
- **"You are here"**: Subtle section marker or recurring header.
- **"Recall"**: "Remember our constraint is latency--this option fails that constraint."
- **Verbal callbacks**: Link current points to previous ones to reinforce the mental model.

---

### The Curse of Knowledge

Once you know something, it's hard to imagine not knowing it. This leads to undefined acronyms, assumed context, and compressed reasoning.

#### Actionable Principles

- **Assume missing primitives**: Non-experts lack the basic building blocks you take for granted.
- **Make hidden steps visible**: What's "obvious" to you needs to be spelled out.
- **Translate jargon to decisions**: Replace technical terms with what they change operationally.
- **Define early**: Create a glossary slide or define acronyms on first use.
- **Use analogy bridges**: Map complex concepts to everyday experiences ("Think of the load balancer like a traffic cop...").

#### The Test

Can a smart outsider restate your point in their own words without using your terminology? If not, you haven't taught the model--only the vocabulary.

---

### Emotional Anchors

Emotion isn't decoration--it's prioritization. It signals what matters, increases attention, and improves recall.

#### Actionable Principles

- **Define stakes early**: What happens if we do nothing? What do we gain if we act?
- **Use tension as a question**: "We can hit growth, but not with current retention--why?" Then answer it.
- **Humanize with a protagonist**: A customer, user, or team member who experiences the problem.
- **Show consequence, not just process**: Replace "We changed X" with "This removes Y failure mode."
- **Every story needs a villain**: It doesn't have to be a person--it can be "Complexity," "Latency," or "Legacy Code." Rally the audience against this common enemy.

#### Micro-Structure for Business/Technical Decks

Even one sentence per part is enough:

**Context -> Friction -> Consequence -> Insight -> Action**

---

### The Rule of Three

Three is cognitively digestible and rhetorically satisfying. It creates a complete shape: beginning-middle-end, or problem-solution-impact.

#### Actionable Principles

- **Use 3 as the top-level structure**: Three pillars, three reasons, three steps.
- **Nest complexity below**: If you have 9 things, present as 3 categories x 3 items.
- **Make the three parallel**: Same grammatical structure and level of abstraction.
- **Avoid laundry lists**: If you have 5 points, two are probably subordinate details--move them under the best three.

#### Classic Triads

- Past, Present, Future
- Problem, Solution, Impact
- Fast, Cheap, Good (pick two)
- What, So What, Now What

#### When Not to Use It

When the decision truly requires a full set of criteria (e.g., compliance checklists). In that case, keep the main narrative at 3, and put the checklist in backup.

---

### Memory and Retention

People remember what comes first (primacy), what comes last (recency), and what stands out (distinctiveness).

#### Actionable Principles

- **Open with a knowledge gap**: Start with something the audience thinks they know that is wrong, incomplete, or more interesting than expected. Surprise sustains attention. This is more effective than "Agenda" or "About Me."
- **Use primacy intentionally**: Don't waste the opening on logistics. Start with a hook or the core problem.
- **Use recency to drive action**: Don't end on a Q&A slide. After Q&A, show one final slide with the core message and call to action.
- **Create distinctiveness**: One memorable phrase, metaphor, or metric that becomes shorthand for the concept.
- **The Von Restorff effect**: Make one slide dramatically different (black slide with one word in an otherwise white deck) to anchor a key point.
- **Engineer retrieval moments**: Periodically synthesize: "So what are the three takeaways so far?"

#### Repetition Without Redundancy

Repetition works when it's *re-encoded* in a new way: same idea, different angle.
- Summary -> Example -> Decision
- End major sections with a 1-slide synthesis: claim + 3 bullets + implication

---

### Planning Workflow: Deck-First, Slide-Second

1. **Define the decision and audience**
   - What do you want them to believe/do afterward?
   - What do they already believe? What are they skeptical about?

2. **Write the argument as 3-5 claims** (rule of three + signposting)
   - Each claim becomes a section with progressive disclosure.

3. **For each claim, create an assertion-evidence pair**
   - Claim headline + strongest proof + pre-empt objection.

4. **Run the "so what?" test slide by slide**
   - If it doesn't advance the argument, move to appendix or cut.

5. **Add cognitive supports**
   - Definitions where needed, transitions, callbacks, and a final synthesis.

---

### Summary: Conceptual Non-Negotiables

1. **Define the throughline first** (2-3 sentences that every slide serves)
2. **Every slide answers "so what?"** (if you can't say the job, cut the slide)
3. **Headlines are assertions** (not topic labels)
4. **Results lead with takeaways** ("reduces error by 40%", not "Table 3 shows...")
5. **Concrete before abstract** (examples ground theory)
6. **Build complexity progressively** (don't dump everything at once)
7. **Three is the magic number** (for top-level structure)
8. **Open with a knowledge gap** (surprise sustains attention)
9. **Prepare backup slides** (for predictable objections, not main flow)
10. **Close every loop you open** (don't leave questions hanging)

**The goal**: The audience should be able to reconstruct your argument from memory an hour later.

---

### Backup Slides Strategy

Anticipate "reviewer-brain" in technical and academic audiences. People will look for methodological holes, edge cases, and objections.

#### Actionable Principles

- **Don't clutter the main flow**: If content is defensive rather than advancing the argument, move it to backup.
- **Prepare for predictable objections**: "What about X?" "Did you control for Y?" "How does this compare to Z?"
- **Backup slides are not waste**: They show preparation and depth. Reference them confidently: "I have a slide on that if we want to go deeper."
- **Organize backups by likely question**: Group them so you can navigate quickly during Q&A.

---

### Talk-Type Considerations

#### Academic Conference Talks (12-20 min)

- You cannot present the whole paper. Pick the ONE contribution that matters most and build around it.
- The related work slide is a credibility move, not a narrative one. Keep it brief, show you know the field, position your contribution relative to it.
- Results slides lead with takeaways, not table labels.
- Live demos and code are high-risk, high-reward. Have video or screenshot backups.

#### Technical/Research Presentations to Leadership

- Lead with the recommendation or key finding, then support it. Executives have low patience for buildup.
- Make decision points explicit. What do you need from them?
- Frame in terms of business/org impact, not just technical achievement.
- Anticipate "so what does this mean for us?" at every slide.

#### Data-Heavy / Analytical Presentations

- The "so what?" rule is paramount. Never show a chart without knowing and stating the insight.
- Layer complexity: headline finding -> supporting detail -> implications.
- Consider progressive disclosure: build complex charts in stages across slides.
- Annotation is your primary tool. Label the data point that matters. Draw the eye to the story in the data.

---
