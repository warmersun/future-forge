/*
Copyright © 2026 Warmer Sun Education, a sole proprietorship by Tamas Simon

This file is part of Future Forge.

Future Forge is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Future Forge is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Future Forge. If not, see <https://www.gnu.org/licenses/>.
*/
import assert from "node:assert/strict";
import test from "node:test";
import { applyCredits, priceProject } from "./neon-spend.mjs";

test("prices Scale compute and Launch storage the way the Neon guide does", () => {
  const scale = priceProject([
    {
      period_plan: "scale",
      consumption: [
        {
          timeframe_start: "2026-11-01T00:00:00Z",
          timeframe_end: "2026-11-02T00:00:00Z",
          metrics: [{ metric_name: "compute_unit_seconds", value: 500000 }],
        },
      ],
    },
  ]);
  assert.equal(scale.compute.toFixed(2), "30.83");

  const storage = priceProject([
    {
      period_plan: "launch",
      consumption: [
        {
          timeframe_start: "2026-11-01T00:00:00Z",
          timeframe_end: "2026-11-02T00:00:00Z",
          metrics: [{ metric_name: "root_branch_bytes_month", value: 3_360_000_000 }],
        },
      ],
    },
  ]);
  assert.equal(storage.rootStorage.toFixed(2), "1.18");
});

test("subtracts the Launch child-branch allowance before pricing extra branches", () => {
  const usage = priceProject([
    {
      period_plan: "launch",
      consumption: [
        {
          timeframe_start: "2026-11-01T00:00:00Z",
          timeframe_end: "2026-11-02T00:00:00Z",
          metrics: [{ metric_name: "extra_branches_month", value: 288 }],
        },
      ],
    },
  ]);
  assert.equal(usage.extraBranches.toFixed(2), "0.15");
});

test("gives each project 500 GB of public transfer before charging", () => {
  const usage = priceProject([
    {
      period_plan: "launch",
      consumption: [
        {
          timeframe_start: "2026-11-01T00:00:00Z",
          timeframe_end: "2026-11-02T00:00:00Z",
          metrics: [{ metric_name: "public_network_transfer_bytes", value: 600_000_000_000 }],
        },
      ],
    },
  ]);
  assert.equal(usage.publicTransfer.toFixed(2), "10.00");
});

test("draws a supplied credit balance before the monthly spending limit", () => {
  const covered = applyCredits({ usageUsd: 40, creditsUsd: 250, limitUsd: 10 });
  assert.equal(covered.charge, 0);
  assert.equal(covered.creditsAfter, 210);
  assert.equal(covered.status, "ok");

  const atLimit = applyCredits({ usageUsd: 260, creditsUsd: 250, limitUsd: 10 });
  assert.equal(atLimit.charge, 10);
  assert.equal(atLimit.creditsAfter, 0);
  assert.equal(atLimit.status, "over");

  const unknown = applyCredits({ usageUsd: 8, creditsUsd: null, limitUsd: 10 });
  assert.equal(unknown.charge, 8);
  assert.equal(unknown.status, "warn");
});
