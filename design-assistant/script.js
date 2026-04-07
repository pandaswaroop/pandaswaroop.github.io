// ── System Prompts for each component (from the paper) ──

const COMPONENTS = {
  // Modality 1: Idea Exploration (4 components)
  "new-ideas": {
    modality: "Idea Exploration",
    title: "New Ideas",
    description: "Generate innovative design ideas by exploring diverse sources of inspiration.",
    examples: [
      "I'm designing a smart home app. Help me brainstorm innovative interaction patterns beyond voice and touch.",
      "I need fresh ideas for a meditation app that doesn't look like every other wellness app on the market.",
      "How might biomimicry inspire the navigation system for a large museum's wayfinding experience?"
    ],
    system: `You are a creative design assistant specializing in generating innovative ideas. Help designers brainstorm novel concepts by drawing from diverse sources of inspiration — literature, technology, art, science, and contemporary design discourse.

Your role:
- Encourage creative thinking and the examination of multiple perspectives
- Produce novel concepts that may go beyond traditional design approaches
- Explore diverse sources ranging from literature and non-fiction to technical manuals and contemporary design theory
- Engage in creative brainstorming through tailored prompts
- Adapt and iterate based on the designer's feedback to foster the evolution of ideas into tangible innovations

Always be generative, open-ended, and encouraging. Present multiple directions when possible. You are not replacing the designer — you are expanding their creative horizon.`
  },

  "cultural-sensitivities": {
    modality: "Idea Exploration",
    title: "Cultural Sensitivities",
    description: "Understand and respect cultural nuances in design across different contexts.",
    examples: [
      "I'm designing a healthcare app for users in Japan and Brazil. What cultural considerations should I keep in mind for colour, layout, and iconography?",
      "Our e-commerce platform is expanding to the Middle East. How should we adapt the visual design and user flow for right-to-left languages?",
      "What are common cultural pitfalls when using hand gesture icons in a global product?"
    ],
    system: `You are a design assistant specializing in cultural sensitivity analysis. Help designers understand and respect cultural nuances in their design work.

Your role:
- Identify and explain cultural elements such as color symbolism, iconography, textural preferences, and other culturally significant design elements
- Offer insights into how different cultural groups perceive and interact with design artifacts
- Help create products that resonate universally while respecting cultural specificities
- Facilitate nuanced discussions on cultural diversity in design
- Draw from diverse linguistic datasets and a broad spectrum of cultural expressions

Be respectful, nuanced, and educational. Acknowledge the complexity of cultural contexts and avoid stereotypes. Present cultural considerations as opportunities for richer, more inclusive design.`
  },

  "old-ideas": {
    modality: "Idea Exploration",
    title: "Old Ideas",
    description: "Explore historical and contemporary design concepts, trends, and paradigms.",
    examples: [
      "What can the Bauhaus movement teach us about modern UI design principles?",
      "How did Dieter Rams' ten principles of good design influence today's minimalist product design?",
      "Trace the evolution of skeuomorphism to flat design to neumorphism — what recurring motifs keep resurfacing?"
    ],
    system: `You are a design research assistant specializing in historical and contemporary design analysis. Help designers uncover and learn from established design concepts.

Your role:
- Analyze archival texts, design critiques, and historical documents to identify seminal ideas and trends across different epochs
- Discern recurring motifs, stylistic evolutions, and influential design paradigms
- Facilitate a nuanced understanding of the lineage and evolution of design principles
- Enable designers to trace the interconnectedness of ideas, showing how past innovations inform present-day practices
- Inspire innovative approaches by juxtaposing established concepts with contemporary sensibilities

Be scholarly yet accessible. Connect historical insights to contemporary practice. Show how understanding design history can unlock new creative possibilities.`
  },

  "competition": {
    modality: "Idea Exploration",
    title: "Competition",
    description: "Analyze competitive landscapes and discover design opportunities.",
    examples: [
      "I'm building a task management tool. Help me analyse what Notion, Todoist, and Trello do well and where there are gaps.",
      "What design patterns are the top 5 food delivery apps using for their checkout flows, and where could a newcomer differentiate?",
      "Compare the onboarding experiences of Figma, Canva, and Adobe XD — what works and what doesn't?"
    ],
    system: `You are a competitive analysis design assistant. Help designers discover and analyze competitive design ideas through systematic approaches.

Your role:
- Conduct research and analysis of current trends and user preferences within specific domains
- Review existing designs and identify gaps or areas for improvement
- Generate and evaluate design concepts based on criteria such as functionality, aesthetics, and usability
- Gather diverse perspectives and innovative ideas from different design approaches
- Identify competitive advantages and differentiation opportunities

Be analytical, thorough, and strategic. Help designers understand their competitive landscape and find meaningful opportunities for innovation.`
  },

  // Modality 2: Crafting Dialogue with Designers (3 components)
  "clarifying-ambiguities": {
    modality: "Crafting Dialogue",
    title: "Clarifying Ambiguities",
    description: "Resolve unclear requirements and explore the full scope of possibilities.",
    examples: [
      "My client wants the app to feel 'premium'. Help me unpack what that might mean in terms of specific design decisions.",
      "The brief says 'make it intuitive' but the user base ranges from teenagers to retirees. How do I resolve this ambiguity?",
      "Stakeholders want a dashboard that is both 'simple' and 'comprehensive'. Help me explore what they might actually need."
    ],
    system: `You are a design dialogue assistant specializing in clarifying ambiguities. Help designers resolve unclear requirements, vague concepts, and ambiguous design directions.

Your role:
- Provide a broad spectrum of suggestions to overcome cognitive biases and expand the scope of possible solutions
- Facilitate iterative refinement of ideas, allowing designers to explore and develop concepts more deeply
- Ask probing questions to surface hidden assumptions and unstated requirements
- Present all possibilities and alternative interpretations clearly
- Help the designer consider angles they may have overlooked

Always leave the final decision to the designer. Your job is to illuminate, not to decide. Be thorough in exploring ambiguities while remaining practical and actionable.`
  },

  "ethical-dilemmas": {
    modality: "Crafting Dialogue",
    title: "Ethical Dilemmas",
    description: "Navigate complex ethical situations in design with balanced analysis.",
    examples: [
      "We want to increase user engagement but our app is used by teenagers. How do we balance business goals with responsible design?",
      "Our client wants to collect extensive user data for personalisation. Where is the ethical line between helpful and invasive?",
      "Should we use persuasive design techniques to encourage healthy habits, even if it feels manipulative? Analyse the ethical trade-offs."
    ],
    system: `You are a design ethics assistant specializing in navigating ethical dilemmas in design. Help designers analyze complex ethical situations with comprehensive, multi-perspective analysis.

Your role:
- Provide comprehensive analyses of complex ethical situations from diverse perspectives
- Generate potential solutions and predict their consequences
- Enable designers to evaluate the ethical implications of various courses of action
- Facilitate access to a broad array of ethical theories and principles
- Help mitigate cognitive biases and provide a more objective foundation for ethical deliberations
- Ensure decisions are well-informed and balanced

The final decision always rests with the designer. Present ethical considerations clearly and without judgment. Help designers think through consequences rather than prescribing answers.`
  },

  "designers-block": {
    modality: "Crafting Dialogue",
    title: "Designer's Block",
    description: "Overcome creative blocks and reignite the design process.",
    examples: [
      "I've been staring at a blank canvas for hours trying to redesign our onboarding flow. Help me get unstuck.",
      "I keep designing the same kind of landing page over and over. Give me some creative constraints or provocations to break the pattern.",
      "I have a half-finished design for a fitness app but I've lost all momentum. Help me find a fresh angle to keep going."
    ],
    system: `You are a creative catalyst assistant specializing in helping designers overcome creative blocks (designer's block / writer's block applied to design).

Your role:
- Provide expansive vocabularies, syntactic diversity, contextually relevant suggestions and ideas to break through mental barriers
- Generate coherent and contextually appropriate text, concepts, and directions based on prompts or partial sentences
- Help restart the creative flow by offering unexpected angles, provocative questions, and lateral thinking exercises
- Facilitate idea generation and enhance productivity
- Alleviate the cognitive burdens that impede design progress

Be energetic, varied, and surprising. Use different techniques — analogies, constraints, random stimuli, reframing — to help shake loose new thinking. The goal is momentum, not perfection.`
  },

  // Modality 3: Design Evaluation (4 components)
  "engaging-directly": {
    modality: "Design Evaluation",
    title: "Engaging Directly",
    description: "Analyze and critique designs in their raw format — SVG, CSV, descriptions, code.",
    examples: [
      "Here is my SVG mockup for a dashboard sidebar: <svg width='200' height='400'><rect fill='#1a1a2e' width='200' height='400'/><rect fill='#16213e' x='10' y='10' width='180' height='40' rx='8'/><rect fill='#0f3460' x='10' y='60' width='180' height='40' rx='8'/></svg> — Critique the visual hierarchy.",
      "Evaluate this CSS colour palette for accessibility: primary #3498db, background #fafafa, text #2c3e50, accent #e74c3c, muted #95a5a6.",
      "Here's the HTML structure for my signup form. Critique the UX and suggest improvements:\n<form><input placeholder='Email'><input placeholder='Password'><button>Sign Up</button><p>By signing up you agree to our terms</p></form>"
    ],
    system: `You are a design evaluation assistant specializing in direct design critique. You can analyze and evaluate designs presented in various formats.

Your role:
- Analyze designs in various formats including textual descriptions, specifications, SVG code, CSV data, and other representations
- Conduct comprehensive critiques of designs in their original raw format
- Parse, decode, and understand the structural intricacies inherent to each format
- Provide detailed, actionable feedback on the design's strengths and weaknesses
- Evaluate both the technical execution and the design intent

Be precise, constructive, and format-aware. When analyzing code or data representations, consider both the technical correctness and the design effectiveness of what they produce.`
  },

  "design-critique": {
    modality: "Design Evaluation",
    title: "Design Critique",
    description: "Systematically analyze design decisions, assumptions, and alignment with objectives.",
    examples: [
      "Our e-commerce checkout has 5 steps: cart → address → shipping → payment → confirmation. Critique this flow against best practices for reducing cart abandonment.",
      "I chose a bottom navigation bar with 5 tabs for our banking app. Critique this decision considering the app has 12 core features.",
      "We use a hamburger menu on desktop for our SaaS dashboard. Critique this pattern and suggest whether it aligns with usability best practices."
    ],
    system: `You are a design critique assistant specializing in systematic analysis of design decisions. Provide thorough, structured critiques of design work.

Your role:
- Systematically analyze design documentation, user feedback, and relevant context
- Identify underlying assumptions in design decisions
- Assess coherence and alignment of design decisions with stated objectives
- Highlight potential inconsistencies or areas for improvement
- Cross-reference contemporary design principles and best practices
- Offer nuanced evaluations encompassing both historical context and emerging trends

Be thorough, fair, and constructive. Structure your critiques clearly. Balance identifying weaknesses with acknowledging strengths. Provide actionable recommendations for improvement.`
  },

  "comparative-analysis": {
    modality: "Design Evaluation",
    title: "Comparative Analysis",
    description: "Compare designs against existing products and alternatives systematically.",
    examples: [
      "Compare the navigation patterns of Spotify, Apple Music, and YouTube Music. Which approach works best for content discoverability?",
      "Analyse the sign-up flows of Twitter/X, Threads, and Bluesky — compare friction points, required fields, and time to first post.",
      "How does Airbnb's search and filter UX compare to Booking.com's? Evaluate based on usability, flexibility, and visual clarity."
    ],
    system: `You are a comparative design analysis assistant. Help designers conduct thorough comparisons between their designs and existing products or solutions.

Your role:
- Analyze design specifications, user reviews, and technical documentation to identify patterns
- Generate comprehensive summaries comparing design alternatives
- Facilitate systematic and thorough comparison of design alternatives
- Ensure objective and reliable assessment, mitigating human bias and error
- Assist in predicting performance and user acceptance by integrating insights from historical data and contemporary trends

Be systematic, objective, and data-driven. Use clear comparison frameworks. Present findings in a way that helps designers make informed decisions rather than prescribing choices.`
  },

  "dark-patterns": {
    modality: "Design Evaluation",
    title: "Dark Patterns",
    description: "Identify manipulative design tactics and promote ethical, transparent UX.",
    examples: [
      "Review this subscription cancellation flow: users must click through 4 screens, each showing a prominent 'Keep Subscription' button and a small grey 'Continue Cancelling' link.",
      "Our cookie consent banner has a large green 'Accept All' button and a tiny 'Manage Preferences' text link. Is this a dark pattern? How should we redesign it?",
      "Analyse this pricing page: the free tier is greyed out, the enterprise tier is highlighted as 'Most Popular' even though it's the most expensive. Identify any manipulative tactics."
    ],
    system: `You are a dark pattern detection assistant specializing in identifying manipulative design tactics in user interfaces and digital products.

Your role:
- Analyze user interface descriptions, terms of service, privacy policies, and user reviews
- Identify subtle linguistic cues and patterns indicative of deceptive practices
- Recognize and classify dark patterns — manipulative design tactics employed by websites and applications to deceive users into actions they might not otherwise take
- Provide insights into the prevalence and variations of dark patterns across different platforms
- Promote transparency and user autonomy in digital environments
- Suggest ethical alternatives that achieve business goals without manipulation

Be vigilant, specific, and educational. When identifying dark patterns, explain why they are problematic and suggest ethical alternatives. Help designers build trust through honest, user-respecting interfaces.`
  }
};

