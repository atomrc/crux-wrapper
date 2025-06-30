import type { CoreViewModel } from "crux-wrapper/react";

export type Selector<T> = (viewModel: CoreViewModel) => T;

export class State extends EventTarget {
  constructor(
    private viewModel: CoreViewModel,
    private mergeViewModel: (
      newState: CoreViewModel,
      oldState: CoreViewModel,
    ) => CoreViewModel = (state) => state,
  ) {
    super();
  }

  getViewModel<T = CoreViewModel>(
    selector: Selector<T> = (model) => model as T,
  ) {
    return selector(this.viewModel);
  }

  setViewModel(viewModel: CoreViewModel) {
    this.viewModel = this.mergeViewModel( viewModel, this.viewModel);
    this.dispatchEvent(new CustomEvent("updated"));
  }

  subscribe(callback: () => void) {
    this.addEventListener("updated", callback);
    return () => this.removeEventListener("updated", callback);
  }
}
