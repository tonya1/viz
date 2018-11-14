import { Message, StompSubscription } from '@stomp/stompjs';

import { StompClientService } from './StompClientService';
import { SimulationConfig } from '../models/SimulationConfig';
import { SimulationOutputPayload } from '../models/message-requests/SimulationOutputPayload';
import { SimulationQueue } from './SimulationQueue';

/**
 * This class is responsible for communicating with the platform to process the simulation.
 * Simulation is started when the play button is clicked
 */
export class SimulationControlService {

  private static readonly _INSTANCE_: SimulationControlService = new SimulationControlService();
  private readonly _stompClient = StompClientService.getInstance();
  private readonly _simulationQueue = SimulationQueue.getInstance();

  private readonly _startSimulationTopic = '/queue/goss.gridappsd.process.request.simulation';
  private readonly _simulationStatusTopic = '/topic/goss.gridappsd.simulation.log';
  private readonly _simulationOutputTopic = '/topic/goss.gridappsd.simulation.output.>';

  private constructor() {
  }

  static getInstance(): SimulationControlService {
    return SimulationControlService._INSTANCE_;
  }

  isActive() {
    return this._stompClient.isActive();
  }
  /**
   * Add a listener to be invoked when the platform sends back a message containing
   * simulation output data
   * @param fn 
   */
  onSimulationOutputReceived(fn: (payload: SimulationOutputPayload) => void): Promise<StompSubscription> {
    return this._stompClient.subscribe(this._simulationOutputTopic, (message: Message) => {
      const payload = JSON.parse(message.body);
      fn(payload);
    });
  }

  onSimulationStarted(fn: (simulationId: string) => void): Promise<StompSubscription> {
    return this._stompClient.subscribe(
      this._startSimulationTopic,
      (message: Message) => {
        this._simulationQueue.updateIdForActiveSimulation(message.body);
        fn(message.body);
      }
    );
  }

  onSimulationStatusLogReceived(simulationId: string, fn: (simulationStatusLog: string) => void): Promise<StompSubscription> {
    return this._stompClient.subscribe(
      `${this._simulationStatusTopic}.${simulationId}`,
      (message: Message) => fn(message.body)
    );
  }

  startSimulation(simulationConfig: SimulationConfig) {
    const config = { ...simulationConfig }
    const startTime = new Date(simulationConfig.simulation_config.start_time.replace(/-/g, "/"));
    const startEpoch = startTime.getTime();
    config.simulation_config = { ...simulationConfig.simulation_config };
    config.simulation_config.start_time = String(startEpoch);
    this._stompClient.send(
      this._startSimulationTopic,
      { 'reply-to': this._startSimulationTopic },
      JSON.stringify(config)
    );
  }

}
