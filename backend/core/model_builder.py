"""Translates ModelBlockConfig (or PlantBlockConfig) into a configured hilo_mpc.Model."""
from hilo_mpc import Model

from api.models.block import ModelBlockConfig, PlantBlockConfig


def build_model(cfg: ModelBlockConfig | PlantBlockConfig) -> Model:
    model = Model(time_unit="s")

    state_names = [s.name for s in cfg.states]
    input_names = [i.name for i in cfg.inputs]

    model.set_dynamical_states(state_names)

    if input_names:
        model.set_inputs(input_names)

    if cfg.parameters:
        param_names = [p.name for p in cfg.parameters if p.name.strip()]
        if param_names:
            model.set_parameters(param_names)

    model.set_dynamical_equations(cfg.ode_expressions)

    return model
