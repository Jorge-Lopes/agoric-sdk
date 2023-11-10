// @ts-check
/* global process */
/* eslint-disable @jessie.js/no-nested-await */
import anylogger from 'anylogger';

import { E } from '@endo/far';
import {
  buildMailbox,
  buildMailboxStateMap,
  buildTimer,
  buildBridge,
  swingsetIsInitialized,
  initializeSwingset,
  makeSwingsetController,
  loadBasedir,
  loadSwingsetConfigFile,
} from '@agoric/swingset-vat';
import { waitUntilQuiescent } from '@agoric/swingset-vat/src/lib-nodejs/waitUntilQuiescent.js';
import { assert, Fail } from '@agoric/assert';
import { openSwingStore } from '@agoric/swing-store';
import { BridgeId as BRIDGE_ID } from '@agoric/internal';
import { makeWithQueue } from '@agoric/internal/src/queue.js';
import * as ActionType from '@agoric/internal/src/action-types.js';

import { extractCoreProposalBundles } from '@agoric/deploy-script-support/src/extract-proposal.js';

import {
  makeDefaultMeterProvider,
  makeInboundQueueMetrics,
  exportKernelStats,
  makeSlogCallbacks,
} from './kernel-stats.js';

import {
  BeansPerBlockComputeLimit,
  BeansPerVatCreation,
  BeansPerXsnapComputron,
} from './sim-params.js';
import { parseParams } from './params.js';
import { makeQueue } from './helpers/make-queue.js';
import { exportStorage } from './export-storage.js';

const console = anylogger('launch-chain');
const blockManagerConsole = anylogger('block-manager');

/** @typedef {import('@agoric/swingset-vat').SwingSetConfig} SwingSetConfig */

/**
 * @typedef {object} CosmicSwingsetConfig
 * @property {import('@agoric/deploy-script-support/src/extract-proposal.js').ConfigProposal[]} [coreProposals]
 * @property {string[]} [clearStorageSubtrees] chain storage paths identifying
 *   roots of subtrees for which data should be deleted (including overlaps with
 *   exportStorageSubtrees, which are *not* preserved).
 * @property {string[]} [exportStorageSubtrees] chain storage paths identifying roots of subtrees
 *   for which data should be exported into bootstrap vat parameter `chainStorageEntries`
 *   (e.g., `exportStorageSubtrees: ['c.o']` might result in vatParameters including
 *   `chainStorageEntries: [ ['c.o', '"top"'], ['c.o.i'], ['c.o.i.n', '42'], ['c.o.w', '"moo"'] ]`).
 */

/**
 * Return the key in the reserved "host.*" section of the swing-store
 *
 * @param {string} path
 */
const getHostKey = path => `host.${path}`;

/**
 * @param {Map<*, *>} mailboxStorage
 * @param {undefined | ((dstID: string, obj: any) => any)} bridgeOutbound
 * @param {SwingStoreKernelStorage} kernelStorage
 * @param {string} vatconfig absolute path
 * @param {unknown} bootstrapArgs JSON-serializable data
 * @param {{}} env
 * @param {*} options
 */
