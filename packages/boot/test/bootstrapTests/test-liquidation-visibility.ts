import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { TestFn } from 'ava';
import {
  LiquidationTestContext,
  makeLiquidationTestContext,
} from '../../tools/liquidation.ts';

const test = anyTest as TestFn<LiquidationTestContext>;

test.before(async t => {
  t.context = await makeLiquidationTestContext(t);
});

test('initial', t => {
  t.pass();
});
