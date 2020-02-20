import * as React from 'react';

import { Dialog, DialogContent, DialogActions } from '@shared/dialog';
import { BasicButton } from '@shared/buttons';
import {
  Input,
  Select,
  Checkbox,
  SelectionOptionBuilder,
  FormGroupModel,
  FormControlModel,
  Form
} from '@shared/form';
import { ModelDictionaryComponentType, ModelDictionaryComponent } from '@shared/topology';
import { PlotModelSummary } from './PlotModelSummary';
import { PlotModel, PlotModelComponent } from '@shared/plot-model';
import { Validators } from '@shared/form/validation';

import './PlotModelCreator.light.scss';
import './PlotModelCreator.dark.scss';

interface Props {
  modelDictionaryComponentsWithConsolidatedPhases: ModelDictionaryComponent[];
  existingPlotModels: PlotModel[];
  onClose: () => void;
  onSubmit: (plotModels: PlotModel[]) => void;
}

interface State {
  show: boolean;
  createdPlotModels: PlotModel[];
  allPlotModelOptionBuilder: SelectionOptionBuilder<PlotModel>;
  componentTypeOptionBuilder: SelectionOptionBuilder<ModelDictionaryComponentType>;
  componentOptionBuilder: SelectionOptionBuilder<ModelDictionaryComponent>;
  phaseOptionBuilder: SelectionOptionBuilder<string>;
  disableAddComponentButton: boolean;
  disableSubmitButton: boolean;
}

export class PlotModelCreator extends React.Component<Props, State> {

  // FormControlModel bound to the component selected in the "Created plots" dropdown
  readonly selectedPlotModelFormControl = new FormControlModel<PlotModel>(null);
  readonly selectedComponentTypeFormControl = new FormControlModel(ModelDictionaryComponentType.NONE);
  readonly useMagnitudeFormControl = new FormControlModel(false);
  readonly useAngleFormControl = new FormControlModel(false);
  readonly selectedComponentFormControl = new FormControlModel<ModelDictionaryComponent>(null);
  readonly currentPlotModelFormGroup = this._createPlotModelFormGroupModel();

  constructor(props: Props) {
    super(props);
    this.state = {
      show: true,
      createdPlotModels: props.existingPlotModels,
      allPlotModelOptionBuilder: new SelectionOptionBuilder(
        props.existingPlotModels,
        plotModel => plotModel.name
      ),
      componentTypeOptionBuilder: new SelectionOptionBuilder(
        [
          ModelDictionaryComponentType.POWER,
          ModelDictionaryComponentType.TAP,
          ModelDictionaryComponentType.VOLTAGE
        ],
        type => {
          switch (type) {
            case ModelDictionaryComponentType.POWER:
              return 'Power';
            case ModelDictionaryComponentType.TAP:
              return 'Tap';
            case ModelDictionaryComponentType.VOLTAGE:
              return 'Voltage';
            default:
              return '';
          }
        }
      ),
      componentOptionBuilder: SelectionOptionBuilder.defaultBuilder(),
      phaseOptionBuilder: SelectionOptionBuilder.defaultBuilder(),
      disableAddComponentButton: true,
      disableSubmitButton: true
    };

    this.onRemovePlotModel = this.onRemovePlotModel.bind(this);
    this.onPlotModelUpdated = this.onPlotModelUpdated.bind(this);
    this.addPlotModelComponent = this.addPlotModelComponent.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
    this.onClose = this.onClose.bind(this);
  }

  private _createPlotModelFormGroupModel() {
    const selectedPhasesFormControl = new FormControlModel<string[]>([]);
    const formGroupModel = new FormGroupModel({
      name: new FormControlModel('', [Validators.checkNotEmpty('Plot name')]),
      componentType: this.selectedComponentTypeFormControl,
      useMagnitude: this.useMagnitudeFormControl,
      useAngle: this.useAngleFormControl,
      component: this.selectedComponentFormControl,
      phases: selectedPhasesFormControl
    });
    this.selectedComponentTypeFormControl.dependsOn(formGroupModel.findControl('name'));
    this.useMagnitudeFormControl.dependsOn(this.selectedComponentTypeFormControl);
    this.useAngleFormControl.dependsOn(this.selectedComponentTypeFormControl);
    this.selectedComponentFormControl.dependsOn(this.selectedComponentTypeFormControl);
    selectedPhasesFormControl.dependsOn(this.selectedComponentFormControl);
    return formGroupModel;
  }

