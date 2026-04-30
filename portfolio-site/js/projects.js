const projects = [
  {
    id: "threadmine",
    name: "ThreadMine",
    tagline: "Audience Research Extractor",
    description: "Turn chaotic comment sections into organized content databases. Extract audience pain points, objections, and desires directly from Reddit, X, and YouTube.",
    icon: "🪨",
    color: "#00cec9",
    features: ["Context Menu Mining", "Ollama AI Insights", "Centralized Idea CRM"],
    suite: "Creator Suite",
    githubLink: "https://github.com/samargupta096/creator-chrome-extensions/tree/main/threadmine"
  },
  {
    id: "postvault",
    name: "PostVault",
    tagline: "Creator Snippet Manager",
    description: "Your library of reusable hooks, CTAs, and links. Inject predefined snippets straight into X, LinkedIn, Instagram, and YouTube with platform-specific variants.",
    icon: "📌",
    color: "#6c5ce7",
    features: ["Instant Snippet Injection", "Platform Variants", "Campaign Folders"],
    suite: "Creator Suite",
    githubLink: "https://github.com/samargupta096/creator-chrome-extensions/tree/main/postvault"
  },
  {
    id: "launchcheck",
    name: "LaunchCheck",
    tagline: "Pre-Publish Quality Validator",
    description: "A final stop-gap before hitting publish. Critiques YouTube titles, scores hook clarity, and matches thumbnail text with descriptions.",
    icon: "🚀",
    color: "#e17055",
    features: ["Intelligent Title Analysis", "Promise Match Engine", "Studio Injection"],
    suite: "Creator Suite",
    githubLink: "https://github.com/samargupta096/creator-chrome-extensions/tree/main/launchcheck"
  },
  {
    id: "contentcal",
    name: "ContentCal",
    tagline: "Content Calendar & Scheduler",
    description: "Track streaks, visualize heatmaps, and never miss an upload. A fully local performance dashboard for digital footprint visualization.",
    icon: "📅",
    color: "#fdcb6e",
    features: ["Visual Posting Schedule", "Chrome Alarms", "Performance Heatmaps"],
    suite: "Creator Suite",
    githubLink: "https://github.com/samargupta096/creator-chrome-extensions/tree/main/contentcal"
  },
  {
    id: "devdash",
    name: "DevDash",
    tagline: "Developer Productivity Dashboard",
    description: "The ultimate new tab page for engineers. 36+ widgets including GitHub monitoring, system stats, AI chat, and developer utilities.",
    icon: "🚀",
    color: "#0984e3",
    features: ["36+ Custom Widgets", "Local AI Integration", "System Monitoring"],
    suite: "Engineering Suite",
    githubLink: "https://github.com/samargupta096/extensions-google-chrome/tree/main/devdash"
  },
  {
    id: "deepwork",
    name: "DeepWork Guardian",
    tagline: "Productivity Coaching",
    description: "Smart Pomodoro timer with advanced distraction blocking and deep-dive browsing analytics to keep you in the flow.",
    icon: "⏱️",
    color: "#d63031",
    features: ["Smart Pomodoro", "Distraction Blocking", "Browsing Analytics"],
    suite: "Engineering Suite",
    githubLink: "https://github.com/samargupta096/extensions-google-chrome/tree/main/deepwork-guardian"
  },
  {
    id: "neurotab",
    name: "NeuroTab",
    tagline: "AI Second Brain",
    description: "Save and reason over what you read online. AI-generated summaries, tags, and interactive Q&A over your local knowledge base.",
    icon: "🧠",
    color: "#a29bfe",
    features: ["1-Click Capture", "AI Summaries", "Local Q&A"],
    suite: "Engineering Suite",
    githubLink: "https://github.com/samargupta096/extensions-google-chrome/tree/main/neurotab"
  },
  {
    id: "ghosthunter",
    name: "GhostHunter",
    tagline: "Fake Job Detector",
    description: "Identify suspicious job postings on LinkedIn, Indeed, and Glassdoor using AI-driven signal detection and risk scoring.",
    icon: "👻",
    color: "#fab1a0",
    features: ["Risk Badges", "Ghost Signal Detection", "Employer Background Checks"],
    suite: "Engineering Suite",
    githubLink: "https://github.com/samargupta096/extensions-google-chrome/tree/main/ghosthunter"
  },
  {
    id: "codearmor",
    name: "CodeArmor",
    tagline: "Credential Leakage Prevention",
    description: "Reduce accidental credential leakage by intercepting pastes on risky domains and scanning for secret patterns locally.",
    icon: "🛡️",
    color: "#55efc4",
    features: ["Paste Interception", "Secret Detection", "Secure Local Vault"],
    suite: "Engineering Suite",
    githubLink: "https://github.com/samargupta096/extensions-google-chrome/tree/main/codearmor"
  },
  {
    id: "pricehawk",
    name: "PriceHawk",
    tagline: "Price Tracker",
    description: "Monitor products over time and avoid misleading discounts. AI-assisted buy/no-buy guidance based on historical price data.",
    icon: "💰",
    color: "#2ecc71",
    features: ["Price History Tracking", "Suspicious Sale Alerts", "AI Buy/No-Buy Guidance"],
    suite: "Engineering Suite",
    githubLink: "https://github.com/samargupta096/extensions-google-chrome/tree/main/pricehawk"
  },
  {
    id: "clipwise",
    name: "ClipWise",
    tagline: "Clipboard Manager",
    description: "Keep clipboard data reusable and organized. AI-powered text transform actions and smart clip type categorization.",
    icon: "📋",
    color: "#f1c40f",
    features: ["Clipboard Archive", "Persistent Snippets", "AI Text Transforms"],
    suite: "Engineering Suite",
    githubLink: "https://github.com/samargupta096/extensions-google-chrome/tree/main/clipwise"
  },
  {
    id: "pagepilot",
    name: "PagePilot",
    tagline: "Page Assistant & Dev Tools",
    description: "Fast page understanding plus handy dev tools in one popup. Contextual chat with any active page and quick formatters.",
    icon: "🔍",
    color: "#e67e22",
    features: ["Contextual Page Chat", "Regex Testing Utilities", "Color Format Converter"],
    suite: "Engineering Suite",
    githubLink: "https://github.com/samargupta096/extensions-google-chrome/tree/main/pagepilot"
  },
  {
    id: "gitpulse",
    name: "GitPulse",
    tagline: "PR Review Central",
    description: "Centralize PR review work. Unified inbox for PR review requests with smart urgency indicators and AI-generated summaries.",
    icon: "🐙",
    color: "#34495e",
    features: ["Unified PR Inbox", "Urgency Indicators", "AI PR Summaries"],
    suite: "Engineering Suite",
    githubLink: "https://github.com/samargupta096/extensions-google-chrome/tree/main/gitpulse"
  },
  {
    id: "applyhawk",
    name: "ApplyHawk",
    tagline: "Speedy Job Applications",
    description: "Speed up repetitive job applications with autofill across major portals and AI-assisted cover-letter generation.",
    icon: "🦅",
    color: "#e74c3c",
    features: ["Job Portal Autofill", "Activity Tracking", "AI Cover-Letter Generator"],
    suite: "Engineering Suite",
    githubLink: "https://github.com/samargupta096/extensions-google-chrome/tree/main/applyhawk"
  },
  {
    id: "focuslock",
    name: "FocusLock",
    tagline: "Deep Work Mode",
    description: "Maintain flow state while browsing. Dedicated deep work mode with context-aware nudges and score-based focus tracking.",
    icon: "🧘",
    color: "#9b59b6",
    features: ["Deep Work Mode", "Context-Aware Nudges", "Focus Score Tracking"],
    suite: "Engineering Suite",
    githubLink: "https://github.com/samargupta096/extensions-google-chrome/tree/main/focuslock"
  },
  {
    id: "promptchain",
    name: "PromptChain",
    tagline: "Multi-step AI tasks",
    description: "Run repeatable multi-step AI tasks locally. Visual chain builder for complex prompt workflows aware of page context.",
    icon: "⛓️",
    color: "#1abc9c",
    features: ["Visual Chain Builder", "Saved Prompt Library", "Context Aware Prompts"],
    suite: "Engineering Suite",
    githubLink: "https://github.com/samargupta096/extensions-google-chrome/tree/main/promptchain"
  },
  {
    id: "standupscribe",
    name: "StandupScribe",
    tagline: "Auto-Standup Generator",
    description: "Generate standup updates from your actual browsing and work activity. Automatically drafts Yesterday/Today/Blockers.",
    icon: "📝",
    color: "#3498db",
    features: ["Auto-Generated Drafts", "Activity History View", "AI Standup Insights"],
    suite: "Engineering Suite",
    githubLink: "https://github.com/samargupta096/extensions-google-chrome/tree/main/standupscribe"
  },
  {
    id: "tabvault",
    name: "TabVault",
    tagline: "Tab Session Manager",
    description: "Manage tab sprawl and session recovery. Real-time memory estimates and AI-generated session summaries.",
    icon: "💾",
    color: "#95a5a6",
    features: ["Session Recovery", "Stale-Tab Detection", "AI Session Summaries"],
    suite: "Engineering Suite",
    githubLink: "https://github.com/samargupta096/extensions-google-chrome/tree/main/tabvault"
  },
  {
    id: "tabhandoff",
    name: "Tab Handoff",
    tagline: "Device Tab Sharing",
    description: "Instant tab sharing across paired devices. Seamlessly push and pull active tabs between your desktop and mobile browsers.",
    icon: "🤝",
    color: "#16a085",
    features: ["Multi-Device Pairing", "Instant Tab Pushing", "Browser Syncing"],
    suite: "Engineering Suite",
    githubLink: "https://github.com/samargupta096/extensions-google-chrome/tree/main/tabhandoff"
  }
];

export default projects;
