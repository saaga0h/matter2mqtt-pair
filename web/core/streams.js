import { from, fromEvent, map, tap, of } from "rxjs";
import { select } from "./dom.js";

export const fromSubmit = (selector) =>
  fromEvent(select(selector), "submit").pipe(
    tap((e) => e.preventDefault()),
    map((e) => new FormData(e.target)),
    map((formData) => Object.fromEntries(formData))
  );

// Helper for handling submit events that are already captured
export const submitHelper = (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  return of(Object.fromEntries(formData));
};

export const fromClick = (selector) => fromEvent(select(selector), "click");

export const fromKeypress = (selector) =>
  fromEvent(select(selector), "keypress");

export const fromKeydown = (selector) => fromEvent(select(selector), "keydown");

export const fromFocusout = (selector) =>
  fromEvent(select(selector), "focusout");

export const fromPromise = (promise) => from(promise);
