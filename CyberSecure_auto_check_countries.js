/*
12-08-2025 — TJH
Tested and working on Network Version 9.4.11


Purpose:
Quickly select a predefined list of allowed countries in the Ubiquiti Network Controller web interface.

How it works:
- Finds the relevant country checkboxes (including those inside iframes and open Shadow DOM).
- Simulates real user clicks to trigger React/DOM events.
- Falls back to directly setting `checked` and `aria-checked="true"` if needed.
- Prints a summary table in the browser console showing which countries were found and updated.

Before using:
1. Ensure the country of the IP address you will connect from is included in the allowed list.
2. In Region Blocking settings, make sure you select the **ALLOW** list.

Usage:
1. Go to **Settings > Region Blocking** and enable it.
2. Set both directions to **Allow**.
3. Click **Edit**.
4. Right-click any country, choose **Inspect Element**.
5. Paste this script into the browser’s Element-developer console and run it.
*/

(() => {
  const TARGET_NAMES = [
    "Austria", "Australia", "Aruba", "Belgium", "Caribbean Netherlands",
    "Canada", "Switzerland", "Curaçao", "Czech Republic", "Germany", "Denmark",
    "Spain", "Finland", "France", "United Kingdom", "Greece", "Croatia",
    "Hungary", "Ireland", "Isle of Man", "Iceland", "Italy", "Japan",
    "Liechtenstein", "Luxembourg", "Monaco", "Montenegro", "Malta", "Netherlands",
    "Norway", "New Zealand", "Poland", "Portugal", "Romania", "Serbia", "Sweden",
    "Slovenia", "Slovakia", "San Marino", "Suriname", "Sint Maarten",
    "U.S. Minor Outlying Islands", "United States", "Vatican City", "Bulgaria"
  ];
  const want = true;
  const unique = arr => [...new Set(arr)];
  const isElem = n => n && n.nodeType === 1;
  const queryAllDeep = (root, selector) => {
    const out = [];
    const stack = [root];
    while (stack.length) {
      const node = stack.pop();
      if (!node) continue;
      if (node.querySelectorAll) out.push(...node.querySelectorAll(selector));
      if (isElem(node) && node.shadowRoot) stack.push(node.shadowRoot);
      if (node.childNodes) node.childNodes.forEach(n => isElem(n) && stack.push(n));
    }
    return out;
  };
  const findLabelsDeep = (root) => queryAllDeep(root, "label");
  const fireAll = (el) => {
    ["pointerdown","mousedown","focus","click","mouseup","pointerup","input","change"]
      .forEach(type => el.dispatchEvent(new Event(type, {bubbles:true,cancelable:true})));
  };
  const forceChecked = (inp, value) => {
    const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked");
    if (desc && desc.set) desc.set.call(inp, value); else inp.checked = value;
    inp.setAttribute("aria-checked", String(value));
    inp.dispatchEvent(new Event("input", {bubbles:true}));
    inp.dispatchEvent(new Event("change", {bubbles:true}));
  };
  const trySetTrue = (inp) => {
    if (!inp) return {changed:false, how:"none"};
    const before = inp.checked || inp.getAttribute("aria-checked")==="true";
    if (before === want) return {changed:false, how:"already"};
    fireAll(inp);
    if (inp.checked === want || inp.getAttribute("aria-checked")==="true") return {changed:true, how:"input-click"};
    const label = inp.closest("label");
    if (label) {
      fireAll(label);
      if (inp.checked === want || inp.getAttribute("aria-checked")==="true") return {changed:true, how:"label-click"};
    }
    forceChecked(inp, want);
    return {changed: inp.checked === want || inp.getAttribute("aria-checked")==="true", how:"forced"};
  };
  const workInRoot = (root, where) => {
    const byLabel = [];
    findLabelsDeep(root).forEach(lbl => {
      const t = (lbl.textContent || "").toLowerCase();
      if (TARGET_NAMES.some(n => t.includes(n.toLowerCase()))) {
        const inp = lbl.querySelector('input[type="checkbox"][role="checkbox"]') ||
                    queryAllDeep(lbl, 'input[type="checkbox"][role="checkbox"]')[0];
        if (inp) byLabel.push(inp);
      }
    });
    const targets = unique(byLabel);
    let changed = 0;
    const details = [];
    targets.forEach(inp => {
      const name = inp.closest("label")?.textContent.trim().slice(0,50) || "(unknown)";
      const before = {checked: inp.checked, aria: inp.getAttribute("aria-checked")};
      const res = trySetTrue(inp);
      const after = {checked: inp.checked, aria: inp.getAttribute("aria-checked")};
      if (res.changed) changed++;
      details.push({where, name, before, after, how: res.how});
    });
    return {count: targets.length, changed, details};
  };
  const roots = [{node: document, where:"top"}];
  document.querySelectorAll("iframe").forEach((f, idx) => {
    try { if (f.contentDocument) roots.push({node: f.contentDocument, where:`iframe#${f.id||idx}`}); }
    catch {}
  });
  const summary = [];
  let totalTargets = 0, totalChanged = 0;
  roots.forEach(r => {
    const res = workInRoot(r.node, r.where);
    totalTargets += res.count;
    totalChanged += res.changed;
    summary.push(...res.details);
  });
  console.table(summary.map(s => ({
    scope: s.where,
    name: s.name,
    before: `${s.before.checked}/${s.before.aria}`,
    after:  `${s.after.checked}/${s.after.aria}`,
    how: s.how
  })));
  console.log(`Klaar. Targets gevonden: ${totalTargets}. Gewijzigd: ${totalChanged}.`);
})();
