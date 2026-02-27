// SlideKit Test Runner — Minimal in-browser test framework
// Supports: describe(), it() (async), assert.equal/deepEqual/throws/within

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
  groups: [],
};

let currentGroup = null;

/**
 * Define a test group.
 */
export function describe(name, fn) {
  const group = { name, tests: [], passed: 0, failed: 0 };
  results.groups.push(group);
  const previousGroup = currentGroup;
  currentGroup = group;
  fn();
  currentGroup = previousGroup;
}

/**
 * Define a test case. Supports async functions.
 */
export function it(name, fn) {
  if (!currentGroup) {
    throw new Error("it() must be called inside describe()");
  }
  currentGroup.tests.push({ name, fn });
}

/**
 * Assertion utilities.
 */
export const assert = {
  equal(actual, expected, msg = "") {
    if (actual !== expected) {
      const detail = msg ? ` — ${msg}` : "";
      throw new Error(
        `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}${detail}`
      );
    }
  },

  deepEqual(actual, expected, msg = "") {
    const actualStr = JSON.stringify(actual, null, 0);
    const expectedStr = JSON.stringify(expected, null, 0);
    if (actualStr !== expectedStr) {
      const detail = msg ? ` — ${msg}` : "";
      throw new Error(
        `Deep equal failed${detail}\n  Expected: ${expectedStr}\n  Actual:   ${actualStr}`
      );
    }
  },

  throws(fn, msg = "") {
    let threw = false;
    try {
      fn();
    } catch (e) {
      threw = true;
    }
    if (!threw) {
      const detail = msg ? ` — ${msg}` : "";
      throw new Error(`Expected function to throw${detail}`);
    }
  },

  within(actual, expected, tolerance, msg = "") {
    if (typeof actual !== "number" || typeof expected !== "number") {
      throw new Error(
        `assert.within requires numbers, got ${typeof actual} and ${typeof expected}`
      );
    }
    const diff = Math.abs(actual - expected);
    if (diff > tolerance) {
      const detail = msg ? ` — ${msg}` : "";
      throw new Error(
        `Expected ${actual} to be within ${tolerance} of ${expected} (diff: ${diff})${detail}`
      );
    }
  },

  ok(value, msg = "") {
    if (!value) {
      const detail = msg ? ` — ${msg}` : "";
      throw new Error(`Expected truthy value, got ${JSON.stringify(value)}${detail}`);
    }
  },
};

/**
 * Run all registered tests and render results.
 */
export async function runTests() {
  const outputEl = document.getElementById("test-results");

  for (const group of results.groups) {
    console.group(`%c${group.name}`, "font-weight: bold; font-size: 14px;");

    for (const test of group.tests) {
      results.total++;
      try {
        await test.fn();
        group.passed++;
        results.passed++;
        console.log(`  %c PASS %c ${test.name}`, "background: #4caf50; color: white; padding: 1px 4px; border-radius: 2px;", "color: #4caf50;");
      } catch (err) {
        group.failed++;
        results.failed++;
        results.errors.push({
          group: group.name,
          test: test.name,
          error: err.message,
        });
        console.log(`  %c FAIL %c ${test.name}`, "background: #f44336; color: white; padding: 1px 4px; border-radius: 2px;", "color: #f44336;");
        console.error(`    ${err.message}`);
      }
    }

    console.groupEnd();
  }

  // Summary
  const summary = `Tests: ${results.passed}/${results.total} passed, ${results.failed} failed`;
  if (results.failed === 0) {
    console.log(`%c ${summary} `, "background: #4caf50; color: white; font-size: 16px; padding: 4px 8px; border-radius: 4px;");
  } else {
    console.log(`%c ${summary} `, "background: #f44336; color: white; font-size: 16px; padding: 4px 8px; border-radius: 4px;");
  }

  // Write results to DOM for Playwright to read
  if (outputEl) {
    let html = `<h2>${summary}</h2>`;
    html += `<div id="test-summary" data-total="${results.total}" data-passed="${results.passed}" data-failed="${results.failed}"></div>`;

    for (const group of results.groups) {
      html += `<div class="test-group">`;
      html += `<h3>${group.name} (${group.passed}/${group.tests.length})</h3>`;
      html += `<ul>`;
      for (const test of group.tests) {
        const err = results.errors.find(e => e.group === group.name && e.test === test.name);
        if (err) {
          html += `<li class="fail">FAIL: ${test.name}<pre>${escapeHtml(err.error)}</pre></li>`;
        } else {
          html += `<li class="pass">PASS: ${test.name}</li>`;
        }
      }
      html += `</ul></div>`;
    }

    outputEl.innerHTML = html;
  }

  return results;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
