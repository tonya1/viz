import { Socket } from 'socket.io';
import { Subject } from 'rxjs';
import { take, finalize } from 'rxjs/operators';

import { SimulationStatus } from '@commons/SimulationStatus';
import { SimulationSynchronizationEvents } from '@commons/SimulationSynchronizationEvents';
import { SimulationChannel } from './SimulationChannel';

/**
 * A simulation participant is those clients that have joined a running simulation
 */
export class SimulationParticipant {

  private readonly _disconnectNotifier = new Subject<void>();
  private readonly _simulationStatusChangeNotifier = new Subject<{ status: SimulationStatus; simulationId: string }>();

  private _simulationChannel: SimulationChannel;

  constructor(private readonly _socket: Socket) {
    this._socket.on('disconnect', () => {
      this._disconnectNotifier.complete();
      this._simulationStatusChangeNotifier.complete();
      this._socket.removeAllListeners();
      if (this._simulationChannel)
        this._simulationChannel.removeMember(this);
    });

    this._socket.on(SimulationSynchronizationEvents.SIMULATION_STATUS, (payload: { status: SimulationStatus; simulationId: string }) => {
      this._simulationStatusChangeNotifier.next(payload);
    });
  }

  joinSimulationChannel(simulationChannel: SimulationChannel) {
    this._simulationChannel = simulationChannel;
  }

  listenFor<T = any>(event: SimulationSynchronizationEvents) {
    const notifier = new Subject<T>();
    this._socket.on(event, (payload?: T) => notifier.next(payload));
    this.watchForDisconnection()
      .then(() => notifier.complete());
    return notifier.asObservable()
      .pipe(finalize(() => this._socket.removeAllListeners(event)));
  }

  listenOnceFor<T>(event: SimulationSynchronizationEvents) {
    return this.listenFor<T>(event)
      .pipe(take(1));
  }

  notifySelf(event: SimulationSynchronizationEvents, payload?: any) {
    this._socket.emit(event, payload);
  }

  broadcast(event: SimulationSynchronizationEvents, payload?: any) {
    this._socket.broadcast.emit(event, payload);
  }

  simulationStatusChanges() {
    return this._simulationStatusChangeNotifier.asObservable();
  }

  requestToJoinSimulationChannel() {
    return this.listenFor<string>(SimulationSynchronizationEvents.SIMULATION_JOIN);
  }

  watchForDisconnection() {
    return new Promise<void>(resolve => {
      this._disconnectNotifier
        .subscribe({
          complete: resolve
        });
    });
  }

}