  componentDidMount() {
    this.currentPlotModelFormGroup.validityChanges()
      .subscribe({
        next: isValid => {
          this.setState({
            disableAddComponentButton: !isValid
          });
        }
      });
    this._onExistingPlotModelSelectionChange();
    this._onPlotNameChange();
    this._onComponentTypeSelectionChange();
    this._onSelectedComponentChange();
  }

  private _onExistingPlotModelSelectionChange() {
    this.selectedPlotModelFormControl.valueChanges()
      .subscribe({
        next: selectedPlotModel => {
          if (selectedPlotModel) {
            this.currentPlotModelFormGroup.findControl('name').setValue(selectedPlotModel.name);
            this.selectedComponentTypeFormControl.setValue(selectedPlotModel.componentType);
            this.selectedComponentTypeFormControl.disable();
            this.useMagnitudeFormControl.setValue(selectedPlotModel.useMagnitude);
            this.useMagnitudeFormControl.disable();
            this.useAngleFormControl.setValue(selectedPlotModel.useAngle);
            this.useAngleFormControl.disable();
          }
        }
      });
  }

  private _onPlotNameChange() {
    const plotNameFormControl = this.currentPlotModelFormGroup.findControl('name');
    plotNameFormControl.valueChanges()
      .subscribe({
        next: newName => {
          if (plotNameFormControl.isValid()) {
            const existingPlotModel = this.state.createdPlotModels.find(e => e.name === newName);
            if (existingPlotModel !== undefined) {
              this.selectedComponentTypeFormControl.setValue(existingPlotModel.componentType);
              this.setState({
                componentOptionBuilder: new SelectionOptionBuilder(
                  this.props.modelDictionaryComponentsWithConsolidatedPhases.filter(e => e.type === existingPlotModel.componentType),
                  e => e.displayName
                ),
                phaseOptionBuilder: SelectionOptionBuilder.defaultBuilder()
              });
              this.selectedComponentTypeFormControl.disable();
              this.selectedComponentFormControl.enable();
            } else {
              this.selectedComponentTypeFormControl.reset();
              this.setState({
                componentOptionBuilder: SelectionOptionBuilder.defaultBuilder(),
                phaseOptionBuilder: SelectionOptionBuilder.defaultBuilder()
              });
            }
          } else {
            this.selectedComponentTypeFormControl.reset();
            plotNameFormControl.disable();
          }
        }
      });
  }

  private _onComponentTypeSelectionChange() {
    this.selectedComponentTypeFormControl
      .valueChanges()
      .subscribe({
        next: selectedType => {
          this.useMagnitudeFormControl.reset();
          this.useAngleFormControl.reset();
          if (this.selectedComponentTypeFormControl.isValid()) {
            this.setState({
              componentOptionBuilder: new SelectionOptionBuilder(
                this.props.modelDictionaryComponentsWithConsolidatedPhases.filter(e => e.type === selectedType),
                e => e.displayName
              ),
              phaseOptionBuilder: SelectionOptionBuilder.defaultBuilder()
            });
            if (selectedType === ModelDictionaryComponentType.TAP) {
              this.useMagnitudeFormControl.disable();
              this.useAngleFormControl.disable();
            } else {
              this.useMagnitudeFormControl.enable();
              this.useAngleFormControl.enable();
            }
          } else {
            this.useMagnitudeFormControl.disable();
            this.useAngleFormControl.disable();
          }
        }
      });
  }

