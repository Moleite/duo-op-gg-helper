// style.js - Style sheets: rows of the site and panel
// Exposes: DuoGG.style.{ PAGE_CSS, PANEL_CSS, injectPage }
//
// PAGE_CSS targets the rows of the site through the attributes that rows.js
// sets: hiding a row does not remove it from the React DOM. PANEL_CSS lives
// in the shadow root of the panel: the CSS of the site does not reach it, and
// its own CSS does not reach the site.
(function (D) {
  const PAGE_CSS = [
    'li[data-duogg="hidden"]{display:none!important}',
    'li[data-duogg]{position:relative}',
    'li[data-duogg="dim"]{opacity:.38;transition:opacity .15s}',
    'li[data-duogg="dim"]:hover{opacity:.85}',
    'li[data-duogg="dim"]::after{content:attr(data-duogg-why);position:absolute;top:3px;right:40px;',
    'font:600 10px/16px system-ui,sans-serif;color:#fff;background:rgba(232,64,87,.9);padding:0 6px;',
    'border-radius:4px;pointer-events:none;z-index:3}',
    'ul[data-duogg-list]{display:flex;flex-direction:column}',
    '#duogg-more{margin-top:8px}',
    '#duogg-more .duogg-more-head{display:flex;justify-content:space-between;align-items:center;',
    'padding:6px 10px;background:#28282f;color:#9e9eb1;font:600 11px system-ui,sans-serif;border-radius:4px 4px 0 0}',
    '#duogg-more ul{display:flex;flex-direction:column;margin:0;padding:0;list-style:none}',
    '#duogg-more .duogg-x{display:flex;align-items:center;gap:8px;padding:6px 10px;background:#31313c;',
    'border-bottom:1px solid #1c1c1f;font:12px system-ui,sans-serif;color:#e4e4ea}',
    '#duogg-more .duogg-x a{color:#fff;text-decoration:none;font-weight:600}',
    '#duogg-more .duogg-x a:hover{text-decoration:underline;color:#00bba3}',
    '#duogg-more .duogg-x .c{white-space:nowrap}',
    '#duogg-more .duogg-x .note{flex:1;color:#b8b8c6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '#duogg-more .duogg-x .muted{color:#7b7a8e}',
    '#duogg-more .duogg-x .good{color:#00bba3}',
    '#duogg-more .duogg-x .bad{color:#e84057}',
    '#duogg-more .duogg-x button{background:#1c1c1f;color:#cfcfd6;border:1px solid #3a3a45;border-radius:4px;',
    'font:11px system-ui,sans-serif;padding:2px 6px;cursor:pointer}',
    '#duogg-more .duogg-x[data-duogg="hidden"]{display:none}',
    '#duogg-more .duogg-x[data-duogg="dim"]{opacity:.38}',
    '#duogg-more .duogg-x .why{color:#fff;background:rgba(232,64,87,.9);border-radius:4px;padding:0 6px;font-size:10px}'
  ].join('');

  const PANEL_CSS = `
:host{all:initial}
*{box-sizing:border-box;font-family:Roboto,system-ui,sans-serif}
.panel{position:fixed;z-index:2147483646;width:330px;max-height:calc(100vh - 24px);display:flex;flex-direction:column;
 background:#1c1c1f;color:#e4e4ea;border:1px solid #3a3a45;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.45);font-size:12px}
.head{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#31313c;border-radius:10px 10px 0 0;cursor:move;user-select:none}
.collapsed .head{border-radius:10px}
.title{font-weight:700;font-size:13px;color:#fff}
.title b{color:#00bba3}
.head select{flex:1;min-width:0}
.icon{background:none;border:none;color:#cfcfd6;cursor:pointer;font-size:14px;padding:2px 4px}
.icon:hover{color:#fff}
.tabs{display:flex;border-bottom:1px solid #3a3a45}
.tabs button{flex:1;background:none;border:none;color:#9e9eb1;padding:7px 0;cursor:pointer;font-size:12px;font-weight:600;border-bottom:2px solid transparent}
.tabs button.on{color:#fff;border-bottom-color:#00bba3}
.body{overflow:auto;padding:10px;display:flex;flex-direction:column;gap:10px}
.collapsed .tabs,.collapsed .body,.collapsed .foot{display:none}
.notice{padding:7px 10px;background:#f0b232;color:#1c1c1f;font-weight:700;font-size:11px;line-height:1.4}
.notice:empty{display:none}
.row{display:flex;align-items:center;gap:8px}
.row>label{flex:1;color:#cfcfd6}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
select,input,textarea{background:#2a2a33;color:#fff;border:1px solid #3a3a45;border-radius:6px;padding:5px 7px;font-size:12px;outline:none}
select:focus,input:focus,textarea:focus{border-color:#00bba3}
input[type=number]{width:70px}
input[type=checkbox]{accent-color:#00bba3;margin:0}
textarea{width:100%;min-height:64px;resize:vertical}
.rules{display:flex;flex-direction:column;gap:5px}
.rule{display:flex;align-items:center;gap:7px}
.rule .lbl{flex:1}
.count{min-width:24px;text-align:center;border-radius:9px;background:#2a2a33;color:#9e9eb1;font-size:11px;padding:0 6px}
.count.hit{background:rgba(232,64,87,.2);color:#ff8a9b}
.btn{background:#00bba3;color:#fff;font-weight:700;border:none;border-radius:6px;padding:7px 10px;cursor:pointer;font-size:12px}
.btn:hover{background:#00998c}
.btn:disabled{opacity:.5;cursor:default}
.btn.ghost{background:#2a2a33;color:#e4e4ea;border:1px solid #3a3a45;font-weight:600}
.btn.ghost:hover{border-color:#00bba3}
.btn.small{padding:3px 8px;font-weight:600}
.sec{display:flex;flex-direction:column;gap:6px}
.sec h4{margin:0;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#7b7a8e}
.stat{display:flex;justify-content:space-between;color:#cfcfd6}
.stat b{color:#fff}
.hint{color:#9e9eb1;font-size:11px;line-height:1.4}
.hint.ok{color:#00bba3}
.hint.warn{color:#f0b232}
.hint.err{color:#ff8a9b}
.foot{padding:6px 10px;border-top:1px solid #3a3a45;color:#7b7a8e;font-size:10px;display:flex;justify-content:space-between}
.list{display:flex;flex-direction:column;gap:4px;max-height:220px;overflow:auto}
.item{display:flex;gap:6px;align-items:flex-start;background:#26262d;border-radius:6px;padding:5px 7px}
.item .txt{flex:1;min-width:0}
.item .txt div{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kv{display:grid;grid-template-columns:80px 1fr;gap:3px 8px;color:#cfcfd6}
.kv span:nth-child(odd){color:#7b7a8e}
.tools{position:fixed;z-index:2147483645;display:none;gap:4px}
.tools button{background:#1c1c1f;color:#e4e4ea;border:1px solid #3a3a45;border-radius:5px;padding:2px 6px;cursor:pointer;font-size:12px}
.tools button:hover{border-color:#e84057}
`;

  function injectPage(doc) {
    const d = doc || document;
    if (d.getElementById('duogg-style')) return;
    const el = d.createElement('style');
    el.id = 'duogg-style';
    el.textContent = PAGE_CSS;
    (d.head || d.documentElement).appendChild(el);
  }

  D.style = { PAGE_CSS: PAGE_CSS, PANEL_CSS: PANEL_CSS, injectPage: injectPage };
})(globalThis.DuoGG);
