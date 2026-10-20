// dom.js - Builds elements without innerHTML
// Exposes: DuoGG.h(tag, attrs, ...children), DuoGG.clear(el)
//
// Notes and names of other players are untrusted data: a text always goes
// through textContent. No module of extension/ parses HTML: innerHTML,
// DOMParser and their twins are refused by scripts/check.mjs.
(function (D) {
  function h(tag, attrs) {
    const el = document.createElement(tag);
    const a = attrs || {};
    Object.keys(a).forEach((k) => {
      const v = a[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked' || k === 'disabled' || k === 'selected') el[k] = !!v;
      else el.setAttribute(k, v === true ? '' : String(v));
    });
    for (let i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }

  function append(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach((x) => append(el, x)); return; }
    el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
    return el;
  }

  D.h = h;
  D.clear = clear;
})(globalThis.DuoGG);