  private _onSelectedComponentChange() {
    this.selectedComponentFormControl.valueChanges()
      .subscribe({
        next: selectedComponent => {
          if (this.selectedComponentFormControl.isValid()) {
            this.setState({
              phaseOptionBuilder: new SelectionOptionBuilder(selectedComponent.phases)
            });
          } else {
            this.setState({
              phaseOptionBuilder: SelectionOptionBuilder.defaultBuilder()
            });
          }
        }
      });
  }

  componentWillUnmount() {
    this.currentPlotModelFormGroup.cleanup();
  }

  render() {
    return (
      <Dialog
        showBackdrop
        show={this.state.show}
        className='plot-model-creator'>
        <DialogContent>
          <div className='plot-model-creator__body'>
            <Form
              className='plot-model-creator__body__form'
              formGroupModel={this.currentPlotModelFormGroup}>
              <Select
                label='Created plots'
                optional={true}
                selectionOptionBuilder={this.state.allPlotModelOptionBuilder}
                formControlModel={this.selectedPlotModelFormControl} />
              <Input
                label='Plot name'
                formControlModel={this.currentPlotModelFormGroup.findControl('name')} />
              <Select
                label='Component type'
                selectedOptionFinder={type => type === this.currentPlotModelFormGroup.findControl('componentType').getValue()}
                selectionOptionBuilder={this.state.componentTypeOptionBuilder}
                formControlModel={this.currentPlotModelFormGroup.findControl('componentType')} />
              <Checkbox
                label='Magnitude'
                name='useMagnitude'
                labelPosition='right'
                formControlModel={this.currentPlotModelFormGroup.findControl('useMagnitude')} />
              <Checkbox
                label='Angle'
                name='useAngle'
                labelPosition='right'
                formControlModel={this.currentPlotModelFormGroup.findControl('useAngle')} />
              <Select
                label='Component'
                selectionOptionBuilder={this.state.componentOptionBuilder}
                formControlModel={this.selectedComponentFormControl} />
              <Select
                multiple
                label='Phases'
                selectionOptionBuilder={this.state.phaseOptionBuilder}
                formControlModel={this.currentPlotModelFormGroup.findControl('phases')} />
              <BasicButton
                type='positive'
                label='Add component'
                disabled={this.state.disableAddComponentButton}
                onClick={this.addPlotModelComponent} />
            </Form>
            <div className='plot-model-creator__body__created-plot-models'>
              {
                this.state.createdPlotModels.map(plotModel => (
                  <PlotModelSummary
                    key={plotModel.name + plotModel.components.length}
                    plotModel={plotModel}
                    onRemove={this.onRemovePlotModel}
                    onUpdate={this.onPlotModelUpdated} />
                ))
              }
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <BasicButton
            type='negative'
            label='Close'
            onClick={this.onClose} />
          <BasicButton
            type='positive'
            label='Done'
            disabled={this.state.disableSubmitButton}
            onClick={this.onSubmit} />
        </DialogActions>
      </Dialog>
    );
  }

  onRemovePlotModel(plotModelToRemove: PlotModel) {
    const newCreatedPlotModels = this.state.createdPlotModels.filter(existing => existing !== plotModelToRemove);
    this.setState({
      createdPlotModels: newCreatedPlotModels,
      allPlotModelOptionBuilder: new SelectionOptionBuilder(
        newCreatedPlotModels,
        model => model.name
      ),
      disableSubmitButton: newCreatedPlotModels.length === 0
    });
    if (this.currentPlotModelFormGroup.getValue().name === plotModelToRemove.name) {
      this.currentPlotModelFormGroup.reset();
      this.setState({
        componentTypeOptionBuilder: SelectionOptionBuilder.defaultBuilder(),
        componentOptionBuilder: SelectionOptionBuilder.defaultBuilder(),
        phaseOptionBuilder: SelectionOptionBuilder.defaultBuilder()
      });
    }
  }

  onPlotModelUpdated(updatedPlotModel: PlotModel) {
    const newPlotModel = { ...updatedPlotModel } as PlotModel;
    const updatedPlotModels = this.state.createdPlotModels.map(model => {
      return model !== updatedPlotModel ? model : newPlotModel;
    });
    this.setState({
      allPlotModelOptionBuilder: new SelectionOptionBuilder(updatedPlotModels, model => model.name),
      createdPlotModels: updatedPlotModels
    });
    if (updatedPlotModel === this.selectedPlotModelFormControl.getValue()) {
      this.setState({
        phaseOptionBuilder: SelectionOptionBuilder.defaultBuilder()
      });
    }
  }

