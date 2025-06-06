export type Selector<T> = (viewModel: VM) => T;

export class State extends EventTarget {
  constructor(private viewModel: VM) {
    super();
  }

  getViewModel<T = VM>(selector: Selector<T> = (model) => model as T) {
    return selector(this.viewModel);
  }

  setViewModel(viewModel: VM) {
    this.viewModel = viewModel;
    this.dispatchEvent(new CustomEvent("updated"));
  }

  subscribe(callback: () => void) {
    this.addEventListener("updated", callback);
    return () => this.removeEventListener("updated", callback);
  }
}