export async function buildSwingset(
  mailboxStorage,
  bridgeOutbound,
  kernelStorage,
  vatconfig,
  bootstrapArgs,
  env,
  { debugName = undefined, slogCallbacks, slogSender },
) {
  const debugPrefix = debugName === undefined ? '' : `${debugName}:`;
  let config = await loadSwingsetConfigFile(vatconfig);
  if (config === null) {
    config = loadBasedir(vatconfig);
  }

  const mbs = buildMailboxStateMap(mailboxStorage);
  const timer = buildTimer();
  const mb = buildMailbox(mbs);
  config.devices = {
    mailbox: {
      sourceSpec: mb.srcPath,
    },
    timer: {
      sourceSpec: timer.srcPath,
    },
  };
  const deviceEndowments = {
    mailbox: { ...mb.endowments },
    timer: { ...timer.endowments },
  };

  let bridgeInbound;
  if (bridgeOutbound) {
    const bd = buildBridge(bridgeOutbound);
    config.devices.bridge = {
      sourceSpec: bd.srcPath,
    };
    deviceEndowments.bridge = { ...bd.endowments };
    bridgeInbound = bd.deliverInbound;
  }

  async function ensureSwingsetInitialized() {
    if (swingsetIsInitialized(kernelStorage)) {
      return;
    }
    if (!config) throw Fail`config not yet set`;
    const {
      coreProposals,
      clearStorageSubtrees,
      exportStorageSubtrees = [],
      ...swingsetConfig
    } = /** @type {SwingSetConfig & CosmicSwingsetConfig} */ (config);

    // XXX `initializeSwingset` does not have a default for the `bootstrap` property;
    // should we universally ensure its presence above?
    const bootVat =
      swingsetConfig.vats[swingsetConfig.bootstrap || 'bootstrap'];

    // Find the entrypoints for all the core proposals.
    if (coreProposals) {
      const { bundles, code } = await extractCoreProposalBundles(
        coreProposals,
        vatconfig, // for path resolution
      );
      swingsetConfig.bundles = { ...swingsetConfig.bundles, ...bundles };

      // Tell the bootstrap code how to run the core proposals.
      bootVat.parameters = { ...bootVat.parameters, coreProposalCode: code };
    }

    if (bridgeOutbound) {
      const batchChainStorage = (method, args) =>
        bridgeOutbound(BRIDGE_ID.STORAGE, { method, args });

      // Extract data from chain storage as [path, value?] pairs.
      const chainStorageEntries = exportStorage(
        batchChainStorage,
        exportStorageSubtrees,
        clearStorageSubtrees,
      );
      bootVat.parameters = { ...bootVat.parameters, chainStorageEntries };
    }

    swingsetConfig.pinBootstrapRoot = true;
    await initializeSwingset(swingsetConfig, bootstrapArgs, kernelStorage, {
      // @ts-expect-error debugPrefix? what's that?
      debugPrefix,
    });
  }
  await ensureSwingsetInitialized();
  const controller = await makeSwingsetController(
    kernelStorage,
    deviceEndowments,
    {
      env,
      slogCallbacks,
      slogSender,
    },
  );

  // We DON'T want to run the kernel yet, only when the application decides
  // (either on bootstrap block (0) or in endBlock).

  return { controller, mb, bridgeInbound, timer };
}

/**
 * @typedef {import('@agoric/swingset-vat').RunPolicy & {
 *   shouldRun(): boolean;
 *   remainingBeans(): bigint;
 * }} ChainRunPolicy
 */

/**
 * @typedef {object} BeansPerUnit
 * @property {bigint} blockComputeLimit
 * @property {bigint} vatCreation
 * @property {bigint} xsnapComputron
 */

/**
 * @param {BeansPerUnit} beansPerUnit
 * @returns {ChainRunPolicy}
 */
function computronCounter({
  [BeansPerBlockComputeLimit]: blockComputeLimit,
  [BeansPerVatCreation]: vatCreation,
  [BeansPerXsnapComputron]: xsnapComputron,
}) {
  assert.typeof(blockComputeLimit, 'bigint');
  assert.typeof(vatCreation, 'bigint');
  assert.typeof(xsnapComputron, 'bigint');
  let totalBeans = 0n;
  const shouldRun = () => totalBeans < blockComputeLimit;
  const remainingBeans = () => blockComputeLimit - totalBeans;

  const policy = harden({
    vatCreated() {
      totalBeans += vatCreation;
      return shouldRun();
    },
    crankComplete(details = {}) {
      assert.typeof(details, 'object');
      if (details.computrons) {
        assert.typeof(details.computrons, 'bigint');

        // TODO: xsnapComputron should not be assumed here.
        // Instead, SwingSet should describe the computron model it uses.
        totalBeans += details.computrons * xsnapComputron;
      }
      return shouldRun();
    },
    crankFailed() {
      const failedComputrons = 1000000n; // who knows, 1M is as good as anything
      totalBeans += failedComputrons * xsnapComputron;
      return shouldRun();
    },
    emptyCrank() {
      return true;
    },
    shouldRun,
    remainingBeans,
  });
  return policy;
}

