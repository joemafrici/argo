import { describe, it, vi, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useAuth from "./useAuth";

vi.mock("../api", () => ({
  logout: vi.fn(),
}));

describe("useAuth", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('handles logout', async () => {
    const { result } = renderHook(() => useAuth());
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    act(() => {
      result.current.handleLogin('test-token');
    });

    expect(setItemSpy).toHaveBeenCalledWith('token', 'test-token');

    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

    await act(async () => {
      await result.current.handleLogout();
    });

    expect(removeItemSpy).toHaveBeenCalledWith('token');
    expect(result.current.isLoggedIn).toBe(false);
  });

});
