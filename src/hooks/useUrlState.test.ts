// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useUrlState } from './useUrlState';

const go = (url: string) => window.history.replaceState(null, '', url);
const here = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;
const mount = (fallback: string | null = null) => renderHook(() => useUrlState(fallback));
const back = async () => {
  await act(async () => {
    window.history.back();
    await new Promise((r) => setTimeout(r, 20));
  });
};

beforeEach(() => go('/'));

describe('useUrlState: reading', () => {
  it('starts from the address', () => {
    go('/?liga=pl&dia=2026-10-18&estado=vivo&partido=55');
    expect(mount().result.current.state).toEqual({ liga: 'pl', dia: '2026-10-18', estado: 'LIVE', partido: '55' });
  });

  it('starts from the default view when the address is clean', () => {
    expect(mount().result.current.state).toEqual({ liga: null, dia: null, estado: 'ALL', partido: null });
  });

  it('uses the remembered league only when the address names none', () => {
    expect(mount('ll').result.current.state.liga).toBe('ll');
    go('/?liga=pl');
    expect(mount('ll').result.current.state.liga).toBe('pl');
  });

  it('writes the remembered league into the address without adding a history entry', () => {
    const before = window.history.length;
    mount('ll');
    expect(here()).toBe('/?liga=ll');
    expect(window.history.length).toBe(before);
  });

  it('cleans garbage out of the address it was opened with', () => {
    go('/?liga=nope&estado=vivo');
    const { result } = mount();
    expect(result.current.state).toEqual({ liga: null, dia: null, estado: 'LIVE', partido: null });
    expect(here()).toBe('/?estado=vivo');
  });

  it('keeps the path and hash of the page', () => {
    go('/app/#seccion');
    const { result } = mount();
    act(() => result.current.update({ estado: 'FINISHED' }));
    expect(here()).toBe('/app/?estado=finalizados#seccion');
  });
});

describe('useUrlState: changing the view', () => {
  it('updates state and address in place, without a history entry per click', () => {
    const { result } = mount();
    const before = window.history.length;

    act(() => result.current.update({ liga: 'pl' }));
    act(() => result.current.update({ dia: '2026-10-18' }));
    act(() => result.current.update({ estado: 'LIVE' }));

    expect(result.current.state).toEqual({ liga: 'pl', dia: '2026-10-18', estado: 'LIVE', partido: null });
    expect(here()).toBe('/?liga=pl&dia=2026-10-18&estado=vivo');
    expect(window.history.length).toBe(before);
  });

  it('clears a league back to all', () => {
    go('/?liga=pl');
    const { result } = mount();
    act(() => result.current.update({ liga: null }));
    expect(result.current.state.liga).toBeNull();
    expect(here()).toBe('/');
  });

  it('applies several updates in the same tick without losing any', () => {
    const { result } = mount();
    act(() => {
      result.current.update({ liga: 'arg' });
      result.current.update({ estado: 'SCHEDULED' });
    });
    expect(here()).toBe('/?liga=arg&estado=proximos');
  });
});

describe('useUrlState: match detail and Back', () => {
  it('opens a match as its own history entry', () => {
    const { result } = mount();
    const before = window.history.length;
    act(() => result.current.openMatch('77'));

    expect(result.current.state.partido).toBe('77');
    expect(here()).toBe('/?partido=77');
    expect(window.history.length).toBe(before + 1);
    expect(window.history.state).toEqual({ modal: true });
  });

  it('Back closes a match it opened, and Forward reopens it', async () => {
    const { result } = mount();
    act(() => result.current.openMatch('77'));

    await back();
    expect(result.current.state.partido).toBeNull();
    expect(here()).toBe('/');

    await act(async () => {
      window.history.forward();
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(result.current.state.partido).toBe('77');
  });

  it('closeMatch steps Back instead of stacking entries when it opened the match', async () => {
    const { result } = mount();
    act(() => result.current.openMatch('77'));
    const during = window.history.length;

    act(() => result.current.closeMatch());
    await waitFor(() => expect(result.current.state.partido).toBeNull());
    expect(here()).toBe('/');
    expect(window.history.length).toBe(during); // entries are not removed by Back, but none were added
    expect(window.history.state).toBeNull(); // we are back on the entry before the match, not on a rewritten copy of it
  });

  it('closeMatch on a shared link just clears it (there is no entry of ours to go back to)', () => {
    go('/?partido=77');
    const { result } = mount();
    const before = window.history.length;
    act(() => result.current.closeMatch());

    expect(result.current.state.partido).toBeNull();
    expect(here()).toBe('/');
    expect(window.history.length).toBe(before);
  });

  it('closeMatch with nothing open does nothing', () => {
    const { result } = mount();
    const before = window.history.length;
    act(() => result.current.closeMatch());
    expect(window.history.length).toBe(before);
    expect(here()).toBe('/');
  });

  it('keeps the modal mark when the view changes while a match is open', () => {
    const { result } = mount();
    act(() => result.current.openMatch('77'));
    act(() => result.current.update({ estado: 'LIVE' }));
    expect(window.history.state).toEqual({ modal: true });
    expect(here()).toBe('/?estado=vivo&partido=77');
  });

  it('follows Back across view changes made by hand-edited history', async () => {
    const { result } = mount();
    act(() => result.current.update({ liga: 'pl' }));
    act(() => result.current.openMatch('5'));
    await back();
    expect(result.current.state).toMatchObject({ liga: 'pl', partido: null });
  });
});