  addPlotModelComponent() {
    const formValue = this.currentPlotModelFormGroup.getValue();
    const plotModelToUpdate = this.state.createdPlotModels.find(e => e.name === formValue.name) || this._createNewPlotModel();
    // For each selected phase, we add a PlotModelComponent
    // to the "components" array of the current PlotModel
    for (let i = 0; i < formValue.phases.length; i++) {
      const selectedPhase = formValue.phases[i];
      const plotModelComponentDisplayName = `${formValue.component.name} (${selectedPhase})`;
      if (plotModelToUpdate.components.find(e => e.displayName === plotModelComponentDisplayName) === undefined) {
        const plotModelComponentAtSelectedPhase: PlotModelComponent = {
          id: formValue.component.measurementMRIDs[i],
          displayName: plotModelComponentDisplayName,
          phase: selectedPhase
        };
        plotModelToUpdate.components.push(plotModelComponentAtSelectedPhase);
      }
    }
    // Need to create a new reference for React to update
    const updatedPlotModels = [...this.state.createdPlotModels];
    if (updatedPlotModels.includes(plotModelToUpdate)) {
      // Need to create a new reference for React to update
      plotModelToUpdate.components = [...plotModelToUpdate.components];
    } else {
      updatedPlotModels.push(plotModelToUpdate);
    }

    this.setState({
      createdPlotModels: updatedPlotModels,
      allPlotModelOptionBuilder: new SelectionOptionBuilder(
        updatedPlotModels,
        plotModel => plotModel.name
      ),
      phaseOptionBuilder: SelectionOptionBuilder.defaultBuilder(),
      disableSubmitButton: updatedPlotModels.length === 0
    });
    this.selectedComponentTypeFormControl.disable();
    this.useMagnitudeFormControl.disable();
    this.useAngleFormControl.disable();
    this.selectedComponentFormControl.reset();
  }

  private _createNewPlotModel(): PlotModel {
    const formValue = this.currentPlotModelFormGroup.getValue();
    return {
      name: formValue.name,
      components: [],
      componentType: formValue.componentType,
      useMagnitude: formValue.useMagnitude,
      useAngle: formValue.useAngle
    };
  }

  onSubmit() {
    // For plot model that has useMagnitude and useAngle both
    // set to true, we need to duplicate it and set either useMagnitude
    // or useAngle to true and leave the other flag false, and update the name accordingly
    const resultingPlotModels = [];
    for (const createdPlotModel of this.state.createdPlotModels) {
      if (createdPlotModel.useAngle && createdPlotModel.useMagnitude) {
        const plotModelUsingMagnitude = this._createNewPlotModel();
        const plotModelUsingAngle = this._createNewPlotModel();
        plotModelUsingMagnitude.name = createdPlotModel.name + ' (Magnitude)';
        plotModelUsingMagnitude.components = createdPlotModel.components;
        plotModelUsingMagnitude.componentType = createdPlotModel.componentType;
        plotModelUsingMagnitude.useMagnitude = true;
        plotModelUsingMagnitude.useAngle = false;

        plotModelUsingAngle.name = createdPlotModel.name + ' (Angle)';
        plotModelUsingAngle.componentType = createdPlotModel.componentType;
        plotModelUsingAngle.useAngle = true;
        plotModelUsingAngle.useMagnitude = false;
        plotModelUsingAngle.components = createdPlotModel.components;

        resultingPlotModels.push(plotModelUsingMagnitude, plotModelUsingAngle);
      } else {
        resultingPlotModels.push(createdPlotModel);
      }
    }
    this.setState({
      show: false
    }, () => this.props.onSubmit(resultingPlotModels));
  }

  onClose() {
    this.setState({
      show: false
    }, this.props.onClose);
  }

}