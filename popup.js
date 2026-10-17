async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function injectFile(tabId, filename) {
  console.log("[DuoGG popup] injecting:", filename);
  await chrome.scripting.executeScript({
    target: { tabId, allFrames: false },
    files: [filename],
  });
}

async function callFilter(tabId, role, tier, division, blacklist, winRateMin) {
  console.log("[DuoGG popup] calling filter with:", {
    role,
    tier,
    division,
    winRateMin,
    blacklistCount: blacklist?.length ?? 0,
  });

  await chrome.scripting.executeScript({
    target: { tabId, allFrames: false },
    func: async (r, t, d, bl, wr) => {
      if (typeof window.duoGGFilter === "function") {
        const result = await window.duoGGFilter(r, t, d, bl, wr);
        console.log("[DuoGG popup->page] duoGGFilter result:", result);
        return result;
      } else {
        console.warn("[DuoGG popup->page] duoGGFilter() not found on page.");
        return { error: "duoGGFilter_not_found" };
      }
    },
    args: [role, tier, division, blacklist, winRateMin],
  });
}

function loadSavedSelections() {
  const savedRole = localStorage.getItem("duogg_role") || "All Positions";
  const savedTier = localStorage.getItem("duogg_tier") || "All";
  const savedDivision = localStorage.getItem("duogg_division") || "IV";
  const savedWinRate = localStorage.getItem("duogg_winrate_min") || ""; // empty => no filter

  document.getElementById("roleSelect").value = savedRole;
  document.getElementById("tierSelect").value = savedTier;
  document.getElementById("divisionSelect").value = savedDivision;
  document.getElementById("winRateInput").value = savedWinRate;

  console.log("[DuoGG popup] loaded selections:", {
    savedRole,
    savedTier,
    savedDivision,
    savedWinRate,
  });
}

function saveSelections() {
  const role = document.getElementById("roleSelect").value;
  const tier = document.getElementById("tierSelect").value;
  const division = document.getElementById("divisionSelect").value;

  const winRateRaw = (document.getElementById("winRateInput").value || "").trim();
  // store as string ("" or "27")
  localStorage.setItem("duogg_role", role);
  localStorage.setItem("duogg_tier", tier);
  localStorage.setItem("duogg_division", division);
  localStorage.setItem("duogg_winrate_min", winRateRaw);

  const winRateMin = winRateRaw === "" ? null : Number(winRateRaw);

  console.log("[DuoGG popup] saved selections:", { role, tier, division, winRateMin });

  return { role, tier, division, winRateMin };
}

async function loadBlacklistNames() {
  try {
    const url = chrome.runtime.getURL("blacklist.txt");
    console.log("[DuoGG popup] loading blacklist from:", url);

    const res = await fetch(url);
    const text = await res.text();

    const names = text
    .split("\n")
    .map((line) => line.replace(/\r/g, ""))     // windows safe
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.replace(/\s+#.*$/, "").trim()) // remove inline comment
    .filter(Boolean);

    console.log("[DuoGG popup] blacklist loaded:", names);
    return names;
  } catch (e) {
    console.warn("[DuoGG popup] Failed to load blacklist.txt", e);
    return [];
  }
}

async function renderBlacklistTooltipNative(names) {
  const infoEl = document.getElementById("blacklistInfo");
  if (!infoEl) return;

  if (!names || names.length === 0) {
    infoEl.title = "Blacklist is empty.";
    return;
  }

  infoEl.title = "Blacklist:\n" + names.join("\n");
}

document.addEventListener("DOMContentLoaded", async () => {
  loadSavedSelections();

  const blacklist = await loadBlacklistNames();
  await renderBlacklistTooltipNative(blacklist);

  document.getElementById("roleSelect").addEventListener("change", saveSelections);
  document.getElementById("tierSelect").addEventListener("change", saveSelections);
  document.getElementById("divisionSelect").addEventListener("change", saveSelections);
  document.getElementById("winRateInput").addEventListener("change", saveSelections);

  document.getElementById("filterBtn").addEventListener("click", async () => {
    const { role, tier, division, winRateMin } = saveSelections();
    const tab = await getCurrentTab();

    console.log("[DuoGG popup] Filter clicked. Active tab:", { id: tab.id, url: tab.url });

    await injectFile(tab.id, "injects/inject_filter.js");
    await callFilter(tab.id, role, tier, division, blacklist, winRateMin);
  });
});
