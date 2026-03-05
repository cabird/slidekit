// SlideKit Tests — Version Compatibility Check

import { describe, it, assert } from './test-runner.js';
import { checkVersionCompatibility, init, _resetForTests } from '../slidekit.js';

// =============================================================================
// checkVersionCompatibility() — direct unit tests
// =============================================================================

describe("checkVersionCompatibility()", () => {

  it("same version — ok", () => {
    const r = checkVersionCompatibility("0.2.1", "0.2.1");
    assert.equal(r.ok, true);
    assert.equal(r.warning, undefined);
    assert.equal(r.error, undefined);
  });

  it("0.2.0 min on 0.2.1 current — ok (patch bump)", () => {
    const r = checkVersionCompatibility("0.2.0", "0.2.1");
    assert.equal(r.ok, true);
    assert.equal(r.warning, undefined);
    assert.equal(r.error, undefined);
  });

  it("0.2.0 min on 1.0.0 current — ok (same compat group, 1.x superset of 0.x)", () => {
    const r = checkVersionCompatibility("0.2.0", "1.0.0");
    assert.equal(r.ok, true);
    assert.equal(r.warning, undefined);
    assert.equal(r.error, undefined);
  });

  it("1.0.0 min on 0.2.0 current — warning (current may lack features)", () => {
    const r = checkVersionCompatibility("1.0.0", "0.2.0");
    assert.equal(r.ok, true);
    assert.ok(r.warning, "expected a warning string");
    assert.ok(r.warning.includes("missing features"), "warning should mention missing features");
    assert.equal(r.error, undefined);
  });

  it("0.2.0 min on 0.1.0 current — warning (minor too low)", () => {
    const r = checkVersionCompatibility("0.2.0", "0.1.0");
    assert.equal(r.ok, true);
    assert.ok(r.warning, "expected a warning string");
    assert.ok(r.warning.includes("missing features"), "warning should mention missing features");
    assert.equal(r.error, undefined);
  });

  it("2.0.0 min on 3.0.0 current — error (major mismatch)", () => {
    const r = checkVersionCompatibility("2.0.0", "3.0.0");
    assert.equal(r.ok, false);
    assert.ok(r.error, "expected an error string");
    assert.ok(r.error.includes("major version mismatch"), "error should mention major version mismatch");
  });

  it("3.0.0 min on 2.0.0 current — error (major mismatch)", () => {
    const r = checkVersionCompatibility("3.0.0", "2.0.0");
    assert.equal(r.ok, false);
    assert.ok(r.error, "expected an error string");
    assert.ok(r.error.includes("major version mismatch"), "error should mention major version mismatch");
  });

  it("2.1.0 min on 2.0.0 current — warning (minor too low)", () => {
    const r = checkVersionCompatibility("2.1.0", "2.0.0");
    assert.equal(r.ok, true);
    assert.ok(r.warning, "expected a warning string");
    assert.ok(r.warning.includes("missing features"), "warning should mention missing features");
    assert.equal(r.error, undefined);
  });

  it("2.0.0 min on 2.3.0 current — ok (same major, higher minor)", () => {
    const r = checkVersionCompatibility("2.0.0", "2.3.0");
    assert.equal(r.ok, true);
    assert.equal(r.warning, undefined);
    assert.equal(r.error, undefined);
  });

  it("no minVersion — init does not check (always ok)", async () => {
    _resetForTests();
    // init() with no minVersion should succeed without version errors
    const cfg = await init();
    assert.ok(cfg, "init should return a config");
    assert.ok(cfg.slide, "config should have slide dimensions");
  });

});
