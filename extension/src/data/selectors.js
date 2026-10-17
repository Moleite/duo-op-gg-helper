// selectors.js - DOM selectors of duo.op.gg, single source
// Exposes: DuoGG.SELECTORS
//
// Each selector was read in DOM/1.0_FIND-DUO.html. The table of
// docs/generated/selectors.md is generated from this object (npm run gen):
// describe a selector here, never in the documentation.
//
// The site is a React application (Next.js, Tailwind, MUI). Tailwind classes
// describe the layout and change with each redesign. The selectors prefer
// ids, aria attributes and texts.
(function (D) {
  D.SELECTORS = {
    row: {
      css: 'li.MuiCollapse-root',
      what: 'Row of the post table (an <li> element that React manages).'
    },
    rowAnchor: {
      css: 'div[id^="partner-"]',
      what: 'Block of the row that carries the post id: `partner-<id>`, the same id as in the API.'
    },
    list: {
      css: 'ul',
      what: 'Parent list of the rows. Found from a row with closest(), never alone.'
    },
    summonerLink: {
      css: 'a[href*="/summoners/"]',
      what: 'op.gg link of the player: text = gameName, href = /summoners/<region>/<gameName>-<tagLine>.'
    },
    tagLine: {
      css: 'div.text-3xs.text-gray-500',
      what: 'Line under the name: `#<tagLine>`, then ` / Verified` for a verified account.'
    },
    verified: {
      css: 'img[alt="Verified"]',
      what: 'Riot badge of a verified account.'
    },
    position: {
      css: 'svg.position-icon:not(.looking-for)[aria-label]',
      what: 'Played position: aria-label Top, Jungle, Mid, ADC, Support or All Positions.'
    },
    lookingFor: {
      css: 'svg.position-icon.looking-for[aria-label]',
      what: 'Wanted positions. The site shows two at most.'
    },
    lookingForMore: {
      css: 'span.text-gray-400',
      what: 'Text `+` after the wanted position icons: the shown list is truncated.'
    },
    rankCode: {
      css: 'span.text-2xs.whitespace-nowrap',
      what: 'Rank code: E2, M1, UR (unranked).'
    },
    winRateBlock: {
      css: 'div.w-38',
      what: 'Win rate cell: spans `140W`, `136L` and the overall percentage `51%`.'
    },
    champion: {
      css: 'div.w-36 img[alt]',
      what: 'Recent champion: alt = name. The next span holds its win rate, the tooltip its games.'
    },
    kda: {
      css: 'div.w-20.text-3xs',
      what: 'KDA cell: average `9.7 / 8.1 / 6.7`, then the ratio in div.leading-4.'
    },
    opScore: {
      css: 'div.w-16.text-3xs',
      what: 'OpScore cell. div.w-16 alone also matches the position cell.'
    },
    note: {
      css: '[id$="-edit-note"]',
      what: 'Note of the post: full text in aria-label.'
    },
    posted: {
      css: 'div[title] p',
      what: 'Age: `20 mins ago`, `3 hrs ago`, `a day ago`. The title of the parent is a 12-hour time without AM or PM.'
    },
    accountName: {
      css: '[class*="DesktopGNB-module_user-btn"] [class*="DesktopGNB-module_text"]',
      what: 'Name of the signed-in op.gg account, in the site header. Absent when signed out.'
    },
    filterPosition: {
      css: 'ul.filters__position li.selected',
      what: 'Active native position filter: attribute value (ALL, TOP, JUNGLE, MID, BOTTOM, SUPPORT).'
    },
    filterQueue: {
      css: 'select[name="queue_type"]',
      what: 'Native queue: RANKED_SOLO, RANKED_FLEX, ARAM...'
    },
    filterTier: {
      css: 'select[name="tier"]',
      what: 'Native tier: ALL, UNRANKED, IRON... CHALLENGER.'
    },
    filterRegion: {
      css: 'input.MuiSelect-nativeInput',
      what: 'Native region (value `euw`). Fallback: region parameter of the URL.'
    },
    postButton: {
      text: 'Post & find Duo',
      css: 'button',
      what: 'Button of the site that opens the post form. Found by its text.'
    }
  };
})(globalThis.DuoGG);
