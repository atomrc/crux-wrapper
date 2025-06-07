export type Selector<T> = (viewModel: CruxViewModel) => T;

export class State extends EventTarget {
  constructor(private viewModel: CruxViewModel) {
    super();
  }

  getViewModel<T = CruxViewModel>(
    selector: Selector<T> = (model) => model as T,
  ) {
    return selector(this.viewModel);
  }

  setViewModel(viewModel: CruxViewModel) {
    this.viewModel = viewModel;
    this.dispatchEvent(new CustomEvent("updated"));
  }

  subscribe(callback: () => void) {
    this.addEventListener("updated", callback);
    return () => this.removeEventListener("updated", callback);
  }
}
