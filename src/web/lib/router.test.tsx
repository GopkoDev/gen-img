import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Link, navigate, useRoute } from "./router";

function Show() {
  const route = useRoute();
  return (
    <div>
      <p>{route.name === "detail" ? `detail ${route.id}` : "home"}</p>
      <Link to="/generations/01ABC">open</Link>
    </div>
  );
}

describe("router", () => {
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("renders home at / and anything unknown", () => {
    window.history.replaceState(null, "", "/whatever");
    render(<Show />);
    expect(screen.getByText("home")).toBeInTheDocument();
  });

  it("renders the detail route and follows links, navigate() and back", () => {
    render(<Show />);
    fireEvent.click(screen.getByText("open"));
    expect(window.location.pathname).toBe("/generations/01ABC");
    expect(screen.getByText("detail 01ABC")).toBeInTheDocument();

    act(() => navigate("/"));
    expect(screen.getByText("home")).toBeInTheDocument();

    act(() => {
      window.history.pushState(null, "", "/generations/02XYZ");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByText("detail 02XYZ")).toBeInTheDocument();
  });
});
