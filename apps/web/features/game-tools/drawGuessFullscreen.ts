export type DrawGuessFullscreenEnvironment = {
  key: object;
  target: object;
  getElement: () => object | null;
  request?: () => Promise<void>;
  exit: () => Promise<void>;
  lock?: () => Promise<void>;
  unlock: () => void;
  subscribe: (listener: () => void) => void;
};

type Session = {
  active: boolean;
  native: boolean;
  changed: (active: boolean) => void;
};

const resources = new WeakMap<object, FullscreenResource>();

// Fullscreen and orientation belong to the document, so component instances
// share pending work instead of letting an old instance clean up a newer one.
class FullscreenResource {
  private desired: Session | null = null;
  private requested = false;
  private exiting = false;
  private owned = false;
  private orientationOwner: Session | null = null;

  constructor(private environment: DrawGuessFullscreenEnvironment) {
    environment.subscribe(() => this.fullscreenChanged());
  }

  acquire(session: Session) {
    this.desired = session;
    const environment = this.environment;
    if (this.exiting) return; // Keep CSS fullscreen; a delayed retry loses user activation.
    if (environment.getElement()) {
      this.adopt();
      return;
    }
    if (this.requested || !environment.request) return;
    this.requested = true;
    try {
      // Invoke synchronously from the click while user activation is available.
      void environment.request().then(() => {
        this.requested = false;
        this.owned = environment.getElement() === environment.target;
        this.adopt();
      }, () => {
        this.requested = false;
      });
    } catch {
      this.requested = false;
    }
  }

  release(session: Session) {
    session.native = false;
    if (this.desired !== session) return;
    this.desired = null;
    if (this.orientationOwner) this.unlock();
    this.exitOwned();
  }

  private adopt() {
    if (this.exiting || !this.owned || this.environment.getElement() !== this.environment.target) return;
    const session = this.desired;
    if (!session?.active) {
      this.exitOwned();
      return;
    }
    session.native = true;
    if (!this.environment.lock || this.orientationOwner === session) return;
    this.orientationOwner = session;
    try {
      void this.environment.lock().then(() => {
        const current = this.orientationOwner;
        // A late lock may outlive its canvas. Never unlock a newer active lock.
        if (current === session && this.desired === session && session.active && session.native
          && this.environment.getElement() === this.environment.target) return;
        if (current && current !== session && current.active && current.native) return;
        this.unlock();
      }, () => {
        if (this.orientationOwner === session) this.orientationOwner = null;
      });
    } catch {
      if (this.orientationOwner === session) this.orientationOwner = null;
    }
  }

  private unlock() {
    this.orientationOwner = null;
    try { this.environment.unlock(); } catch { /* Orientation may already be unlocked. */ }
  }

  private exitOwned() {
    if (this.exiting || !this.owned || this.environment.getElement() !== this.environment.target) return;
    this.exiting = true;
    this.owned = false;
    const finished = () => {
      this.exiting = false;
      // An exit can fail, or another pending request can finish meanwhile.
      // Keep ownership so a later close can retry, without an immediate loop.
      this.owned = this.environment.getElement() === this.environment.target;
      if (this.desired?.active) this.adopt();
    };
    try { void this.environment.exit().then(finished, finished); } catch { finished(); }
  }

  private fullscreenChanged() {
    if (this.environment.getElement() === this.environment.target) return;
    this.owned = false;
    const session = this.desired;
    if (!session?.native || this.exiting) return;
    this.desired = null;
    session.native = false;
    session.active = false;
    this.unlock();
    session.changed(false);
  }
}

export function createDrawGuessFullscreenController(
  environment: DrawGuessFullscreenEnvironment,
  changed: (active: boolean) => void,
) {
  let resource = resources.get(environment.key);
  if (!resource) {
    resource = new FullscreenResource(environment);
    resources.set(environment.key, resource);
  }
  let session: Session | null = null;
  let disposed = false;
  const close = (notify: boolean) => {
    const previous = session;
    session = null;
    if (!previous) return;
    previous.active = false;
    resource.release(previous);
    if (notify) changed(false);
  };
  return {
    open() {
      if (disposed || session?.active) return;
      const next: Session = { active: true, native: false, changed: (active) => {
        if (session === next) changed(active);
      } };
      session = next;
      changed(true);
      resource.acquire(next);
    },
    close() { close(true); },
    dispose() { disposed = true; close(false); },
  };
}
