## crux-wrapper

A set of tools to make using a [Crux](https://github.com/redbadger/crux) application as if it was an npm package.
It brings:
- the possibility to `await` an event that was sent to your crux application
- a react `Provider` that will allow you to use your crux app as if it was a redux store
- the `is` function that allows easy typeguarding of payloads coming from the crux app

### Installation

```bash
npm install crux-wrapper
```

### Usage with react

The `react` package allows you to have access to 2 highly useful hooks:
- `useViewModel` to subscribe to the changes of the view model
- `useDispatch` to send events to the crux app

To setup the react provider, you first need to instantiate the `CoreProvider` like so

```typescript
import { CoreProvider } from "crux-wrapper/react";

// All the imports below are from your crux app. They are needed so that the crux-wrapper knows how to talk to your core
import init, * as core from "shared";
import { ViewModel, Request, } from "shared_types/types/core_types";
import { BincodeSerializer, BincodeDeserializer } from "shared_types/bincode/mod";

export function App() {
  const coreConfig = {
    init, // The wasm init function
    api: core, // the full API exposed by the generated wasm module (`process_event`, `handler_effec` and `view`)
    onEffect: async () => {/*...*/}, // the handler that will be passed all the effects the core needs to perform
    serializerConfig: {
      BincodeSerializer,
      BincodeDeserializer,
      ViewModel,
      Request,
    },
  };
  const initialState = new ViewModel(BigInt(0));
  return (
    <CoreProvider
      coreConfig={coreConfig}
      initialState={initialState}
      RenderEffect={EffectVariantRender}
    >
      <Counter />
    </CoreProvider>
  );
}
```

Once this is setup you can use the `useViewModel` and `useDispatch` hooks in all the children comopnents:

```typescript
function Counter() {
  const viewModel = useViewModel(); // Will subscribe to any changes to the viewmodel
  const dispatch = useDispatch();

  return (
    <div>
      <p>Count: {viewModel.count}</p>
      <button onClick={() => dispatch(new EventVariantIncrement())}>Increment</button>
      <button onClick={() => dispatch(new EventVariantDecrement())}>Decrement</button>
    </div>
  );
}
```

Being able to `await` for event allows you, for example, to use `useTransition` to show a loader when something is being processed

```typescript
import { useState, useTransition } from "react";

function Counter() {
  const viewModel = useViewModel();
  const dispatch = useDispatch();
  const [isPending, startTransition] = useTransition();

  if (isPending) {
    return "loading...";
  }

  return (
    <div>
      <p>Count: {viewModel.count}</p>
      <button
        onClick={() => {
          startTransition(() => dispatch(new EventVariantIncrement()));
        }}
        disabled={isPending}
      >
        Increment
      </button>
      <button
        onClick={() => {
          startTransition(() => dispatch(new EventVariantDecrement()));
        }}
        disabled={isPending}
      >
        Decrement
      </button>
    </div>
  );
}
```

### Usage with vanilla app

You can also use the `crux-wrapper` without react. By using the `wrap` function exposed, you get the benefit of being able to `await` events that are sent to your crux application.

```typescript
import { wrap } from "crux-wrapper";

const app = wrap({
  init,
  api: core,
  onEffect: async () => {/*...*/},
  serializerConfig: {
    BincodeSerializer,
    BincodeDeserializer,
    ViewModel,
    Request,
  },
});

await app.sendEvent(new EventVariantIncrement()); // Send an event to the crux app
// At this point you know that all the effects initiated by the event have been fully processed
```

### Typescript helper

When receiving payloads from the crux app, you often have to compare the class of the object to the prototypes of the classes you expect. Something along the lines of `paylaod instanceof CruxEventVariant`. This is cumbersome and doesn't provide correct type checks.

The `is` function bring both a nice way to check what a crux payload is + type narrowing for typescript application

Suppose you are using `crux_time` and you need to handle those 2 requests:
```rust
NotifyAt { id: TimerId, instant: Instant },
NotifyAfter { id: TimerId, duration: Duration },
```

This is how you'd do it with the `is` function:

```typescript
import { is } from "crux-wrapper";

switch(true) {
  case is(request, TimeRequestVariantNotifyAt):{
    const { id, instant } = request;
    //                     ^? TimeRequestVariantNotifyAt
  }
  case is(payload, TimeRequestVariantNotifyAfter):
    const { id, duration } = request;
    //                      ^? TimeRequestVariantNotifyAfter
}
```

For comparison this is what you'd get only using switch on the constructor and  `instanceof`:
Property 'instant' does not exist on type 'TimeRequest'

```typescript
switch(request.constructor) {
  case request instanceof TimeRequestVariantNotifyAt:{
    const { id, instant } = payload;
    // ❌ Property 'instant' does not exist on type 'TimeRequest'
  }
  case request instanceof TimeRequestVariantNotifyAfter:
    const { id, duration } = payload;
    // ❌ Property 'duration' does not exist on type 'TimeRequest'
}
```

# Running your crux app in a web worker

Web workers allow you to run scripts in background threads, which can be useful for offloading heavy computations or tasks that would otherwise block the main thread. In the context of a crux application, you can run your app logic in a web worker to keep the UI responsive.

This is how you would use the `wrap` (same for the `react` version) function to run your crux app in a web worker:

note: the following example is based on [comlink](https://github.com/GoogleChromeLabs/comlink) that I highly recommend for web workers.

```typescript
// webworker.ts
import type { Endpoint } from "comlink";
import { expose } from "comlink";
import init, { handle_response, process_event, view } from "core";
import wasmPath from "core/core_bg.wasm?url";

const api = {
    // The worker just has to define a function that will trigger the loading of the wasm module
    init: async () => {
      await init({ module_or_path: wasmPath })
    },
    process_event,
    handle_response,
    view,
};
export type CoreWorkerApi = typeof api;
expose(api, self as Endpoint);
```

```typescript
import { wrap } from "crux-wrapper";

import init, * as core from "shared";
import { ViewModel, Request, } from "shared_types/types/core_types";
import { BincodeSerializer, BincodeDeserializer } from "shared_types/bincode/mod";

const app = wrap({
  init: () => {
    const worker =  wrap<CoreWorkerApi>(
          new Worker(new URL("./worker.ts", import.meta.url), {
              type: "module",
          }),
      );
    // We call the init, to make sure the worker loads the wasm module
    await worker.init();
    return worker;
  },
  onEffect: async () => {/*...*/},
  serializerConfig: {
    BincodeSerializer,
    BincodeDeserializer,
    ViewModel,
    Request,
  },
});
```

Now with those changes, all your payload will go through the webworker and the crux core will be leaving the main thread alone.