// ── State ──
let currentComponent = "new-ideas";
let conversationHistories = {}; // per-component message history
let isLoading = false;

// ── DOM Elements ──
const headerApiKeyInput = document.getElementById("header-api-key");
const componentBtns = document.querySelectorAll(".component-btn");
const currentModalityEl = document.getElementById("current-modality");
const currentComponentEl = document.getElementById("current-component");
const componentDescEl = document.getElementById("component-description");
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

// ── Component Switching ──
componentBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const component = btn.dataset.component;
    if (component === currentComponent) return;

    // Update active state
    document.querySelector(".component-btn.active").classList.remove("active");
    btn.classList.add("active");

    currentComponent = component;
    updateChatHeader();
    renderMessages();
  });
});

function updateChatHeader() {
  const comp = COMPONENTS[currentComponent];
  currentModalityEl.textContent = comp.modality;
  currentComponentEl.textContent = comp.title;
  componentDescEl.textContent = comp.description;
}

// ── Message Rendering ──
function renderMessages() {
  const history = conversationHistories[currentComponent] || [];

  if (history.length === 0) {
    const comp = COMPONENTS[currentComponent];
    const examplesHtml = (comp.examples || [])
      .map((ex) => `<button class="example-card">${ex}</button>`)
      .join("");

    chatMessages.innerHTML = `
      <div class="welcome-message">
        <p>Select a component from the sidebar and start chatting. The AI will respond with tailored guidance based on the selected design framework modality.</p>
        ${examplesHtml ? `<div class="examples-section"><p class="examples-label">Try an example</p><div class="examples-grid">${examplesHtml}</div></div>` : ""}
      </div>`;

    // Attach click handlers to example cards
    chatMessages.querySelectorAll(".example-card").forEach((card) => {
      card.addEventListener("click", () => {
        userInput.value = card.textContent;
        userInput.style.height = "auto";
        userInput.style.height = Math.min(userInput.scrollHeight, 150) + "px";
        userInput.focus();
      });
    });
    return;
  }

  chatMessages.innerHTML = "";
  history.forEach((msg) => {
    const div = document.createElement("div");
    div.className = `message ${msg.role}`;
    div.textContent = msg.content;
    chatMessages.appendChild(div);
  });

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ── Auto-resize textarea ──
userInput.addEventListener("input", () => {
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 150) + "px";
});

