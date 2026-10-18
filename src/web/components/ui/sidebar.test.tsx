import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarTrigger } from "./sidebar";

// The kit block works in this repo: it renders under jsdom and its trigger collapses / expands the sidebar.
describe("sidebar block primitives", () => {
  it("collapses and expands from the trigger", () => {
    const { container } = render(
      <SidebarProvider>
        <Sidebar variant="inset" collapsible="icon">
          <SidebarContent>entries</SidebarContent>
        </Sidebar>
        <SidebarInset>
          <SidebarTrigger />
        </SidebarInset>
      </SidebarProvider>,
    );
    const state = () => container.querySelector("[data-slot=sidebar]")?.getAttribute("data-state");
    expect(state()).toBe("expanded");
    fireEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
    expect(state()).toBe("collapsed");
    fireEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
    expect(state()).toBe("expanded");
  });
});
