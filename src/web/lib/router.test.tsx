import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Link, navigate, parseRoute, replace, useRoute } from "./router";

function Show() {
  const route = useRoute();
  return (
    <div>
      <p>{route.name === "detail" ? `detail ${route.id}` : `page ${route.pathname}${route.search}`}</p>
      <Link to="/generations/01ABC">open</Link>
    </div>
  );
}

describe("parseRoute", () => {
  it("reads a generation address as the detail route", () => {
    expect(parseRoute("/generations/01ABC")).toEqual({ name: "detail", id: "01ABC" });
    expect(parseRoute("/generations/01%20X/")).toEqual({ name: "detail", id: "01 X" });
  });

  it("keeps every other path as a page path for the section registry to match", () => {
    expect(parseRoute("/")).toEqual({ name: "page", pathname: "/", search: "" });
    expect(parseRoute("/gallery", "?deleted=1")).toEqual({ name: "page", pathname: "/gallery", search: "?deleted=1" });
    expect(parseRoute("/generations/")).toEqual({ name: "page", pathname: "/generations/", search: "" });
  });
});

describe("router", () => {
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("renders an unknown address as that page path — not as home", () => {
    window.history.replaceState(null, "", "/whatever");
    render(<Show />);
    expect(screen.getByText("page /whatever")).toBeInTheDocument();
  });

  it("renders the detail route and follows links, navigate() and back", () => {
    render(<Show />);
    fireEvent.click(screen.getByText("open"));
    expect(window.location.pathname).toBe("/generations/01ABC");
    expect(screen.getByText("detail 01ABC")).toBeInTheDocument();

    act(() => navigate("/"));
    expect(screen.getByText("page /")).toBeInTheDocument();

    act(() => {
      window.history.pushState(null, "", "/generations/02XYZ");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByText("detail 02XYZ")).toBeInTheDocument();
  });

  it("replace() swaps the address without a history entry and tells subscribers", () => {
    render(<Show />);
    act(() => navigate("/?rerun=01ABC"));
    expect(screen.getByText("page /?rerun=01ABC")).toBeInTheDocument();
    const depth = window.history.length;
    act(() => replace("/"));
    expect(window.location.search).toBe("");
    expect(window.history.length).toBe(depth);
    expect(screen.getByText("page /")).toBeInTheDocument();
  });
});
