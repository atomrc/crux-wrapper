# crux-wrapper

A set of tools to make using a [Crux](https://github.com/redbadger/crux) application as if it was an npm package.
It brings:

- the possibility to `await` an event that was sent to your crux application
- a react `Provider` that will allow you to use your crux app as if it was a redux store
- the `is` function that allows easy typeguarding of payloads coming from the crux app

Table of content:

- [crux-wrapper](#crux-wrapper)
  - [Installation](#installation)
  - [Usage with react](#usage-with-react)
  - [Typescript helper](#typescript-helper)
  - [Running your crux app in a web worker](#running-your-crux-app-in-a-web-worker)
  - [Usage in a VanillaJS app](#usage-in-a-vanillajs-app)
  - [Testing](#testing)
  - [Logs](#logs)

## Installation

```bash
npm install crux-wrapper
```

## Usage with react

The `react` package allows you to have access to 2 highly useful hooks:

- `useViewModel` to subscribe to the changes of the view model
- `useDispatch` to send events to the crux app

To setup the react provider, you first need to instantiate the `CoreProvider` like so

```tsx
import { CoreProvider } from "crux-wrapper/react";

// All the imports below are from your crux app. They are needed so that the crux-wrapper knows how to talk to your core
import init, * as core from "shared";
import { ViewModel, Request } from "shared_types/types/core_types";
import {
  BincodeSerializer,
  BincodeDeserializer,
} from "shared_types/bincode/mod";

// Will tell typescript what the final view model is. It will allow correctly typing the useViewModel hook
declare module "crux-wrapper/react" {
  type CoreViewModel = ViewModel;
}

export function App() {
  const coreConfig = {
    // The wasm init function that will expose your core's API
    init: () => init().then(() => core),
    // the handler that will be passed all the effects the core needs to perform
    onEffect: async (
      effect,
      {
        // send a response to the core. This function is tied to the effect send, you don't need to pass the effect id. This function could also be used for streaming responses back
        respond,
        // to send a new event to the core (not a response)
        send,
        // get the latest view model
        view,
      },
    ) => {
      /*...*/
    },
    serializerConfig: {
      BincodeSerializer,
      BincodeDeserializer,
      ViewModel,
      Request,
    },
  };

  return (
    <CoreProvider
      coreConfig={coreConfig}
      initialState={new ViewModel(BigInt(0))}
      RenderEffect={EffectVariantRender}
    >
      <Counter />
    </CoreProvider>
  );
}
```

Once this is setup you can use the `useViewModel` and `useDispatch` hooks in all the children comopnents:

```tsx
function Counter() {
  const viewModel = useViewModel(); // Will subscribe to any changes to the viewmodel
  const dispatch = useDispatch();

  return (
    <div>
      <p>Count: {viewModel.count}</p>
      <button onClick={() => dispatch(new EventVariantIncrement())}>
        Increment
      </button>
      <button onClick={() => dispatch(new EventVariantDecrement())}>
        Decrement
      </button>
    </div>
  );
}
```

Being able to `await` for event allows you, for example, to use `useTransition` to show a loader when something is being processed

```tsx
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

## Typescript helper

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

switch (true) {
  case is(request, TimeRequestVariantNotifyAt): {
    const { id, instant } = request;
    //                     ^? TimeRequestVariantNotifyAt
  }
  case is(payload, TimeRequestVariantNotifyAfter):
    const { id, duration } = request;
  //                      ^? TimeRequestVariantNotifyAfter
}
```

For comparison this is what you'd get only using switch on the constructor and `instanceof`:
Property 'instant' does not exist on type 'TimeRequest'

```typescript
switch (request.constructor) {
  case request instanceof TimeRequestVariantNotifyAt: {
    const { id, instant } = payload;
    // ❌ Property 'instant' does not exist on type 'TimeRequest'
  }
  case request instanceof TimeRequestVariantNotifyAfter:
    const { id, duration } = payload;
  // ❌ Property 'duration' does not exist on type 'TimeRequest'
}
```

## Running your crux app in a web worker

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
    await init({ module_or_path: wasmPath });
  },
  process_event,
  handle_response,
  view,
};
export type CoreWorkerApi = typeof api;
expose(api, self as Endpoint);
```

The only differences between a core running in the main thread and one running in a web worker is the `init` function, that is a slight variant.

See the [example project](../../examples/counter/app/src/config.ts) for a full working example.

```typescript
import { wrap } from "crux-wrapper";

import init, * as core from "shared";
import { ViewModel, Request } from "shared_types/types/core_types";
import {
  BincodeSerializer,
  BincodeDeserializer,
} from "shared_types/bincode/mod";

const app = wrap({
  init: () => {
    const worker = wrap<CoreWorkerApi>(
      new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
      }),
    );
    // We call the init, to make sure the worker loads the wasm module
    await worker.init();
    return worker;
  },
  onEffect: async () => {
    /*...*/
  },
  serializerConfig: {
    BincodeSerializer,
    BincodeDeserializer,
    ViewModel,
    Request,
  },
});
```

Now with those changes, all your payload will go through the webworker and the crux core will be leaving the main thread alone.

## Usage in a VanillaJS app

You can also use the `crux-wrapper` without react. By using the `wrap` function exposed, you get the benefit of being able to `await` events that are sent to your crux application.

```typescript
import { wrap } from "crux-wrapper";

const app = wrap({
  init,
  onEffect: async () => {
    /*...*/
  },
  serializerConfig: {
    BincodeSerializer,
    BincodeDeserializer,
    ViewModel,
    Request,
  },
});

await app.init(); // Initialize the crux app (will load the wasm module)
await app.sendEvent(new EventVariantIncrement()); // Send an event to the crux app
// At this point you know that all the effects initiated by the event have been fully processed
```

## Testing

You probably would want to test your react components with the ability to mock the crux app. The `crux-wrapper` provides a `MockCoreProvider` that you can use to mock the core app.

Here is an example that uses `@testing-library/react` to render a component with the mocked core:

```tsx
import { render } from "@testing-library/react";
import { MockCoreProvider, State } from "crux-wrapper/react";
import type { ViewModel } from "shared_types/types/shared_types";

import { router } from "@/App/router";

function renderWithCore(
  component: React.ReactNode,
  options?: { dispatch?: () => void; initialState?: ViewModel } = {},
) {
  const state = new State(initialState);
  const renderResult = render(
    <MockCoreProvider dispatch={dispatch} state={state}>
      {component}
    </MockCoreProvider>,
  );

  return {
    ...renderResult,
    updateViewModel: (payload: Partial<ViewModel>) =>
      state.setViewModel(payload as ViewModel),
  };
}

describe("Counter", () => {
  it("sends an increment event when clicking on the increment button", () => {
    const dispatch = jest.fn();
    const { getByText, updateViewModel } = renderWithCoreLogic(
      <MyComponent />,
      { dispatch },
    );

    getByText("Increment").click();

    expect(dispatch).toHaveBeenCalledWith(new EventVariantIncrement());
  });

  it("updates the counter when viewModel is updated", () => {
    const { getByText, updateViewModel } = renderWithCoreLogic(
      <MyComponent />,
      { initialState: { count: 0 } },
    );

    expect(getByText("Count: 0")).not.toBeNull();

    act(() => {
      updateViewModel({ count: 1 });
    });

    expect(getByText("Count: 1")).not.toBeNull();
  });
});
```

## Logs

The crux-wrapper provides a way to log the events, effects and responses that are exchanged between your core and your shell. This can be useful for debugging and understanding the flow of your application.
There are 2 ways to get logs from your crux app from react:

- a reactive `useLogs` hook that will return the logs as an array of objects
- a `useGetLog` hook that allows you to get the logs whenever you need it (without subscribing to changes and causing unecessary rerenderings)

```tsx
// This will only print logs when the button is clicked (no rerenderings)
function LogPrinter() {
  const getLogs = useGetLogs(); // exposes a function that do not subscribe to log changes

  return (
    <div>
      <button onClick={() => console.log(getLogs())}>
        Print logs to console
    </div>
  );
}
```

```tsx
// This will live print logs as they come in (rerenders on every log change)
function LiveLogs() {
  const logs = useLogs(); // will subscribe to log changes

  return (
    <div>
      <ul key={index}>
        {logs.map((log, index) => (
          <li>
            {log.at} {log.type} {log.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
```
