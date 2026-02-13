use crux_core::{
    Command,
    capability::Operation,
    macros::effect,
    render::{RenderOperation, render},
};
use facet::Facet;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};

// ANCHOR: model
#[derive(Default)]
pub struct Model {
    count: Count,
}

#[derive(Clone, Default, Debug, PartialEq, Eq)]
pub struct Count {
    value: isize,
}
// ANCHOR_END: model

#[derive(Facet, Serialize, Deserialize, Debug, Clone, Default)]
pub struct ViewModel {
    pub count: isize,
}

#[derive(Facet, Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[repr(C)]
pub enum Event {
    StartWatch,
    StopWatch,
    Increment,
    Decrement,

    #[serde(skip)]
    Incremement10,
}

#[derive(Facet, Clone, Serialize, Deserialize, Debug, PartialEq, Eq)]
#[repr(C)]
pub enum StreamOperation {
    Start,
    Stop,
}

#[derive(Facet, Serialize, Deserialize, Debug, PartialEq, Eq)]
#[repr(C)]
pub enum StreamReponse {
    Data(String),
    End,
}

impl Operation for StreamOperation {
    type Output = StreamReponse;
}

#[effect(facet_typegen)]
pub enum Effect {
    Render(RenderOperation),
    Stream(StreamOperation),
}

#[derive(Default)]
pub struct App;

impl crux_core::App for App {
    type Model = Model;
    type Event = Event;
    type ViewModel = ViewModel;
    type Effect = Effect;

    fn update(&self, msg: Event, model: &mut Model) -> Command<Effect, Event> {
        match msg {
            Event::StartWatch => Command::new(|ctx| async move {
                let mut stream = ctx.stream_from_shell(StreamOperation::Start);
                while let Some(_) = stream.next().await {
                    ctx.send_event(Event::Incremement10);
                }
            }),
            Event::StopWatch => Command::notify_shell(StreamOperation::Stop).into(),
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

            Event::Incremement10 => {
                model.count = Count {
                    value: model.count.value + 10,
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
