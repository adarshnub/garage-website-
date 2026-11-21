import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export default function CustomSelect({
  id,
  value,
  options,
  onChange,
  label,
  name,
  disabled = false,
  required = false,
  className = "",
  placeholder = "Select an option",
  "aria-label": ariaLabel,
  "aria-labelledby": labelledBy,
}) {
  const uid = useId();
  const triggerId = id || uid;
  const listId = uid + "-options";
  const trigger = useRef(null);
  const menu = useRef(null);
  const search = useRef({ text: "", time: 0 });
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(null);
  const rows = options.map((option) =>
    typeof option === "object"
      ? option
      : { value: option, label: String(option) },
  );
  const enabled = rows.filter((option) => !option.disabled);
  const selected = rows.find((option) => option.value === value);
  const current =
    enabled.find((option) => option.value === highlight) ||
    enabled.find((option) => option.value === value) ||
    enabled[0];
  const expanded = open && !disabled && enabled.length > 0;

  function close() {
    search.current = { text: "", time: 0 };
    setOpen(false);
  }
  function choose(option) {
    if (option && !option.disabled && option.value !== value)
      onChange(option.value);
    close();
  }
  function show(option) {
    setHighlight(option.value);
    setOpen(true);
  }
  useEffect(() => {
    if (open && !expanded) close();
  }, [open, expanded]);

  useLayoutEffect(() => {
    if (!expanded) return;
    const anchor = trigger.current;
    const list = menu.current;
    const viewport = window.visualViewport;
    function position() {
      const rect = anchor.getBoundingClientRect();
      const gutter = 8,
        gap = 5;
      const left = (viewport?.offsetLeft || 0) + gutter;
      const top = (viewport?.offsetTop || 0) + gutter;
      const right =
        left +
        (viewport?.width || document.documentElement.clientWidth) -
        2 * gutter;
      const bottom =
        top + (viewport?.height || window.innerHeight) - 2 * gutter;
      if (!rect.width || rect.bottom < top || rect.top > bottom) {
        close();
        return;
      }
      list.style.maxWidth = right - left + "px";
      list.style.minWidth = Math.min(rect.width, right - left) + "px";
      const above = Math.max(0, rect.top - gap - top);
      const below = Math.max(0, bottom - rect.bottom - gap);
      const natural = list.scrollHeight + list.offsetHeight - list.clientHeight;
      const flip = below < Math.min(natural, 300) && above > below;
      list.style.maxHeight = Math.min(300, flip ? above : below) + "px";
      list.style.left =
        Math.max(left, Math.min(rect.left, right - list.offsetWidth)) + "px";
      list.style.top =
        (flip ? rect.top - gap - list.offsetHeight : rect.bottom + gap) + "px";
    }
    function onScroll(event) {
      if (!list.contains(event.target)) position();
    }
    position();
    const observer = new ResizeObserver(position);
    observer.observe(anchor);
    observer.observe(list);
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", position);
    viewport?.addEventListener("resize", position);
    viewport?.addEventListener("scroll", position);
    return () => {
      observer.disconnect();
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", position);
      viewport?.removeEventListener("resize", position);
      viewport?.removeEventListener("scroll", position);
    };
  }, [expanded]);

  useLayoutEffect(() => {
    const list = menu.current;
    const row = list?.querySelector('[data-active="true"]');
    if (!row) return;
    const top = row.offsetTop,
      bottom = top + row.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    if (bottom > list.scrollTop + list.clientHeight)
      list.scrollTop = bottom - list.clientHeight;
  }, [expanded, current?.value]);

  useEffect(() => {
    if (!expanded) return;
    function dismiss(event) {
      if (
        !trigger.current?.contains(event.target) &&
        !menu.current?.contains(event.target)
      )
        close();
    }
    document.addEventListener("pointerdown", dismiss, true);
    window.addEventListener("blur", close);
    return () => {
      document.removeEventListener("pointerdown", dismiss, true);
      window.removeEventListener("blur", close);
    };
  }, [expanded]);

  function keyDown(e) {
    if (disabled || !enabled.length || e.ctrlKey || e.metaKey) return;
    const index = enabled.indexOf(expanded ? current : selected);
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp": {
        e.preventDefault();
        const next =
          e.key === "ArrowDown"
            ? Math.min(index + 1, enabled.length - 1)
            : index < 0
              ? enabled.length - 1
              : Math.max(0, index - 1);
        show(enabled[next]);
        break;
      }
      case "Home":
      case "End":
        e.preventDefault();
        show(e.key === "Home" ? enabled[0] : enabled.at(-1));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (expanded) choose(current);
        else show(enabled.includes(selected) ? selected : enabled[0]);
        break;
      case "Escape":
        if (expanded) {
          e.preventDefault();
          e.stopPropagation();
          close();
        }
        break;
      case "Tab":
        if (expanded) choose(current);
        break;
      default: {
        if (e.altKey || e.key.length !== 1) return;
        e.preventDefault();
        const now = performance.now(),
          char = e.key.toLocaleLowerCase();
        const text =
          (now - search.current.time < 650 ? search.current.text : "") + char;
        search.current = { text, time: now };
        const repeated = [...text].every((letter) => letter === char);
        const prefix = repeated ? char : text;
        const start = Math.max(0, repeated ? index + 1 : index);
        const ordered = enabled.slice(start).concat(enabled.slice(0, start));
        const match = ordered.find((option) =>
          String(option.label).toLocaleLowerCase().startsWith(prefix),
        );
        if (match) {
          setHighlight(match.value);
          if (!expanded && match.value !== value) onChange(match.value);
        }
      }
    }
  }

  return (
    <span className={("custom-select " + className).trim()}>
      {name && (
        <input
          type="hidden"
          name={name}
          value={value ?? ""}
          disabled={disabled}
        />
      )}
      <button
        ref={trigger}
        id={triggerId}
        type="button"
        role="combobox"
        className="select-trigger"
        aria-label={ariaLabel || label}
        aria-labelledby={labelledBy}
        aria-haspopup="listbox"
        aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        aria-activedescendant={
          expanded ? listId + "-" + rows.indexOf(current) : undefined
        }
        aria-required={required || undefined}
        disabled={disabled || !enabled.length}
        onClick={() =>
          expanded
            ? close()
            : show(enabled.includes(selected) ? selected : enabled[0])
        }
        onKeyDown={keyDown}
        onBlur={(e) => {
          if (!menu.current?.contains(e.relatedTarget)) close();
        }}
      >
        <span className="select-value">{selected?.label ?? placeholder}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {expanded &&
        createPortal(
          <ul
            ref={menu}
            id={listId}
            role="listbox"
            className="select-options"
            aria-label={ariaLabel || label}
            aria-labelledby={
              labelledBy || (!(ariaLabel || label) ? triggerId : undefined)
            }
            onMouseDown={(event) => event.preventDefault()}
          >
            {rows.map((option, i) => (
              <li
                key={option.value}
                id={listId + "-" + i}
                role="option"
                aria-selected={option.value === value}
                aria-disabled={option.disabled || undefined}
                data-active={current === option}
                className="select-option"
                onClick={(event) => {
                  event.preventDefault();
                  if (!option.disabled) {
                    trigger.current.focus({ preventScroll: true });
                    choose(option);
                  }
                }}
              >
                <span>{option.label}</span>
                {option.value === value && (
                  <Check size={16} aria-hidden="true" />
                )}
              </li>
            ))}
          </ul>,
          trigger.current.closest("dialog[open]") || document.body,
        )}
    </span>
  );
}
