/* eslint-disable @jessie.js/safe-await-separator */
import { Fail, q } from '@agoric/assert';
import { kunser } from '@agoric/kmarshal';
import { makeQueue } from '@endo/stream';
import type { E } from '@endo/eventual-send';

import type { SwingsetController } from '../src/controller/controller.js';

const sink = () => {};

export const makeRunUtils = (
  controller: SwingsetController,
  log = (..._) => {},
) => {
  let cranksRun = 0;

  const mutex = makeQueue();

  mutex.put(controller.run());

  const runThunk = async <T extends () => any>(
    thunk: T,
  ): Promise<ReturnType<T>> => {
    try {
      // this promise for the last lock may fail
      await mutex.get();
    } catch {
      // noop because the result will resolve for the previous runMethod return
    }

    const thunkResult = await thunk();

    const result = controller.run().then(cranks => {
      cranksRun += cranks;
      log(`kernel ran ${cranks} cranks`);
      return thunkResult;
    });
    mutex.put(result.then(sink, sink));
    return result;
  };

  const queueAndRun = async (deliveryThunk, voidResult = false) => {
    log('queueAndRun at', cranksRun);

    const kpid = await runThunk(deliveryThunk);

    if (voidResult) {
      return undefined;
    }
    const status = controller.kpStatus(kpid);
    switch (status) {
      case 'fulfilled':
        return kunser(controller.kpResolution(kpid));
      case 'rejected':
        throw kunser(controller.kpResolution(kpid));
      case 'unresolved':
        throw Fail`unsettled value for ${q(kpid)}`;
      default:
        throw Fail`unknown promise status ${q(kpid)} ${q(status)}`;
    }
  };

  type EVProxy = typeof E & {
    sendOnly: (presence: unknown) => Record<string, (...args: any) => void>;
    vat: (name: string) => Record<string, (...args: any) => Promise<any>>;
  };

  // IMPORTANT WARNING TO USERS OF `EV`
  //
  // `EV` presents an abstraction that can be used (within tests only!) to get
  // much of the convenience with respect to messaging that `E` provides in
  // normal code.  However, this convenience comes with a huge caveat that all
  // users of this convenience feature MUST keep in mind.
  //
  // A test can drop messages onto the kernel's run queue using the
  // `controller.queueToVatRoot` and `controller.queueToVatObject` methods.
  // These are synchronous operations which merely place messages onto the run
  // queue without causing execution.  Execution, on the other hand, is
  // initiated by calling `controller.run`, which will cause the kernel to begin
  // delivering messages to vats from the run queue, continuing until the run
  // queue is exhausted.  HOWEVER, exhaustion of the run queue, which resolves
  // the result promise returned by the `run` call, IS NOT coupled in any causal
  // way to the resolution of result promises associated with the individual
  // queued messages themselves.  The status and resolution values of these
  // promises can be synchronously queried (by kpid) via the
  // `controller.kpStatus` and `controller.kpResolution` methods once `run` has
  // completed.  These queries are only available once the swingset has
  // reqlinquished agency, i.e., when the work initiated by `controller.run` has
  // finished.  At that point, nothing is going on inside the kernel, and
  // nothing WILL be going on inside the kernel until a subsequent call to
  // `controller.run`, which in turn will only have an effect if additional
  // messages have been placed on the kernel run queue in the meantime.  You MAY
  // NOT call `queueToVatRoot`, `queueToVatObject`, `kpStatus`, or
  // `kpResolution` while run queue execution, triggered by a call to `run`, is
  // in progress
  //
  // The functionality made available by `EV` looks similar to that provided by
  // `E`, but it is very much not.  When you send a message using `EV`, it
  // places the message onto the kernel run queue and then immediately invokes
  // `controller.run`.  When the result of `run` resolves, the kpid returned by
  // the message enqueueing operation is queried.  If at that time the promise
  // it identifies is resolved (or rejected), the value it was resolved (or
  // rejected) to is used as the result from the `EV` invocation.  However, if
  // it is still pending at that time, `EV` will throw an exception, which will
  // manifest as a rejection and your test will fail confusingly or abort.  This
  // means that if you initiate some operation via an `EV` message send, it must
  // complete within a single `run` cycle for it to be of any use to you.  This
  // is quite different from a message sent using `E`, which will return a
  // promise that can remain pending indefinitely, possibly to be settled by a
  // future message delivery.

  // @ts-expect-error cast, approximate
  const EV: EVProxy = presence =>
    new Proxy(harden({}), {
      get: (_t, method, _rx) => {
        const boundMethod = (...args) =>
          queueAndRun(() =>
            controller.queueToVatObject(presence, method, args),
          );
        return harden(boundMethod);
      },
    });
  EV.vat = vatName =>
    new Proxy(harden({}), {
      get: (_t, method, _rx) => {
        const boundMethod = (...args) =>
          queueAndRun(() => controller.queueToVatRoot(vatName, method, args));
        return harden(boundMethod);
      },
    });
  // @ts-expect-error xxx
  EV.sendOnly = presence =>
    new Proxy(harden({}), {
      get: (_t, method, _rx) => {
        const boundMethod = (...args) =>
          queueAndRun(
            () => controller.queueToVatObject(presence, method, args),
            true,
          );
        return harden(boundMethod);
      },
    });
  // @ts-expect-error xxx
  EV.get = presence =>
    new Proxy(harden({}), {
      get: (_t, pathElement, _rx) =>
        queueAndRun(() =>
          controller.queueToVatRoot('bootstrap', 'awaitVatObject', [
            presence,
            [pathElement],
          ]),
        ),
    });
  return harden({ runThunk, EV });
};
export type RunUtils = ReturnType<typeof makeRunUtils>;
