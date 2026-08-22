import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { DeadlineCountdown } from "../components/DeadlineCountdown";

describe("DeadlineCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a countdown with days/hours remaining", () => {
    render(<DeadlineCountdown deadline="2026-01-10T00:00:00Z" />);
    expect(screen.getByText(/9d/)).toBeInTheDocument();
  });

  it("marks expiry with a critical state", () => {
    render(<DeadlineCountdown deadline="2025-12-30T00:00:00Z" label="Resolution window" />);
    expect(screen.getByText(/Resolution window expired/)).toBeInTheDocument();
  });

  it("returns null for an empty or unparsable deadline", () => {
    const { container } = render(<DeadlineCountdown deadline="" />);
    expect(container.firstChild).toBeNull();
  });

  it("updates remaining time as the clock advances", async () => {
    render(<DeadlineCountdown deadline="2026-01-01T12:00:00Z" />);
    expect(screen.getByText(/12h/)).toBeInTheDocument();

    await act(async () => {
      vi.setSystemTime(new Date("2026-01-01T06:00:00Z"));
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/5h/)).toBeInTheDocument();
  });

  it("calls onExpired once the deadline passes", () => {
    const onExpired = vi.fn();
    render(
      <DeadlineCountdown
        deadline="2026-01-01T00:00:00Z"
        onExpired={onExpired}
      />
    );
    expect(onExpired).toHaveBeenCalled();
  });
});