function neverStop() {
  return harden({
    vatCreated: () => true,
    crankComplete: () => true,
    crankFailed: () => true,
    emptyCrank: () => true,
  });
}

export async function launch({
  actionQueueStorage,
  highPriorityQueueStorage,
  kernelStateDBDir,
  mailboxStorage,
  clearChainSends,
  replayChainSends,
  bridgeOutbound,
  makeInstallationPublisher,
  vatconfig,
  argv,
  env = process.env,
  debugName = undefined,
  verboseBlocks = false,
  metricsProvider = makeDefaultMeterProvider(),
  slogSender,
  swingStoreTraceFile,
  swingStoreExportCallback,
  keepSnapshots,
  afterCommitCallback = async () => ({}),
}) {
  console.info('Launching SwingSet kernel');

  // The swingStore's exportCallback is synchronous, however we allow the
  // callback provided to launch-chain to be asynchronous. The callbacks are
  // invoked sequentially like if they were awaited, and the block manager
  // synchronizes before finishing END_BLOCK
  let pendingSwingStoreExport = Promise.resolve();
  const swingStoreExportCallbackWithQueue =
    swingStoreExportCallback && makeWithQueue()(swingStoreExportCallback);
  const swingStoreExportSyncCallback =
    swingStoreExportCallback &&
    (updates => {
      pendingSwingStoreExport = swingStoreExportCallbackWithQueue(updates);
    });

  const { kernelStorage, hostStorage } = openSwingStore(kernelStateDBDir, {
    traceFile: swingStoreTraceFile,
    exportCallback: swingStoreExportSyncCallback,
    keepSnapshots,
  });
  const { kvStore, commit } = hostStorage;

  /** @typedef {ReturnType<typeof makeQueue<{context: any, action: any}>>} InboundQueue */
  /** @type {InboundQueue} */
  const actionQueue = makeQueue(actionQueueStorage);
  /** @type {InboundQueue} */
  const highPriorityQueue = makeQueue(highPriorityQueueStorage);

  // Not to be confused with the gas model, this meter is for OpenTelemetry.
  const metricMeter = metricsProvider.getMeter('ag-chain-cosmos');
  const slogCallbacks = makeSlogCallbacks({
    metricMeter,
  });

  console.debug(`buildSwingset`);
  const { controller, mb, bridgeInbound, timer } = await buildSwingset(
    mailboxStorage,
    bridgeOutbound,
    kernelStorage,
    vatconfig,
    argv,
    env,
    {
      debugName,
      slogCallbacks,
      slogSender,
    },
  );

  /** @type {{publish: (value: unknown) => Promise<void>} | undefined} */
  let installationPublisher;

  // Artificially create load if set.
  const END_BLOCK_SPIN_MS = env.END_BLOCK_SPIN_MS
    ? parseInt(env.END_BLOCK_SPIN_MS, 10)
    : 0;

  const inboundQueueMetrics = makeInboundQueueMetrics(
    actionQueue.size() + highPriorityQueue.size(),
  );
  const { crankScheduler } = exportKernelStats({
    controller,
    metricMeter,
    // @ts-expect-error Type 'Logger<BaseLevels>' is not assignable to type 'Console'.
    log: console,
    inboundQueueMetrics,
  });

  async function bootstrapBlock(_blockHeight, blockTime) {
    // We need to let bootstrap know of the chain time. The time of the first
    // block may be the genesis time, or the block time of the upgrade block.
    timer.poll(blockTime);
    // This is before the initial block, we need to finish processing the
    // entire bootstrap before opening for business.
    const policy = neverStop();
    await crankScheduler(policy);
  }

  async function saveChainState() {
    // Save the mailbox state.
    await mailboxStorage.commit();
  }

  async function saveOutsideState(blockHeight) {
    const chainSends = await clearChainSends();
    kvStore.set(getHostKey('height'), `${blockHeight}`);
    kvStore.set(getHostKey('chainSends'), JSON.stringify(chainSends));

    await commit();
  }

  async function deliverInbound(sender, messages, ack, inboundNum) {
    Array.isArray(messages) || Fail`inbound given non-Array: ${messages}`;
    controller.writeSlogObject({
      type: 'cosmic-swingset-deliver-inbound',
      inboundNum,
      sender,
      count: messages.length,
    });
    if (!mb.deliverInbound(sender, messages, ack)) {
      return;
    }
    console.debug(`mboxDeliver:   ADDED messages`);
  }

  async function doBridgeInbound(source, body, inboundNum) {
    controller.writeSlogObject({
      type: 'cosmic-swingset-bridge-inbound',
      inboundNum,
      source,
    });
    if (!bridgeInbound) throw Fail`bridgeInbound undefined`;
    // console.log(`doBridgeInbound`);
    // the inbound bridge will push messages onto the kernel run-queue for
    // delivery+dispatch to some handler vat
    bridgeInbound(source, body);
  }

  async function installBundle(bundleSource) {
    let bundle;
    try {
      bundle = JSON.parse(bundleSource);
    } catch (e) {
      blockManagerConsole.warn('INSTALL_BUNDLE warn:', e);
      return;
    }
    harden(bundle);

    const error = await controller.validateAndInstallBundle(bundle).then(
      () => null,
      (/** @type {unknown} */ errorValue) => errorValue,
    );

    const { endoZipBase64Sha512 } = bundle;

    if (installationPublisher === undefined) {
      return;
    }

    await installationPublisher.publish(
      harden({
        endoZipBase64Sha512,
        installed: error === null,
        error,
      }),
    );
  }

  function provideInstallationPublisher() {
    if (
      installationPublisher === undefined &&
      makeInstallationPublisher !== undefined
    ) {
      installationPublisher = makeInstallationPublisher();
    }
  }

  let savedHeight = Number(kvStore.get(getHostKey('height')) || 0);
  let savedBeginHeight = Number(
    kvStore.get(getHostKey('beginHeight')) || savedHeight,
  );
  let runTime = 0;
  let chainTime;
  let saveTime = 0;
  let endBlockFinish = 0;
  let blockParams;
  let decohered;
  let afterCommitWorkDone = Promise.resolve();

  async function performAction(action, inboundNum) {
    // blockManagerConsole.error('Performing action', action);
    let p;
    switch (action.type) {
      case ActionType.DELIVER_INBOUND: {
        p = deliverInbound(
          action.peer,
          action.messages,
          action.ack,
          inboundNum,
        );
        break;
      }

      case ActionType.VBANK_BALANCE_UPDATE: {
        p = doBridgeInbound(BRIDGE_ID.BANK, action, inboundNum);
        break;
      }

      case ActionType.IBC_EVENT: {
        p = doBridgeInbound(BRIDGE_ID.DIBC, action, inboundNum);
        break;
      }

      case ActionType.PLEASE_PROVISION: {
        p = doBridgeInbound(BRIDGE_ID.PROVISION, action, inboundNum);
        break;
      }

      case ActionType.INSTALL_BUNDLE: {
        p = installBundle(action.bundle);
        break;
      }

      case ActionType.CORE_EVAL: {
        p = doBridgeInbound(BRIDGE_ID.CORE, action, inboundNum);
        break;
      }

      case ActionType.WALLET_ACTION: {
        p = doBridgeInbound(BRIDGE_ID.WALLET, action, inboundNum);
        break;
      }

      case ActionType.WALLET_SPEND_ACTION: {
        p = doBridgeInbound(BRIDGE_ID.WALLET, action, inboundNum);
        break;
      }

      default: {
        Fail`${action.type} not recognized`;
      }
    }
    return p;
  }

  async function runKernel(runPolicy, blockHeight, blockTime) {
    let runNum = 0;
    async function runSwingset() {
      const initialBeans = runPolicy.remainingBeans();
      controller.writeSlogObject({
        type: 'cosmic-swingset-run-start',
        blockHeight,
        runNum,
        initialBeans,
      });
      // TODO: crankScheduler does a schedulerBlockTimeHistogram thing
      // that needs to be revisited, it used to be called once per
      // block, now it's once per processed inbound queue item
      await crankScheduler(runPolicy);
      const remainingBeans = runPolicy.remainingBeans();
      controller.writeSlogObject({
        type: 'kernel-stats',
        stats: controller.getStats(),
      });
      controller.writeSlogObject({
        type: 'cosmic-swingset-run-finish',
        blockHeight,
        runNum,
        remainingBeans,
        usedBeans: initialBeans - remainingBeans,
      });
      runNum += 1;
      return runPolicy.shouldRun();
    }

    /**
     * Process as much as we can from an inbound queue, which contains
     * first the old actions not previously processed, followed by actions
     * newly added, running the kernel to completion after each.
     *
     * @param {InboundQueue} inboundQueue
     */
    async function processActions(inboundQueue) {
      let keepGoing = true;
      for (const { action, context } of inboundQueue.consumeAll()) {
        const inboundNum = `${context.blockHeight}-${context.txHash}-${context.msgIdx}`;
        inboundQueueMetrics.decStat();
        // eslint-disable-next-line no-await-in-loop
        await performAction(action, inboundNum);
        // eslint-disable-next-line no-await-in-loop
        keepGoing = await runSwingset();
        if (!keepGoing) {
          // any leftover actions will remain on the inbound queue for possible
          // processing in the next block
          break;
        }
      }
      return keepGoing;
    }

    // First, complete leftover work, if any
    let keepGoing = await runSwingset();
    if (!keepGoing) return;

    // Then, process as much as we can from the priorityQueue.
    keepGoing = await processActions(highPriorityQueue);
    if (!keepGoing) return;

    // Then, update the timer device with the new external time, which might
    // push work onto the kernel run-queue (if any timers were ready to wake).
    const addedToQueue = timer.poll(blockTime);
    console.debug(
      `polled; blockTime:${blockTime}, h:${blockHeight}; ADDED =`,
      addedToQueue,
    );
    // We must run the kernel even if nothing was added since the kernel
    // only notes state exports and updates consistency hashes when attempting
    // to perform a crank.
    keepGoing = await runSwingset();
    if (!keepGoing) return;

    // Finally, process as much as we can from the actionQueue.
    await processActions(actionQueue);
  }

  async function endBlock(blockHeight, blockTime, params) {
    // This is called once per block, during the END_BLOCK event, and
    // only when we know that cosmos is in sync (else we'd skip kernel
    // execution).

    // First, record new actions (bridge/mailbox/etc events that cosmos
    // added up for delivery to swingset) into our inboundQueue metrics
    inboundQueueMetrics.updateLength(
      actionQueue.size() + highPriorityQueue.size(),
    );

    // make a runPolicy that will be shared across all cycles
    const runPolicy = computronCounter(params.beansPerUnit);

    await runKernel(runPolicy, blockHeight, blockTime);

    if (END_BLOCK_SPIN_MS) {
      // Introduce a busy-wait to artificially put load on the chain.
      const startTime = Date.now();
      while (Date.now() - startTime < END_BLOCK_SPIN_MS);
    }
  }

  /**
   * @template T
   * @param {string} type
   * @param {() => Promise<T>} fn
   */
  async function processAction(type, fn) {
    const start = Date.now();
    const finish = res => {
      // blockManagerConsole.error(
      //   'Action',
      //   action.type,
      //   action.blockHeight,
      //   'is done!',
      // );
      runTime += Date.now() - start;
      return res;
    };

    const p = fn();
    // Just attach some callbacks, but don't use the resulting neutered result
    // promise.
    void E.when(p, finish, e => {
      // None of these must fail, and if they do, log them verbosely before
      // returning to the chain.
      blockManagerConsole.error(type, 'error:', e);
      finish();
    });
    // Return the original promise so that the caller gets the original
    // resolution or rejection.
    return p;
  }

  function blockNeedsExecution(blockHeight) {
    if (savedHeight === 0) {
      // 0 is the default we use when the DB is empty, so we've only executed
      // the bootstrap block but no others. The first non-bootstrap block can
      // have an arbitrary height (the chain may not start at 1), but since the
      // bootstrap block doesn't commit (and doesn't have a begin/end) there is
      // no risk of hangover inconsistency for the first block, and it can
      // always be executed.
      return true;
    }

    if (blockHeight === savedHeight + 1) {
      // execute the next block
      return true;
    }

    if (blockHeight === savedHeight) {
      // we have already committed this block, so "replay" by not executing
      // (but returning all the results from the last time)
      return false;
    }

    // we're being asked to rewind by more than one block, or execute something
    // more than one block in the future, neither of which we can accommodate.
    // Keep throwing forever.
    decohered = Error(
      // TODO unimplemented
      `Unimplemented reset state from ${savedHeight} to ${blockHeight}`,
    );
    throw decohered;
  }

  function saveBeginHeight(blockHeight) {
    savedBeginHeight = blockHeight;
    kvStore.set(getHostKey('beginHeight'), `${savedBeginHeight}`);
  }

  async function afterCommit(blockHeight, blockTime) {
    await waitUntilQuiescent()
      .then(afterCommitCallback)
      .then((afterCommitStats = {}) => {
        controller.writeSlogObject({
          type: 'cosmic-swingset-after-commit-stats',
          blockHeight,
          blockTime,
          ...afterCommitStats,
        });
      });
  }

  // Handle block related actions
  // Some actions that are integration specific may be handled by the caller
  // For example SWING_STORE_EXPORT is handled in chain-main.js
  async function doBlockingSend(action) {
    await null;
    // blockManagerConsole.warn(
    //   'FIGME: blockHeight',
    //   action.blockHeight,
    //   'received',
    //   action.type,
    // );
    switch (action.type) {
      case ActionType.AG_COSMOS_INIT: {
        const { isBootstrap, upgradePlan, blockTime } = action;
        // This only runs for the very first block on the chain.
        if (isBootstrap) {
          verboseBlocks && blockManagerConsole.info('block bootstrap');
          (savedHeight === 0 && savedBeginHeight === 0) ||
            Fail`Cannot run a bootstrap block at height ${savedHeight}`;
          const blockHeight = 0;
          const runNum = 0;
          controller.writeSlogObject({
            type: 'cosmic-swingset-bootstrap-block-start',
            blockTime,
          });
          controller.writeSlogObject({
            type: 'cosmic-swingset-run-start',
            blockHeight,
            runNum,
          });
          // Start a block transaction, but without changing state
          // for the upcoming begin block check
          saveBeginHeight(savedBeginHeight);
          await processAction(action.type, async () =>
            bootstrapBlock(blockHeight, blockTime),
          );
          controller.writeSlogObject({
            type: 'cosmic-swingset-run-finish',
            blockHeight,
            runNum,
          });
          controller.writeSlogObject({
            type: 'cosmic-swingset-bootstrap-block-finish',
            blockTime,
          });
        }
        if (upgradePlan) {
          const blockHeight = upgradePlan.height;
          if (blockNeedsExecution(blockHeight)) {
            controller.writeSlogObject({
              type: 'cosmic-swingset-upgrade-start',
              blockHeight,
              blockTime,
              upgradePlan,
            });
            // TODO: Process upgrade plan
            controller.writeSlogObject({
              type: 'cosmic-swingset-upgrade-finish',
              blockHeight,
              blockTime,
            });
          }
        }
        return true;
      }

      case ActionType.COMMIT_BLOCK: {
        const { blockHeight, blockTime } = action;
        verboseBlocks &&
          blockManagerConsole.info('block', blockHeight, 'commit');
        if (blockHeight !== savedHeight) {
          throw Error(
            `Committed height ${blockHeight} does not match saved height ${savedHeight}`,
          );
        }

        controller.writeSlogObject({
          type: 'cosmic-swingset-commit-block-start',
          blockHeight,
          blockTime,
        });

        // Save the kernel's computed state just before the chain commits.
        const start2 = Date.now();
        await saveOutsideState(savedHeight);
        saveTime = Date.now() - start2;

        blockParams = undefined;

        blockManagerConsole.debug(
          `wrote SwingSet checkpoint [run=${runTime}ms, chainSave=${chainTime}ms, kernelSave=${saveTime}ms]`,
        );

        return undefined;
      }

      case ActionType.AFTER_COMMIT_BLOCK: {
        const { blockHeight, blockTime } = action;

        const fullSaveTime = Date.now() - endBlockFinish;

        controller.writeSlogObject({
          type: 'cosmic-swingset-commit-block-finish',
          blockHeight,
          blockTime,
          saveTime: saveTime / 1000,
          chainTime: chainTime / 1000,
          fullSaveTime: fullSaveTime / 1000,
        });

        afterCommitWorkDone = afterCommit(blockHeight, blockTime);

        return undefined;
      }

      case ActionType.BEGIN_BLOCK: {
        const { blockHeight, blockTime, params } = action;
        blockParams = parseParams(params);
        verboseBlocks &&
          blockManagerConsole.info('block', blockHeight, 'begin');
        runTime = 0;

        if (blockNeedsExecution(blockHeight)) {
          if (savedBeginHeight === blockHeight) {
            decohered = Error(
              `Inconsistent committed state. Block ${blockHeight} had already began execution`,
            );
            throw decohered;
          }
          // Start a block transaction, recording which block height is executed
          saveBeginHeight(blockHeight);
        }

        controller.writeSlogObject({
          type: 'cosmic-swingset-begin-block',
          blockHeight,
          blockTime,
          inboundQueueStats: inboundQueueMetrics.getStats(),
        });

        return undefined;
      }

      case ActionType.END_BLOCK: {
        const { blockHeight, blockTime } = action;
        controller.writeSlogObject({
          type: 'cosmic-swingset-end-block-start',
          blockHeight,
          blockTime,
        });

        blockParams || Fail`blockParams missing`;

        if (!blockNeedsExecution(blockHeight)) {
          // We are reevaluating, so do not do any work, and send exactly the
          // same downcalls to the chain.
          //
          // This is necessary only after a restart when Tendermint is reevaluating the
          // block that was interrupted and not committed.
          //
          // We assert that the return values are identical, which allows us to silently
          // clear the queue.
          try {
            replayChainSends();
          } catch (e) {
            // Very bad!
            decohered = e;
            throw e;
          }
        } else {
          if (blockHeight !== savedBeginHeight) {
            decohered = Error(
              `Inconsistent committed state. Trying to end block ${blockHeight}, expected began block ${savedBeginHeight}`,
            );
            throw decohered;
          }

          // And now we actually process the queued actions down here, during
          // END_BLOCK, but still reentrancy-protected.

          provideInstallationPublisher();

          await processAction(action.type, async () =>
            endBlock(blockHeight, blockTime, blockParams),
          );

          // We write out our on-chain state as a number of chainSends.
          const start = Date.now();
          await saveChainState();
          chainTime = Date.now() - start;

          // Advance our saved state variables.
          savedHeight = blockHeight;
        }
        controller.writeSlogObject({
          type: 'cosmic-swingset-end-block-finish',
          blockHeight,
          blockTime,
          inboundQueueStats: inboundQueueMetrics.getStats(),
        });

        endBlockFinish = Date.now();

        return undefined;
      }

      default: {
        throw Fail`Unrecognized action ${action}; are you sure you didn't mean to queue it?`;
      }
    }
  }
  async function blockingSend(action) {
    if (decohered) {
      throw decohered;
    }

    await afterCommitWorkDone;

    return doBlockingSend(action).finally(() => pendingSwingStoreExport);
  }

  async function shutdown() {
    return controller.shutdown();
  }

  function writeSlogObject(obj) {
    controller.writeSlogObject(obj);
  }

  return {
    blockingSend,
    shutdown,
    writeSlogObject,
    savedHeight,
    savedChainSends: JSON.parse(kvStore.get(getHostKey('chainSends')) || '[]'),
  };
}
