use crux_core::{
    macros::effect,
    render::{render, RenderOperation},
    Command,
};
use serde::{Deserialize, Serialize};

// ANCHOR: model
#[derive(Default, Serialize)]
pub struct Model {
    count: Count,
}

#[derive(Serialize, Deserialize, Clone, Default, Debug, PartialEq, Eq)]
pub struct Count {
    value: isize,
}
// ANCHOR_END: model

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ViewModel {
    pub count: isize,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub enum Event {
    Increment,
    Decrement,
}

#[effect]
pub enum Effect {
    Render(RenderOperation),
}

#[derive(Default)]
pub struct App;

impl crux_core::App for App {
    type Model = Model;
    type Event = Event;
    type ViewModel = ViewModel;
    type Capabilities = ();
    type Effect = Effect;

    fn update(&self, msg: Event, model: &mut Model, _caps: &()) -> Command<Effect, Event> {
        match msg {
            Event::Increment => {
                model.count = Count {
                    value: model.count.value + 1,
                };
                render()
            }
            Event::Decrement => {
                model.count = Count {
                    value: model.count.value - 1,
                };
                render()
            }
        }
    }

    fn view(&self, model: &Self::Model) -> Self::ViewModel {
        Self::ViewModel {
            count: model.count.value,
        }
    }
}