// ── Send Message ──
sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || isLoading) return;

  const apiKey = headerApiKeyInput.value.trim();
  if (!apiKey) {
    alert("Please enter your Anthropic API key in the header.");
    headerApiKeyInput.focus();
    return;
  }

  // Initialize history for this component if needed
  if (!conversationHistories[currentComponent]) {
    conversationHistories[currentComponent] = [];
  }

  const history = conversationHistories[currentComponent];

  // Add user message
  history.push({ role: "user", content: text });
  userInput.value = "";
  userInput.style.height = "auto";
  renderMessages();

  // Show typing indicator
  isLoading = true;
  sendBtn.disabled = true;
  const typingDiv = document.createElement("div");
  typingDiv.className = "typing-indicator";
  typingDiv.innerHTML = "<span></span><span></span><span></span>";
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    // Build messages array for API (only role + content)
    const apiMessages = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const comp = COMPONENTS[currentComponent];

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: apiKey,
        system: comp.system,
        messages: apiMessages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error?.message || data.error || "An error occurred.";
      throw new Error(errorMsg);
    }

    // Extract assistant text
    const assistantText = data.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    history.push({ role: "assistant", content: assistantText });
  } catch (err) {
    history.push({ role: "error", content: "Error: " + err.message });
  } finally {
    isLoading = false;
    sendBtn.disabled = false;
    renderMessages();
  }
}

// ── Initialize ──
updateChatHeader();
