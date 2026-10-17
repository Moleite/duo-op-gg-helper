(function () {
  // Avoid running in iframes / subframes
  if (window.top !== window) return;

  const ROLE_ARIA = {
    Top: "Top",
    Jungle: "Jungle",
    Mid: "Mid",
    ADC: "ADC",
    Supp: "Support",
    "All Positions": null,
  };

  const DIV_TO_NUM = { I: 1, II: 2, III: 3, IV: 4 };

  const CODE_PREFIX_TO_TIER = {
    I: "Iron",
    B: "Bronze",
    S: "Silver",
    G: "Gold",
    P: "Platinum",
    E: "Emerald",
    D: "Diamond",
  };

  function normalizeText(s) {
    return (s || "").trim();
  }
  function normalizeName(s) {
    return normalizeText(s).toLowerCase();
  }

  function getListItems() {
    return Array.from(document.querySelectorAll("li.MuiCollapse-root"));
  }

  // --- badge UI ---
  function ensureBadgeContainer() {
    let el = document.getElementById("duogg-helper-badges");
    if (el) return el;

    el = document.createElement("div");
    el.id = "duogg-helper-badges";
    el.style.position = "fixed";
    el.style.top = "12px";
    el.style.right = "12px";
    el.style.zIndex = "2147483647";
    el.style.display = "flex";
    el.style.flexDirection = "column";
    el.style.gap = "6px";
    el.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    el.style.fontSize = "12px";
    document.documentElement.appendChild(el);
    return el;
  }

  function setBadges(stats) {
    const c = ensureBadgeContainer();
    c.innerHTML = "";

    const make = (label, value) => {
      const b = document.createElement("div");
      b.style.background = "rgba(0,0,0,0.75)";
      b.style.border = "1px solid rgba(255,255,255,0.15)";
      b.style.color = "white";
      b.style.padding = "6px 8px";
      b.style.borderRadius = "8px";
      b.style.boxShadow = "0 6px 18px rgba(0,0,0,0.35)";
      b.style.backdropFilter = "blur(6px)";
      b.textContent = `${label}: ${value}`;
      return b;
    };

    c.appendChild(make("Blacklist removed", stats.blacklistedRemoved));
    c.appendChild(make("Duplicates removed", stats.duplicatesRemoved));
    c.appendChild(make("Same role removed", stats.sameRoleRemoved));
    c.appendChild(make("Looking for removed", stats.lookingForRemoved));
    c.appendChild(make("Rank removed", stats.rankRemoved));
    c.appendChild(make("WinRate removed", stats.winRateRemoved));
    c.appendChild(make("Remaining rows", stats.remaining));
  }

  // --- extractors ---
  function getSummonerName(listItem) {
    const a = listItem.querySelector('a[href*="/summoners/"]');
    if (a && normalizeText(a.textContent)) return normalizeText(a.textContent);

    const strong = listItem.querySelector("strong, b");
    if (strong && normalizeText(strong.textContent)) return normalizeText(strong.textContent);

    const spans = listItem.querySelectorAll("span");
    for (const sp of spans) {
      const txt = normalizeText(sp.textContent);
      if (txt && !/^[A-Z]{1,2}\d$/.test(txt) && txt.length >= 3) return txt;
    }
    return "";
  }

  function getRowRoleAria(listItem) {
    const svgs = listItem.querySelectorAll("svg.position-icon.w-6.h-6[aria-label]");
    for (const svg of svgs) {
      const cls = svg.getAttribute("class") || "";
      if (!cls.includes("looking-for")) return normalizeText(svg.getAttribute("aria-label"));
    }
    return "";
  }

  function getLookingForRoleArias(listItem) {
    const out = [];
    const svgs = listItem.querySelectorAll("svg.position-icon.w-6.h-6.looking-for[aria-label]");
    for (const svg of svgs) {
      const label = normalizeText(svg.getAttribute("aria-label"));
      if (label) out.push(label);
    }

    if (out.length === 0) {
      const all = listItem.querySelectorAll("svg.position-icon.w-6.h-6[aria-label]");
      const mainRole = getRowRoleAria(listItem);
      for (const svg of all) {
        const label = normalizeText(svg.getAttribute("aria-label"));
        const cls = svg.getAttribute("class") || "";
        if (label && (cls.includes("looking-for") || (mainRole && label !== mainRole))) out.push(label);
      }
    }

    return Array.from(new Set(out));
  }

  function lookingForHasPlus(listItem) {
    const plus = listItem.querySelector("span.text-gray-400");
    if (plus && normalizeText(plus.textContent) === "+") return true;

    return Array.from(listItem.querySelectorAll("span")).some((s) => normalizeText(s.textContent) === "+");
  }

  function getPlayerRankCode(listItem) {
    const spans = Array.from(listItem.querySelectorAll("span"));
    const codes = spans
      .map((s) => normalizeText(s.textContent))
      .filter(Boolean)
      .filter((t) => /^[A-Z]{1,2}\d$/.test(t));
    return codes[0] || "";
  }

  function parseRank(code) {
    const c = normalizeText(code);
    if (!c) return null;

    if (c === "M1") return { tier: "Master", div: null };
    if (c === "GM1") return { tier: "GM", div: null };
    if (c === "C1") return { tier: "Challenger", div: null };

    const m = c.match(/^([IBSGPED])([1-4])$/);
    if (!m) return null;

    return { tier: CODE_PREFIX_TO_TIER[m[1]], div: Number(m[2]) };
  }

  // NEW: WinRate extractor (robust to different classes)
  function getWinRatePercent(listItem) {
    // We want the *global* winrate column (not the champ winrates in "Recently played").
    // Reliable marker: the global winrate cell contains visible "xxW" and "xxL" spans.
    const allSpans = Array.from(listItem.querySelectorAll("span"));
  
    const wSpan = allSpans.find((s) => /^\d+\s*W$/i.test(normalizeText(s.textContent)));
    const lSpan = allSpans.find((s) => /^\d+\s*L$/i.test(normalizeText(s.textContent)));
  
    if (!wSpan || !lSpan) return null;
  
    // Find a common container and then the % located in the same winrate block
    const winRateBlock =
      wSpan.closest("div.w-38") ||
      wSpan.closest('div[class*="w-38"]') ||
      wSpan.closest("div");
  
    if (!winRateBlock) return null;
  
    // In that block, the global winrate is displayed as "65%" in a span.
    const pctSpan = Array.from(winRateBlock.querySelectorAll("span")).find((s) =>
      /^\d{1,3}%$/.test(normalizeText(s.textContent))
    );
  
    if (!pctSpan) return null;
  
    const val = Number(normalizeText(pctSpan.textContent).replace("%", ""));
    if (Number.isNaN(val)) return null;
  
    return val;
  }
  

  // --- structured removal logging ---
  function buildRowSnapshot(li) {
    return {
      summoner: getSummonerName(li) || "(unknown)",
      role: getRowRoleAria(li) || "",
      lookingFor: getLookingForRoleArias(li).join(", "),
      hasPlus: lookingForHasPlus(li),
      rankCode: getPlayerRankCode(li) || "",
      winRate: getWinRatePercent(li),
    };
  }

  function logRemoval(removedMap, reason, li, extra = {}) {
    const snap = buildRowSnapshot(li);
    const row = { reason, ...snap, ...extra };
    removedMap.all.push(row);
    (removedMap[reason] ??= []).push(row);
  }

  function printRemovalLogs(removedMap) {
    const reasons = ["blacklist", "duplicate", "sameRole", "lookingFor", "rank", "winRate"];
    console.groupCollapsed(`[DuoGG] Removed rows summary (${removedMap.all.length})`);
    for (const r of reasons) {
      if (removedMap[r] && removedMap[r].length) {
        console.groupCollapsed(`${r}: ${removedMap[r].length}`);
        console.table(removedMap[r]);
        console.groupEnd();
      }
    }
    console.groupCollapsed("all");
    console.table(removedMap.all);
    console.groupEnd();
    console.groupEnd();
  }

  // --- filters ---
  function removeBlacklisted(listItems, blacklistSet, removedMap) {
    let removed = 0;
    for (const li of listItems) {
      const name = normalizeName(getSummonerName(li));
      if (name && blacklistSet.has(name)) {
        logRemoval(removedMap, "blacklist", li, { match: name });
        li.remove();
        removed++;
      }
    }
    return removed;
  }

  function removeDuplicates(listItems, removedMap) {
    const seen = new Set();
    let removed = 0;

    for (const li of listItems) {
      const name = normalizeName(getSummonerName(li));
      if (!name) continue;

      if (seen.has(name)) {
        logRemoval(removedMap, "duplicate", li, { key: name });
        li.remove();
        removed++;
      } else {
        seen.add(name);
      }
    }
    return removed;
  }

  function removeSameRole(listItems, myRoleChoice, removedMap) {
    if (myRoleChoice === "All Positions") return 0;

    const expectedAria = ROLE_ARIA[myRoleChoice] || myRoleChoice;
    let removed = 0;

    for (const li of listItems) {
      const rowRole = getRowRoleAria(li);
      if (rowRole === expectedAria) {
        logRemoval(removedMap, "sameRole", li, { myRole: expectedAria });
        li.remove();
        removed++;
      }
    }
    return removed;
  }

  function filterByLookingFor(listItems, myRoleChoice, removedMap) {
    if (myRoleChoice === "All Positions") return 0;

    const myRoleAria = ROLE_ARIA[myRoleChoice] || myRoleChoice;
    const allLabels = new Set(["All Positions", "All"]);

    let removed = 0;
    for (const li of listItems) {
      if (lookingForHasPlus(li)) continue; // keep if "+"

      const looking = getLookingForRoleArias(li);
      const ok = looking.includes(myRoleAria) || looking.some((l) => allLabels.has(l));
      if (!ok) {
        logRemoval(removedMap, "lookingFor", li, { myRole: myRoleAria });
        li.remove();
        removed++;
      }
    }
    return removed;
  }

  // NEW: filter by win rate >= min (strictly less removed)
  function filterByWinRate(listItems, winRateMin, removedMap) {
    if (winRateMin == null || Number.isNaN(winRateMin)) return 0;

    let removed = 0;
    for (const li of listItems) {
      const wr = getWinRatePercent(li);

      // If we can't read it, keep it (fail-open)
      if (wr == null) continue;

      if (wr < winRateMin) {
        logRemoval(removedMap, "winRate", li, { winRateMin });
        li.remove();
        removed++;
      }
    }
    return removed;
  }

  // --- rank rules ---
  function ladderIndexForEmeraldDiamond(rank) {
    // E4(0), E3(1), E2(2), E1(3), D4(4), D3(5), D2(6), D1(7)
    if (!rank || rank.div == null) return null;
    if (rank.tier === "Emerald") return 4 - rank.div;
    if (rank.tier === "Diamond") return 8 - rank.div;
    return null;
  }

  function isWithin2DivsAcrossED(a, b) {
    const ia = ladderIndexForEmeraldDiamond(a);
    const ib = ladderIndexForEmeraldDiamond(b);
    return ia != null && ib != null && Math.abs(ia - ib) <= 2;
  }

  function isRankAllowed(myRank, otherRank) {
    if (!myRank || !otherRank) return false;

    const mt = myRank.tier;
    const ot = otherRank.tier;
    const inTiers = (...t) => t.includes(ot);

    if (mt === "Iron") return inTiers("Iron", "Bronze", "Silver");
    if (mt === "Bronze") return inTiers("Iron", "Bronze", "Silver");
    if (mt === "Silver") return inTiers("Iron", "Bronze", "Silver", "Gold");
    if (mt === "Gold") return inTiers("Silver", "Gold", "Platinum");
    if (mt === "Platinum") return inTiers("Gold", "Platinum", "Emerald");

    if (mt === "Emerald") {
      if (inTiers("Platinum", "Emerald")) return true;
      if (ot === "Diamond") return isWithin2DivsAcrossED(myRank, otherRank);
      return false;
    }

    if (mt === "Diamond") {
      if (myRank.div === 1) {
        if (ot === "Diamond") return otherRank.div === 1 || otherRank.div === 2 || otherRank.div === 3;
        return inTiers("Master", "GM", "Challenger");
      }
      if (ot === "Diamond" || ot === "Emerald") return isWithin2DivsAcrossED(myRank, otherRank);
      return false;
    }

    if (mt === "Master" || mt === "GM" || mt === "Challenger") {
      return inTiers("Diamond", "Master", "GM", "Challenger") && (ot !== "Diamond" || otherRank.div === 1);
    }

    return true;
  }

  function filterByRankCompatibility(listItems, myTier, myDivision, removedMap) {
    if (myTier === "All") return 0;

    const myRank = {
      tier: myTier,
      div: myTier === "Master" || myTier === "GM" || myTier === "Challenger" ? null : DIV_TO_NUM[myDivision] ?? 4,
    };

    let removed = 0;
    for (const li of listItems) {
      const otherRank = parseRank(getPlayerRankCode(li));
      if (!isRankAllowed(myRank, otherRank)) {
        logRemoval(removedMap, "rank", li, { myRank: `${myTier}${myRank.div ?? ""}` });
        li.remove();
        removed++;
      }
    }
    return removed;
  }

  // --- main ---
  window.duoGGFilter = async function (roleChoice, tierChoice, divisionChoice, blacklistArray, winRateMin) {
    const myRole = normalizeText(roleChoice) || "All Positions";
    const myTier = normalizeText(tierChoice) || "All";
    const myDiv = normalizeText(divisionChoice) || "IV";

    const blacklist = Array.isArray(blacklistArray) ? blacklistArray : [];
    const blacklistSet = new Set(blacklist.map(normalizeName));

    const wrMin = winRateMin == null ? null : Number(winRateMin);

    const removedMap = { all: [] };

    console.groupCollapsed("[DuoGG] Filter run");
    console.log("[DuoGG] inputs:", {
      myRole,
      myTier,
      myDiv,
      winRateMin: wrMin,
      blacklistCount: blacklist.length,
      blacklistPreview: blacklist.slice(0, 20),
    });

    let listItems = getListItems();
    console.log("[DuoGG] initial rows:", listItems.length);

    const blacklistedRemoved = removeBlacklisted(listItems, blacklistSet, removedMap);

    listItems = getListItems();
    const duplicatesRemoved = removeDuplicates(listItems, removedMap);

    listItems = getListItems();
    const sameRoleRemoved = removeSameRole(listItems, myRole, removedMap);

    listItems = getListItems();
    const lookingForRemoved = filterByLookingFor(listItems, myRole, removedMap);

    listItems = getListItems();
    const rankRemoved = filterByRankCompatibility(listItems, myTier, myDiv, removedMap);

    listItems = getListItems();
    const winRateRemoved = filterByWinRate(listItems, wrMin, removedMap);

    const remaining = getListItems().length;

    const stats = {
      blacklistedRemoved,
      duplicatesRemoved,
      sameRoleRemoved,
      lookingForRemoved,
      rankRemoved,
      winRateRemoved,
      remaining,
    };

    console.log("[DuoGG] stats:", stats);
    printRemovalLogs(removedMap);
    console.groupEnd();

    setBadges(stats);
    return stats;
  };
})();
