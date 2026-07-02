import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "../pages/LoginPage";

describe("LoginPage", () => {
  it("renders email + password fields and submit", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });
});
