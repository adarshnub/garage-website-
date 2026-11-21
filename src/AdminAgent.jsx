import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bookmark,
  Boxes,
  Check,
  Clipboard,
  Inbox,
  LoaderCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Link } from "./routing";
import { api, Message, useResource } from "./shared";

const prompts = [
  {
    title: "Inventory",
    question:
      "Which motorcycles are currently advertised, and what are their asking prices?",
    icon: Boxes,
  },
  {
    title: "Sourcing",
    question: "Which saved leads best match our showroom stock, and why?",
    icon: Bookmark,
  },
  {
    title: "Showroom traffic",
    question: "How many listing views did we record in the last 30 days?",
    icon: BarChart3,
  },
  {
    title: "Enquiries",
    question: "How many enquiries have we received in total?",
    icon: Inbox,
  },
];

export default function AdminAgent() {
  const [refresh, setRefresh] = useState(0);
  const { data: agent, error: statusError } = useResource(
    "admin/agent/status",
    refresh,
  );
  const [draft, setDraft] = useState("");
  const [reply, setReply] = useState(null);
  const [asking, setAsking] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const textarea = useRef(null);
  const request = useRef(null);

  useEffect(() => () => request.current?.abort(), []);

  function choose(question) {
    setDraft(question);
    textarea.current?.focus();
  }

  async function ask(event) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || !agent?.ready || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setAsking(true);
    setCopyStatus("");
    setReply({ question });
    try {
      const { answer } = await api(
        "admin/agent/ask",
        "POST",
        { question },
        { signal: controller.signal },
      );
      setReply({ question, answer });
    } catch (error) {
      if (!controller.signal.aborted)
        setReply({ question, error: error.message });
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setAsking(false);
    }
  }

  async function copyAnswer() {
    try {
      await navigator.clipboard.writeText(reply.answer);
      setCopyStatus("Answer copied");
    } catch {
      setCopyStatus("Select the answer to copy it.");
    }
  }

  const checking = !agent && !statusError;
  return (
    <div className="agent-page">
      <header className="agent-banner">
        <div className="agent-banner-copy">
          <div className="agent-brand-line">
            <Sparkles size={16} /> Powered by Codex
          </div>
          <h1>
            Showroom Agent<span>.</span>
          </h1>
          <p>
            Ask about your motorcycles, sourcing leads, enquiries and showroom
            traffic.
          </p>
        </div>
        <div className="agent-connection">
          <span
            className="dealer-chip"
            data-state={agent?.ready ? "online" : undefined}
            role="status"
          >
            <i />
            {checking
              ? "Checking connection…"
              : agent?.ready
                ? "Connected"
                : "Offline"}
          </span>
        </div>
      </header>
      {!checking && !agent?.ready && (
        <div className="agent-disconnected">
          <div>
            <strong>Codex connection unavailable</strong>
            <p>
              {statusError ||
                agent?.message ||
                "Sign in to the local Codex CLI with your ChatGPT account."}
            </p>
          </div>
          <button
            type="button"
            className="dealer-quiet"
            onClick={() => setRefresh((n) => n + 1)}
          >
            <RotateCcw size={16} /> Recheck connection
          </button>
        </div>
      )}
      <div className="agent-grid">
        <section className="agent-console" aria-labelledby="ask-heading">
          <header className="agent-panel-head">
            <h2 id="ask-heading">Ask a question</h2>
            <p>Get an answer based on your dealership data.</p>
            <a className="agent-examples-jump" href="#examples-heading">
              Browse sample questions <ArrowRight size={15} />
            </a>
          </header>
          <form onSubmit={ask}>
            <label htmlFor="agent-question">Your question</label>
            <textarea
              id="agent-question"
              ref={textarea}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.nativeEvent.isComposing &&
                  (event.metaKey || event.ctrlKey)
                ) {
                  event.preventDefault();
                  event.currentTarget.form.requestSubmit();
                }
              }}
              placeholder="What would you like to know about your showroom?"
              maxLength={1200}
              rows={4}
              required
            />
            <div className="agent-submit">
              <span className="agent-shortcut">Ctrl or ⌘ + Enter to send</span>
              <button
                type="submit"
                className="button"
                disabled={!agent?.ready || asking || !draft.trim()}
              >
                {asking ? "Asking Codex…" : "Ask Codex"}
                {asking ? (
                  <LoaderCircle className="dealer-spinner" size={17} />
                ) : (
                  <ArrowUpRight size={17} />
                )}
              </button>
            </div>
          </form>
          <div className="agent-reply" aria-busy={asking}>
            <div className="agent-reply-head">
              <h3>
                <Sparkles size={17} /> Answer
              </h3>
              {reply?.answer && (
                <button
                  type="button"
                  className="dealer-quiet"
                  onClick={copyAnswer}
                >
                  {copyStatus === "Answer copied" ? (
                    <Check size={16} />
                  ) : (
                    <Clipboard size={16} />
                  )}
                  {copyStatus === "Answer copied" ? "Copied" : "Copy"}
                </button>
              )}
            </div>
            {reply && <p className="agent-asked">{reply.question}</p>}
            {reply?.error && <Message error>{reply.error}</Message>}
            <div
              role="status"
              className={
                reply?.answer ? "agent-answer-text" : "agent-reply-hint"
              }
            >
              {asking
                ? "Codex is reviewing the showroom data…"
                : reply?.answer || (!reply && "Your answer will appear here.")}
            </div>
            {copyStatus && (
              <span role="status" className="agent-copy-feedback">
                {copyStatus}
              </span>
            )}
          </div>
        </section>
        <aside className="agent-examples" aria-labelledby="examples-heading">
          <header className="agent-panel-head">
            <h2 id="examples-heading">Try a question</h2>
            <p>Pick an example, then edit or send it.</p>
          </header>
          {prompts.map(({ title, question, icon: Icon }) => (
            <button
              type="button"
              className="agent-example"
              key={title}
              onClick={() => choose(question)}
            >
              <span className="agent-example-icon">
                <Icon size={19} />
              </span>
              <span>
                <strong>{title}</strong>
                <span>{question}</span>
              </span>
              <ArrowRight size={16} />
            </button>
          ))}
          <Link to="/admin/sourcing" className="agent-sourcing-link">
            Open sourcing desk <ArrowUpRight size={16} />
          </Link>
        </aside>
      </div>
    </div>
  );
}
